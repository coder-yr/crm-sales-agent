import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { RecommendationsRulesService } from './recommendations-rules.service';
import { RecommendationsAgentService } from './recommendations-agent.service';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [RecommendationsRulesService, RecommendationsAgentService],
  exports: [RecommendationsRulesService, RecommendationsAgentService],
})
export class RecommendationsAgentModule {}
