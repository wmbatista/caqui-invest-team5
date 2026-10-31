import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { AcessoBloqueado } from '../src/telas/AcessoBloqueado';
import { apiCliente, resposta, simularApi } from './apoio';

afterEach(() => vi.unstubAllGlobals());

describe('acesso bloqueado', () => {
  it('shows the guidance and protocol without a message field', () => {
    render(<AcessoBloqueado resposta={resposta({ resposta: 'Não passe nenhum código.', acao: 'seguranca_imediata', sessaoBloqueada: true })} aoVoltar={() => {}} />);
    expect(screen.getByText('Não passe nenhum código.')).toBeVisible();
    expect(screen.getByText(/CQ-20261118-0001/)).toBeVisible();
    expect(screen.getByText(/simulado/i)).toBeVisible();
    expect(screen.queryByPlaceholderText('Escreva sua pergunta')).toBeNull();
  });

  it('goes to the blocked screen when the API says so', async () => {
    sessionStorage.setItem('caqui_token', 'token-de-teste');
    simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: 'Não passe nenhum código.', acao: 'seguranca_imediata', sessaoBloqueada: true }) });
    render(<App />);
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByPlaceholderText('Escreva sua pergunta'), 'pediram minha senha');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByRole('heading', { name: 'Acesso bloqueado' })).toBeVisible();
    expect(screen.queryByPlaceholderText('Escreva sua pergunta')).toBeNull();
    expect(sessionStorage.getItem('caqui_token')).toBeNull();
  });
});
