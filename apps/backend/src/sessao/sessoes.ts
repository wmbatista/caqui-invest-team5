import { randomBytes } from 'node:crypto';
import type { Papel, Persona } from '@caqui/contracts';

const HORA = 3_600_000;
const SESSAO_OCIOSA = 8 * HORA;
const SESSAO_MAXIMA = 24 * HORA;

export interface Sessao {
  token: string;
  papel: Papel;
  nome: string;
  clienteId: string | null;
  /** Relógio simulado desta sessão. */
  agora: number;
  criadaEm: number;
  usadaEm: number;
}

export class Sessoes {
  private readonly ativas = new Map<string, Sessao>();

  constructor(
    private readonly agoraPadrao: number,
    private readonly relogioReal: () => number = Date.now,
  ) {}

  criar(persona: Persona): Sessao {
    this.limparExpiradas();
    const agora = this.relogioReal();
    const sessao: Sessao = {
      token: randomBytes(24).toString('hex'),
      papel: persona.papel,
      nome: persona.nome,
      clienteId: persona.papel === 'cliente' ? persona.id : null,
      agora: this.agoraPadrao,
      criadaEm: agora,
      usadaEm: agora,
    };
    this.ativas.set(sessao.token, sessao);
    return sessao;
  }

  obter(token: string): Sessao | undefined {
    const sessao = this.ativas.get(token);
    if (!sessao) return undefined;
    const agora = this.relogioReal();
    if (this.expirou(sessao, agora)) {
      this.ativas.delete(token);
      return undefined;
    }
    sessao.usadaEm = agora;
    return sessao;
  }

  encerrar(token: string): void {
    this.ativas.delete(token);
  }

  /** Bloqueio de acesso simulado (KB-020): encerra a sessão em todos os aparelhos. */
  encerrarDoCliente(clienteId: string): number {
    const tokens = [...this.ativas.values()].filter((sessao) => sessao.clienteId === clienteId).map(({ token }) => token);
    tokens.forEach((token) => this.ativas.delete(token));
    return tokens.length;
  }

  private expirou(sessao: Sessao, agora: number): boolean {
    return agora - sessao.criadaEm > SESSAO_MAXIMA || agora - sessao.usadaEm > SESSAO_OCIOSA;
  }

  private limparExpiradas(): void {
    const agora = this.relogioReal();
    for (const sessao of this.ativas.values()) {
      if (this.expirou(sessao, agora)) this.ativas.delete(sessao.token);
    }
  }
}
