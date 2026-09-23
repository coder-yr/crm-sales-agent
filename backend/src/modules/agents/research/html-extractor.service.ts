import { Injectable } from '@nestjs/common';
import { FetchedPage } from './website-fetcher.service';

export interface ExtractedPageData {
  url: string;
  pageType: string;
  title: string;
  metaDescription: string;
  headings: string[];
  cleanText: string;
  internalLinks: string[];
}

export interface CombinedResearchContext {
  domain: string;
  pagesCount: number;
  extractedPages: ExtractedPageData[];
  boundedTextContent: string;
}

@Injectable()
export class HtmlExtractorService {
  private readonly MAX_TOTAL_TEXT_CHARS = 12000;

  /**
   * Processes an array of raw fetched HTML pages into structured, clean,
   * bounded text context for analysis.
   */
  public extractFromPages(domain: string, pages: FetchedPage[]): CombinedResearchContext {
    const extractedPages: ExtractedPageData[] = pages.map((p) => this.extractSinglePage(p));

    // Combine page texts into a bounded summary
    let combinedText = '';
    for (const page of extractedPages) {
      if (combinedText.length >= this.MAX_TOTAL_TEXT_CHARS) break;

      const pageHeader = `\n--- PAGE: ${page.pageType} (${page.url}) ---\nTitle: ${page.title}\nDescription: ${page.metaDescription}\n`;
      const availableSpace = this.MAX_TOTAL_TEXT_CHARS - combinedText.length - pageHeader.length;

      if (availableSpace > 100) {
        const slicedText = page.cleanText.slice(0, availableSpace);
        combinedText += `${pageHeader}${slicedText}\n`;
      }
    }

    return {
      domain,
      pagesCount: pages.length,
      extractedPages,
      boundedTextContent: combinedText.trim(),
    };
  }

  /**
   * Deterministically parses a single HTML page.
   */
  public extractSinglePage(page: FetchedPage): ExtractedPageData {
    const html = page.html;

    const title = this.extractTitle(html);
    const metaDescription = this.extractMetaDescription(html);
    const headings = this.extractHeadings(html);
    const internalLinks = this.extractInternalLinks(html, page.finalUrl);
    const cleanText = this.sanitizeHtmlToText(html);

    return {
      url: page.finalUrl,
      pageType: page.pageType,
      title,
      metaDescription,
      headings,
      cleanText,
      internalLinks,
    };
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match && match[1]) {
      return this.decodeHtmlEntities(match[1].trim().replace(/\s+/g, ' '));
    }
    const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) {
      return this.decodeHtmlEntities(ogMatch[1].trim());
    }
    return '';
  }

  private extractMetaDescription(html: string): string {
    const metaMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    return metaMatch && metaMatch[1] ? this.decodeHtmlEntities(metaMatch[1].trim()) : '';
  }

  private extractHeadings(html: string): string[] {
    const headings: string[] = [];
    const regex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null && headings.length < 15) {
      const text = this.stripTags(match[1]).trim().replace(/\s+/g, ' ');
      if (text.length > 2 && text.length < 150) {
        headings.push(this.decodeHtmlEntities(text));
      }
    }

    return headings;
  }

  private extractInternalLinks(html: string, baseUrl: string): string[] {
    const links: Set<string> = new Set();
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null && links.size < 20) {
      const href = match[1].trim();
      if (
        href &&
        !href.startsWith('#') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('tel:') &&
        !href.startsWith('javascript:')
      ) {
        // Prioritize interesting company paths
        const lower = href.toLowerCase();
        if (
          lower.includes('about') ||
          lower.includes('product') ||
          lower.includes('service') ||
          lower.includes('solution') ||
          lower.includes('career') ||
          lower.includes('team')
        ) {
          links.add(href);
        }
      }
    }

    return Array.from(links);
  }

  /**
   * Strips scripts, styles, navs, footers, headers, SVGs, comments,
   * and reduces whitespace.
   */
  public sanitizeHtmlToText(html: string): string {
    if (!html) return '';

    let text = html
      // Remove scripts, styles, noscript, iframes
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      // Remove header, nav, footer boilerplate if possible
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Insert newlines for block tags
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    // Strip all remaining HTML tags
    text = this.stripTags(text);

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Normalize spacing: replace multiple spaces with single space, collapse excess empty lines
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    return text;
  }

  private stripTags(input: string): string {
    return input.replace(/<[^>]+>/g, ' ');
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x2F;/g, '/');
  }
}
