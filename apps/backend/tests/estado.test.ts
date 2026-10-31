import { describe, expect, it } from 'vitest';
import { EstadoMemoria } from '../src/estado/memoria.js';

const agora = Date.parse('2026-11-18T10:00:00-03:00');
const cpf = ['123', '456', '789'].join('.') + '-09';

function encaminhamento(estado: EstadoMemoria, conversaId: string, protocolo: string, destino: 'humano' | 'seguranca', prioridade: boolean) {
  return estado.abrirEncaminhamento({ protocolo, conversaId, clienteId: 'C-0001', destino, prioridade, motivo: 'teste', sinais: [], resumo: `caso ${cpf}`, momento: agora });
}

describe('EstadoMemoria', () => {
  it('creates a protocol with the clock date', () => {
    const estado = new EstadoMemoria(10);
    expect(estado.criarConversa('C-0001', agora).protocolo).toBe('CQ-20261118-0001');
    expect(estado.criarConversa('C-0002', agora).protocolo).toBe('CQ-20261118-0002');
  });

  it('never stores a raw CPF', () => {
    const estado = new EstadoMemoria(10);
    const conversa = estado.criarConversa('C-0001', agora);
    estado.registrarMensagem({ conversaId: conversa.id, autor: 'cliente', texto: `meu cpf é ${cpf}`, regras: [], fontes: [], momento: agora });
    const caso = encaminhamento(estado, conversa.id, conversa.protocolo, 'humano', false);
    expect(estado.historico(conversa.id)[0].texto).not.toContain(cpf);
    expect(caso.resumo).not.toContain(cpf);
  });

  it('hides a conversation from any other client', () => {
    const estado = new EstadoMemoria(10);
    const conversa = estado.criarConversa('C-0001', agora);
    expect(estado.buscarConversa(conversa.id, 'C-0001')).toBeTruthy();
    expect(estado.buscarConversa(conversa.id, 'C-0002')).toBeUndefined();
  });

  it('orders the queue by security, then priority, then most recent, up to 50', () => {
    const estado = new EstadoMemoria(100);
    const conversa = estado.criarConversa('C-0001', agora);
    const comum = encaminhamento(estado, conversa.id, conversa.protocolo, 'humano', false);
    const prioritario = encaminhamento(estado, conversa.id, conversa.protocolo, 'humano', true);
    const seguranca = encaminhamento(estado, conversa.id, conversa.protocolo, 'seguranca', false);
    const recente = encaminhamento(estado, conversa.id, conversa.protocolo, 'humano', false);
    expect(estado.fila().map(({ id }) => id)).toEqual([seguranca.id, prioritario.id, recente.id, comum.id]);
    for (let i = 0; i < 60; i += 1) encaminhamento(estado, conversa.id, conversa.protocolo, 'humano', false);
    expect(estado.fila()).toHaveLength(50);
  });

  it('only appends referrals', () => {
    const estado = new EstadoMemoria(10);
    const conversa = estado.criarConversa('C-0001', agora);
    encaminhamento(estado, conversa.id, conversa.protocolo, 'humano', false);
    encaminhamento(estado, conversa.id, conversa.protocolo, 'seguranca', true);
    expect(estado.fila()).toHaveLength(2);
    expect(estado.fila().every(({ status }) => status === 'aberto')).toBe(true);
  });

  it('removes the oldest conversations without a referral past the cap', () => {
    const estado = new EstadoMemoria(2);
    const comCaso = estado.criarConversa('C-0001', agora);
    encaminhamento(estado, comCaso.id, comCaso.protocolo, 'humano', false);
    const antiga = estado.criarConversa('C-0002', agora);
    const nova = estado.criarConversa('C-0003', agora);
    expect(estado.buscarConversa(comCaso.id, 'C-0001')).toBeTruthy();
    expect(estado.buscarConversa(antiga.id, 'C-0002')).toBeUndefined();
    expect(estado.buscarConversa(nova.id, 'C-0003')).toBeTruthy();
  });

  it('stays bounded even when every conversation has a referral', () => {
    const estado = new EstadoMemoria(1);
    const primeira = estado.criarConversa('C-0001', agora);
    encaminhamento(estado, primeira.id, primeira.protocolo, 'humano', false);
    estado.criarConversa('C-0002', agora);
    expect(estado.buscarConversa(primeira.id, 'C-0001')).toBeUndefined();
    expect(estado.fila()).toHaveLength(0);
  });
});
