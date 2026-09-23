import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found in this workspace');
    }
    const intelligence = await this.prisma.dealIntelligence.findUnique({
      where: { tenantId_leadId: { tenantId, leadId } },
    });
    if (!intelligence) {
      throw new NotFoundException('Deal intelligence not found for this lead');
    }
    return intelligence;
  }
}
