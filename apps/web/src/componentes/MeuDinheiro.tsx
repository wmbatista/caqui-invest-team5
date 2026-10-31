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
      <div className="fonte">{dados.avisoBruto}</div>
      <div className="linha item">
        <span>Saldo em conta</span>
        <b>{dados.saldoEmConta}</b>
      </div>
      {dados.posicoes.map((posicao) => (
        <div className="linha" key={posicao.id}>
          <div className="item">
            <span>{posicao.produto}</span>
            <b>{posicao.saldoBruto}</b>
          </div>
          <div className="fonte">
            Aplicado {posicao.valorAplicado} em {posicao.dataAplicacao} · {posicao.liquidez}
            {posicao.vencimento ? ` · vence em ${posicao.vencimento}` : ''}
          </div>
          {posicao.observacao && <div className="observacao">{posicao.observacao}</div>}
        </div>
      ))}
      {movimentos.length > 0 && <h2 className="subtitulo">Em andamento</h2>}
      {movimentos.map((movimento) => (
        <div className="linha" key={movimento.id}>
          <span className={`pill ${movimento.status}`}>{movimento.status.replace('_', ' ')}</span>{' '}
          {movimento.atrasada && <span className="pill recusada">atrasada</span>}
          <div className="item">
            <span>{TIPO[movimento.tipo]} · {movimento.produto}</span>
            <b>{movimento.valor}</b>
          </div>
          <div>{movimento.status === 'recusada' ? movimento.observacao : <>Cai em <b>{movimento.caiEm}</b></>}</div>
          <div className="fonte">Pedido em {movimento.pedidoEm}</div>
        </div>
      ))}
    </>
  );
}
