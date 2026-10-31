import type { ChatMessage } from '../domain/chat.js';
import type { Config } from '../config.js';

export interface ChatProvider {
  readonly name: string;
  readonly model: string;
  complete(messages: ProviderMessage[]): Promise<string>;
}

export type ProviderMessage = ChatMessage | { role: 'system'; content: string };

export class ProviderError extends Error {
  constructor(message: string, readonly timedOut = false) { super(message); }
}

export class OpenRouterProvider implements ChatProvider {
  readonly name = 'openrouter';
  readonly model: string;

  constructor(private readonly config: Config) {
    this.model = config.model;
  }

  async complete(messages: ProviderMessage[]): Promise<string> {
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
          messages,
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
