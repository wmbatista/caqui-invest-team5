# ROADMAP MVP0: o caso mais simples

Uma implementação de ponta a ponta que funciona num único cenário: **o cliente pergunta quanto
tem aplicado e o agente responde certo, com a fonte.**

Serve para provar a estrutura (backend, dados, Claude, resposta com fonte) antes de qualquer regra
difícil. Os próximos passos estão em [ROADMAP-MVP.md](ROADMAP-MVP.md) (prazos e liquidação) e em
[ROADMAP.md](ROADMAP.md) (versão completa).

## Escopo

**Entra:**
- `POST /perguntar { id_cliente, pergunta }` → `{ resposta, fontes[] }`.
- Uma única intenção: "quanto eu tenho?" (total aplicado, saldo atual dos investimentos e saldo
  em conta).
- Qualquer outra pergunta recebe uma resposta fixa: *"Por enquanto eu só sei dizer quanto você
  tem aplicado na Caqui."*

**Fica de fora:** operações, prazos, calendário, liquidação, base de conhecimento, triagem,
sessão, histórico, humano, front e deploy.

**Duas regras que valem mesmo aqui:**
- O valor é **somado pelo código**. O LLM só redige a frase (princípio II da constituição).
- **Nenhuma recomendação.** Como só uma intenção é atendida, o pedido de recomendação cai na
  resposta fixa.

## Decisões

| Tema | Decisão |
| --- | --- |
| Stack | Node 22 + TypeScript + Fastify + Vitest, em `apps/backend` |
| LLM | `@anthropic-ai/sdk`, modelo em `LLM_MODEL` (padrão `claude-opus-5-5`), chave em `ANTHROPIC_API_KEY` no `.env` |
| Sem chave | Resposta por template; os testes não chamam a API |
| Dados | Só `dados/clientes.json` e `dados/posicoes.csv`, lidos na subida |
| Cliente | `id_cliente` no corpo da requisição (simplificação; sessão vem depois) |

## Caso de teste de referência

Cliente **C-0001** (Marta Siqueira), pergunta *"Quanto eu tenho aplicado?"*:

| Fato | Valor | Fonte |
| --- | --- | --- |
| Total aplicado | R$ 60.000,00 | P-0001, P-0002 |
| Saldo bruto atual dos investimentos | R$ 61.021,15 | P-0001, P-0002 |
| Saldo em conta | R$ 1.250,00 | C-0001 |

A resposta precisa trazer esses valores, dizer que o saldo é bruto (antes do imposto) e citar
as fontes.

## Como usar em cada sessão

1. Sessão nova: *"Vamos fazer a tarefa Exx do ROADMAP-MVP0.md"*.
2. Feche a sessão quando o "Pronto quando" estiver atendido; marque `[x]`, anote em
   [Notas](#notas) e faça o commit.

---

### [ ] E01: Scaffold do backend · P
- **Entregas:** `package.json` raiz com workspaces; `apps/backend` com TypeScript estrito, Fastify,
  Vitest e os scripts `dev`, `build`, `test`; `GET /health`; config a partir do `.env` (`PORT`,
  `DATA_DIR=../../dados`, `ANTHROPIC_API_KEY`, `LLM_MODEL`); `.env.example` sem a chave.
- **Pronto quando:** `npm run dev` sobe, o teste de `/health` passa e o `.env` está fora do git.

### [ ] E02: Conexão com a Claude · P
- **Ler antes:** a config da E01. Use a skill `claude-api` (TypeScript) para escrever a chamada.
- **Entregas:** função `redigir(system, texto)` com `@anthropic-ai/sdk`, que checa o
  `stop_reason` antes de ler o texto e tem timeout curto; sem chave ou com erro, retorna `null`
  para quem chamou usar o template.
- **Pronto quando:** um teste com a chamada simulada passa, e `npm run llm:ping` responde com a
  chave no `.env`.

### [ ] E03: Resumo da posição do cliente · P (testes primeiro)
- **Ler antes:** `dados/README.md` (campos de `clientes.json` e `posicoes.csv`).
- **Entregas:** leitura dos dois arquivos e a função
  `resumoPosicao(idCliente)` → `{ totalAplicado, saldoBrutoInvestimentos, saldoEmConta, posicoes[], fontes[] }`;
  cliente inexistente retorna erro claro.
- **Pronto quando:** o teste de C-0001 bate com a tabela "Caso de teste de referência" e o teste
  de cliente inexistente passa.

### [ ] E04: Endpoint `/perguntar` · P
- **Ler antes:** as interfaces da E02 e da E03.
- **Entregas:**
  - Reconhecer a intenção por palavras-chave, sem acento e sem diferença de maiúsculas ("quanto",
    "tenho", "aplicado", "saldo", "onde está meu dinheiro"). Fora disso, resposta fixa.
  - Montar os fatos com a E03, valores formatados em R$ pelo código.
  - Pedir à Claude que redija 2 ou 3 frases simples **usando só os fatos**, sem calcular e sem
    recomendar. A pergunta do cliente vai marcada como dado, não como instrução.
  - Conferir se todo valor em R$ do texto existe nos fatos; se não existir, ou se a Claude não
    responder, usar o template.
  - As fontes são montadas pelo código, nunca tiradas do texto do LLM.
- **Pronto quando:** sem chave, o teste de C-0001 retorna os valores e as fontes certos pelo
  template; a pergunta "onde eu invisto 50 mil?" recebe a resposta fixa; com a chave, 3 perguntas
  manuais (`curl`) estão registradas nas notas.

---

## Notas

| Data | Tarefa | Notas |
| --- | --- | --- |
| 2026-10-31 | Planejamento | MVP0 criado: só "quanto eu tenho aplicado?", a partir de `clientes.json` e `posicoes.csv`. |
