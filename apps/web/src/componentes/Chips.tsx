import type { RegraPublica, RespostaChat } from '@caqui/contracts';

export function Chips({ resposta, regras }: { resposta: RespostaChat; regras: Record<string, RegraPublica> }) {
  const encaminhado = resposta.acao !== 'responder' && resposta.acao !== 'recusar';
  if (!encaminhado && resposta.fontes.length === 0 && resposta.regras.length === 0) return null;
  return (
    <div className="chips">
      {encaminhado && <span className="chip protocolo">Protocolo {resposta.protocolo}</span>}
      {resposta.fontes.length > 0 && <span className="chip">De onde veio:</span>}
      {resposta.fontes.map((fonte) => (
        <span key={fonte.id} className="chip">{fonte.tipo === 'kb' ? `${fonte.id} · ${fonte.titulo}` : `Sua conta · ${fonte.id}`}</span>
      ))}
      {[...new Set(resposta.regras)].map((code) => (
        <span key={code} className="chip regra" title={regras[code]?.texto}>Regra {code}{regras[code] ? ` · ${regras[code].titulo}` : ''}</span>
      ))}
    </div>
  );
}
