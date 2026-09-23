import { Module } from '@nestjs/common';
import { ChannelPartnersService } from './channel-partners.service';
import { ChannelPartnersController } from './channel-partners.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChannelPartnersController],
  providers: [ChannelPartnersService],
  exports: [ChannelPartnersService],
})
export class ChannelPartnersModule {}
