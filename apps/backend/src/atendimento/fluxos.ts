import { Assistente } from './assistente.js';
import { encerramento, pedidoDePessoa, reclamacao } from './canais.js';
import { foraDoEscopo, horarioDeCorte, produtoNaoOferecido } from './escopo.js';
import { operacoes } from './operacoes.js';
import { posicao, posicaoPorIntencao } from './posicao.js';
import { cpf, dadosDeTerceiros, golpe, recomendacao, vulneravel } from './protecoes.js';
import type { Dependencias, Fluxo } from './tipos.js';

/** A ordem desta lista é a precedência do atendimento: as proteções vencem qualquer outro fluxo. */
export const FLUXOS: Fluxo[] = [
  golpe,
  recomendacao,
  dadosDeTerceiros,
  vulneravel,
  reclamacao,
  encerramento,
  pedidoDePessoa,
  cpf,
  produtoNaoOferecido,
  horarioDeCorte,
  foraDoEscopo,
  operacoes,
  posicao,
  posicaoPorIntencao,
];

export function criarAssistente(deps: Dependencias): Assistente {
  return new Assistente(deps, FLUXOS);
}
