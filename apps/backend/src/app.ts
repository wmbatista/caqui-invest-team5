import type { Writable } from 'node:stream';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { criarAssistente } from './atendimento/fluxos.js';
import type { Config } from './config.js';
import { PositionRepository } from './data/position-repository.js';
import { EstadoMemoria } from './estado/memoria.js';
import type { LlmProvider } from './providers/openrouter.js';
import { ErroHttp } from './routes/comum.js';
import { rotasAtendente } from './routes/atendente.js';
import { rotasChat } from './routes/chat.js';
import { rotasConta } from './routes/conta.js';
import { rotasSessao } from './routes/sessao.js';
import { Sessoes } from './sessao/sessoes.js';

export interface OpcoesApp {
  logLevel?: string;
  logStream?: Writable;
  /** Permite ao teste de contrato conferir todas as rotas registradas. */
  aoRegistrarRota?: (metodo: string, url: string) => void;
}

export async function buildApp(config: Config, provider: LlmProvider, opcoes: OpcoesApp = {}) {
  const app = Fastify({
    logger: {
      level: opcoes.logLevel ?? process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.authorization', 'body.mensagem'],
      ...(opcoes.logStream ? { stream: opcoes.logStream } : {}),
    },
  });
  if (opcoes.aoRegistrarRota) {
    const registrar = opcoes.aoRegistrarRota;
    app.addHook('onRoute', ({ method, url }) => [method].flat().forEach((metodo) => registrar(metodo, url)));
  }
  await app.register(cors, { origin: config.corsOrigins });

  const repo = new PositionRepository(config.dataDir);
  const estado = new EstadoMemoria(config.estadoMaxConversas);
  const sessoes = new Sessoes(Date.parse(config.clockDefault));
  const assistente = criarAssistente({ repo, estado, provider });

  app.setErrorHandler((erro, request, reply) => {
    if (erro instanceof ErroHttp) return reply.code(erro.status).send({ code: erro.code, message: erro.message });
    if (erro instanceof ZodError) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'Requisição inválida.' });
    if (erro.statusCode && erro.statusCode < 500) return reply.code(erro.statusCode).send({ code: 'INVALID_REQUEST', message: 'Requisição inválida.' });
    request.log.error({ err: { type: erro.name } }, 'erro inesperado');
    return reply.code(500).send({ message: 'Erro inesperado. Fale com uma pessoa da Caqui.' });
  });

  app.get('/health', async () => ({ status: 'ok' }));
  rotasSessao(app, repo, sessoes);
  rotasChat(app, assistente, sessoes, config.chatLimitePorMinuto);
  rotasConta(app, repo, sessoes);
  rotasAtendente(app, repo, estado, sessoes);

  return app;
}
