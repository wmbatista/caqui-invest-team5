import { describe, expect, it } from 'vitest';
import { ClienteNaoEncontradoError, PositionRepository } from '../src/data/position-repository.js';

describe('PositionRepository', () => {
  const repository = new PositionRepository('../../dados');

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
  });
});
