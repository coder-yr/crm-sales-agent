import { Controller, Get, Param, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { ResearchAgentDto } from './dto/research-agent.dto';
import { SignalDetectionDto } from './dto/signal-detection.dto';
import { DealAnalysisDto } from './dto/deal-analysis.dto';
import { RecommendationsAnalysisDto } from './dto/recommendations-analysis.dto';
import { OutreachAgentDto } from './dto/outreach-agent.dto';

@UseGuards(JwtAuthGuard)
@Controller('agent-runs')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  async findAll(@GetUser() user: any) {
    const data = await this.agentsService.findAll(user.tenantId);
    return { success: true, data, message: 'Agent runs fetched successfully' };
  }

  @Get('entity/:entityType/:entityId/latest')
  async findLatestByEntity(
    @GetUser() user: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('agentType') agentType?: string
  ) {
    const data = await this.agentsService.findLatestByEntity(user.tenantId, entityType, entityId, agentType);
    return { success: true, data, message: 'Latest agent run fetched successfully' };
  }

  @Get(':id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.agentsService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Agent run fetched successfully' };
  }

  @Post('signals')
  async startSignalDetection(@GetUser() user: any, @Body() dto: SignalDetectionDto) {
    const data = await this.agentsService.startSignalDetection(user.tenantId, dto);
    return {
      success: true,
      data,
      message: data.reused ? 'Active signal detection run already in progress' : 'Signal detection run queued successfully',
    };
  }

  @Post('research')
  async startResearch(@GetUser() user: any, @Body() dto: ResearchAgentDto) {
    const data = await this.agentsService.startResearch(user.tenantId, dto);
    return {
      success: true,
      data,
      message: data.reused ? 'Active research run already in progress' : 'Research run queued successfully',
    };
  }

  @Post('deal-analysis')
  async startDealAnalysis(@GetUser() user: any, @Body() dto: DealAnalysisDto) {
    const data = await this.agentsService.startDealAnalysis(user.tenantId, dto);
    return {
      success: true,
      data,
      message: data.reused ? 'Active deal analysis run already in progress' : 'Deal analysis run queued successfully',
    };
  }

  @Post('recommendations')
  async startRecommendations(@GetUser() user: any, @Body() dto: RecommendationsAnalysisDto) {
    const data = await this.agentsService.startRecommendations(user.tenantId, dto);
    return {
      success: true,
      data,
      message: data.reused ? 'Active recommendations run already in progress' : 'Recommendations run queued successfully',
    };
  }

  @Post('outreach')
  async startOutreach(@GetUser() user: any, @Body() dto: OutreachAgentDto) {
    const data = await this.agentsService.startOutreach(user.tenantId, dto);
    return {
      success: true,
      data,
      message: data.reused ? 'Active outreach draft generation run already in progress' : 'Outreach run queued successfully',
    };
  }

  @Post('test-execute')
  async testExecute(@GetUser() user: any, @Body() dto: CreateAgentRunDto) {
    const data = await this.agentsService.createAgentRun(user.tenantId, dto);
    return { success: true, data, message: 'Agent run queued successfully' };
  }
}
