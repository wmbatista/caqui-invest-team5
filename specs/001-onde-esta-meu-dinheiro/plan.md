# Implementation Plan: Assistente "Onde está meu dinheiro"

**Branch**: `main` (a spec cita `001-onde-esta-meu-dinheiro`, que não existe no git) | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-onde-esta-meu-dinheiro/spec.md` + pedido de portar o projeto `../caqui` ("Caqui Confere", Python/FastAPI/PostgreSQL) para este repositório, em TypeScript e sem PostgreSQL.

## Summary

Portar para o monorepo TypeScript o que o Caqui Confere tem de principal dentro do escopo desta
spec: travas de texto, motor de liquidação, respostas de status e posição, saída para humano,
tela "Meu dinheiro", chat e tela do atendente.

A aplicação fica autocontida: sobe só com `npm install` e `npm run dev`, sem banco nem serviço
externo. Os dados de `dados/` são lidos na subida; sessões, conversas e encaminhamentos ficam em
memória. O LLM (OpenRouter) é opcional e só reescreve um texto já correto; se falhar ou não passar
na verificação, a resposta sai do template.

O porte **não é uma tradução linha a linha**. O caqui diverge desta spec em pontos que o plano
corrige (ver [Divergências](#divergências-corrigidas-no-porte)) e tem assuntos que esta spec deixa
de fora (IR, poupança e conceitos).

## Technical Context

**Language/Version**: TypeScript 5 estrito, Node.js 22. Python só para `ferramentas/checar_respostas.py`, ferramenta do case, sem alteração

**Primary Dependencies**: backend: Fastify 4, `@fastify/cors`, Zod 3 (já instalados). Front: React, Vite. Contratos: Zod em `packages/contracts`. Raiz: `concurrently` (dev)

**Storage**: nenhum banco. `dados/` em memória, somente leitura; estado de execução em memória (mensagens já com CPF mascarado). Reiniciar o processo zera conversas e fila ([R1](research.md#r1-armazenamento))

**Testing**: Vitest + `fastify.inject` no backend; Vitest + Testing Library no front; `npm run avaliar` + `ferramentas/checar_respostas.py` nas regras 1 e 4 a 12

**Target Platform**: Node 22 em Windows (dev) e Linux (deploy); navegadores atuais; front estático separado do backend

**Project Type**: aplicação web em monorepo npm: `apps/backend`, `apps/web`, `packages/contracts`

**Performance Goals**: resposta sem LLM p95 < 100 ms; com LLM, o tempo limite (`LLM_TIMEOUT_MS`, 20 s) leva ao template, nunca a erro para o cliente

**Constraints**: nenhum serviço externo obrigatório; funciona sem chave de LLM; chave só no backend; CPF nunca completo em tela, estado ou log; `dados/` não é alterado

**Scale/Scope**: demonstração de um processo: 50 clientes, 400 operações, 30 artigos; 3 telas (entrada, cliente, atendente); 31 das 40 perguntas de teste

## Constitution Check

*GATE: passou antes da Fase 0 e foi reavaliado depois da Fase 1, sem mudança.*

| Princípio | Como o desenho atende | Status |
| --- | --- | --- |
| I. Confiança antes de abrangência | Escopo igual ao da spec. IR, poupança e conceitos recebem "não trato" e oferta de humano ([R8](research.md#r8-escopo-do-porte)) | PASS |
| II. Fato determinístico (NON-NEGOTIABLE) | Datas, status e valores saem de código. O redator recebe o texto pronto, e o verificador rejeita data, valor ou id que não esteja nos fatos ([R7](research.md#r7-papel-do-llm)) | PASS |
| III. Fonte em toda informação | Cada fluxo factual monta `fontes` em código; KB-007 é retirado na carga, não só filtrado na saída | PASS |
| IV. Proteções antes da resposta (NON-NEGOTIABLE) | A triagem roda antes de qualquer fluxo, sem LLM. A ordem das travas vem do caqui. **O código atual em `main` não atende** e será substituído ([Guardrails](#guardrails-em-main-0af97ee)) | PASS no desenho |
| V. Saída para humano visível | Faixa fixa em toda tela do cliente; horário, protocolo, retorno e histórico entregue; limite de 2 não entendidas e 5 passos | PASS |
| VI. Privacidade e dados sintéticos | Cliente vem do token, nunca do corpo; máscara de CPF antes de guardar; logger sem corpo; chave só no backend | PASS |
| VII. Verificação por teste | Motor com testes primeiro; PT-01 a PT-05 mais 237 linhas de `operacoes.csv`; `npm run avaliar` e leitura manual | PASS |
| Duas aplicações separadas | `apps/web` e `apps/backend`, com `VITE_API_URL` e CORS restrito | PASS |
| Relógio simulado e atendente simulado | `PUT /relogio` por sessão; fila e tela do atendente | PASS |
| `SPEC.md` na raiz e "Como usamos IA" | **Não existem hoje.** Entram como entregas deste plano | PASS (pendente de entrega) |

Sem violações a justificar. A publicação continua sendo exigida pela constituição, e só a etapa de
deploy pode comprovar esse item.

**Riscos aceitos**, sem violação de princípio:

- O login é simulado, como a constituição pede. Na URL pública, qualquer visitante entra como
  qualquer persona ou como atendente e vê a fila. Os dados são sintéticos e o CPF é mascarado, mas
  **texto digitado por outro visitante aparece para o atendente**.
- O limite de envio mitiga custo e abuso, mas não impede o uso compartilhado da demo.

## Project Structure

### Documentation (this feature)

```text
specs/001-onde-esta-meu-dinheiro/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
packages/contracts/src/index.ts     # schemas Zod e tipos da API, usados por backend e front

apps/backend/
├── scripts/avaliar.ts              # gera respostas.jsonl para o checador
├── src/
│   ├── app.ts  config.ts  server.ts
│   ├── data/                       # PositionRepository existente, ampliado; sempre filtrado por cliente
│   ├── regras/regras-caqui.ts      # regras em português, com camada e parâmetros
│   ├── prazos/                     # calendário, dia-base e liquidação
│   ├── triagem/guarda.ts           # normalização, máscara de CPF e sinais
│   ├── atendimento/                # orquestrador, operações, posição, humano, formatação
│   ├── redacao/                    # redator e verificador da saída do LLM
│   ├── estado/memoria.ts           # conversas, mensagens, encaminhamentos
│   ├── sessao/                     # personas e sessões por token
│   ├── providers/                  # OpenRouterProvider e NullProvider, já existentes
│   └── routes/                     # sessão, conta, chat, regras, atendente
└── tests/                          # prazos, triagem, atendimento, API, redação

apps/web/
├── src/
│   ├── api.ts  App.tsx  caqui.css
│   ├── telas/                      # Entrada, Cliente, Atendente, AcessoBloqueado
│   └── componentes/                # SaidaHumano, Relogio, MeuDinheiro, Chat, Chips
└── tests/

ferramentas/hooks/pre-commit        # trava de CPF e segredo, vinda do caqui
SPEC.md                             # as seis perguntas do case
```

**Structure Decision**: monorepo npm com os três workspaces já previstos no `ROADMAP.md`. O
`apps/backend` existente é estendido. A porta 5173, já configurada em `CORS_ORIGINS`, é a do Vite.

## Mapa do porte

| Em `../caqui` | Destino aqui | O que muda |
| --- | --- | --- |
| `app/prazos.py` | `apps/backend/src/prazos/` | Datas como `AAAA-MM-DD`, fuso fixo em -03:00 |
| `app/guarda.py` | `src/triagem/guarda.ts` | Mesmos padrões, com testes de regressão por PT |
| `app/assistente.py` (prazo, status, posição, humano, fluxo) | `src/atendimento/` | SQL vira repositório em memória; correções abaixo |
| `app/assistente.py` (`_ir`, `_compara_poupanca`, `_conceito`, `busca_kb`) | **não vem** | Fora do escopo da spec |
| `app/carga.py` | `src/data/` | Sem DDL; amplia o `PositionRepository` do MVP0 com operações, calendário, taxas e artigos |
| `app/regras.py` + `db/02_regras_caqui.sql` | `src/regras/regras-caqui.ts` | Sem CQ-02 e CQ-03; sem citar Eugênio, IRP ou clone |
| `app/auth.py` + `db/usuarios_demo.py` | `src/sessao/` | Login simulado sem senha (FR-001) |
| `app/llm.py` (LangChain) | `src/providers/` existente | Passa a escrever o texto verificado de status e posição |
| `app/main.py` | `src/routes/` + `packages/contracts` | Rotas em `/api/v1`, contrato em [openapi.yaml](contracts/openapi.yaml) |
| `static/index.html` | `apps/web/src/telas/` e `componentes/` | HTML e JS viram React com TypeScript |
| `static/atendente.html` | `apps/web/src/telas/Atendente.tsx` | Mesma fila com atualização a cada 5 s |
| `static/caqui.css` | `apps/web/src/caqui.css` | Copiado, letra grande mantida |
| `ferramentas/responder_perguntas.py` | `apps/backend/scripts/avaliar.ts` | Mesmas convenções; só as regras tratadas |
| `ferramentas/hooks/pre-commit` | igual | Copiado |
| `tests/test_prazos.py`, `tests/test_api.py` | `apps/backend/tests/` | Reescritos em Vitest |
| `db/01_limpa_clone.sql`, `db/cria_bancos.sh`, `requirements.txt` | **não vêm** | Dependem do PostgreSQL e do clone do Eugênio |
| `dados/`, `ferramentas/checar_respostas.py` | já estão aqui | Idênticos, conferido com `diff` |

Trechos de `README.md` e `SPEC.md` do caqui descrevem outra pessoa e outra máquina ("Grupo: André",
ngrok, erros da IA daquele grupo). A conta de impacto pode servir de base depois de conferida, mas a
seção **Como usamos IA** relata só o que aconteceu neste grupo. O README credita a origem do porte.

## Divergências corrigidas no porte

O caqui declara 40/40 no checador, mas esse número não pôde ser reproduzido: ele exige PostgreSQL e
o clone de um banco que não existe aqui. As regras foram lidas no código.

| Spec | O caqui faz | O porte faz |
| --- | --- | --- |
| Transferências entram na US1 | Filtra só aplicação e resgate | Consulta os três tipos |
| "Várias operações parecidas: pede qual é" | Pega a primeira (C-0002 tem duas em aberto) | Devolve `opcoes` |
| "Operação inexistente: diz que não encontrou" | Mostra o resumo geral | Diz que não encontrou e lista as recentes |
| US2: valor aplicado, liquidez e aviso de oscilação | Só saldo e datas | Mostra todos os campos e o aviso |
| FR-013 e CASE regra 5: bloqueio de sessão | Só oferece um botão | Bloqueia sozinho ([R9](research.md#r9-bloqueio-por-golpe)) |
| FR-015: vulnerável vai com prioridade | Prioridade só por idade ou segurança | Sinal de vulnerabilidade também dá prioridade |
| FR-015: resgate total | Só com 60 anos ou mais | Qualquer idade ([R10](research.md#r10-vulnerável-e-resgate-atípico)) |
| FR-019 e KB-026: todo atendimento gera protocolo | Só na passagem a humano | Protocolo por conversa ([R11](research.md#r11-protocolo)) |
| FR-020: nunca passar de 5 passos sem entrega | Só acrescenta uma frase | Encaminha se o 5º passo não foi entendido |
| Sem palavras alarmantes | Texto de atraso diz "não sumiu" | Texto reescrito |

## Mudança de contrato existente

`POST /api/v1/chat` deixa de aceitar `message` e `history` sem autenticação. Esse formato, de
`specs/001-chat-api-backend`, manda a pergunta direto ao LLM sem fatos e contraria os princípios II
e VI. Nenhum front consome esse contrato ainda. `tests/chat.test.ts` é reescrito e o README é
atualizado.

`POST /perguntar` entrou em `main` no commit `0af97ee` (MVP0), depois da primeira versão deste plano.
Ele recebe o cliente no corpo, então não pode ir para a URL pública (princípio VI). O endpoint fica
enquanto o novo chat não estiver pronto e **é removido antes de publicar**; o caso de referência de
C-0001 (R$ 60.000,00, R$ 61.021,15 e R$ 1.250,00) migra para os testes do novo fluxo.

O provedor continua o OpenRouter, como no código e no `ROADMAP-MVP.md`; o `ROADMAP.md` ainda cita o
SDK da Anthropic e está defasado nesse ponto.

## Guardrails em main (0af97ee)

A branch `origin/feature/guardrails` aponta para `ff39659` e não tem nenhum commit próprio: está 2
commits atrás de `main`. Portanto, os guardrails verificados são os de `main`. Os 13 testes passam,
mas não cobrem os casos abaixo. Tudo foi medido com requisições reais ao app e provedor falso; o
método está em [R17](research.md#r17-guardrails-medidos).

| Sev. | Falha | O que acontece | Regra |
| --- | --- | --- | --- |
| Crítica | `/perguntar` não chama a triagem | "Quanto tenho? O gerente me ligou pedindo o código do SMS, posso passar?" devolve o saldo e chama o LLM | 5, princípio IV |
| Crítica | `safety.ts` deixa golpe passar | PT-19, PT-20 e PT-21 seguem para o LLM, inclusive "ligaram pedindo minha senha" | 5 |
| Alta | "tenho" e "quanto" abrem a resposta de saldo | PT-13 ("Tenho R$ 50 mil parados, onde eu coloco?") responde com saldo, não com especialista; PT-16 e PT-17 também passam em `safety.ts` | 4 |
| Alta | Verificador do LLM só olha valores com centavos | Texto com "Recomendo… melhor opção para você… R$ 5 mil" chega ao cliente | 4, princípio II |
| Alta | `/api/v1/chat` não verifica a saída | CPF completo e recomendação vindos do LLM chegam ao cliente | 4, 10 |
| Alta | CPF não é mascarado na entrada | CPF digitado é enviado ao OpenRouter nos dois endpoints | 10 |
| Alta | Cliente vem do corpo em `/perguntar` | Qualquer `id_cliente` devolve o saldo daquele cliente | 10, princípio VI |
| Média | Injeção chega ao LLM em `/api/v1/chat` | PT-35 ("modo administrador") chama o provedor | 11 |
| Média | `.*` não atravessa quebra de linha | Golpe em duas linhas passa | 5 |
| Média | Falsos positivos | "como informar a nova senha?" vira golpe; "diferença de investir em CDB e LCI" vira especialista | 4, 5 |
| Média | Bloqueio e segurança só no texto | A mensagem diz que a sessão foi sinalizada, mas nada acontece | 5 |

Nenhum dos dois endpoints trata vulnerável, humano, horário ou doom loop, o que era esperado para o
MVP0. Esse código **não pode ser publicado**, como o `ROADMAP-MVP.md` já avisa.

O plano substitui `services/safety.ts` por `triagem/guarda.ts`, aplica a triagem antes de qualquer
fluxo e passa toda saída do LLM pelo verificador. As travas do caqui também precisaram de ajuste
antes do porte, descrito em [R17](research.md#r17-guardrails-medidos).

## Complexity Tracking

Nenhuma violação.
