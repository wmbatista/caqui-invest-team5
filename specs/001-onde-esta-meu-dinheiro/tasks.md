---

description: "Tarefas do porte do Caqui Confere para o assistente Onde está meu dinheiro"
---

# Tasks: Assistente "Onde está meu dinheiro"

**Input**: `specs/001-onde-esta-meu-dinheiro/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`)

**Prerequisites**: Node 22 e `npm ci`. Código de origem do porte em `../caqui`, somente leitura. Python 3.9+ só para o checador.

**Tests**: incluídos, porque são obrigatórios. O princípio VII da constituição exige teste por regra tratada e motor de liquidação com testes primeiro, e FR-025 pede a resposta em lote. Escreva cada teste antes da implementação e veja-o falhar.

**Organization**: as tarefas estão agrupadas por história. As três histórias P1 empatam em prioridade, e **US3 vem primeiro**: as proteções são inegociáveis (princípio IV), corrigem as falhas críticas medidas em `main` e são testáveis sem o motor de prazos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1 a US4)
- Caminhos relativos à raiz do repositório. `../caqui` é o projeto de origem

## Regras para todas as tarefas

- Não altere `dados/` nem `ferramentas/checar_respostas.py`.
- Nenhum PostgreSQL, SQL ou serviço externo obrigatório. Os testes rodam sem chave e sem rede.
- Não traga do caqui: `db/`, `requirements.txt`, referências a Eugênio, IRP, clone ou André, nem `_ir`, `_compara_poupanca`, `_conceito` e `busca_kb`.
- Valores de `acao` são exatamente os de `perguntas_teste.jsonl`: `responder`, `encaminhar_humano`, `encaminhar_especialista`, `seguranca_imediata`, `protocolo`, `recusar`.
- Armadilhas de tradução de Python para TypeScript: ver `research.md`, R16.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: monorepo com três workspaces, leitura do `.env` e trava de commit

- [X] T001 Em `package.json`, incluir `packages/*` nos workspaces, adicionar `concurrently` como dependência de desenvolvimento e fazer `dev` subir backend e web juntos; `build`, `test`, `typecheck` e `check` compilam `@caqui/contracts` primeiro e depois rodam nos três workspaces; adicionar `avaliar`; manter `llm:ping` e o override de `toad-cache` em `3.3.0`
- [X] T002 [P] Criar `packages/contracts/package.json` e `packages/contracts/tsconfig.json` (pacote `@caqui/contracts`, ESM, TypeScript estrito, saída em `dist` com declarações, dependência `zod`) e um `packages/contracts/src/index.ts` provisório
- [X] T003 [P] Criar o workspace `apps/web` com Vite, React e TypeScript estrito (`@caqui/web`): `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts` na porta 5173, `apps/web/index.html` com `lang="pt-BR"` e `apps/web/src/main.tsx`; incluir Vitest, Testing Library e jsdom; scripts `dev`, `build`, `typecheck`, `test` e `check`
- [X] T004 [P] Em `apps/backend/package.json`, adicionar a dependência `@caqui/contracts`, `yaml` como dependência de desenvolvimento e carregar o `.env` da raiz: `dev` com `tsx watch --env-file-if-exists=../../.env src/server.ts`, `start` com `node --env-file-if-exists=../../.env dist/src/server.js` e o mesmo em `llm:ping` (hoje o `.env` não é lido; `research.md`, R13)
- [X] T005 [P] Atualizar `.env.example` com `CHAT_LIMITE_POR_MINUTO=30` e `ESTADO_MAX_CONVERSAS=2000`, e criar `apps/web/.env.example` com `VITE_API_URL=http://localhost:3000`
- [X] T006 [P] Copiar `../caqui/ferramentas/hooks/pre-commit` para `ferramentas/hooks/pre-commit`, mantendo o bloqueio de CPF completo e de chave, e garantir final de linha LF no `.gitattributes`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contrato, dados, estado, sessão, passagem a humano, verificação do LLM e o fluxo do chat com o front mínimo

**⚠️ CRITICAL**: nenhuma história começa antes desta fase. O endpoint `POST /perguntar` continua existindo até a T047.

### Contrato e utilitários

- [X] T007 Implementar em `packages/contracts/src/index.ts` os schemas Zod e tipos de `specs/001-onde-esta-meu-dinheiro/contracts/openapi.yaml`, com objetos estritos que rejeitam campos desconhecidos: `mensagem` com "1 a 2000 caracteres após `trim`"; `conversaId` UUID; `momento` ISO 8601 válido; `personaId` string; enums `Acao`, `Destino`, `Papel` e `Erro.code`
- [X] T008 [P] Escrever `apps/backend/tests/formato.test.ts`: `brl()` devolve `R$ 1.250,00` com espaço normal, sem NBSP; soma por centavos; `31/02` lança `DataInvalida`; dia da semana com segunda = 0; módulo nunca negativo; hora em -03:00 independente do fuso da máquina
- [X] T009 [P] Implementar `apps/backend/src/atendimento/formato.ts`: `DataISO` como `AAAA-MM-DD`, aritmética em UTC, fuso fixo em -03:00, `brl()` próprio sem `Intl`, `dataBr()`, `horaBr()`, `somarCentavos()`, `DataInvalida` (`research.md`, R4 e R16)
- [X] T010 [P] Escrever `apps/backend/tests/mascara.test.ts`: `normalizar` remove acento, passa para minúsculas, remove todo não ASCII e reúne espaços e quebras de linha; `mascararCpf` troca CPF com e sem pontuação por `***.***.***-**`
- [X] T011 [P] Criar `apps/backend/src/triagem/guarda.ts` com `normalizar` (NFKD, remoção de `[^\x00-\x7f]`, espaços reunidos) e `mascararCpf`, a partir de `../caqui/app/guarda.py`; os padrões entram na T033
- [X] T012 [P] Criar `apps/backend/src/regras/regras-caqui.ts` a partir de `../caqui/db/02_regras_caqui.sql`, como módulo tipado com `code`, `titulo`, `camada` (`CONSTITUICAO`, `LEI`, `DECRETO`), `texto`, `instrucaoIa?`, `parametros`, nesta ordem de hierarquia: as 17 regras CQ-C1 a CQ-C6, CQ-01, CQ-04 a CQ-12 e CQ-D1, sem CQ-02 e CQ-03; retirar citações a Eugênio, clone e André; parâmetros `corte`, `abre` (`08:00`), `fecha` (`20:00`), `idade_prioridade` (60), `max_nao_entendidas` (2), `max_passos` (5), `prazo_dias` (7), `pct_investido` (0.5), `valor_minimo` (20000), `proibidas` e `espera_*` (`cerca de 1 minuto` e `cerca de 6 minutos`, marcados como simulados); exportar `param()`, `vigentes()` e `promptDeRegras()`
- [X] T013 [P] Atualizar `apps/backend/src/config.ts` e `apps/backend/tests/config.test.ts` com `CHAT_LIMITE_POR_MINUTO` (padrão 30) e `ESTADO_MAX_CONVERSAS` (padrão 2000)

### Dados

- [X] T014 Ampliar `apps/backend/tests/position-repository.test.ts`: 50 clientes, 146 posições, 400 operações, 10 produtos, 29 artigos, KB-007 ausente, `liquidacao_prevista` vazia lida como nula, consultas de um cliente nunca trazem dado de outro, e o caso de referência de C-0001 continua igual
- [X] T015 Ampliar `apps/backend/src/data/position-repository.ts` para carregar também `operacoes.csv`, `calendario.json`, `taxas.json` e `base_conhecimento/KB-*.md` na subida, com validação Zod por registro e erro claro; **não carregar KB-007**; expor `getCliente`, `getPosicoes`, `getOperacoes` (só com `pedido_em <= agora`), `getProduto`, `getArtigo`, `getCalendario`, `getTaxas` e `nomesDeClientes()` (id e nome, sem saldo, único acesso além do filtrado por cliente); manter `resumoPosicao`

### Estado, sessão e humano

- [X] T016 [P] Escrever `apps/backend/tests/estado.test.ts`: protocolo no formato `CQ-AAAAMMDD-NNNN` com a data do relógio; CPF enviado nunca fica guardado cru; conversa de outro cliente não é encontrada; encaminhamentos só crescem; fila com segurança primeiro, depois prioridade, depois mais recente, até 50; `ESTADO_MAX_CONVERSAS` remove as mais antigas sem encaminhamento
- [X] T017 [P] Implementar `apps/backend/src/estado/memoria.ts` conforme `data-model.md`: interface e implementação em memória de Conversa (`id`, `protocolo`, `clienteId`, `passos`, `naoEntendidas`, `chamadasLlm`, `criadaEm`), Mensagem (`autor` `cliente` ou `caqui`) e Encaminhamento (`destino` em `humano`, `seguranca`, `especialista`, `retorno`, `reclamacao`; `status` sempre `aberto`); `texto` passa por `mascararCpf` antes de guardar
- [X] T018 [P] Escrever `apps/backend/tests/sessoes.test.ts`: persona fora da lista é rejeitada; token aleatório; expira com "24 h de idade ou 8 h ociosa"; relógio próprio por sessão com padrão `CLOCK_DEFAULT`; encerrar todas as sessões de um cliente
- [X] T019 [P] Implementar `apps/backend/src/sessao/personas.ts` (C-0001, C-0002, C-0003, C-0014, C-0027 e o atendente Jonas, sem senha) e `apps/backend/src/sessao/sessoes.ts` (sessão por token em memória, com `papel`, `clienteId`, `agora`, `criadaEm`, `usadaEm`)
- [X] T020 Escrever `apps/backend/tests/humano.test.ts`: 7h59 fechado, 8h00 aberto, 19h59 aberto, 20h00 fechado; `prioridade` verdadeira com `idade >= 60`, destino `seguranca` ou sinal de vulnerabilidade; fora do horário `humano` vira `retorno`; `resumo` traz quem é, motivo, sinais e última mensagem, com CPF mascarado
- [X] T021 Implementar `apps/backend/src/atendimento/humano.ts` a partir de `humano_aberto`, `saida_humano`, `abre_atendimento` e `_para_humano` de `../caqui/app/assistente.py`, lendo horário e espera de `regras-caqui.ts`; a resposta devolve texto, ação (`encaminhar_humano` ou `protocolo`) e protocolo da conversa

### Redação pelo LLM

- [X] T022 [P] Escrever `apps/backend/tests/redacao.test.ts`: cai no template com data errada, valor inventado (inclusive `R$ 5 mil` e `R$ 999.999`), id desconhecido, "recomendo", "melhor opção para você", "sumiu", "perdido", CPF completo, erro ou timeout do provedor, `NullProvider`; o texto válido passa e devolve `geradoPor: "llm"`; a mensagem chega ao provedor com CPF mascarado e marcada como dado; máximo de 5 chamadas por conversa
- [X] T023 [P] Implementar `apps/backend/src/redacao/verificador.ts` e `apps/backend/src/redacao/redator.ts` (`research.md`, R7), generalizando `hasOnlyKnownCurrencyValues` de `apps/backend/src/services/perguntar.ts`; usar a interface `LlmProvider` existente; system prompt com `promptDeRegras()`; qualquer falha devolve o template, sem erro HTTP

### Fluxo do chat e API

- [X] T024 Criar `apps/backend/src/atendimento/assistente.ts` com `responder({ clienteId, conversaId, mensagem, agora })`: mascara CPF, grava a mensagem do cliente, roda a triagem, escolhe o fluxo, conta `passos`, grava a resposta e devolve o formato `RespostaChat`; conversa inexistente ou de outro cliente lança `ConversaNaoEncontrada`; cada fluxo fica numa função injetável, e sinal desconhecido segue para "não entendi", com as frases e a contagem de `naoEntendidas` de `_decide` em `../caqui/app/assistente.py`
- [X] T025 Substituir o chat antigo em `apps/backend/src/app.ts`, com rotas em `apps/backend/src/routes/` (`sessao.ts`, `chat.ts`, `regras.ts`): `GET /api/v1/personas`, `POST /api/v1/sessoes`, `DELETE /api/v1/sessoes/atual`, `GET /api/v1/eu`, `PUT /api/v1/relogio`, `POST /api/v1/conversas`, `POST /api/v1/chat`, `GET /api/v1/regras`, com erros do contrato (400, 401, 403, 404, 429); limitador próprio por IP com `CHAT_LIMITE_POR_MINUTO`; o cliente vem sempre do token; ajustar a redação do logger para `req.headers.authorization` e `body.mensagem`; apagar `apps/backend/src/domain/chat.ts` e `apps/backend/src/services/chat.ts`, reescrever `apps/backend/tests/chat.test.ts` para cobrir: sem token 401, atendente no chat 403, conversa de outro cliente 404, `clienteId` no corpo 400, mensagem com 2001 caracteres 400, limite 429; ajustar `apps/backend/tests/health.test.ts` e `apps/backend/src/server.ts`

### Front mínimo

- [X] T026 Criar `apps/web/src/api.ts` (cliente HTTP tipado com `@caqui/contracts`, `VITE_API_URL`, token em `sessionStorage`, 401 volta à entrada) e copiar `../caqui/static/caqui.css` para `apps/web/src/caqui.css`
- [X] T027 [P] Escrever `apps/web/tests/saida-humano.test.tsx`: **Falar com uma pessoa**, reclamar, encerrar e segurança aparecem em todo estado da tela do cliente; o status mostra espera das 8h às 20h e retorno fora disso; nenhuma resposta é renderizada como HTML
- [X] T028 Implementar `apps/web/src/App.tsx`, `apps/web/src/telas/Entrada.tsx`, `apps/web/src/telas/Cliente.tsx`, `apps/web/src/componentes/SaidaHumano.tsx`, `apps/web/src/componentes/Relogio.tsx`, `apps/web/src/componentes/Chat.tsx` e `apps/web/src/componentes/Chips.tsx`, a partir de `../caqui/static/index.html`: personas de `GET /personas`, faixa fixa de saída, relógio em 10h, 14h e 23h com aviso de que é simulado, chips de fonte, regra e protocolo, letra grande

**Checkpoint**: entrar como persona, abrir conversa e receber "não entendi" pela tela. **Nada pode ser publicado antes do fim da US3.**

---

## Phase 3: User Story 3 - Proteções que interrompem o fluxo (Priority: P1) 🎯 MVP

**Goal**: golpe, recomendação, vulnerável, injeção e dados de terceiros mudam o fluxo antes de qualquer resposta, sem chamar o LLM.

**Independent Test**: PT-13 a PT-24 e PT-32 a PT-36 com a ação esperada, nenhum valor ou dado de terceiro na resposta, provedor nunca chamado, e `conversas.csv` com golpe em 20 de 20 e recomendação em 24 de 24.

### Tests for User Story 3 ⚠️

> Escreva primeiro e confirme que falham.

- [X] T029 [P] [US3] Escrever `apps/backend/tests/triagem.test.ts`: PT-13 a PT-24 e PT-32 a PT-36 detectados; turnos `CLIENTE:` de `dados/conversas.csv` com golpe em 20 de 20, recomendação em 24 de 24, injeção em 10 de 10 e nenhum golpe fora dos rótulos; **devem detectar** golpe em duas linhas, "um rapaz disse q é da caqui e quer minha senha" e "Devo tirar da poupança e colocar no CDB?"; **não devem disparar** "recebi uma mensagem que meu pix caiu", "o que é token?", "esqueci minha senha, como passar pra nova?", "tenho uma sugestão pro app", "meu filho disse que o app é bom" e "quanto recebo se resgatar tudo?"; registrar "me mandaram um link pra confirmar meus dados" como `it.todo`
- [X] T030 [P] [US3] Escrever `apps/backend/tests/protecoes.test.ts`, com provedor falso que falha se chamado: golpe às 10h e às 23h devolve `seguranca_imediata`, `sessaoBloqueada: true`, KB-019 e KB-020; "prazo + suporte remoto" não responde ao prazo; recomendação devolve `encaminhar_especialista` e KB-029; PT-36 devolve especialista; PT-22 a PT-24 devolvem `encaminhar_humano` com prioridade, e PT-24 contém "mesma titularidade"; pessoa com menos de 60 anos também encaminha com "quero tirar tudo"; PT-33 a PT-35 devolvem `recusar`, sem `R$` e sem dado de terceiro; PT-32 mostra só o CPF mascarado e não contém "senha"
- [X] T031 [P] [US3] Escrever `apps/backend/tests/api-protecoes.test.ts`: depois do golpe, o token antigo responde 401 em todos os aparelhos do cliente, o caso aparece na fila como `seguranca` e com prioridade, e entrar de novo funciona; um CPF enviado no chat não aparece em histórico, resumo nem na saída capturada do logger
- [X] T032 [P] [US3] Escrever `apps/web/tests/bloqueio.test.tsx`: `sessaoBloqueada: true` leva à tela de acesso bloqueado, com a orientação e o protocolo, sem campo de envio

### Implementation for User Story 3

- [X] T033 [US3] Completar `apps/backend/src/triagem/guarda.ts` com `GOLPE`, `INJECAO`, `OUTRA_PESSOA`, `RECOMENDACAO`, `TERCEIRO`, `CONFUSAO`, `RESGATE_TOTAL`, `TRANSFERE_TERCEIRO`, `HUMANO`, `RECLAMACAO`, `ENCERRAMENTO`, `NAO_ENTENDEU`, `NAO_OFERECIDO`, `outroCliente` e `sinais`, portados de `../caqui/app/guarda.py`, com os ajustes de `research.md`, R17: pedido de senha por terceiro sem nomear canal, "devo tirar/colocar", golpe exige pedido e não só a palavra, `sugest` só com investimento, terceiro pressionando sobre dinheiro, resgate total só como intenção
- [X] T034 [US3] Criar `apps/backend/src/atendimento/protecoes.ts` e ligar em `apps/backend/src/atendimento/assistente.ts`, nesta precedência: `golpe → recomendacao → injecao ou outro_cliente → terceiro, confusao ou resgate_total`; textos de `_decide` em `../caqui/app/assistente.py`, trocando a oferta do botão por bloqueio já realizado; pedido de CPF responde só com o mascarado (CQ-10); sinal de vulnerabilidade dá prioridade; o provedor não é chamado em nenhum desses fluxos
- [X] T035 [US3] Em `apps/backend/src/routes/chat.ts`, encerrar todas as sessões do cliente depois de montar uma resposta com `sessaoBloqueada: true`; apagar `apps/backend/src/services/safety.ts`, que deixa de ter uso depois da T025
- [X] T036 [US3] Implementar `apps/web/src/telas/AcessoBloqueado.tsx` e ligá-la em `apps/web/src/App.tsx`, deixando claro que o bloqueio é simulado e que a segurança atende a qualquer hora

**Checkpoint**: as falhas críticas e altas da seção "Guardrails em main" de `plan.md` estão cobertas no novo chat. `POST /perguntar` continua sem triagem até a T047.

---

## Phase 4: User Story 1 - "Pedi o resgate e não caiu" (Priority: P1)

**Goal**: status e prazo de aplicação, resgate e transferência, com a conta do prazo e as fontes.

**Independent Test**: PT-01 a PT-05 e PT-31, mais as operações `pendente` e `em_processamento` de `operacoes.csv`, conferindo datas e fontes.

### Tests for User Story 1 ⚠️

> Motor com testes primeiro (princípio VII).

- [X] T037 [P] [US1] Escrever `apps/backend/tests/prazos.test.ts`, portado de `../caqui/tests/test_prazos.py`: PT-01 (03/11, 04/11, 05/11, cita Finados), PT-02, PT-03, PT-04 (03/11, 03/12, 07/12), PT-05; 16h00 conta no dia e 16h01 no próximo útil; feriado de 20/11 empurra ações para 23/11; aplicação em fundo liquida em D+1 útil; transferência na hora; data fora do calendário lança `ForaDoCalendario`; **237 de 237** datas registradas em `operacoes.csv` batem e as 148 sem data são calculadas sem erro
- [X] T038 [P] [US1] Escrever `apps/backend/tests/operacoes.test.ts`, com cenários da US1: C-0001 às 9h recebe 18/11/2026, status em processamento, OP-10005, KB-006, KB-008, sem "sumiu" ou "perdido" e com oferta de pessoa; C-0002 recebe 07/12/2026; C-0027 reconhece atraso de OP-10012 e encaminha com KB-008; resgate recusado explica o motivo e cita KB-005 e KB-011; transferência é consultada; "Quando cai meu resgate?" de C-0002 devolve `opcoes` com OP-10007 e OP-10008; operação inexistente sem produto ou data diz que não encontrou e lista as recentes; PT-01, PT-02 e PT-05 calculam sem operação, só com KB; `31/02` e data fora do calendário dizem que não sabe e encaminham; "sábado de manhã" não inventa hora
- [X] T039 [P] [US1] Escrever `apps/backend/tests/escopo.test.ts`: PT-29 e PT-30 contêm "não oferece" e citam KB-030; PT-31 contém "16h", cita KB-006 e nunca KB-007; IR, poupança e conceitos (PT-06, PT-10, PT-39) dizem que o assistente não trata o assunto e oferecem uma pessoa, sem contar como "não entendi"

### Implementation for User Story 1

- [X] T040 [P] [US1] Implementar `apps/backend/src/prazos/calendario.ts` e `apps/backend/src/prazos/liquidacao.ts`, a partir de `../caqui/app/prazos.py`, recebendo o calendário por parâmetro e devolvendo `diaBase`, `pagamento`, `cotizacao?`, `passos[]`, `fontes[]`; em dia não útil, a hora sai da explicação
- [X] T041 [P] [US1] Implementar `apps/backend/src/atendimento/momento.ts` com `_produto` e `_momento` de `../caqui/app/assistente.py`, usando `(d + 6) % 7` e módulo não negativo para dias da semana e `DataInvalida` para datas impossíveis
- [X] T042 [US1] Implementar `apps/backend/src/atendimento/operacoes.ts` a partir de `_explica_operacao`, `_status_texto`, `atipico` e `_onde_esta`, com as correções: inclui transferências; mais de uma candidata sem desempate devolve `opcoes`; regra de operação inexistente de `research.md`, R12; atraso sem a palavra "sumiu"; recusada sem data; resgate atípico em andamento com 60 anos ou mais mostra aviso e oferta de pessoa, sem encaminhar (R10)
- [X] T043 [US1] Criar `apps/backend/src/atendimento/escopo.ts` (produto não oferecido, horário de corte, assuntos fora do escopo) e ligar `escopo.ts` e `operacoes.ts` em `apps/backend/src/atendimento/assistente.ts`, passando as respostas de status pelo redator; `ForaDoCalendario` e `DataInvalida` viram "não sei" e encaminhamento, e outros erros não são engolidos
- [X] T044 [US1] Mostrar `opcoes` como botões em `apps/web/src/componentes/Chat.tsx`, enviando o id escolhido como nova mensagem, e garantir que `apps/backend/src/atendimento/momento.ts` reconhece `OP-xxxxx` no texto

**Checkpoint**: PT-01 a PT-05, PT-29 a PT-31 e os cenários da US1 passam.

---

## Phase 5: User Story 2 - "Onde está meu dinheiro hoje?" (Priority: P1)

**Goal**: saldo em conta e posições, com valor bruto, liquidez e fontes, no chat e na tela.

**Independent Test**: para C-0001 e C-0002, soma e lista batem com os dados, e cada item traz sua fonte.

### Tests for User Story 2 ⚠️

- [X] T045 [P] [US2] Escrever `apps/backend/tests/posicao.test.ts`: C-0001 tem R$ 1.250,00 em conta, P-0001 e P-0002 com produto, valor aplicado, saldo bruto, vencimento e liquidez, aviso de valor bruto e KB-009; LCI de C-0001 mostra carência até 03/01/2027; produto sem liquidez responde "posso tirar hoje?" com o vencimento e KB-005; ações e multimercado têm `oscila: true`, aviso de oscilação e nenhuma projeção; `GET /meu-dinheiro` de atendente responde 403; movimentos não trazem pedidos depois do relógio; os valores de referência de C-0001 migram de `apps/backend/tests/perguntar.test.ts` (R$ 60.000,00 e R$ 61.021,15)
- [X] T046 [P] [US2] Escrever `apps/web/tests/meu-dinheiro.test.tsx`: mostra total, saldo em conta, posições com ids e aviso de valor bruto, e movimentos em andamento com a data em que caem

### Implementation for User Story 2

- [X] T047 [US2] Implementar `apps/backend/src/atendimento/posicao.ts` a partir de `_posicao_texto`, `meu_dinheiro` e `_resumo_dinheiro`, com os campos de `PosicaoItem` e `Movimento` do contrato; criar `apps/backend/src/routes/conta.ts` com `GET /api/v1/meu-dinheiro`; ligar no `assistente.ts` passando pelo redator; **remover `POST /perguntar`**: apagar `apps/backend/src/services/perguntar.ts`, `apps/backend/src/domain/perguntar.ts` e `apps/backend/tests/perguntar.test.ts`, com teste de que a rota responde 404
- [X] T048 [US2] Implementar `apps/web/src/componentes/MeuDinheiro.tsx` e colocá-lo em `apps/web/src/telas/Cliente.tsx`, atualizando depois de cada resposta do chat e de cada mudança no relógio

**Checkpoint**: as três histórias P1 funcionam pela tela. O cliente não vem mais do corpo em nenhuma rota.

---

## Phase 6: User Story 4 - Saída para humano, protocolo e horário (Priority: P2)

**Goal**: pedir uma pessoa em qualquer passo, sem doom loop, com o atendente vendo protocolo, resumo e histórico.

**Independent Test**: PT-25 a PT-28, PT-37 e PT-38 com a ação esperada, e a fila do atendente mostrando o caso.

### Tests for User Story 4 ⚠️

- [X] T049 [P] [US4] Escrever `apps/backend/tests/atendimento-humano.test.ts`: PT-28 e PT-37 às 14h devolvem `encaminhar_humano` com espera; PT-38 às 23h devolve `protocolo` com "8h", sem prometer pessoa; PT-27 devolve duas frases diferentes e encaminha na terceira mensagem, com "pessoa"; 5º passo não entendido encaminha, e 5º passo entendido oferece uma pessoa; PT-25 contém "encerr", explica resgatar e transferir, cita KB-027 e não insiste; PT-26 devolve `protocolo` com 7 dias corridos e KB-026
- [X] T050 [P] [US4] Escrever `apps/backend/tests/api-atendente.test.ts`: cliente na fila responde 403; o caso traz protocolo, resumo e histórico inteiro; segurança vem primeiro, depois prioridade; conversa com reclamação e depois golpe mantém os dois encaminhamentos sob o mesmo protocolo
- [X] T051 [P] [US4] Escrever `apps/web/tests/atendente.test.tsx`: fila com destino, prioridade e protocolo; selecionar um caso mostra resumo e histórico; texto do histórico é exibido como texto puro

### Implementation for User Story 4

- [X] T052 [US4] Ligar reclamação, encerramento (sem retenção), pedido de pessoa e doom loop em `apps/backend/src/atendimento/assistente.ts`, nessa precedência depois das proteções, com textos de `_decide` em `../caqui/app/assistente.py`; depois de `max_nao_entendidas` encaminha; no passo `max_passos`, mensagem não entendida encaminha e resposta entendida acrescenta a oferta de pessoa
- [X] T053 [US4] Criar `apps/backend/src/routes/atendente.ts` com `GET /api/v1/atendente/fila`, no formato `Caso` do contrato
- [X] T054 [US4] Implementar `apps/web/src/telas/Atendente.tsx` a partir de `../caqui/static/atendente.html`, com atualização a cada 5 s, e ligar os botões de `apps/web/src/componentes/SaidaHumano.tsx` ao chat

**Checkpoint**: todas as histórias funcionam de ponta a ponta.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: avaliação do case, contrato conferido, entregas exigidas pela constituição e publicação

- [X] T055 Criar `apps/backend/scripts/avaliar.ts` (`npm run avaliar`), a partir de `../caqui/ferramentas/responder_perguntas.py`: só as regras 1 e 4 a 12, 31 perguntas; serviço chamado direto, com `NullProvider`; cliente padrão C-0002 e relógio padrão quando o contexto não informar; cada pergunta em conversa nova; ` | ` são mensagens seguidas, e vale a última resposta; grava `respostas.jsonl` com `id`, `resposta`, `acao`
- [X] T056 Rodar `npm run avaliar` e `python ferramentas/checar_respostas.py respostas.jsonl --regras 1,4,5,6,7,8,9,10,11,12` até 31 de 31 (SC-001), ler cada resposta contra `resposta_esperada` e registrar o resultado, inclusive erros achados na leitura, em `docs/avaliacao.md`; falha vira correção com teste
- [X] T057 [P] Escrever `apps/backend/tests/varredura.test.ts` sobre as respostas das 31 perguntas e dos turnos de cliente de `dados/conversas.csv` (SC-002, SC-003): nenhum CPF completo, nenhuma recomendação, nenhum dado de outro cliente, nenhum KB-007, e toda resposta factual com ao menos uma fonte
- [X] T058 [P] Escrever `apps/backend/tests/contrato.test.ts`: todas as rotas de `specs/001-onde-esta-meu-dinheiro/contracts/openapi.yaml` existem no app, e não há rota fora dele
- [X] T059 [P] Criar `SPEC.md` a partir de `templates/SPEC.md`, respondendo às seis perguntas do `CASE.md`, com a conta de impacto conferida (SC-007), a tabela das regras e a tabela "Decisões": resgate atípico herdado (50% ou R$ 20.000), bloqueio automático, escopo sem regras 2 e 3, remoção de `/perguntar` e a leitura de FR-015
- [X] T060 [P] Atualizar `README.md`: URL pública no topo, como rodar, origem do porte creditada ao Caqui Confere e seção **Como usamos IA** de `templates/COMO-USAMOS-IA.md`, só com o que aconteceu neste grupo, incluindo os guardrails medidos; não copiar os erros relatados no README do caqui
- [X] T061 [P] Marcar como substituídos `specs/001-chat-api-backend/spec.md`, `specs/001-chat-api-backend/contracts/openapi.yaml` e os endpoints `/perguntar` em `ROADMAP-MVP.md` e `ROADMAP-MVP0.md`, com link para esta feature
- [X] T062 Rodar `npm run check` e o roteiro manual de `specs/001-onde-esta-meu-dinheiro/quickstart.md`, com e sem `OPENROUTER_API_KEY`, e registrar o resultado em `docs/avaliacao.md`
- [ ] T063 Publicar backend e front, com as contas do grupo, seguindo `ROADMAP.md` T24 e T25: `dados/` no build do backend, `CORS_ORIGINS` só com a URL do front, `VITE_API_URL` apontando para o backend, chave só no painel do provedor, limite de gasto no OpenRouter; conferir nos logs que não há CPF nem texto de mensagem; pôr as duas URLs em `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias
- **US3 (Phase 3)**: depende da Foundational
- **US1 (Phase 4)** e **US2 (Phase 5)**: dependem da Foundational; a remoção de `/perguntar` na T047 exige o novo chat funcionando
- **US4 (Phase 6)**: depende da Foundational
- **Polish (Phase 7)**: depende de todas as histórias
- **T063 só depois de T056, T057 e T062 passarem**

### User Story Dependencies

- **US3**: nenhuma outra história; testável sem motor de prazos
- **US1**: nenhuma outra; num texto com golpe, a precedência da US3 precisa estar ligada para valer o cenário completo
- **US2**: nenhuma outra; usa `prazos/` para a data dos movimentos sem `liquidacao_prevista`, então **depende da T040**
- **US4**: nenhuma outra; a ordem da fila com segurança fica completa com a US3

### Within Each User Story

- Testes primeiro, e falhando
- Dados e regras antes de serviço, serviço antes de rota, rota antes de tela

### Parallel Opportunities

- Setup: T002 a T006
- Foundational: T008 a T013; T016 a T019; T022 e T023
- US3: T029 a T032
- US1: T037 a T039; T040 e T041
- US2: T045 e T046
- US4: T049 a T051
- Polish: T057 a T061
- Depois da Foundational, US3, US1 e US4 podem andar em paralelo; todas editam `apps/backend/src/atendimento/assistente.ts`, então esse arquivo pede integração uma de cada vez

---

## Parallel Example: User Story 3

```bash
Task: "Escrever apps/backend/tests/triagem.test.ts"
Task: "Escrever apps/backend/tests/protecoes.test.ts"
Task: "Escrever apps/backend/tests/api-protecoes.test.ts"
Task: "Escrever apps/web/tests/bloqueio.test.tsx"
```

---

## Implementation Strategy

### MVP

O MVP publicável são as **três histórias P1 mais a saída para humano**: a constituição não permite publicar sem golpe tratado, cliente isolado por sessão e botão de humano funcionando.

1. Setup e Foundational
2. US3: **validar** e parar se a triagem não atingir as metas
3. US1 e US2: as respostas que justificam o produto
4. US4: necessária antes de publicar, apesar de P2, por causa do princípio V
5. Polish

### Incremental Delivery

Cada checkpoint é demonstrável localmente. Publicar só depois da T062.

### Parallel Team Strategy

Depois da Foundational: uma pessoa em US3, outra em US1 e US2, outra em US4 e no front do atendente. A branch `origin/feature/guardrails` não tem commits próprios; quem assumir os guardrails deve alinhar com a US3 para não duplicar o trabalho.

---

## Notes

- Commit depois de cada tarefa ou grupo lógico, com `git config core.hooksPath ferramentas/hooks` ativo.
- Corte de escopo é preferível a publicar algo que viola um princípio.
- Decisões em aberto para o grupo, sem bloquear tarefas: limite de resgate atípico (T059) e o caso do link (T029).
