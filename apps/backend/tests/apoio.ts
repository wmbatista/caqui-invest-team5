import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { criarAssistente } from '../src/atendimento/fluxos.js';
import { PositionRepository } from '../src/data/position-repository.js';
import { EstadoMemoria } from '../src/estado/memoria.js';
import { NullProvider, type CompletionInput, type LlmProvider } from '../src/providers/openrouter.js';

export const DADOS = '../../dados';
export const AGORA_PADRAO = Date.parse('2026-11-18T10:00:00-03:00');

export interface Pergunta {
  id: string;
  regra: number | string;
  contexto: { id_cliente?: string; momento?: string };
  pergunta: string;
  resposta_esperada: string;
  acao_esperada: string;
  deve_conter: string[];
  nao_deve_conter: string[];
}

export const PERGUNTAS: Pergunta[] = readFileSync(`${DADOS}/perguntas_teste.jsonl`, 'utf8').trim().split(/\r?\n/).map((linha) => JSON.parse(linha));

export function pergunta(id: string): Pergunta {
  const encontrada = PERGUNTAS.find((item) => item.id === id);
  if (!encontrada) throw new Error(`Pergunta inexistente: ${id}`);
  return encontrada;
}

const repoCompartilhado = new PositionRepository(DADOS);

export function montar(provider: LlmProvider = new NullProvider()) {
  const estado = new EstadoMemoria(1000);
  const assistente = criarAssistente({ repo: repoCompartilhado, estado, provider });
  return { repo: repoCompartilhado, estado, assistente };
}

/** Provedor que reprova o teste se for chamado: prova que o fluxo não depende do LLM. */
export function provedorProibido() {
  const complete = vi.fn(async (_entrada: CompletionInput): Promise<string | null> => {
    throw new Error('O provedor não deveria ter sido chamado');
  });
  const provider: LlmProvider = { name: 'proibido', model: 'proibido', complete };
  return { provider, complete };
}

/** Roda mensagens seguidas numa conversa nova; devolve todas as respostas. */
export async function conversar(clienteId: string, mensagens: string[], agora = AGORA_PADRAO, provider?: LlmProvider) {
  const ctx = montar(provider);
  const conversa = ctx.assistente.novaConversa(clienteId, agora);
  const respostas = [];
  for (const mensagem of mensagens) respostas.push(await ctx.assistente.responder({ clienteId, conversaId: conversa.id, mensagem, agora }));
  return { ...ctx, conversa, respostas, ultima: respostas[respostas.length - 1] };
}

/** Roda uma pergunta do pacote com cliente e momento do contexto (cliente padrão C-0002, como no checador). */
export async function responderPt(id: string, provider?: LlmProvider) {
  const item = pergunta(id);
  const clienteId = item.contexto.id_cliente ?? 'C-0002';
  const agora = item.contexto.momento ? Date.parse(item.contexto.momento) : AGORA_PADRAO;
  return conversar(clienteId, item.pergunta.split(' | '), agora, provider);
}

export interface ConversaRotulada {
  id: string;
  clienteId: string;
  sinais: string[];
  turnos: string[];
}

function lerCsvComAspas(texto: string): Record<string, string>[] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i += 1; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cabecalho, ...resto] = linhas;
  return resto.map((valores) => Object.fromEntries(cabecalho.map((nome, posicao) => [nome, valores[posicao]])));
}

export const CONVERSAS: ConversaRotulada[] = lerCsvComAspas(readFileSync(`${DADOS}/conversas.csv`, 'utf8')).map((registro) => ({
  id: registro.id_conversa,
  clienteId: registro.id_cliente,
  sinais: (registro.sinais ?? '').split(';').map((sinal) => sinal.trim()).filter(Boolean),
  turnos: registro.transcricao.split(' | ').filter((turno) => /^cliente\s*:/i.test(turno)).map((turno) => turno.replace(/^[^:]*:\s*/, '')),
}));
