import { criarData, moduloPositivo, diaSemana, paraBrt, somarDias, type DataISO } from './formato.js';

/** Recebem sempre texto normalizado: sem acento e em minúsculas. */

const DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

export interface HoraDoDia {
  hora: number;
  minuto: number;
}

export interface Momento {
  dia: DataISO | null;
  hora: HoraDoDia | null;
}

/** Código do produto citado e se a citação é genérica ("o CDB"). */
export function lerProduto(texto: string): { codigo: string | null; generico: boolean } {
  if (texto.includes('multimercado')) return { codigo: 'FUNDO-MM-01', generico: false };
  if (texto.includes('renda fixa') || texto.includes('fundo')) return { codigo: 'FUNDO-RF-01', generico: false };
  if (texto.includes('tesouro') || texto.includes('selic')) return { codigo: 'TESOURO-SELIC-2029', generico: false };
  if (/\bac(?:oes|ao)\b|bolsa/.test(texto)) return { codigo: 'ACOES', generico: false };
  if (/\blci\b/.test(texto)) return { codigo: 'LCI-90D-92', generico: false };
  if (/\blca\b/.test(texto)) return { codigo: 'LCA-1A-95', generico: false };
  if (texto.includes('cdb')) {
    if (texto.includes('2 anos') || texto.includes('120')) return { codigo: 'CDB-2A-120', generico: false };
    if (texto.includes('110')) return { codigo: 'CDB-LD-110', generico: false };
    if (texto.includes('85')) return { codigo: 'CDB-LD-85', generico: false };
    return { codigo: 'CDB-LD-100', generico: true };
  }
  return { codigo: null, generico: false };
}

function lerDia(texto: string, hoje: DataISO): DataISO | null {
  const data = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/.exec(texto);
  if (data) return criarData(Number(data[3] ?? hoje.slice(0, 4)), Number(data[2]), Number(data[1]));
  if (/\banteontem\b/.test(texto)) return somarDias(hoje, -2);
  if (/\bontem\b/.test(texto)) return somarDias(hoje, -1);
  if (/\bhoje\b/.test(texto)) return hoje;
  const indice = DIAS.findIndex((nome) => new RegExp(`\\b${nome}(?:-feira)?\\b`).test(texto));
  // O pedido já aconteceu: o dia da semana conta para trás, nunca para o futuro.
  return indice >= 0 ? somarDias(hoje, -moduloPositivo(diaSemana(hoje) - indice, 7)) : null;
}

/** Quando foi o pedido, lido do texto. Lança DataInvalida para uma data que não existe. */
export function lerMomento(texto: string, agora: number): Momento {
  const dia = lerDia(texto, paraBrt(agora).data);
  if (!dia) return { dia: null, hora: null };
  const hora = /\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/.exec(texto);
  if (hora) return { dia, hora: { hora: Number(hora[1]), minuto: Number(hora[2] ?? 0) } };
  if (texto.includes('manha')) return { dia, hora: { hora: 9, minuto: 0 } };
  if (/(?:a|de) noite/.test(texto)) return { dia, hora: { hora: 21, minuto: 0 } };
  return { dia, hora: null };
}

export function lerOperacao(texto: string): string | null {
  return /\bop-\d+\b/.exec(texto)?.[0].toUpperCase() ?? null;
}
