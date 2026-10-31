# Avaliação: Onde está meu dinheiro

Medido em 31/10/2026, sobre o código ainda sem commit, a partir de `main` em `0af97ee`.

## Perguntas do case

```bash
npm run avaliar
python ferramentas/checar_respostas.py respostas.jsonl --regras 1,4,5,6,7,8,9,10,11,12
```

**31 de 31 nas pistas**, com `NullProvider`, sem LLM. As 9 restantes (PT-06 a PT-12, PT-39 e PT-40) estão fora do escopo e recebem "não trato".

| Regra | Resultado |
| --- | --- |
| 1 | 5/5 |
| 4 | 5/5 |
| 5 | 4/4 |
| 6 | 3/3 |
| 7 | 2/2 |
| 8 | 2/2 |
| 9 | 3/3 |
| 10 | 2/2 |
| 11 | 3/3 |
| 12 | 2/2 |

## Leitura das respostas

As 31 respostas foram lidas contra `resposta_esperada`, e todas atendem. A leitura achou dois problemas que as pistas não pegam, ambos corrigidos:

- **PT-22:** "seu dinheiro continua aplicado" era impreciso para a Dona Marta, que tem um resgate de R$ 40.000 em andamento. Agora diz que nenhum pedido novo foi feito.
- **PT-05:** a explicação repetia o dia ("pedido em sábado, 14/11: 14/11 é sábado").

Duas diferenças ficam registradas:

- **PT-13 a PT-17:** a `resposta_esperada` diz que a solução *pode* explicar os produtos. Aqui ela só encaminha, porque conceitos estão fora do escopo.
- **PT-18 a PT-21:** a `resposta_esperada` fala em oferecer o bloqueio. Aqui ele é automático, como pedem o `CASE.md` e FR-013.

Esta leitura foi feita pelo agente de IA que escreveu o código. **Falta a leitura por uma pessoa do grupo**, como pede o princípio VII.

## Triagem contra `conversas.csv`

| Sinal | Rotuladas | Detectadas |
| --- | --- | --- |
| Golpe | 20 | 20, nenhum alarme fora dos rótulos |
| Recomendação | 24 | 24 |
| Injeção | 10 | 10 |

Os padrões foram ajustados olhando estas mesmas conversas, então o número mostra ausência de regressão, não a taxa esperada em mensagens novas. Limite conhecido: "me mandaram um link pra confirmar meus dados" não é detectado.

## Motor de prazos

237 de 237 datas registradas em `operacoes.csv` batem, e as 148 sem data são calculadas sem erro.

## Testes automáticos

`npm run check` cobre tipos, testes e build. O total de testes está na saída do comando.

## Roteiro do `quickstart.md`

Rodado com `npm run dev` em Chrome real, sem simulação da API: **27 de 27 verificações**, cobrindo os 14 passos, o botão visível com a página rolada (SC-005) e nenhum erro de script ou CORS no navegador. As telas foram capturadas e conferidas. O log real do servidor não trouxe CPF nem texto de mensagem.

## LLM

Testado com o build de produção, um `.env` de verdade e `OpenRouterProvider` contra um **servidor falso compatível**:

| Caso | Resultado |
| --- | --- |
| Status e posição | Redigidos pelo LLM, com os mesmos fatos |
| Golpe, recomendação e humano | Template, sem chamar o provedor |
| LLM inventa um valor | Cai no template |
| Provedor fora do ar | Template, sem erro |
| Sem chave | Template, sem erro |

**Não testado com o OpenRouter real**, porque não havia chave disponível. Não se sabe com que frequência um modelo real passa pelo verificador, que é rígido: se reprovar sempre, a aplicação continua correta, só que sempre por template. `npm run llm:ping` confirma a conexão, mas não essa taxa.

## Desvio conhecido

A tela não mostra as fontes, por decisão do grupo. A API continua devolvendo-as, e os testes conferem isso, mas o item 3 do `CASE.md`, FR-009 e SC-003 não são atendidos na tela.

## Publicação

Não feita. Exige as contas do grupo.
