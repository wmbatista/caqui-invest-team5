# Tasks: API de chat com IA

## Phase 1: Setup

- [x] T001 Criar projeto TypeScript e scripts em `package.json`
- [x] T002 [P] Configurar ambiente em `.env.example` e `apps/backend/src/config.ts`

## Phase 2: Foundation

- [x] T003 Definir contratos em `apps/backend/src/domain/chat.ts`
- [x] T004 Implementar provider em `apps/backend/src/providers/openrouter.ts`
- [x] T005 Configurar app, CORS, erros e logs em `apps/backend/src/app.ts`

## Phase 3: User Story 1

- [x] T006 [US1] Implementar orquestração em `src/services/chat.ts`
- [x] T007 [US1] Implementar `POST /api/v1/chat` e testes

## Phase 4: User Story 2

- [x] T008 [US2] Tornar URL, modelo, chave e timeout configuráveis
- [x] T009 [US2] Testar configuração e falha do provider

## Phase 5: User Story 3

- [x] T010 [US3] Implementar regras em `src/services/safety.ts`
- [x] T011 [US3] Testar bloqueio sem chamada ao provider

## Phase 6: Polish

- [x] T012 Documentar contrato, setup e limitações
- [x] T013 Instalar dependências e executar quality gate
