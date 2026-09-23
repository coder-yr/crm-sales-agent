import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.company.findMany({
      where: { tenantId },
    });
  }

  async findOne(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this workspace');
    }
    return company;
  }

  async update(tenantId: string, id: string, data: UpdateCompanyDto) {
    // Check existence and ownership
    await this.findOne(tenantId, id);
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
