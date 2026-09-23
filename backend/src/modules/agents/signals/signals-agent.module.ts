import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { SignalValidatorService } from './signal-validator.service';
import { SignalDetectionAgentService } from './signal-detection-agent.service';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [SignalValidatorService, SignalDetectionAgentService],
  exports: [SignalValidatorService, SignalDetectionAgentService],
})
export class SignalsAgentModule {}
