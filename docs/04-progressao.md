# 04 — Progressão: horas, níveis, graduação

## 4.1 As três escadas, e por que são três

O Ponteira mede progresso em três eixos que **não se convertem entre si**. Isso
é a decisão de design mais importante do produto e a mais fácil de estragar.

| Escada | Quem controla | Muda em | Significa |
|---|---|---|---|
| **Faixa** | O professor | anos | Reconhecimento humano de competência |
| **Nível** | O relógio | semanas | Volume acumulado de tatame |
| **Meta** | Você | meses | O que você decidiu perseguir |

Um app que fundisse as três teria um número só, mais simples — e mentiria. Horas
não produzem faixa (todo mundo conhece alguém que treina há seis anos e é azul),
faixa não produz horas (todo mundo conhece um preta que sumiu), e nenhuma das
duas é a meta que a pessoa escolheu.

## 4.2 Nível por horas de tatame

**Estado: CONSTRUÍDO.** `src/lib/nivel.ts`.

O nível vem de **minutos totais de treino registrados**, convertidos em horas.

### A escada

Horas necessárias para entrar em cada nível:

| Nível | Horas | Nível | Horas |
|---|---|---|---|
| 2 | 10 | 12 | 660 |
| 3 | 25 | 13 | 820 |
| 4 | 50 | 14 | 1.000 |
| 5 | 80 | 15 | 1.200 |
| 6 | 120 | 16 | 1.450 |
| 7 | 170 | 17 | 1.750 |
| 8 | 230 | 18 | 2.100 |
| 9 | 300 | 19 | 2.500 |
| 10 | 400 | 20 | 3.000 |
| 11 | 520 | 21+ | +600 cada |

### Por que essa curva

Os degraus abrem depressa no começo e desaceleram. Uma semana de treino já sobe
do 1 para o 2; do 20 para o 21 leva quase um ano.

Isso não é manipulação de engajamento — é a curva real do esporte. Os primeiros
meses de jiu-jitsu produzem uma sensação de progresso quase diária, e depois de
três anos a evolução é medida em detalhes que ninguém fora do tatame percebe.
A escada de níveis contando a mesma história é honestidade, não truque.

### O que o nível não é

A versão anterior era `floor(treinos / 5) + 1`. Dez treinos de quarenta minutos
valiam o mesmo que dez de duas horas, e subir de nível era só abrir o app cinco
vezes. Era o número mais destacado da tela e não queria dizer nada.

**Mat time** é a palavra que o esporte inteiro usa para medir quem está adiante.
O nível é essa palavra, dita em voz alta.

**Posição na tela:** abaixo da faixa, sempre, com uma linha explicando que não a
substitui. Ver regra 1 no capítulo 01.

## 4.3 Histórico de graduação

**Estado: CONSTRUÍDO.** Tabela `graduations`.

Cada faixa e cada grau que a pessoa recebeu, com:

- data
- **quem entregou** — vinculado ao perfil de quem entregou, quando essa pessoa
  usa o app, ou nome escrito quando não
- academia onde foi
- observação livre

### Por que "quem entregou" importa tanto

Foi um pedido direto, e é a peça que liga o registro pessoal à linhagem
(capítulo 06). A faixa no jiu-jitsu não é um item que se obtém — é algo que
alguém, com nome, decidiu te dar. Daqui a dez anos você vai lembrar da faixa e
talvez não de quem amarrou.

É por isso que a tela vazia diz exatamente isso:

> *"Nenhuma graduação registrada. Vale a pena guardar: daqui a dez anos você vai
> lembrar da faixa, mas talvez não da data nem de quem amarrou."*

### Apresentação

Linha do tempo vertical, ano em destaque à esquerda, marcador na trilha, faixa
desenhada e o nome de quem entregou com selo de verificado quando aplicável.
Não é lista de cartões — é cronologia, porque é o que ela é.

## 4.4 Metas

**Estado: CONSTRUÍDO.** Tabela `goals`.

Quatro tipos:

| Tipo | Exemplo | Como o progresso é medido |
|---|---|---|
| `graduacao` | "Chegar à faixa azul" | Manual — o app não gradua (regra 1) |
| `competicao` | "Competir no Open de São Paulo" | Manual, com data do evento |
| `volume` | "150 treinos até dezembro" | Automático, do diário |
| `livre` | O que a pessoa quiser | Manual |

### A rota de graduação

**Estado: CONSTRUÍDO.** `src/components/RotaDeGraduacao.tsx`.

Uma meta de graduação mostra as duas faixas lado a lado, como nos cartazes que
academia pendura na parede: **faixa atual à esquerda, faixa alvo à direita**, com
o brasão da academia no meio (ou uma seta, quando não há brasão).

```
   ┌──────────────┐        ┌────┐        ┌──────────────┐
   │  ▓▓▓▓▓▓ ████ │        │ 🛡 │        │ ████ ▓▓▓▓▓▓▓ │
   │  BRANCA 2gr  │        └────┘        │  BRANCA 3gr  │
   └──────────────┘                      └──────────────┘
              "Branca 2 graus à Branca 3 graus"
```

Duas coisas que a implementação acerta e que são fáceis de errar:

1. **Funciona para grau, não só para cor.** "Branca 2 graus à Branca 3 graus" é a
   maior parte da vida de quem treina, e era o caso que o app não sabia mostrar.
2. **O cartão inteiro veste a cor da faixa ALVO.** Uma meta de faixa azul é um
   cartão azul, mesmo no app de um faixa-branca. É o alvo que se quer olhar.

A implementação disso tem uma armadilha documentada: `--primary: var(--faixa)` é
declarado no `:root`, e o que desce para os filhos é o valor **já resolvido**.
Trocar `--faixa` num filho não recalcula `--primary`. Por isso existe
`estiloDaFaixa()`, que escreve as duas. Ver capítulo 16.

## 4.5 Plano do mês

**Estado: PARCIAL.** Tabelas `plan_templates`, `plan_cycles`, `plan_cycle_items`,
`plan_weeks`, `plan_objectives`.

Um objetivo, quatro semanas, conteúdo escolhido pela faixa da pessoa.

### O que existe

- Ciclos mensais com início e fim
- Itens por semana, marcáveis
- Conteúdo escrito para faixa branca (parcial) e roxa (completo)

### O buraco

| Faixa | Conteúdo |
|---|---|
| Branca | 4 planos, mas com lacunas: 6/14, 9/14, 9/14, 8/14 itens |
| Azul | lacunas |
| Roxa | completo |
| Marrom | **inexistente** — cai no conteúdo de roxa |
| Preta | **inexistente** — cai no conteúdo de roxa |

Um faixa-marrom abrindo o plano do mês recebe conteúdo escrito para roxa. Não
quebra, mas é errado, e é o tipo de erro que faz um praticante experiente fechar
o app e não voltar.

**Prioridade de correção: alta**, e é trabalho de conteúdo, não de código.

## 4.6 Trilhas de aprendizado

**Estado: PARCIAL.** Tabela `techniques`, `weak_points`.

### O que existe

A biblioteca de técnicas com nota de domínio por técnica, e pontos fracos
declarados.

### O que uma trilha deveria ser

**Estado: PROPOSTO.**

Uma trilha é uma sequência ordenada de posições em que cada uma depende da
anterior. O jiu-jitsu tem essas dependências de forma clara, e elas são o que um
professor ensina implicitamente:

```
  GUARDA FECHADA
     ├── manter a guarda (quadril, pegadas)
     ├── quebrar a postura ──┐
     │                       ├── armlock
     │                       ├── triângulo
     │                       └── omoplata
     └── raspagens ──────────┬── tesoura
                             ├── flor
                             └── hip bump
```

A trilha responde a pergunta que todo faixa-branca faz e ninguém responde bem:
*"o que eu estudo agora?"*.

**Dados que já existem e alimentariam isso:** nota de domínio por técnica,
pontos fracos declarados, e o que foi treinado em cada sessão.

**O que falta:** o grafo de dependências. É conteúdo curado, não algoritmo — e
precisa ser escrito por quem entende, faixa por faixa.

## 4.7 Buracos conhecidos

| Buraco | Impacto | Esforço |
|---|---|---|
| Plano de marrom e preta não existe | Alto | Conteúdo |
| Planos de branca e azul incompletos | Alto | Conteúdo |
| Trilhas não têm grafo de dependência | Médio | Conteúdo + tela |
| Meta de graduação não sugere prazo típico | Baixo | Código |
