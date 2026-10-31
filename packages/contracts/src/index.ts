import { z } from 'zod';

/** Contrato da API. A referência é specs/001-onde-esta-meu-dinheiro/contracts/openapi.yaml. */

export const papelSchema = z.enum(['cliente', 'atendente']);
export const acaoSchema = z.enum(['responder', 'encaminhar_humano', 'encaminhar_especialista', 'seguranca_imediata', 'protocolo', 'recusar']);
export const destinoSchema = z.enum(['humano', 'seguranca', 'especialista', 'retorno', 'reclamacao']);
export const camadaSchema = z.enum(['CONSTITUICAO', 'LEI', 'DECRETO']);
export const erroCodeSchema = z.enum(['INVALID_REQUEST', 'SESSAO_INVALIDA', 'PAPEL_NEGADO', 'CONVERSA_NAO_ENCONTRADA', 'LIMITE_EXCEDIDO']);
export const tipoOperacaoSchema = z.enum(['aplicacao', 'resgate', 'transferencia_saida_pix', 'transferencia_entrada']);
export const statusOperacaoSchema = z.enum(['pendente', 'em_processamento', 'liquidada', 'recusada']);

export const criarSessaoSchema = z.object({ personaId: z.string().min(1) }).strict();
export const relogioSchema = z.object({ momento: z.string().datetime({ offset: true }) }).strict();
export const enviarMensagemSchema = z.object({
  conversaId: z.string().uuid(),
  mensagem: z.string().trim().min(1).max(2000),
}).strict();

export const personaSchema = z.object({
  id: z.string(),
  papel: papelSchema,
  nome: z.string(),
  descricao: z.string(),
});

export const sessaoCriadaSchema = z.object({ token: z.string(), nome: z.string(), papel: papelSchema });

export const fonteSchema = z.object({
  tipo: z.enum(['kb', 'conta']),
  id: z.string(),
  titulo: z.string().optional(),
});

export const saidaHumanoSchema = z.object({
  disponivel: z.boolean(),
  prioridade: z.boolean(),
  espera: z.string().nullable(),
  retorno: z.string().nullable(),
});

export const euSchema = z.object({
  nome: z.string(),
  papel: papelSchema,
  agora: z.string(),
  cliente: z.object({ id: z.string(), nome: z.string(), idade: z.number().int(), cpfMascarado: z.string() }).nullable(),
  humano: saidaHumanoSchema.nullable(),
});

export const conversaCriadaSchema = z.object({ id: z.string().uuid(), protocolo: z.string() });

export const respostaChatSchema = z.object({
  conversaId: z.string().uuid(),
  protocolo: z.string().regex(/^CQ-\d{8}-\d{4,}$/),
  resposta: z.string(),
  acao: acaoSchema,
  fontes: z.array(fonteSchema),
  humano: saidaHumanoSchema,
  sessaoBloqueada: z.boolean(),
  opcoes: z.array(z.object({ id: z.string(), descricao: z.string() })).optional(),
  passo: z.number().int().min(1),
  geradoPor: z.enum(['template', 'llm']),
});

export const posicaoItemSchema = z.object({
  id: z.string(),
  produto: z.string(),
  valorAplicado: z.string(),
  saldoBruto: z.string(),
  dataAplicacao: z.string(),
  vencimento: z.string().nullable(),
  liquidez: z.string(),
  oscila: z.boolean(),
  observacao: z.string().nullable(),
  texto: z.string(),
});

export const movimentoSchema = z.object({
  id: z.string(),
  tipo: tipoOperacaoSchema,
  produto: z.string(),
  valor: z.string(),
  pedidoEm: z.string(),
  status: statusOperacaoSchema,
  caiEm: z.string().nullable(),
  dataCalculada: z.boolean(),
  atrasada: z.boolean(),
  emAndamento: z.boolean(),
  observacao: z.string().nullable(),
});

export const meuDinheiroSchema = z.object({
  hoje: z.string(),
  saldoEmConta: z.string(),
  total: z.string(),
  avisoBruto: z.string(),
  posicoes: z.array(posicaoItemSchema),
  movimentos: z.array(movimentoSchema),
});

export const mensagemHistoricoSchema = z.object({
  autor: z.enum(['cliente', 'caqui']),
  texto: z.string(),
  acao: acaoSchema.optional(),
});

export const casoSchema = z.object({
  id: z.string(),
  protocolo: z.string(),
  destino: destinoSchema,
  prioridade: z.boolean(),
  motivo: z.string(),
  resumo: z.string(),
  status: z.literal('aberto'),
  momento: z.string(),
  nome: z.string(),
  idade: z.number().int(),
  historico: z.array(mensagemHistoricoSchema),
});

export const erroSchema = z.object({ code: erroCodeSchema, message: z.string() });

export type Papel = z.infer<typeof papelSchema>;
export type Acao = z.infer<typeof acaoSchema>;
export type Destino = z.infer<typeof destinoSchema>;
export type Camada = z.infer<typeof camadaSchema>;
export type ErroCode = z.infer<typeof erroCodeSchema>;
export type TipoOperacao = z.infer<typeof tipoOperacaoSchema>;
export type StatusOperacao = z.infer<typeof statusOperacaoSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type SessaoCriada = z.infer<typeof sessaoCriadaSchema>;
export type Fonte = z.infer<typeof fonteSchema>;
export type SaidaHumano = z.infer<typeof saidaHumanoSchema>;
export type Eu = z.infer<typeof euSchema>;
export type ConversaCriada = z.infer<typeof conversaCriadaSchema>;
export type RespostaChat = z.infer<typeof respostaChatSchema>;
export type PosicaoItem = z.infer<typeof posicaoItemSchema>;
export type Movimento = z.infer<typeof movimentoSchema>;
export type MeuDinheiro = z.infer<typeof meuDinheiroSchema>;
export type MensagemHistorico = z.infer<typeof mensagemHistoricoSchema>;
export type Caso = z.infer<typeof casoSchema>;
export type Erro = z.infer<typeof erroSchema>;
