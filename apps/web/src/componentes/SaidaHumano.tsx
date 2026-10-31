import type { SaidaHumano as Saida } from '@caqui/contracts';

interface Props {
  humano: Saida;
  aoEnviar: (texto: string) => void;
}

/** Opções fixas do chat, fora da área que rola: a saída fica visível em qualquer passo (FR-017). */
export function SaidaHumano({ humano, aoEnviar }: Props) {
  const status = humano.disponivel
    ? `Atendimento por pessoa agora: espera ${humano.espera}${humano.prioridade ? ' (você tem prioridade)' : ''}.`
    : `Pessoas atendem das 8h às 20h. Agora, registramos protocolo e retornamos ${humano.retorno}. Segurança: a qualquer hora.`;
  return (
    <div className="saida">
      <div className="sugestoes">
        <button type="button" className="primario" onClick={() => aoEnviar('Quero falar com uma pessoa')}>Falar com uma pessoa</button>
        <button type="button" onClick={() => aoEnviar('Quero fazer uma reclamação')}>Reclamar</button>
        <button type="button" onClick={() => aoEnviar('Quero encerrar minha conta')}>Encerrar conta</button>
      </div>
      <span className="status">{status}</span>
    </div>
  );
}
