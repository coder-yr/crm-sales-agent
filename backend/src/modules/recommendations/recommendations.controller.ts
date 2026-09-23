import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UpdateRecommendationStatusDto } from './dto/recommendation.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('recommendations')
  async findAll(@GetUser() user: any) {
    const data = await this.recommendationsService.findAll(user.tenantId);
    return { success: true, data, message: 'Recommendations fetched successfully' };
  }

  @Get('recommendations/:id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.recommendationsService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Recommendation fetched successfully' };
  }

  @Get('leads/:leadId/recommendations')
  async findByLead(@GetUser() user: any, @Param('leadId') leadId: string) {
    const data = await this.recommendationsService.findByLead(user.tenantId, leadId);
    return { success: true, data, message: 'Lead recommendations fetched successfully' };
  }

  @Patch('recommendations/:id/dismiss')
  async dismiss(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.recommendationsService.dismiss(user.tenantId, id);
    return { success: true, data, message: 'Recommendation dismissed successfully' };
  }

  @Post('recommendations/:id/accept')
  async accept(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() body: { createTask?: boolean }
  ) {
    const userId = user.userId || user.id;
    const data = await this.recommendationsService.accept(
      user.tenantId,
      userId,
      id,
      body?.createTask !== false
    );
    return { success: true, data, message: 'Recommendation accepted successfully' };
  }

  @Patch('recommendations/:id/status')
  async updateStatus(
    @GetUser() user: any, 
    @Param('id') id: string, 
    @Body() dto: UpdateRecommendationStatusDto
  ) {
    const data = await this.recommendationsService.updateStatus(user.tenantId, id, dto);
    return { success: true, data, message: 'Recommendation status updated successfully' };
  }
}
