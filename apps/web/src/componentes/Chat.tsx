import type { RespostaChat, SaidaHumano as Saida } from '@caqui/contracts';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Chips } from './Chips';
import { SaidaHumano } from './SaidaHumano';

export interface MensagemTela {
  autor: 'cliente' | 'caqui';
  texto: string;
  resposta?: RespostaChat;
}

const SUGESTOES = ['Meu dinheiro está lá?', 'Quando cai meu resgate?', 'Qual o horário de corte?'];

interface Props {
  mensagens: MensagemTela[];
  humano: Saida | null;
  /** `exibir` é o que aparece na conversa, quando difere do que vai para a API. */
  aoEnviar: (texto: string, exibir?: string) => void;
}

export function Chat({ mensagens, humano, aoEnviar }: Props) {
  const [texto, setTexto] = useState('');
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [mensagens]);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    aoEnviar(texto);
    setTexto('');
  }

  return (
    <section className="cartao chat">
      <h2>Converse com a Caqui</h2>
      <div className="msgs" ref={lista}>
        {mensagens.map((mensagem, indice) => (
          <div key={indice} className={`msg ${mensagem.autor}`}>
            <span>{mensagem.texto}</span>
            {mensagem.resposta && <Chips resposta={mensagem.resposta} />}
            {mensagem.resposta?.opcoes && (
              <div className="sugestoes">
                {mensagem.resposta.opcoes.map((opcao) => (
                  <button type="button" key={opcao.id} onClick={() => aoEnviar(opcao.id, opcao.descricao)}>{opcao.descricao}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="sugestoes">
        {SUGESTOES.map((sugestao) => <button type="button" key={sugestao} onClick={() => aoEnviar(sugestao)}>{sugestao}</button>)}
      </div>
      {humano && <SaidaHumano humano={humano} aoEnviar={aoEnviar} />}
      <form className="envio" onSubmit={enviar}>
        <input value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="Escreva sua pergunta" autoComplete="off" maxLength={2000} aria-label="Sua pergunta" />
        <button type="submit" className="primario">Enviar</button>
      </form>
    </section>
  );
}
