import { describe, expect, it } from 'vitest';
import { conversar, provedorProibido, responderPt } from './apoio.js';

const ids = (resposta: { fontes: { id: string }[] }) => resposta.fontes.map(({ id }) => id);

describe('produto que a Caqui não oferece', () => {
  it.each(['PT-29', 'PT-30'])('%s says it is not offered, citing KB-030', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima } = await responderPt(id, provider);
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain('não oferece');
    expect(ids(ultima)).toContain('KB-030');
    expect(ultima.resposta).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(complete).not.toHaveBeenCalled();
  });

  it('does not confuse "seguro" with insurance', async () => {
    const { ultima } = await conversar('C-0001', ['Meu dinheiro está seguro?']);
    expect(ultima.resposta).not.toContain('não oferece');
  });
});

describe('horário de corte', () => {
  it('PT-31 answers 16h from KB-006 and never the old article', async () => {
    const { ultima } = await responderPt('PT-31');
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain('16h');
    expect(ultima.resposta).not.toContain('15h');
    expect(ids(ultima)).toContain('KB-006');
    expect(ids(ultima)).not.toContain('KB-007');
  });
});

describe('assuntos fora do escopo', () => {
  it.each(['PT-06', 'PT-10', 'PT-12', 'PT-39', 'PT-40'])('%s says it does not cover the subject and offers a person', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima, conversa } = await responderPt(id, provider);
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain('não trato');
    expect(ultima.resposta).toContain('Falar com uma pessoa');
    expect(ultima.resposta).not.toMatch(/\d+(,\d+)?%/);
    expect(ultima.fontes).toEqual([]);
    expect(conversa.naoEntendidas).toBe(0);
    expect(complete).not.toHaveBeenCalled();
  });

  it.each([
    'Quanto eu ganhei com meus investimentos?',
    'Qual o retorno do meu dinheiro?',
    'Quanto meu saldo valorizou esse ano?',
    'Quanto tenho de lucro?',
    'Qual o lucro dos meus investimentos?',
  ])('treats return questions as out of scope even with position words: %s', async (mensagem) => {
    const { provider, complete } = provedorProibido();
    const { ultima } = await conversar('C-0001', [mensagem], undefined, provider);
    expect(ultima.resposta).toContain('não trato');
    expect(ultima.fontes).toEqual([]);
    expect(complete).not.toHaveBeenCalled();
  });

  it('still answers the deadline of a protocol, which also says "retorno"', async () => {
    const { ultima } = await conversar('C-0001', ['Qual o prazo de retorno do meu protocolo?']);
    expect(ultima.resposta).not.toContain('não trato');
  });
});
