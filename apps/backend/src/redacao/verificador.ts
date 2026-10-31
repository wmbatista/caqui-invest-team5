import { param } from '../regras/regras-caqui.js';
import { contemCpf, normalizar } from '../triagem/guarda.js';

const DATA = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;
const VALOR = /R\$\s*\d[\d.,]*(?:\s*(?:mil|milh\w+|bilh\w+))?/gi;
const IDENTIFICADOR = /\b(?:KB-\d+|OP-\d+|P-\d+|C-\d{4})\b/gi;
const HORA = /\b\d{1,2}h(?:\d{2})?\b/gi;
const PERCENTUAL = /\d+(?:[.,]\d+)?\s*%/g;
/** Formas que não dá para conferir contra os fatos: nenhum template as usa. */
const FATO_POR_EXTENSO = /\b\d{1,2} de (?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b|\b\d+(?:[.,]\d+)?\s*(?:mil|milhoes|milhao|reais)\b/;
const ALARMANTES = ['sumiu', 'perdido'];
/** As normas vão ao modelo como instrução, mas não podem aparecer para o cliente. O protocolo (CQ-AAAAMMDD-NNNN) não casa aqui. */
const NORMA = /\bcq-(?:c|d)?\d{1,2}\b|\b(?:regras?|normas?|constituicao|decreto)\b/;

function achados(texto: string, padrao: RegExp): string[] {
  return (texto.match(padrao) ?? []).map((item) => item.replace(/\s+/g, ' ').trim().replace(/[.,]+$/, '').toUpperCase());
}

/** O texto do LLM só passa se preservar todo fato do template e não trouxer nenhum outro (princípio II). */
export function textoAprovado(texto: string, template: string): boolean {
  if (!texto.trim() || contemCpf(texto)) return false;
  const normalizado = normalizar(texto);
  if (FATO_POR_EXTENSO.test(normalizado) || NORMA.test(normalizado)) return false;
  const proibidas = [...param<string[]>('CQ-C2', 'proibidas'), ...ALARMANTES].map(normalizar);
  if (proibidas.some((termo) => normalizado.includes(termo))) return false;

  for (const padrao of [DATA, VALOR, IDENTIFICADOR, HORA, PERCENTUAL]) {
    const permitidos = new Set(achados(template, padrao));
    const encontrados = new Set(achados(texto, padrao));
    if ([...encontrados].some((item) => !permitidos.has(item))) return false;
  }
  // Todo valor e toda data do template precisam continuar lá: uma data omitida também altera a resposta.
  for (const padrao of [DATA, VALOR]) {
    const encontrados = new Set(achados(texto, padrao));
    if (achados(template, padrao).some((item) => !encontrados.has(item))) return false;
  }
  return true;
}
