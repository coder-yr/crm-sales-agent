import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('signals')
  async findAll(@GetUser() user: any) {
    const data = await this.signalsService.findAll(user.tenantId);
    return { success: true, data, message: 'Signals fetched successfully' };
  }

  @Get('signals/:id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.signalsService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Signal fetched successfully' };
  }

  @Get('companies/:companyId/signals')
  async findByCompany(@GetUser() user: any, @Param('companyId') companyId: string) {
    const data = await this.signalsService.findByCompany(user.tenantId, companyId);
    return { success: true, data, message: 'Company signals fetched successfully' };
  }
}
