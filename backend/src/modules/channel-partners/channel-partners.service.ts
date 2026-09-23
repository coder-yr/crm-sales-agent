import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChannelPartnerDto } from './dto/create-channel-partner.dto';
import { UpdateChannelPartnerDto } from './dto/update-channel-partner.dto';

@Injectable()
export class ChannelPartnersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createChannelPartnerDto: CreateChannelPartnerDto) {
    return this.prisma.channelPartner.create({
      data: {
        ...createChannelPartnerDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.channelPartner.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const partner = await this.prisma.channelPartner.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!partner) {
      throw new NotFoundException(`Channel partner with ID ${id} not found`);
    }

    return partner;
  }

  async update(tenantId: string, id: string, updateChannelPartnerDto: UpdateChannelPartnerDto) {
    await this.findOne(tenantId, id);

    return this.prisma.channelPartner.update({
      where: { id },
      data: updateChannelPartnerDto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.channelPartner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
