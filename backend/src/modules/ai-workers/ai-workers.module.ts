import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiAgentProcessor } from './ai-agent.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';
import { ResearchModule } from '../agents/research/research.module';
import { SignalsAgentModule } from '../agents/signals/signals-agent.module';
import { DealIntelligenceModule } from '../agents/deal-intelligence/deal-intelligence.module';
import { RecommendationsAgentModule } from '../agents/recommendations/recommendations.module';
import { OutreachAgentModule } from '../agents/outreach/outreach-agent.module';

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
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [AiAgentProcessor],
  exports: [BullModule],
})
export class AiWorkersModule {}
