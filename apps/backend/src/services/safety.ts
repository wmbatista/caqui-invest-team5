import type { ChatAction } from '../domain/chat.js';

export interface SafetyDecision {
  action: Exclude<ChatAction, 'respond'>;
  message: string;
}

const scamPatterns = [
  /\b(senha|c[oó]digo|token)\b.*\b(pediu|passar|envia|inform)/iu,
  /\b(gerente|atendente|terceiro)\b.*\b(transfer|pix|c[oó]digo|senha)/iu,
];
const advicePatterns = [
  /\b(onde|em que|qual).{0,30}\b(investir|aplicar|melhor investimento|melhor op[cç][aã]o)\b/iu,
  /\bo que voc[eê] faria\b/iu,
];

export function evaluateSafety(message: string): SafetyDecision | null {
  if (scamPatterns.some((pattern) => pattern.test(message))) {
    return {
      action: 'security_handoff',
      message: 'Não informe senha, código ou token e não faça a transferência. A Caqui nunca pede esses dados. Sua sessão foi sinalizada para bloqueio simulado e o caso deve seguir agora para a equipe de segurança.',
    };
  }
  if (advicePatterns.some((pattern) => pattern.test(message))) {
    return {
      action: 'human_handoff',
      message: 'Posso explicar conceitos e diferenças gerais, mas não indicar um produto ou percentual. Vou encaminhar seu pedido a um especialista para uma avaliação adequada.',
    };
  }
  return null;
}
