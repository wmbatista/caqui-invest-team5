import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  history: z.array(chatMessageSchema).max(20).default([]),
}).strict();

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatAction = 'respond' | 'human_handoff' | 'security_handoff';

export interface ChatResponse {
  conversationId: string;
  message: string;
  provider: string;
  model: string;
  action: ChatAction;
}
