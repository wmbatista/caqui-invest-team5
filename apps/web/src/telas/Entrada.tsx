import type { Persona, SessaoCriada } from '@caqui/contracts';
import { useEffect, useState } from 'react';
import { chamar, token } from '../api';

export function Entrada({ aoEntrar }: { aoEntrar: () => void }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    chamar<Persona[]>('/personas').then(setPersonas).catch(() => setErro('Não consegui falar com o servidor. Tente de novo em instantes.'));
  }, []);

  async function entrar(personaId: string) {
    try {
      const sessao = await chamar<SessaoCriada>('/sessoes', { method: 'POST', corpo: { personaId } });
      token.gravar(sessao.token);
      aoEntrar();
    } catch {
      setErro('Não consegui entrar. Tente de novo.');
    }
  }

  return (
    <>
      <header><div className="marca"><i /> Caqui Invest</div></header>
      <section className="login cartao">
        <h2>Entrar</h2>
        <p className="fonte">Demonstração do Hands On: empresa, pessoas e dados são fictícios, e o login é simulado. Escolha com quem entrar.</p>
        {erro && <p role="alert">{erro}</p>}
        {personas.map((persona) => (
          <button key={persona.id} type="button" className="persona" onClick={() => void entrar(persona.id)}>
            <b>{persona.nome}</b>
            <small>{persona.descricao}</small>
          </button>
        ))}
      </section>
    </>
  );
}
