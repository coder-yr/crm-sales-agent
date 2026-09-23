import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChannelPartnersService } from './channel-partners.service';
import { CreateChannelPartnerDto } from './dto/create-channel-partner.dto';
import { UpdateChannelPartnerDto } from './dto/update-channel-partner.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('channel-partners')
export class ChannelPartnersController {
  constructor(private readonly channelPartnersService: ChannelPartnersService) { }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  async create(@GetUser() user: any, @Body() createChannelPartnerDto: CreateChannelPartnerDto) {
    const data = await this.channelPartnersService.create(user.tenantId, createChannelPartnerDto);
    return { success: true, data, message: 'Channel partner created successfully' };
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findAll(@GetUser() user: any) {
    const data = await this.channelPartnersService.findAll(user.tenantId);
    return { success: true, data, message: 'Channel partners fetched successfully' };
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.channelPartnersService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Channel partner fetched successfully' };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updateChannelPartnerDto: UpdateChannelPartnerDto) {
    const data = await this.channelPartnersService.update(user.tenantId, id, updateChannelPartnerDto);
    return { success: true, data, message: 'Channel partner updated successfully' };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.channelPartnersService.remove(user.tenantId, id);
    return { success: true, data, message: 'Channel partner deleted successfully' };
  }
}
