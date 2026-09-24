import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from '../../../events/events.module';
import { OutreachContextBuilderService } from './outreach-context-builder.service';
import { OutreachHallucinationGuardService } from './outreach-hallucination-guard.service';
import { OutreachAgentService } from './outreach-agent.service';

import { LLMModule } from '../../llm/llm.module';

@Module({
  imports: [PrismaModule, ConfigModule, EventsModule, LLMModule],
  providers: [
    OutreachContextBuilderService,
    OutreachHallucinationGuardService,
    OutreachAgentService,
  ],
  exports: [
    OutreachContextBuilderService,
    OutreachHallucinationGuardService,
    OutreachAgentService,
  ],
})
export class OutreachAgentModule {}
