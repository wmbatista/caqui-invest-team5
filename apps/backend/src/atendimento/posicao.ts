import type { MeuDinheiro, Movimento, PosicaoItem } from '@caqui/contracts';
import type { ClienteRecord, PositionRepository, PosicaoRecord, ProdutoRecord } from '../data/position-repository.js';
import { redigir } from '../redacao/redator.js';
import { param } from '../regras/regras-caqui.js';
import { brl, dataBr, horaBr, paraBrt, somarCentavos, somarDias, type DataISO } from './formato.js';
import { classificarIntencao } from './intencao.js';
import { calendarioDe, dataEfetiva, rotuloOperacao, SOBRE_POSICAO } from './operacoes.js';
import { fonteConta, fonteKb, type Contexto, type Fluxo, type RespostaFluxo } from './tipos.js';

const AVISO_BRUTO = 'Os valores dos investimentos são brutos, antes do imposto.';
const ABERTOS = new Set(['pendente', 'em_processamento']);
const LIQUIDEZ: Record<string, string> = {
  diaria: 'liquidez diária',
  no_vencimento: 'resgate só no vencimento',
  diaria_apos_carencia: 'liquidez diária depois da carência',
};

function oscila(produto: ProdutoRecord): boolean {
  return produto.tipo === 'ACOES' || produto.codigo === 'FUNDO-MM-01';
}

function fimDaCarencia(posicao: PosicaoRecord, produto: ProdutoRecord, hoje: DataISO): DataISO | null {
  if (!produto.carencia_dias) return null;
  const fim = somarDias(posicao.data_aplicacao, produto.carencia_dias);
  return fim > hoje ? fim : null;
}

function observar(posicao: PosicaoRecord, produto: ProdutoRecord, hoje: DataISO): string | null {
  const carencia = fimDaCarencia(posicao, produto, hoje);
  const detalhes = [
    posicao.vencimento && posicao.vencimento < hoje ? `Venceu em ${dataBr(posicao.vencimento)}.` : null,
    carencia ? `Em carência até ${dataBr(carencia)}: antes disso o resgate não é possível.` : null,
    produto.liquidez === 'no_vencimento' && posicao.vencimento && posicao.vencimento >= hoje ? `Resgate só no vencimento, em ${dataBr(posicao.vencimento)}.` : null,
    oscila(produto) ? 'Esse valor pode oscilar.' : null,
  ];
  return detalhes.filter(Boolean).join(' ') || null;
}

/** Tudo o que a cliente tem, com status e datas calculadas. Alimenta a tela e a resposta do chat. */
export function calcularMeuDinheiro(repo: PositionRepository, cliente: ClienteRecord, agora: number): MeuDinheiro {
  const hoje = paraBrt(agora).data;
  const cal = calendarioDe({ repo });
  const registros = repo.getPosicoes(cliente.id);
  const posicoes: PosicaoItem[] = registros.map((posicao) => {
    const produto = repo.getProduto(posicao.produto);
    const observacao = observar(posicao, produto, hoje);
    return {
      id: posicao.id_posicao,
      produto: produto.nome,
      valorAplicado: brl(posicao.valor_aplicado_brl),
      saldoBruto: brl(posicao.saldo_bruto_brl),
      dataAplicacao: dataBr(posicao.data_aplicacao),
      vencimento: posicao.vencimento ? dataBr(posicao.vencimento) : null,
      liquidez: LIQUIDEZ[produto.liquidez] ?? produto.liquidez,
      oscila: oscila(produto),
      observacao,
      texto: [`${produto.nome}: aplicado ${brl(posicao.valor_aplicado_brl)} em ${dataBr(posicao.data_aplicacao)}, saldo bruto de ${brl(posicao.saldo_bruto_brl)}.`, ...(observacao ? [observacao] : [])].join(' '),
    };
  });
  const movimentos: Movimento[] = repo.getOperacoes(cliente.id, agora).map((op) => {
    const { caiEm, calculada } = dataEfetiva(op, cal);
    const aberto = ABERTOS.has(op.status);
    return {
      id: op.id_operacao,
      tipo: op.tipo,
      produto: op.produto ? repo.getProduto(op.produto).nome : 'Pix',
      valor: brl(op.valor_brl),
      pedidoEm: `${dataBr(paraBrt(op.pedido_instante).data)} às ${horaBr(op.pedido_instante)}`,
      status: op.status,
      caiEm: caiEm ? dataBr(caiEm) : null,
      dataCalculada: calculada,
      atrasada: aberto && caiEm !== null && caiEm < hoje,
      emAndamento: aberto,
      observacao: op.observacao,
    };
  });
  return {
    hoje: dataBr(hoje),
    saldoEmConta: brl(cliente.saldo_em_conta_brl),
    total: brl(somarCentavos([...registros.map(({ saldo_bruto_brl: saldo }) => saldo), cliente.saldo_em_conta_brl])),
    avisoBruto: AVISO_BRUTO,
    posicoes,
    movimentos,
  };
}

export const posicao: Fluxo = async (ctx) => {
  if (ctx.sinais.has('nao_entendeu') || !SOBRE_POSICAO.test(ctx.normalizado)) return null;
  return responderPosicao(ctx);
};

/**
 * Último recurso, depois de todos os padrões: só pergunta ao LLM se a mensagem é sobre posição quando
 * nenhum fluxo a reconheceu. Sem LLM, ou na dúvida, cai no "não entendi" como antes.
 */
export const posicaoPorIntencao: Fluxo = async (ctx) => {
  if (ctx.sinais.has('nao_entendeu') || ctx.conversa.chamadasLlm >= param('CQ-08', 'max_passos')) return null;
  ctx.conversa.chamadasLlm += 1;
  if (await classificarIntencao(ctx.provider, ctx.texto) !== 'posicao') return null;
  return responderPosicao(ctx);
};

async function responderPosicao(ctx: Contexto): Promise<RespostaFluxo> {
  const dados = calcularMeuDinheiro(ctx.repo, ctx.cliente, ctx.agora);
  const andamento = dados.movimentos.filter(({ emAndamento }) => emAndamento);
  const linhas = [
    `Seu dinheiro está na Caqui. Hoje, ${dados.hoje}, você tem ${dados.total} no total:`,
    `• Saldo em conta: ${dados.saldoEmConta}`,
    ...dados.posicoes.map(({ texto }) => `• ${texto}`),
    ...(andamento.length ? ['Em andamento:'] : []),
    ...andamento.map((movimento) => `• ${rotuloOperacao(movimento.tipo, movimento.valor, movimento.produto)}: ${movimento.atrasada ? `deveria ter caído em ${movimento.caiEm}` : `cai em ${movimento.caiEm}`}.`),
    dados.avisoBruto,
  ];
  const registros = ctx.repo.getPosicoes(ctx.cliente.id).map((item) => ctx.repo.getProduto(item.produto));
  const artigos = [
    'KB-009',
    ...(andamento.length ? ['KB-008'] : []),
    ...(registros.some(({ liquidez }) => liquidez === 'no_vencimento') ? ['KB-005'] : []),
    ...(registros.some(({ carencia_dias: carencia }) => carencia) ? ['KB-011'] : []),
    ...(registros.some(({ tipo }) => tipo === 'ACOES') ? ['KB-016'] : []),
  ];
  const { texto, geradoPor } = await redigir({ template: linhas.join('\n'), mensagem: ctx.texto, conversa: ctx.conversa, provider: ctx.provider });
  return {
    texto,
    geradoPor,
    regras: ['CQ-C3', 'CQ-01'],
    fontes: [
      ...fonteConta(
        { id: ctx.cliente.id, titulo: 'Seu cadastro' },
        ...dados.posicoes.map(({ id, produto }) => ({ id, titulo: produto })),
        ...andamento.map(({ id, tipo, valor, produto }) => ({ id, titulo: rotuloOperacao(tipo, valor, produto) })),
      ),
      ...fonteKb(ctx, ...artigos),
    ],
  };
}
