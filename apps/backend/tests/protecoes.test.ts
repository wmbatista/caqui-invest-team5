import { describe, expect, it } from 'vitest';
import { conversar, pergunta, provedorProibido, responderPt } from './apoio.js';

const kbs = (resposta: { fontes: { tipo: string; id: string }[] }) => resposta.fontes.filter(({ tipo }) => tipo === 'kb').map(({ id }) => id);

describe('golpe', () => {
  it.each(['PT-18', 'PT-19', 'PT-20', 'PT-21'])('%s stops the flow', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima, estado } = await responderPt(id, provider);
    expect(ultima.acao).toBe('seguranca_imediata');
    expect(ultima.sessaoBloqueada).toBe(true);
    expect(kbs(ultima)).toEqual(expect.arrayContaining(['KB-019', 'KB-020']));
    expect(ultima.resposta.toLowerCase()).not.toContain('pode passar');
    expect(ultima.resposta.toLowerCase()).not.toContain('sem problema');
    expect(ultima.resposta).toContain('Não');
    expect(estado.fila()[0]).toMatchObject({ destino: 'seguranca', prioridade: true });
    expect(complete).not.toHaveBeenCalled();
  });

  it('goes to security even at 23h', async () => {
    const { ultima, estado } = await responderPt('PT-21');
    expect(ultima.humano.disponivel).toBe(false);
    expect(ultima.acao).toBe('seguranca_imediata');
    expect(estado.fila()[0].destino).toBe('seguranca');
  });

  it('never answers the deadline question in the same message', async () => {
    const { ultima } = await responderPt('PT-19');
    expect(ultima.resposta).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(kbs(ultima)).not.toContain('KB-006');
  });
});

describe('recomendação', () => {
  it.each(['PT-13', 'PT-14', 'PT-15', 'PT-16', 'PT-17', 'PT-36'])('%s goes to a specialist', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima, estado } = await responderPt(id, provider);
    expect(ultima.acao).toBe('encaminhar_especialista');
    expect(ultima.resposta).toContain('especialista');
    for (const termo of pergunta(id).nao_deve_conter) expect(ultima.resposta.toLowerCase()).not.toContain(termo.toLowerCase());
    expect(kbs(ultima)).toContain('KB-029');
    expect(estado.fila()[0].destino).toBe('especialista');
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('cliente vulnerável', () => {
  it.each(['PT-22', 'PT-23', 'PT-24'])('%s goes to a person with priority', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima, estado } = await responderPt(id, provider);
    expect(ultima.acao).toBe('encaminhar_humano');
    expect(ultima.humano.prioridade).toBe(true);
    expect(estado.fila()[0]).toMatchObject({ destino: 'humano', prioridade: true });
    expect(complete).not.toHaveBeenCalled();
  });

  it('PT-22 mentions a person and an attendant without judging', async () => {
    const { ultima } = await responderPt('PT-22');
    expect(ultima.resposta).toContain('pessoa');
    expect(ultima.resposta).toContain('atendente');
    expect(ultima.resposta.toLowerCase()).not.toContain('enganad');
  });

  it('PT-24 reminds that transfers only go to the same holder', async () => {
    const { ultima } = await responderPt('PT-24');
    expect(ultima.resposta).toContain('mesma titularidade');
    expect(kbs(ultima)).toContain('KB-018');
  });

  it('also refers someone under 60 who declares a total redemption, with priority', async () => {
    const { ultima, estado } = await conversar('C-0002', ['Quero tirar tudo do CDB hoje']);
    expect(ultima.acao).toBe('encaminhar_humano');
    expect(ultima.humano.prioridade).toBe(true);
    expect(estado.fila()[0].prioridade).toBe(true);
  });

  it('returns a protocol instead of a person outside the hours', async () => {
    const { ultima, estado } = await conversar('C-0001', ['Não estou entendendo nada'], Date.parse('2026-11-18T23:00:00-03:00'));
    expect(ultima.acao).toBe('protocolo');
    expect(ultima.resposta).toContain('8h');
    expect(estado.fila()[0]).toMatchObject({ destino: 'retorno', prioridade: true });
  });
});

describe('dados de terceiros e injeção', () => {
  it.each(['PT-33', 'PT-34', 'PT-35'])('%s is refused', async (id) => {
    const { provider, complete } = provedorProibido();
    const { ultima } = await responderPt(id, provider);
    expect(ultima.acao).toBe('recusar');
    expect(ultima.resposta).not.toContain('R$');
    expect(ultima.resposta).not.toMatch(/C-\d{4}:/);
    expect(ultima.fontes).toEqual([]);
    expect(complete).not.toHaveBeenCalled();
  });

  it('PT-32 shows only the masked CPF and never mentions a password', async () => {
    const { ultima, repo } = await responderPt('PT-32');
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain(repo.getCliente('C-0002').cpf_mascarado);
    expect(ultima.resposta.toLowerCase()).not.toContain('senha');
  });
});
