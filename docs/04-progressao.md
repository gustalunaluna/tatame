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

## 4.2 A escada de faixas, como ela é

**Estado: CONSTRUÍDO.** `src/lib/graduacao.ts`, migração 016.

| Faixa | Graus | Como o grau aparece |
|---|---|---|
| Branca, Azul, Roxa, Marrom | 0 a 4 | listra branca na ponteira |
| Preta | 0 a **6** | listra branca na ponteira |
| Coral — vermelha e preta | **7º** | o tecido muda |
| Coral — vermelha e branca | **8º** | o tecido muda |
| Vermelha | **9º e 10º** | o tecido muda |

**Depois da preta não existe faixa nova.** Existe a mesma faixa-preta com mais
graus, e a partir do sétimo o grau muda a cor do tecido em vez de acrescentar
listra. A faixa vermelha não é uma faixa vermelha sem graus — **é o 9º grau de
faixa-preta**.

### O que o app errava

Três erros, todos do mesmo mal-entendido:

1. **Desenhava listras de grau na coral e na vermelha.** Um vermelha 9º grau
   aparecia com quatro listras brancas, como se fosse "vermelha 4 graus". Isso
   inventa uma graduação que não existe e rebaixa a pessoa em cinco graus.
2. **Oferecia "0 a 4 graus" para todas as faixas**, inclusive coral e vermelha —
   dava para registrar "vermelha 2º grau".
3. **Não oferecia o 5º e o 6º grau de preta**, que existem.

E o banco tinha o estrago correspondente: dez linhas em `graduations` com coral e
vermelha de 0 a 4 graus, vindas de um backfill que tratou as duas como faixas
comuns. Foram apagadas — corrigir o número criaria um histórico de cerimônias que
nunca aconteceram.

A regra agora existe em dois lugares que não podem divergir: `GRAUS_DA_FAIXA` no
cliente e `grau_valido()` no banco, com `CHECK` em `profiles`, `graduations` e
`goals`. Uma regra que só existe no formulário morre na primeira chamada direta à
API.

## 4.3 Nível por horas de tatame

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

## 4.4 Histórico de graduação

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

## 4.5 Metas

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

## 4.6 Plano do mês

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

## 4.7 Trilhas de aprendizado

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

## 4.8 Buracos conhecidos

| Buraco | Impacto | Esforço |
|---|---|---|
| Plano de marrom e preta não existe | Alto | Conteúdo |
| Planos de branca e azul incompletos | Alto | Conteúdo |
| Trilhas não têm grafo de dependência | Médio | Conteúdo + tela |
| Meta de graduação não sugere prazo típico | Baixo | Código |

## 4.9 Os prazos mínimos da IBJJF

**Estado: CONSTRUÍDO.** `src/lib/tempos-ibjjf.ts`, `src/components/PrazoDaIBJJF.tsx`.

Os números são os da federação, não estimativa de academia.

| Degrau | Tempo mínimo na graduação anterior | Idade mínima |
|---|---|---|
| Azul | **não existe** — a IBJJF não fixa tempo de branca | 16 |
| Roxa | 2 anos de azul | 16 |
| Marrom | 18 meses de roxa | 18 |
| Preta | 1 ano de marrom | 19 |
| Preta 1º, 2º, 3º grau | 3 anos cada | — |
| Preta 4º, 5º, 6º grau | 5 anos cada | — |
| Coral 7º (vermelha e preta) | 7 anos — **31 anos de preta** ao todo | 50 |
| Coral 8º (vermelha e branca) | 7 anos — **38 anos de preta** | — |
| Vermelha 9º | 10 anos — **48 anos de preta** | — |
| Vermelha 10º | não se conquista por tempo | — |

O 10º grau é dos cinco irmãos Gracie — Carlos, Oswaldo, George, Gastão e
Hélio. Não há caminho para ele.

**Exceção que a IBJJF abriu:** campeão mundial adulto de azul, roxa ou marrom
deixa de ter período mínimo naquela faixa. Vale só para 18 anos ou mais; branca
e preta seguem como estavam.

### Três coisas que o app faz e a maioria não

1. **Diz quando NÃO existe prazo.** A IBJJF não fixa tempo de faixa-branca —
   fixa idade. Mostrar "faltam 8 meses para a azul" para um faixa-branca é
   inventar uma regra da federação. O app tem texto próprio para esse caso.

2. **Não conta sem a data.** Sem a graduação registrada não há de onde contar, e
   *"não sei"* é resposta melhor que zero. A tela pede o registro.

3. **Não promete graduação.** Tempo cumprido é condição necessária e não
   suficiente. A tela diz "libera o mínimo", nunca "você vai receber" — quem
   gradua é o professor (regra 1 do capítulo 01).

Os graus de faixa colorida **não** entram na conta de propósito: até a marrom,
adotar o sistema de graus é decisão de cada professor, e a IBJJF não fixa
intervalo. Previsão de grau de faixa-branca seria chute com cara de norma.

## 4.10 O hexágono do jogo

**Estado: CONSTRUÍDO.** `src/lib/hexagono.ts`, `src/components/HexagonoDoJogo.tsx`,
migração 025.

Seis áreas, nota de 0 a 5, uma leitura por mês:

| Eixo | O que a pessoa responde |
|---|---|
| **Guarda** | Por baixo, você ataca e raspa — ou só segura? |
| **Passagem** | Você passa a guarda de quem é do seu nível? |
| **Finalização** | Chegando na posição, você termina? |
| **Retenção** | Quando começam a passar, você recompõe? |
| **Defesa** | Preso embaixo, você escapa antes de bater? |
| **Gás** | No quinto round você ainda é o mesmo? |

### Por que estes seis, e não outros

O recorte é a cadeia de fases que a análise técnico-tática de competição
descreve — em pé, guarda, passagem, controle, finalização, fuga — com uma
decisão deliberada: **o jogo em pé não ganha eixo próprio.**

O motivo é dado. Nos estudos de partidas de alto nível, queda, raspada e pegada
de costas acontecem *menos de uma vez por competidor por luta*, e a puxada de
guarda — que não pontua — é a ação isolada mais frequente. Um eixo de "quedas"
ficaria colado no zero para quase todo mundo. Eixo que não varia não informa:
só deforma a figura e rouba espaço dos cinco que variam.

### Por que hexágono e não linha

O app mostrava a **média** dos pontos ao longo do tempo, numa linha. A média de
seis habilidades é o número que mais esconde: quem melhorou muito a passagem e
piorou a defesa aparecia **parado** — e "parado" é a leitura errada.

O hexágono guarda as seis leituras separadas e mostra o **formato**, que é o que
um professor enxerga em três rolas: não *o quanto*, mas *de que lado*.

Sair do recharts para SVG escrito à mão tirou **390 kB** do pacote — o gráfico
de radar inteiro cabe em 120 linhas, e a dependência existia só para uma linha.

### A armadilha do radar, e as três defesas

A área da figura cresce com o **quadrado** dos valores. Quem lê a mancha em vez
do raio superestima qualquer melhora — subir 1 ponto em tudo quase dobra a área.

1. Os anéis de 1 a 5 ficam desenhados e o 5 é rotulado: a leitura é por raio.
2. O preenchimento é fraco (14%) — a mancha não compete com a linha.
3. A tabela embaixo repete os números com a diferença calculada.

E a **ordem dos eixos nunca muda**. Ordenar por nota destruiria a comparação
entre meses, que é a razão de o gráfico existir. `EIXOS` é constante ordenada e
o teste falha se alguém reordenar.

### As duas séries são a mesma cor, de propósito

A tentação era uma cor para "agora" e outra para "antes". Errado duas vezes.

**No significado:** duas cores dizem "duas coisas diferentes", e aqui é *uma*
pessoa em *dois* momentos.

**Na prática, com número:** testei o acento de cada faixa contra um cinza de
série no validador de paleta. Sob protanopia o vermelho da faixa vermelha
colapsa no cinza — ΔE **1,6** num piso de 8 — e o acento da preta chega a 9,1,
raspando. Como a cor da série 1 muda com a faixa de quem abriu o app, duas cores
exigiriam um cinza que funcionasse contra sete acentos diferentes.

A separação aqui não é por matiz, e por isso não depende de enxergar matiz:

| | traço | marcadores | preenchimento |
|---|---|---|---|
| **agora** | cheio | sim | 14% |
| **antes** | tracejado | não | nenhum |

Quatro canais redundantes, nenhum cromático — mais a tabela.

### Uma leitura por mês, garantida pelo banco

`avaliacoes_do_jogo` tem chave única em `(user_id, mes)`, e `mes` é sempre dia 1.
O histórico antigo era um `jsonb` reescrito a cada **toque** no slider: mexer três
vezes no mesmo dia criava três pontos. Não dá para comparar mês com mês em cima
disso.

A comparação padrão é com o **mês anterior que tem avaliação**, não com o mês de
calendário anterior — quem pulou julho compara agosto com junho, e não com um
hexágono vazio.

## 4.11 O plano de evolução, e de onde ele vem

**Estado: CONSTRUÍDO.** `prescricaoDoMes()` em `src/lib/hexagono.ts`.

O plano ataca o eixo **mais baixo** e **intercala** o segundo mais baixo —
semanas 1 e 3 no principal, 2 e 4 no secundário. Quatro achados de ciência da
aprendizagem, e o que cada um virou:

| Achado | O que vira aqui |
|---|---|
| **Prática deliberada** (Ericsson) — repetição não é prática; prática é repetição com alvo específico, no limite da habilidade, com retorno imediato | O plano nunca diz "treine passagem". Diz qual posição, com que restrição, e como você sabe se deu certo |
| **Dificuldades desejáveis** (Bjork) — espaçamento, intercalação, prática variada e recuperação ativa pioram o desempenho na hora e melhoram a retenção depois | O mesmo tema volta na semana 3, não na 2. E dois temas alternam em vez de um fechar antes do outro |
| **Abordagem por restrições / dinâmica ecológica** — em esporte de combate a técnica emerge de resolver um problema sob restrição, não de copiar um movimento | Tudo é rola posicional com regra. Nunca "50 repetições no boneco" |
| **Zona de desenvolvimento proximal** (Vygotsky) — o ganho está logo acima do que já se faz sozinho | O mesmo buraco recebe restrição diferente na branca e na marrom |

### Volume dirigido por faixa

| Faixa | Minutos de rola posicional por semana |
|---|---|
| Branca | 10 |
| Azul | 15 |
| Roxa | 20 |
| Marrom / Preta | 25 |

Não é "quanto treinar" — é quanto do treino vira prática dirigida. Na branca o
volume é baixo de propósito: quem ainda não tem repertório precisa de aula e de
rola livre para construir vocabulário, e transformar o treino inteiro em
exercício de correção afasta.

### O ciclo se fecha sozinho

Refazer as seis notas no fim do mês muda o alvo do plano seguinte sem ninguém
configurar nada — se gás subiu de 0 para 2 e defesa continua em 1, o mês que vem
aponta para defesa. É a auto-avaliação espaçada da lista acima, aplicada ao
próprio app.

**O que o plano não faz:** prometer graduação. Ver regra 1 do capítulo 01.
