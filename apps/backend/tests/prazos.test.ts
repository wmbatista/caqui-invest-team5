import { describe, expect, it } from 'vitest';
import { PositionRepository } from '../src/data/position-repository.js';
import { Calendario, ForaDoCalendario } from '../src/prazos/calendario.js';
import { liquidacao } from '../src/prazos/liquidacao.js';
import { DADOS } from './apoio.js';

const repo = new PositionRepository(DADOS);
const cal = new Calendario(repo.getCalendario());
const brt = (texto: string) => Date.parse(`${texto}:00-03:00`);

describe('motor de liquidação', () => {
  it('PT-01: Renda Fixa on Friday after the cutoff, with a Monday holiday', () => {
    const prazo = liquidacao('FUNDO-RF-01', 'resgate', brt('2026-10-30T17:00'), cal);
    expect([prazo.diaBase, prazo.cotizacao, prazo.pagamento]).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
    expect(prazo.passos.join(' ')).toContain('Finados');
  });

  it('PT-02: CDB before the cutoff settles the same day', () => {
    expect(liquidacao('CDB-LD-100', 'resgate', brt('2026-11-16T15:58'), cal).pagamento).toBe('2026-11-16');
  });

  it('counts 16h00 as the same day and 16h01 as the next business day', () => {
    expect(liquidacao('CDB-LD-100', 'resgate', brt('2026-11-16T16:00'), cal).pagamento).toBe('2026-11-16');
    expect(liquidacao('CDB-LD-100', 'resgate', brt('2026-11-16T16:01'), cal).pagamento).toBe('2026-11-17');
    expect(liquidacao('CDB-LD-100', 'resgate', Date.parse('2026-11-16T16:00:30-03:00'), cal).pagamento).toBe('2026-11-17');
  });

  it('PT-03: CDB 110 requested at 19h40', () => {
    expect(liquidacao('CDB-LD-110', 'resgate', brt('2026-11-17T19:40'), cal).pagamento).toBe('2026-11-18');
  });

  it('PT-04: Multimercado with 30 calendar days to quota', () => {
    const prazo = liquidacao('FUNDO-MM-01', 'resgate', brt('2026-10-30T17:20'), cal);
    expect([prazo.diaBase, prazo.cotizacao, prazo.pagamento]).toEqual(['2026-11-03', '2026-12-03', '2026-12-07']);
  });

  it('PT-05: Saturday goes to Monday, without showing an invented hour', () => {
    const prazo = liquidacao('CDB-LD-100', 'resgate', brt('2026-11-14T09:05'), cal);
    expect(prazo.pagamento).toBe('2026-11-16');
    expect(prazo.passos.join(' ')).not.toMatch(/\d{2}h\d{2}/);
    expect(prazo.passos.join(' ')).toContain('sábado');
  });

  it('pushes shares across the 20/11 holiday', () => {
    expect(liquidacao('ACOES', 'resgate', brt('2026-11-18T11:00'), cal).pagamento).toBe('2026-11-23');
  });

  it('settles a fund application at the D+1 quota', () => {
    const prazo = liquidacao('FUNDO-RF-01', 'aplicacao', brt('2026-11-16T10:00'), cal);
    expect(prazo.pagamento).toBe('2026-11-17');
    expect(prazo.cotizacao).toBe('2026-11-17');
  });

  it('settles a transfer right away, at any hour', () => {
    const prazo = liquidacao(null, 'transferencia_saida_pix', brt('2026-11-14T23:30'), cal);
    expect(prazo.pagamento).toBe('2026-11-14');
    expect(prazo.fontes).toEqual(['KB-018']);
  });

  it('Tesouro settles at D+1 business day and never cites KB-007', () => {
    const prazo = liquidacao('TESOURO-SELIC-2029', 'resgate', brt('2026-11-18T11:00'), cal);
    expect(prazo.pagamento).toBe('2026-11-19');
    expect(prazo.fontes).toContain('KB-006');
    expect(prazo.fontes).not.toContain('KB-007');
  });

  it('refuses a date outside the calendar', () => {
    expect(() => liquidacao('CDB-LD-100', 'resgate', brt('2026-05-21T10:00'), cal)).toThrow(ForaDoCalendario);
    expect(() => cal.ehUtil('2028-01-03')).toThrow(ForaDoCalendario);
  });

  it('matches every date of operacoes.csv and calculates the empty ones', () => {
    const fim = Date.parse('2026-11-18T10:00:00-03:00');
    const validas = repo.nomesDeClientes().flatMap(({ id }) => repo.getOperacoes(id, fim)).filter(({ status }) => status !== 'recusada');
    const comData = validas.filter(({ liquidacao_prevista }) => liquidacao_prevista);
    const semData = validas.filter(({ liquidacao_prevista }) => !liquidacao_prevista);
    expect(comData).toHaveLength(237);
    expect(semData).toHaveLength(148);
    for (const op of comData) {
      expect(liquidacao(op.produto, op.tipo, op.pedido_instante, cal).pagamento, op.id_operacao).toBe(op.liquidacao_prevista);
    }
    for (const op of semData) {
      expect(liquidacao(op.produto, op.tipo, op.pedido_instante, cal).pagamento, op.id_operacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
