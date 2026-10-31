# Data Model: Assistente "Onde está meu dinheiro"

Nenhuma entidade vive em banco. **Dados da conta** são lidos de `dados/` na subida e nunca mudam.
**Estado de execução** fica em memória e some ao reiniciar. Campos de arquivo mantêm o nome original
em `dados/README.md`.

Tipos usados abaixo: `DataISO` = `AAAA-MM-DD`; `Instante` = época em ms; `Reais` = número com duas
casas, somado em centavos.

## Dados da conta (somente leitura)

### Cliente (`clientes.json`, 50)

`id`, `nome`, `idade`, `cidade`, `uf`, `cpf_mascarado`, `canal_preferido`, `cliente_desde`, `origem`,
`saldo_em_conta_brl`, `nota_persona`.

- `idade >= 60` dá prioridade na fila.
- Só existe `cpf_mascarado`; o CPF completo não existe em lugar nenhum dos dados.

### Produto (`taxas.json`, 10)

`codigo`, `nome`, `tipo`, `tributavel`, `liquidez`, `carencia_dias?`, `vencimento_dias?`, mais campos
de cotização. `tipo` em `ACOES` ou `codigo = FUNDO-MM-01` gera o aviso de oscilação (US2).

### Posição (`posicoes.csv`, 146)

`id_posicao`, `id_cliente`, `produto`, `data_aplicacao`, `valor_aplicado_brl`, `taxa_contratada`,
`vencimento?`, `saldo_bruto_brl`, `data_referencia`.

- Situação derivada, nesta ordem: vencida (`vencimento < hoje`); em carência
  (`data_aplicacao + carencia_dias > hoje`); só no vencimento (`liquidez = no_vencimento`); livre.

### Operação (`operacoes.csv`, 400)

`id_operacao`, `id_cliente`, `tipo`, `produto?`, `valor_brl`, `pedido_em`, `status`,
`liquidacao_prevista?`, `observacao?`.

- `tipo`: `aplicacao`, `resgate`, `transferencia_saida_pix`, `transferencia_entrada`. Transferência
  não tem produto.
- `status`: `pendente`, `em_processamento`, `liquidada`, `recusada`. Vem da foto de 18/11 e não muda
  com o relógio.
- Só operações com `pedido_em <= agora` são visíveis.

Data efetiva: registrada, senão calculada; recusada não tem data.

```text
recusada                                    → explica o motivo, dinheiro continua aplicado (KB-005, KB-011)
liquidada                                   → concluída na data efetiva
pendente | em_processamento, data < hoje    → atrasada: encaminha a humano (KB-008)
pendente | em_processamento, data = hoje    → cai hoje
pendente | em_processamento, data > hoje    → cai na data
```

### Dia do calendário (`calendario.json`, 01/10/2026 a 31/12/2027)

`data`, `dia_util`, `feriado?`. Data fora do intervalo lança `ForaDoCalendario`, e a resposta diz que
não sabe e encaminha (regra 9).

### Artigo (`base_conhecimento/KB-*.md`, 29 de 30)

`id`, `titulo`, `revisado_em`, `texto`. **KB-007 não é carregado.**

## Objetos calculados

### Prazo

`diaBase`, `pagamento`, `cotizacao?`, `passos[]`, `fontes[]`. Regra por produto, a partir do dia-base
(pedido em dia útil até 16h00:00 conta no dia; senão, próximo dia útil):

| Produto e tipo | Pagamento |
| --- | --- |
| CDB, LCI, LCA | no dia-base |
| Aplicação em fundo | cotização em D+1 útil, e essa é a data |
| Resgate Renda Fixa FIF | cotização em D+1 útil, pagamento em D+2 úteis |
| Resgate Multimercado FIF | cotização 30 dias corridos depois (ou próximo útil), pagamento 2 úteis depois |
| Tesouro Selic | D+1 útil |
| Ações | D+2 úteis |
| Transferência | na hora, no dia do pedido (KB-018) |

### Sinais da triagem

`golpe`, `recomendacao`, `injecao`, `outro_cliente`, `terceiro`, `confusao`, `resgate_total`,
`transfere_terceiro`, `humano`, `reclamacao`, `encerramento`, `nao_entendeu`.

Antes de testar os padrões, o texto é normalizado e tem espaços e quebras de linha reunidos.
`resgate_total` exige intenção declarada ("quero tirar tudo"), não pergunta hipotética
([R10](research.md#r10-vulnerável-e-resgate-atípico), [R17](research.md#r17-guardrails-medidos)).

Precedência, a primeira vence:

```text
golpe → recomendacao → injecao ou outro_cliente → terceiro, confusao ou resgate_total
      → reclamacao → encerramento → humano → fluxos de conteúdo → não entendi
```

`recomendacao` vem antes de `injecao` porque PT-36 ("agora é um assessor… onde investir") espera
`encaminhar_especialista`.

## Estado de execução (memória)

### Sessão

| Campo | Regra |
| --- | --- |
| `token` | aleatório; chave de acesso |
| `papel` | `cliente` ou `atendente` |
| `clienteId` | só para cliente; nunca vem do texto |
| `agora` | relógio da sessão; padrão `CLOCK_DEFAULT` |
| `criadaEm`, `usadaEm` | expira com 24 h de idade ou 8 h ociosa |

Termina por expiração, por `DELETE /sessoes/atual` ou por golpe, que encerra todas as sessões do
cliente.

### Conversa

`id` (UUID), `protocolo` (`CQ-AAAAMMDD-NNNN`, com a data do relógio), `clienteId`, `passos`,
`naoEntendidas`, `chamadasLlm`, `criadaEm`.

- Só existe para o dono: de outro cliente responde 404.
- `naoEntendidas` volta a zero quando uma mensagem é entendida.
- Depois de 2 não entendidas, a próxima encaminha (PT-27). No 5º passo, mensagem não entendida
  encaminha; resposta entendida ganha a oferta de uma pessoa.
- A resposta não entendida nunca repete a frase anterior.

### Mensagem

`id`, `conversaId`, `autor` (`cliente` ou `caqui`), `texto`, `acao?`, `regras[]`, `fontes[]`, `momento`.

- `texto` passa por `mascararCpf` **antes** de ser guardado ou enviado ao provedor de LLM. Não há
  caminho que guarde ou envie o texto cru.

### Encaminhamento

`id`, `protocolo`, `conversaId`, `clienteId`, `destino`, `prioridade`, `motivo`, `sinais[]`, `resumo`,
`status`, `momento`.

- `destino`: `humano`, `seguranca`, `especialista`, `retorno`, `reclamacao`.
- `prioridade` é verdadeira se `idade >= 60`, destino `seguranca` ou sinal de vulnerabilidade.
- `resumo` é montado por código: quem é, motivo, sinais e última mensagem, com CPF já mascarado.
- `status` é sempre `aberto`: encerrar caso está fora do escopo, porque o atendente é simulado.
- Lista só cresce. Conversa sem encaminhamento conta como **resolvida**.

Destino conforme o horário:

```text
golpe            → seguranca, a qualquer hora
recomendação     → especialista, a qualquer hora, com agendamento simulado
reclamação       → reclamacao, a qualquer hora, prazo de 7 dias corridos
humano, 8h–20h   → humano (8h00 abre; 20h00 já está fechado)
humano, fora     → retorno, a partir das 8h
```

**Fila do atendente**: segurança primeiro, depois prioridade, depois mais recente; até 50 casos.

## Regra

`code`, `titulo`, `camada` (`CONSTITUICAO`, `LEI`, `DECRETO`), `texto`, `instrucaoIa?`, `parametros`.
São 17: CQ-C1 a CQ-C6, CQ-01, CQ-04 a CQ-12 e CQ-D1. Parâmetros lidos pelo código: `corte`, `abre`,
`fecha`, `idade_prioridade`, `max_nao_entendidas`, `max_passos`, `prazo_dias`, `pct_investido`,
`valor_minimo`, `proibidas`, `espera_*` (simulados).

## Validações de entrada

Definidas em `packages/contracts` e detalhadas na [OpenAPI](contracts/openapi.yaml): `mensagem` com 1
a 2000 caracteres após `trim`; `conversaId` UUID; `momento` ISO 8601 válido; `personaId` da lista fixa.
Campos desconhecidos são rejeitados, então `clienteId` no corpo do chat responde 400.
