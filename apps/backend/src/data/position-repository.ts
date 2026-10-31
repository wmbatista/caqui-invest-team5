import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ClienteRecord {
  id: string;
  nome: string;
  saldo_em_conta_brl: number;
}

export interface PosicaoRecord {
  id_posicao: string;
  id_cliente: string;
  produto: string;
  data_aplicacao: string;
  valor_aplicado_brl: number;
  taxa_contratada: string;
  vencimento: string;
  saldo_bruto_brl: number;
  data_referencia: string;
}

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

export class PositionRepository {
  private readonly clientes: ClienteRecord[];
  private readonly posicoes: PosicaoRecord[];

  constructor(dataDir: string) {
    const directory = resolve(process.cwd(), dataDir);
    this.clientes = JSON.parse(readFileSync(resolve(directory, 'clientes.json'), 'utf8')) as ClienteRecord[];
    const csv = readFileSync(resolve(directory, 'posicoes.csv'), 'utf8').trim().split(/\r?\n/);
    const headers = csv[0].split(',');
    this.posicoes = csv.slice(1).map((line) => {
      const row = Object.fromEntries(headers.map((header, index) => [header, line.split(',')[index] ?? '']));
      return {
        id_posicao: row.id_posicao,
        id_cliente: row.id_cliente,
        produto: row.produto,
        data_aplicacao: row.data_aplicacao,
        valor_aplicado_brl: Number(row.valor_aplicado_brl),
        taxa_contratada: row.taxa_contratada,
        vencimento: row.vencimento,
        saldo_bruto_brl: Number(row.saldo_bruto_brl),
        data_referencia: row.data_referencia,
      };
    });
  }

  resumoPosicao(idCliente: string): ResumoPosicao {
    const cliente = this.clientes.find(({ id }) => id === idCliente);
    if (!cliente) throw new ClienteNaoEncontradoError(`Cliente ${idCliente} não encontrado`);
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
