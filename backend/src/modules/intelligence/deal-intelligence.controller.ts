import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('deal-intelligence')
export class DealIntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('lead/:leadId')
  async findByLead(@GetUser() user: any, @Param('leadId') leadId: string) {
    const data = await this.intelligenceService.findByLead(user.tenantId, leadId);
    return { success: true, data, message: 'Deal intelligence fetched successfully' };
  }

  @Get('lead/:leadId/latest')
  async findLatestByLead(@GetUser() user: any, @Param('leadId') leadId: string) {
    const data = await this.intelligenceService.findByLead(user.tenantId, leadId);
    return { success: true, data, message: 'Latest deal intelligence fetched successfully' };
  }
}
