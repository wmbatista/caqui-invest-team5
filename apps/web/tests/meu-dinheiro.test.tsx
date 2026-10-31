import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeuDinheiroPainel } from '../src/componentes/MeuDinheiro';
import { Cliente } from '../src/telas/Cliente';
import { apiCliente, dinheiro, euMarta, resposta, simularApi } from './apoio';

afterEach(() => vi.unstubAllGlobals());

describe('Meu dinheiro', () => {
  it('shows total, account balance, positions with ids and the gross warning', () => {
    render(<MeuDinheiroPainel dados={dinheiro} />);
    expect(screen.getByText('R$ 62.271,15')).toBeVisible();
    expect(screen.getByText('R$ 1.250,00')).toBeVisible();
    expect(screen.getByText(/P-0001/)).toBeVisible();
    expect(screen.getByText(/brutos, antes do imposto/)).toBeVisible();
  });

  it('shows ongoing movements with the date and hides settled ones', () => {
    render(<MeuDinheiroPainel dados={dinheiro} />);
    expect(screen.getByText('18/11/2026', { exact: false, selector: 'b' })).toBeVisible();
    expect(screen.getByText(/OP-10005/)).toBeVisible();
    expect(screen.queryByText(/OP-10006/)).toBeNull();
  });

  it('marks a late movement and explains a refused one', () => {
    render(<MeuDinheiroPainel dados={{ ...dinheiro, movimentos: [
      { ...dinheiro.movimentos[0], atrasada: true },
      { ...dinheiro.movimentos[0], id: 'OP-2', status: 'recusada', emAndamento: false, caiEm: null, observacao: 'LCI em carência' },
    ] }} />);
    expect(screen.getByText(/atrasada/i)).toBeVisible();
    expect(screen.getByText(/LCI em carência/)).toBeVisible();
  });

  it('reloads after a chat answer', async () => {
    const api = simularApi({ ...apiCliente, 'POST /chat': resposta() });
    render(<Cliente euInicial={euMarta} aoSair={() => {}} aoBloquear={() => {}} />);
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByPlaceholderText('Escreva sua pergunta'), 'oi');
    const antes = api.mock.calls.filter(([url]) => String(url).endsWith('/meu-dinheiro')).length;
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Resposta da Caqui.');
    await vi.waitFor(() => expect(api.mock.calls.filter(([url]) => String(url).endsWith('/meu-dinheiro')).length).toBeGreaterThan(antes));
  });
});
