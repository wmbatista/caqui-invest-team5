/**
 * Passa as perguntas das regras tratadas pelo assistente e grava respostas.jsonl para ferramentas/checar_respostas.py.
 * Cada pergunta roda numa conversa nova, no cliente e no momento do contexto (padrão: C-0002 e o "agora" dos dados).
 * " | " separa mensagens seguidas na mesma conversa; vale a última resposta.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarAssistente } from '../src/atendimento/fluxos.js';
import { loadConfig } from '../src/config.js';
import { PositionRepository } from '../src/data/position-repository.js';
import { EstadoMemoria } from '../src/estado/memoria.js';
import { NullProvider } from '../src/providers/openrouter.js';

const REGRAS_TRATADAS = new Set([1, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

interface Pergunta {
  id: string;
  regra: number | string;
  contexto: { id_cliente?: string; momento?: string };
  pergunta: string;
}

const config = loadConfig();
const saida = resolve(process.cwd(), process.argv[2] ?? '../../respostas.jsonl');
const perguntas = readFileSync(resolve(process.cwd(), config.dataDir, 'perguntas_teste.jsonl'), 'utf8')
  .trim().split(/\r?\n/).map((linha) => JSON.parse(linha) as Pergunta)
  .filter(({ regra }) => typeof regra === 'number' && REGRAS_TRATADAS.has(regra));

const repo = new PositionRepository(config.dataDir);
const linhas: string[] = [];

for (const item of perguntas) {
  const clienteId = item.contexto.id_cliente ?? 'C-0002';
  const agora = Date.parse(item.contexto.momento ?? config.clockDefault);
  const assistente = criarAssistente({ repo, estado: new EstadoMemoria(10), provider: new NullProvider() });
  const conversa = assistente.novaConversa(clienteId, agora);
  let resposta;
  for (const mensagem of item.pergunta.split(' | ')) {
    resposta = await assistente.responder({ clienteId, conversaId: conversa.id, mensagem, agora });
  }
  linhas.push(JSON.stringify({
    id: item.id,
    resposta: resposta?.resposta,
    acao: resposta?.acao,
    regras: resposta?.regras,
    fontes: resposta?.fontes.map(({ id }) => id),
  }));
}

writeFileSync(saida, `${linhas.join('\n')}\n`, 'utf8');
console.log(`${linhas.length} respostas gravadas em ${saida}`);
