import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { OpenRouterProvider } from '../src/providers/openrouter.js';

describe('OpenRouterProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls chat/completions with fetch and returns validated text', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenRouterProvider(loadConfig({ OPENROUTER_API_KEY: 'test-key' }));
    const result = await provider.complete({ system: 'system', messages: [{ role: 'user', content: 'ping' }], maxTokens: 10 });
    expect(result).toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith('https://openrouter.ai/api/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
    }));
  });

  it('forwards the requested temperature and defaults to 0.2', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenRouterProvider(loadConfig({ OPENROUTER_API_KEY: 'test-key' }));
    const sentTemperature = (call: number) => JSON.parse((fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].body as string).temperature;
    await provider.complete({ system: 's', messages: [{ role: 'user', content: 'x' }], maxTokens: 5, temperature: 0 });
    await provider.complete({ system: 's', messages: [{ role: 'user', content: 'x' }], maxTokens: 5 });
    expect(sentTemperature(0)).toBe(0);
    expect(sentTemperature(1)).toBe(0.2);
  });
});
