import { naoOferecido } from '../triagem/guarda.js';
import { fonteKb, type Fluxo } from './tipos.js';

/** IR, poupança, rentabilidade e conceitos ficam fora desta spec: a resposta diz isso em vez de improvisar (princípio I). */
const FORA_DO_ESCOPO = /aliquota|imposto|\bir\b|poupanca|\brend(?:eu|e|er|imento|imentos)\b|rentabilidade|\bo que e\b|\bo que significa\b|garantia|\bfgc\b|diferenca entre|diferenca de|como funciona/;

export const produtoNaoOferecido: Fluxo = (ctx) => {
  if (ctx.sinais.has('nao_entendeu')) return null;
  const produto = naoOferecido(ctx.normalizado);
  if (!produto) return null;
  return {
    texto: `A Caqui não oferece ${produto}. Os produtos da Caqui são CDB, LCI, LCA, Tesouro Selic, fundos e ações.`,
    regras: ['CQ-09', 'CQ-C3'],
    fontes: fonteKb(ctx, 'KB-030'),
  };
};

export const horarioDeCorte: Fluxo = (ctx) => {
  if (!/horario de corte|\bcorte\b|ate que horas/.test(ctx.normalizado)) return null;
  return {
    texto: 'O horário de corte é 16h. CDB e LCI de liquidez diária pedidos até 16h de dia útil liquidam no mesmo dia; depois das 16h, ou em fim de semana ou feriado, contam a partir do próximo dia útil.',
    regras: ['CQ-01', 'CQ-09'],
    fontes: fonteKb(ctx, 'KB-006'),
  };
};

export const foraDoEscopo: Fluxo = (ctx) => {
  if (ctx.sinais.has('nao_entendeu') || !FORA_DO_ESCOPO.test(ctx.normalizado)) return null;
  return {
    texto: 'Esse assunto eu não trato por aqui, e não quero te passar uma informação errada. Posso mostrar onde está o seu dinheiro e quando ele cai. Para o resto, toque em Falar com uma pessoa.',
    regras: ['CQ-09', 'CQ-C1'],
    fontes: [],
  };
};
