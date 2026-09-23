import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';
import { ResearchModule } from './research/research.module';
import { SignalsAgentModule } from './signals/signals-agent.module';
import { DealIntelligenceModule } from './deal-intelligence/deal-intelligence.module';
import { RecommendationsAgentModule } from './recommendations/recommendations.module';
import { OutreachAgentModule } from './outreach/outreach-agent.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    ResearchModule,
    SignalsAgentModule,
    DealIntelligenceModule,
    RecommendationsAgentModule,
    OutreachAgentModule,
    BullModule.registerQueue({
      name: 'ai-agent',
    }),
  ],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService, DealIntelligenceModule, OutreachAgentModule],
})
export class AgentsModule {}
