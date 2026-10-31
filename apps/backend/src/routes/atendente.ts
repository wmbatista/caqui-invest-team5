import type { Caso } from '@caqui/contracts';
import type { FastifyInstance } from 'fastify';
import { paraBrt } from '../atendimento/formato.js';
import type { PositionRepository } from '../data/position-repository.js';
import type { EstadoMemoria } from '../estado/memoria.js';
import type { Sessoes } from '../sessao/sessoes.js';
import { exigirPapel, exigirSessao } from './comum.js';

function momentoCurto(instante: number): string {
  const { data, hora, minuto } = paraBrt(instante);
  const [, mes, dia] = data.split('-');
  return `${dia}/${mes} ${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

export function rotasAtendente(app: FastifyInstance, repo: PositionRepository, estado: EstadoMemoria, sessoes: Sessoes): void {
  app.get('/api/v1/atendente/fila', async (request): Promise<Caso[]> => {
    exigirPapel(exigirSessao(sessoes, request), 'atendente');
    return estado.fila().map((caso) => {
      const cliente = repo.getCliente(caso.clienteId);
      return {
        id: caso.id,
        protocolo: caso.protocolo,
        destino: caso.destino,
        prioridade: caso.prioridade,
        motivo: caso.motivo,
        resumo: caso.resumo,
        status: caso.status,
        momento: momentoCurto(caso.momento),
        nome: cliente.nome,
        idade: cliente.idade,
        historico: estado.historico(caso.conversaId).map(({ autor, texto, acao, regras }) => ({ autor, texto, ...(acao ? { acao } : {}), regras })),
      };
    });
  });
}
