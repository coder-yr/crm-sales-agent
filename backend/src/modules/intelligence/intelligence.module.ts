import { Module } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { DealIntelligenceController } from './deal-intelligence.controller';

@Module({
  providers: [IntelligenceService],
  controllers: [IntelligenceController, DealIntelligenceController],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
