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

| Eixo | O evento contado |
|---|---|
| **Guarda** | Raspadas dadas |
| **Passagem** | Guardas passadas |
| **Finalização** | Finalizações dadas |
| **Retenção** | Guardas passadas *em você* (menos é melhor) |
| **Defesa** | Finalizações sofridas (menos é melhor) |
| **Gás** | Em que rola o ritmo caiu? |

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

### A nota é calculada, não declarada

**A auto-avaliação saiu.** Pedir nota de 0 a 5 media a confiança da pessoa, não o
jiu-jitsu dela: o mesmo faixa-branca se dá 1 na semana em que apanhou e 4 na
seguinte sem ter mudado nada. O gráfico registrava humor com cara de medida.

Agora o app conta **eventos**: passagens, raspadas, finalizações, finalizações
sofridas, e em que rola o ritmo caiu. *"Fui finalizado 3 vezes"* é fato; *"minha
defesa é 2"* é veredito — e só o primeiro o parceiro pode conferir, que é para
o que `training_partners.confirmacao` serve.

### O que "relativo" quer dizer — três mecanismos

**1. A faixa do parceiro (o principal).** Ser finalizado por um preta quando se é
branca é o esperado; ser finalizado por um branca quando se é roxa não é.

```
evento a favor  →  peso 2^(gap)     fez contra quem está acima: vale mais
evento sofrido  →  peso 2^(−gap)    sofreu de quem está acima: dói menos
```

com `gap` = faixa do parceiro − sua faixa, **limitado a ±2 degraus** — um branca
que rola com preta não ganha multiplicador 16 e vira roxa por uma noite. Parceiro
sem faixa registrada é neutro; chutar seria pior.

É isto que torna a nota comparável entre faixas sem nivelar ninguém: um roxa
entre roxas e um branca entre brancas jogam ambos 50/50, e ambos podem tirar 3.
O que diferencia é o que cada um faz **dentro do próprio nível**.

**2. Amostra pequena puxa para o meio.** Encolhimento para a média, com
`p = n / (n + 10)`:

```
nota = 5 × [ p·observado + (1−p)·0,5 ]
```

Uma noite boa não faz um 5. A nota começa no meio e se afasta conforme a pessoa
registra — e é por isso que ela merece confiança.

**3. Idade, e só onde a idade manda.** A referência de gás desce 0,5 ponto
percentual por ano acima dos 20, com piso em 45% da sessão. Nos outros cinco
eixos a idade não entra.

**E o tempo:** janela de 8 semanas com meia-vida de 4. Quem parou de passar
guarda vê a passagem cair sozinha em um mês.

### A coluna mais importante da migração 026

`detalhado`. Zero e "não respondi" são a mesma coisa para o banco e **coisas
opostas** para o hexágono. Sem essa bandeira, as 138 rolas que já existiam
entrariam como *"dez rolas, ninguém me passou, ninguém me finalizou"* — e o app
anunciaria retenção 3,7 e defesa 3,7 para quem nunca respondeu nada. Nota
inventada nas duas direções: péssima no ataque, ótima na defesa.

E **não há backfill**. A tentação era marcar `detalhado` nas linhas que já tinham
`subs_for` preenchido, já que aquilo foi respondido de fato. Mas `detalhado` quer
dizer *"respondi os cinco contadores"*, e naquelas linhas passagem e raspada nunca
foram perguntadas — estão em zero por padrão, não por observação. Uma bandeira,
um significado.

### "Sem dado" nunca vira "é ruim"

Eixo sem rola registrada aparece como **`?`** no meio do raio, sem marcador e sem
vértice fora do centro; a tabela diz *"sem rolas registradas"*; e o plano **não
aponta** para ele. Ausência e nota zero são coisas opostas, e confundi-las é o pior
erro que este gráfico pode cometer.

Um detalhe que o teste pegou: `prescricaoDoMes` lia eixo ausente como zero, então
o eixo que ninguém respondeu vencia sempre o ranking de "mais baixo" — o plano
mandava treinar exatamente aquilo que o app não mediu.

### O fechamento da semana

O hexágono se alimenta sozinho de um cartão que aparece no Início e em Evolução:
os treinos dos últimos 7 dias que ainda não têm os números. Cinco contadores por
parceiro (`+`/`−`, o teclado nunca abre) e uma pergunta de ritmo por sessão.

Não se pergunta o quanto a pessoa acha que é boa. Pergunta-se o que aconteceu.

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

Ninguém reconfigura nada: fechar os treinos da semana move as notas, e o alvo do
plano seguinte muda junto. Se a passagem subiu e a defesa não, o mês que vem
aponta para defesa — sem que a pessoa precise ter opinião sobre isso.

E o plano **só aponta para eixo que tem dado**. Mandar alguém treinar defesa
porque o app não sabe nada sobre a defesa dela seria pior que não mandar.

**O que o plano não faz:** prometer graduação. Ver regra 1 do capítulo 01.

## 4.12 A técnica do treino vai para a galeria

**Estado: CONSTRUÍDO.** `src/lib/tecnicas-storage.ts`,
`src/components/SeletorDeTecnicas.tsx`, migração 027.

`trainings.techniques` era texto livre — *"DLR → costas, tesourinha"* — e a
galeria (`techniques`) era outra coisa, alimentada por um formulário separado.
As duas nunca se falaram.

Isso deixava a informação mais valiosa do app presa numa string que nada
consegue ler. As duas perguntas que uma galeria de técnicas existe para
responder ficavam sem resposta:

- *"há quanto tempo eu não treino armlock?"*
- *"quantas vezes eu já vi essa passagem?"*

Agora existe `training_techniques` ligando os dois. **Tirar uma técnica de um
treino não a apaga da galeria** — a galeria é acervo, não histórico da sessão.

### O que impede a galeria de virar depósito

O risco óbvio de deixar criar técnica pelo diário: *"Armlock"*, *"armlock"*,
*"Armlock "*, *"Triângulo"* ao lado de *"Triangulo"*.

1. **Sugere antes de criar.** Duas letras já mostram o que existe, com a última
   vez que apareceu num treino. Quem tem *"Armlock"* toca no que existe.
2. **O banco dedupe de verdade.** Índice único em
   `(user_id, chave_da_tecnica(name))`, normalizando caixa, espaço e acento.
   `on conflict` no achar-ou-criar, numa transação só — no cliente seriam três
   viagens, e dois toques rápidos criariam duas linhas.
3. **`do update set name = techniques.name`.** O `on conflict` não sobrescreve
   nada: quem tem *"Armlock"* com anotação e domínio 4 não perde isso por
   registrar de novo. O `do update` existe só para o `RETURNING` devolver a
   linha.

### Categoria é opcional, e isso é uma escolha

Obrigar a escolher entre sete categorias para anotar uma técnica no fim do
treino é atrito que faz a pessoa **não anotar**. Técnica sem categoria é um
buraco pequeno; técnica não registrada é um buraco grande. A galeria mostra
*"sem categoria"* e deixa arrumar lá.

### A mesma regra em dois lugares

`chave_da_tecnica` existe em SQL (para o índice, que exige `IMMUTABLE`) e em JS
(para o cliente não oferecer criar o que já existe antes da viagem ao servidor).
**Duas cópias da mesma regra é dívida**, e está anotada como tal: se divergirem,
o cliente acha que são duas técnicas e o banco acha que é uma.

`verificar-tecnicas.mjs` roda a mesma lista de casos contra a cópia em JS
justamente para prender isso — e o módulo `chave-da-tecnica.ts` não importa
nada, para o teste poder carregá-lo sem arrastar o cliente do Supabase junto.

### Duas armadilhas que custaram tempo

**O `translate()` que virou identidade.** Ao aplicar a migração no banco, os
acentos se perderam no caminho e a função ficou com origem e destino iguais.
*"Triângulo"* e *"Triangulo"* continuariam sendo duas técnicas, e **nada
avisaria** — a função existia, rodava, e não fazia nada. Está escrito no
cabeçalho da migração, com a linha que confere:

```sql
select public.chave_da_tecnica('Triângulo') = public.chave_da_tecnica('TRIANGULO');
```

E o índice único depende da função: mudá-la exige **refazer o índice**, senão
ele continua guardando as chaves da definição antiga.

**`.single()` pede objeto, não lista.** O primeiro mock do teste devolvia
`[{id}]` para o `POST /trainings`, a leitura do id falhava, e o salvamento
morria em silêncio. Foi assim que o teste pegou a si mesmo.

### O botão, e por que não é um campo

A primeira versão disto trocou o campo "Técnicas trabalhadas" por uma busca com
sugestões aparecendo enquanto se digita. Duas coisas erradas:

1. **Mexia no formulário que já funcionava.** Registrar treino é a tarefa mais
   repetida do app e estava resolvida. Campo novo com comportamento novo no meio
   do caminho é atrito onde não havia.
2. **Não deixava descrever nada.** Dava para dizer o *nome* e mais nada — e o
   que vale guardar de um treino não é que você viu armlock, é o detalhe que fez
   o armlock sair naquele dia.

Agora o campo de texto livre voltou a ser o que sempre foi, e ao lado dele há um
botão **"Adicionar técnica"**. Quem não quer anotar não vê nada além do botão;
quem quer abre um diálogo com **Nome**, **Como foi** e **Categoria** (opcional).

### "Como foi" é do DIA, não da técnica

**Migração 028.** A tentação era gravar a descrição em `techniques.notes`, que
já existe. Está errado, e de um jeito que só aparece na terceira vez:

```
1ª vez que registra armlock:  "consegui do 100 quilos"
2ª vez, três semanas depois:  "hoje travou, a pegada escapou"
```

Em `techniques.notes` a segunda **apaga** a primeira — e a primeira era a mais
valiosa das duas, porque é a que descreve o que funcionou.

A descrição é da **sessão**. A mesma técnica rende observações diferentes a cada
treino, e é justamente a sequência delas que conta a história de como a pessoa
aprendeu aquilo. Por isso a nota vai em `training_techniques.nota`, e a galeria
ganhou **"O que você anotou nos treinos"** — fechado por padrão, porque vinte
históricos abertos numa galeria de vinte técnicas viram parede de texto.

`techniques.notes` continua sendo o que era: a descrição geral, editada na
galeria. As duas coisas convivem porque são duas coisas.

### Três armadilhas de Postgres, todas anotadas no código

**A variável que sombreia a coluna.** `declare nota text` dentro da função, e um
`on conflict do update set nota = case when nota <> '' …` — o `nota` do `case`
passaria a ler a variável em vez do valor que está chegando. Bug silencioso, só
visível na segunda gravação do mesmo treino. A variável se chama `nota_do_dia`.

**`do nothing` que engole o dado.** O `on conflict` do vínculo era `do nothing`;
com a nota nova, isso faria a segunda gravação do mesmo treino perder o que a
pessoa acabou de escrever. Agora atualiza — mas só quando há algo novo a dizer,
para um salvamento sem alteração não zerar o que estava lá.

**`create or replace` não muda tipo de retorno.** Acrescentar uma coluna à tabela
de retorno é mudança de tipo, e o Postgres recusa com *"cannot change return
type"*. Tem que `drop` antes.
