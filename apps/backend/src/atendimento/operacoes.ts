import type { OperacaoRecord } from '../data/position-repository.js';
import { Calendario, ForaDoCalendario } from '../prazos/calendario.js';
import { liquidacao, type Prazo } from '../prazos/liquidacao.js';
import { redigir } from '../redacao/redator.js';
import { param } from '../regras/regras-caqui.js';
import { brl, dataBr, DataInvalida, instanteBrt, paraBrt, somarCentavos, type DataISO } from './formato.js';
import { paraHumano } from './humano.js';
import { lerMomento, lerOperacao, lerProduto } from './momento.js';
import { fonteConta, fonteKb, type Contexto, type Fluxo, type RespostaFluxo } from './tipos.js';

const SOBRE_OPERACAO = /resgat|\bcaiu\b|\bcai\b|cair|quando (?:recebo|vou receber|entra)|cade|sumiu|liquid(?:ou|ad|acao)|aplique|aplicac|transfer|\bpix\b|prazo|\bop-\d+\b/;
export const SOBRE_POSICAO = /meu dinheiro|meus investimentos|\bsaldo\b|quanto (?:eu )?tenho|aplicado|esta la|ta la|onde (?:esta|ta|anda)|(?:posso|consigo|da para|da pra) (?:tirar|resgatar|sacar)/;

const ABERTOS = new Set(['pendente', 'em_processamento']);

export function calendarioDe(ctx: Pick<Contexto, 'repo'>): Calendario {
  return new Calendario(ctx.repo.getCalendario());
}

export function dataEfetiva(op: OperacaoRecord, cal: Calendario): { caiEm: DataISO | null; calculada: boolean } {
  if (op.status === 'recusada') return { caiEm: null, calculada: false };
  if (op.liquidacao_prevista) return { caiEm: op.liquidacao_prevista, calculada: false };
  return { caiEm: liquidacao(op.produto, op.tipo, op.pedido_instante, cal).pagamento, calculada: true };
}

function nomeProduto(ctx: Contexto, codigo: string | null): string {
  return codigo ? ctx.repo.getProduto(codigo).nome : 'Pix';
}

export function nomeTipo(tipo: OperacaoRecord['tipo']): string {
  if (tipo === 'resgate') return 'resgate';
  if (tipo === 'aplicacao') return 'aplicação';
  return tipo === 'transferencia_entrada' ? 'transferência recebida' : 'transferência';
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Resgate de R$ 40.000,00 (CDB...)": como a operação aparece para o cliente, sem código. */
export function rotuloOperacao(tipo: OperacaoRecord['tipo'], valor: string, produto: string): string {
  return `${capitalizar(nomeTipo(tipo))} de ${valor} (${produto})`;
}

function fonteOperacao(ctx: Contexto, op: OperacaoRecord) {
  return { id: op.id_operacao, titulo: rotuloOperacao(op.tipo, brl(op.valor_brl), nomeProduto(ctx, op.produto)) };
}

function destinoDe(tipo: OperacaoRecord['tipo']): string {
  if (tipo === 'aplicacao') return 'no investimento';
  return tipo === 'transferencia_saida_pix' ? 'na conta de destino' : 'na sua conta Caqui';
}

/** CQ-D1: resgate de 50% ou mais do investido, ou de R$ 20.000 ou mais. */
function atipico(ctx: Contexto, valor: number): boolean {
  const investido = somarCentavos(ctx.repo.getPosicoes(ctx.cliente.id).map(({ saldo_bruto_brl: saldo }) => saldo));
  return valor >= param('CQ-D1', 'valor_minimo') || valor >= param('CQ-D1', 'pct_investido') * investido;
}

async function explicar(ctx: Contexto, op: OperacaoRecord): Promise<RespostaFluxo> {
  const nome = nomeProduto(ctx, op.produto);
  const tipo = nomeTipo(op.tipo);
  const regras = ['CQ-01', 'CQ-C3'];
  if (op.status === 'recusada') {
    return {
      texto: `Seu pedido de ${tipo} de ${brl(op.valor_brl)} no ${nome} foi recusado: ${op.observacao}. O dinheiro continua aplicado, rendendo normalmente.`,
      regras,
      fontes: [...fonteConta(fonteOperacao(ctx, op)), ...fonteKb(ctx, 'KB-005', 'KB-011', 'KB-008')],
    };
  }

  const cal = calendarioDe(ctx);
  const prazo = liquidacao(op.produto, op.tipo, op.pedido_instante, cal);
  const caiEm = dataEfetiva(op, cal).caiEm as DataISO;
  const hoje = paraBrt(ctx.agora).data;
  const inicio = `Seu ${tipo} de ${brl(op.valor_brl)} do ${nome}`;
  const conta = `Como chegamos a essa data: ${prazo.passos.join(' ')}`;
  const fontes = [...fonteConta(fonteOperacao(ctx, op)), ...fonteKb(ctx, ...prazo.fontes, 'KB-008')];
  const destino = destinoDe(op.tipo);

  if (op.status === 'liquidada') {
    return comRedacao(ctx, `${inicio} já foi concluído em ${dataBr(caiEm)}: o dinheiro está ${destino}.\n${conta}`, regras, fontes);
  }
  if (caiEm < hoje) {
    const { texto, acao } = paraHumano(ctx, `liquidação atrasada: ${rotuloOperacao(op.tipo, brl(op.valor_brl), nome)}`);
    return {
      texto: `${inicio} deveria ter sido concluído em ${dataBr(caiEm)} e ainda está ${op.status.replace('_', ' ')}. Houve um atraso na liquidação. O pedido continua registrado.\n${conta}\n${texto}`,
      acao,
      regras: [...regras, 'CQ-C1', 'CQ-C5'],
      fontes,
    };
  }
  const situacao = caiEm === hoje
    ? `está em processamento e cai hoje, ${dataBr(caiEm)}, ${destino}.`
    : `está registrado e cai em ${dataBr(caiEm)}, ${destino}.`;
  const linhas = [`${inicio} ${situacao}`, conta];
  const regrasFinais = [...regras];
  if (op.tipo === 'resgate' && ctx.cliente.idade >= param('CQ-06', 'idade_prioridade') && atipico(ctx, op.valor_brl)) {
    linhas.push('Esse resgate é de valor alto. Se alguém está te pedindo para tirar ou transferir esse dinheiro, fale com uma pessoa da Caqui antes: você tem prioridade e não precisa repetir nada.');
    regrasFinais.push('CQ-06', 'CQ-D1');
  }
  return comRedacao(ctx, linhas.join('\n'), regrasFinais, fontes);
}

async function comRedacao(ctx: Contexto, template: string, regras: string[], fontes: RespostaFluxo['fontes']): Promise<RespostaFluxo> {
  const { texto, geradoPor } = await redigir({ template, mensagem: ctx.texto, conversa: ctx.conversa, provider: ctx.provider });
  return { texto, regras, fontes, geradoPor };
}

function descrever(ctx: Contexto, op: OperacaoRecord): string {
  const { data } = paraBrt(op.pedido_instante);
  return `${rotuloOperacao(op.tipo, brl(op.valor_brl), nomeProduto(ctx, op.produto))}, pedido em ${dataBr(data)}`;
}

function naoEncontrada(ctx: Contexto, recentes: OperacaoRecord[]): RespostaFluxo {
  const lista = recentes.slice(0, 3);
  if (lista.length === 0) {
    return { texto: 'Não encontrei essa operação na sua conta, e você ainda não tem aplicações, resgates ou transferências registrados.', regras: ['CQ-09'], fontes: [] };
  }
  return {
    texto: `Não encontrei essa operação na sua conta, e não vou supor. Suas operações mais recentes são:\n${lista.map((op) => `• ${descrever(ctx, op)}.`).join('\n')}\nSe a sua não está aqui, uma pessoa verifica: toque em Falar com uma pessoa.`,
    regras: ['CQ-09', 'CQ-C3'],
    fontes: fonteConta(...lista.map((op) => fonteOperacao(ctx, op))),
  };
}

function hipotetica(ctx: Contexto, codigo: string, generico: boolean, dia: DataISO, hora: { hora: number; minuto: number } | null): RespostaFluxo {
  const cal = calendarioDe(ctx);
  const tipo = /aplic/.test(ctx.normalizado) ? 'aplicacao' : 'resgate';
  const calcular = (h: number, m: number): Prazo => liquidacao(codigo, tipo, instanteBrt(dia, h, m), cal);
  if (!hora && cal.ehUtil(dia)) {
    const antes = calcular(12, 0);
    const depois = calcular(17, 0);
    return {
      texto: `Depende da hora do pedido. Até as 16h: cai em ${dataBr(antes.pagamento)}. Depois das 16h: cai em ${dataBr(depois.pagamento)}.`,
      regras: ['CQ-01', 'CQ-C3'],
      fontes: fonteKb(ctx, ...antes.fontes),
    };
  }
  const prazo = calcular(hora?.hora ?? 12, hora?.minuto ?? 0);
  const nome = generico ? 'CDB de liquidez diária' : ctx.repo.getProduto(codigo).nome;
  return {
    texto: `O dinheiro do ${nome} cai em ${dataBr(prazo.pagamento)}.\nComo chegamos a essa data: ${prazo.passos.join(' ')}`,
    regras: ['CQ-01', 'CQ-C3'],
    fontes: fonteKb(ctx, ...prazo.fontes),
  };
}

function filtrarPorAssunto(ops: OperacaoRecord[], texto: string): OperacaoRecord[] {
  if (/resgat/.test(texto)) return ops.filter(({ tipo }) => tipo === 'resgate');
  if (/aplic/.test(texto)) return ops.filter(({ tipo }) => tipo === 'aplicacao');
  if (/transfer|\bpix\b/.test(texto)) return ops.filter(({ tipo }) => tipo.startsWith('transferencia'));
  return ops;
}

function escolher(ctx: Contexto, candidatas: OperacaoRecord[]): RespostaFluxo {
  return {
    texto: 'Encontrei mais de uma operação que combina com o que você disse. Qual delas você quer ver?',
    regras: ['CQ-C3'],
    fontes: fonteConta(...candidatas.map((op) => fonteOperacao(ctx, op))),
    opcoes: candidatas.map((op) => ({ id: op.id_operacao, descricao: descrever(ctx, op) })),
  };
}

/** A opção escolhida chega como id; no histórico que o atendente lê, ela aparece pelo nome. */
export function trocarIdsPorNomes(texto: string, ctx: Pick<Contexto, 'repo' | 'cliente' | 'agora'>): string {
  if (!/\bop-\d+\b/i.test(texto)) return texto;
  const operacoesDoCliente = ctx.repo.getOperacoes(ctx.cliente.id, ctx.agora);
  return texto.replace(/\bop-\d+\b/gi, (id) => {
    const op = operacoesDoCliente.find(({ id_operacao: atual }) => atual === id.toUpperCase());
    return op ? rotuloOperacao(op.tipo, brl(op.valor_brl), op.produto ? ctx.repo.getProduto(op.produto).nome : 'Pix') : id;
  });
}

/** Fluxo de status e prazo. Devolve nulo quando a pergunta é sobre a posição e não há operação a explicar. */
export const operacoes: Fluxo = async (ctx) => {
  if (ctx.sinais.has('nao_entendeu') || !SOBRE_OPERACAO.test(ctx.normalizado)) return null;
  try {
    const todas = ctx.repo.getOperacoes(ctx.cliente.id, ctx.agora);
    const idCitado = lerOperacao(ctx.normalizado);
    if (idCitado) {
      const citada = todas.find(({ id_operacao: id }) => id === idCitado);
      return citada ? await explicar(ctx, citada) : naoEncontrada(ctx, todas);
    }

    const { codigo, generico } = lerProduto(ctx.normalizado);
    const { dia, hora } = lerMomento(ctx.normalizado, ctx.agora);
    const daFamilia = (op: OperacaoRecord) => !codigo || (generico ? (op.produto ?? '').startsWith('CDB-LD') : op.produto === codigo);
    const doAssunto = filtrarPorAssunto(todas, ctx.normalizado).filter(daFamilia);

    if (dia) {
      const doDia = doAssunto.filter(({ pedido_instante: pedido }) => paraBrt(pedido).data === dia);
      if (doDia.length === 1) return await explicar(ctx, doDia[0]);
      if (doDia.length > 1) return escolher(ctx, doDia);
      if (codigo) return hipotetica(ctx, codigo, generico, dia, hora);
      return naoEncontrada(ctx, todas);
    }

    const abertas = doAssunto.filter(({ status }) => ABERTOS.has(status));
    const recusadas = doAssunto.filter(({ status }) => status === 'recusada');
    const prioritarias = abertas.length ? abertas : recusadas;
    if (prioritarias.length === 1) return await explicar(ctx, prioritarias[0]);
    if (prioritarias.length > 1) return escolher(ctx, prioritarias);
    if (codigo && doAssunto.length) return await explicar(ctx, doAssunto[0]);
    if (doAssunto.length && !/resgat|aplic/.test(ctx.normalizado) && /transfer|\bpix\b/.test(ctx.normalizado)) return await explicar(ctx, doAssunto[0]);
    return SOBRE_POSICAO.test(ctx.normalizado) ? null : naoEncontrada(ctx, todas);
  } catch (erro) {
    // CQ-09: data que não existe ou fora do calendário não vira prazo. Outros erros não são engolidos.
    if (!(erro instanceof ForaDoCalendario || erro instanceof DataInvalida)) throw erro;
    const { texto, acao } = paraHumano(ctx, 'prazo fora do calendário conhecido', ctx.sinais);
    return {
      texto: `Essa data está fora do que eu consigo conferir, então não vou arriscar um prazo. ${texto}`,
      acao,
      regras: ['CQ-09', 'CQ-C1'],
      fontes: fonteKb(ctx, 'KB-006'),
    };
  }
};
