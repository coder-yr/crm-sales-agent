import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createPropertyDto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        ...createPropertyDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async update(tenantId: string, id: string, updatePropertyDto: UpdatePropertyDto) {
    const { version, ...data } = updatePropertyDto;
    const property = await this.findOne(tenantId, id);

    const where: any = { id, tenantId };
    if (version) where.version = version;

    try {
      return await this.prisma.property.update({
        where,
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (e) {
      if (e.code === 'P2025') {
        throw new ConflictException('Concurrency conflict: Property has been modified by another user');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.property.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
