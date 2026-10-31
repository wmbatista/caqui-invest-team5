import { describe, expect, it } from 'vitest';
import { lerMomento } from '../src/atendimento/momento.js';
import { DataInvalida } from '../src/atendimento/formato.js';
import { conversar, responderPt } from './apoio.js';

const ids = (resposta: { fontes: { id: string }[] }) => resposta.fontes.map(({ id }) => id);
const brt = (texto: string) => Date.parse(`${texto}:00-03:00`);

describe('perguntas de prazo do case', () => {
  it.each([
    ['PT-01', '05/11/2026'],
    ['PT-02', '16/11/2026'],
    ['PT-03', '18/11/2026'],
    ['PT-04', '07/12/2026'],
    ['PT-05', '16/11/2026'],
  ])('%s answers %s', async (id, data) => {
    const { ultima } = await responderPt(id);
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain(data);
    expect(ids(ultima)).toContain('KB-006');
  });
});

describe('cenários da US1', () => {
  it('C-0001 at 9h: processing, with sources, no alarm words and a person offered', async () => {
    const { ultima } = await responderPt('PT-03');
    expect(ultima.resposta).toContain('processamento');
    expect(ultima.resposta).toContain('19h40');
    expect(ids(ultima)).toEqual(expect.arrayContaining(['OP-10005', 'KB-006', 'KB-008']));
    expect(ultima.resposta.toLowerCase()).not.toContain('sumiu');
    expect(ultima.resposta.toLowerCase()).not.toContain('perdido');
    expect(ultima.resposta).toContain('pessoa');
    expect(ultima.acao).toBe('responder');
  });

  it('C-0002 gets the Multimercado date from the operation', async () => {
    const { ultima } = await responderPt('PT-04');
    expect(ids(ultima)).toContain('OP-10007');
    expect(ultima.resposta).toContain('03/11/2026');
  });

  it('calculates an operation with an empty date', async () => {
    const { ultima } = await conversar('C-0002', ['OP-10008']);
    expect(ids(ultima)).toContain('OP-10008');
    expect(ultima.resposta).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(ids(ultima)).toContain('KB-016');
  });

  it('recognizes a late settlement and hands the case to a person', async () => {
    const { ultima, estado } = await conversar('C-0027', ['Cadê meu resgate?']);
    expect(ultima.acao).toBe('encaminhar_humano');
    expect(ultima.resposta).toContain('atraso');
    expect(ultima.resposta).toContain('12/11/2026');
    expect(ids(ultima)).toEqual(expect.arrayContaining(['OP-10012', 'KB-008']));
    expect(ultima.resposta.toLowerCase()).not.toContain('sumiu');
    expect(estado.fila()[0].motivo).toContain('OP-10012');
  });

  it('explains a refused redemption and says the money stays invested', async () => {
    const { repo } = await conversar('C-0001', ['asdf']);
    const fim = brt('2026-11-18T10:00');
    const dono = repo.nomesDeClientes().map(({ id }) => id).find((id) => repo.getOperacoes(id, fim).some(({ status }) => status === 'recusada'))!;
    const recusada = repo.getOperacoes(dono, fim).find(({ status }) => status === 'recusada')!;
    const { ultima } = await conversar(dono, [recusada.id_operacao]);
    expect(ultima.resposta).toContain('recusado');
    expect(ultima.resposta).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(ultima.resposta).toContain('continua aplicado');
    expect(ids(ultima)).toEqual(expect.arrayContaining(['KB-005', 'KB-011']));
  });

  it('answers about a transfer', async () => {
    const { repo } = await conversar('C-0001', ['asdf']);
    const fim = brt('2026-11-18T10:00');
    const dono = repo.nomesDeClientes().map(({ id }) => id).find((id) => repo.getOperacoes(id, fim).some(({ tipo }) => tipo === 'transferencia_saida_pix'))!;
    const op = repo.getOperacoes(dono, fim).find(({ tipo }) => tipo === 'transferencia_saida_pix')!;
    const { ultima } = await conversar(dono, ['Minha transferência por Pix caiu?']);
    expect(ultima.resposta.toLowerCase()).toContain('transferência');
    expect(ids(ultima)).toContain(op.id_operacao);
    expect(ids(ultima)).toContain('KB-018');
  });
});

describe('casos de borda', () => {
  it('asks which one when several operations fit', async () => {
    const { ultima } = await conversar('C-0002', ['Quando cai meu resgate?']);
    expect(ultima.acao).toBe('responder');
    expect(ultima.opcoes?.map(({ id }) => id).sort()).toEqual(['OP-10007', 'OP-10008']);
    expect(ultima.resposta).toContain('Qual');
    expect(ultima.resposta).not.toContain('07/12/2026');
  });

  it('answers the option chosen in the next message', async () => {
    const { ultima } = await conversar('C-0002', ['Quando cai meu resgate?', 'OP-10007']);
    expect(ultima.resposta).toContain('07/12/2026');
    expect(ultima.opcoes).toBeUndefined();
  });

  it('never reveals an operation of another client by id', async () => {
    const { ultima } = await conversar('C-0002', ['OP-10005']);
    expect(ids(ultima)).not.toContain('OP-10005');
    expect(ultima.resposta).not.toContain('OP-10005');
    expect(ultima.resposta).toContain('Não encontrei');
  });

  it('says it did not find an operation and lists the recent ones', async () => {
    const { ultima } = await conversar('C-0003', ['Cadê meu resgate?']);
    expect(ultima.resposta.toLowerCase()).toContain('não encontrei');
    expect(ultima.resposta).not.toMatch(/cai em \d{2}\//);
  });

  it('calculates a hypothetical date with only KB sources', async () => {
    const { ultima } = await responderPt('PT-01');
    expect(ultima.fontes.every(({ tipo }) => tipo === 'kb')).toBe(true);
  });

  it('asks for the hour when it changes the answer', async () => {
    const { ultima } = await conversar('C-0002', ['Pedi resgate do CDB em 16/11. Quando cai?']);
    expect(ultima.resposta).toContain('Até as 16h');
    expect(ultima.resposta).toContain('16/11/2026');
    expect(ultima.resposta).toContain('17/11/2026');
  });

  it.each([
    ['impossible date', 'Pedi resgate do CDB em 31/02. Quando cai?'],
    ['date outside the calendar', 'Pedi resgate do CDB em 21/05/2026. Quando cai?'],
  ])('says it does not know and hands over: %s', async (_nome, mensagem) => {
    const { ultima } = await conversar('C-0002', [mensagem]);
    expect(ultima.acao).toBe('encaminhar_humano');
    expect(ultima.resposta).toContain('não vou arriscar');
    expect(ultima.resposta).not.toMatch(/cai em \d{2}\//);
  });

  it('does not invent an hour for Saturday morning', async () => {
    const { ultima } = await responderPt('PT-05');
    expect(ultima.resposta).not.toMatch(/\b09h00\b/);
    expect(ultima.resposta.toLowerCase()).toContain('sábado');
  });
});

describe('lerMomento', () => {
  const agora = brt('2026-11-18T10:00');

  it('reads explicit and relative dates', () => {
    expect(lerMomento('30/10 as 17h20', agora)).toEqual({ dia: '2026-10-30', hora: { hora: 17, minuto: 20 } });
    expect(lerMomento('ontem as 19h40', agora)).toEqual({ dia: '2026-11-17', hora: { hora: 19, minuto: 40 } });
    expect(lerMomento('anteontem', agora)).toEqual({ dia: '2026-11-16', hora: null });
    expect(lerMomento('nada aqui', agora)).toEqual({ dia: null, hora: null });
  });

  it('counts the weekday backwards, never into the future', () => {
    expect(lerMomento('na segunda', agora).dia).toBe('2026-11-16');
    expect(lerMomento('na quarta', agora).dia).toBe('2026-11-18');
    expect(lerMomento('na quinta', agora).dia).toBe('2026-11-12');
    expect(lerMomento('no sabado', agora).dia).toBe('2026-11-14');
  });

  it('rejects an impossible date', () => {
    expect(() => lerMomento('31/02', agora)).toThrow(DataInvalida);
  });
});
