import * as dns from 'dns';
import { URL } from 'url';

export class SsrfBlockedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedException';
  }
}

/**
 * Checks if an IPv4 address string falls into private, loopback, link-local,
 * multicast, or reserved ranges.
 */
export function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format is considered dangerous
  }

  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;

  // 10.0.0.0/8 (Private Class A)
  if (a === 10) return true;

  // 100.64.0.0/10 (Carrier Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private Class B)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;

  // 192.168.0.0/16 (Private Class C)
  if (a === 192 && b === 168) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address falls into loopback, unique local, link-local,
 * or IPv4-mapped private ranges.
 */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback & unspecified
  if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const rawIpv4 = normalized.substring(7);
    if (rawIpv4.includes('.')) {
      return isPrivateOrReservedIpv4(rawIpv4);
    }
  }

  // Link-local: fe80::/10 (fe8, fe9, fea, feb)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // Unique Local Addresses (ULA): fc00::/7 (fc00 - fdff)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Documentation: 2001:db8::/32
  if (normalized.startsWith('2001:db8') || normalized.startsWith('2001:0db8')) {
    return true;
  }

  return false;
}

/**
 * Validates protocol, hostname, and scheme before any network connection.
 */
export function validateUrlPreResolution(urlStr: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new SsrfBlockedException(`Malformed or invalid URL: ${urlStr}`);
  }

  // Strictly enforce http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedException(`Forbidden protocol '${parsed.protocol}'. Only HTTP and HTTPS are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  if (!hostname) {
    throw new SsrfBlockedException('URL hostname cannot be empty.');
  }

  // Direct localhost or loopback name check
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    throw new SsrfBlockedException(`Blocked internal or reserved hostname: ${hostname}`);
  }

  // Check if hostname is directly an IPv4 address literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateOrReservedIpv4(hostname)) {
      throw new SsrfBlockedException(`Blocked private or reserved IPv4 address: ${hostname}`);
    }
  }

  // Check if hostname is an IPv6 literal (in bracket format or raw)
  const cleanIpv6 = hostname.replace(/^\[|\]$/g, '');
  if (cleanIpv6.includes(':')) {
    if (isPrivateOrReservedIpv6(cleanIpv6)) {
      throw new SsrfBlockedException(`Blocked private or reserved IPv6 address: ${cleanIpv6}`);
    }
  }

  return parsed;
}

/**
 * Performs DNS resolution and validates that ALL resolved IP addresses
 * are publicly routable and safe.
 * Returns the resolved IP addresses.
 */
export async function resolveAndValidateIp(hostname: string): Promise<string[]> {
  // If hostname is already a validated IP, return it directly
  const cleanHost = hostname.replace(/^\[|\]$/g, '');
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost)) {
    if (isPrivateOrReservedIpv4(cleanHost)) {
      throw new SsrfBlockedException(`Resolved IP ${cleanHost} is private/reserved.`);
    }
    return [cleanHost];
  }

  if (cleanHost.includes(':')) {
    if (isPrivateOrReservedIpv6(cleanHost)) {
      throw new SsrfBlockedException(`Resolved IPv6 ${cleanHost} is private/reserved.`);
    }
    return [cleanHost];
  }

  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(cleanHost, { all: true });
  } catch (err: any) {
    throw new SsrfBlockedException(`DNS resolution failed for hostname '${cleanHost}': ${err.message}`);
  }

  if (!records || records.length === 0) {
    throw new SsrfBlockedException(`No DNS records found for hostname '${cleanHost}'`);
  }

  const resolvedIps: string[] = [];
  for (const record of records) {
    const ip = record.address;
    if (record.family === 4) {
      if (isPrivateOrReservedIpv4(ip)) {
        throw new SsrfBlockedException(`Resolved IPv4 ${ip} for host '${cleanHost}' is private/reserved.`);
      }
    } else if (record.family === 6) {
      if (isPrivateOrReservedIpv6(ip)) {
        throw new SsrfBlockedException(`Resolved IPv6 ${ip} for host '${cleanHost}' is private/reserved.`);
      }
    }
    resolvedIps.push(ip);
  }

  return resolvedIps;
}

/**
 * Full SSRF Validation Pipeline:
 * 1. Pre-validation of URL and protocol
 * 2. DNS resolution and IP verification
 */
export async function validateUrlAgainstSsrf(urlStr: string): Promise<{ url: URL; resolvedIps: string[] }> {
  const url = validateUrlPreResolution(urlStr);
  const resolvedIps = await resolveAndValidateIp(url.hostname);
  return { url, resolvedIps };
}
