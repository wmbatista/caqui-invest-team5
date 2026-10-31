import { criarSessaoSchema, relogioSchema, type Eu } from '@caqui/contracts';
import type { FastifyInstance } from 'fastify';
import { isoBrt } from '../atendimento/formato.js';
import { saidaHumano } from '../atendimento/humano.js';
import type { PositionRepository } from '../data/position-repository.js';
import { PERSONAS, personaPorId } from '../sessao/personas.js';
import type { Sessoes } from '../sessao/sessoes.js';
import { ErroHttp, exigirSessao } from './comum.js';

export function rotasSessao(app: FastifyInstance, repo: PositionRepository, sessoes: Sessoes): void {
  app.get('/api/v1/personas', async () => PERSONAS);

  app.post('/api/v1/sessoes', async (request, reply) => {
    const { personaId } = criarSessaoSchema.parse(request.body);
    const persona = personaPorId(personaId);
    if (!persona) throw new ErroHttp(400, 'INVALID_REQUEST', 'Persona desconhecida.');
    const { token, nome, papel } = sessoes.criar(persona);
    return reply.code(201).send({ token, nome, papel });
  });

  app.delete('/api/v1/sessoes/atual', async (request, reply) => {
    sessoes.encerrar(exigirSessao(sessoes, request).token);
    return reply.code(204).send();
  });

  app.get('/api/v1/eu', async (request): Promise<Eu> => {
    const sessao = exigirSessao(sessoes, request);
    const cliente = sessao.clienteId ? repo.getCliente(sessao.clienteId) : null;
    return {
      nome: sessao.nome,
      papel: sessao.papel,
      agora: isoBrt(sessao.agora),
      cliente: cliente && { id: cliente.id, nome: cliente.nome, idade: cliente.idade, cpfMascarado: cliente.cpf_mascarado },
      humano: cliente && saidaHumano(cliente, sessao.agora),
    };
  });

  app.put('/api/v1/relogio', async (request) => {
    const sessao = exigirSessao(sessoes, request);
    const { momento } = relogioSchema.parse(request.body);
    sessao.agora = Date.parse(momento);
    return { agora: isoBrt(sessao.agora) };
  });
}
