import type { RespostaChat } from '@caqui/contracts';

export function AcessoBloqueado({ resposta, aoVoltar }: { resposta: RespostaChat; aoVoltar: () => void }) {
  return (
    <section className="login cartao">
      <h2>Acesso bloqueado</h2>
      <p className="msg-bloqueio">{resposta.resposta}</p>
      <p><b>Protocolo {resposta.protocolo}</b></p>
      <p className="fonte">Bloqueio simulado na demonstração: sua sessão foi encerrada em todos os aparelhos. A segurança da Caqui atende a qualquer hora, sem fila.</p>
      <button type="button" onClick={aoVoltar}>Voltar ao início</button>
    </section>
  );
}
