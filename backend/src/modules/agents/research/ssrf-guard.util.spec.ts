import {
  isPrivateOrReservedIpv4,
  isPrivateOrReservedIpv6,
  validateUrlPreResolution,
  resolveAndValidateIp,
  SsrfBlockedException,
} from './ssrf-guard.util';

describe('SSRF Guard Utility', () => {
  describe('isPrivateOrReservedIpv4', () => {
    it('blocks loopback addresses (127.0.0.0/8)', () => {
      expect(isPrivateOrReservedIpv4('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIpv4('127.1.2.3')).toBe(true);
    });

    it('blocks private class A (10.0.0.0/8)', () => {
      expect(isPrivateOrReservedIpv4('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIpv4('10.255.255.255')).toBe(true);
    });

    it('blocks private class B (172.16.0.0/12)', () => {
      expect(isPrivateOrReservedIpv4('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIpv4('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIpv4('172.15.0.1')).toBe(false);
      expect(isPrivateOrReservedIpv4('172.32.0.1')).toBe(false);
    });

    it('blocks private class C (192.168.0.0/16)', () => {
      expect(isPrivateOrReservedIpv4('192.168.1.1')).toBe(true);
      expect(isPrivateOrReservedIpv4('192.168.254.254')).toBe(true);
    });

    it('blocks cloud metadata endpoint (169.254.169.254) and link-local (169.254.0.0/16)', () => {
      expect(isPrivateOrReservedIpv4('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIpv4('169.254.0.1')).toBe(true);
    });

    it('blocks 0.0.0.0/8, carrier-grade NAT, test nets, and multicast', () => {
      expect(isPrivateOrReservedIpv4('0.0.0.0')).toBe(true);
      expect(isPrivateOrReservedIpv4('100.64.0.1')).toBe(true);
      expect(isPrivateOrReservedIpv4('192.0.2.1')).toBe(true);
      expect(isPrivateOrReservedIpv4('224.0.0.1')).toBe(true);
    });

    it('allows valid public IPs', () => {
      expect(isPrivateOrReservedIpv4('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIpv4('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIpv4('93.184.216.34')).toBe(false);
    });
  });

  describe('isPrivateOrReservedIpv6', () => {
    it('blocks IPv6 loopback (::1)', () => {
      expect(isPrivateOrReservedIpv6('::1')).toBe(true);
      expect(isPrivateOrReservedIpv6('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('blocks link-local (fe80::/10)', () => {
      expect(isPrivateOrReservedIpv6('fe80::1')).toBe(true);
    });

    it('blocks unique local (fc00::/7)', () => {
      expect(isPrivateOrReservedIpv6('fc00::1')).toBe(true);
      expect(isPrivateOrReservedIpv6('fd12:3456:789a::1')).toBe(true);
    });

    it('blocks IPv4-mapped loopback', () => {
      expect(isPrivateOrReservedIpv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIpv6('::ffff:10.0.0.1')).toBe(true);
    });
  });

  describe('validateUrlPreResolution', () => {
    it('rejects unsupported protocols', () => {
      expect(() => validateUrlPreResolution('file:///etc/passwd')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('ftp://example.com')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('javascript:alert(1)')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('data:text/html,test')).toThrow(SsrfBlockedException);
    });

    it('rejects localhost and internal hostnames', () => {
      expect(() => validateUrlPreResolution('http://localhost:3000')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('https://app.localhost')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('http://server.local')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('http://database.internal')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('http://metadata.google.internal')).toThrow(SsrfBlockedException);
    });

    it('rejects raw private IP literals in URL', () => {
      expect(() => validateUrlPreResolution('http://127.0.0.1:8080')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('http://169.254.169.254/latest/meta-data')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('http://10.0.0.5/api')).toThrow(SsrfBlockedException);
      expect(() => validateUrlPreResolution('http://[::1]:80')).toThrow(SsrfBlockedException);
    });

    it('accepts valid public HTTP/HTTPS URLs', () => {
      const url1 = validateUrlPreResolution('https://example.com/about');
      expect(url1.hostname).toBe('example.com');
      const url2 = validateUrlPreResolution('http://stripe.com');
      expect(url2.hostname).toBe('stripe.com');
    });
  });

  describe('resolveAndValidateIp', () => {
    it('rejects direct private IPs directly', async () => {
      await expect(resolveAndValidateIp('127.0.0.1')).rejects.toThrow(SsrfBlockedException);
      await expect(resolveAndValidateIp('10.0.0.1')).rejects.toThrow(SsrfBlockedException);
    });

    it('resolves valid public hostnames without error', async () => {
      const ips = await resolveAndValidateIp('one.one.one.one');
      expect(ips.length).toBeGreaterThan(0);
      expect(ips).toContain('1.1.1.1');
    });
  });
});
