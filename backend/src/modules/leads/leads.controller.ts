import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async create(@GetUser() user: any, @Body() createLeadDto: CreateLeadDto) {
    const data = await this.leadsService.create(user.tenantId, user.userId, createLeadDto);
    return { success: true, data, message: 'Lead created successfully' };
  }

  @Post('bulk-upload')
  @Roles(Role.OWNER, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@GetUser() user: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    const data = await this.leadsService.bulkUpload(user.tenantId, user.userId, file);
    return { success: true, data, message: `${data.count} leads imported successfully` };
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findAll(
    @GetUser() user: any, 
    @Query() query: PaginationQueryDto, 
    @Query('stageId') stageId?: string,
    @Query('search') search?: string
  ) {
    const data = await this.leadsService.findAll(user.tenantId, user, query.page, query.limit, stageId, search);
    return { success: true, ...data, message: 'Leads fetched successfully' };
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.leadsService.findOne(user.tenantId, id, user);
    return { success: true, data, message: 'Lead fetched successfully' };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    const data = await this.leadsService.update(user.tenantId, id, user, updateLeadDto);
    return { success: true, data, message: 'Lead updated successfully' };
  }

  @Patch(':id/stage')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async changeStage(@GetUser() user: any, @Param('id') id: string, @Body() changeStageDto: ChangeStageDto) {
    const data = await this.leadsService.changeStage(user.tenantId, id, user, changeStageDto);
    return { success: true, data, message: 'Lead stage updated successfully' };
  }

  @Patch(':id/assign')
  @Roles(Role.OWNER, Role.MANAGER)
  async assign(@GetUser() user: any, @Param('id') id: string, @Body() assignLeadDto: AssignLeadDto) {
    const data = await this.leadsService.assign(user.tenantId, id, user, assignLeadDto.assigneeId, assignLeadDto.version);
    return { success: true, data, message: 'Lead assigned successfully' };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.leadsService.remove(user.tenantId, id, user);
    return { success: true, data, message: 'Lead deleted successfully' };
  }
}
