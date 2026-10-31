import type { ChatMessage } from '../domain/chat.js';
import type { Config } from '../config.js';

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(input: CompletionInput): Promise<string | null>;
}

export type ChatProvider = LlmProvider;

export type ProviderMessage = ChatMessage | { role: 'system'; content: string };

export interface CompletionInput {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

export class ProviderError extends Error {
  constructor(message: string, readonly timedOut = false) { super(message); }
}

export class OpenRouterProvider implements ChatProvider {
  readonly name = 'openrouter';
  readonly model: string;

  constructor(private readonly config: Config) {
    this.model = config.model;
  }

  async complete(input: CompletionInput): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'system', content: input.system }, ...input.messages],
          max_tokens: input.maxTokens,
          temperature: 0.2,
          reasoning: { effort: this.config.effort },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new ProviderError(`Provider returned HTTP ${response.status}`);
      const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content?.trim();
      if (!content) throw new ProviderError('Provider returned an invalid response');
      return content;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new ProviderError(timedOut ? 'Provider timed out' : 'Provider is unavailable', timedOut);
    } finally {
      clearTimeout(timer);
    }
  }
}

export class NullProvider implements LlmProvider {
  readonly name = 'none';
  readonly model = 'template';

  async complete(_input: CompletionInput): Promise<null> {
    return null;
  }
}
