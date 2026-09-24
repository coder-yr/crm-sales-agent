import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, GenerateOptions } from '../interfaces/llm-provider.interface';
import Groq from 'groq-sdk';

@Injectable()
export class GroqProvider implements LLMProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqProvider.name);
  private groqClient: Groq | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY') || process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groqClient = new Groq({ apiKey });
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.groqClient !== null;
  }

  async generate(options: GenerateOptions): Promise<string | null> {
    if (!this.groqClient) {
      this.logger.error('Groq is not configured. Missing GROQ_API_KEY.');
      return null;
    }

    try {
      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.userPrompt });

      const completion = await this.groqClient.chat.completions.create({
        messages,
        model: options.model || 'llama3-70b-8192',
        temperature: options.temperature ?? 0.3,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      }, { timeout: options.timeoutMs ?? 30000 });

      return completion.choices[0]?.message?.content || null;
    } catch (error: any) {
      this.logger.error(`Groq generation failed: ${error.message}`);
      return null;
    }
  }
}
