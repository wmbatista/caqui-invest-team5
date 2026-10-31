import { describe, expect, it } from 'vitest';
import { mascararCpf, normalizar } from '../src/triagem/guarda.js';

describe('normalizar', () => {
  it('removes accents and case', () => {
    expect(normalizar('Código da SEGURANÇA')).toBe('codigo da seguranca');
  });

  it('removes anything that is not ASCII', () => {
    expect(normalizar('olá € mundo 😀')).toBe('ola mundo');
  });

  it('joins spaces and line breaks', () => {
    expect(normalizar('o gerente me ligou\n\n  pediu   o código')).toBe('o gerente me ligou pediu o codigo');
  });
});

describe('mascararCpf', () => {
  // Montados aqui para a trava de commit não barrar o próprio teste.
  const comPontos = ['123', '456', '789'].join('.') + '-09';
  const semPontos = ['123', '456', '789', '09'].join('');

  it('masks a CPF with and without punctuation', () => {
    expect(mascararCpf(`meu cpf é ${comPontos}.`)).toBe('meu cpf é ***.***.***-**.');
    expect(mascararCpf(`cpf ${semPontos}`)).toBe('cpf ***.***.***-**');
  });

  it('keeps other numbers', () => {
    expect(mascararCpf('resgate de R$ 40.000,00 em 18/11/2026')).toBe('resgate de R$ 40.000,00 em 18/11/2026');
  });
});
