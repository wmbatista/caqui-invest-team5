import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { NullProvider, type LlmProvider } from '../src/providers/openrouter.js';

describe('POST /perguntar', () => {
  it('returns deterministic C-0001 values and sources without an API key', async () => {
    const app = await buildApp(loadConfig({}), new NullProvider());
    const response = await app.inject({ method: 'POST', url: '/perguntar', payload: { id_cliente: 'C-0001', pergunta: 'Quanto eu tenho aplicado?' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      resposta: 'Você tem R$\u00a060.000,00 aplicados. O saldo bruto atual dos investimentos é R$\u00a061.021,15, antes do imposto, e o saldo em conta é R$\u00a01.250,00.',
      fontes: ['P-0001', 'P-0002', 'C-0001'],
    });
    await app.close();
  });

  it('returns a fixed answer outside the MVP0 scope', async () => {
    const complete = vi.fn();
    const provider: LlmProvider = { name: 'fake', model: 'fake', complete };
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'POST', url: '/perguntar', payload: { id_cliente: 'C-0001', pergunta: 'Onde eu invisto 50 mil?' } });
    expect(response.json()).toEqual({ resposta: 'Por enquanto eu só sei dizer quanto você tem aplicado na Caqui.', fontes: [] });
    expect(complete).not.toHaveBeenCalled();
    await app.close();
  });

  it('falls back to the template when the LLM invents a value', async () => {
    const provider: LlmProvider = { name: 'fake', model: 'fake', complete: vi.fn(async () => 'Você tem R$ 999.999,00.') };
    const app = await buildApp(loadConfig({}), provider);
    const response = await app.inject({ method: 'POST', url: '/perguntar', payload: { id_cliente: 'C-0001', pergunta: 'Qual meu saldo?' } });
    expect(response.json().resposta).not.toContain('999.999');
    expect(response.json().fontes).toEqual(['P-0001', 'P-0002', 'C-0001']);
    await app.close();
  });

  it('returns 404 for an unknown client and 400 for invalid input', async () => {
    const app = await buildApp(loadConfig({}), new NullProvider());
    const missing = await app.inject({ method: 'POST', url: '/perguntar', payload: { id_cliente: 'C-9999', pergunta: 'Quanto tenho?' } });
    const invalid = await app.inject({ method: 'POST', url: '/perguntar', payload: { id_cliente: 'invalid', pergunta: '' } });
    expect(missing.statusCode).toBe(404);
    expect(invalid.statusCode).toBe(400);
    await app.close();
  });
});
