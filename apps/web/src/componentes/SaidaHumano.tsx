import type { SaidaHumano as Saida } from '@caqui/contracts';

interface Props {
  humano: Saida;
  aoEnviar: (texto: string) => void;
}

/** Faixa fixa no topo: a saída fica visível em qualquer passo, mesmo com o chat rolado (FR-017). */
export function SaidaHumano({ humano, aoEnviar }: Props) {
  const status = humano.disponivel
    ? `Atendimento por pessoa agora: espera ${humano.espera}${humano.prioridade ? ' (você tem prioridade)' : ''}.`
    : `Pessoas atendem das 8h às 20h. Agora, registramos protocolo e retornamos ${humano.retorno}. Segurança: a qualquer hora.`;
  return (
    <div className="saida">
      <button type="button" className="primario" onClick={() => aoEnviar('Quero falar com uma pessoa')}>Falar com uma pessoa</button>
      <button type="button" onClick={() => aoEnviar('Quero fazer uma reclamação')}>Reclamar</button>
      <button type="button" onClick={() => aoEnviar('Quero encerrar minha conta')}>Encerrar conta</button>
      <button type="button" className="perigo" onClick={() => aoEnviar('Acho que é golpe: me pediram código e senha')}>Segurança</button>
      <span className="status">{status}</span>
    </div>
  );
}
