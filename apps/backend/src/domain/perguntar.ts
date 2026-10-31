import { z } from 'zod';

export const perguntarRequestSchema = z.object({
  id_cliente: z.string().regex(/^C-\d{4}$/),
  pergunta: z.string().trim().min(1).max(4000),
}).strict();

export interface PerguntarResponse {
  resposta: string;
  fontes: string[];
}
