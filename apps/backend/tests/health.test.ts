import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { ChatProvider } from '../src/providers/openrouter.js';

describe('GET /health', () => {
  it('reports health without calling the LLM', async () => {
    const complete = vi.fn(async () => 'unused');
    const provider: ChatProvider = { name: 'fake', model: 'fake-model', complete };
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(complete).not.toHaveBeenCalled();
    await app.close();
  });
});
