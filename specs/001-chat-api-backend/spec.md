# Feature Specification: API de chat com IA

**Feature Branch**: `main`
**Created**: 2026-10-31
**Status**: Ready
**Input**: Serviço Node que recebe mensagens e roteia para modelos disponíveis no OpenRouter.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversar com a IA (Priority: P1)

Como cliente, envio uma mensagem pelo frontend e recebo uma resposta textual mantendo o contexto enviado.

**Why this priority**: É o fluxo mínimo que torna o chatbot demonstrável.

**Independent Test**: Enviar mensagem válida com provedor simulado e verificar resposta, id e provedor.

**Acceptance Scenarios**:

1. **Given** provedor disponível, **When** envio uma mensagem, **Then** recebo resposta e identificador.
2. **Given** histórico válido, **When** envio nova mensagem, **Then** ele segue na ordem correta.
3. **Given** entrada inválida, **When** envio a requisição, **Then** recebo 400 sem chamar a IA.

---

### User Story 2 - Trocar provedor sem mudar o frontend (Priority: P2)

Como equipe, escolho o modelo no OpenRouter por configuração, preservando o contrato HTTP.

**Why this priority**: Permite demonstração com ou sem crédito externo.

**Independent Test**: Executar o mesmo teste contra duas configurações OpenAI-compatible.

**Acceptance Scenarios**:

1. **Given** URL e modelo configurados, **When** o serviço inicia, **Then** usa o provedor escolhido.
2. **Given** provedor indisponível, **When** ocorre chat, **Then** retorna erro explícito e seguro.

---

### User Story 3 - Interromper fluxos críticos (Priority: P3)

Como cliente, recebo orientação segura e humano quando relato golpe ou peço recomendação.

**Why this priority**: O case exige barreiras que não dependam apenas da LLM.

**Independent Test**: Enviar frases de golpe e recomendação e verificar que a IA não é chamada.

**Acceptance Scenarios**:

1. **Given** sinal de senha, código ou transferência, **When** envio a mensagem, **Then** o fluxo para e encaminha à segurança.
2. **Given** pedido de melhor investimento, **When** envio a mensagem, **Then** não há recomendação e é oferecido especialista.

### Edge Cases

- Mensagem vazia, grande demais ou histórico com papel inválido é rejeitado.
- Timeout ou resposta malformada do provedor vira erro seguro.
- Prompt injection é texto do cliente, nunca instrução de sistema.
- `conversationId` inválido é rejeitado; quando ausente, um novo é criado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: MUST expor saúde e endpoint versionado de chat.
- **FR-002**: MUST aceitar mensagem, histórico opcional e identificador opcional.
- **FR-003**: MUST validar tamanho, formato e papéis antes de chamar o provedor.
- **FR-004**: MUST retornar resposta, identificador, provedor, modelo e ação segura aplicável.
- **FR-005**: MUST suportar o OpenRouter e permitir seleção de modelo por configuração.
- **FR-006**: MUST aplicar regras determinísticas de golpe e recomendação antes da IA.
- **FR-007**: MUST separar instruções fixas do conteúdo do cliente.
- **FR-008**: MUST mascarar CPF e segredos em logs e não persistir conversas.
- **FR-009**: MUST limitar duração das chamadas e mapear falhas previsivelmente.
- **FR-010**: MUST permitir CORS somente para origens configuradas.
- **FR-011**: O contrato MUST ser documentado e coberto por testes.

### Key Entities

- **Chat Request**: mensagem, histórico e identificador opcional.
- **Chat Response**: resposta, identificador, metadados e encaminhamento.
- **Provider Configuration**: URL, chave opcional, modelo e timeout.
- **Safety Decision**: categoria, resposta e destino.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das requisições válidas recebem contrato completo ou erro documentado.
- **SC-002**: Entradas inválidas são rejeitadas em menos de 100 ms sem chamar o provedor.
- **SC-003**: 100% dos testes de golpe e recomendação bloqueiam a chamada à IA.
- **SC-004**: Trocar entre endpoints compatíveis exige somente alteração de ambiente.
- **SC-005**: Nenhum segredo ou CPF completo aparece nos logs dos testes.

## Assumptions

- O frontend reenvia o histórico; persistência e autenticação ficam fora do MVP.
- O acesso aos modelos ocorre por uma credencial de API do OpenRouter.
- Streaming, tools, RAG e handoff real ficam para incrementos posteriores.
- Demo pública receberá autenticação e rate limit antes do deploy.
