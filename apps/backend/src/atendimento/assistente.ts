import type { RespostaChat } from '@caqui/contracts';
import { param } from '../regras/regras-caqui.js';
import { mascararCpf, normalizar, sinais } from '../triagem/guarda.js';
import { paraHumano, saidaHumano, temSinalVulneravel } from './humano.js';
import { fonteKb, type Contexto, type Dependencias, type Fluxo, type RespostaFluxo } from './tipos.js';

export class ConversaNaoEncontrada extends Error {}

const FRASES_NAO_ENTENDI = [
  'Não entendi. Você pode me dizer de outro jeito? Por exemplo: "meu dinheiro está lá?" ou "quando cai meu resgate?".',
  'Ainda não entendi, desculpe. Se preferir, toque em Falar com uma pessoa a qualquer momento.',
];

/** CQ-08: nunca a mesma frase duas vezes; depois do limite, uma pessoa. */
function naoEntendi(ctx: Contexto): RespostaFluxo {
  const { naoEntendidas, passos } = ctx.conversa;
  if (naoEntendidas >= param('CQ-08', 'max_nao_entendidas') || passos >= param('CQ-08', 'max_passos')) {
    ctx.conversa.naoEntendidas = 0;
    const { texto, acao } = paraHumano(ctx, 'o atendimento automático não entendeu', ctx.sinais);
    return { texto: `Desculpe, não consegui entender. Vou chamar uma pessoa para te ajudar. ${texto}`, acao, regras: ['CQ-08', 'CQ-C1'], fontes: fonteKb(ctx, 'KB-025') };
  }
  ctx.conversa.naoEntendidas += 1;
  return { texto: FRASES_NAO_ENTENDI[Math.min(naoEntendidas, FRASES_NAO_ENTENDI.length - 1)], regras: ['CQ-08'], fontes: [] };
}

export class Assistente {
  private readonly nomes: { id: string; nome: string }[];

  constructor(
    private readonly deps: Dependencias,
    private readonly fluxos: Fluxo[] = [],
  ) {
    this.nomes = deps.repo.nomesDeClientes().map(({ id, nome }) => ({ id, nome: normalizar(nome) }));
  }

  novaConversa(clienteId: string, agora: number) {
    return this.deps.estado.criarConversa(clienteId, agora);
  }

  async responder(entrada: { clienteId: string; conversaId: string; mensagem: string; agora: number }): Promise<RespostaChat> {
    const { clienteId, conversaId, agora } = entrada;
    const { estado, repo } = this.deps;
    const conversa = estado.buscarConversa(conversaId, clienteId);
    if (!conversa) throw new ConversaNaoEncontrada();

    const texto = mascararCpf(entrada.mensagem.trim()).slice(0, 2000);
    estado.registrarMensagem({ conversaId, autor: 'cliente', texto, regras: [], fontes: [], momento: agora });
    conversa.passos += 1;

    const ctx: Contexto = {
      ...this.deps,
      cliente: repo.getCliente(clienteId),
      conversa,
      texto,
      normalizado: normalizar(texto),
      sinais: sinais(texto, clienteId, this.nomes),
      agora,
    };

    let resposta: RespostaFluxo | null = null;
    for (const fluxo of this.fluxos) {
      resposta = await fluxo(ctx);
      if (resposta) break;
    }
    if (resposta) conversa.naoEntendidas = 0;
    else resposta = naoEntendi(ctx);

    const acao = resposta.acao ?? 'responder';
    const regras = [...resposta.regras];
    let final = resposta.texto;
    if (conversa.passos >= param('CQ-08', 'max_passos') && acao === 'responder') {
      final += '\nSe preferir, uma pessoa pode continuar daqui: toque em Falar com uma pessoa.';
      regras.push('CQ-08');
    }
    final = mascararCpf(final);
    estado.registrarMensagem({ conversaId, autor: 'caqui', texto: final, acao, regras, fontes: resposta.fontes, momento: agora });

    return {
      conversaId,
      protocolo: conversa.protocolo,
      resposta: final,
      acao,
      fontes: resposta.fontes,
      regras,
      humano: saidaHumano(ctx.cliente, agora, temSinalVulneravel(ctx.sinais)),
      sessaoBloqueada: resposta.sessaoBloqueada ?? false,
      ...(resposta.opcoes ? { opcoes: resposta.opcoes } : {}),
      passo: conversa.passos,
      geradoPor: resposta.geradoPor ?? 'template',
    };
  }
}
