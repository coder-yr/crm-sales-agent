import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  CandidateSignal,
  SIGNAL_STRENGTH_MAP,
  SignalStrengthLabel,
  ValidatedSignal,
} from './signals.types';
import { SignalRulesUtil } from './signal-rules.util';

@Injectable()
export class SignalValidatorService {
  private readonly logger = new Logger(SignalValidatorService.name);

  /**
   * Normalizes text for comparison by removing punctuation, collapsing whitespace,
   * and converting to lowercase.
   */
  public normalizeForComparison(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculates a deterministic SHA-256 fingerprint for deduplication.
   * Based on: tenantId + companyId + type + normalizedTitle + sourceUrl + normalizedEvidence.
   */
  public generateFingerprint(
    tenantId: string,
    companyId: string,
    candidate: { type: string; title: string; sourceUrl: string; evidence: string }
  ): string {
    const normTitle = this.normalizeForComparison(candidate.title);
    const normUrl = (candidate.sourceUrl || '').toLowerCase().trim();
    const normEvidence = this.normalizeForComparison(candidate.evidence).slice(0, 100);

    const payload = `${tenantId}:${companyId}:${candidate.type}:${normTitle}:${normUrl}:${normEvidence}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Validates and normalizes candidate signals against the research context.
   * Rejects signals with fabricated URLs, non-existent evidence, or confidence < 50.
   */
  public validateAndNormalize(
    tenantId: string,
    companyId: string,
    candidates: CandidateSignal[],
    researchData: any
  ): ValidatedSignal[] {
    const validatedSignals: ValidatedSignal[] = [];
    const verifiedSources: string[] = (researchData?.sources || [])
      .map((s: any) => (s?.url ? s.url.toLowerCase().trim() : ''))
      .filter(Boolean);

    const companyWebsite = (researchData?.company?.website || '').toLowerCase().trim();
    if (companyWebsite && !verifiedSources.includes(companyWebsite)) {
      verifiedSources.push(companyWebsite);
    }

    // Build normalized research corpus for evidence verification
    const corpusBlocks: string[] = [];
    if (researchData?.businessSummary) corpusBlocks.push(researchData.businessSummary);
    if (researchData?.company?.description) corpusBlocks.push(researchData.company.description);
    if (Array.isArray(researchData?.businessSignals)) {
      for (const sig of researchData.businessSignals) {
        if (sig.title) corpusBlocks.push(sig.title);
        if (sig.description) corpusBlocks.push(sig.description);
        if (sig.evidence) corpusBlocks.push(sig.evidence);
      }
    }
    if (Array.isArray(researchData?.sources)) {
      for (const src of researchData.sources) {
        if (src.title) corpusBlocks.push(src.title);
      }
    }

    const normalizedCorpus = this.normalizeForComparison(corpusBlocks.join(' '));

    for (const cand of candidates) {
      // 1. Taxonomy Validation
      if (!SignalRulesUtil.isValidSignalType(cand.type)) {
        this.logger.warn(`Rejected signal: type '${cand.type}' not in approved taxonomy.`);
        continue;
      }

      // 2. Source URL Validation: sourceUrl must match a verified research source
      const candUrl = (cand.sourceUrl || '').toLowerCase().trim();
      const isUrlVerified = verifiedSources.some(
        (src) => src === candUrl || candUrl.includes(src) || src.includes(candUrl)
      );

      if (!isUrlVerified && verifiedSources.length > 0) {
        this.logger.warn(`Rejected signal '${cand.title}': sourceUrl '${cand.sourceUrl}' is not in verified research sources.`);
        continue;
      }

      // 3. Evidence Verification: evidence must be contained in research corpus
      const normalizedEvidence = this.normalizeForComparison(cand.evidence);
      if (normalizedEvidence.length < 5) {
        this.logger.warn(`Rejected signal '${cand.title}': evidence is too short or empty.`);
        continue;
      }

      // Check if keywords or key phrase of evidence appears in research corpus
      const evidenceKeywords = normalizedEvidence.split(' ').filter((w) => w.length > 3);
      const matchedKeywords = evidenceKeywords.filter((kw) => normalizedCorpus.includes(kw));
      const keywordMatchRatio = evidenceKeywords.length > 0 ? matchedKeywords.length / evidenceKeywords.length : 0;

      if (keywordMatchRatio < 0.5 && !normalizedCorpus.includes(normalizedEvidence)) {
        this.logger.warn(`Rejected signal '${cand.title}': evidence could not be verified against research text.`);
        continue;
      }

      // 4. Server-Side Confidence Normalization
      let confidence = Math.round(cand.rawConfidence || 75);
      if (confidence > 100) confidence = 100;
      if (confidence < 0) confidence = 0;

      // Strictly enforce threshold of 50
      if (confidence < 50) {
        this.logger.warn(`Rejected signal '${cand.title}': confidence ${confidence} is below minimum threshold (50).`);
        continue;
      }

      // 5. Strength Calculation
      let strengthLabel: SignalStrengthLabel = 'MEDIUM';
      if (confidence >= 85) {
        strengthLabel = 'STRONG';
      } else if (confidence < 70) {
        strengthLabel = 'WEAK';
      }
      const strength = SIGNAL_STRENGTH_MAP[strengthLabel];

      // 6. Deterministic Fingerprint
      const fingerprint = this.generateFingerprint(tenantId, companyId, {
        type: cand.type,
        title: cand.title,
        sourceUrl: cand.sourceUrl,
        evidence: cand.evidence,
      });

      validatedSignals.push({
        type: cand.type,
        title: cand.title.trim(),
        description: cand.description.trim(),
        strength,
        strengthLabel,
        confidence,
        evidence: cand.evidence.trim(),
        source: cand.source,
        sourceUrl: cand.sourceUrl,
        fingerprint,
        detectedAt: new Date(),
      });
    }

    return validatedSignals;
  }
}
