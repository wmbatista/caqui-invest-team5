import { param } from '../regras/regras-caqui.js';
import { encaminhar, paraHumano } from './humano.js';
import { fonteKb, type Fluxo } from './tipos.js';

export const reclamacao: Fluxo = (ctx) => {
  if (!ctx.sinais.has('reclamacao')) return null;
  encaminhar(ctx, 'reclamacao', 'reclamação', ctx.sinais);
  return {
    texto: `Registrei sua reclamação com o protocolo ${ctx.conversa.protocolo}. A resposta vem em até ${param('CQ-07', 'prazo_dias')} dias corridos, e você acompanha pelo protocolo no app. `
      + 'Você não precisa repetir o que já contou: o histórico vai junto. Se quiser falar com uma pessoa agora, use o botão Falar com uma pessoa.',
    acao: 'protocolo',
    regras: ['CQ-07', 'CQ-C5'],
    fontes: fonteKb(ctx, 'KB-026'),
  };
};

/** CQ-07: oferece o caminho na primeira resposta, sem tentativa de retenção. */
export const encerramento: Fluxo = (ctx) => {
  if (!ctx.sinais.has('encerramento')) return null;
  return {
    texto: 'Você pode encerrar sua conta, sim. São dois passos:\n1. Resgatar os investimentos. Os que não têm liquidez diária continuam até o vencimento.\n2. Transferir o saldo para uma conta no seu nome.\n'
      + 'Depois disso, a conta é encerrada. Se quiser fazer isso com uma pessoa, toque em Falar com uma pessoa.',
    regras: ['CQ-07'],
    fontes: fonteKb(ctx, 'KB-027', 'KB-018'),
  };
};

export const pedidoDePessoa: Fluxo = (ctx) => {
  if (!ctx.sinais.has('humano')) return null;
  const { texto, acao } = paraHumano(ctx, 'pediu para falar com uma pessoa', ctx.sinais);
  return { texto, acao, regras: ['CQ-C1', 'CQ-12', 'CQ-C5'], fontes: fonteKb(ctx, 'KB-025') };
};
