# Caqui Invest: atendimento que escala com confiança

## MVP do grupo: Caqui Chat API

O repositório agora inclui um backend Node.js/TypeScript para o frontend enviar mensagens a uma
LLM via OpenRouter usando sua API OpenAI-compatible.

```bash
cp .env.example .env
npm install
npm run dev
```

Em outro terminal, inicie o frontend:

```bash
npm run dev:frontend
```

Abra `http://localhost:5173`. Para apontar a interface para outro backend, copie
`apps/frontend/.env.example` para `apps/frontend/.env` e ajuste `VITE_API_URL`.

O endpoint do MVP0 é `POST /perguntar`; veja a [especificação](specs/001-chat-api-backend/spec.md),
o [OpenAPI](specs/001-chat-api-backend/contracts/openapi.yaml) e o [quickstart](specs/001-chat-api-backend/quickstart.md).
Este MVP não persiste conversas: o frontend reenvia o histórico em cada chamada.

```bash
curl -X POST http://localhost:3000/perguntar \
  -H 'content-type: application/json' \
  -d '{"id_cliente":"C-0001","pergunta":"Quanto eu tenho aplicado?"}'
```

Case aberto do **Hands On com IA: da concepção à produção**, 31/10/2026.

A Caqui Invest é uma corretora fictícia que vai sair de 400 mil para 2 milhões de clientes em 18 meses, e o time de atendimento só pode ir de 62 para 100 pessoas. O desafio é atender essa base sem a satisfação cair e sem perder a confiança de quem está entregando o próprio patrimônio.

Não há trilha, formato esperado nem resposta certa. O grupo lê os dados, escolhe a parte do problema que quer atacar, escreve a spec e leva a solução até uma URL pública no mesmo dia, com IA em todas as etapas.

> Tudo aqui é fictício: a empresa, as pessoas, os CPFs, as taxas, os saldos e as conversas. As regras são simplificadas para o desafio e não substituem a norma vigente.

## Por onde começar

1. Clique em **Use this template** para criar o repositório do grupo (público ou privado, como preferirem). Fork também funciona, mas um fork de repositório público fica público.
2. Leia o [CASE.md](CASE.md): contexto, números, personas e as doze regras.
3. Explore a pasta [`dados/`](dados/). O [README dos dados](dados/README.md) descreve cada arquivo e campo.
4. Antes de qualquer código, preencha o [SPEC.md](templates/SPEC.md) com as respostas às seis perguntas.
5. Construa, verifique e publique.

## O que tem aqui

```
.
├── CASE.md                    o case completo: contexto, números, personas e regras
├── dados/                     pacote de dados sintéticos, igual para todos os grupos
│   ├── README.md              descrição dos arquivos e campos
│   ├── base_conhecimento/     30 artigos de ajuda (KB-001 a KB-030)
│   ├── clientes.json          50 clientes fictícios
│   ├── posicoes.csv           146 posições em 18/11/2026
│   ├── operacoes.csv          400 aplicações, resgates e transferências
│   ├── conversas.csv          300 conversas rotuladas do atendimento atual
│   ├── calendario.json        dias úteis e feriados de out/2026 a dez/2027
│   ├── taxas.json             CDI, poupança, IR e regras dos produtos
│   └── perguntas_teste.jsonl  40 perguntas com resposta esperada, por regra
├── templates/
│   ├── SPEC.md                as seis perguntas que a spec responde
│   └── COMO-USAMOS-IA.md      seção para colar no README do grupo
└── ferramentas/
    └── checar_respostas.py    confere as respostas da solução contra perguntas_teste.jsonl
```

**"Agora" nos dados é 18/11/2026, 10h (horário de Brasília).** Saldos, status de operações e prazos foram calculados a partir dessa data.

## O que vale para qualquer caminho

1. Saída para humano visível em qualquer passo, das 8h às 20h. Fora desse horário, a solução registra o protocolo e informa o prazo de retorno.
2. Nenhuma recomendação de investimento. A solução explica conceitos e encaminha o pedido de recomendação para um especialista humano.
3. Toda informação factual mostra de onde veio: o artigo da base de conhecimento ou o dado da conta.
4. Suspeita de golpe interrompe o fluxo e encaminha para segurança na hora, sem fila.
5. O cliente nunca repete a demanda. Quem recebe o caso vê o histórico e o protocolo.
6. Só dados sintéticos. Nenhum dado real de pessoa, mesmo que seja do próprio participante.

Se a solução não conversa com o cliente (uma ferramenta interna ou um painel, por exemplo), os itens 1, 3, 4 e 5 que não se aplicarem saem com justificativa na spec. Os itens 2 e 6 valem sempre.

## Conferir as respostas

O `perguntas_teste.jsonl` traz, para cada pergunta, a resposta esperada, a ação esperada e pistas de texto (`deve_conter` e `nao_deve_conter`). Façam a solução responder às perguntas das regras que vocês tratam e gravem um JSONL assim:

```json
{"id": "PT-01", "resposta": "O pagamento cai em 05/11/2026...", "acao": "responder"}
```

Depois rodem (Python 3.9 ou mais novo, sem dependências):

```bash
python3 ferramentas/checar_respostas.py respostas.jsonl --regras 1,4,5
```

O script confere as pistas e a ação, e mostra o resultado por regra. As pistas não substituem o critério, que é a `resposta_esperada`: uma resposta pode passar nas pistas e mesmo assim estar errada. Leiam as respostas que passaram também.

## Regras do dia

- O Hands On não é competição: ninguém ganha e ninguém é ranqueado.
- Ferramenta, licença, repositório, conta de nuvem e deploy são de cada participante.
- Os mentores tiram dúvidas e dão direção, mas não põem a mão no teclado nem escolhem o problema pelo grupo.
- Nenhum segredo (chave de API, token) vai para o repositório. Se vazar, o grupo gira a chave na hora. O `.gitignore` já ignora `.env`.
- Nada que imite marca real. O produto é da Caqui, que é fictícia.
- Só dados sintéticos, sempre.

## Como o dia termina

Cada grupo mostra em poucos minutos o problema que escolheu e por quê, o produto rodando na URL pública e um momento em que a IA errou e o grupo percebeu. Para facilitar a conversa, deixem no repositório do grupo:

- `SPEC.md` com as respostas às seis perguntas ([modelo](templates/SPEC.md))
- uma seção **Como usamos IA** no README: ferramentas, harness e skills, e o que foi verificado na mão ([modelo](templates/COMO-USAMOS-IA.md))
- o link da URL pública no topo do README

## Dúvidas e erros nos dados

Achou dado inconsistente, regra ambígua ou artigo desatualizado? Parte disso é de propósito (a base tem pelo menos um artigo desatualizado). Se não for, abra uma issue aqui. Questionar os dados também conta como resultado.
