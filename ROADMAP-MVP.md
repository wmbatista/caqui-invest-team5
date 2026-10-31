# ROADMAP MVP: agente "Onde está meu dinheiro?"

O menor agente que responde bem uma única pergunta: **onde está o dinheiro do cliente**, seja o
status e o prazo de uma aplicação, resgate ou transferência, seja onde o saldo está hoje.

Versão completa (front, sessão, humano, protocolo, deploy): [ROADMAP.md](ROADMAP.md). Este MVP
reaproveita as mesmas decisões e vira a base daquela versão.

**Fontes de verdade:** `.specify/memory/constitution.md`, `specs/001-onde-esta-meu-dinheiro/spec.md`
(US1 e US2), `CASE.md` (regra 1) e `dados/README.md`.

## Escopo

**Entra:**
- Uma API `POST /perguntar` que recebe o cliente, a pergunta e (opcionalmente) o "agora", e
  devolve a resposta com as fontes.
- Status e data de liquidação das operações do cliente (US1), com prazos calculados em código.
- Posição atual do cliente: saldo em conta e investimentos (US2).
- Fontes em toda resposta factual (`KB-006`, `OP-10001`, `P-0001`).
- Uma triagem mínima: pergunta fora do escopo, pedido de recomendação e sinal de golpe recebem
  resposta fixa, sem passar pelo LLM.

**Fica de fora (está no ROADMAP.md completo):** histórico e memória da conversa, sessão e login,
protocolo, encaminhamento para humano e visão do atendente, horário de atendimento, cliente
vulnerável, limite de passos, reclamação e encerramento, front completo, deploy e controle de custo.

> ⚠️ **O MVP não pode ser publicado como está.** Na URL pública valem os itens obrigatórios do
> case: saída para humano visível, golpe com encaminhamento à segurança e cliente isolado por
> sessão. O MVP serve para validar o núcleo, que é responder certo e com fonte. Mesmo aqui, duas
> regras não se negociam: **nenhuma recomendação** e **só dados sintéticos**.

## Decisões de base

| Tema | Decisão |
| --- | --- |
| Stack | Node 22 + TypeScript + Fastify + Zod + Vitest, em `apps/backend` |
| LLM | `@anthropic-ai/sdk`, modelo em `LLM_MODEL` (padrão `claude-opus-5-5`), `effort` baixo; a chave fica em `ANTHROPIC_API_KEY` no `.env` |
| Papel do LLM | Só redige o texto a partir de fatos já calculados. Datas, valores e status vêm de código (princípio II) |
| Sem LLM | `NullProvider` responde por template; os testes rodam sem chave |
| Cliente | `id_cliente` vem no corpo da requisição. É uma simplificação do MVP: a sessão entra na T12 do roadmap completo |
| "Agora" | Padrão 18/11/2026 10h BRT; pode ser enviado na requisição para testar prazos |
| Estado | Nenhum. Cada pergunta é independente |

## Como usar em cada sessão

1. Abra uma sessão nova e diga: *"Vamos fazer a tarefa Mxx do ROADMAP-MVP.md"*.
2. O agente lê só a constituição e o que está em "Ler antes".
3. Feche a sessão quando o "Pronto quando" estiver atendido e os testes passarem.
4. Marque `[x]`, anote 1 a 3 linhas em [Notas de passagem](#notas-de-passagem) e faça o commit.

## Sequência

```
M01 → M02 ───────────────────────────┐
M01 → M03 → M04 → M05 → M06 ─────────┼→ M08 → M09 → M10 → M11 → (M12)
              M03 → M07 ─────────────┘
```

M02 e a cadeia M03 a M07 são independentes e podem ser feitas em qualquer ordem.

---

### [ ] M01: Scaffold do backend · P
- **Ler antes:** este arquivo (Decisões de base).
- **Entregas:** `package.json` raiz com workspaces; `apps/backend` com TypeScript estrito,
  Fastify, Zod, Vitest e os scripts `dev`, `build`, `test`; `GET /health`; config tipada a partir
  do `.env` (`PORT`, `DATA_DIR=../../dados`, `ANTHROPIC_API_KEY`, `LLM_MODEL`, `LLM_EFFORT`,
  `LLM_ENABLED`, `CLOCK_DEFAULT`); `.env.example` sem a chave.
- **Pronto quando:** `npm run dev` sobe, o teste de `/health` passa e o `.env` está fora do git.

### [ ] M02: Conexão com a Claude · P
- **Ler antes:** a config da M01. Use a skill `claude-api` (TypeScript) para escrever a chamada.
- **Entregas:**
  - Interface `LlmProvider` com `complete({ system, messages, maxTokens })`.
  - `ClaudeProvider`: `client.messages.create`, modelo e `effort` vindos da config, checagem de
    `stop_reason` antes de ler o texto, erros tipados e timeout curto.
  - `NullProvider`, que é usado quando `LLM_ENABLED=false` ou não há chave.
- **Pronto quando:** o teste com provider falso passa, e com a chave no `.env` um script
  `npm run llm:ping` recebe resposta.

### [ ] M03: Leitura dos dados · P
- **Ler antes:** `dados/README.md` (seção Campos) e o cabeçalho de cada arquivo.
- **Entregas:** leitores de `clientes.json`, `posicoes.csv`, `operacoes.csv`, `calendario.json` e
  `taxas.json`, carregados uma vez na subida; funções `getCliente(id)`, `getPosicoes(id)`,
  `getOperacoes(id)` e `getProduto(codigo)`, todas filtradas por cliente.
- **Pronto quando:** os testes conferem os totais (50 clientes, 146 posições, 400 operações) e
  que um cliente não recebe dados de outro.

### [ ] M04: Calendário e relógio · P
- **Ler antes:** KB-006 e a estrutura de `calendario.json`.
- **Entregas:** `ehDiaUtil`, `proximoDiaUtil`, `somarDiasUteis` e `diaBase(pedidoEm)`, com corte
  às 16h (16h00 conta como "até 16h"); `agora()` com padrão 18/11/2026 10h e fuso `-03:00`.
- **Pronto quando:** os testes cobrem sábado, o feriado de 02/11/2026, 15h59, 16h00 e 16h01.

### [ ] M05: Motor de liquidação · M (testes primeiro)
- **Ler antes:** KB-005, KB-006, KB-011, a lista de produtos em `taxas.json` e as perguntas PT-01
  a PT-05 de `dados/perguntas_teste.jsonl`.
- **Entregas:** `calcularLiquidacao(operacao)` → `{ diaBase, cotizacao?, pagamento, fonte: 'KB-006', passos[] }`
  para:
  - CDB e LCI de liquidez diária: mesmo dia útil;
  - Renda Fixa FIF: cotização em D+1 e pagamento em D+2 úteis;
  - Multimercado FIF: cotização 30 dias corridos depois do dia-base, ajustada para o próximo dia
    útil, e pagamento 2 dias úteis depois;
  - Tesouro Selic: D+1 útil;
  - Ações: D+2 úteis;
  - Produto sem liquidez diária ou LCI em carência: resgate recusado, com o motivo.
- **Pronto quando:** PT-01 a PT-05 passam como testes (a PT-04 dá 07/12/2026), e a comparação com
  as linhas de `operacoes.csv` que já têm `liquidacao_prevista` está feita, com as divergências
  anotadas.

### [ ] M06: Consultas de operações e posição · M
- **Ler antes:** KB-008, KB-009 e as interfaces da M03 e da M05.
- **Entregas:**
  - `consultarOperacoes(idCliente, agora)`: status explicado conforme KB-008, data prevista (a
    registrada ou a calculada, indicando qual), marcação de atrasada quando a data passou sem
    liquidar, e fonte `OP-xxxxx`.
  - `consultarPosicao(idCliente)`: saldo em conta e cada posição com produto, valor aplicado,
    saldo bruto, vencimento e liquidez; aviso de que o saldo é bruto; fontes `P-xxxx`.
- **Pronto quando:** os testes cobrem C-0001 (PT-03 e posição com R$ 1.250,00 em conta, P-0001 e
  P-0002) e uma operação atrasada.

### [ ] M07: Artigos da base usados no MVP · P
- **Ler antes:** os cabeçalhos dos artigos em `dados/base_conhecimento/`.
- **Entregas:** leitor de artigos com o cabeçalho; KB-007 excluído (foi substituído pelo KB-006);
  mapa de assunto para artigos: prazos → KB-006; status → KB-008; sem liquidez → KB-005 e KB-011;
  saldo bruto → KB-009; ações → KB-016; Tesouro → KB-015; produtos que a Caqui não oferece →
  KB-030; golpe → KB-019 e KB-020; recomendação → KB-029.
- **Pronto quando:** o teste garante que KB-007 nunca é retornado.

### [ ] M08: Endpoint `/perguntar` · M
- **Ler antes:** spec (US1 e US2) e as interfaces da M02, M06 e M07.
- **Entregas:**
  - `POST /perguntar { id_cliente, pergunta, agora? }` → `{ resposta, fontes[], intencao }`.
  - Fluxo: identificar a intenção por regras (`operacao`, `posicao`, `horario_corte` ou
    `fora_escopo`) → buscar os fatos (M06 e M07) → o LLM redige a resposta → o código monta as
    fontes a partir dos fatos.
  - Prompt de sistema fixo: usar só os fatos recebidos, não calcular, português simples, sem
    alarmismo, sem recomendação. A pergunta do cliente vai marcada como dado, nunca como
    instrução.
  - Se houver mais de uma operação candidata, pedir que o cliente escolha, mostrando as opções.
- **Pronto quando:** com `NullProvider`, os testes de integração passam em PT-01 a PT-05, PT-31 e
  "onde está meu dinheiro?" para C-0001; com a Claude, 3 perguntas manuais ficam registradas nas
  notas.

### [ ] M09: Triagem mínima · P
- **Ler antes:** CASE.md regras 4, 5 e 9; KB-019, KB-020, KB-029 e KB-030; PT-13 a PT-21 e PT-29
  e PT-30.
- **Entregas:** verificação feita antes da M08, por regras de texto (sem acento, sem diferença de
  maiúsculas):
  - golpe → resposta fixa de segurança (não passar código nem senha, bloquear o acesso pelo app,
    falar com a segurança) com KB-019 e KB-020, mesmo que a mensagem também pergunte sobre prazo;
  - recomendação → explicar que não indica investimento e encaminhar ao especialista (KB-029);
  - produto que a Caqui não oferece ou assunto fora do escopo → dizer que não trata o assunto,
    sem inventar.
- **Pronto quando:** as perguntas listadas recebem a resposta certa, e a PT-19 (prazo misturado
  com golpe) cai na resposta de golpe.

### [ ] M10: Conferência do texto do LLM · P
- **Ler antes:** a etapa de redação da M08.
- **Entregas:** um verificador que extrai do texto do LLM as datas e os valores em R$ e exige que
  existam nos fatos; bloqueia "recomendo", "melhor opção", "sumiu" e "perdido"; se falhar, usa a
  resposta por template e registra o caso.
- **Pronto quando:** testes com texto adulterado (data errada, valor inventado ou recomendação)
  caem no template.

### [ ] M11: Avaliação com as perguntas de teste · P
- **Ler antes:** a seção "Conferir as respostas" do `README.md`.
- **Entregas:** script `npm run avaliar` que, para as perguntas das regras 1, 4, 5 e 9 de
  `perguntas_teste.jsonl`, chama o `/perguntar` com o cliente e o momento do `contexto`, grava
  `respostas.jsonl` (com `acao`: `responder`, `encaminhar_especialista` ou `seguranca_imediata`) e
  roda `python3 ferramentas/checar_respostas.py respostas.jsonl --regras 1,4,5,9`; relatório em
  `docs/avaliacao-mvp.md` com a leitura manual das respostas que passaram.
- **Pronto quando:** o relatório está commitado e cada falha virou uma tarefa nova aqui (M11a,
  M11b...).

### [ ] M12: Forma de conversar com o agente · P · *opcional*
- **Entregas:** um CLI (`npm run perguntar -- C-0001 "cadê meu resgate?"`) **ou** uma página HTML
  estática servida pelo backend, com seletor de cliente, campo de pergunta e fontes clicáveis.
- **Pronto quando:** dá para demonstrar US1 e US2 sem usar o `curl`.

---

## Depois do MVP

Na ordem sugerida, conforme o [ROADMAP.md](ROADMAP.md): sessão e identidade (T12), humano,
horário e protocolo (T15), front (T17 a T20), custo e abuso (T23) e deploy (T24 e T25).

## Notas de passagem

| Data | Tarefa | Notas |
| --- | --- | --- |
| 2026-10-31 | Planejamento | Roadmap MVP criado a partir do ROADMAP.md: só "onde está meu dinheiro", sem histórico nem sessão. |
