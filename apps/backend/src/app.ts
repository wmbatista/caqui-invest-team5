import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import { chatRequestSchema } from './domain/chat.js';
import { ProviderError, type ChatProvider } from './providers/openrouter.js';
import { ChatService } from './services/chat.js';

export async function buildApp(config: Config, provider: ChatProvider) {
  const app = Fastify({ logger: { redact: ['req.headers.authorization', 'body.message', 'body.history'] } });
  await app.register(cors, { origin: config.corsOrigins });
  const service = new ChatService(provider);

  app.get('/health', async () => ({ status: 'ok' }));
  app.post('/api/v1/chat', async (request, reply) => {
    try {
      return await service.reply(chatRequestSchema.parse(request.body));
    } catch (error) {
      if (error instanceof ZodError) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'Requisição inválida', details: error.flatten() });
      if (error instanceof ProviderError) return reply.code(error.timedOut ? 504 : 502).send({ code: error.timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_ERROR', message: 'A IA está indisponível no momento. Tente novamente ou fale com um atendente.' });
      throw error;
    }
  });
  return app;
}
