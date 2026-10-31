import { describe, expect, it } from 'vitest';
import { conversar, provedorProibido, responderPt } from './apoio.js';

const ids = (resposta: { fontes: { id: string }[] }) => resposta.fontes.map(({ id }) => id);

describe('falar com uma pessoa', () => {
  it.each(['PT-28', 'PT-37'])('%s at 14h refers with the wait', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima, estado } = await responderPt(id, provider);
    expect(ultima.acao).toBe('encaminhar_humano');
    expect(ultima.resposta).toContain('cerca de 6 minutos');
    expect(ultima.humano.disponivel).toBe(true);
    expect(ids(ultima)).toContain('KB-025');
    expect(estado.fila()[0].destino).toBe('humano');
    expect(complete).not.toHaveBeenCalled();
  });

  it('PT-38 at 23h registers a protocol without promising a person', async () => {
    const { ultima, estado } = await responderPt('PT-38');
    expect(ultima.acao).toBe('protocolo');
    expect(ultima.resposta).toContain('8h');
    expect(ultima.resposta).toContain('protocolo');
    expect(ultima.resposta).not.toContain('vai falar com você agora');
    expect(estado.fila()[0].destino).toBe('retorno');
  });
});

describe('doom loop', () => {
  it('PT-27 uses two different phrases and refers on the third', async () => {
    const { respostas, ultima, estado } = await responderPt('PT-27');
    expect(respostas).toHaveLength(3);
    expect(respostas[0].acao).toBe('responder');
    expect(respostas[1].acao).toBe('responder');
    expect(respostas[0].resposta).not.toBe(respostas[1].resposta);
    expect(ultima.acao).toBe('encaminhar_humano');
    expect(ultima.resposta).toContain('pessoa');
    expect(estado.fila()).toHaveLength(1);
  });

  it('offers a person in the second not-understood answer', async () => {
    const { respostas } = await conversar('C-0002', ['asdf', 'qwe']);
    expect(respostas[1].resposta).toContain('Falar com uma pessoa');
  });

  it('counts understood messages as a reset', async () => {
    const { ultima, conversa } = await conversar('C-0002', ['asdf', 'Qual o horário de corte?', 'asdf']);
    expect(ultima.acao).toBe('responder');
    expect(conversa.naoEntendidas).toBe(1);
  });

  it('refers when the fifth step is not understood', async () => {
    const { respostas, ultima } = await conversar('C-0002', ['Qual o horário de corte?', 'Qual o horário de corte?', 'Qual o horário de corte?', 'Qual o horário de corte?', 'blablabla']);
    expect(respostas[3].acao).toBe('responder');
    expect(ultima.acao).toBe('encaminhar_humano');
  });

  it('offers a person when the fifth step is understood', async () => {
    const { ultima } = await conversar('C-0002', Array(5).fill('Qual o horário de corte?'));
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain('16h');
    expect(ultima.resposta).toContain('Falar com uma pessoa');
    expect(ultima.regras).toContain('CQ-08');
  });
});

describe('reclamação e encerramento', () => {
  it('PT-25 explains the steps without trying to retain', async () => {
    const { ultima, estado } = await responderPt('PT-25');
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta.toLowerCase()).toContain('encerr');
    expect(ultima.resposta).toContain('Resgatar');
    expect(ultima.resposta).toContain('Transferir');
    expect(ids(ultima)).toContain('KB-027');
    expect(ultima.resposta).not.toMatch(/tem certeza|não vá|fique/i);
    expect(estado.fila()).toHaveLength(0);
  });

  it('PT-26 registers a protocol with 7 calendar days', async () => {
    const { ultima, estado, conversa } = await responderPt('PT-26');
    expect(ultima.acao).toBe('protocolo');
    expect(ultima.resposta).toContain('protocolo');
    expect(ultima.resposta).toContain(conversa.protocolo);
    expect(ultima.resposta).toContain('7 dias corridos');
    expect(ids(ultima)).toContain('KB-026');
    expect(estado.fila()[0].destino).toBe('reclamacao');
  });

  it('is available at any step, after other messages', async () => {
    const { ultima } = await conversar('C-0001', ['Onde está meu dinheiro?', 'Quero fazer uma reclamação']);
    expect(ultima.acao).toBe('protocolo');
  });

  it('a scam still wins over a complaint in the same message', async () => {
    const { ultima } = await conversar('C-0001', ['Quero fazer uma reclamação: me ligaram pedindo minha senha']);
    expect(ultima.acao).toBe('seguranca_imediata');
  });
});
