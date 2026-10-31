# Research

## Provider protocol

**Decision**: usar `fetch` com `POST /chat/completions` do OpenRouter.
**Rationale**: mantém um contrato único, permite trocar o modelo por configuração e evita SDK específico.
**Alternatives**: integrações diretas com cada fornecedor aumentariam o acoplamento do MVP.

## Framework

**Decision**: Fastify 4 com Zod para validação.
**Rationale**: suporta Node 18, injeção HTTP em testes e baixo boilerplate.

## State

**Decision**: backend stateless; frontend envia o histórico limitado.
**Rationale**: evita banco e tratamento de retenção no MVP.
