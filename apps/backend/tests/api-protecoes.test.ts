import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { NullProvider } from '../src/providers/openrouter.js';

const cpf = ['123', '456', '789'].join('.') + '-09';

async function montar() {
  const logs: string[] = [];
  const logStream = new Writable({ write(pedaco, _codificacao, fim) { logs.push(String(pedaco)); fim(); } });
  const app = await buildApp(loadConfig({}), new NullProvider(), { logLevel: 'info', logStream });
  const entrar = async (personaId: string) => ({ authorization: `Bearer ${(await app.inject({ method: 'POST', url: '/api/v1/sessoes', payload: { personaId } })).json().token}` });
  const conversa = async (headers: Record<string, string>) => (await app.inject({ method: 'POST', url: '/api/v1/conversas', headers })).json().id as string;
  return { app, logs, entrar, conversa };
}

describe('bloqueio de acesso', () => {
  it('ends every session of the client, sends the case to security and allows a new login', async () => {
    const { app, entrar, conversa } = await montar();
    const celular = await entrar('C-0001');
    const computador = await entrar('C-0001');
    const outraCliente = await entrar('C-0002');
    const conversaId = await conversa(celular);

    const resposta = await app.inject({ method: 'POST', url: '/api/v1/chat', headers: celular, payload: { conversaId, mensagem: 'Ligaram da Caqui pedindo minha senha' } });
    expect(resposta.json()).toMatchObject({ acao: 'seguranca_imediata', sessaoBloqueada: true });

    expect((await app.inject({ method: 'GET', url: '/api/v1/eu', headers: celular })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/v1/eu', headers: computador })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/v1/eu', headers: outraCliente })).statusCode).toBe(200);

    const fila = (await app.inject({ method: 'GET', url: '/api/v1/atendente/fila', headers: await entrar('ATENDENTE') })).json();
    expect(fila[0]).toMatchObject({ destino: 'seguranca', prioridade: true, protocolo: resposta.json().protocolo });

    expect((await app.inject({ method: 'GET', url: '/api/v1/eu', headers: await entrar('C-0001') })).statusCode).toBe(200);
    await app.close();
  });
});

describe('privacidade', () => {
  it('keeps a CPF out of the history, the summary and the logs', async () => {
    const { app, logs, entrar, conversa } = await montar();
    const headers = await entrar('C-0001');
    const conversaId = await conversa(headers);
    const mensagem = `Quero falar com uma pessoa, meu CPF é ${cpf}`;
    const resposta = await app.inject({ method: 'POST', url: '/api/v1/chat', headers, payload: { conversaId, mensagem } });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.body).not.toContain(cpf);

    const fila = await app.inject({ method: 'GET', url: '/api/v1/atendente/fila', headers: await entrar('ATENDENTE') });
    expect(fila.json()).toHaveLength(1);
    expect(fila.json()[0].historico.length).toBeGreaterThanOrEqual(2);
    expect(fila.body).not.toContain(cpf);
    expect(fila.body).toContain('***.***.***-**');

    const registro = logs.join('');
    expect(registro).toContain('request completed');
    expect(registro).not.toContain(cpf);
    expect(registro).not.toContain('Quero falar com uma pessoa');
    await app.close();
  });
});
