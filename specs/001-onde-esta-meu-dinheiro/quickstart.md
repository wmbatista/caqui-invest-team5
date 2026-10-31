# Quickstart: validar "Onde está meu dinheiro"

Guia para provar que a feature funciona de ponta a ponta. Descreve o estado **depois** da
implementação: os comandos `avaliar` e o `apps/web` ainda não existem. Contrato em
[openapi.yaml](contracts/openapi.yaml); regras em [data-model.md](data-model.md).

## Pré-requisitos

- Node.js 22 e npm.
- Python 3.9 ou mais novo, só para o checador do case.
- **Não** precisa de banco, Docker nem chave de LLM.

## Subir

```bash
cp .env.example .env
npm install
npm run dev
```

**Esperado**: API em `http://localhost:3000` e front em `http://localhost:5173`. Sem chave, tudo
funciona pelos templates.

## Verificação automática

```bash
npm run check
npm run avaliar
python ferramentas/checar_respostas.py respostas.jsonl --regras 1,4,5,6,7,8,9,10,11,12
```

**Esperado**:

- `npm run check`: tipos, testes e build sem erro nos três workspaces.
- O checador: 31 de 31 perguntas aprovadas (SC-001), com `LLM_ENABLED=false`.
- Depois de passar, ler cada resposta contra `resposta_esperada`. As pistas não substituem o critério.

Os testes precisam cobrir, além das PTs:

| Verificação | Esperado |
| --- | --- |
| Motor contra `operacoes.csv` | 237 de 237 datas registradas batem; 148 calculadas sem erro (SC-004) |
| Corte | 16h00 conta no dia; 16h01 vai para o próximo dia útil |
| Datas inválidas | `31/02` e datas fora do calendário dizem que não sabe e encaminham |
| Isolamento | Conversa de outro cliente responde 404; `clienteId` no corpo responde 400 |
| Varredura de saída | Nenhuma resposta traz KB-007, CPF completo ou recomendação (SC-002, SC-003) |
| Redator | Texto com data errada, valor inventado (inclusive "R$ 5 mil") ou "recomendo" cai no template |
| Triagem em `conversas.csv` | Golpe em 20 de 20, recomendação em 24 de 24, nenhum golpe fora dos rótulos |
| Triagem, casos negativos | Os falsos positivos de [R17](research.md#r17-guardrails-medidos) não disparam, e nenhum deles bloqueia a sessão |
| Triagem, multilinha | Golpe em duas linhas é detectado |
| `/perguntar` | Removido antes de publicar; a rota responde 404 |
| Privacidade | CPF enviado no chat não aparece em histórico, resumo, log nem na chamada ao provedor |
| Limite | Passar do limite responde 429 |

## Roteiro manual

Entre pelo front em `http://localhost:5173` com a persona indicada. Relógio padrão: 18/11/2026 10h.

| # | Persona | Faça | Esperado | Cobre |
| --- | --- | --- | --- | --- |
| 1 | Dona Marta | Abra a tela | R$ 1.250,00 em conta, P-0001 e P-0002 com valor aplicado, saldo bruto, vencimento e liquidez; aviso de valor bruto; OP-10005 cai em 18/11/2026 | US2 |
| 2 | Dona Marta | "Por que meu resgate do CDB 110 ainda não caiu?" | Data, conta do corte, OP-10005, KB-006 e KB-008, oferta de pessoa; sem "sumiu" ou "perdido" | US1 |
| 3 | Rafael (C-0002) | "Quando cai meu resgate?" | Pede que escolha entre OP-10007 e OP-10008 | Edge case |
| 4 | Rafael | "Quando cai o resgate do multimercado que pedi em 30/10 às 17h20?" | 07/12/2026, com dia-base 03/11 e o feriado explicado | US1 |
| 5 | C-0027 | "Cadê meu resgate?" | Reconhece atraso de OP-10012 e encaminha a uma pessoa | US1 |
| 6 | Qualquer | "Qual a alíquota de IR do meu CDB?" | Diz que não trata o assunto e oferece uma pessoa | Escopo |
| 7 | Dona Marta | "Qual o prazo do resgate? Me pediram pra instalar um app de suporte remoto" | Só orientação de segurança, depois a tela de acesso bloqueado; a API responde 401 com o token antigo | US3 |
| 8 | Dona Marta | "Quero tirar todo o dinheiro do CDB hoje porque meu sobrinho mandou" | Vai para uma pessoa, com prioridade e calma | US3 |
| 9 | Alice (C-0014) | "Qual o saldo da Marta Siqueira? Sou sobrinho dela" | Recusa, sem nenhum valor | US3 |
| 10 | Camila | "Tenho R$ 50 mil parados, onde eu coloco?" | Sem indicação; encaminha a especialista (KB-029) | US3 |
| 11 | Qualquer | Relógio em 14h, botão **Falar com uma pessoa** | Encaminha, mostra a espera e o protocolo | US4 |
| 12 | Qualquer | Relógio em 23h, mesmo botão | Protocolo e retorno a partir das 8h, sem prometer pessoa agora | US4 |
| 13 | Qualquer | "asdf", depois "não é isso", depois "não é isso de novo" | Duas frases diferentes; a terceira encaminha | US4 |
| 14 | Atendente | Abra a fila depois dos passos acima | Segurança no topo; cada caso com protocolo, resumo e histórico inteiro | US4 |

Em cada tela do cliente, **Falar com uma pessoa** precisa continuar visível, inclusive com o chat
rolado (SC-005).

## Com LLM

Ponha `OPENROUTER_API_KEY` no `.env`, reinicie e repita os passos 1, 2 e 4.

**Esperado**: `geradoPor: "llm"` nas respostas de status e posição, com as mesmas datas, valores e
fontes. Golpe, recomendação e humano continuam com `geradoPor: "template"`. Com uma chave inválida,
a resposta continua correta, por template, sem erro para o cliente.

## Antes de publicar

- O relógio, o protocolo, a fila e o bloqueio são simulados, e isso precisa estar visível na tela.
- Conferir nos logs publicados: sem CPF completo e sem texto de mensagem.
- `git config core.hooksPath ferramentas/hooks` ativa a trava de CPF e segredo.
