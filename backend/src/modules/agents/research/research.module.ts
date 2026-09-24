import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { LLMModule } from '../../llm/llm.module';
import { CompanyResolverService } from './company-resolver.service';
import { WebsiteFetcherService } from './website-fetcher.service';
import { HtmlExtractorService } from './html-extractor.service';
import { ResearchExtractorService } from './research-extractor.service';
import { ResearchAgentService } from './research-agent.service';

@Module({
  imports: [PrismaModule, EventsModule, ConfigModule, LLMModule],
  providers: [
    CompanyResolverService,
    WebsiteFetcherService,
    HtmlExtractorService,
    ResearchExtractorService,
    ResearchAgentService,
  ],
  exports: [
    CompanyResolverService,
    WebsiteFetcherService,
    HtmlExtractorService,
    ResearchExtractorService,
    ResearchAgentService,
  ],
})
export class ResearchModule {}
