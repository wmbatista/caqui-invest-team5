import type { Eu, MeuDinheiro, RegraPublica, RespostaChat } from '@caqui/contracts';
import { vi } from 'vitest';

export const euMarta: Eu = {
  nome: 'Dona Marta',
  papel: 'cliente',
  agora: '2026-11-18T10:00:00-03:00',
  cliente: { id: 'C-0001', nome: 'Marta Siqueira', idade: 63, cpfMascarado: '***.***.894-**' },
  humano: { disponivel: true, prioridade: true, espera: 'cerca de 1 minuto', retorno: null },
};

export const dinheiro: MeuDinheiro = {
  hoje: '18/11/2026',
  saldoEmConta: 'R$ 1.250,00',
  total: 'R$ 62.271,15',
  avisoBruto: 'Os valores dos investimentos são brutos, antes do imposto.',
  posicoes: [{
    id: 'P-0001', produto: 'CDB 110', valorAplicado: 'R$ 40.000,00', saldoBruto: 'R$ 40.791,24', dataAplicacao: '16/09/2026',
    vencimento: '05/09/2028', liquidez: 'liquidez diária', oscila: false, texto: 'CDB 110: saldo bruto de R$ 40.791,24.',
  }],
  movimentos: [
    { id: 'OP-10005', tipo: 'resgate', produto: 'CDB 110', valor: 'R$ 40.000,00', pedidoEm: '17/11/2026 às 19h40', status: 'em_processamento', caiEm: '18/11/2026', dataCalculada: false, atrasada: false, emAndamento: true, observacao: null },
    { id: 'OP-10006', tipo: 'aplicacao', produto: 'LCI', valor: 'R$ 20.000,00', pedidoEm: '05/10/2026 às 11h02', status: 'liquidada', caiEm: '05/10/2026', dataCalculada: true, atrasada: false, emAndamento: false, observacao: null },
  ],
};

export const regras: RegraPublica[] = [{ code: 'CQ-01', titulo: 'Liquidação', camada: 'LEI', texto: 'Regra de prazo.' }];

export function resposta(parcial: Partial<RespostaChat> = {}): RespostaChat {
  return {
    conversaId: '11111111-1111-4111-8111-111111111111',
    protocolo: 'CQ-20261118-0001',
    resposta: 'Resposta da Caqui.',
    acao: 'responder',
    fontes: [],
    regras: [],
    humano: euMarta.humano!,
    sessaoBloqueada: false,
    passo: 1,
    geradoPor: 'template',
    ...parcial,
  };
}

/** Responde pela combinação "MÉTODO /caminho"; o que não estiver na tabela vira 500. */
export function simularApi(tabela: Record<string, unknown | (() => unknown)>) {
  const fetchFalso = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const caminho = new URL(String(url)).pathname.replace('/api/v1', '');
    const chave = `${init?.method ?? 'GET'} ${caminho}`;
    if (!(chave in tabela)) return new Response(JSON.stringify({ code: 'INVALID_REQUEST', message: chave }), { status: 500 });
    const valor = tabela[chave];
    const corpo = typeof valor === 'function' ? (valor as () => unknown)() : valor;
    return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status: corpo === undefined ? 204 : 200 });
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

export const apiCliente = {
  'GET /eu': euMarta,
  'GET /regras': regras,
  'POST /conversas': { id: '11111111-1111-4111-8111-111111111111', protocolo: 'CQ-20261118-0001' },
  'GET /meu-dinheiro': dinheiro,
};
