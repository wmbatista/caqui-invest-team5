import { chamar } from '../api';

const HORARIOS = [
  { rotulo: '18/11 10h', momento: '2026-11-18T10:00:00-03:00' },
  { rotulo: '18/11 14h', momento: '2026-11-18T14:00:00-03:00' },
  { rotulo: '18/11 23h', momento: '2026-11-18T23:00:00-03:00' },
];

/** "agora" vem como AAAA-MM-DDTHH:MM:SS-03:00; lê os campos direto para não depender do fuso do navegador. */
function formatar(agora: string): string {
  const [, ano, mes, dia, hora, minuto] = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(agora) ?? [];
  return `${dia}/${mes}/${ano} ${hora}h${minuto}`;
}

export function Relogio({ agora, aoMudar }: { agora: string; aoMudar: () => void | Promise<void> }) {
  async function mudar(momento: string) {
    await chamar('/relogio', { method: 'PUT', corpo: { momento } });
    await aoMudar();
  }
  return (
    <div className="demo">
      Relógio simulado da demonstração: <b>{formatar(agora)}</b>
      {HORARIOS.map(({ rotulo, momento }) => (
        <button type="button" key={momento} onClick={() => void mudar(momento).catch(() => undefined)}>{rotulo}</button>
      ))}
    </div>
  );
}
