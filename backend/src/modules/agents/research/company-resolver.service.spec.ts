import { CompanyResolverService, CompanyResolutionException } from './company-resolver.service';

describe('CompanyResolverService', () => {
  let service: CompanyResolverService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      company: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      lead: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new CompanyResolverService(mockPrisma);
  });

  describe('normalizeDomain', () => {
    it('normalizes various url formats into a clean base domain', () => {
      expect(service.normalizeDomain('https://www.Acme.com/about?src=crm')).toBe('acme.com');
      expect(service.normalizeDomain('http://sub.domain.co.uk:8080/path')).toBe('sub.domain.co.uk');
      expect(service.normalizeDomain('WWW.STRIPE.COM')).toBe('stripe.com');
      expect(service.normalizeDomain('user:pass@example.com/login')).toBe('example.com');
    });

    it('handles empty or whitespace inputs gracefully', () => {
      expect(service.normalizeDomain('')).toBe('');
      expect(service.normalizeDomain('   ')).toBe('');
    });
  });

  describe('isFreeEmailDomain', () => {
    it('accurately identifies common free and consumer email providers', () => {
      expect(service.isFreeEmailDomain('john.doe@gmail.com')).toBe(true);
      expect(service.isFreeEmailDomain('jane@yahoo.co.uk')).toBe(true);
      expect(service.isFreeEmailDomain('user@hotmail.com')).toBe(true);
      expect(service.isFreeEmailDomain('lead@outlook.com')).toBe(true);
      expect(service.isFreeEmailDomain('icloud.com')).toBe(true);
      expect(service.isFreeEmailDomain('protonmail.com')).toBe(true);
    });

    it('does not classify business/corporate domains as free email', () => {
      expect(service.isFreeEmailDomain('alex@dealpilot.ai')).toBe(false);
      expect(service.isFreeEmailDomain('sarah@acme-corp.com')).toBe(false);
      expect(service.isFreeEmailDomain('contact@stripe.com')).toBe(false);
    });
  });

  describe('resolveCompany', () => {
    it('resolves direct company entity when exists within tenant', async () => {
      mockPrisma.company.findFirst.mockResolvedValue({
        id: 'comp-1',
        tenantId: 'tenant-A',
        name: 'Acme Corp',
        domain: 'acme.com',
      });

      const res = await service.resolveCompany('tenant-A', 'Company', 'comp-1');
      expect(res.company.id).toBe('comp-1');
      expect(res.domain).toBe('acme.com');
      expect(res.source).toBe('DIRECT_COMPANY');
    });

    it('rejects cross-tenant company entity', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(service.resolveCompany('tenant-A', 'Company', 'comp-B')).rejects.toThrow(
        CompanyResolutionException
      );
    });

    it('resolves lead with existing linked company within tenant', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        tenantId: 'tenant-A',
        companyId: 'comp-1',
        company: {
          id: 'comp-1',
          name: 'Stripe Inc',
          domain: 'stripe.com',
        },
      });

      const res = await service.resolveCompany('tenant-A', 'Lead', 'lead-1');
      expect(res.company.name).toBe('Stripe Inc');
      expect(res.domain).toBe('stripe.com');
      expect(res.source).toBe('LEAD_COMPANY_LINK');
    });

    it('resolves and links company from corporate email domain', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        tenantId: 'tenant-A',
        email: 'john@datadoghq.com',
        companyId: null,
      });

      // No company found initially
      mockPrisma.company.findFirst.mockResolvedValue(null);
      // Created company
      mockPrisma.company.create.mockResolvedValue({
        id: 'comp-new',
        tenantId: 'tenant-A',
        name: 'Datadoghq',
        domain: 'datadoghq.com',
      });

      const res = await service.resolveCompany('tenant-A', 'Lead', 'lead-1');
      expect(res.company.domain).toBe('datadoghq.com');
      expect(res.source).toBe('LEAD_EMAIL_DOMAIN');
      // Verifies lead was linked to newly resolved company
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { companyId: 'comp-new' },
      });
    });

    it('fails gracefully when lead only has a free public email address', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        tenantId: 'tenant-A',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@gmail.com',
        companyId: null,
        notes: null,
        source: null,
      });

      await expect(service.resolveCompany('tenant-A', 'Lead', 'lead-1')).rejects.toThrow(
        CompanyResolutionException
      );
    });
  });
});
