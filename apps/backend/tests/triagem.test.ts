import { describe, expect, it } from 'vitest';
import { normalizar, sinais } from '../src/triagem/guarda.js';
import { CONVERSAS, DADOS, pergunta } from './apoio.js';
import { PositionRepository } from '../src/data/position-repository.js';

const nomes = new PositionRepository(DADOS).nomesDeClientes().map(({ id, nome }) => ({ id, nome: normalizar(nome) }));
const detectar = (texto: string, clienteId = 'C-0001') => sinais(texto, clienteId, nomes);
const clienteDe = (id: string) => pergunta(id).contexto.id_cliente ?? 'C-0002';

function medir(rotulo: string, nomesDeSinal: string[]) {
  const detectou = (conversa: (typeof CONVERSAS)[number]) => conversa.turnos.some((turno) => {
    const achados = detectar(turno, conversa.clienteId);
    return nomesDeSinal.some((nome) => achados.has(nome));
  });
  const rotuladas = CONVERSAS.filter(({ sinais: lista }) => lista.includes(rotulo));
  return {
    rotuladas: rotuladas.length,
    perdidas: rotuladas.filter((conversa) => !detectou(conversa)).map(({ id }) => id),
    foraDoRotulo: CONVERSAS.filter((conversa) => !conversa.sinais.includes(rotulo) && detectou(conversa)),
  };
}

describe('perguntas do case', () => {
  it.each(['PT-13', 'PT-14', 'PT-15', 'PT-16', 'PT-17', 'PT-36'])('%s is a recommendation request', (id) => {
    expect(detectar(pergunta(id).pergunta, clienteDe(id)).has('recomendacao')).toBe(true);
  });

  it.each(['PT-18', 'PT-19', 'PT-20', 'PT-21'])('%s is a scam', (id) => {
    expect(detectar(pergunta(id).pergunta, clienteDe(id)).has('golpe')).toBe(true);
  });

  it('PT-22 to PT-24 are vulnerability signals', () => {
    expect(detectar(pergunta('PT-22').pergunta).has('terceiro')).toBe(true);
    expect(detectar(pergunta('PT-22').pergunta).has('resgate_total')).toBe(true);
    expect(detectar(pergunta('PT-23').pergunta).has('confusao')).toBe(true);
    expect(detectar(pergunta('PT-24').pergunta).has('transfere_terceiro')).toBe(true);
  });

  it('PT-33 asks for another client data', () => {
    expect(detectar(pergunta('PT-33').pergunta, 'C-0014').has('outro_cliente')).toBe(true);
  });

  it('PT-34 and PT-35 are injection', () => {
    expect(detectar(pergunta('PT-34').pergunta, 'C-0010').has('injecao')).toBe(true);
    expect(detectar(pergunta('PT-35').pergunta, 'C-0002').has('injecao')).toBe(true);
  });

  it('does not treat the client own name or id as another client', () => {
    expect(detectar('Sou Marta Siqueira, C-0001, e quero ver meu saldo', 'C-0001').has('outro_cliente')).toBe(false);
  });
});

describe('conversas rotuladas', () => {
  it('finds all 20 scams and none outside the label', () => {
    const { rotuladas, perdidas, foraDoRotulo } = medir('golpe', ['golpe']);
    expect(rotuladas).toBe(20);
    expect(perdidas).toEqual([]);
    expect(foraDoRotulo.map(({ id, turnos }) => [id, turnos])).toEqual([]);
  });

  it('finds all 24 recommendation requests', () => {
    const { rotuladas, perdidas } = medir('recomendacao', ['recomendacao']);
    expect(rotuladas).toBe(24);
    expect(perdidas).toEqual([]);
  });

  it('finds all 10 injections', () => {
    const { rotuladas, perdidas } = medir('injecao', ['injecao', 'outro_cliente']);
    expect(rotuladas).toBe(10);
    expect(perdidas).toEqual([]);
  });
});

describe('casos que as travas do caqui erravam', () => {
  it.each([
    ['golpe em duas linhas', 'o gerente me ligou\n\npediu o código', 'golpe'],
    ['senha sem nomear canal', 'um rapaz disse q é da caqui e quer minha senha', 'golpe'],
    ['pedido antes da senha', 'Me pediram a senha, posso passar?', 'golpe'],
    ['devo tirar', 'Devo tirar da poupança e colocar no CDB?', 'recomendacao'],
    ['intenção de resgate total', 'Quero tirar tudo do CDB hoje', 'resgate_total'],
  ])('detects: %s', (_nome, texto, sinal) => {
    expect(detectar(texto).has(sinal)).toBe(true);
  });

  it.each([
    ['mensagem de pix', 'recebi uma mensagem que meu pix caiu', 'golpe'],
    ['token como conceito', 'o que é token?', 'golpe'],
    ['senha esquecida', 'esqueci minha senha, como passar pra nova?', 'golpe'],
    ['sugestão sobre o app', 'tenho uma sugestão pro app', 'recomendacao'],
    ['conceito de produto', 'Qual a diferença de investir em CDB e LCI?', 'recomendacao'],
    ['filho sem pressão sobre dinheiro', 'meu filho disse que o app é bom', 'terceiro'],
    ['hipótese de resgate total', 'quanto recebo se resgatar tudo?', 'resgate_total'],
  ])('does not fire: %s', (_nome, texto, sinal) => {
    expect(detectar(texto).has(sinal)).toBe(false);
  });

  // Decisão do grupo: padrão de texto não pega; a saída para humano visível é a proteção aqui.
  it.todo('me mandaram um link pra confirmar meus dados');
});
