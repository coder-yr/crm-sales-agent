import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  async create(@GetUser() user: any, @Body() createPropertyDto: CreatePropertyDto) {
    const data = await this.propertiesService.create(user.tenantId, createPropertyDto);
    return { success: true, data, message: 'Property listed successfully' };
  }

  @Get()
  async findAll(@GetUser() user: any) {
    const data = await this.propertiesService.findAll(user.tenantId);
    return { success: true, data, message: 'Properties fetched successfully' };
  }

  @Get(':id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.propertiesService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Property details fetched' };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    const data = await this.propertiesService.update(user.tenantId, id, updatePropertyDto);
    return { success: true, data, message: 'Property updated successfully' };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@GetUser() user: any, @Param('id') id: string) {
    await this.propertiesService.remove(user.tenantId, id);
    return { success: true, message: 'Property removed from inventory' };
  }
}
