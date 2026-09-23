import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async getMyTenant(@GetUser() user: any) {
    const data = await this.tenantsService.findOne(user.tenantId);
    return { success: true, data };
  }

  @Patch('me')
  @Roles(Role.OWNER)
  async updateMyTenant(@GetUser() user: any, @Body() updateTenantDto: UpdateTenantDto) {
    const data = await this.tenantsService.update(user.tenantId, updateTenantDto);
    return { success: true, data, message: 'Settings updated successfully' };
  }
}
