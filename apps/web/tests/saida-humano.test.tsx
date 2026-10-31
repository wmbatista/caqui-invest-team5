import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cliente } from '../src/telas/Cliente';
import { apiCliente, euMarta, resposta, simularApi } from './apoio';

afterEach(() => vi.unstubAllGlobals());

const BOTOES = ['Falar com uma pessoa', 'Reclamar', 'Encerrar conta'];

function montar(eu = euMarta) {
  render(<Cliente euInicial={eu} aoSair={() => {}} aoBloquear={() => {}} />);
}

describe('saída para humano', () => {
  it('shows every exit on the first render', async () => {
    simularApi(apiCliente);
    montar();
    for (const nome of BOTOES) expect(await screen.findByRole('button', { name: nome })).toBeVisible();
  });

  it('shows the exits inside the chat, with no security button', async () => {
    simularApi(apiCliente);
    const { container } = render(<Cliente euInicial={euMarta} aoSair={() => {}} aoBloquear={() => {}} />);
    const falar = await screen.findByRole('button', { name: 'Falar com uma pessoa' });
    expect(falar.closest('.chat')).not.toBeNull();
    expect(falar.closest('.msgs')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Segurança' })).toBeNull();
    expect(container.querySelector('header')?.textContent).not.toContain('Falar com uma pessoa');
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

  it('never shows or asks for the rules', async () => {
    const api = simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: 'Cai hoje.', fontes: [{ tipo: 'kb', id: 'KB-006', titulo: 'Prazos de resgate' }, { tipo: 'conta', id: 'OP-10005', titulo: 'Resgate de R$ 40.000,00' }] }) });
    const { container } = render(<Cliente euInicial={euMarta} aoSair={() => {}} aoBloquear={() => {}} />);
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByPlaceholderText('Escreva sua pergunta'), 'Quando cai?');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Cai hoje.');
    expect(screen.queryByText('Prazos de resgate')).toBeNull();
    expect(screen.queryByText('Resgate de R$ 40.000,00')).toBeNull();
    expect(container.textContent).not.toContain('De onde veio');
    expect(container.textContent).not.toMatch(/\bRegra\b|KB-\d|OP-\d|P-\d{4}|C-\d{4}/);
    expect(container.textContent).not.toContain('***');
    expect(api.mock.calls.some(([url]) => String(url).endsWith('/regras'))).toBe(false);
  });

  it('shows the chosen option by name, while the API receives the id', async () => {
    const api = simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: 'Qual delas?', opcoes: [{ id: 'OP-10007', descricao: 'Resgate de R$ 3.000,00 (Multimercado)' }] }) });
    const { container } = render(<Cliente euInicial={euMarta} aoSair={() => {}} aoBloquear={() => {}} />);
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByPlaceholderText('Escreva sua pergunta'), 'Quando cai?');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Resgate de R$ 3.000,00 (Multimercado)' }));
    await vi.waitFor(() => expect(container.querySelectorAll('.msg.cliente')).toHaveLength(2));
    await vi.waitFor(() => expect(api.mock.calls.filter(([url]) => String(url).endsWith('/chat'))).toHaveLength(2));
    const ultima = api.mock.calls.filter(([url]) => String(url).endsWith('/chat')).at(-1);
    expect(JSON.parse(String(ultima?.[1]?.body)).mensagem).toBe('OP-10007');
    expect(screen.queryByText('OP-10007')).toBeNull();
    expect(container.querySelectorAll('.msg.cliente')[1].textContent).toBe('Resgate de R$ 3.000,00 (Multimercado)');
  });

  it('keeps the protocol visible when the case is handed over', async () => {
    simularApi({ ...apiCliente, 'POST /chat': resposta({ resposta: 'Um atendente vai falar com você.', acao: 'encaminhar_humano' }) });
    render(<Cliente euInicial={euMarta} aoSair={() => {}} aoBloquear={() => {}} />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Falar com uma pessoa' }));
    expect(await screen.findByText('Protocolo CQ-20261118-0001')).toBeVisible();
  });

  it('warns that the clock is simulated', async () => {
    simularApi(apiCliente);
    montar();
    expect(await screen.findByText(/simulado/i)).toBeVisible();
  });
});
