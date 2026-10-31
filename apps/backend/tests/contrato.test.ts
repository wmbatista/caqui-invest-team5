import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { NullProvider } from '../src/providers/openrouter.js';

const contrato = parse(readFileSync('../../specs/001-onde-esta-meu-dinheiro/contracts/openapi.yaml', 'utf8')) as { paths: Record<string, Record<string, unknown>> };
const noContrato = Object.entries(contrato.paths)
  .flatMap(([caminho, metodos]) => Object.keys(metodos).map((metodo) => `${metodo.toUpperCase()} ${caminho}`))
  .sort();

describe('contrato', () => {
  it('matches the app routes exactly, in both directions', async () => {
    const rotas: string[] = [];
    const app = await buildApp(loadConfig({}), new NullProvider(), { aoRegistrarRota: (metodo, url) => rotas.push(`${metodo} ${url}`) });
    await app.ready();
    // O Fastify registra HEAD para cada GET, e o plugin de CORS registra OPTIONS; o contrato não os lista.
    expect(rotas.filter((rota) => !/^(?:HEAD|OPTIONS) /.test(rota)).sort()).toEqual(noContrato);
    await app.close();
  });

  it('no longer has the MVP0 endpoint', () => {
    expect(noContrato.join(' ')).not.toContain('perguntar');
  });
});
