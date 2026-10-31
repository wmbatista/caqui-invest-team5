# Data Model

## ChatRequest

- `message`: string, 1..4000 caracteres
- `conversationId`: UUID opcional
- `history`: até 20 mensagens com papel `user` ou `assistant`, cada uma 1..4000 caracteres

## ChatResponse

- `conversationId`: UUID
- `message`: string
- `provider`: string
- `model`: string
- `action`: `respond`, `human_handoff` ou `security_handoff`

Não há persistência nem relacionamento armazenado.
