import type { ErroCode, Papel } from '@caqui/contracts';
import type { FastifyRequest } from 'fastify';
import type { Sessao, Sessoes } from '../sessao/sessoes.js';

export class ErroHttp extends Error {
  constructor(readonly status: number, readonly code: ErroCode, message: string) {
    super(message);
  }
}

export function exigirSessao(sessoes: Sessoes, request: FastifyRequest): Sessao {
  const [esquema, token] = (request.headers.authorization ?? '').split(' ');
  const sessao = esquema === 'Bearer' && token ? sessoes.obter(token) : undefined;
  if (!sessao) throw new ErroHttp(401, 'SESSAO_INVALIDA', 'Sessão inválida ou expirada: entre de novo.');
  return sessao;
}

export function exigirPapel(sessao: Sessao, papel: Papel): void {
  if (sessao.papel !== papel) throw new ErroHttp(403, 'PAPEL_NEGADO', 'Este acesso não está disponível para o seu papel.');
}

/** O cliente vem sempre do token, nunca do corpo ou do texto. */
export function clienteDaSessao(sessao: Sessao): string {
  exigirPapel(sessao, 'cliente');
  return sessao.clienteId as string;
}

/** Limite por IP em memória: um processo só não precisa de nada distribuído. */
export function criarLimitador(limitePorMinuto: number, relogio: () => number = Date.now) {
  const janelas = new Map<string, { inicio: number; contagem: number }>();
  return (chave: string): void => {
    const agora = relogio();
    if (janelas.size > 10_000) janelas.clear();
    const janela = janelas.get(chave);
    if (!janela || agora - janela.inicio >= 60_000) {
      janelas.set(chave, { inicio: agora, contagem: 1 });
      return;
    }
    janela.contagem += 1;
    if (janela.contagem > limitePorMinuto) throw new ErroHttp(429, 'LIMITE_EXCEDIDO', 'Muitas mensagens em pouco tempo. Espere um minuto.');
  };
}
