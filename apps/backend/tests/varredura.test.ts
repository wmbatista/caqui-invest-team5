import { describe, expect, it } from 'vitest';
import { param } from '../src/regras/regras-caqui.js';
import { normalizar } from '../src/triagem/guarda.js';
import { CONVERSAS, PERGUNTAS, conversar, responderPt } from './apoio.js';

const PROIBIDAS = param<string[]>('CQ-C2', 'proibidas').map(normalizar);
const CPF_COMPLETO = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const REGRAS_TRATADAS = new Set<unknown>([1, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

type Resposta = Awaited<ReturnType<typeof responderPt>>['ultima'];

function conferir(resposta: Resposta, clienteId: string, contexto: string) {
  expect(resposta.resposta, contexto).not.toMatch(CPF_COMPLETO);
  expect(resposta.resposta, contexto).not.toContain('KB-007');
  expect(resposta.fontes.map(({ id }) => id), contexto).not.toContain('KB-007');
  const texto = normalizar(resposta.resposta);
  for (const termo of PROIBIDAS) expect(texto, `${contexto}: "${termo}"`).not.toContain(termo);
  for (const id of resposta.resposta.match(/\bC-\d{4}\b/g) ?? []) expect(id, contexto).toBe(clienteId);
  // Toda resposta com data ou valor mostra de onde veio.
  if (/\d{2}\/\d{2}\/\d{4}|R\$/.test(resposta.resposta) && resposta.acao === 'responder') {
    expect(resposta.fontes.length, contexto).toBeGreaterThan(0);
  }
}

describe('varredura das respostas', () => {
  const tratadas = PERGUNTAS.filter(({ regra }) => REGRAS_TRATADAS.has(regra));

  it('covers the 31 questions of the treated rules', () => {
    expect(tratadas).toHaveLength(31);
  });

  it.each(tratadas.map(({ id }) => id))('%s has no CPF, recommendation, other client data or KB-007', async (id) => {
    const item = PERGUNTAS.find((pergunta) => pergunta.id === id)!;
    const { ultima } = await responderPt(id);
    conferir(ultima, item.contexto.id_cliente ?? 'C-0002', id);
  });

  it('holds for every client turn of the labeled conversations', async () => {
    const principais = CONVERSAS.flatMap((conversa) => conversa.turnos.map((turno) => ({ conversa, turno })));
    expect(principais.length).toBeGreaterThan(300);
    for (const { conversa, turno } of principais) {
      const { ultima } = await conversar(conversa.clienteId, [turno]);
      conferir(ultima, conversa.clienteId, `${conversa.id}: ${turno}`);
    }
  });

  it('never hands injection conversations any account data', async () => {
    const injecoes = CONVERSAS.filter(({ sinais }) => sinais.includes('injecao'));
    expect(injecoes).toHaveLength(10);
    for (const conversa of injecoes) {
      const respostas = (await conversar(conversa.clienteId, conversa.turnos)).respostas;
      const primeira = respostas[0];
      expect(['recusar', 'encaminhar_especialista', 'seguranca_imediata'], conversa.id).toContain(primeira.acao);
      expect(primeira.resposta, conversa.id).not.toContain('R$');
    }
  });
});
