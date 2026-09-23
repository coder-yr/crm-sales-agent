import { HtmlExtractorService } from './html-extractor.service';
import { FetchedPage } from './website-fetcher.service';

describe('HtmlExtractorService', () => {
  let service: HtmlExtractorService;

  beforeEach(() => {
    service = new HtmlExtractorService();
  });

  describe('extractSinglePage', () => {
    it('extracts title, meta description, and headings accurately', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Acme Cloud - Leading Multi-Cloud Management</title>
            <meta name="description" content="Acme Cloud helps enterprises orchestrate multi-cloud infrastructure." />
          </head>
          <body>
            <header><nav><a href="/home">Home</a></nav></header>
            <h1>Simplify Your Cloud Operations</h1>
            <h2>Automated Kubernetes & Cloud Cost Optimization</h2>
            <p>We provide automated infrastructure scaling and observability.</p>
            <script>console.log("analytics");</script>
            <style>.hero { color: red; }</style>
            <footer><p>© 2026 Acme Corp. All rights reserved.</p></footer>
          </body>
        </html>
      `;

      const page: FetchedPage = {
        url: 'https://acme.com',
        finalUrl: 'https://acme.com',
        status: 200,
        contentType: 'text/html',
        html,
        pageType: 'HOMEPAGE',
      };

      const extracted = service.extractSinglePage(page);
      expect(extracted.title).toBe('Acme Cloud - Leading Multi-Cloud Management');
      expect(extracted.metaDescription).toBe('Acme Cloud helps enterprises orchestrate multi-cloud infrastructure.');
      expect(extracted.headings).toContain('Simplify Your Cloud Operations');
      expect(extracted.headings).toContain('Automated Kubernetes & Cloud Cost Optimization');
      expect(extracted.cleanText).not.toContain('console.log');
      expect(extracted.cleanText).not.toContain('.hero { color: red; }');
      expect(extracted.cleanText).toContain('We provide automated infrastructure scaling');
    });

    it('finds relevant company internal links', () => {
      const html = `
        <div>
          <a href="/about-us">About Us</a>
          <a href="/products/cloud-suite">Products</a>
          <a href="/careers">Careers</a>
          <a href="#section">Anchor</a>
          <a href="mailto:info@acme.com">Mail</a>
        </div>
      `;

      const page: FetchedPage = {
        url: 'https://acme.com',
        finalUrl: 'https://acme.com',
        status: 200,
        contentType: 'text/html',
        html,
        pageType: 'HOMEPAGE',
      };

      const extracted = service.extractSinglePage(page);
      expect(extracted.internalLinks).toContain('/about-us');
      expect(extracted.internalLinks).toContain('/products/cloud-suite');
      expect(extracted.internalLinks).toContain('/careers');
      expect(extracted.internalLinks).not.toContain('#section');
      expect(extracted.internalLinks).not.toContain('mailto:info@acme.com');
    });
  });

  describe('extractFromPages (Context Bounding)', () => {
    it('bounds total context text length to avoid unbounded LLM input', () => {
      const longText = 'A'.repeat(5000);
      const pages: FetchedPage[] = [
        {
          url: 'https://acme.com',
          finalUrl: 'https://acme.com',
          status: 200,
          contentType: 'text/html',
          html: `<title>Page 1</title><body><p>${longText}</p></body>`,
          pageType: 'HOMEPAGE',
        },
        {
          url: 'https://acme.com/about',
          finalUrl: 'https://acme.com/about',
          status: 200,
          contentType: 'text/html',
          html: `<title>Page 2</title><body><p>${longText}</p></body>`,
          pageType: 'ABOUT',
        },
        {
          url: 'https://acme.com/products',
          finalUrl: 'https://acme.com/products',
          status: 200,
          contentType: 'text/html',
          html: `<title>Page 3</title><body><p>${longText}</p></body>`,
          pageType: 'PRODUCTS',
        },
      ];

      const combined = service.extractFromPages('acme.com', pages);
      expect(combined.boundedTextContent.length).toBeLessThanOrEqual(12100);
    });
  });
});
