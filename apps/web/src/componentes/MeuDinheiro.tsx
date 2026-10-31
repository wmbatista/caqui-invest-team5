import type { MeuDinheiro, Movimento } from '@caqui/contracts';

const TIPO: Record<Movimento['tipo'], string> = {
  resgate: 'Resgate',
  aplicacao: 'Aplicação',
  transferencia_saida_pix: 'Transferência enviada',
  transferencia_entrada: 'Transferência recebida',
};

export function MeuDinheiroPainel({ dados }: { dados: MeuDinheiro }) {
  const movimentos = dados.movimentos.filter(({ emAndamento, status }) => emAndamento || status === 'recusada').slice(0, 6);
  return (
    <>
      <div className="fonte">Hoje, {dados.hoje}</div>
      <div className="total">{dados.total}</div>
      <div className="fonte">{dados.avisoBruto} Dados da sua conta.</div>
      <div className="linha">Saldo em conta: <b>{dados.saldoEmConta}</b></div>
      {dados.posicoes.map((posicao) => (
        <div className="linha" key={posicao.id}>
          {posicao.texto} <span className="fonte">· {posicao.id}</span>
        </div>
      ))}
      {movimentos.length > 0 && <h2 className="subtitulo">Em andamento</h2>}
      {movimentos.map((movimento) => (
        <div className="linha" key={movimento.id}>
          <span className={`pill ${movimento.status}`}>{movimento.status.replace('_', ' ')}</span>{' '}
          {movimento.atrasada && <span className="pill recusada">atrasada</span>}{' '}
          {TIPO[movimento.tipo]} de <b>{movimento.valor}</b> · {movimento.produto}
          <br />
          {movimento.status === 'recusada' ? movimento.observacao : <>Cai em <b>{movimento.caiEm}</b></>}{' '}
          <span className="fonte">· pedido em {movimento.pedidoEm} · {movimento.id}</span>
        </div>
      ))}
    </>
  );
}
