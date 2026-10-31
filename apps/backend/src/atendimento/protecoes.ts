import { encaminhar, paraHumano } from './humano.js';
import { fonteConta, fonteKb, type Fluxo } from './tipos.js';

/** Nenhum destes fluxos chama o LLM: proteção não pode depender de um serviço externo. */

export const golpe: Fluxo = (ctx) => {
  if (!ctx.sinais.has('golpe')) return null;
  encaminhar(ctx, 'seguranca', 'suspeita de golpe', ctx.sinais);
  return {
    texto: 'Pare. Não passe nenhum código, senha ou token, e não faça nenhum Pix ou transferência. A Caqui nunca liga, manda mensagem ou e-mail pedindo isso, nem pede para instalar aplicativo de acesso remoto. Isso é sinal de golpe.\n'
      + 'Por segurança, bloqueei seu acesso: sua sessão foi encerrada em todos os aparelhos.\n'
      + `Já chamei a equipe de segurança da Caqui (protocolo ${ctx.conversa.protocolo}). Uma pessoa fala com você agora, sem fila, a qualquer hora.\n`
      + 'Se você já passou algum código ou fez uma transferência, conte para a segurança assim que ela entrar.',
    acao: 'seguranca_imediata',
    regras: ['CQ-C4', 'CQ-05'],
    fontes: fonteKb(ctx, 'KB-019', 'KB-020'),
    sessaoBloqueada: true,
  };
};

export const recomendacao: Fluxo = (ctx) => {
  if (!ctx.sinais.has('recomendacao')) return null;
  encaminhar(ctx, 'especialista', 'pedido de orientação de investimento', ctx.sinais);
  return {
    texto: 'Não indico onde investir: isso depende do seu perfil e dos seus objetivos, e quem faz essa orientação é um especialista em investimentos da Caqui, com agendamento. '
      + `Já registrei seu pedido de conversa com o especialista (protocolo ${ctx.conversa.protocolo}).`,
    acao: 'encaminhar_especialista',
    regras: ['CQ-C2', 'CQ-04', ...(ctx.sinais.has('injecao') ? ['CQ-11'] : [])],
    fontes: fonteKb(ctx, 'KB-029'),
  };
};

export const dadosDeTerceiros: Fluxo = (ctx) => {
  if (!ctx.sinais.has('injecao') && !ctx.sinais.has('outro_cliente')) return null;
  return {
    texto: 'Só posso mostrar informações da sua própria conta. Não mostro dados de outras pessoas. '
      + 'Se você cuida da conta de alguém como responsável legal, uma pessoa da Caqui explica como fazer isso com a documentação.',
    acao: 'recusar',
    regras: ['CQ-10', 'CQ-11'],
    fontes: [],
  };
};

export const vulneravel: Fluxo = (ctx) => {
  if (!ctx.sinais.has('terceiro') && !ctx.sinais.has('confusao') && !ctx.sinais.has('resgate_total')) return null;
  const { texto, acao } = paraHumano(ctx, 'cliente vulnerável', ctx.sinais);
  const linhas = ['Entendi. Vamos com calma, sem pressa: vou chamar uma pessoa da Caqui para conversar com você.', texto];
  const artigos = ['KB-028', 'KB-025'];
  if (ctx.sinais.has('transfere_terceiro')) {
    linhas.push('Para sua segurança: a Caqui só transfere dinheiro para conta de mesma titularidade, ou seja, no seu próprio nome.');
    artigos.push('KB-018');
  }
  if (ctx.sinais.has('resgate_total')) linhas.push('Não fiz nenhum pedido de resgate: nada muda enquanto vocês conversam.');
  return { texto: linhas.join('\n'), acao, regras: ['CQ-06', 'CQ-C1', 'CQ-C5'], fontes: fonteKb(ctx, ...artigos) };
};

/** CQ-10: quem só informa o CPF (já mascarado) não está pedindo para vê-lo. */
export const cpf: Fluxo = (ctx) => {
  if (ctx.sinais.has('nao_entendeu') || !/\bcpf\b/.test(ctx.normalizado) || ctx.texto.includes('***.***.***-**')) return null;
  return {
    texto: `Por segurança, o CPF aparece sempre mascarado: ${ctx.cliente.cpf_mascarado}. O CPF completo não é mostrado no atendimento.`,
    regras: ['CQ-10'],
    fontes: fonteConta({ id: ctx.cliente.id, titulo: 'Seu cadastro' }),
  };
};
