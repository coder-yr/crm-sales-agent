import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateOptions, LLMProvider } from './interfaces/llm-provider.interface';
import { GroqProvider } from './providers/groq.provider';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly groqProvider: GroqProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  /**
   * Generates a completion using the primary provider (Groq) if available,
   * otherwise falls back to the secondary provider (Ollama).
   */
  async generate(options: GenerateOptions): Promise<{ content: string | null; providerUsed: string; modelUsed: string }> {
    // 1. Try Groq (Production Primary)
    const isGroqConfigured = await this.groqProvider.isAvailable();
    if (isGroqConfigured) {
      this.logger.log(`Using GroqProvider for generation (model: ${options.model})`);
      const content = await this.groqProvider.generate(options);
      if (content) {
        return { content, providerUsed: 'groq', modelUsed: options.model };
      }
      this.logger.warn(`Groq generation failed or returned null, attempting fallback...`);
    } else {
      this.logger.log('GroqProvider not configured (missing API key), attempting fallback to Ollama...');
    }

    // 2. Fallback to Ollama (Local Development / Fallback)
    const fallbackModel = this.configService.get<string>('AI_RESEARCH_MODEL') || process.env.AI_RESEARCH_MODEL || 'qwen2.5:3b';
    const isOllamaUp = await this.ollamaProvider.isAvailable();
    
    if (isOllamaUp) {
      this.logger.log(`Using OllamaProvider for fallback generation (model: ${fallbackModel})`);
      const fallbackOptions = { ...options, model: fallbackModel };
      const content = await this.ollamaProvider.generate(fallbackOptions);
      if (content) {
        return { content, providerUsed: 'ollama', modelUsed: fallbackModel };
      }
    }

    this.logger.error('Both Groq and Ollama providers failed or are unavailable.');
    return { content: null, providerUsed: 'none', modelUsed: 'none' };
  }
}
