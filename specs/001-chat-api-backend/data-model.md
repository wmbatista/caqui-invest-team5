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

## PerguntarRequest

- `id_cliente`: identificador sintético no formato `C-0001`
- `pergunta`: texto de 1 a 4000 caracteres

## ResumoPosicao

- totais aplicado, bruto e em conta, todos calculados por código
- posições filtradas exclusivamente pelo cliente
- fontes formadas pelos ids de posição e cliente

## PerguntarResponse

- `resposta`: texto do OpenRouter validado ou template determinístico
- `fontes`: ids definidos pelo código, nunca pela LLM
