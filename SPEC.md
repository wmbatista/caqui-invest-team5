# SPEC: Onde está meu dinheiro

**Grupo:** team 5
**URL pública:** ainda não publicada

> Spec detalhada: [specs/001-onde-esta-meu-dinheiro/spec.md](specs/001-onde-esta-meu-dinheiro/spec.md). Mudanças de rumo vão para "Decisões".

## 1. Qual parte do problema?

O motivo **onde está meu dinheiro**, visto pela Dona Marta, que investe pela primeira vez pela parceria com o varejista.

- É o maior motivo de contato do `CASE.md`: 12.960 contatos por mês, 1.728 horas de atendente e 34% de recontato em 7 dias.
- Em `dados/conversas.csv`, 81 de 300 conversas têm esse motivo: 29 abandonadas, 45 resolvidas por humano, 7 em protocolo fora do horário e nenhuma resolvida pelo bot. 36 das 81 voltaram em 7 dias.
- O bot atual erra aqui: 16 vezes ignorou o corte das 16h e o fim de semana, e 13 vezes repetiu a mesma resposta.
- A base nova vem da parceria: 29 dos 50 clientes da amostra, e 14 dos 50 têm 60 anos ou mais.

## 2. Qual alavanca?

1. **Resolver sem humano.** Status, prazo e posição respondidos com a data calculada por código e a fonte à mostra.
2. **Evitar o contato.** A tela "Meu dinheiro" mostra cada posição e o que está em andamento, com a data em que cai.
3. **Fazer o humano render mais.** Golpe, pressão de terceiro e confusão chegam a uma pessoa com protocolo, resumo e histórico.

## 3. Quanto isso move?

| Premissa | Valor | De onde veio |
| --- | --- | --- |
| Contatos do motivo hoje | 12.960 por mês | `CASE.md` |
| Duração média | 8 min | `CASE.md` |
| Base em 18 meses | 5 vezes (2 milhões) | `CASE.md` |
| Horas por atendente | 154 h por mês | `CASE.md`: 9.560 h ÷ 62 atendentes |
| Resolvidos sem humano | 50% (sensibilidade: 30%) | **Hipótese**, a validar em piloto |
| Redução na duração dos casos entregues | 2 min (de 8 para 6) | **Hipótese**: quem atende já recebe protocolo e histórico |

**Conta, com 2 milhões de clientes:**

- Contatos do motivo: 12.960 × 5 = 64.800 por mês, ou 8.640 h.
- Com 50% resolvidos: 32.400 × 8 min = 4.320 h, cerca de 28 atendentes. Nos 32.400 entregues, 2 min a menos dão 1.080 h, cerca de 7 atendentes. **Total: cerca de 35.**
- Com 30% resolvidos: 19.440 × 8 min = 2.592 h, cerca de 17 atendentes. Nos 45.360 entregues, 2 min a menos dão 1.512 h, cerca de 10 atendentes. **Total: cerca de 27.**

São **de 27 a 35 atendentes a menos**, dos 210 que faltam (310 − 100). É uma peça do problema, não ele inteiro.

## 4. Como a confiança aparece?

- **Prova, não promessa.** A resposta traz a data e o porquê ("depois do corte das 16h, então conta a partir de 18/11").
- **Saída sempre visível.** Falar com uma pessoa, reclamar e encerrar ficam fixos como opções do chat, fora da área que rola. Das 8h às 20h, mostra a espera; fora disso, protocolo e retorno a partir das 8h.
- **Ela não repete.** Quem atende vê protocolo, resumo e o histórico inteiro.
- **Golpe para tudo.** A orientação vem na hora, o acesso é bloqueado (simulado) e a segurança é acionada a qualquer hora.
- **Diz quando não sabe.** Data fora do calendário vira "não vou arriscar um prazo", e assunto fora do escopo é dito como tal.

## 5. O que fica de fora?

- **IR, comparação com poupança e conceitos de produto.** O assistente diz que não trata o assunto e oferece uma pessoa.
- **Movimentar dinheiro.** A solução só lê; não aplica, não resgata, não transfere.
- **Telefone, URA e WhatsApp.** Só chat web.
- **Login, fila e bloqueio reais.** São simulados, e a tela avisa. O status das operações é a foto de 18/11: mudar o relógio altera datas e horário, mas não liquida operação.
- **Persistência.** Conversas e fila ficam em memória: reiniciar o processo zera tudo.

## 6. Como viabilizar esta solução?

1. Ligar a tela e o motor de prazos à API de operações e ao calendário reais. O motor já é código testado, não prompt.
2. Fazer um piloto com a coorte da parceria e medir recontato em 7 dias e satisfação, contra um grupo de controle. É ele que valida as hipóteses da seção 3.
3. Trocar o login simulado pela autenticação real e guardar conversas com retenção definida.
4. Integrar com a fila humana, mantendo a prioridade e a passagem com protocolo e resumo.
5. Revisar com compliance e jurídico os textos de golpe, de vulnerável e de "sem recomendação".

## 7. Quais regras do case tratamos?

| # | Regra | Trata? | Como vira teste | Se não trata, por quê |
| --- | --- | --- | --- | --- |
| 1 | Liquidação | Sim | PT-01 a PT-05 e todas as datas de `operacoes.csv` | |
| 2 | IR regressivo | Não | Responde que não trata (`escopo.test.ts`) | Fora do escopo da spec |
| 3 | Comparação com a poupança | Não | Responde que não trata (`escopo.test.ts`) | Fora do escopo da spec |
| 4 | Sem recomendação | Sim | PT-13 a PT-17, PT-36 e `conversas.csv` | |
| 5 | Golpe | Sim | PT-18 a PT-21 e `conversas.csv` | |
| 6 | Cliente vulnerável | Sim | PT-22 a PT-24 | |
| 7 | Reclamação e cancelamento | Sim | PT-25 e PT-26 | |
| 8 | Sem doom loop | Sim | PT-27 e PT-28 | |
| 9 | Não sabe, diz que não sabe | Sim | PT-29 a PT-31 e datas inválidas | |
| 10 | Dados pessoais | Sim | PT-32, PT-33 e inspeção de log | |
| 11 | Instrução escondida na conversa | Sim | PT-34 a PT-36 | |
| 12 | Horário | Sim | PT-37 e PT-38 | |

Os seis itens de "O que vale para qualquer caminho" se aplicam, porque a solução conversa com o cliente. **O item 3 (mostrar de onde veio) não é cumprido na tela:** ver "Decisões". O item 2 fala em explicar conceitos: aqui o assistente não os explica e encaminha, o que é mais restrito e não viola a regra.

Resultado medido: [docs/avaliacao.md](docs/avaliacao.md).

## Decisões

| Quando | Decisão | Por quê |
| --- | --- | --- |
| 31/10 | Portar o Caqui Confere para TypeScript, sem PostgreSQL | Pedido do grupo: solução autocontida, na linguagem deste repositório |
| 31/10 | IR, poupança e conceitos não entram | A spec exclui as regras 2 e 3, e a constituição só admite assunto novo por emenda |
| 31/10 | Resgate atípico = 50% ou mais do investido, ou R$ 20.000 ou mais | **Herdado do Caqui Confere, não vem do `CASE.md`. O grupo ainda precisa confirmar** |
| 31/10 | Golpe bloqueia o acesso automaticamente | O `CASE.md` pede o bloqueio no fluxo, e depender de um botão exige que a vítima aja sob pressão |
| 31/10 | Consultar resgate atípico em andamento oferece uma pessoa, sem encaminhar | FR-015 pede encaminhamento, mas PT-03 espera `responder` para a Dona Marta, com R$ 40.000 em andamento. FR-015 vale para a intenção declarada na mensagem |
| 31/10 | Resgate total declarado encaminha em qualquer idade; pergunta hipotética não | Texto de FR-015; "quanto recebo se resgatar tudo?" não é pedido |
| 31/10 | Remover `POST /perguntar` e o contrato antigo de `/api/v1/chat` | Recebiam o cliente no corpo ou mandavam a pergunta ao LLM sem fatos, sem triagem |
| 31/10 | Protocolo por conversa, e não por passagem a humano | KB-026: "todo atendimento gera um protocolo" |
| 31/10 | As regras não aparecem na tela nem na API, para cliente ou atendente | Pedido do grupo: o cliente não precisa saber das regras. Ele continua vendo a fonte (artigo ou dado da conta), que é exigência do case |
| 31/10 | Nenhum código na tela (KB, OP, P, C, CQ). Só o protocolo continua visível | Pedido do grupo: códigos não ajudam quem usa a tela |
| 31/10 | As fontes não aparecem na tela; os ids seguem na API (`fontes`), para rastreio | **Decisão do grupo, ciente de que descumpre o item 3 de "O que vale para qualquer caminho" do `CASE.md`**, além de FR-009, SC-003 e o princípio III. Desvio justificado em `plan.md` |
| 31/10 | Falar com uma pessoa, Reclamar e Encerrar conta viraram opções do chat; o botão Segurança saiu | Pedido do grupo. Golpe continua sendo detectado pelo texto da mensagem e vai para a segurança a qualquer hora, mas o cliente não tem mais um atalho para isso |
| 31/10 | "Me mandaram um link pra confirmar meus dados" segue sem ser detectado | Padrão de texto não pega sem gerar falso alarme. **Em aberto para o grupo**; registrado como `it.todo` |
