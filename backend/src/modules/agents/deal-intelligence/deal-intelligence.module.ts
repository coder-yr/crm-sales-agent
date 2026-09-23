import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { DealScoringService } from './deal-scoring.service';
import { DealIntelligenceAgentService } from './deal-intelligence-agent.service';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [DealScoringService, DealIntelligenceAgentService],
  exports: [DealScoringService, DealIntelligenceAgentService],
})
export class DealIntelligenceModule {}
