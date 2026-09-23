import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createDto: CreatePipelineStageDto) {
    return this.prisma.pipelineStage.create({
      data: {
        ...createDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id, tenantId },
    });
    if (!stage) throw new NotFoundException('Pipeline stage not found');
    return stage;
  }

  async update(tenantId: string, id: string, updateDto: UpdatePipelineStageDto) {
    await this.findOne(tenantId, id);
    return this.prisma.pipelineStage.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.pipelineStage.delete({
      where: { id },
    });
  }
}
