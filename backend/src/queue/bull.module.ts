import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsProcessor } from './processors/events.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          tls: configService.get('redis.tls'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'events-queue' },
      {
        name: 'ai-agent',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }
    ),
  ],
  providers: [EventsProcessor],
  exports: [BullModule],
})
export class BullQueueModule {}
