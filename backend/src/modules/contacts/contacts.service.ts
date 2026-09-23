import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: CreateContactDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this workspace');
    }

    return this.prisma.contact.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.contact.findMany({
      where: { tenantId },
      include: { company: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: { company: true },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found in this workspace');
    }
    return contact;
  }

  async update(tenantId: string, id: string, data: UpdateContactDto) {
    await this.findOne(tenantId, id);

    if (data.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: data.companyId, tenantId },
      });
      if (!company) {
        throw new ForbiddenException('Cannot move contact to a company outside this workspace');
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.contact.delete({
      where: { id },
    });
  }
}
