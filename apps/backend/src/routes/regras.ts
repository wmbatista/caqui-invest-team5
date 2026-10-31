import type { RegraPublica } from '@caqui/contracts';
import type { FastifyInstance } from 'fastify';
import { vigentes } from '../regras/regras-caqui.js';
import type { Sessoes } from '../sessao/sessoes.js';
import { exigirSessao } from './comum.js';

export function rotasRegras(app: FastifyInstance, sessoes: Sessoes): void {
  app.get('/api/v1/regras', async (request): Promise<RegraPublica[]> => {
    exigirSessao(sessoes, request);
    return vigentes().map(({ code, titulo, camada, texto }) => ({ code, titulo, camada, texto }));
  });
}
