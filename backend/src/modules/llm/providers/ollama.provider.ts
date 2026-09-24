import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, GenerateOptions } from '../interfaces/llm-provider.interface';
import * as http from 'http';

@Injectable()
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);
  private baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ||
      process.env.OLLAMA_BASE_URL ||
      'http://127.0.0.1:11434';
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = new URL('/api/tags', this.baseUrl);
        const req = http.request(url, { method: 'GET', timeout: 3000 }, (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      } catch {
        resolve(false);
      }
    });
  }

  async generate(options: GenerateOptions): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const url = new URL('/api/generate', this.baseUrl);
        
        let prompt = '';
        if (options.systemPrompt) {
          prompt += options.systemPrompt + '\n\n';
        }
        prompt += options.userPrompt;

        const payload = JSON.stringify({
          model: options.model,
          prompt,
          stream: false,
          format: options.jsonMode ? 'json' : undefined,
          options: {
            temperature: options.temperature ?? 0.3,
          },
        });

        const req = http.request(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: options.timeoutMs ?? 120000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  const parsed = JSON.parse(data);
                  resolve(parsed.response || null);
                } catch {
                  resolve(null);
                }
              } else {
                resolve(null);
              }
            });
          }
        );

        req.on('error', (err) => {
          this.logger.error(`Ollama error: ${err.message}`);
          resolve(null);
        });
        req.on('timeout', () => {
          this.logger.warn(`Ollama timed out`);
          req.destroy();
          resolve(null);
        });

        req.write(payload);
        req.end();
      } catch (err: any) {
        this.logger.error(`Failed to trigger Ollama: ${err.message}`);
        resolve(null);
      }
    });
  }
}
