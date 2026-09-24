export interface GenerateOptions {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

export interface LLMProvider {
  /**
   * Uniquely identifies the provider (e.g. 'groq', 'ollama')
   */
  readonly name: string;

  /**
   * Generates a completion from the LLM.
   */
  generate(options: GenerateOptions): Promise<string | null>;

  /**
   * Returns true if this provider is reachable/configured.
   */
  isAvailable(): Promise<boolean>;
}
