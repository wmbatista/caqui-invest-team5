# Research: Assistente "Onde está meu dinheiro"

Não restou nenhum NEEDS CLARIFICATION. O que foi medido nesta pesquisa está em
[Evidências](#evidências).

## R1. Armazenamento

- **Decision**: sem banco. `dados/` é lido na subida e fica em memória, somente leitura. Sessões,
  conversas, mensagens e encaminhamentos ficam em `estado/memoria.ts`, atrás de uma interface.
- **Rationale**: é o pedido ("sem PostgreSQL, autocontida") e a decisão que o `ROADMAP.md` já tinha.
  Os dados são pequenos e estáticos, e o atendente roda no mesmo processo que o cliente. Não guardar
  em disco também simplifica FR-023.
- **Trade-off**: reiniciar zera conversas e fila. Numa hospedagem que dorme, a fila some durante a
  demo. Os dados da conta não são afetados.
- **Alternatives considered**: `node:sqlite` ainda é experimental no Node 22 e exigiria volume para
  sobreviver ao deploy; `better-sqlite3` traz compilação nativa; arquivo JSON traz escrita
  concorrente sem benefício para a demo.

## R2. Front

- **Decision**: `apps/web` com Vite, React e TypeScript, publicado como site estático separado. A
  API é indicada por `VITE_API_URL`. O CSS do caqui é reaproveitado.
- **Rationale**: a constituição pede duas aplicações, o `ROADMAP.md` já escolheu essa stack e
  `CORS_ORIGINS` já aponta para a porta 5173. O caqui usa JavaScript sem tipos, e o pedido é usar a
  linguagem deste projeto.
- **Alternatives considered**: servir HTML pelo Fastify, como o caqui, viola "duas aplicações" e
  mantém JavaScript sem tipos.

## R3. Contrato compartilhado

- **Decision**: `packages/contracts` com schemas Zod, compilado para `dist`. Os scripts da raiz
  compilam esse pacote antes de `dev`, `test`, `typecheck` e `build`. `npm run dev` sobe backend e
  front com `concurrently`.
- **Rationale**: o backend valida com os mesmos tipos que o front consome. A
  [OpenAPI](contracts/openapi.yaml) documenta o contrato, e um teste confere as rotas contra ela.
- **Alternatives considered**: tipos duplicados divergem; gerar tipos a partir da OpenAPI é mais
  ferramenta do que o projeto precisa.

## R4. Datas e horas

- **Decision**: data de calendário é `AAAA-MM-DD`; instante é época em ms; o fuso é -03:00 fixo; a
  aritmética usa UTC.
- **Rationale**: o Brasil não tem horário de verão nos dados e os instantes do CSV trazem offset.
  O protótipo em Node reproduziu todas as datas registradas ([Evidências](#evidências)). Não depende
  do fuso da máquina.
- **Alternatives considered**: biblioteca de datas é dependência sem necessidade; `Date` local
  quebraria em servidor com fuso UTC.

## R5. Regras em português

- **Decision**: `src/regras/regras-caqui.ts`, um módulo tipado com código, título, camada
  (Constituição, Lei, Decreto), texto, instrução ao LLM e parâmetros. São 17 regras: as 19 do caqui
  menos CQ-02 e CQ-03. Referências a Eugênio, IRP, clone e André saem do texto.
- **Rationale**: preserva a boa ideia do caqui, em que código, modelo e tela leem a mesma regra. Por
  ser módulo, entra no build sem caminho de arquivo em `dist` e `tsc` valida os parâmetros.
- **Herdado, a confirmar pelo grupo**: resgate atípico = 50% ou mais do investido, ou R$ 20.000 ou
  mais (CQ-D1). O número foi decisão de outro grupo e **não vem do CASE**. Vai para "Decisões" do
  `SPEC.md`.
- **Simulado**: espera de "cerca de 1 minuto" com prioridade e "cerca de 6 minutos" sem. Ficam como
  parâmetros marcados como simulados, porque PT-28 e KB-025 pedem um tempo estimado e não existe
  fila real.

## R6. Sessão

- **Decision**: `POST /sessoes` recebe o id de uma persona de uma lista fixa e devolve um token
  aleatório. Sem senha. O token expira por ociosidade (8 h) e por idade (24 h). O relógio pertence à
  sessão. Personas: C-0001, C-0002, C-0003, C-0014, C-0027 e um atendente.
- **Rationale**: FR-001 pede login simulado. A senha do caqui era exibida na própria tela, então
  scrypt e limite de tentativas não protegiam nada. C-0027 entra porque nenhuma das quatro personas
  do caqui tem operação atrasada, e a US1 precisa demonstrar isso (OP-10012).
- **Alternatives considered**: portar scrypt é código sem efeito; listar os 50 clientes polui a tela
  sem acrescentar caso de demonstração. Os testes e o `avaliar` usam qualquer cliente pelo serviço.

## R7. Papel do LLM

- **Decision**: toda resposta nasce de um template correto. Só nos fluxos de status e posição o
  redator pode reescrever esse texto, recebendo os fatos e a mensagem do cliente marcada como dado.
  O verificador amplia o `hasOnlyKnownCurrencyValues` do MVP0, que só reconhece valores com centavos:
  toda data, todo valor em R$ em qualquer formato ("R$ 5 mil") e todo id citado precisam existir nos
  fatos, e ele rejeita termos de CQ-C2, "sumiu", "perdido" e CPF. O CPF também é mascarado antes de a
  mensagem chegar ao provedor. Qualquer falha, timeout ou ausência de chave usa o
  template, sem erro HTTP. Máximo de 5 chamadas por conversa.
- **Rationale**: a descrição da spec pede um agente que usa LLM, e o princípio II proíbe o LLM de
  decidir fatos. O caqui só usa o modelo em conceitos, assunto que esta spec exclui. Sem esse
  desenho, o LLM ficaria sem uso.
- **Consequência**: golpe, recomendação, vulnerável, injeção e humano nunca chamam o provedor. Os
  erros 502 e 504 de hoje somem do chat.
- **Alternatives considered**: remover o LLM contraria a descrição da feature; deixá-lo responder
  livremente contraria o princípio II.

## R8. Escopo do porte

- **Decision**: IR, comparação com poupança e conceitos **não** são portados. Essas perguntas recebem
  resposta clara de que o assistente não trata o assunto, com oferta de humano. A avaliação cobre as
  regras 1 e 4 a 12: 31 das 40 perguntas. PT-06 a PT-12, PT-39 e PT-40 ficam fora.
- **Rationale**: a spec marca as regras 2 e 3 como "Não" e exclui conceitos. O princípio I só admite
  assunto novo por emenda da spec, com testes próprios. O pedido fala em informações "principais".
- **Alternatives considered**: portar tudo faria o caqui inteiro caber aqui, mas exigiria emendar a
  spec antes, e essa decisão não cabe ao plano.

## R9. Bloqueio por golpe

- **Decision**: ao detectar golpe, o backend abre o encaminhamento para a segurança, responde com a
  orientação e `sessaoBloqueada: true`, e encerra todas as sessões do cliente. O front mostra a tela
  de acesso bloqueado. Entrar de novo funciona, porque é simulado.
- **Rationale**: FR-013, o cenário 1 da US3 e o CASE (regra 5) pedem o bloqueio como parte do fluxo.
  `resposta_esperada` e KB-020 falam em "oferecer", mas o CASE prevalece e bloquear também protege.
- **Trade-off**: falso positivo derruba a sessão. As travas do caqui marcam como golpe perguntas
  comuns como "recebi uma mensagem que meu pix caiu", dentro do próprio escopo do produto. Por isso
  o bloqueio automático **depende dos ajustes de [R17](#r17-guardrails-medidos)**.
- **Alternatives considered**: o botão "Bloquear acesso" do caqui depende de a vítima agir sob
  pressão.

## R10. Vulnerável e resgate atípico

- **Decision**: terceiro pressionando, confusão ou resgate total **declarado como intenção** ("quero
  tirar tudo"), em qualquer idade, levam a humano com prioridade. Pergunta hipotética ("quanto recebo
  se resgatar tudo?") não encaminha: `conversas.csv` traz esse caso sem rótulo de vulnerável. Consultar um resgate atípico que já está em andamento **não** encaminha: a resposta
  traz a data e oferece uma pessoa quando o cliente tem 60 anos ou mais.
- **Rationale**: FR-015 pede encaminhamento, mas a Dona Marta tem OP-10005 de R$ 40.000 em andamento
  e PT-03 espera `responder` para ela. Forçar a passagem reprovaria uma pergunta do case. A leitura
  adotada é que FR-015 vale para a intenção declarada na mensagem.
- **Alternatives considered**: restringir o resgate total a 60 anos ou mais, como o caqui, contraria
  o texto do FR-015.

## R11. Protocolo

- **Decision**: cada conversa recebe o protocolo `CQ-AAAAMMDD-NNNN` na criação. Encaminhamentos são
  uma lista que só cresce, ligada ao protocolo. Conversa sem encaminhamento conta como resolvida.
- **Rationale**: FR-019 e KB-026 dizem "todo atendimento". Uma conversa pode ter reclamação e depois
  golpe, e nada pode se perder.
- **Alternatives considered**: um protocolo por passagem, como no caqui, deixa conversas resolvidas
  sem protocolo.

## R12. Operações ambíguas e inexistentes

- **Decision**: a busca filtra por família de produto, data e status. Com mais de uma candidata e
  nada que desempate, responde pedindo a escolha, com `opcoes`. Com produto e data, mas sem operação,
  calcula o prazo hipotético só com KB (PT-01, PT-02 e PT-05 dependem disso). Sem produto ou data e
  sem operação, diz que não encontrou e lista as recentes.
- **Rationale**: atende à spec e mantém as perguntas de teste que descrevem um pedido sem linha
  correspondente no CSV para o cliente usado.
- **Limitação**: o status vem da foto de 18/11. Mudar o relógio altera datas e horário, mas não faz
  uma operação liquidar.

## R13. Variáveis de ambiente e caminhos

- **Decision**: os scripts usam `tsx --env-file-if-exists=../../.env`, e o `start` usa
  `node --env-file-if-exists=../../.env`.
- **Rationale**: **hoje o `.env` da raiz não é lido**: nada no código o carrega, e o `npm run dev`
  roda em `apps/backend`. Com o README atual, a chave do OpenRouter nunca chegaria ao processo. A
  opção foi testada com `tsx`: carrega o arquivo e, se ele faltar, só avisa e segue.
- **Alternatives considered**: `dotenv` é dependência desnecessária no Node 22.

## R14. Leitura de CSV

- **Decision**: `split` por linha e por vírgula, com validação Zod por registro e erro claro na
  subida.
- **Rationale**: os arquivos usados não têm aspas (0 ocorrências em `operacoes.csv` e `posicoes.csv`).
  `conversas.csv` não é carregado pela aplicação.
- **Alternatives considered**: `csv-parse` é dependência sem caso de uso aqui.

## R15. Abuso e custo na URL pública

- **Decision**: limitador próprio e pequeno no chat, em memória (30 por minuto por IP, configurável),
  mensagem de até 2000 caracteres, teto de chamadas ao LLM por conversa, `LLM_ENABLED=false` e
  `ESTADO_MAX_CONVERSAS` (padrão 2000), que remove as conversas antigas sem encaminhamento.
- **Rationale**: a chave é paga por mensagem, e estado em memória sem teto cresce até derrubar o
  processo. Um processo só não precisa de limitador distribuído.
- **Alternatives considered**: `@fastify/rate-limit` 9, a linha para Fastify 4, pede `toad-cache`
  `^3.3.1`, e o `package.json` da raiz força `toad-cache` em `3.3.0`. Adotar o plugin obrigaria a mexer
  nesse override, por um contador de poucas linhas.

## R16. Armadilhas de Python para TypeScript

Cada item vira teste, porque a tradução literal compila e erra em silêncio:

| Em Python | Em TypeScript |
| --- | --- |
| `weekday()` com segunda = 0 | `getUTCDay()` com domingo = 0: usar `(d + 6) % 7` |
| `(a - b) % 7` nunca é negativo | `%` pode dar negativo: usar `((a - b) % 7 + 7) % 7` |
| `date(2026, 2, 31)` lança erro, e isso leva a "não sei" | `Date` aceita e rola para março: validar e lançar `DataInvalida` |
| `ValueError` fora do calendário vira "uma pessoa verifica" | Erro próprio `ForaDoCalendario`, sem engolir outros erros |
| `encode("ascii", "ignore")` remove todo não ASCII | NFKD **e** remover `[^\x00-\x7f]` |
| Formatação manual de `R$` | `Intl` usa espaço não separável e reprova pistas: usar `brl()` próprio |
| Soma de `Decimal` | Somar em centavos inteiros |
| Comparar `time` com 16:00 inclui 16:00:00 e exclui 16:00:30 | Comparar segundos do dia com `<=` |
| `lru_cache` em dados | Passar o repositório por parâmetro, o que permite testes sem estado global |

## R17. Guardrails medidos

- **Decision**: portar as travas do caqui com os ajustes abaixo e transformar `conversas.csv` em
  teste de regressão.
- **Rationale**: 10 de 10 perguntas de golpe e recomendação passam nas travas do caqui, contra 4 de
  10 no `safety.ts` atual, mas as perguntas do case não bastam: os testes adversariais acharam furos
  e falsos positivos que elas não mostram.
- **Alternatives considered**: portar sem ajuste deixa passar golpe e bloqueia cliente legítimo; uma
  segunda camada de triagem com LLM (T11, opcional no roadmap) tornaria uma proteção inegociável
  dependente de um serviço externo.

Travas do caqui em JavaScript, com os turnos do cliente em `conversas.csv` (300 conversas):

| Sinal | Rotuladas | Detectadas | Sem rótulo, mas detectadas |
| --- | --- | --- | --- |
| Golpe | 20 | 20 | 0 |
| Recomendação | 24 | 21 | 2 (ambas são injeção pedindo papel de assessor, então a detecção está certa) |
| Injeção | 10 | 10 | 2 ("finge que é meu assessor", detecção certa) |
| Vulnerável | 12 | 11 | 10 |

O rótulo é por conversa, e parte dos casos depende de contexto. A perda em vulnerável ("quero ver se o
dinheiro está lá mesmo") só é identificável pela idade, então não vira padrão de texto. Vulnerável
serve como referência, não como meta numérica.

| Ajuste | Caso medido | Depois do porte |
| --- | --- | --- |
| Juntar espaços e quebras de linha antes de testar | "o gerente me ligou⏎⏎pediu o código" não é detectado | Golpe |
| Pedido de senha por terceiro sem nomear canal | "um rapaz disse q é da caqui e quer minha senha" não é detectado | Golpe |
| "Devo tirar/colocar" | "Devo tirar da poupança e colocar no CDB?" não é detectado (3 conversas) | Recomendação |
| Exigir pedido, não só palavra | "recebi uma mensagem que meu pix caiu", "o que é token?" e "esqueci minha senha, como passar pra nova?" viram golpe | Sem golpe |
| `sugest` só com investimento | "tenho uma sugestão pro app" vira recomendação | Sem recomendação |
| Terceiro precisa pressionar sobre dinheiro | "meu filho disse que o app é bom" vira vulnerável | Sem vulnerável |
| Intenção de resgate total | "quanto recebo se resgatar tudo?" vira vulnerável | Sem vulnerável |

**Limite conhecido**: padrões de texto não pegam tudo. "Me mandaram um link pra confirmar meus dados"
não é detectado e fica como teste de caso conhecido, a decidir pelo grupo. A saída para humano
visível é a proteção quando a triagem falha.

Testes exigidos: golpe em 20 de 20 e recomendação em 24 de 24 nas conversas rotuladas, zero golpe
fora dos rótulos, e os casos negativos da tabela.

## Evidências

Medido em 31/10/2026 neste repositório:

- **Guardrails**: scripts descartáveis, fora do repositório, contra `main` em `0af97ee`, com provedor
  falso. Nenhuma chamada real ao OpenRouter.

- **Dados**: `diff -rq dados ../caqui/dados` e o `diff` do checador não acusaram diferença.
- **Regra de liquidação em Node**: protótipo descartável sobre `operacoes.csv`. **237 de 237** datas
  registradas batem; 148 operações sem data foram calculadas sem erro; 15 recusadas ficam de fora.
  Os casos de PT-01 a PT-05 e o corte de 16h00 e 16h01 passam.
- **Atrasos no dado**: quatro operações (OP-10012, OP-10013, OP-10014, OP-10016).
- **Ambiguidade no dado**: C-0002, C-0026, C-0032 e C-0044 têm mais de uma operação em aberto.
- **Linha de base**: em `0af97ee`, `npm test` passa com 13 testes em 6 arquivos, e `npm run typecheck`
  não acusa erro.
- **`.env`**: continua sem ser lido em `0af97ee`, então R13 segue válido.
- **Não verificado**: os "40/40" e "15 testes" do caqui. Eles exigem PostgreSQL e o banco `eugenio`,
  que não existem nesta máquina (`psql` não está instalado).
