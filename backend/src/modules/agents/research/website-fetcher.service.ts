import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { validateUrlAgainstSsrf, validateUrlPreResolution, resolveAndValidateIp } from './ssrf-guard.util';

export interface FetchedPage {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  pageType: 'HOMEPAGE' | 'ABOUT' | 'PRODUCTS' | 'CAREERS' | 'OTHER';
}

@Injectable()
export class WebsiteFetcherService {
  private readonly logger = new Logger(WebsiteFetcherService.name);

  private readonly TIMEOUT_MS = 6000;
  private readonly MAX_BYTES = 512 * 1024; // 512 KB
  private readonly MAX_REDIRECTS = 3;

  /**
   * Fetches multiple pages for a company domain safely:
   * 1. Homepage
   * 2. /about or /about-us
   * 3. /products or /services
   * 4. /careers or /jobs
   */
  public async fetchCompanyPages(domain: string, candidatePaths: string[] = []): Promise<FetchedPage[]> {
    const pages: FetchedPage[] = [];
    const baseDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Default discovery paths
    const pathsToTry = candidatePaths.length > 0
      ? candidatePaths.slice(0, 4)
      : ['/', '/about', '/products', '/careers'];

    for (const path of pathsToTry) {
      const url = `https://${baseDomain}${path.startsWith('/') ? path : `/${path}`}`;
      const pageType = this.classifyPageType(path);

      try {
        const result = await this.safeFetch(url);
        if (result && result.status >= 200 && result.status < 400 && result.html.trim().length > 0) {
          pages.push({ ...result, pageType });
        }
      } catch (err: any) {
        this.logger.debug(`Failed to fetch ${url}: ${err.message}`);
        // If https failed on homepage, attempt http once
        if (path === '/') {
          try {
            const httpUrl = `http://${baseDomain}/`;
            const httpResult = await this.safeFetch(httpUrl);
            if (httpResult && httpResult.status >= 200 && httpResult.status < 400) {
              pages.push({ ...httpResult, pageType: 'HOMEPAGE' });
            }
          } catch {
            // Ignore fallback failure
          }
        }
      }
    }

    return pages;
  }

  /**
   * Safely fetches a single URL with strict multi-stage SSRF verification,
   * DNS resolution check, redirect validation, response size capping, and timeout.
   */
  public async safeFetch(initialUrl: string): Promise<FetchedPage | null> {
    let currentUrl = initialUrl;
    let redirectCount = 0;

    while (redirectCount <= this.MAX_REDIRECTS) {
      // 1. SSRF check before request & DNS resolution
      const { url: parsedUrl } = await validateUrlAgainstSsrf(currentUrl);

      const response = await this.executeHttpRequest(parsedUrl);

      // Handle Redirects (301, 302, 303, 307, 308)
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        redirectCount++;
        if (redirectCount > this.MAX_REDIRECTS) {
          throw new Error(`Exceeded maximum redirect limit of ${this.MAX_REDIRECTS}`);
        }

        const nextUrl = new URL(response.headers.location, currentUrl).toString();
        this.logger.debug(`Following redirect ${redirectCount} from ${currentUrl} to ${nextUrl}`);

        // 2. Validate redirect destination against SSRF BEFORE connecting
        validateUrlPreResolution(nextUrl);
        currentUrl = nextUrl;
        continue;
      }

      return {
        url: initialUrl,
        finalUrl: currentUrl,
        status: response.status,
        contentType: response.headers['content-type'] || 'text/html',
        html: response.body,
        pageType: this.classifyPageType(parsedUrl.pathname),
      };
    }

    return null;
  }

  /**
   * Low-level HTTP/HTTPS request execution with timeout and bounded buffer reading.
   */
  private executeHttpRequest(
    targetUrl: URL
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
      const isHttps = targetUrl.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions: http.RequestOptions = {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DealPilot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'close',
        },
        timeout: this.TIMEOUT_MS,
      };

      const req = lib.request(reqOptions, (res) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > this.MAX_BYTES) {
            req.destroy(new Error(`Response exceeded maximum size limit of ${this.MAX_BYTES} bytes.`));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`Request timed out after ${this.TIMEOUT_MS}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  private classifyPageType(pathname: string): 'HOMEPAGE' | 'ABOUT' | 'PRODUCTS' | 'CAREERS' | 'OTHER' {
    const lower = pathname.toLowerCase();
    if (lower === '/' || lower === '') return 'HOMEPAGE';
    if (lower.includes('about') || lower.includes('company') || lower.includes('who-we-are')) return 'ABOUT';
    if (lower.includes('product') || lower.includes('service') || lower.includes('solution') || lower.includes('platform')) return 'PRODUCTS';
    if (lower.includes('career') || lower.includes('job') || lower.includes('hiring') || lower.includes('work-with-us')) return 'CAREERS';
    return 'OTHER';
  }
}
