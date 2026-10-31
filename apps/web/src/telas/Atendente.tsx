import type { Caso, Destino } from '@caqui/contracts';
import { useEffect, useState } from 'react';
import { chamar } from '../api';

const DESTINO: Record<Destino, string> = {
  seguranca: 'Segurança',
  humano: 'Atendimento',
  especialista: 'Especialista',
  retorno: 'Retorno às 8h',
  reclamacao: 'Reclamação',
};

export function Atendente({ aoSair }: { aoSair: () => void }) {
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  useEffect(() => {
    const carregar = () => void chamar<Caso[]>('/atendente/fila').then(setCasos).catch(() => undefined);
    carregar();
    const intervalo = setInterval(carregar, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const caso = casos?.find(({ id }) => id === selecionado);

  return (
    <>
      <header>
        <div className="marca"><i /> Caqui Invest · Atendimento</div>
        <div>Jonas · <button type="button" onClick={aoSair}>Sair</button></div>
      </header>
      <div className="fila">
        <section className="cartao">
          <h2>Fila</h2>
          <p className="fonte">Atendimento simulado. Segurança primeiro, depois prioridade e os mais recentes. Atualiza sozinha.</p>
          {casos === null && <p>Carregando…</p>}
          {casos?.length === 0 && <p>Fila vazia.</p>}
          {casos?.map((item) => (
            <button type="button" key={item.id} className={`linha caso${item.id === selecionado ? ' sel' : ''}`} onClick={() => setSelecionado(item.id)}>
              <span className={`pill${item.destino === 'seguranca' ? ' tag-seg' : ''}`}>{DESTINO[item.destino]}</span>{' '}
              {item.prioridade && <span className="pill pendente">prioridade</span>}{' '}
              <b>{item.nome}</b>, {item.idade} anos
              <span className="fonte bloco">{item.protocolo} · {item.momento} · {item.motivo}</span>
            </button>
          ))}
        </section>
        <section className="cartao">
          <h2>Caso</h2>
          {!caso && <p className="fonte">Escolha um caso: o cliente não precisa repetir nada, está tudo aqui.</p>}
          {caso && (
            <>
              <p><b>{caso.protocolo}</b> · {DESTINO[caso.destino]}</p>
              <p>{caso.resumo}</p>
              <h2>Histórico</h2>
              {caso.historico.map((mensagem, indice) => (
                <div key={indice} className={`msg ${mensagem.autor} historico`}>
                  <span>{mensagem.texto}</span>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}
