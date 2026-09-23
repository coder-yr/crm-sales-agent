import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pipeline-stages')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  async create(@GetUser() user: any, @Body() createDto: CreatePipelineStageDto) {
    const data = await this.pipelineService.create(user.tenantId, createDto);
    return { success: true, data, message: 'Stage created successfully' };
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findAll(@GetUser() user: any) {
    const data = await this.pipelineService.findAll(user.tenantId);
    return { success: true, data, message: 'Stages fetched successfully' };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updateDto: UpdatePipelineStageDto) {
    const data = await this.pipelineService.update(user.tenantId, id, updateDto);
    return { success: true, data, message: 'Stage updated successfully' };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.pipelineService.remove(user.tenantId, id);
    return { success: true, data, message: 'Stage deleted successfully' };
  }
}
