import type { MeuDinheiro } from '@caqui/contracts';
import type { FastifyInstance } from 'fastify';
import { calcularMeuDinheiro } from '../atendimento/posicao.js';
import type { PositionRepository } from '../data/position-repository.js';
import type { Sessoes } from '../sessao/sessoes.js';
import { clienteDaSessao, exigirSessao } from './comum.js';

export function rotasConta(app: FastifyInstance, repo: PositionRepository, sessoes: Sessoes): void {
  app.get('/api/v1/meu-dinheiro', async (request): Promise<MeuDinheiro> => {
    const sessao = exigirSessao(sessoes, request);
    return calcularMeuDinheiro(repo, repo.getCliente(clienteDaSessao(sessao)), sessao.agora);
  });
}
