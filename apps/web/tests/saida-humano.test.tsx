import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cliente } from '../src/telas/Cliente';
import { apiCliente, euMarta, resposta, simularApi } from './apoio';

afterEach(() => vi.unstubAllGlobals());

const BOTOES = ['Falar com uma pessoa', 'Reclamar', 'Encerrar conta', 'Segurança'];

function montar(eu = euMarta) {
  render(<Cliente euInicial={eu} aoSair={() => {}} aoBloquear={() => {}} />);
}

describe('saída para humano', () => {
  it('shows every exit on the first render', async () => {
    simularApi(apiCliente);
    montar();
    for (const nome of BOTOES) expect(await screen.findByRole('button', { name: nome })).toBeVisible();
  });

  it('keeps every exit after a conversation turn', async () => {
    simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: 'Cai hoje.' }) });
    montar();
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByPlaceholderText('Escreva sua pergunta'), 'Quando cai?');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Cai hoje.');
    for (const nome of BOTOES) expect(screen.getByRole('button', { name: nome })).toBeVisible();
  });

  it('shows the wait inside the hours', async () => {
    simularApi(apiCliente);
    montar();
    expect(await screen.findByText(/espera cerca de 1 minuto/)).toBeVisible();
  });

  it('shows the return outside the hours', async () => {
    const fora = { ...euMarta, humano: { disponivel: false, prioridade: true, espera: null, retorno: 'a partir das 8h' } };
    simularApi({ ...apiCliente, 'GET /eu': fora });
    montar(fora);
    expect(await screen.findByText(/retornamos a partir das 8h/)).toBeVisible();
  });

  it('sends the person request through the chat', async () => {
    const api = simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: 'Um atendente vai falar com você.', acao: 'encaminhar_humano' }) });
    montar();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Falar com uma pessoa' }));
    await screen.findByText('Um atendente vai falar com você.');
    const chamada = api.mock.calls.find(([url]) => String(url).endsWith('/chat'));
    expect(JSON.parse(String(chamada?.[1]?.body)).mensagem).toBe('Quero falar com uma pessoa');
  });

  it('never renders an answer as HTML', async () => {
    simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: '<img src=x onerror=alert(1)> texto' }) });
    const { container } = render(<Cliente euInicial={euMarta} aoSair={() => {}} aoBloquear={() => {}} />);
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByPlaceholderText('Escreva sua pergunta'), 'oi');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    const mensagem = await screen.findByText(/<img src=x/);
    expect(within(mensagem).queryByRole('img')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('warns that the clock is simulated', async () => {
    simularApi(apiCliente);
    montar();
    expect(await screen.findByText(/simulado/i)).toBeVisible();
  });
});
