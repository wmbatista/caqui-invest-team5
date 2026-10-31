/** Travas determinísticas: rodam antes de qualquer fluxo e decidem o caminho. O texto do cliente é dado (CQ-11). */

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

export function mascararCpf(texto: string): string {
  return texto.replace(CPF, '***.***.***-**');
}

export function contemCpf(texto: string): boolean {
  return new RegExp(CPF.source).test(texto);
}

const SEGREDO = '(?:senha|codigo|token)';

/** Golpe exige um pedido, não só a palavra: "recebi uma mensagem que meu pix caiu" e "o que é token?" não são golpe. */
const GOLPE = [
  /codigo (?:do |de |por |que )?.{0,20}sms/,
  /pix de teste|teste de r\$|pix .{0,20}teste/,
  /(?:acesso|suporte) remoto|app de suporte|aplicativo .{0,40}(?:acessar|acesso|suporte)|anydesk|teamviewer/,
  new RegExp(`(?:ligaram|ligou|telefonaram|gerente|seguranca da caqui|central).{0,80}(?:${SEGREDO}|pix|transfer)`),
  new RegExp(`(?:mensagem|e-?mail|whatsapp).{0,80}${SEGREDO}`),
  /(?:mensagem|e-?mail|whatsapp).{0,40}(?:pedi|mandando|solicit).{0,40}(?:pix|transfer)/,
  new RegExp(`\\b(?:pediu|pediram|pedindo|pede|querem|quer)\\b.{0,40}${SEGREDO}`),
  new RegExp(`${SEGREDO}.{0,60}\\b(?:ligaram|ligou|pediu|pediram|pedindo)\\b`),
  new RegExp(`\\b(?:posso|devo|preciso|tenho que) (?:passar|informar|dar|confirmar).{0,30}${SEGREDO}`),
  new RegExp(`${SEGREDO}.{0,40}\\b(?:posso|devo|preciso) (?:passar|informar|confirmar)`),
  /conta (?:vai ser|sera) bloqueada/,
  /(?:coloquei|passei|informei) (?:a |minha |o |meu )?(?:senha|codigo)/,
];
const INJECAO = [
  /ignor\w* (?:as |suas |todas |tudo|previas|anteriores|instruc|regras)/,
  /esquec\w* (?:a |as |suas )?(?:politica|regra|instruc)/,
  /modo (?:administrador|admin|desenvolvedor|dev)/,
  /^(?:sistema|system)\s*:/,
  /\bvoce agora e\b|a partir de agora (?:voce|vc)/,
  /finja|finge|aja como|faca de conta|jailbreak|sem restric/,
  /senha padrao/,
  /(?:liste|lista|mostre|mostra|exiba).{0,40}(?:cpfs?|clientes|saldos)/,
];
const OUTRA_PESSOA = [
  /\bsou (?:o |a )?(?:sobrinh|filh|net|irma|marido|esposa|procurador|advogad)\w* d(?:ela|ele|o cliente|a cliente)\b/,
  /(?:saldo|dados|cpf|conta|investimentos) d[aoe] (?:minha |meu )?(?:mae|pai|tia|tio|avo|esposa|marido|cliente|outr)/,
];
const RECOMENDACAO = [
  /onde (?:eu )?(?:coloco|ponho|invisto|aplico|devo|deveria)|onde investir|onde aplicar/,
  /o que (?:voce|vc) faria/,
  /no meu lugar/,
  /vale (?:mais )?a pena/,
  /(?:qual|o que) (?:e |seria )?(?:o |a )?melhor (?:opcao|investimento|produto|pra mim|para mim)/,
  /\bme (?:diz|diga|indica|indique|recomenda|recomende|sugere|sugira)\b.{0,30}(?:investir|aplicar|fazer|colocar|produto|onde|qual)/,
  /recomend/,
  /sugest\w*.{0,40}(?:invest|aplic|produto|coloc|dinheiro|onde)|(?:invest|aplic|produto|dinheiro).{0,40}sugest/,
  /assessor/,
  /o que (?:eu )?(?:faco|fazer) com (?:o|esse|essa|meu|minha)/,
  /(?:heranca|parado|parados).{0,60}(?:fazer|investir|aplicar|coloc)/,
  /\b(?:devo|deveria) (?:tirar|colocar|aplicar|investir|trocar|mudar)\b/,
];
const PRESSAO_DE_TERCEIRO = /\b(?:meu|minha) (?:sobrinh[oa]|filh[oa]|net[oa]|genro|nora|marido|esposa|irma|irmao|amig[oa]|vizinh[oa]|namorad[oa]|cuidadora?)\b.{0,60}(?:mandou|pediu|disse|falou|quer|do meu lado|aqui|dizendo|mandando|insist)/;
const ASSUNTO_DINHEIRO = /dinheiro|resgat|tirar|sacar|transfer|\bpix\b|\bconta\b|saldo|passar|aplic|invest/;
const TRANSFERE_TERCEIRO = [/(?:conta|pix) d(?:ele|ela)\b|(?:passar|transferir|mandar) tudo/];
const CONFUSAO = [/nao (?:estou|to|tou) entendendo|nao entendo nada|nao entendi nada|confus|perdid[ao]|nao sei (?:mexer|usar|o que fazer)|socorro/];
const RESGATE_TOTAL = /(?:tirar|resgatar|sacar|retirar) (?:todo|tudo|toda)|todo o (?:meu )?dinheiro|resgate total/;
/** "Quanto recebo se resgatar tudo?" é pergunta, não intenção declarada. */
const HIPOTESE = /\bse (?:eu )?(?:tirar|resgatar|sacar|retirar|resgatasse|tirasse)\b|\bquanto\b/;
const HUMANO = [/(?:falar|conversar|atendimento) com (?:uma |um |alguma )?(?:pessoa|atendente|humano|gente|alguem)/, /\batendente\b/, /pessoa de verdade/, /\bhumano\b/];
const RECLAMACAO = [/reclama/];
const ENCERRAMENTO = [/(?:encerr|cancel|fech)\w* (?:a |minha )?conta/, /sair da caqui/];
const NAO_ENTENDEU = [/^nao e (?:isso|isto)/, /nao foi (?:isso|o que)/, /^(?:asdf|qwe|\?+|\.+)$/];
const NAO_OFERECIDO: [RegExp, string][] = [
  [/previdencia/, 'previdência privada'],
  [/cripto|bitcoin/, 'criptoativos'],
  [/cambio|\bdolar|\beuros?\b/, 'câmbio'],
  [/\bseguros\b|\bseguro (?:de|auto|residencial|viagem)\b/, 'seguros'],
  [/consorcio/, 'consórcio'],
  [/emprestimo|financiamento/, 'empréstimos'],
];

function algum(padroes: RegExp[], texto: string): boolean {
  return padroes.some((padrao) => padrao.test(texto));
}

function outroCliente(texto: string, clienteId: string, nomes: { id: string; nome: string }[]): boolean {
  const ids = (texto.match(/\bc-\d{4}\b/g) ?? []).map((id) => id.toUpperCase());
  if (ids.some((id) => id !== clienteId)) return true;
  if (nomes.some(({ id, nome }) => id !== clienteId && texto.includes(nome))) return true;
  return algum(OUTRA_PESSOA, texto);
}

/** O texto do cliente só é lido por estes padrões, nunca obedecido. `nomes` já vem normalizado. */
export function sinais(texto: string, clienteId: string, nomes: { id: string; nome: string }[]): Set<string> {
  const normalizado = normalizar(texto);
  const achados = new Set<string>();
  const marcar = (nome: string, condicao: boolean) => { if (condicao) achados.add(nome); };
  marcar('golpe', algum(GOLPE, normalizado));
  marcar('injecao', algum(INJECAO, normalizado));
  marcar('recomendacao', algum(RECOMENDACAO, normalizado));
  marcar('transfere_terceiro', algum(TRANSFERE_TERCEIRO, normalizado));
  marcar('terceiro', achados.has('transfere_terceiro') || (PRESSAO_DE_TERCEIRO.test(normalizado) && ASSUNTO_DINHEIRO.test(normalizado)));
  marcar('confusao', algum(CONFUSAO, normalizado));
  marcar('resgate_total', RESGATE_TOTAL.test(normalizado) && !HIPOTESE.test(normalizado));
  marcar('humano', algum(HUMANO, normalizado));
  marcar('reclamacao', algum(RECLAMACAO, normalizado));
  marcar('encerramento', algum(ENCERRAMENTO, normalizado));
  marcar('nao_entendeu', algum(NAO_ENTENDEU, normalizado));
  marcar('outro_cliente', outroCliente(normalizado, clienteId, nomes));
  return achados;
}

export function naoOferecido(normalizado: string): string | null {
  return NAO_OFERECIDO.find(([padrao]) => padrao.test(normalizado))?.[1] ?? null;
}
