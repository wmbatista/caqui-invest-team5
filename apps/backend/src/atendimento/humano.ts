import type { Acao, Destino, SaidaHumano } from '@caqui/contracts';
import type { ClienteRecord } from '../data/position-repository.js';
import type { Conversa, EstadoMemoria } from '../estado/memoria.js';
import { param } from '../regras/regras-caqui.js';
import { horaBr, paraBrt } from './formato.js';

type ClienteResumo = Pick<ClienteRecord, 'id' | 'nome' | 'idade' | 'origem'>;

export interface ContextoHumano {
  estado: EstadoMemoria;
  conversa: Conversa;
  cliente: ClienteResumo;
  agora: number;
}

const SINAIS_VULNERAVEIS = new Set(['terceiro', 'confusao', 'resgate_total', 'transfere_terceiro']);

export function temSinalVulneravel(sinais: Iterable<string>): boolean {
  return [...sinais].some((sinal) => SINAIS_VULNERAVEIS.has(sinal));
}

function minutos(hhmm: string): number {
  const [hora, minuto] = hhmm.split(':').map(Number);
  return hora * 60 + minuto;
}

/** 8h00 já abre; 20h00 já está fechado. */
export function humanoAberto(agora: number): boolean {
  const { hora, minuto } = paraBrt(agora);
  const atual = hora * 60 + minuto;
  return minutos(param<string>('CQ-12', 'abre')) <= atual && atual < minutos(param<string>('CQ-12', 'fecha'));
}

function temPrioridadePorIdade(cliente: Pick<ClienteResumo, 'idade'>): boolean {
  return cliente.idade >= param('CQ-06', 'idade_prioridade');
}

export function saidaHumano(cliente: Pick<ClienteResumo, 'idade'>, agora: number, vulneravel = false): SaidaHumano {
  const prioridade = temPrioridadePorIdade(cliente) || vulneravel;
  const disponivel = humanoAberto(agora);
  return {
    disponivel,
    prioridade,
    espera: disponivel ? param<string>('CQ-12', prioridade ? 'espera_prioridade' : 'espera_padrao') : null,
    retorno: disponivel ? null : 'a partir das 8h',
  };
}

/** O resumo é montado por código: quem recebe o caso não precisa perguntar de novo. */
export function encaminhar(ctx: ContextoHumano, destino: Destino, motivo: string, sinais: Iterable<string> = []): void {
  const lista = [...sinais].sort();
  const vulneravel = temSinalVulneravel(lista);
  const ultima = ctx.estado.historico(ctx.conversa.id).filter(({ autor }) => autor === 'cliente').at(-1);
  const idade = temPrioridadePorIdade(ctx.cliente) ? `${ctx.cliente.idade} anos, prioridade 60+` : `${ctx.cliente.idade} anos`;
  const resumo = [
    `${ctx.cliente.nome} (${idade}, ${ctx.cliente.origem.replaceAll('_', ' ')}). Motivo: ${motivo}.`,
    ...(lista.length ? [`Sinais: ${lista.join(', ')}.`] : []),
    ...(ultima ? [`Última mensagem: "${ultima.texto}".`] : []),
  ].join(' ');
  ctx.estado.abrirEncaminhamento({
    protocolo: ctx.conversa.protocolo,
    conversaId: ctx.conversa.id,
    clienteId: ctx.cliente.id,
    destino,
    prioridade: temPrioridadePorIdade(ctx.cliente) || destino === 'seguranca' || vulneravel,
    motivo,
    sinais: lista,
    resumo,
    momento: ctx.agora,
  });
}

/** A passagem para uma pessoa, conforme o horário. */
export function paraHumano(ctx: ContextoHumano, motivo: string, sinais: Iterable<string> = []): { texto: string; acao: Acao } {
  const { protocolo } = ctx.conversa;
  const lista = [...sinais];
  const saida = saidaHumano(ctx.cliente, ctx.agora, temSinalVulneravel(lista));
  encaminhar(ctx, saida.disponivel ? 'humano' : 'retorno', motivo, lista);
  if (saida.disponivel) {
    return {
      texto: `Um atendente da nossa equipe vai falar com você agora. Tempo estimado de espera: ${saida.espera}.${saida.prioridade ? ' Você tem prioridade.' : ''} `
        + `Quem atender já vê esta conversa: você não precisa repetir nada. Protocolo: ${protocolo}.`,
      acao: 'encaminhar_humano',
    };
  }
  return {
    texto: `O atendimento por pessoa funciona das 8h às 20h, todos os dias, e agora são ${horaBr(ctx.agora)}. `
      + `Registrei seu pedido com o protocolo ${protocolo}, e uma pessoa retorna a partir das 8h. `
      + 'Você não vai precisar repetir nada. Se for suspeita de golpe, a segurança da Caqui atende a qualquer hora.',
    acao: 'protocolo',
  };
}
