import { describe, expect, it } from 'vitest';
import { personaPorId } from '../src/sessao/personas.js';
import { Sessoes } from '../src/sessao/sessoes.js';

const HORA = 3_600_000;
const padrao = Date.parse('2026-11-18T10:00:00-03:00');

function sessoes() {
  const relogio = { agora: 1_000_000 };
  return { relogio, servico: new Sessoes(padrao, () => relogio.agora) };
}

describe('personas', () => {
  it('rejects anything outside the fixed list', () => {
    expect(personaPorId('C-0001')?.papel).toBe('cliente');
    expect(personaPorId('C-0042')).toBeUndefined();
    expect(personaPorId('C-0027')?.papel).toBe('cliente');
    expect(personaPorId('ATENDENTE')?.papel).toBe('atendente');
  });
});

describe('Sessoes', () => {
  it('creates random tokens with the default clock', () => {
    const { servico } = sessoes();
    const persona = personaPorId('C-0001')!;
    const a = servico.criar(persona);
    const b = servico.criar(persona);
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(32);
    expect(servico.obter(a.token)).toMatchObject({ clienteId: 'C-0001', papel: 'cliente', agora: padrao });
  });

  it('keeps a separate clock per session', () => {
    const { servico } = sessoes();
    const persona = personaPorId('C-0001')!;
    const a = servico.criar(persona);
    const b = servico.criar(persona);
    a.agora = padrao + HORA;
    expect(servico.obter(b.token)?.agora).toBe(padrao);
    expect(servico.obter(a.token)?.agora).toBe(padrao + HORA);
  });

  it('expires after 8 idle hours', () => {
    const { relogio, servico } = sessoes();
    const { token } = servico.criar(personaPorId('C-0001')!);
    relogio.agora += 8 * HORA;
    expect(servico.obter(token)).toBeTruthy();
    relogio.agora += 8 * HORA + 1;
    expect(servico.obter(token)).toBeUndefined();
  });

  it('expires after 24 hours even when in use', () => {
    const { relogio, servico } = sessoes();
    const { token } = servico.criar(personaPorId('C-0001')!);
    for (let i = 0; i < 3; i += 1) {
      relogio.agora += 8 * HORA;
      expect(servico.obter(token)).toBeTruthy();
    }
    relogio.agora += 1;
    expect(servico.obter(token)).toBeUndefined();
  });

  it('ends every session of one client only', () => {
    const { servico } = sessoes();
    const a = servico.criar(personaPorId('C-0001')!);
    const b = servico.criar(personaPorId('C-0001')!);
    const outra = servico.criar(personaPorId('C-0002')!);
    expect(servico.encerrarDoCliente('C-0001')).toBe(2);
    expect(servico.obter(a.token)).toBeUndefined();
    expect(servico.obter(b.token)).toBeUndefined();
    expect(servico.obter(outra.token)).toBeTruthy();
  });
});
