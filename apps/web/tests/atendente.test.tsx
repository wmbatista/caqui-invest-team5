import type { Caso } from '@caqui/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Atendente } from '../src/telas/Atendente';
import { simularApi } from './apoio';

afterEach(() => vi.unstubAllGlobals());

const caso: Caso = {
  id: 'E-1',
  protocolo: 'CQ-20261118-0001',
  destino: 'seguranca',
  prioridade: true,
  motivo: 'suspeita de golpe',
  resumo: 'Marta Siqueira (63 anos). Motivo: suspeita de golpe.',
  status: 'aberto',
  momento: '18/11 23:10',
  nome: 'Marta Siqueira',
  idade: 63,
  historico: [
    { autor: 'cliente', texto: 'Pediram minha senha <b>agora</b>', regras: [] },
    { autor: 'caqui', texto: 'Não passe nada.', acao: 'seguranca_imediata', regras: ['CQ-05'] },
  ],
};

describe('tela do atendente', () => {
  it('lists the destination, priority and protocol', async () => {
    simularApi({ 'GET /atendente/fila': [caso] });
    render(<Atendente aoSair={() => {}} />);
    expect(await screen.findByText('Segurança')).toBeVisible();
    expect(screen.getByText('prioridade')).toBeVisible();
    expect(screen.getByText(/CQ-20261118-0001/)).toBeVisible();
  });

  it('shows the summary and whole history when a case is selected', async () => {
    simularApi({ 'GET /atendente/fila': [caso] });
    render(<Atendente aoSair={() => {}} />);
    await userEvent.setup().click(await screen.findByRole('button', { name: /Marta Siqueira/ }));
    expect(screen.getByText(/Motivo: suspeita de golpe/)).toBeVisible();
    expect(screen.getByText('Não passe nada.')).toBeVisible();
    expect(screen.getByText('CQ-05')).toBeVisible();
  });

  it('shows the history as plain text', async () => {
    simularApi({ 'GET /atendente/fila': [caso] });
    const { container } = render(<Atendente aoSair={() => {}} />);
    await userEvent.setup().click(await screen.findByRole('button', { name: /Marta Siqueira/ }));
    expect(screen.getByText('Pediram minha senha <b>agora</b>')).toBeVisible();
    expect(container.querySelector('.msg b')).toBeNull();
  });

  it('shows an empty queue', async () => {
    simularApi({ 'GET /atendente/fila': [] });
    render(<Atendente aoSair={() => {}} />);
    expect(await screen.findByText('Fila vazia.')).toBeVisible();
  });
});
