import { ResearchExtractorService } from './research-extractor.service';
import { CombinedResearchContext } from './html-extractor.service';

describe('ResearchExtractorService', () => {
  let service: ResearchExtractorService;
  let mockConfigService: any;
  let mockLlmService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
    mockLlmService = {
      generate: jest.fn(),
    };
    service = new ResearchExtractorService(mockConfigService, mockLlmService);
  });

  describe('deterministicExtraction', () => {
    it('accurately extracts structured company intelligence and signals', () => {
      const context: CombinedResearchContext = {
        domain: 'finflow-payments.com',
        pagesCount: 2,
        extractedPages: [
          {
            url: 'https://finflow-payments.com',
            pageType: 'HOMEPAGE',
            title: 'FinFlow - Next Generation Payment Infrastructure for B2B',
            metaDescription: 'FinFlow provides automated global payment orchestration and instant settlements.',
            headings: ['Payment Orchestration', 'Smart Routing Engine', 'Instant Cross-Border Transfers'],
            cleanText: `
              FinFlow provides automated global payment orchestration for modern enterprises and startups.
              Built on React, Next.js, and TypeScript, backed by AWS and PostgreSQL.
              Headquartered in San Francisco, California.
              Founded in 2021.
              We are actively partnered with major European commercial banks.
            `,
            internalLinks: ['/about', '/careers'],
          },
          {
            url: 'https://finflow-payments.com/careers',
            pageType: 'CAREERS',
            title: 'Careers at FinFlow',
            metaDescription: 'Join our team to transform global financial rails.',
            headings: ['Open Positions', 'Staff Backend Engineer', 'Product Manager - Payments'],
            cleanText: `
              We are hiring! Explore our open positions across engineering, product, and sales.
              Join our team to revolutionize fintech.
            `,
            internalLinks: [],
          },
        ],
        boundedTextContent: `FinFlow Next Generation Payment Infrastructure. Headquartered in San Francisco. Founded in 2021. Built on React and AWS. We are hiring for open positions. Partnered with major banks.`,
      };

      const result = service.deterministicExtraction('FinFlow', 'finflow-payments.com', context);

      // 1. Company profile
      expect(result.company.name).toBe('FinFlow');
      expect(result.company.domain).toBe('finflow-payments.com');
      expect(result.company.industry).toContain('FinTech');
      expect(result.company.foundedYear).toBe(2021);
      expect(result.company.location).toContain('San Francisco');
      expect(result.company.employeeCount).toBeNull(); // Factual claim absent, so null

      // 2. Offerings & Technologies
      expect(result.productsOrServices).toContain('Payment Orchestration');
      expect(result.technologies).toContain('React');
      expect(result.technologies).toContain('Next.js');
      expect(result.technologies).toContain('AWS');
      expect(result.technologies).toContain('PostgreSQL');

      // 3. Signals with evidence
      const hiringSignal = result.businessSignals.find((s) => s.type === 'HIRING');
      expect(hiringSignal).toBeDefined();
      expect(hiringSignal?.evidence).toBeDefined();
      expect(hiringSignal?.sourceUrl).toBe('https://finflow-payments.com/careers');

      const partnershipSignal = result.businessSignals.find((s) => s.type === 'PARTNERSHIP');
      expect(partnershipSignal).toBeDefined();

      // 4. Sources
      expect(result.sources.length).toBe(2);
      expect(result.sources[0].url).toBe('https://finflow-payments.com');
    });

    it('returns empty arrays and nulls when information is absent to avoid hallucination', () => {
      const context: CombinedResearchContext = {
        domain: 'minimal.io',
        pagesCount: 1,
        extractedPages: [
          {
            url: 'https://minimal.io',
            pageType: 'HOMEPAGE',
            title: 'Minimal',
            metaDescription: '',
            headings: [],
            cleanText: 'Simple welcome page.',
            internalLinks: [],
          },
        ],
        boundedTextContent: 'Simple welcome page.',
      };

      const result = service.deterministicExtraction('Minimal', 'minimal.io', context);
      expect(result.company.industry).toBeNull();
      expect(result.company.location).toBeNull();
      expect(result.company.foundedYear).toBeNull();
      expect(result.company.employeeCount).toBeNull();
      expect(result.technologies).toEqual([]);
      expect(result.businessSignals).toEqual([]);
    });
  });
});
