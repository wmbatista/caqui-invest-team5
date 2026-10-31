import { enviarMensagemSchema } from '@caqui/contracts';
import type { FastifyInstance } from 'fastify';
import { ConversaNaoEncontrada, type Assistente } from '../atendimento/assistente.js';
import type { Sessoes } from '../sessao/sessoes.js';
import { clienteDaSessao, criarLimitador, ErroHttp, exigirSessao } from './comum.js';

export function rotasChat(app: FastifyInstance, assistente: Assistente, sessoes: Sessoes, limitePorMinuto: number): void {
  const limitar = criarLimitador(limitePorMinuto);

  app.post('/api/v1/conversas', async (request, reply) => {
    const sessao = exigirSessao(sessoes, request);
    const { id, protocolo } = assistente.novaConversa(clienteDaSessao(sessao), sessao.agora);
    return reply.code(201).send({ id, protocolo });
  });

  app.post('/api/v1/chat', async (request) => {
    const sessao = exigirSessao(sessoes, request);
    const clienteId = clienteDaSessao(sessao);
    limitar(request.ip);
    const { conversaId, mensagem } = enviarMensagemSchema.parse(request.body);
    try {
      const resposta = await assistente.responder({ clienteId, conversaId, mensagem, agora: sessao.agora });
      if (resposta.sessaoBloqueada) sessoes.encerrarDoCliente(clienteId);
      const { regras: _regrasInternas, ...publica } = resposta;
      return publica;
    } catch (erro) {
      if (erro instanceof ConversaNaoEncontrada) throw new ErroHttp(404, 'CONVERSA_NAO_ENCONTRADA', 'Conversa não encontrada.');
      throw erro;
    }
  });
}
