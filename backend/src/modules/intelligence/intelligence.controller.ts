import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('leads/:leadId/intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get()
  async findByLead(@GetUser() user: any, @Param('leadId') leadId: string) {
    const data = await this.intelligenceService.findByLead(user.tenantId, leadId);
    return { success: true, data, message: 'Deal intelligence fetched successfully' };
  }
}
