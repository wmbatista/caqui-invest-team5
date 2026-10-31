# Implementation Plan: API de chat com IA

**Branch**: `main` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

Serviço HTTP TypeScript que valida o contrato, aplica guardrails determinísticos e chama um endpoint
OpenAI-compatible. O provedor é injetável para testes e configurável para OpenRouter ou LLM local.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 18+
**Primary Dependencies**: Fastify 4, Zod 3, `@fastify/cors`
**Storage**: N/A
**Testing**: Vitest e `fastify.inject`
**Target Platform**: container ou servidor Linux
**Project Type**: web service
**Performance Goals**: validação local p95 < 100 ms; timeout externo configurável
**Constraints**: sem persistência, sem segredo em log, um processo
**Scale/Scope**: MVP de demonstração, endpoint de chat e healthcheck

## Constitution Check

- Segurança antes da LLM: PASS, guardrails executam antes do provider.
- Contratos explícitos: PASS, Zod, OpenAPI e testes de contrato.
- Privacidade: PASS, sem persistência e logger com redaction.
- Falhas honestas: PASS, erros tipados e timeout.
- Simplicidade: PASS, um serviço e uma interface de provider.

## Project Structure

```text
apps/backend/src/
├── app.ts
├── config.ts
├── server.ts
├── domain/chat.ts
├── providers/openrouter.ts
└── services/{chat,safety}.ts
apps/backend/tests/{chat,config,health}.test.ts
```

**Structure Decision**: monorepo npm com backend no workspace `apps/backend`; o frontend consumirá o contrato em `contracts/openapi.yaml`.

## Complexity Tracking

Nenhuma violação.
