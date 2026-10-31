import { dataBr, diaSemana, somarDias, type DataISO } from '../atendimento/formato.js';

export const DIAS_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

export class ForaDoCalendario extends Error {}

/** Dias úteis de calendario.json. Data fora do intervalo não tem prazo: lança, e o atendimento diz que não sabe. */
export class Calendario {
  private readonly uteis = new Set<DataISO>();
  private readonly feriados = new Map<DataISO, string>();
  private readonly inicio: DataISO;
  private readonly fim: DataISO;

  constructor(dias: { data: DataISO; dia_util: boolean; feriado?: string | null }[]) {
    for (const { data, dia_util: util, feriado } of dias) {
      if (util) this.uteis.add(data);
      if (feriado) this.feriados.set(data, feriado);
    }
    const datas = dias.map(({ data }) => data).sort();
    this.inicio = datas[0];
    this.fim = datas[datas.length - 1];
  }

  ehUtil(data: DataISO): boolean {
    if (data < this.inicio || data > this.fim) {
      throw new ForaDoCalendario(`${dataBr(data)} está fora do calendário (${dataBr(this.inicio)} a ${dataBr(this.fim)})`);
    }
    return this.uteis.has(data);
  }

  ehFeriado(data: DataISO): boolean {
    return this.feriados.has(data);
  }

  proximoUtil(data: DataISO): DataISO {
    let atual = somarDias(data, 1);
    while (!this.ehUtil(atual)) atual = somarDias(atual, 1);
    return atual;
  }

  somarUteis(data: DataISO, quantidade: number): DataISO {
    let atual = data;
    for (let i = 0; i < quantidade; i += 1) atual = this.proximoUtil(atual);
    return atual;
  }

  porQueNaoUtil(data: DataISO): string {
    const feriado = this.feriados.get(data);
    return feriado ? `${dataBr(data)} é feriado (${feriado})` : `${dataBr(data)} é ${DIAS_SEMANA[diaSemana(data)]}`;
  }
}
