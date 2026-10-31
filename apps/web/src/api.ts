import type { Erro } from '@caqui/contracts';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const CHAVE_TOKEN = 'caqui_token';

export class ErroApi extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

let aoPerderSessao: () => void = () => {};

export function definirAoPerderSessao(funcao: () => void): void {
  aoPerderSessao = funcao;
}

export const token = {
  ler: () => sessionStorage.getItem(CHAVE_TOKEN),
  gravar: (valor: string) => sessionStorage.setItem(CHAVE_TOKEN, valor),
  limpar: () => sessionStorage.removeItem(CHAVE_TOKEN),
};

/** Sem corpo, não envia content-type: o Fastify rejeita JSON vazio. */
export async function chamar<T>(caminho: string, opcoes: { method?: string; corpo?: unknown } = {}): Promise<T> {
  const atual = token.ler();
  const resposta = await fetch(`${BASE}/api/v1${caminho}`, {
    method: opcoes.method ?? 'GET',
    headers: {
      ...(opcoes.corpo === undefined ? {} : { 'content-type': 'application/json' }),
      ...(atual ? { authorization: `Bearer ${atual}` } : {}),
    },
    ...(opcoes.corpo === undefined ? {} : { body: JSON.stringify(opcoes.corpo) }),
  });
  if (resposta.status === 401) {
    token.limpar();
    aoPerderSessao();
  }
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null) as Erro | null;
    throw new ErroApi(resposta.status, erro?.message ?? 'Não foi possível concluir o pedido.');
  }
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}
