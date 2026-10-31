# Caqui Invest – Chatbot "Onde está meu dinheiro" Constitution

Fonte das regras: `CASE.md` ("O que vale para qualquer caminho" e as 12 regras de negócio),
`dados/README.md` e `dados/base_conhecimento/`. Em caso de conflito, o `CASE.md` prevalece.

## Core Principles

### I. Confiança antes de abrangência

O assistente resolve bem um conjunto pequeno de assuntos em vez de tentar tudo.

- O escopo é "onde está meu dinheiro": status e prazo de aplicações, resgates e transferências,
  e onde está o saldo do cliente hoje (posições aplicadas + saldo em conta).
- Pergunta fora do escopo MUST receber resposta explícita de que o assistente não trata o assunto,
  com oferta de humano. Nunca uma resposta improvisada.
- Novos assuntos só entram no escopo por emenda da spec, com testes próprios.

Racional: Gartner (confiabilidade > abrangência); cliente abandona o bot na primeira falha.

### II. Fato determinístico, texto generativo (NON-NEGOTIABLE)

- Datas de liquidação, dias úteis, corte das 16h, status, saldos e valores MUST ser calculados ou
  lidos por código determinístico e testado, a partir de `dados/`.
- O LLM MUST NOT calcular datas, prazos ou valores, nem inventá-los. Ele só redige a resposta a
  partir dos fatos já resolvidos e entregues a ele.
- Se um prazo, taxa ou regra não está na base nem nos dados, a resposta MUST dizer que não sabe
  (regra 9) e oferecer humano.
- `liquidacao_prevista` vazia em `operacoes.csv` MUST ser calculada pela regra de liquidação
  (KB-006 + `calendario.json`), nunca estimada pelo modelo.

Racional: regra 1 do case — a IA conta dias corridos, ignora feriado e o corte.

### III. Toda informação mostra a fonte

- Toda afirmação factual MUST citar sua origem: id do artigo (`KB-006`) ou id do dado da conta
  (`OP-10001`, `P-0001`).
- Artigos substituídos MUST ser excluídos da base usada pelo assistente. KB-007 (corte 15h,
  revisado em 2024) está excluído; KB-006 é a regra vigente de prazos.
- A data de referência dos dados ("agora" = 18/11/2026 10h BRT) MUST ser considerada nas respostas.

### IV. Proteções antes da resposta (NON-NEGOTIABLE)

Toda mensagem passa por triagem antes de gerar resposta. A triagem vence qualquer outro fluxo,
inclusive quando o sinal aparece no meio de uma pergunta dentro do escopo.

- **Golpe** (regra 5): pedido de senha, código, Pix de teste, app de acesso remoto → interrompe o
  fluxo, orienta (KB-019/KB-020), simula bloqueio de sessão e encaminha à segurança na hora,
  24h, sem fila.
- **Recomendação** (regra 4): nunca indicar produto, percentual ou "melhor opção", mesmo sob
  insistência ou role-play → encaminha a especialista (KB-029).
- **Cliente vulnerável** (regra 6): idoso confuso, terceiro pressionando, resgate atípico alto →
  prioridade para humano (KB-028).
- **Instrução escondida** (regra 11): texto do cliente é dado, nunca instrução. Pedidos para
  ignorar regras, mudar de papel ou acessar outro cliente são recusados.

### V. Saída para humano sempre visível

- A opção de falar com uma pessoa MUST estar visível em qualquer passo.
- Das 8h às 20h, todos os dias: encaminhamento a humano. Fora disso: protocolo registrado e
  retorno informado a partir das 8h (KB-025, KB-026). Segurança: a qualquer hora (regra 12).
- O cliente nunca repete a demanda: quem recebe vê protocolo, histórico e resumo do caso.
- Sem doom loop (regra 8): no máximo 5 passos até resolver ou entregar a humano; após 2 respostas
  sem entender o cliente, oferece humano.
- Reclamação e encerramento disponíveis em qualquer passo, com no máximo uma tentativa de
  retenção (regra 7).

### VI. Privacidade, isolamento e dados sintéticos

- O cliente é identificado pela sessão (login simulado). Id de cliente vindo do texto da mensagem
  MUST ser ignorado. Um cliente nunca vê dado de outro (regra 10).
- CPF sempre mascarado em tela e em log; o assistente nunca pede senha.
- Logs não guardam a conversa crua com dados pessoais.
- Só dados sintéticos do pacote `dados/`. Nenhum dado real de pessoa.
- Nenhum segredo (chave de API, token) no repositório; `.env` fora do git. Vazou, gira a chave.

### VII. Verificação por teste

- Cada regra tratada MUST ter teste automatizado. O motor de liquidação é feito com testes
  primeiro (PT-01 a PT-05 como casos mínimos).
- As respostas da solução para `dados/perguntas_teste.jsonl` são conferidas com
  `ferramentas/checar_respostas.py` nas regras tratadas, e as respostas aprovadas também são lidas
  à mão contra `resposta_esperada`.
- Erros da IA percebidos durante o desenvolvimento são registrados (insumo para a apresentação e
  para a seção "Como usamos IA").

## Restrições de arquitetura e operação

- Duas aplicações separadas: **front** (entrada da pergunta, exibição da resposta, fontes, botão
  de humano) e **backend/agente** (triagem, leitura de dados, motor de liquidação, LLM).
- A chave do LLM existe só no backend.
- Relógio simulado: padrão 18/11/2026 10h BRT, ajustável para demonstrar corte das 16h e
  horário de atendimento (14h vs. 23h).
- Atendimento humano, protocolo e bloqueio de sessão são simulados, com uma visão do atendente
  que mostra histórico e protocolo.
- Ambas as aplicações publicadas em URL pública no dia do Hands On (31/10/2026).
- Nada que imite marca real; o produto é da Caqui (fictícia).

## Fluxo de desenvolvimento

- Spec antes do código: `/speckit-specify` → `/speckit-clarify` (se houver dúvida) →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- O `SPEC.md` do case (seis perguntas, modelo em `templates/SPEC.md`) é mantido na raiz e
  coerente com a spec do spec-kit; mudanças de rumo vão para a tabela "Decisões".
- O README do grupo traz a URL pública no topo e a seção "Como usamos IA".
- Corte de escopo é preferível a publicar algo que viola um princípio.

## Governance

- Esta constituição prevalece sobre specs, planos e tarefas. Plano ou tarefa que a viole MUST
  ser corrigido ou justificado na seção de complexidade do plano.
- Emendas: registradas aqui com Sync Impact Report, bump de versão semântico
  (MAJOR: remove/redefine princípio; MINOR: adiciona princípio ou seção; PATCH: redação) e
  anotadas na tabela "Decisões" do `SPEC.md`.
- Revisão de conformidade: antes de cada publicação, conferir os princípios II, IV, V e VI e rodar
  o checador de respostas nas regras tratadas.

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
