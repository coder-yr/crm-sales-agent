import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UpdateOutreachDraftDto } from './dto/update-outreach-draft.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Get('leads/:leadId/outreach')
  async findByLead(@GetUser() user: any, @Param('leadId') leadId: string) {
    const data = await this.outreachService.findByLead(user.tenantId, leadId);
    return { success: true, data, message: 'Lead outreach drafts fetched successfully' };
  }

  @Get('outreach/:id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.outreachService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Outreach draft fetched successfully' };
  }

  @Patch('outreach/:id')
  async update(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOutreachDraftDto,
  ) {
    const data = await this.outreachService.update(user.tenantId, id, dto);
    return { success: true, data, message: 'Outreach draft updated successfully' };
  }

  @Post('outreach/:id/approve')
  async approve(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.outreachService.approve(user.tenantId, id);
    return { success: true, data, message: 'Outreach draft approved successfully' };
  }

  @Patch('outreach/:id/discard')
  async discard(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.outreachService.discard(user.tenantId, id);
    return { success: true, data, message: 'Outreach draft discarded successfully' };
  }

  @Post('outreach/:id/regenerate')
  async regenerate(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() body: { tone?: 'PROFESSIONAL' | 'CASUAL' | 'URGENT' | 'EXECUTIVE' | 'CONSULTATIVE' },
  ) {
    const data = await this.outreachService.regenerate(user.tenantId, id, body?.tone);
    return {
      success: true,
      data,
      message: data.reused
        ? 'Active outreach generation run already in progress'
        : 'Outreach regeneration queued successfully',
    };
  }
}
