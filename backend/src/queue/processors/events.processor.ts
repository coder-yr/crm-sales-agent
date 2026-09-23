import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';

@Processor('events-queue')
export class EventsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, type, data } = job.data;

    switch (job.name) {
      case 'log.activity':
        await this.prisma.activity.create({
          data: {
            tenantId,
            leadId: data.leadId,
            userId: data.userId,
            type,
            metadata: data.metadata || {},
          },
        });
        break;

      case 'send.notification':
        const notification = await this.prisma.notification.create({
          data: {
            tenantId,
            userId: data.userId,
            title: data.title,
            message: data.message,
          },
        });
        this.eventsGateway.emitToUser(data.userId, 'notification.new', notification);
        break;

      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }
}
