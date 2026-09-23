import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LeadsModule } from './modules/leads/leads.module';
import { BullQueueModule } from './queue/bull.module';
import { JwtAuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { EventsModule } from './events/events.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ChannelPartnersModule } from './modules/channel-partners/channel-partners.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AiWorkersModule } from './modules/ai-workers/ai-workers.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { SignalsModule } from './modules/signals/signals.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { AgentsModule } from './modules/agents/agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    BullQueueModule,
    EventsModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    PipelineModule,
    TasksModule,
    ActivitiesModule,
    NotificationsModule,
    SubscriptionsModule,
    PropertiesModule,
    ChannelPartnersModule,
    TenantsModule,
    AiWorkersModule,
    CompaniesModule,
    ContactsModule,
    SignalsModule,
    IntelligenceModule,
    RecommendationsModule,
    OutreachModule,
    AgentsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
