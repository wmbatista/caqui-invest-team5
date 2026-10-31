import type { Acao, Fonte, RespostaChat } from '@caqui/contracts';
import type { ClienteRecord, PositionRepository } from '../data/position-repository.js';
import type { Conversa, EstadoMemoria } from '../estado/memoria.js';
import type { LlmProvider } from '../providers/openrouter.js';

export interface Dependencias {
  repo: PositionRepository;
  estado: EstadoMemoria;
  provider: LlmProvider;
}

export interface Contexto extends Dependencias {
  cliente: ClienteRecord;
  conversa: Conversa;
  /** Mensagem do cliente com CPF já mascarado. */
  texto: string;
  /** O mesmo texto, normalizado para os padrões. */
  normalizado: string;
  sinais: Set<string>;
  agora: number;
}

export interface RespostaFluxo {
  texto: string;
  acao?: Acao;
  regras: string[];
  fontes: Fonte[];
  sessaoBloqueada?: boolean;
  opcoes?: RespostaChat['opcoes'];
  geradoPor?: RespostaChat['geradoPor'];
}

/** Cada fluxo decide se responde; devolver nulo passa a vez ao próximo. A ordem da lista é a precedência. */
export type Fluxo = (ctx: Contexto) => RespostaFluxo | null | Promise<RespostaFluxo | null>;

export function fonteKb(ctx: Pick<Dependencias, 'repo'>, ...ids: string[]): Fonte[] {
  return [...new Set(ids)].map((id) => ({ tipo: 'kb' as const, id, titulo: ctx.repo.getArtigo(id).titulo }));
}

export function fonteConta(...ids: string[]): Fonte[] {
  return [...new Set(ids)].map((id) => ({ tipo: 'conta' as const, id }));
}
