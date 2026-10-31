import { describe, expect, it } from 'vitest';
import { ClienteNaoEncontradoError, PositionRepository } from '../src/data/position-repository.js';

describe('PositionRepository', () => {
  const repository = new PositionRepository('../../dados');
  const fim = Date.parse('2026-11-18T10:00:00-03:00');

  it('calculates the C-0001 reference values in code', () => {
    const result = repository.resumoPosicao('C-0001');
    expect(result).toMatchObject({
      totalAplicado: 60000,
      saldoBrutoInvestimentos: 61021.15,
      saldoEmConta: 1250,
      fontes: ['P-0001', 'P-0002', 'C-0001'],
    });
    expect(result.posicoes.every(({ id_cliente }) => id_cliente === 'C-0001')).toBe(true);
  });

  it('rejects an unknown client', () => {
    expect(() => repository.resumoPosicao('C-9999')).toThrow(ClienteNaoEncontradoError);
    expect(() => repository.getCliente('C-9999')).toThrow(ClienteNaoEncontradoError);
  });

  it('loads the whole synthetic package', () => {
    expect(repository.totais()).toEqual({ clientes: 50, posicoes: 146, operacoes: 400, produtos: 10, artigos: 29 });
    expect(repository.nomesDeClientes()).toHaveLength(50);
    expect(Object.keys(repository.nomesDeClientes()[0]).sort()).toEqual(['id', 'nome']);
  });

  it('never loads the outdated KB-007', () => {
    expect(() => repository.getArtigo('KB-007')).toThrow();
    expect(repository.getArtigo('KB-006').titulo).toBeTruthy();
    expect(repository.getArtigo('KB-020').titulo).toBe('Suspeita de golpe: o que fazer');
  });

  it('reads an empty liquidacao_prevista as null', () => {
    const op = repository.getOperacoes('C-0001', fim).find(({ id_operacao }) => id_operacao === 'OP-10006');
    expect(op?.liquidacao_prevista).toBeNull();
    expect(op?.observacao).toBeNull();
  });

  it('keeps a client from receiving another client data', () => {
    for (const { id } of repository.nomesDeClientes()) {
      expect(repository.getPosicoes(id).every(({ id_cliente }) => id_cliente === id)).toBe(true);
      expect(repository.getOperacoes(id, fim).every(({ id_cliente }) => id_cliente === id)).toBe(true);
    }
  });

  it('hides operations requested after the clock', () => {
    const antes = Date.parse('2026-11-17T19:39:00-03:00');
    expect(repository.getOperacoes('C-0001', antes).map(({ id_operacao }) => id_operacao)).not.toContain('OP-10005');
    expect(repository.getOperacoes('C-0001', fim).map(({ id_operacao }) => id_operacao)).toContain('OP-10005');
  });

  it('exposes products, calendar and rates', () => {
    expect(repository.getProduto('CDB-LD-110').tipo).toBe('CDB');
    expect(repository.getCalendario().find(({ data }) => data === '2026-11-02')?.feriado).toBeTruthy();
  });
});
