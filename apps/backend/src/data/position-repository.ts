import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { statusOperacaoSchema, tipoOperacaoSchema } from '@caqui/contracts';
import { z } from 'zod';

const opcional = z.string().transform((valor) => (valor === '' ? null : valor));
const numero = z.coerce.number().finite();
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const clienteSchema = z.object({
  id: z.string(),
  nome: z.string(),
  idade: z.number().int(),
  cpf_mascarado: z.string(),
  origem: z.string(),
  saldo_em_conta_brl: z.number(),
});

const posicaoSchema = z.object({
  id_posicao: z.string(),
  id_cliente: z.string(),
  produto: z.string(),
  data_aplicacao: data,
  valor_aplicado_brl: numero,
  taxa_contratada: z.string(),
  vencimento: opcional.pipe(data.nullable()),
  saldo_bruto_brl: numero,
  data_referencia: data,
});

const operacaoSchema = z.object({
  id_operacao: z.string(),
  id_cliente: z.string(),
  tipo: tipoOperacaoSchema,
  produto: opcional,
  valor_brl: numero,
  pedido_em: z.string().datetime({ offset: true }),
  status: statusOperacaoSchema,
  liquidacao_prevista: opcional.pipe(data.nullable()),
  observacao: opcional,
});

const produtoSchema = z.object({
  codigo: z.string(),
  nome: z.string(),
  tipo: z.string(),
  tributavel: z.boolean(),
  liquidez: z.string(),
  carencia_dias: z.number().optional(),
  vencimento_dias: z.number().optional(),
});

const diaSchema = z.object({ data, dia_util: z.boolean(), feriado: z.string().nullable().optional() });

/** Substituído pelo KB-006 (corte das 16h): nunca entra na base usada pelo assistente. */
const ARTIGOS_SUBSTITUIDOS = new Set(['KB-007']);

export type ClienteRecord = z.infer<typeof clienteSchema>;
export type PosicaoRecord = z.output<typeof posicaoSchema>;
export type OperacaoRecord = z.output<typeof operacaoSchema> & { pedido_instante: number };
export type ProdutoRecord = z.infer<typeof produtoSchema>;
export type DiaCalendario = z.infer<typeof diaSchema>;
export interface Artigo { id: string; titulo: string; revisado_em: string; texto: string }

export class ClienteNaoEncontradoError extends Error {}

export interface ResumoPosicao {
  idCliente: string;
  nome: string;
  totalAplicado: number;
  saldoBrutoInvestimentos: number;
  saldoEmConta: number;
  posicoes: PosicaoRecord[];
  fontes: string[];
}

function lerCsv(caminho: string): Record<string, string>[] {
  const [cabecalho, ...linhas] = readFileSync(caminho, 'utf8').trim().split(/\r?\n/);
  const campos = cabecalho.split(',');
  return linhas.map((linha, indice) => {
    const valores = linha.split(',');
    if (valores.length !== campos.length) throw new Error(`${caminho}, linha ${indice + 2}: esperava ${campos.length} colunas, veio ${valores.length}`);
    return Object.fromEntries(campos.map((campo, posicao) => [campo, valores[posicao]]));
  });
}

function validar<S extends z.ZodTypeAny>(schema: S, registro: unknown, origem: string): z.output<S> {
  const resultado = schema.safeParse(registro);
  if (!resultado.success) throw new Error(`Dado inválido em ${origem}: ${resultado.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ')}`);
  return resultado.data;
}

function lerArtigo(caminho: string): Artigo {
  const bruto = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n');
  const partes = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(bruto);
  if (!partes) throw new Error(`Artigo sem cabeçalho: ${caminho}`);
  const meta = Object.fromEntries(partes[1].split('\n').map((linha) => {
    const separador = linha.indexOf(': ');
    return [linha.slice(0, separador), linha.slice(separador + 2)];
  }));
  return { id: meta.id, titulo: meta.titulo, revisado_em: meta.revisado_em, texto: partes[2].trim() };
}

/** Os dados sintéticos de dados/, lidos na subida. O acesso é sempre filtrado por cliente; nomesDeClientes é a única exceção. */
export class PositionRepository {
  private readonly clientes = new Map<string, ClienteRecord>();
  private readonly posicoes: PosicaoRecord[];
  private readonly operacoes: OperacaoRecord[];
  private readonly produtos = new Map<string, ProdutoRecord>();
  private readonly artigos = new Map<string, Artigo>();
  private readonly calendario: DiaCalendario[];

  constructor(dataDir: string) {
    const directory = resolve(process.cwd(), dataDir);
    const json = (arquivo: string) => JSON.parse(readFileSync(resolve(directory, arquivo), 'utf8'));

    for (const registro of json('clientes.json')) {
      const cliente = validar(clienteSchema, registro, 'clientes.json');
      this.clientes.set(cliente.id, cliente);
    }
    this.posicoes = lerCsv(resolve(directory, 'posicoes.csv')).map((linha) => validar(posicaoSchema, linha, `posicoes.csv ${linha.id_posicao}`));
    this.operacoes = lerCsv(resolve(directory, 'operacoes.csv')).map((linha) => {
      const operacao = validar(operacaoSchema, linha, `operacoes.csv ${linha.id_operacao}`);
      return { ...operacao, pedido_instante: Date.parse(operacao.pedido_em) };
    });
    for (const registro of json('taxas.json').produtos) {
      const produto = validar(produtoSchema, registro, 'taxas.json');
      this.produtos.set(produto.codigo, produto);
    }
    this.calendario = json('calendario.json').dias.map((dia: unknown) => validar(diaSchema, dia, 'calendario.json'));

    const pastaArtigos = resolve(directory, 'base_conhecimento');
    for (const arquivo of readdirSync(pastaArtigos).filter((nome) => /^KB-\d+\.md$/.test(nome))) {
      const artigo = lerArtigo(resolve(pastaArtigos, arquivo));
      if (!ARTIGOS_SUBSTITUIDOS.has(artigo.id)) this.artigos.set(artigo.id, artigo);
    }
  }

  totais() {
    return { clientes: this.clientes.size, posicoes: this.posicoes.length, operacoes: this.operacoes.length, produtos: this.produtos.size, artigos: this.artigos.size };
  }

  getCliente(id: string): ClienteRecord {
    const cliente = this.clientes.get(id);
    if (!cliente) throw new ClienteNaoEncontradoError(`Cliente ${id} não encontrado`);
    return cliente;
  }

  getPosicoes(idCliente: string): PosicaoRecord[] {
    return this.posicoes
      .filter(({ id_cliente }) => id_cliente === idCliente)
      .sort((a, b) => a.data_aplicacao.localeCompare(b.data_aplicacao));
  }

  /** Só o que já tinha sido pedido no momento do relógio, do mais recente para o mais antigo. */
  getOperacoes(idCliente: string, agora: number): OperacaoRecord[] {
    return this.operacoes
      .filter(({ id_cliente, pedido_instante }) => id_cliente === idCliente && pedido_instante <= agora)
      .sort((a, b) => b.pedido_instante - a.pedido_instante);
  }

  getProduto(codigo: string): ProdutoRecord {
    const produto = this.produtos.get(codigo);
    if (!produto) throw new Error(`Produto desconhecido: ${codigo}`);
    return produto;
  }

  getArtigo(id: string): Artigo {
    const artigo = this.artigos.get(id);
    if (!artigo) throw new Error(`Artigo indisponível: ${id}`);
    return artigo;
  }

  getCalendario(): DiaCalendario[] {
    return this.calendario;
  }

  /** Só id e nome: serve para reconhecer no texto o nome de outro cliente. */
  nomesDeClientes(): { id: string; nome: string }[] {
    return [...this.clientes.values()].map(({ id, nome }) => ({ id, nome }));
  }

  resumoPosicao(idCliente: string): ResumoPosicao {
    const cliente = this.getCliente(idCliente);
    const posicoes = this.posicoes.filter(({ id_cliente }) => id_cliente === idCliente);
    return {
      idCliente,
      nome: cliente.nome,
      totalAplicado: sum(posicoes.map(({ valor_aplicado_brl }) => valor_aplicado_brl)),
      saldoBrutoInvestimentos: sum(posicoes.map(({ saldo_bruto_brl }) => saldo_bruto_brl)),
      saldoEmConta: cliente.saldo_em_conta_brl,
      posicoes,
      fontes: [...posicoes.map(({ id_posicao }) => id_posicao), idCliente],
    };
  }
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}
