import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';
import { OutreachService } from './outreach.service';
import { OutreachController } from './outreach.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    forwardRef(() => AgentsModule),
  ],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService],
})
export class OutreachModule {}
