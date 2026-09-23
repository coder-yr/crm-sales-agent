import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SignalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.companySignal.findMany({
      where: { tenantId },
      include: { company: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const signal = await this.prisma.companySignal.findFirst({
      where: { id, tenantId },
      include: { company: true },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found in this workspace');
    }
    return signal;
  }

  async findByCompany(tenantId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this workspace');
    }
    return this.prisma.companySignal.findMany({
      where: { companyId, tenantId },
    });
  }
}
