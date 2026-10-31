import type { Conversa } from '../estado/memoria.js';
import type { LlmProvider } from '../providers/openrouter.js';
import { param, promptDeRegras } from '../regras/regras-caqui.js';
import { mascararCpf } from '../triagem/guarda.js';
import { textoAprovado } from './verificador.js';

export interface Redacao {
  texto: string;
  geradoPor: 'template' | 'llm';
}

function sistema(): string {
  return 'Você é o atendimento automático da Caqui Invest, corretora digital fictícia. Reescreva o TEXTO CORRETO em português '
    + 'simples, para quem investe pela primeira vez: frases curtas, sem markdown e sem alarme. '
    + 'Mantenha exatamente todas as datas, valores em R$, horas e ids. Não calcule, não acrescente fato nenhum e não recomende.\n\n'
    + `NORMAS VIGENTES (a superior prevalece):\n${promptDeRegras()}`;
}

/** O template já está correto: o LLM só pode reescrevê-lo, e qualquer falha mantém o template. */
export async function redigir(entrada: { template: string; mensagem: string; conversa: Conversa; provider: LlmProvider }): Promise<Redacao> {
  const { template, mensagem, conversa, provider } = entrada;
  const original: Redacao = { texto: template, geradoPor: 'template' };
  if (conversa.chamadasLlm >= param('CQ-08', 'max_passos')) return original;
  conversa.chamadasLlm += 1;
  const dado = mascararCpf(mensagem).replace(/<\/?cliente>/gi, '');
  try {
    const texto = await provider.complete({
      system: sistema(),
      messages: [{ role: 'user', content: `<cliente>${dado}</cliente>\n\nTEXTO CORRETO:\n${template}` }],
      maxTokens: 500,
    });
    return texto && textoAprovado(texto, template) ? { texto, geradoPor: 'llm' } : original;
  } catch {
    return original;
  }
}
