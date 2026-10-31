# ROADMAP: Assistente "Onde está meu dinheiro"

Quebra da implementação em tarefas pequenas, cada uma feita numa sessão separada do agente de IA.

**Fontes de verdade (nesta ordem):**
1. `.specify/memory/constitution.md`: princípios que não se negociam
2. `specs/001-onde-esta-meu-dinheiro/spec.md`: o que construir (US, FR, SC)
3. `CASE.md` e `dados/README.md`: regras e dados do case

## Como usar este roadmap em cada sessão

1. Abra uma sessão nova e diga: *"Vamos fazer a tarefa Txx do ROADMAP.md"*.
2. O agente lê **só** o que está em "Ler antes" da tarefa, mais a constituição. Nada além disso.
3. Termine a sessão quando o item "Pronto quando" estiver atendido e os testes passarem.
4. Antes de fechar a sessão: marque `[x]` na tarefa, escreva 1 a 3 linhas em
   [Notas de passagem](#notas-de-passagem) (decisões, desvios, o que ficou pendente) e faça o commit.
5. Se a tarefa crescer demais, divida em Txxa e Txxb aqui antes de continuar.

Tamanho: **P** cabe numa sessão curta, **M** numa sessão normal. Nenhuma tarefa deve ser G.

## Decisões de base (assumidas, revisar na T01)

| Tema | Decisão | Por quê |
| --- | --- | --- |
| Estrutura | Monorepo com npm workspaces: `apps/backend`, `apps/web`, `packages/contracts` | Duas apps separadas (constituição), com tipos da API compartilhados |
| Backend | Node 22 + TypeScript + Fastify + Zod + Vitest | Node 22 já instalado; Fastify é leve; Vitest para testes primeiro |
| LLM | API da Claude via SDK oficial `@anthropic-ai/sdk`, modelo `claude-opus-5-5` (padrão), com `output_config.effort` explícito (`low` para redigir respostas de chat) e `fallbacks: "default"` ligado | Mesma configuração no local e no deploy; sem modelo para baixar nem servidor para manter |
| Credencial | `ANTHROPIC_API_KEY` (chave do Console) no `.env` local e nos segredos do provedor de deploy; nunca no front nem no git | A assinatura Pro/Max é para uso pessoal nos apps da Claude e no Claude Code, não para alimentar uma aplicação publicada para outras pessoas |
| Abstração LLM | Interface `LlmProvider` com `ClaudeProvider` (SDK) e `NullProvider` (templates, sem LLM) | Testes rodam sem chamar a API; se a chave falhar, o agente continua correto |
| Front | Vite + React + TypeScript | Scaffold rápido, deploy estático |
| Dados | Lidos de `dados/` na inicialização e mantidos em memória, somente leitura | Dados sintéticos e pequenos, sem banco |
| Estado de conversa | Em memória no backend (sessões, protocolos, casos) | Basta para a demo, sem infraestrutura extra |

> ⚠️ **URL pública com chave de API custa dinheiro a cada mensagem.** O `/chat` publicado precisa
> de limite de requisições por sessão/IP, tamanho máximo de mensagem e um limite de gasto no
> Console (T23). A resposta **nunca depende** do LLM para estar correta (princípio II): sem LLM, o
> agente responde por template.

## Visão geral e dependências

```
Fase 1 Fundação          T01 → T02 ─────────────────────────────┐
                          └→ T03 (contrato da API)              │
Fase 2 Dados e regras    T04 → T05 → T06 → T07 → T08            │
                          T04 → T09 (base de conhecimento)      │
Fase 3 Triagem           T10 (regras) → T11 (LLM, opcional)     │
Fase 4 Agente            T12 (sessão/protocolo) → T13 (orquestrador) ← T02,T08,T09,T10
                          T13 → T14 (validação de saída) → T15 (humano/horário/loop)
Fase 5 Verificação       T16 (runner das perguntas de teste) ← T15
Fase 6 Front             T17 ← T03 → T18 → T19 → T20 → T21   (pode começar em paralelo à Fase 2)
Fase 7 Publicação        T23 (custo e abuso) → T24 (deploy back) → T25 (deploy front)
Fase 8 Entrega           T26 (SPEC.md/README) → T27 (ensaio da demo)
```

**Caminho mínimo para publicar (MVP):** T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T12,
T13, T14, T15, T16, T17, T18, T19, T23, T24, T25, T26.
**Cortáveis se o tempo apertar:** T11, T20 (pode virar só um endpoint), T21, T22, T27.

---

## Fase 1: Fundação

### [ ] T01: Scaffold do backend Node · M
- **Objetivo:** estrutura do monorepo e do backend rodando, ainda sem regra de negócio.
- **Ler antes:** este roadmap (seção "Decisões de base"), constituição (seção "Restrições de
  arquitetura").
- **Entregas:**
  - `package.json` raiz com workspaces; `apps/backend` com TypeScript estrito, Fastify, Zod,
    Vitest, ESLint/Prettier, scripts `dev`, `build`, `test`, `lint`.
  - `GET /health` retornando `{ status, agora_simulado }`.
  - Config tipada a partir de `.env` (`PORT`, `DATA_DIR`, `ANTHROPIC_API_KEY`,
    `LLM_MODEL=claude-opus-5-5`, `LLM_EFFORT=low`, `LLM_ENABLED=true`,
    `CLOCK_DEFAULT=2026-11-18T10:00:00-03:00`), com `.env.example` versionado (sem a chave) e
    `.env` ignorado.
  - Logger com redator de CPF e campos sensíveis já ligado (FR-022/023).
  - Registrar as decisões de stack: rodar `/speckit-plan` de forma enxuta **ou** criar
    `specs/001-onde-esta-meu-dinheiro/plan.md` com a tabela "Decisões de base".
- **Pronto quando:** `npm run dev` sobe; `npm test` passa com um teste de `/health`; nenhum segredo
  no git.

### [ ] T02: Integração com a API da Claude · P
- **Objetivo:** o backend conversa com a Claude por trás de uma interface trocável.
- **Ler antes:** `apps/backend/src/config*`, notas da T01. Para o SDK, peça ao agente que use a
  skill `claude-api` (TypeScript), em vez de escrever o código de memória.
- **Entregas:**
  - `LlmProvider` com `complete({ system, messages, maxTokens, timeoutMs })` → texto + uso.
  - `ClaudeProvider` com `@anthropic-ai/sdk`: `client.messages.create`, modelo e `effort` vindos da
    config, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), checagem de
    `stop_reason` (`refusal`, `max_tokens`) antes de ler o conteúdo, erros tipados do SDK
    (429/5xx/conexão vs. 400) e timeout curto.
  - Sem `temperature` nem prefill (são rejeitados pelos modelos atuais).
  - `NullProvider` (sem LLM) para testes e para o fallback por template.
  - Endpoint de diagnóstico `GET /health/llm`: modelo, latência, ok/erro (sem expor a chave).
  - Timeout e erro tratados: API fora do ar ou sem chave **não** derruba o `/chat`.
- **Pronto quando:** teste unitário com provider falso passa; com `ANTHROPIC_API_KEY` no `.env`,
  `/health/llm` responde ok.

### [ ] T03: Contrato da API · P
- **Objetivo:** fixar o contrato entre front e backend para destravar o front em paralelo.
- **Ler antes:** spec (FR-001, FR-004, FR-009, FR-017 a FR-019), US1 a US4.
- **Entregas:** `packages/contracts` com schemas Zod e tipos exportados, mais `docs/api.md`:
  - `GET /clientes` (lista para o login simulado: id, nome, CPF mascarado)
  - `POST /sessao` `{ id_cliente }` → `{ token }`
  - `GET|PUT /relogio` (agora simulado)
  - `POST /chat` `{ mensagem }` + token → `{ resposta, fontes[], acao, protocolo, passo, alerta? }`
    com `acao ∈ responder | encaminhar_humano | encaminhar_especialista | seguranca_imediata |
    protocolo | recusar` (mesmos valores de `perguntas_teste.jsonl`)
  - `POST /atendimento/humano` → encaminhado ou protocolo fora do horário
  - `GET /atendente/casos` e `GET /atendente/casos/:protocolo`
- **Pronto quando:** os tipos compilam e são importáveis por `apps/backend`; endpoints existem
  com respostas fixas (stub) e validação de entrada.

---

## Fase 2: Dados e regras determinísticas (sem LLM)

### [ ] T04: Carregadores de dados · M
- **Objetivo:** ler `dados/` com tipos e acesso sempre filtrado por cliente.
- **Ler antes:** `dados/README.md` (seção Campos), cabeçalho e 3 linhas de cada arquivo.
- **Entregas:** módulo `data/` com loaders de `clientes.json`, `posicoes.csv`, `operacoes.csv`,
  `calendario.json`, `taxas.json`; repositório com `getCliente(id)`, `getPosicoes(id)`,
  `getOperacoes(id)`, `getProduto(codigo)`. **Não existe** função que liste dados de todos os
  clientes, exceto a lista de login (sem saldo).
- **Pronto quando:** os testes conferem contagens (50, 146, 400), campos vazios
  (`liquidacao_prevista`) e o isolamento entre clientes.

### [ ] T05: Calendário e relógio simulado · P
- **Objetivo:** primitivas de dia útil e de "agora".
- **Ler antes:** KB-006, `calendario.json` (estrutura), FR-004.
- **Entregas:** `ehDiaUtil`, `proximoDiaUtil`, `somarDiasUteis`, `diaBase(pedidoEm)` (corte das
  16h, com 16h00 inclusivo como "até 16h"), `Clock` injetável com padrão 18/11/2026 10h BRT e
  fuso `-03:00`.
- **Pronto quando:** testes cobrem fim de semana, feriado 02/11/2026, 15h59, 16h00, 16h01 e
  pedido de sábado.

### [ ] T06: Motor de liquidação · M (testes primeiro)
- **Objetivo:** calcular a data de liquidação por produto (FR-005), base da US1.
- **Ler antes:** KB-005, KB-006, KB-011, `taxas.json` (produtos), PT-01 a PT-05 em
  `perguntas_teste.jsonl`.
- **Entregas:** `calcularLiquidacao(operacao, produto)` → `{ diaBase, cotizacao?, pagamento,
  regra: 'KB-006', passos[] }` para CDB/LCI de liquidez diária, Renda Fixa FIF (D+1/D+2),
  Multimercado FIF (30 corridos → próximo útil → +2 úteis), Tesouro Selic (D+1), ações (D+2).
  Produtos sem liquidez ou em carência retornam "recusável" com motivo (KB-005/KB-011).
- **Pronto quando:** PT-01 a PT-05 passam como testes unitários (ex.: PT-04 → 07/12/2026), e um
  teste compara o motor com todas as linhas de `operacoes.csv` que têm `liquidacao_prevista`
  preenchida; as divergências ficam listadas nas notas.

### [ ] T07: Serviço de operações do cliente · P
- **Objetivo:** responder "cadê meu resgate" só com fatos.
- **Ler antes:** KB-008, FR-006/FR-007, interfaces da T04 e da T06.
- **Entregas:** `consultarOperacoes(idCliente, agora)` → lista com status explicado (KB-008), data
  prevista (registrada ou calculada, marcando qual), flag `atrasada` quando a data passou sem
  liquidar, fonte `OP-xxxxx`; `encontrarOperacao(idCliente, pistas)` para tipo/produto/data,
  com retorno ambíguo quando houver mais de uma candidata.
- **Pronto quando:** os testes cobrem C-0001 (PT-03), uma operação atrasada e uma ambígua.

### [ ] T08: Serviço de posição do cliente · P
- **Objetivo:** "onde está meu dinheiro hoje" (US2, FR-008).
- **Ler antes:** KB-005, KB-009, KB-011, interfaces da T04.
- **Entregas:** `consultarPosicao(idCliente)` → saldo em conta, posições com produto, aplicado,
  saldo bruto, vencimento, liquidez/carência, aviso "saldo bruto" e oscilação para
  ações/multimercado; fontes `P-xxxx` e `C-xxxx`.
- **Pronto quando:** o teste de C-0001 retorna R$ 1.250,00 em conta, P-0001 e P-0002.

### [ ] T09: Base de conhecimento · P
- **Objetivo:** artigos vigentes, citáveis por id.
- **Ler antes:** cabeçalho de 3 artigos da `dados/base_conhecimento/`, FR-009/FR-010.
- **Entregas:** loader com front-matter; lista `SUBSTITUIDOS = { 'KB-007': 'KB-006' }` excluída;
  `getArtigo(id)`; mapa estático `assunto → artigos` (prazos, status, golpe, recomendação, humano,
  protocolo, encerramento, idoso, produtos não oferecidos). Não é preciso busca semântica.
- **Pronto quando:** o teste garante que KB-007 nunca é retornado e que os 29 artigos vigentes
  carregam.

---

## Fase 3: Triagem

### [ ] T10: Triagem por regras · M (testes primeiro)
- **Objetivo:** detectar sinais que mudam o fluxo antes de qualquer resposta (FR-012 a FR-016).
- **Ler antes:** CASE.md regras 4, 5, 6, 7, 11; KB-019, KB-020, KB-028, KB-029; PT-13 a PT-28 e
  PT-33 a PT-36.
- **Entregas:** `triar(mensagem, cliente, historico)` →
  `{ sinal: golpe | recomendacao | vulneravel | injecao | pede_humano | reclamacao | encerramento | nenhum, evidencias[] }`
  com prioridade golpe > vulnerável > injeção > recomendação > demais. Padrões normalizados
  (acentos, caixa) e uso de idade ≥ 60, terceiros ("meu sobrinho/filho mandou"), "tudo/total".
  Teste extra: rodar sobre `conversas.csv` e medir acerto contra a coluna `sinais`.
- **Pronto quando:** todas as perguntas de teste listadas têm o sinal certo; a precisão sobre
  `conversas.csv` fica registrada nas notas.

### [ ] T11: Triagem com LLM como segunda camada · P · *opcional*
- **Objetivo:** pegar paráfrases que as regras não pegam, sem nunca afrouxar a triagem.
- **Ler antes:** interfaces da T02 e da T10.
- **Entregas:** classificador por LLM com saída estruturada (`output_config.format` com schema
  Zod), chamado só quando a regra retorna `nenhum`; se houver erro ou timeout, fica `nenhum`. A
  regra **sempre** vence o LLM.
- **Pronto quando:** existe teste com provider falso e o ganho medido em `conversas.csv` está
  anotado.

---

## Fase 4: Agente

### [ ] T12: Sessão, protocolo e histórico · P
- **Objetivo:** identidade pela sessão e caso rastreável (FR-001, FR-002, FR-019).
- **Ler antes:** contrato (T03), FR-001/002/019/022/023.
- **Entregas:** store em memória de sessões (token → id_cliente) e casos (protocolo `CQ-AAAAMMDD-NNNN`,
  mensagens, sinais, passos, contagem de "não entendi", destino); `/clientes`, `/sessao` e
  `/relogio` reais; log sem texto cru de mensagem.
- **Pronto quando:** o teste mostra que trocar `id_cliente` no corpo do `/chat` não muda o cliente
  da sessão, e que o log não contém CPF nem mensagem crua.

### [ ] T13: Orquestrador do chat · M
- **Objetivo:** `/chat` de ponta a ponta para US1 e US2.
- **Ler antes:** spec US1/US2, interfaces das T02, T07 a T10 e T12.
- **Entregas:** pipeline `triagem → intenção (operacao | posicao | horario_corte | fora_escopo |
  nao_entendi) → fatos determinísticos → redação → resposta`. A intenção vem por regras com o LLM
  como apoio. A redação usa o LLM com prompt de sistema fixo (cacheável) que recebe **somente** os
  fatos e os trechos de KB, proíbe calcular e exige português simples; a mensagem do cliente vai
  delimitada como dado, nunca como instrução (regra 11); com `NullProvider`, usa templates.
  Fontes vêm dos fatos, nunca do texto do LLM. Fora de escopo → "não trato isso" + oferta de humano.
- **Pronto quando:** testes de integração com `NullProvider` passam em PT-01 a PT-05, PT-29 a
  PT-31 e US2 cenário 1; com o `ClaudeProvider`, um teste manual de 3 perguntas fica registrado.

### [ ] T14: Validação da saída do LLM · P
- **Objetivo:** o LLM não consegue introduzir fato errado (princípio II).
- **Ler antes:** T13 (redação), FR-006, FR-009, regra 4.
- **Entregas:** verificador que extrai datas, valores em R$ e percentuais do texto do LLM e exige
  que existam nos fatos; bloqueia termos de recomendação ("recomendo", "melhor opção", "eu
  investiria") e alarmistas ("sumiu", "perdido"); se falhar, cai no template e registra o evento.
- **Pronto quando:** testes com textos adulterados (data errada, valor inventado, recomendação)
  caem no template.

### [ ] T15: Humano, horário, doom loop, reclamação e encerramento · M
- **Objetivo:** US4 completa e os destinos da triagem ligados (FR-013, FR-017 a FR-021).
- **Ler antes:** KB-025 a KB-028, CASE.md regras 7, 8 e 12, PT-25 a PT-28, PT-37, PT-38.
- **Entregas:** `/atendimento/humano` e ações da triagem: 8h–20h encaminha; fora disso, protocolo
  com retorno a partir das 8h; segurança a qualquer hora, com bloqueio de sessão simulado;
  especialista com agendamento simulado; prioridade para ≥ 60 e vulnerável; oferta de humano após
  2 "não entendi"; limite de 5 passos; reclamação com protocolo e prazo de 7 dias; encerramento
  com passos de KB-027 e no máximo 1 retenção; resumo do caso gerado de forma determinística.
- **Pronto quando:** os testes das perguntas listadas passam às 14h e às 23h.

---

## Fase 5: Verificação

### [ ] T16: Runner das perguntas de teste · P
- **Objetivo:** gerar `respostas.jsonl` e rodar o checador oficial.
- **Ler antes:** `README.md` (seção "Conferir as respostas"), `ferramentas/checar_respostas.py`
  (só o uso).
- **Entregas:** script `npm run avaliar` que, para cada pergunta, cria sessão com o cliente do
  `contexto` (ou um cliente neutro), ajusta o relógio para o `momento`, envia a pergunta (e os
  turnos separados por ` | `, no caso da PT-27) e grava `{id, resposta, acao}`; depois roda
  `python3 ferramentas/checar_respostas.py respostas.jsonl --regras 1,4,5,6,7,8,9,10,11,12`.
  Gerar também um relatório para leitura manual contra `resposta_esperada`.
- **Pronto quando:** o relatório está commitado em `docs/avaliacao.md`, com as falhas abertas como
  tarefas novas aqui (ex.: T16a, T16b) e a leitura manual das aprovadas registrada.

---

## Fase 6: Front (pode começar após a T03, em paralelo à Fase 2)

### [ ] T17: Scaffold do front · P
- **Ler antes:** contrato (T03), constituição (seções V e VI).
- **Entregas:** `apps/web` com Vite + React + TS, tokens de cor e tipografia (claro e escuro),
  cliente HTTP tipado com `packages/contracts`, `VITE_API_URL`, layout com cabeçalho Caqui
  (fictícia) e **área fixa do botão "Falar com uma pessoa"** já reservada.
- **Pronto quando:** a app sobe e mostra o status de `/health`.

### [ ] T18: Login simulado e relógio · P
- **Entregas:** tela para escolher um cliente sintético (nome + CPF mascarado; destacar as
  personas Dona Marta, Rafael e Camila); controle do "agora" simulado com atalhos 10h, 15h59,
  16h01 e 23h; indicação visível de "dados fictícios".
- **Pronto quando:** a sessão é criada, o relógio é alterado e o estado persiste ao recarregar
  (localStorage protegido por try/catch).

### [ ] T19: Tela de chat · M
- **Entregas:** lista de mensagens, campo de envio, indicador de carregamento, erro amigável;
  **fontes como chips** (`KB-006`, `OP-10001`, `P-0001`) com o conteúdo ao clicar; cartões
  especiais por `acao`: alerta de segurança (bloqueio simulado), encaminhado a especialista,
  encaminhado a humano (com tempo estimado), protocolo fora do horário.
- **Pronto quando:** as US1 a US3 funcionam na tela contra o backend local.

### [ ] T20: Botão de humano e visão do atendente · M
- **Entregas:** botão "Falar com uma pessoa" visível em todas as telas e estados (FR-017); tela
  `/atendente` listando casos com protocolo, cliente (CPF mascarado), sinais, prioridade, resumo e
  histórico (FR-019).
- **Pronto quando:** pedir humano às 14h e às 23h mostra o comportamento certo e o caso aparece
  na visão do atendente sem o cliente repetir nada.

### [ ] T21: Acabamento para a Dona Marta · P · *opcional*
- **Entregas:** linguagem e tamanho de fonte confortáveis, contraste AA, layout em celular (360px),
  navegação por teclado, estados vazios. Pode usar a skill `impeccable` para uma revisão.
- **Pronto quando:** a checagem de acessibilidade básica passa e a tela fica legível no celular.

### [ ] T22: Telemetria mínima da demo · P · *opcional*
- **Entregas:** contadores em memória (resolvidos sem humano, por destino, por sinal) expostos
  na visão do atendente, servindo de base para a conta de impacto do SPEC.md.

---

## Fase 7: Publicação

### [ ] T23: Custo e abuso na URL pública · P
- **Objetivo:** a chave de API exposta indiretamente pelo `/chat` público não vira conta alta.
- **Entregas:** limite de requisições por sessão e por IP no `/chat`; tamanho máximo de mensagem;
  teto de chamadas ao LLM por conversa (coerente com o limite de 5 passos); limite de gasto
  configurado no Console da Anthropic; chave separada para produção; interruptor
  `LLM_ENABLED=false` que deixa o app só com templates; decisão registrada em "Decisões" do
  SPEC.md.
- **Pronto quando:** um teste mostra o 429 do próprio backend ao passar do limite e o app
  funcionando com `LLM_ENABLED=false`.

### [ ] T24: Deploy do backend · P
- **Entregas:** backend publicado (Render, Fly ou Railway), `dados/` empacotado no build, CORS
  restrito à URL do front, segredos só no painel do provedor, inspeção dos logs publicados
  (regra 10: sem CPF nem conversa crua).
- **Pronto quando:** `/health` responde na URL pública e o `npm run avaliar` roda apontando para
  ela.

### [ ] T25: Deploy do front · P
- **Entregas:** front publicado (Vercel ou Netlify) com `VITE_API_URL` da T24; smoke test das
  US1 a US4 na URL pública.
- **Pronto quando:** as duas URLs estão no topo do README.

---

## Fase 8: Entrega

### [ ] T26: SPEC.md, README e "Como usamos IA" · P
- **Ler antes:** `templates/SPEC.md`, `templates/COMO-USAMOS-IA.md`, spec do spec-kit,
  `docs/avaliacao.md`, Notas de passagem.
- **Entregas:** `SPEC.md` na raiz com as seis perguntas, a conta de impacto à mostra (base:
  12.960 contatos/mês, 1.728 h, 34% de recontato) e a tabela de regras; README com URLs e a seção
  "Como usamos IA" (spec-kit, grill-me, skills, o que foi verificado à mão, **um erro da IA que o
  grupo percebeu**).

### [ ] T27: Ensaio da demo · P · *opcional*
- **Entregas:** roteiro de 3 a 5 minutos: Dona Marta ("cadê meu resgate?" e "meu sobrinho
  mandou"), Rafael (corte das 16h), golpe no meio da pergunta, pedido de humano às 23h e o erro
  da IA percebido pelo grupo.

---

## Notas de passagem

Registro curto por sessão: tarefa, decisões, desvios e pendências. Mais recentes no topo.

| Data | Tarefa | Notas |
| --- | --- | --- |
| 2026-10-31 | Planejamento | LLM trocada de local (`llama-server`) para a API da Claude (`@anthropic-ai/sdk`, `claude-opus-5-5`). A assinatura pessoal não serve para o app publicado; é preciso uma chave do Console. |
| 2026-10-31 | Planejamento | Constituição v1.0.0 e spec 001 criadas com spec-kit. Node 22.23 disponível. |
