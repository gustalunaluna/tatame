# 03 — Rolas, parceiros e sinergia

## 3.1 Por que a dupla é a unidade

O jiu-jitsu não tem time. Não tem posição em campo. A unidade social real é
**duas pessoas no chão por cinco minutos**, e ela se repete centenas de vezes com
as mesmas pessoas.

Quem treina há dois anos tem uma lista mental precisa: com quem rola sempre, com
quem rola quando dá, com quem evita, quem melhorou muito no último ano, quem
passou de nível. Essa lista é a memória social mais rica que um praticante tem, e
nenhum app a guardava.

## 3.2 Parceria

**Estado: CONSTRUÍDO.** Tabela `partnerships`.

Uma parceria é uma relação simétrica com aceite dos dois lados.

```
   Você                                    A outra pessoa
     │                                            │
     │  convida (@handle)                         │
     ├───────────────────────────────────────────▶│
     │                                            │
     │              aceita / recusa               │
     │◀───────────────────────────────────────────┤
     │                                            │
     ▼                                            ▼
  "Vocês são parceiros de rola"        e o placar passa a existir
```

**Busca só por @ exato.** Não existe busca parcial, e isso é de propósito: uma
busca por nome permitiria varrer a base inteira. Você adiciona alguém porque
alguém te passou o @, que é como se troca contato no tatame de qualquer forma.

### Estados

| Estado | Significa | O que aparece |
|---|---|---|
| `pendente` | Convite enviado, sem resposta | "Convite em aberto" |
| `aceito` | Relação ativa | Placar, aparece no perfil dos dois |
| `recusado` | Negado | Nada. Não há notificação de recusa — recusa não deve ser um evento social |

## 3.3 A rola registrada

**Estado: CONSTRUÍDO.** Tabela `training_partners`.

Ao registrar um treino, você marca com quem rolou, e opcionalmente o placar:
quantas finalizações a favor, quantas contra.

Este é o dado mais delicado do app inteiro. É a única coisa que uma pessoa
escreve sobre outra.

### O sistema de confirmação com prazo

Quando você registra "rolei com a Maria, 2 finalizações a favor, 1 contra", a
Maria recebe isso como **pendente**. Ela pode:

- **confirmar** — o registro vale
- **contestar** — o registro nunca vale, para ninguém
- **não fazer nada** — e aí o prazo resolve

```
  registro criado
        │
        ├─── confirmado ──────────────▶ conta no placar dos dois
        │
        ├─── contestado ──────────────▶ não conta para ninguém, nunca
        │
        └─── pendente ──── 7 dias ────▶ conta no placar dos dois
                  │
                  └── dentro do prazo: aparece em "a confirmar",
                      com os dias restantes visíveis
```

**Por que sete dias, e por que o silêncio conta a favor.** As duas alternativas
eram piores:

- *Confirmação obrigatória* — a maioria dos registros nunca seria confirmada,
  porque a maioria dos parceiros não usa o app com a mesma frequência. O placar
  ficaria permanentemente vazio e o recurso morreria.
- *Sem confirmação* — qualquer um escreveria qualquer coisa sobre qualquer um.

O prazo é o meio-termo honesto: **quem discorda tem uma janela real para
discordar**, e quem não se importa não precisa fazer nada. Sete dias é longo o
bastante para pegar alguém que treina uma vez por semana.

Implementação: `dias_para_contestar()` e `tp_vale()` na migração 006. As duas são
`stable` e usadas dentro das funções de resumo, então a regra existe em um lugar
só — mudar o prazo é mudar um número.

### A reabertura

**Estado: CONSTRUÍDO.** Gatilho `tp_reabre_confirmacao`.

Editar a lista de parceiros de um treino já confirmado devolve o registro para
pendente. Sem isso havia um buraco óbvio: registrar algo inofensivo, esperar a
confirmação, e depois trocar pelo que você queria de fato.

## 3.4 Sinergia entre parceiros

**Estado: PARCIAL.**

### O que existe

`resumo_parceiros()` devolve, para cada parceiro:

- sessões juntos
- rolas totais
- finalizações a favor e contra
- registros ainda pendentes
- primeira e última vez que treinaram juntos

E a tela de parceiros mostra a faixa da pessoa **no momento do registro**, não a
atual — o que permite ler "quando começamos a rolar ele era azul".

### O que falta, e o que sinergia deveria ser

**Estado: PROPOSTO.**

Sinergia, no sentido que a palavra merece, é: *esta dupla produz mais treino do
que cada um sozinho*. Os sinais que o dado já permitiria calcular:

| Sinal | Cálculo | O que diz |
|---|---|---|
| **Constância da dupla** | semanas com ≥1 rola juntos ÷ semanas em que ambos treinaram | Se vocês se procuram ou só se cruzam |
| **Equilíbrio** | \|finalizações a favor − contra\| ÷ total | Rola parelha é a que ensina; 12×0 é uma pessoa treinando e outra sobrevivendo |
| **Efeito de presença** | duração média das sessões com essa pessoa vs. sem | Se o parceiro faz você ficar mais tempo |
| **Amplitude de faixa** | diferença de graduação | Rolar só com quem é do seu nível é a estagnação mais comum |

**Como apresentar, e como não.** Nada disso pode virar nota, ranking ou
comparação entre parceiros. A apresentação proposta é uma frase por parceiro, no
cartão dele:

> *"Vocês rolaram em 31 das 40 semanas em que os dois treinaram. É a sua dupla
> mais constante."*

> *"14 rolas, 8×6. Parelho — é o tipo de rola que ensina mais."*

Frase, não gráfico. O gráfico convida à comparação; a frase fecha o sentido.

### O caso da faixa desigual

Um faixa-preta que rola com um branca vai finalizar dez vezes e não ser
finalizado. Mostrar isso como "8×0" faz o branca parecer ruim e o preta parecer
vaidoso, e não descreve nada do que aconteceu — porque o preta estava ensinando.

**Regra proposta:** quando a diferença de faixa é de dois níveis ou mais, o app
não mostra placar. Mostra "rola de aprendizado" e conta as sessões.

## 3.5 Buracos conhecidos

| Buraco | Impacto |
|---|---|
| Sinergia não passa de estatística bruta | Médio — o dado está lá, a leitura não |
| Sem notificação, "a confirmar" só é visto por acaso | Alto — a janela de 7 dias corre sem a pessoa saber |
| Placar não tem trava de faixa desigual | Médio — o cenário mais provável de constrangimento |
| Não há "rola sem treino registrado" | Baixo — hoje toda rola exige um treino pai |
