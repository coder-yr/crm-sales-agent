import { APPROVED_SIGNAL_TYPES, CandidateSignal, SignalType } from './signals.types';

export class SignalRulesUtil {
  /**
   * Neutralizes prompt injection patterns in external text so it cannot
   * be executed as instructions.
   */
  public static sanitizeExternalText(text: string): string {
    if (!text) return '';
    return text
      .replace(/ignore\s+previous\s+instructions/gi, '[neutralized]')
      .replace(/system\s*:/gi, '[text-block:]')
      .replace(/assistant\s*:/gi, '[text-block:]')
      .replace(/user\s*:/gi, '[text-block:]')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .trim();
  }

  /**
   * Validates if a signal type string is within the approved taxonomy.
   */
  public static isValidSignalType(type: string): type is SignalType {
    return (APPROVED_SIGNAL_TYPES as readonly string[]).includes(type);
  }

  /**
   * Deterministic evidence-first extraction of candidate signals from
   * structured research output and crawled text excerpts.
   */
  public static extractCandidateSignals(researchData: any): CandidateSignal[] {
    const candidates: CandidateSignal[] = [];
    if (!researchData) return candidates;

    const sources: Array<{ title?: string; url?: string; sourceType?: string }> = researchData.sources || [];
    const primaryUrl = sources[0]?.url || researchData.company?.website || '';

    // Collect all text blocks paired with their authoritative source URL
    const textCorpus: Array<{ text: string; sourceUrl: string; pageType: string }> = [];

    if (researchData.businessSummary) {
      textCorpus.push({
        text: this.sanitizeExternalText(researchData.businessSummary),
        sourceUrl: primaryUrl,
        pageType: 'HOMEPAGE',
      });
    }

    // Inspect pre-extracted businessSignals from Phase 4
    if (Array.isArray(researchData.businessSignals)) {
      for (const sig of researchData.businessSignals) {
        if (!sig || !sig.title) continue;
        const sanitizedEvidence = this.sanitizeExternalText(sig.evidence || sig.description || sig.title);
        const mappedType = this.normalizeRawSignalType(sig.type);

        if (mappedType && this.isValidSignalType(mappedType)) {
          // Validate that the evidence meets strict criteria for that type
          if (this.hasMeaningfulEvidence(mappedType, sanitizedEvidence, sig.title)) {
            candidates.push({
              type: mappedType,
              title: sig.title.trim(),
              description: sig.description || `Detected ${mappedType.toLowerCase()} signal from company sources.`,
              evidence: sanitizedEvidence,
              sourceUrl: sig.sourceUrl || primaryUrl,
              source: this.deriveSourceLabel(sig.sourceUrl || primaryUrl),
              rawConfidence: sig.confidence ? Math.round(sig.confidence > 1 ? sig.confidence : sig.confidence * 100) : 85,
            });
          }
        }
      }
    }

    // Inspect sources and titles for explicit signal occurrences
    for (const src of sources) {
      if (!src.url) continue;
      const cleanTitle = this.sanitizeExternalText(src.title || '');

      // Check Careers page
      if (src.url.includes('/career') || src.url.includes('/jobs') || src.sourceType === 'CAREERS') {
        if (cleanTitle.toLowerCase().includes('hiring') || cleanTitle.toLowerCase().includes('open roles') || cleanTitle.toLowerCase().includes('jobs') || cleanTitle.toLowerCase().includes('careers')) {
          candidates.push({
            type: 'HIRING',
            title: 'Actively recruiting and hiring new talent',
            description: 'Company maintains an active careers portal with open job opportunities.',
            evidence: cleanTitle || 'Active careers and job openings page verified on company domain.',
            sourceUrl: src.url,
            source: 'CAREERS_PAGE',
            rawConfidence: 90,
          });
        }
      }

      // Check News / Press page
      if (src.url.includes('/news') || src.url.includes('/press') || src.sourceType === 'NEWS') {
        if (cleanTitle.length > 15) {
          candidates.push({
            type: 'NEWS',
            title: cleanTitle.length > 80 ? cleanTitle.slice(0, 77) + '...' : cleanTitle,
            description: 'Official corporate media release or public news announcement.',
            evidence: cleanTitle,
            sourceUrl: src.url,
            source: 'NEWS_PAGE',
            rawConfidence: 85,
          });
        }
      }
    }

    // Inspect summary text for explicit funding, expansion, product launches, partnerships
    if (researchData.businessSummary) {
      const summaryText = this.sanitizeExternalText(researchData.businessSummary);
      const sentences = summaryText.split(/(?<=[.?!])\s+/);

      for (const sentence of sentences) {
        // 1. FUNDING (Requires explicit numbers/rounds, rejects generic "growing")
        if (
          /\b(series\s+[a-d]|seed\s+round|raised\s+\$\d+|secured\s+\$\d+|million\s+in\s+funding|venture\s+capital)\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'FUNDING',
            title: 'Secured venture investment or funding round',
            description: 'Evidence of institutional investment or completed venture financing round.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'COMPANY_ANNOUNCEMENT',
            rawConfidence: 92,
          });
        }

        // 2. EXPANSION (Requires new office/location, rejects generic "expanding")
        if (
          /\b(opened\s+(a\s+)?new\s+(office|headquarters|hub|facility)|expanded\s+to\s+[A-Z][a-z]+|new\s+location\s+in)\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'EXPANSION',
            title: 'Geographic or operational footprint expansion',
            description: 'Company expanded operations or opened facilities in a new market/location.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'COMPANY_OVERVIEW',
            rawConfidence: 88,
          });
        }

        // 3. PRODUCT_LAUNCH
        if (
          /\b(launched|announced\s+the\s+release|introducing|unveiled\s+(a\s+)?new\s+product|general\s+availability)\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'PRODUCT_LAUNCH',
            title: 'Commercial launch of new product or major capability',
            description: 'Company introduced a new product offering or commercial solution.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'PRODUCT_ANNOUNCEMENT',
            rawConfidence: 86,
          });
        }

        // 4. PARTNERSHIP
        if (
          /\b(partnered\s+with|strategic\s+partnership|announced\s+partnership|integrated\s+with|alliance\s+with)\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'PARTNERSHIP',
            title: 'Strategic technology or distribution partnership',
            description: 'Collaborative integration or commercial partnership announced.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'PARTNERSHIP_ANNOUNCEMENT',
            rawConfidence: 84,
          });
        }

        // 5. LEADERSHIP_CHANGE
        if (
          /\b(appointed\s+as\s+(CEO|CTO|CFO|COO|President|Vice\s+President)|welcomes\s+new\s+(CEO|CTO|executive)|named\s+(CEO|CTO))\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'LEADERSHIP_CHANGE',
            title: 'Executive leadership or C-suite appointment',
            description: 'Senior executive appointment or leadership transition announced.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'LEADERSHIP_UPDATE',
            rawConfidence: 91,
          });
        }

        // 6. GROWTH (Requires explicit milestone, rejects generic "growing fast")
        if (
          /\b(surpassed\s+\d+|crossed\s+\d+\s+(users|customers|clients)|doubled\s+(its\s+)?(workforce|headcount|team)|reached\s+\$\d+[kKmMbB]?\s*(million|ARR|revenue|in\s+revenue))\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'GROWTH',
            title: 'Key business scale or customer milestone reached',
            description: 'Verified business milestone demonstrating customer adoption or scale.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'COMPANY_MILESTONES',
            rawConfidence: 87,
          });
        }

        // 7. ENGAGEMENT (Requires explicit conference/webinar/hackathon)
        if (
          /\b(hosting\s+(annual\s+)?(conference|summit|webinar)|developer\s+conference|upcoming\s+webinar|developer\s+hackathon)\b/i.test(sentence)
        ) {
          candidates.push({
            type: 'ENGAGEMENT',
            title: 'Hosting industry conference or customer webinar event',
            description: 'Active event, community gathering, or technical developer workshop hosted.',
            evidence: sentence.trim(),
            sourceUrl: primaryUrl,
            source: 'EVENT_PAGE',
            rawConfidence: 82,
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Normalizes raw signal types to the approved 10-type taxonomy.
   */
  private static normalizeRawSignalType(raw: string): SignalType | null {
    if (!raw) return null;
    const upper = raw.toUpperCase().trim();
    if (upper === 'HIRING') return 'HIRING';
    if (upper === 'EXPANSION') return 'EXPANSION';
    if (upper === 'NEWS') return 'NEWS';
    if (upper === 'LEADERSHIP_CHANGE' || upper === 'LEADERSHIP') return 'LEADERSHIP_CHANGE';
    if (upper === 'PRODUCT_LAUNCH' || upper === 'PRODUCT') return 'PRODUCT_LAUNCH';
    if (upper === 'PARTNERSHIP') return 'PARTNERSHIP';
    if (upper === 'FUNDING') return 'FUNDING';
    if (upper === 'GROWTH') return 'GROWTH';
    if (upper === 'ENGAGEMENT') return 'ENGAGEMENT';
    // WEBSITE_CHANGE is intentionally deferred in Phase 5
    if (upper === 'TECHNOLOGY_ADOPTION' || upper === 'TECH_STACK') return 'PRODUCT_LAUNCH';
    return null;
  }

  /**
   * Enforces that candidate evidence is meaningful and not just generic buzzwords.
   */
  private static hasMeaningfulEvidence(type: SignalType, evidence: string, title: string): boolean {
    const combined = `${title} ${evidence}`.toLowerCase();
    if (type === 'HIRING') {
      // Must have hiring context, not just the single word "career"
      return /\b(hiring|open\s+roles|job\s+openings|join\s+our\s+team|recruit|careers\s+at|we're\s+looking\s+for)\b/i.test(combined);
    }
    if (type === 'FUNDING') {
      // Must have funding round or dollar/currency amount
      return /\b(series\s+[a-d]|seed|raised|\$|funding|invest|capital)\b/i.test(combined);
    }
    if (type === 'GROWTH') {
      // Must have concrete metric or scale indicator
      return /\b(\d+\s*(k|m|%)|users|customers|doubled|tripled|milestone|arr|revenue)\b/i.test(combined);
    }
    if (type === 'ENGAGEMENT') {
      // Must have conference/event/webinar indicator
      return /\b(conference|summit|webinar|meetup|workshop|event)\b/i.test(combined);
    }
    return evidence.length >= 10;
  }

  private static deriveSourceLabel(url: string): string {
    if (url.includes('/careers') || url.includes('/jobs')) return 'CAREERS_PAGE';
    if (url.includes('/news') || url.includes('/press')) return 'NEWS_PAGE';
    if (url.includes('/about')) return 'ABOUT_PAGE';
    if (url.includes('/blog')) return 'BLOG_PAGE';
    return 'COMPANY_PAGE';
  }
}
