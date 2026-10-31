import { dataBr, diaSemana, diasEntre, horaBr, paraBrt, somarDias, type DataISO } from '../atendimento/formato.js';
import { param } from '../regras/regras-caqui.js';
import { Calendario, DIAS_SEMANA } from './calendario.js';

/** A data em que o dinheiro cai sai daqui, nunca do modelo de linguagem (CQ-01). */
export interface Prazo {
  diaBase: DataISO;
  pagamento: DataISO;
  cotizacao?: DataISO;
  /** A conta, em linguagem simples. */
  passos: string[];
  fontes: string[];
}

function segundosDoCorte(): number {
  const [hora, minuto] = param<string>('CQ-01', 'corte').split(':').map(Number);
  return hora * 3600 + minuto * 60;
}

function diaBase(pedido: number, cal: Calendario): { base: DataISO; passos: string[] } {
  const { data, hora, minuto, segundo } = paraBrt(pedido);
  const util = cal.ehUtil(data);
  // Em dia não útil a hora não muda nada: não aparece, para não exibir uma hora que o cliente não disse.
  const quando = `Pedido em ${DIAS_SEMANA[diaSemana(data)]}, ${dataBr(data)}${util ? `, às ${horaBr(pedido)}` : ''}`;
  if (util && hora * 3600 + minuto * 60 + segundo <= segundosDoCorte()) {
    return { base: data, passos: [`${quando}: dia útil, até o corte das 16h, então conta no mesmo dia.`] };
  }
  const base = cal.proximoUtil(data);
  const motivo = util ? 'depois do corte das 16h' : cal.ehFeriado(data) ? cal.porQueNaoUtil(data) : 'não é dia útil';
  const passos = [`${quando}: ${motivo}, então conta a partir do próximo dia útil.`];
  const pulados: string[] = [];
  for (let i = 1; i < diasEntre(data, base); i += 1) {
    const dia = somarDias(data, i);
    if (cal.ehFeriado(dia)) pulados.push(cal.porQueNaoUtil(dia));
  }
  if (pulados.length) passos.push(`No caminho: ${pulados.join('; ')}.`);
  passos.push(`Dia-base: ${dataBr(base)}.`);
  return { base, passos };
}

export function liquidacao(produto: string | null, tipo: string, pedido: number, cal: Calendario): Prazo {
  if (tipo.startsWith('transferencia')) {
    const dia = paraBrt(pedido).data;
    return { diaBase: dia, pagamento: dia, passos: ['Transferência por Pix cai na hora, a qualquer hora.'], fontes: ['KB-018'] };
  }
  const { base, passos } = diaBase(pedido, cal);
  const codigo = produto ?? '';
  if (tipo === 'aplicacao' && codigo.startsWith('FUNDO')) {
    const cotizacao = cal.somarUteis(base, 1);
    return { diaBase: base, pagamento: cotizacao, cotizacao, passos: [...passos, `Aplicação em fundo entra na cotização, 1 dia útil depois: ${dataBr(cotizacao)}.`], fontes: ['KB-006'] };
  }
  if (/^(?:CDB|LCI|LCA)/.test(codigo)) {
    return { diaBase: base, pagamento: base, passos: [...passos, `Liquidação no próprio dia-base: ${dataBr(base)}.`], fontes: ['KB-006'] };
  }
  if (codigo === 'FUNDO-RF-01') {
    const cotizacao = cal.somarUteis(base, 1);
    const pagamento = cal.somarUteis(base, 2);
    return { diaBase: base, pagamento, cotizacao, passos: [...passos, `Cotização em D+1 útil: ${dataBr(cotizacao)}.`, `Pagamento em D+2 úteis: ${dataBr(pagamento)}.`], fontes: ['KB-006'] };
  }
  if (codigo === 'FUNDO-MM-01') {
    const corridos = somarDias(base, 30);
    const util = cal.ehUtil(corridos);
    const cotizacao = util ? corridos : cal.proximoUtil(corridos);
    const ajuste = util ? '' : ` (${cal.porQueNaoUtil(corridos)}, vai para o próximo dia útil)`;
    const pagamento = cal.somarUteis(cotizacao, 2);
    return { diaBase: base, pagamento, cotizacao, passos: [...passos, `Cotização 30 dias corridos depois${ajuste}: ${dataBr(cotizacao)}.`, `Pagamento 2 dias úteis após a cotização: ${dataBr(pagamento)}.`], fontes: ['KB-006'] };
  }
  if (codigo.startsWith('TESOURO')) {
    const pagamento = cal.somarUteis(base, 1);
    return { diaBase: base, pagamento, passos: [...passos, `Tesouro Selic liquida em D+1 útil: ${dataBr(pagamento)}.`], fontes: ['KB-006', 'KB-015'] };
  }
  if (codigo === 'ACOES') {
    const pagamento = cal.somarUteis(base, 2);
    return { diaBase: base, pagamento, passos: [...passos, `Ações liquidam em D+2 úteis: ${dataBr(pagamento)}.`], fontes: ['KB-006', 'KB-016'] };
  }
  throw new Error(`Produto sem regra de prazo: ${produto}`);
}
