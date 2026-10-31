import { describe, expect, it } from 'vitest';
import { humanoAberto, paraHumano, saidaHumano } from '../src/atendimento/humano.js';
import { EstadoMemoria } from '../src/estado/memoria.js';

const hora = (texto: string) => Date.parse(`2026-11-18T${texto}:00-03:00`);
const cpf = ['123', '456', '789'].join('.') + '-09';
const idosa = { id: 'C-0001', nome: 'Marta Siqueira', idade: 63, origem: 'parceria_varejista' };
const jovem = { id: 'C-0002', nome: 'Rafael Okada', idade: 27, origem: 'direto' };

function contexto(cliente: typeof idosa, agora: number) {
  const estado = new EstadoMemoria(10);
  const conversa = estado.criarConversa(cliente.id, agora);
  return { estado, conversa, cliente, agora };
}

describe('horário', () => {
  it('opens at 8h00 and closes at 20h00', () => {
    expect(humanoAberto(hora('07:59'))).toBe(false);
    expect(humanoAberto(hora('08:00'))).toBe(true);
    expect(humanoAberto(hora('19:59'))).toBe(true);
    expect(humanoAberto(hora('20:00'))).toBe(false);
  });

  it('shows the wait inside the hours and the return outside', () => {
    expect(saidaHumano(idosa, hora('14:00'))).toEqual({ disponivel: true, prioridade: true, espera: 'cerca de 1 minuto', retorno: null });
    expect(saidaHumano(jovem, hora('14:00'))).toEqual({ disponivel: true, prioridade: false, espera: 'cerca de 6 minutos', retorno: null });
    expect(saidaHumano(jovem, hora('23:00'))).toEqual({ disponivel: false, prioridade: false, espera: null, retorno: 'a partir das 8h' });
  });
});

describe('paraHumano', () => {
  it('refers to a person inside the hours', () => {
    const ctx = contexto(jovem, hora('14:00'));
    const resultado = paraHumano(ctx, 'pediu uma pessoa');
    expect(resultado.acao).toBe('encaminhar_humano');
    expect(resultado.texto).toContain('cerca de 6 minutos');
    expect(resultado.texto).toContain(ctx.conversa.protocolo);
    expect(ctx.estado.fila()[0]).toMatchObject({ destino: 'humano', prioridade: false });
  });

  it('turns into a return outside the hours, without promising a person now', () => {
    const ctx = contexto(jovem, hora('23:00'));
    const resultado = paraHumano(ctx, 'pediu uma pessoa');
    expect(resultado.acao).toBe('protocolo');
    expect(resultado.texto).toContain('8h');
    expect(resultado.texto).toContain('protocolo');
    expect(resultado.texto).not.toContain('agora. Tempo');
    expect(ctx.estado.fila()[0].destino).toBe('retorno');
  });

  it('gives priority for age or a vulnerability signal', () => {
    const porIdade = contexto(idosa, hora('14:00'));
    paraHumano(porIdade, 'pediu uma pessoa');
    expect(porIdade.estado.fila()[0].prioridade).toBe(true);

    const porSinal = contexto(jovem, hora('14:00'));
    paraHumano(porSinal, 'cliente vulnerável', ['confusao']);
    expect(porSinal.estado.fila()[0].prioridade).toBe(true);
  });

  it('writes a summary with who, why, signals and the last message, masking the CPF', () => {
    const ctx = contexto(idosa, hora('14:00'));
    ctx.estado.registrarMensagem({ conversaId: ctx.conversa.id, autor: 'cliente', texto: `meu sobrinho mandou, cpf ${cpf}`, regras: [], fontes: [], momento: ctx.agora });
    paraHumano(ctx, 'cliente vulnerável', ['terceiro']);
    const { resumo } = ctx.estado.fila()[0];
    expect(resumo).toContain('Marta Siqueira');
    expect(resumo).toContain('63 anos');
    expect(resumo).toContain('cliente vulnerável');
    expect(resumo).toContain('terceiro');
    expect(resumo).toContain('meu sobrinho mandou');
    expect(resumo).not.toContain(cpf);
  });
});
