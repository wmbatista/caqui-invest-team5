import { meuDinheiroSchema } from '@caqui/contracts';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { calcularMeuDinheiro } from '../src/atendimento/posicao.js';
import { loadConfig } from '../src/config.js';
import { NullProvider } from '../src/providers/openrouter.js';
import { AGORA_PADRAO, conversar, montar } from './apoio.js';

const ids = (resposta: { fontes: { id: string }[] }) => resposta.fontes.map(({ id }) => id);
const { repo } = montar();
const clientes = repo.nomesDeClientes().map(({ id }) => id);

function clienteComProduto(teste: (codigo: string) => boolean): string {
  return clientes.find((id) => repo.getPosicoes(id).some(({ produto }) => teste(produto))) as string;
}

describe('calcularMeuDinheiro', () => {
  it('shows every field of C-0001 positions', () => {
    const dados = meuDinheiroSchema.parse(calcularMeuDinheiro(repo, repo.getCliente('C-0001'), AGORA_PADRAO));
    expect(dados.hoje).toBe('18/11/2026');
    expect(dados.saldoEmConta).toBe('R$ 1.250,00');
    expect(dados.total).toBe('R$ 62.271,15');
    expect(dados.avisoBruto).toContain('brutos, antes do imposto');
    expect(dados.posicoes.map(({ id }) => id)).toEqual(['P-0001', 'P-0002']);
    expect(dados.posicoes[0]).toMatchObject({ valorAplicado: 'R$ 40.000,00', saldoBruto: 'R$ 40.791,24', dataAplicacao: '16/09/2026', vencimento: '05/09/2028', oscila: false });
    expect(dados.posicoes[0].liquidez).toBe('liquidez diária');
  });

  it('keeps the MVP0 reference values of C-0001', () => {
    const dados = calcularMeuDinheiro(repo, repo.getCliente('C-0001'), AGORA_PADRAO);
    const aplicado = repo.resumoPosicao('C-0001');
    expect(aplicado.totalAplicado).toBe(60000);
    expect(aplicado.saldoBrutoInvestimentos).toBe(61021.15);
    expect(dados.posicoes.map(({ valorAplicado }) => valorAplicado)).toEqual(['R$ 40.000,00', 'R$ 20.000,00']);
  });

  it('shows the LCI grace period', () => {
    const { posicoes } = calcularMeuDinheiro(repo, repo.getCliente('C-0001'), AGORA_PADRAO);
    expect(posicoes[1].texto).toContain('Em carência até 03/01/2027');
  });

  it('marks shares and Multimercado as oscillating, with no projection', () => {
    const dono = clienteComProduto((codigo) => codigo === 'ACOES' || codigo === 'FUNDO-MM-01');
    const { posicoes } = calcularMeuDinheiro(repo, repo.getCliente(dono), AGORA_PADRAO);
    const oscilantes = posicoes.filter(({ oscila }) => oscila);
    expect(oscilantes.length).toBeGreaterThan(0);
    for (const posicao of oscilantes) {
      expect(posicao.texto).toContain('pode oscilar');
      expect(posicao.texto).not.toMatch(/\brender[aá]\b|\bprojet/i);
    }
  });

  it('marks ongoing movements, the date source and a late settlement', () => {
    const marta = calcularMeuDinheiro(repo, repo.getCliente('C-0001'), AGORA_PADRAO).movimentos;
    expect(marta.find(({ id }) => id === 'OP-10005')).toMatchObject({ caiEm: '18/11/2026', emAndamento: true, atrasada: false, dataCalculada: false, pedidoEm: '17/11/2026 às 19h40' });
    expect(marta.find(({ id }) => id === 'OP-10006')).toMatchObject({ dataCalculada: true, emAndamento: false });
    const zuleica = calcularMeuDinheiro(repo, repo.getCliente('C-0027'), AGORA_PADRAO).movimentos;
    expect(zuleica.find(({ id }) => id === 'OP-10012')).toMatchObject({ atrasada: true, emAndamento: true });
  });

  it('never brings a request made after the clock', () => {
    const antes = Date.parse('2026-11-17T19:00:00-03:00');
    const { movimentos } = calcularMeuDinheiro(repo, repo.getCliente('C-0001'), antes);
    expect(movimentos.map(({ id }) => id)).not.toContain('OP-10005');
  });
});

describe('pergunta "onde está meu dinheiro?"', () => {
  it('lists balance and positions with sources for C-0001', async () => {
    const { ultima } = await conversar('C-0001', ['Onde está meu dinheiro?']);
    expect(ultima.acao).toBe('responder');
    expect(ultima.resposta).toContain('R$ 1.250,00');
    expect(ultima.resposta).toContain('R$ 40.791,24');
    expect(ultima.resposta).toContain('R$ 20.229,91');
    expect(ultima.resposta).toContain('antes do imposto');
    expect(ids(ultima)).toEqual(expect.arrayContaining(['P-0001', 'P-0002', 'C-0001', 'KB-009', 'OP-10005']));
  });

  it('matches the sums for C-0002', async () => {
    const { ultima } = await conversar('C-0002', ['Quanto eu tenho aplicado?']);
    const posicoes = repo.getPosicoes('C-0002');
    for (const { id_posicao: id } of posicoes) expect(ids(ultima)).toContain(id);
    expect(ultima.resposta).toContain(calcularMeuDinheiro(repo, repo.getCliente('C-0002'), AGORA_PADRAO).total);
  });

  it('answers "posso tirar hoje?" with the maturity date, citing KB-005', async () => {
    const dono = clienteComProduto((codigo) => codigo === 'LCA-1A-95' || codigo === 'CDB-2A-120');
    const { ultima } = await conversar(dono, ['Posso tirar hoje?']);
    expect(ultima.resposta).toContain('vencimento');
    expect(ultima.resposta).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(ids(ultima)).toContain('KB-005');
  });

  it('warns about oscillation in the chat', async () => {
    const dono = clienteComProduto((codigo) => codigo === 'ACOES');
    const { ultima } = await conversar(dono, ['Onde está meu dinheiro?']);
    expect(ultima.resposta).toContain('pode oscilar');
    expect(ids(ultima)).toContain('KB-016');
  });
});

describe('GET /api/v1/meu-dinheiro', () => {
  it('uses the session client and refuses the attendant', async () => {
    const app = await buildApp(loadConfig({}), new NullProvider());
    const entrar = async (personaId: string) => ({ authorization: `Bearer ${(await app.inject({ method: 'POST', url: '/api/v1/sessoes', payload: { personaId } })).json().token}` });
    expect((await app.inject({ method: 'GET', url: '/api/v1/meu-dinheiro' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/v1/meu-dinheiro', headers: await entrar('ATENDENTE') })).statusCode).toBe(403);
    const resposta = await app.inject({ method: 'GET', url: '/api/v1/meu-dinheiro', headers: await entrar('C-0001') });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().posicoes.map(({ id }: { id: string }) => id)).toEqual(['P-0001', 'P-0002']);
    await app.close();
  });

  it('removed the MVP0 endpoint, which took the client from the body', async () => {
    const app = await buildApp(loadConfig({}), new NullProvider());
    const resposta = await app.inject({ method: 'POST', url: '/perguntar', payload: { id_cliente: 'C-0001', pergunta: 'Quanto tenho?' } });
    expect(resposta.statusCode).toBe(404);
    await app.close();
  });
});
