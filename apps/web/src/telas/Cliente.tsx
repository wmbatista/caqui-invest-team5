import type { ConversaCriada, Eu, MeuDinheiro, RegraPublica, RespostaChat } from '@caqui/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chamar, ErroApi } from '../api';
import { Chat, type MensagemTela } from '../componentes/Chat';
import { MeuDinheiroPainel } from '../componentes/MeuDinheiro';
import { Relogio } from '../componentes/Relogio';
import { SaidaHumano } from '../componentes/SaidaHumano';

interface Props {
  euInicial: Eu;
  aoSair: () => void;
  aoBloquear: (resposta: RespostaChat) => void;
}

export function Cliente({ euInicial, aoSair, aoBloquear }: Props) {
  const primeiroNome = (euInicial.cliente?.nome ?? euInicial.nome).split(' ')[0];
  const [eu, setEu] = useState(euInicial);
  const [dinheiro, setDinheiro] = useState<MeuDinheiro | null>(null);
  const [regras, setRegras] = useState<Record<string, RegraPublica>>({});
  const [mensagens, setMensagens] = useState<MensagemTela[]>([{
    autor: 'caqui',
    texto: `Olá, ${primeiroNome}. Aqui você confere onde está o seu dinheiro, com a data e de onde veio cada informação. Se preferir, uma pessoa atende pelo botão Falar com uma pessoa, a qualquer momento.`,
  }]);
  const conversa = useRef<Promise<string> | null>(null);

  const atualizar = useCallback(async () => {
    const [novoEu, novoDinheiro] = await Promise.all([chamar<Eu>('/eu'), chamar<MeuDinheiro>('/meu-dinheiro')]);
    setEu(novoEu);
    setDinheiro(novoDinheiro);
  }, []);

  const conversaAtual = useCallback(() => {
    conversa.current ??= chamar<ConversaCriada>('/conversas', { method: 'POST' }).then(({ id }) => id);
    return conversa.current;
  }, []);

  useEffect(() => {
    void atualizar().catch(() => undefined);
    void chamar<RegraPublica[]>('/regras')
      .then((lista) => setRegras(Object.fromEntries(lista.map((regra) => [regra.code, regra]))))
      .catch(() => undefined);
  }, [atualizar]);

  const enviar = useCallback(async (texto: string) => {
    const limpo = texto.trim();
    if (!limpo) return;
    setMensagens((atuais) => [...atuais, { autor: 'cliente', texto: limpo }]);
    const envio = async () => chamar<RespostaChat>('/chat', { method: 'POST', corpo: { conversaId: await conversaAtual(), mensagem: limpo } });
    try {
      let resposta: RespostaChat;
      try {
        resposta = await envio();
      } catch (erro) {
        // A conversa some quando o servidor reinicia: abre outra e reenvia uma vez.
        if (!(erro instanceof ErroApi) || erro.status !== 404) throw erro;
        conversa.current = null;
        resposta = await envio();
      }
      if (resposta.sessaoBloqueada) {
        aoBloquear(resposta);
        return;
      }
      setMensagens((atuais) => [...atuais, { autor: 'caqui', texto: resposta.resposta, resposta }]);
      void atualizar().catch(() => undefined);
    } catch (erro) {
      const aviso = erro instanceof ErroApi && erro.status === 429 ? erro.message : 'Não consegui responder agora. Toque em Falar com uma pessoa.';
      setMensagens((atuais) => [...atuais, { autor: 'caqui', texto: aviso }]);
    }
  }, [aoBloquear, atualizar, conversaAtual]);

  return (
    <>
      <header>
        <div className="marca"><i /> Caqui Invest</div>
        <div>Olá, <b>{primeiroNome}</b> · CPF {eu.cliente?.cpfMascarado} · <button type="button" onClick={aoSair}>Sair</button></div>
      </header>
      {eu.humano && <SaidaHumano humano={eu.humano} aoEnviar={enviar} />}
      <Relogio agora={eu.agora} aoMudar={atualizar} />
      <main>
        <section className="cartao">
          <h2>Meu dinheiro</h2>
          {dinheiro ? <MeuDinheiroPainel dados={dinheiro} /> : <p>Carregando…</p>}
        </section>
        <Chat mensagens={mensagens} regras={regras} aoEnviar={enviar} />
      </main>
    </>
  );
}
