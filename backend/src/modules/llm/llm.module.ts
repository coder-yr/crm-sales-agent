import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';
import { GroqProvider } from './providers/groq.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [LLMService, GroqProvider, OllamaProvider],
  exports: [LLMService],
})
export class LLMModule {}
