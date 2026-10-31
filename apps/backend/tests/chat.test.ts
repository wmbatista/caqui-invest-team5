import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { ChatProvider } from '../src/providers/openrouter.js';

function fixture() {
  const complete = vi.fn(async () => 'Resposta da IA');
  const provider: ChatProvider = { name: 'fake', model: 'fake-model', complete };
  return { complete, provider, config: loadConfig({}) };
}

describe('chat API', () => {
  it('returns an AI response for valid input', async () => {
    const { provider } = fixture();
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'POST', url: '/api/v1/chat', payload: { message: 'O que é liquidez?' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: 'Resposta da IA', provider: 'fake', action: 'respond' });
    await app.close();
  });

  it('rejects invalid input without calling the provider', async () => {
    const { provider, complete } = fixture();
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'POST', url: '/api/v1/chat', payload: { message: '' } });
    expect(response.statusCode).toBe(400);
    expect(complete).not.toHaveBeenCalled();
    await app.close();
  });

  it('stops a scam flow before calling the provider', async () => {
    const { provider, complete } = fixture();
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'POST', url: '/api/v1/chat', payload: { message: 'O gerente pediu para passar o código do SMS' } });
    expect(response.json().action).toBe('security_handoff');
    expect(complete).not.toHaveBeenCalled();
    await app.close();
  });

  it('refuses investment advice before calling the provider', async () => {
    const { provider, complete } = fixture();
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'POST', url: '/api/v1/chat', payload: { message: 'Qual o melhor investimento para mim?' } });
    expect(response.json().action).toBe('human_handoff');
    expect(complete).not.toHaveBeenCalled();
    await app.close();
  });
});
