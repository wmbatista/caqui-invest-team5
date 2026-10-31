import { describe, expect, it } from 'vitest';
import { DataInvalida, brl, criarData, dataBr, diaSemana, horaBr, instanteBrt, isoBrt, moduloPositivo, paraBrt, somarCentavos, somarDias } from '../src/atendimento/formato.js';

describe('formato', () => {
  it('formats BRL with a normal space and no NBSP', () => {
    expect(brl(1250)).toBe('R$ 1.250,00');
    expect(brl(61021.15)).toBe('R$ 61.021,15');
    expect(brl(0.5)).toBe('R$ 0,50');
    expect(brl(1234567.8)).toBe('R$ 1.234.567,80');
    expect(brl(1250)).not.toContain(' ');
  });

  it('adds in integer cents', () => {
    expect(somarCentavos([0.1, 0.2])).toBe(0.3);
    expect(somarCentavos([40791.24, 20229.91])).toBe(61021.15);
  });

  it('rejects impossible dates instead of rolling over', () => {
    expect(() => criarData(2026, 2, 31)).toThrow(DataInvalida);
    expect(() => criarData(2026, 13, 1)).toThrow(DataInvalida);
    expect(criarData(2026, 11, 2)).toBe('2026-11-02');
  });

  it('uses Monday as day zero', () => {
    expect(diaSemana('2026-11-16')).toBe(0);
    expect(diaSemana('2026-11-14')).toBe(5);
    expect(diaSemana('2026-11-15')).toBe(6);
  });

  it('never returns a negative modulo', () => {
    expect(moduloPositivo(2 - 5, 7)).toBe(4);
    expect(moduloPositivo(5 - 2, 7)).toBe(3);
  });

  it('reads the -03:00 time regardless of the machine timezone', () => {
    const utc = Date.parse('2026-11-17T22:40:00Z');
    expect(paraBrt(utc)).toMatchObject({ data: '2026-11-17', hora: 19, minuto: 40 });
    expect(paraBrt(Date.parse('2026-11-18T02:00:00Z')).data).toBe('2026-11-17');
    expect(horaBr(utc)).toBe('19h40');
    expect(dataBr('2026-11-05')).toBe('05/11/2026');
    expect(isoBrt(utc)).toBe('2026-11-17T19:40:00-03:00');
    expect(instanteBrt('2026-11-17', 19, 40)).toBe(utc);
  });

  it('adds calendar days across a month', () => {
    expect(somarDias('2026-11-03', 30)).toBe('2026-12-03');
    expect(somarDias('2026-11-03', -3)).toBe('2026-10-31');
  });
});
