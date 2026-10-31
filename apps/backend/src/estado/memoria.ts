import { randomUUID } from 'node:crypto';
import type { Acao, Destino, Fonte } from '@caqui/contracts';
import { paraBrt } from '../atendimento/formato.js';
import { mascararCpf } from '../triagem/guarda.js';

export interface Conversa {
  id: string;
  protocolo: string;
  clienteId: string;
  passos: number;
  naoEntendidas: number;
  chamadasLlm: number;
  criadaEm: number;
}

export interface Mensagem {
  id: number;
  conversaId: string;
  autor: 'cliente' | 'caqui';
  texto: string;
  acao?: Acao;
  regras: string[];
  fontes: Fonte[];
  momento: number;
}

export interface Encaminhamento {
  id: string;
  ordem: number;
  protocolo: string;
  conversaId: string;
  clienteId: string;
  destino: Destino;
  prioridade: boolean;
  motivo: string;
  sinais: string[];
  resumo: string;
  status: 'aberto';
  momento: number;
}

const LIMITE_FILA = 50;

/** O estado de execução: some ao reiniciar. Todo texto é mascarado aqui, então não há caminho que guarde CPF cru. */
export class EstadoMemoria {
  private readonly conversas = new Map<string, Conversa>();
  private readonly mensagens = new Map<string, Mensagem[]>();
  private encaminhamentos: Encaminhamento[] = [];
  private sequenciaProtocolo = 0;
  private sequenciaMensagem = 0;
  private sequenciaEncaminhamento = 0;

  constructor(private readonly maxConversas: number) {}

  criarConversa(clienteId: string, agora: number): Conversa {
    this.sequenciaProtocolo += 1;
    const dia = paraBrt(agora).data.replaceAll('-', '');
    const conversa: Conversa = {
      id: randomUUID(),
      protocolo: `CQ-${dia}-${String(this.sequenciaProtocolo).padStart(4, '0')}`,
      clienteId,
      passos: 0,
      naoEntendidas: 0,
      chamadasLlm: 0,
      criadaEm: agora,
    };
    this.conversas.set(conversa.id, conversa);
    this.mensagens.set(conversa.id, []);
    this.limitar(conversa.id);
    return conversa;
  }

  /** Só o dono encontra a conversa: de outro cliente é como se não existisse. */
  buscarConversa(id: string, clienteId: string): Conversa | undefined {
    const conversa = this.conversas.get(id);
    return conversa?.clienteId === clienteId ? conversa : undefined;
  }

  registrarMensagem(entrada: Omit<Mensagem, 'id'>): Mensagem {
    this.sequenciaMensagem += 1;
    const mensagem: Mensagem = { ...entrada, id: this.sequenciaMensagem, texto: mascararCpf(entrada.texto) };
    this.mensagens.get(entrada.conversaId)?.push(mensagem);
    return mensagem;
  }

  historico(conversaId: string): Mensagem[] {
    return [...(this.mensagens.get(conversaId) ?? [])];
  }

  abrirEncaminhamento(entrada: Omit<Encaminhamento, 'id' | 'ordem' | 'status'>): Encaminhamento {
    this.sequenciaEncaminhamento += 1;
    const encaminhamento: Encaminhamento = {
      ...entrada,
      id: `E-${this.sequenciaEncaminhamento}`,
      ordem: this.sequenciaEncaminhamento,
      resumo: mascararCpf(entrada.resumo),
      status: 'aberto',
    };
    this.encaminhamentos.push(encaminhamento);
    return encaminhamento;
  }

  /** Segurança primeiro, depois prioridade, depois o mais recente. */
  fila(): Encaminhamento[] {
    return [...this.encaminhamentos]
      .sort((a, b) => Number(b.destino === 'seguranca') - Number(a.destino === 'seguranca')
        || Number(b.prioridade) - Number(a.prioridade)
        || b.ordem - a.ordem)
      .slice(0, LIMITE_FILA);
  }

  /** Remove primeiro as conversas antigas sem encaminhamento; a que acabou de ser criada nunca sai. */
  private limitar(recemCriada: string): void {
    while (this.conversas.size > this.maxConversas) {
      const comCaso = new Set(this.encaminhamentos.map(({ conversaId }) => conversaId));
      const ids = [...this.conversas.keys()].filter((id) => id !== recemCriada);
      if (ids.length === 0) return;
      this.remover(ids.find((id) => !comCaso.has(id)) ?? ids[0]);
    }
  }

  private remover(id: string): void {
    this.conversas.delete(id);
    this.mensagens.delete(id);
    this.encaminhamentos = this.encaminhamentos.filter(({ conversaId }) => conversaId !== id);
  }
}
