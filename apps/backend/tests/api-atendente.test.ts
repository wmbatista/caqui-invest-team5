import { casoSchema } from '@caqui/contracts';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { NullProvider } from '../src/providers/openrouter.js';

async function montar() {
  const app = await buildApp(loadConfig({}), new NullProvider());
  const entrar = async (personaId: string) => ({ authorization: `Bearer ${(await app.inject({ method: 'POST', url: '/api/v1/sessoes', payload: { personaId } })).json().token}` });
  const criar = async (headers: Record<string, string>) => (await app.inject({ method: 'POST', url: '/api/v1/conversas', headers })).json();
  const enviar = (headers: Record<string, string>, conversaId: string, mensagem: string) => app.inject({ method: 'POST', url: '/api/v1/chat', headers, payload: { conversaId, mensagem } });
  const fila = async () => (await app.inject({ method: 'GET', url: '/api/v1/atendente/fila', headers: await entrar('ATENDENTE') })).json();
  return { app, entrar, criar, enviar, fila };
}

describe('GET /api/v1/atendente/fila', () => {
  it('refuses a client and an anonymous visitor', async () => {
    const { app, entrar } = await montar();
    expect((await app.inject({ method: 'GET', url: '/api/v1/atendente/fila' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/v1/atendente/fila', headers: await entrar('C-0001') })).statusCode).toBe(403);
    await app.close();
  });

  it('brings the protocol, summary and whole history, so the client does not repeat anything', async () => {
    const { app, entrar, criar, enviar, fila } = await montar();
    const marta = await entrar('C-0001');
    const conversa = await criar(marta);
    await enviar(marta, conversa.id, 'Onde está meu dinheiro?');
    await enviar(marta, conversa.id, 'Quero tirar todo o dinheiro do CDB hoje porque meu sobrinho mandou');
    const [caso] = await fila();
    casoSchema.parse(caso);
    expect(caso).toMatchObject({ protocolo: conversa.protocolo, destino: 'humano', prioridade: true, nome: 'Marta Siqueira', idade: 63, momento: '18/11 10:00' });
    expect(caso.resumo).toContain('sobrinho mandou');
    expect(caso.historico.map(({ autor }: { autor: string }) => autor)).toEqual(['cliente', 'caqui', 'cliente', 'caqui']);
    expect(caso.historico[0].texto).toBe('Onde está meu dinheiro?');
    await app.close();
  });

  it('puts security first, then priority', async () => {
    const { app, entrar, criar, enviar, fila } = await montar();
    const rafael = await entrar('C-0002');
    await enviar(rafael, (await criar(rafael)).id, 'Quero falar com uma pessoa');
    const marta = await entrar('C-0001');
    await enviar(marta, (await criar(marta)).id, 'Quero falar com uma pessoa');
    const alice = await entrar('C-0014');
    await enviar(alice, (await criar(alice)).id, 'Ligaram pedindo minha senha');
    expect((await fila()).map(({ nome, destino }: { nome: string; destino: string }) => [nome, destino])).toEqual([
      ['Alice Xavier', 'seguranca'],
      ['Marta Siqueira', 'humano'],
      ['Rafael Okada', 'humano'],
    ]);
    await app.close();
  });

  it('keeps both referrals under one protocol', async () => {
    const { app, entrar, criar, enviar, fila } = await montar();
    const marta = await entrar('C-0001');
    const conversa = await criar(marta);
    await enviar(marta, conversa.id, 'Quero fazer uma reclamação');
    await enviar(marta, conversa.id, 'Me ligaram pedindo minha senha');
    const casos = await fila();
    expect(casos.map(({ destino }: { destino: string }) => destino)).toEqual(['seguranca', 'reclamacao']);
    expect(new Set(casos.map(({ protocolo }: { protocolo: string }) => protocolo))).toEqual(new Set([conversa.protocolo]));
    await app.close();
  });
});
