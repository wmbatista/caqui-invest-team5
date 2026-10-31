/** Datas de calendário como AAAA-MM-DD, aritmética em UTC e fuso fixo em -03:00, sem depender do fuso da máquina. */
export type DataISO = string;

const DIA_MS = 86_400_000;
const OFFSET_MS = 3 * 3_600_000;

export class DataInvalida extends Error {}

function dois(valor: number): string {
  return String(valor).padStart(2, '0');
}

export function criarData(ano: number, mes: number, dia: number): DataISO {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new DataInvalida(`${dois(dia)}/${dois(mes)}/${ano} não existe`);
  }
  return `${ano}-${dois(mes)}-${dois(dia)}`;
}

function utcDe(data: DataISO): number {
  return Date.parse(`${data}T00:00:00Z`);
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return new Date(utcDe(data) + dias * DIA_MS).toISOString().slice(0, 10);
}

export function diasEntre(inicio: DataISO, fim: DataISO): number {
  return Math.round((utcDe(fim) - utcDe(inicio)) / DIA_MS);
}

/** Segunda = 0, como o motor de prazos conta a semana. */
export function diaSemana(data: DataISO): number {
  return moduloPositivo(new Date(utcDe(data)).getUTCDay() - 1, 7);
}

export function moduloPositivo(valor: number, base: number): number {
  return ((valor % base) + base) % base;
}

export function paraBrt(instante: number) {
  const local = new Date(instante - OFFSET_MS);
  return {
    data: local.toISOString().slice(0, 10) as DataISO,
    hora: local.getUTCHours(),
    minuto: local.getUTCMinutes(),
    segundo: local.getUTCSeconds(),
  };
}

export function instanteBrt(data: DataISO, hora: number, minuto: number): number {
  return Date.parse(`${data}T${dois(hora)}:${dois(minuto)}:00-03:00`);
}

export function isoBrt(instante: number): string {
  return `${new Date(instante - OFFSET_MS).toISOString().slice(0, 19)}-03:00`;
}

export function dataBr(data: DataISO): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function horaBr(instante: number): string {
  const { hora, minuto } = paraBrt(instante);
  return `${dois(hora)}h${dois(minuto)}`;
}

/** Sem Intl: ele separa "R$" com espaço não separável, o que reprova buscas de texto e confunde o verificador. */
export function brl(valor: number): string {
  const centavos = Math.round(Math.abs(valor) * 100);
  const inteiro = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${valor < 0 ? '-' : ''}R$ ${inteiro},${dois(centavos % 100)}`;
}

export function somarCentavos(valores: number[]): number {
  return valores.reduce((total, valor) => total + Math.round(valor * 100), 0) / 100;
}
