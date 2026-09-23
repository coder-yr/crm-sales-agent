import { Injectable, Logger } from '@nestjs/common';
import {
  OutreachContext,
  OutreachLlmOutput,
  OutreachType,
} from './outreach.types';

export interface GuardValidationResult {
  isValid: boolean;
  reason?: string;
  cleanedOutput?: OutreachLlmOutput;
}

@Injectable()
export class OutreachHallucinationGuardService {
  private readonly logger = new Logger(OutreachHallucinationGuardService.name);

  /**
   * Parses and strictly validates LLM JSON output against verified context.
   */
  validateLlmOutput(rawText: string, context: OutreachContext): GuardValidationResult {
    if (!rawText || typeof rawText !== 'string') {
      return { isValid: false, reason: 'LLM returned empty or non-string response' };
    }

    // 1. Extract JSON block (handles optional markdown fences or whitespace)
    let jsonString = rawText.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err: any) {
      return { isValid: false, reason: `Failed to parse JSON: ${err.message}` };
    }

    // 2. Schema field validation
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, reason: 'Parsed JSON is not an object' };
    }

    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';

    if (!subject || subject.length < 5) {
      return { isValid: false, reason: 'Subject is missing or too short (< 5 chars)' };
    }

    if (subject.length > 120) {
      return { isValid: false, reason: 'Subject is excessively long (> 120 chars)' };
    }

    const words = body.split(/\s+/).filter(Boolean);
    if (words.length < 15) {
      return { isValid: false, reason: `Body is too short (${words.length} words, minimum 15)` };
    }

    if (words.length > 400) {
      return { isValid: false, reason: `Body exceeds maximum length (${words.length} words, max 400)` };
    }

    // 3. Recipient Greeting Check
    const leadFirstName = context.lead.firstName.trim().toLowerCase();
    const leadLastName = context.lead.lastName.trim().toLowerCase();
    const bodyLower = body.toLowerCase();

    const hasGreeting =
      bodyLower.includes(leadFirstName) ||
      bodyLower.includes(leadLastName) ||
      bodyLower.includes('hi there') ||
      bodyLower.includes('hello');

    if (!hasGreeting) {
      return {
        isValid: false,
        reason: `Email does not properly address recipient ${context.lead.firstName}`,
      };
    }

    // 4. Hallucination Check for Unverified Dollar / Financial Claims
    // e.g. "$500 million", "$2 billion", "$10M"
    const dollarMatches = (subject + ' ' + body).match(/\$\s*\d+[\d,.]*\s*(billion|million|k|m|b)?/gi) || [];
    for (const match of dollarMatches) {
      const verifiedDataStr = [
        JSON.stringify(context.signals),
        JSON.stringify(context.deal),
        String(context.lead.budget || ''),
        context.company.description || '',
      ].join(' ').toLowerCase();

      const cleanMatch = match.toLowerCase().replace(/\s+/g, '');
      const digitsOnly = match.replace(/[^\d]/g, '');

      const hasExactMatch = verifiedDataStr.replace(/\s+/g, '').includes(cleanMatch);
      const hasWordMatch = digitsOnly && new RegExp(`\\b${digitsOnly}\\b`).test(verifiedDataStr);

      if (!hasExactMatch && !hasWordMatch) {
        return {
          isValid: false,
          reason: `Hallucinated ungrounded financial claim: "${match}" not found in verified evidence`,
        };
      }
    }

    const personalizationPoints = Array.isArray(parsed.personalizationPoints)
      ? parsed.personalizationPoints.map(String)
      : ['Personalized based on company momentum and stage'];

    const usedEvidence = Array.isArray(parsed.usedEvidence)
      ? parsed.usedEvidence.map(String)
      : context.signals.map((s) => s.id || s.type);

    return {
      isValid: true,
      cleanedOutput: {
        subject,
        body,
        personalizationPoints,
        usedEvidence,
      },
    };
  }

  /**
   * Deterministic Template Generator:
   * Produces battle-tested, high-converting B2B outreach templates
   * when LLM is unavailable, times out, or fails hallucination guard.
   */
  generateFallbackTemplate(context: OutreachContext): OutreachLlmOutput {
    const { lead, company, recommendation, deal, signals, outreachType } = context;
    const leadName = lead.firstName || 'there';
    const compName = company.name || 'your company';

    switch (outreachType) {
      case 'FUNDING_OUTREACH': {
        const fundingSignals = signals.filter((s) => s.type === 'FUNDING').map((s) => s.id || s.type);
        return {
          subject: `Congratulations on ${compName}'s recent momentum`,
          body: `Hi ${leadName},\n\nCongratulations on the recent milestone and growth at ${compName}. As your team accelerates operations following this phase, having seamless visibility across your customer lifecycle often becomes top of mind.\n\nWould you be open to a brief 15-minute conversation this week to discuss how we help high-growth teams scale their sales execution?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: [`Referenced recent funding / growth milestone for ${compName}`],
          usedEvidence: fundingSignals.length > 0 ? fundingSignals : ['FUNDING_MOMENTUM'],
        };
      }

      case 'PRODUCT_LAUNCH_OUTREACH': {
        const prodSignals = signals.filter((s) => s.type === 'PRODUCT_LAUNCH').map((s) => s.id || s.type);
        return {
          subject: `Exciting product launch at ${compName}`,
          body: `Hi ${leadName},\n\nCongratulations on the recent product announcements at ${compName}. With new features going live, scaling customer operations and maintaining seamless engagement is critical.\n\nWould you be open to a quick 15-minute sync to discuss how we support teams during product scaling phases?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: [`Referenced recent product launch at ${compName}`],
          usedEvidence: prodSignals.length > 0 ? prodSignals : ['PRODUCT_LAUNCH'],
        };
      }

      case 'DEMO_OUTREACH': {
        return {
          subject: `Technical architecture walkthrough for ${compName}`,
          body: `Hi ${leadName},\n\nI understand your team is currently evaluating solutions to streamline workflows at ${compName}. I would love to offer a tailored architecture deep dive with one of our solutions engineers to demonstrate exactly how we address your technical requirements.\n\nWould 20 minutes this Thursday or Friday work for your schedule?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: [`Tailored for ${compName} in ${deal?.buyingStage || 'EVALUATION'} stage`],
          usedEvidence: ['EVALUATION_STAGE', 'TECHNICAL_DEMO'],
        };
      }

      case 'RE_ENGAGEMENT': {
        return {
          subject: `Checking in regarding ${compName}`,
          body: `Hi ${leadName},\n\nI wanted to circle back following our earlier conversations regarding ${compName}. Things move quickly, and I wanted to check in on where your team currently stands and whether your operational priorities have evolved.\n\nDo you have a few minutes for a quick catch-up this week?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: ['Re-engagement follow-up after activity pause'],
          usedEvidence: ['STALE_ACTIVITY'],
        };
      }

      case 'BUDGET_OUTREACH': {
        return {
          subject: `Aligning scope and options for ${compName}`,
          body: `Hi ${leadName},\n\nAs we work together on scoping the right solution for ${compName}, I want to make sure we align on your budgetary requirements and rollout timeline so we can provide tailored pricing tiers.\n\nCould we schedule a quick call to review your target budget and scope?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: ['Budget and scope alignment for evaluation stage'],
          usedEvidence: ['CONFIRM_BUDGET'],
        };
      }

      case 'EXECUTIVE_OUTREACH': {
        const ind = company.industry || 'technology';
        return {
          subject: `Strategic alignment for ${compName}`,
          body: `Hi ${leadName},\n\nGiven the strategic initiatives at ${compName}, I wanted to reach out directly to understand how your leadership team is evaluating enterprise systems this quarter. We partner closely with executive leaders in ${ind} to drive measurable operational efficiency.\n\nWould you be open to a brief introductory call with our leadership team?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: [`Executive multi-threading for leadership at ${compName}`],
          usedEvidence: ['EXECUTIVE_OUTREACH'],
        };
      }

      case 'FOLLOW_UP':
      default: {
        const hasHiring = signals.some((s) => s.type === 'HIRING');
        const opening = hasHiring
          ? `I noticed ${compName} is continuing to expand its engineering and product organization.`
          : `I noticed ${compName} is actively accelerating its growth and initiatives.`;

        const evidenceList = signals.map((s) => s.id || s.type);
        return {
          subject: `Supporting ${compName}'s engineering and operational growth`,
          body: `Hi ${leadName},\n\n${opening} Given your current growth, I thought it might be useful to connect around how your team is approaching its infrastructure and tooling needs.\n\nWould you be open to a short conversation this week?\n\nBest regards,\n[Your Name]`,
          personalizationPoints: [
            hasHiring ? `Referenced hiring expansion at ${compName}` : `Referenced growth momentum at ${compName}`,
            `Grounded in verified recommendation: ${recommendation?.title || 'Follow up'}`,
          ],
          usedEvidence: evidenceList.length > 0 ? evidenceList : ['CRM_DEAL_INTELLIGENCE'],
        };
      }
    }
  }
}
