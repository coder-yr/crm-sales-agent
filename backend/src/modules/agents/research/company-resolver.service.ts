import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Company } from '@prisma/client';

export class CompanyResolutionException extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'COMPANY_RESOLUTION_FAILED') {
    super(message);
    this.name = 'CompanyResolutionException';
    this.code = code;
  }
}

// Common public/free email providers that MUST NOT be used to resolve companies
export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'ymail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
  'tutanota.com',
  'yandex.com',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'rediffmail.com',
  'inbox.com',
]);

@Injectable()
export class CompanyResolverService {
  private readonly logger = new Logger(CompanyResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes a raw domain or website string to a bare lowercase domain.
   * e.g., "https://www.ACME.com/about?query=1" -> "acme.com"
   */
  public normalizeDomain(rawDomainOrUrl: string): string {
    if (!rawDomainOrUrl) return '';

    let cleaned = rawDomainOrUrl.trim().toLowerCase();

    // Remove protocol if present
    cleaned = cleaned.replace(/^[a-z]+:\/\//, '');

    // Remove basic authentication if present (e.g. user:pass@domain)
    if (cleaned.includes('@')) {
      cleaned = cleaned.split('@').pop() || '';
    }

    // Extract hostname up to path or query separator
    cleaned = cleaned.split(/[/?#:]/)[0];

    // Remove 'www.' prefix
    cleaned = cleaned.replace(/^www\./, '');

    return cleaned.trim();
  }

  /**
   * Checks if an email address or domain belongs to a free/public email provider.
   */
  public isFreeEmailDomain(domainOrEmail: string): boolean {
    if (!domainOrEmail) return false;
    let domain = domainOrEmail.toLowerCase().trim();
    if (domain.includes('@')) {
      domain = domain.split('@').pop() || '';
    }
    return FREE_EMAIL_DOMAINS.has(domain);
  }

  /**
   * Resolves or links the Company for a given CRM Lead or Company entity
   * strictly within tenant isolation boundaries.
   */
  public async resolveCompany(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<{ company: Company; source: string; domain: string }> {
    // 1. Direct Company Entity resolution
    if (entityType === 'Company') {
      const company = await this.prisma.company.findFirst({
        where: { id: entityId, tenantId },
      });

      if (!company) {
        throw new CompanyResolutionException(
          `Company with ID '${entityId}' not found or does not belong to your workspace.`,
          'COMPANY_NOT_FOUND'
        );
      }

      let domain = this.normalizeDomain(company.domain || company.websiteUrl || '');
      if (!domain) {
        throw new CompanyResolutionException(
          `Company '${company.name}' does not have a domain or websiteUrl specified.`,
          'COMPANY_MISSING_DOMAIN'
        );
      }

      return { company, source: 'DIRECT_COMPANY', domain };
    }

    // 2. Lead Entity resolution
    if (entityType === 'Lead') {
      const lead = await this.prisma.lead.findFirst({
        where: { id: entityId, tenantId },
        include: { company: true },
      });

      if (!lead) {
        throw new CompanyResolutionException(
          `Lead with ID '${entityId}' not found or does not belong to your workspace.`,
          'LEAD_NOT_FOUND'
        );
      }

      // 2a. Existing lead.companyId
      if (lead.companyId && lead.company) {
        let domain = this.normalizeDomain(lead.company.domain || lead.company.websiteUrl || '');
        if (domain) {
          return { company: lead.company, source: 'LEAD_COMPANY_LINK', domain };
        }
      }

      // 2b. Attempt resolution via corporate email domain
      if (lead.email) {
        const emailDomain = this.normalizeDomain(lead.email.split('@')[1] || '');

        if (emailDomain) {
          if (this.isFreeEmailDomain(emailDomain)) {
            this.logger.warn(
              `Lead ${lead.id} uses free email provider '${emailDomain}'. Cannot derive company from free email.`
            );
          } else {
            // Check if a Company with this domain already exists in the same tenant
            let existingCompany = await this.prisma.company.findFirst({
              where: {
                tenantId,
                OR: [
                  { domain: emailDomain },
                  { websiteUrl: { contains: emailDomain } },
                ],
              },
            });

            if (!existingCompany) {
              // Create company for this tenant deterministically
              const companyName = this.formatCompanyNameFromDomain(emailDomain);
              existingCompany = await this.prisma.company.create({
                data: {
                  tenantId,
                  name: companyName,
                  domain: emailDomain,
                  websiteUrl: `https://${emailDomain}`,
                },
              });
              this.logger.log(`Created new Company '${companyName}' (${emailDomain}) for tenant ${tenantId}`);
            }

            // Link to lead if not linked
            if (lead.companyId !== existingCompany.id) {
              await this.prisma.lead.update({
                where: { id: lead.id },
                data: { companyId: existingCompany.id },
              });
            }

            return { company: existingCompany, source: 'LEAD_EMAIL_DOMAIN', domain: emailDomain };
          }
        }
      }

      // 2c. Fallback check: notes or other fields for a valid domain (e.g. "www.acme.com")
      const textToScan = `${lead.notes || ''} ${lead.source || ''}`;
      const foundDomain = this.extractDomainFromText(textToScan);

      if (foundDomain && !this.isFreeEmailDomain(foundDomain)) {
        let existingCompany = await this.prisma.company.findFirst({
          where: {
            tenantId,
            OR: [
              { domain: foundDomain },
              { websiteUrl: { contains: foundDomain } },
            ],
          },
        });

        if (!existingCompany) {
          const companyName = this.formatCompanyNameFromDomain(foundDomain);
          existingCompany = await this.prisma.company.create({
            data: {
              tenantId,
              name: companyName,
              domain: foundDomain,
              websiteUrl: `https://${foundDomain}`,
            },
          });
        }

        if (lead.companyId !== existingCompany.id) {
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { companyId: existingCompany.id },
          });
        }

        return { company: existingCompany, source: 'LEAD_TEXT_DISCOVERY', domain: foundDomain };
      }

      // If we reach here, resolution failed
      throw new CompanyResolutionException(
        lead.email && this.isFreeEmailDomain(lead.email)
          ? `Unable to resolve company: Lead email uses public provider '${lead.email.split('@')[1]}' and no company or business domain is associated.`
          : `Unable to resolve company: Lead '${lead.firstName} ${lead.lastName}' has no linked company, valid business email, or website domain.`,
        'COMPANY_RESOLUTION_UNRESOLVED'
      );
    }

    throw new CompanyResolutionException(
      `Unsupported entityType '${entityType}'. Supported types are 'Lead' and 'Company'.`,
      'UNSUPPORTED_ENTITY_TYPE'
    );
  }

  /**
   * Helper to format a neat company name from a domain.
   * e.g., "datadog-inc.com" -> "Datadog Inc"
   */
  private formatCompanyNameFromDomain(domain: string): string {
    const sld = domain.split('.')[0] || domain;
    return sld
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Scans text for domain patterns (e.g. acme-tech.com or https://company.io)
   */
  private extractDomainFromText(text: string): string | null {
    if (!text) return null;
    const match = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.(?:com|org|net|io|co|ai|tech|app|biz|in|uk|de|eu))/i);
    return match ? this.normalizeDomain(match[1]) : null;
  }
}
