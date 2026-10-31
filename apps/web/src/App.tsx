import type { Eu, RespostaChat } from '@caqui/contracts';
import { useCallback, useEffect, useState } from 'react';
import { chamar, definirAoPerderSessao, token } from './api';
import './caqui.css';
import { AcessoBloqueado } from './telas/AcessoBloqueado';
import { Atendente } from './telas/Atendente';
import { Cliente } from './telas/Cliente';
import { Entrada } from './telas/Entrada';

type Tela =
  | { nome: 'carregando' }
  | { nome: 'entrada' }
  | { nome: 'cliente'; eu: Eu }
  | { nome: 'atendente' }
  | { nome: 'bloqueado'; resposta: RespostaChat };

export function App() {
  const [tela, setTela] = useState<Tela>(() => (token.ler() ? { nome: 'carregando' } : { nome: 'entrada' }));

  const abrir = useCallback(async () => {
    try {
      const eu = await chamar<Eu>('/eu');
      setTela(eu.papel === 'atendente' ? { nome: 'atendente' } : { nome: 'cliente', eu });
    } catch {
      token.limpar();
      setTela({ nome: 'entrada' });
    }
  }, []);

  useEffect(() => {
    definirAoPerderSessao(() => setTela((atual) => (atual.nome === 'bloqueado' ? atual : { nome: 'entrada' })));
    if (token.ler()) void abrir();
  }, [abrir]);

  const sair = useCallback(async () => {
    await chamar('/sessoes/atual', { method: 'DELETE' }).catch(() => undefined);
    token.limpar();
    setTela({ nome: 'entrada' });
  }, []);

  const bloquear = useCallback((resposta: RespostaChat) => {
    token.limpar();
    setTela({ nome: 'bloqueado', resposta });
  }, []);

  switch (tela.nome) {
    case 'carregando':
      return <p className="login">Carregando…</p>;
    case 'entrada':
      return <Entrada aoEntrar={abrir} />;
    case 'cliente':
      return <Cliente euInicial={tela.eu} aoSair={sair} aoBloquear={bloquear} />;
    case 'atendente':
      return <Atendente aoSair={sair} />;
    case 'bloqueado':
      return <AcessoBloqueado resposta={tela.resposta} aoVoltar={() => setTela({ nome: 'entrada' })} />;
  }
}
