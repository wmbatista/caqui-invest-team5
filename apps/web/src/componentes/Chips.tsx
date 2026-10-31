import type { RespostaChat } from '@caqui/contracts';

/** Só o protocolo aparece abaixo da resposta. As fontes seguem na API, para rastreio, e não vão para a tela. */
export function Chips({ resposta }: { resposta: RespostaChat }) {
  if (resposta.acao === 'responder' || resposta.acao === 'recusar') return null;
  return (
    <div className="chips">
      <span className="chip protocolo">Protocolo {resposta.protocolo}</span>
    </div>
  );
}
