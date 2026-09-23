import { Test, TestingModule } from '@nestjs/testing';
import { SignalValidatorService } from './signal-validator.service';
import { CandidateSignal } from './signals.types';

describe('SignalValidatorService', () => {
  let service: SignalValidatorService;
  const tenantId = 'test-tenant-123';
  const companyId = 'test-company-456';

  const sampleResearch = {
    businessSummary:
      'Acme Corp is expanding its engineering team with new openings in Austin. Acme raised $30M in Series B financing.',
    sources: [
      { url: 'https://acme.corp/careers', title: 'Acme Careers' },
      { url: 'https://acme.corp/news', title: 'Acme News' },
    ],
    company: {
      website: 'https://acme.corp',
      description: 'Acme Corp enterprise provider.',
    },
    businessSignals: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalValidatorService],
    }).compile();

    service = module.get<SignalValidatorService>(SignalValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Evidence Verification', () => {
    it('should validate candidate when evidence is present in research text', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Active Tech Hiring',
          description: 'Hiring engineering team in Austin',
          evidence: 'expanding its engineering team with new openings in Austin',
          sourceUrl: 'https://acme.corp/careers',
          source: 'CAREERS_PAGE',
          rawConfidence: 85,
        },
      ];

      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results.length).toBe(1);
      const res = results[0];
      expect(res.type).toBe('HIRING');
      expect(res.strengthLabel).toBe('STRONG');
      expect(res.strength).toBe(1.0);
      expect(res.confidence).toBe(85);
      expect(res.fingerprint).toBeDefined();
      expect(res.fingerprint.length).toBe(64); // SHA-256
    });

    it('should reject candidate when evidence is NOT grounded in research corpus', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Fabricated Hiring Signal',
          description: 'Hiring Quantum Cryptographers',
          evidence: 'Quantum Cryptographers on Mars with lasers and antimatter',
          sourceUrl: 'https://acme.corp/careers',
          source: 'UNKNOWN',
          rawConfidence: 90,
        },
      ];

      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results.length).toBe(0);
    });
  });

  describe('Source URL Verification', () => {
    it('should validate candidate with verified sourceUrl matching research sources', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'FUNDING',
          title: 'Series B Funding',
          description: 'Acme raised $30M in Series B financing.',
          evidence: 'Acme raised $30M in Series B financing',
          sourceUrl: 'https://acme.corp/news',
          source: 'NEWS_PAGE',
          rawConfidence: 88,
        },
      ];

      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results.length).toBe(1);
      expect(results[0].sourceUrl).toBe('https://acme.corp/news');
    });

    it('should reject candidate with unverified external sourceUrl not in research', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'EXPANSION',
          title: 'Austin Expansion',
          description: 'Expanding engineering team in Austin',
          evidence: 'expanding its engineering team with new openings in Austin',
          sourceUrl: 'https://unverified-third-party-blog.com/rumors',
          source: 'BLOG',
          rawConfidence: 80,
        },
      ];

      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results.length).toBe(0);
    });
  });

  describe('Confidence Clamping and Thresholds', () => {
    it('should reject candidates with confidence < 50', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Low Confidence Hiring',
          description: 'Hiring engineering team',
          evidence: 'expanding its engineering team',
          sourceUrl: 'https://acme.corp/careers',
          source: 'CAREERS',
          rawConfidence: 45,
        },
      ];

      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results.length).toBe(0);
    });

    it('should clamp confidence scores up to 100', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Super High Confidence',
          description: 'Hiring engineering team',
          evidence: 'expanding its engineering team',
          sourceUrl: 'https://acme.corp/careers',
          source: 'CAREERS',
          rawConfidence: 150,
        },
      ];

      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results.length).toBe(1);
      expect(results[0].confidence).toBe(100);
      expect(results[0].strengthLabel).toBe('STRONG');
      expect(results[0].strength).toBe(1.0);
    });

    it('should map confidence >= 85 to STRONG (1.0)', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Hiring Test',
          description: 'Hiring engineering team',
          evidence: 'expanding its engineering team',
          sourceUrl: 'https://acme.corp/careers',
          source: 'CAREERS',
          rawConfidence: 85,
        },
      ];
      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results[0].strengthLabel).toBe('STRONG');
      expect(results[0].strength).toBe(1.0);
    });

    it('should map confidence between 70 and 84 to MEDIUM (0.7)', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Hiring Test',
          description: 'Hiring engineering team',
          evidence: 'expanding its engineering team',
          sourceUrl: 'https://acme.corp/careers',
          source: 'CAREERS',
          rawConfidence: 75,
        },
      ];
      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results[0].strengthLabel).toBe('MEDIUM');
      expect(results[0].strength).toBe(0.7);
    });

    it('should map confidence < 70 (and >= 50) to WEAK (0.4)', () => {
      const candidates: CandidateSignal[] = [
        {
          type: 'HIRING',
          title: 'Hiring Test',
          description: 'Hiring engineering team',
          evidence: 'expanding its engineering team',
          sourceUrl: 'https://acme.corp/careers',
          source: 'CAREERS',
          rawConfidence: 60,
        },
      ];
      const results = service.validateAndNormalize(tenantId, companyId, candidates, sampleResearch);
      expect(results[0].strengthLabel).toBe('WEAK');
      expect(results[0].strength).toBe(0.4);
    });
  });

  describe('Deterministic Fingerprinting', () => {
    it('should generate identical fingerprints for identical inputs', () => {
      const candidate = {
        type: 'HIRING',
        title: 'Staff Software Engineer Hiring',
        evidence: 'Staff Software Engineer',
        sourceUrl: 'https://acme.corp/careers',
      };

      const fp1 = service.generateFingerprint(tenantId, companyId, candidate);
      const fp2 = service.generateFingerprint(tenantId, companyId, candidate);
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different types or evidence', () => {
      const candidateA = {
        type: 'HIRING',
        title: 'Staff Software Engineer Hiring',
        evidence: 'Staff Software Engineer',
        sourceUrl: 'https://acme.corp/careers',
      };

      const candidateB = {
        type: 'EXPANSION',
        title: 'Staff Software Engineer Hiring',
        evidence: 'Staff Software Engineer',
        sourceUrl: 'https://acme.corp/careers',
      };

      expect(service.generateFingerprint(tenantId, companyId, candidateA)).not.toBe(
        service.generateFingerprint(tenantId, companyId, candidateB)
      );
    });
  });
});
