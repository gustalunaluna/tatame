# 08 — Títulos, emblemas e cosméticos

## 8.1 O princípio

Num app cuja moeda é respeito, **tudo o que se mostra precisa ter sido
conquistado**. Não há cosmético comprável, não há personalização estética
arbitrária, não há "escolha sua cor".

Isso não é austeridade — é a única maneira de um adorno significar alguma coisa.
Um emblema que qualquer um pode comprar não diz nada sobre quem o usa, e um
perfil cheio de adornos sem significado é ruído.

## 8.2 A cor da faixa

**Estado: CONSTRUÍDO.**

O acento do app inteiro é a faixa de quem está logado. Já descrito na regra 3 do
capítulo 01, mas vale registrar aqui porque **é o cosmético principal do
produto** — e é impossível comprá-lo.

| Faixa | Acento | Nota |
|---|---|---|
| Branca | palha do kimono | |
| Azul | azul de kimono | |
| Roxa | roxo | |
| Marrom | marrom clareado | Marrom real morre num fundo escuro |
| Preta | vermelho | Preto não serve de destaque num app escuro |
| Coral | laranja-coral | |
| Vermelha | vermelho intenso | |

A preta merece explicação: o **acento** dela é vermelho porque preto sobre fundo
preto não é acento nenhum. O **tecido** dela, usado onde a faixa é desenhada,
continua sendo preto. São duas cores para dois usos, e confundi-las produziu um
bug real — a escada de faixas da tela de entrada terminava em vermelho, o que não
é a graduação de ninguém.

## 8.3 Títulos

**Estado: CONSTRUÍDO.** Capítulo 06, seção 6.2.

Aluno, Monitor, Instrutor, Professor, Mestre, Grão-Mestre. Derivados de faixa +
papel na academia + declaração, com a faixa como teto.

**Não são escolhíveis.** Você não seleciona seu título; ele é lido do que você é.

## 8.4 Selos de verificação

**Estado: CONSTRUÍDO.**

| Selo | Significa |
|---|---|
| **Selo de pessoa** | O perfil é de alguém verificado |
| **Selo de equipe** | A academia foi aprovada |
| **Selo de mestre** | A pessoa é mestre verificado de uma academia aprovada |

Um selo é a única coisa no app que outra entidade confere a você. É por isso que
ele carrega peso — e por isso não pode ser comprado nem pedido.

## 8.5 Emblemas

**Estado: PROPOSTO.**

### O que são

Um emblema é uma conquista **escolhida para exibição**. Das 1.006 conquistas, a
pessoa escolhe até três para aparecerem no perfil.

É exatamente o mecanismo que as medalhas já usam (até três em destaque,
trocáveis), aplicado às conquistas. A simetria é intencional: a pessoa já
entendeu o gesto.

### O que faz um bom emblema

Nem toda conquista merece virar emblema. As boas têm uma das três qualidades:

| Qualidade | Exemplo | Por quê |
|---|---|---|
| **Rara** | "10 pretas no mesmo dia" | Diz algo que poucos podem dizer |
| **Longa** | "5 anos de jornada" | Não há atalho |
| **Contra-intuitiva** | "Rolou com alguém de cada faixa" | Diz algo sobre caráter, não volume |

As ruins são as de volume simples — "200 treinos" diz apenas que a pessoa está há
mais tempo, o que a faixa já dizia melhor.

**Proposta:** marcar no `achievement_catalog` quais conquistas são
*emblemáveis*. Não todas.

## 8.6 Cosméticos

**Estado: PROPOSTO, com escopo deliberadamente pequeno.**

### O que pode existir

| Cosmético | Como se obtém | Por quê é aceitável |
|---|---|---|
| **Moldura de perfil** | Marcos de tempo: 1, 3, 5, 10 anos de jornada | Tempo não se compra |
| **Fundo do cartão de perfil** | Coleção completa (capítulo 05) | Exige amplitude, não volume |
| **Marca de linhagem** | Ter a linhagem cadastrada até alguém sem conta | Premia registrar memória |
| **Marca de casa** | Brasão da academia no perfil | Já existe parcialmente |

### O que não pode existir

- Qualquer coisa comprável
- Qualquer coisa que sugira habilidade não verificada ("Faixa-preta em pé")
- Avatar customizável além da foto real
- Efeito visual chamativo — animação, brilho, partícula

O último merece explicação. Um perfil de praticante de jiu-jitsu com efeito de
partícula dourada parece, para o público-alvo, exatamente o que é: um app de jogo
fingindo ser sobre um esporte sério. O custo de credibilidade é alto e o ganho é
zero.

### A regra de contenção

**No máximo três adornos visíveis por perfil**, contando emblemas. Um perfil que
mostra tudo não destaca nada — e a economia de atenção do perfil é o que faz o
destaque valer.

## 8.7 Hierarquia visual do perfil

**Estado: CONSTRUÍDO** (a ordem), **PROPOSTO** (os emblemas).

A ordem das caixas do perfil segue a escolha da pessoa:

```
  1. Cabeçalho: foto, nome, TÍTULO, faixa, @, academia
  2. Medalhas em destaque    ← sobe para cá SE a pessoa fixou alguma
  3. Lutas (vitórias/derrotas/aproveitamento)
  4. Equipe  |  Mestres      ← lado a lado
  5. Parceiros de rola
  6. Alunos                   ← só se comanda academia
  7. Conquistas em destaque
  8. Graduações
```

**Por que medalhas sobem.** Se a pessoa escolheu três medalhas para destacar, foi
o que ela quis mostrar primeiro. Quem não tem medalha em destaque deixa o pódio
no fim, onde ele vira convite em vez de espaço vazio na abertura do perfil.

Essa regra tem teste próprio (`testes/verificar-ordem-do-perfil.mjs`), porque a
ordem é uma decisão de produto e não pode se perder num refactor.

## 8.8 Buracos conhecidos

| Buraco | Impacto | Esforço |
|---|---|---|
| Emblemas não existem — conquistas não são destacáveis | Médio | Coluna + tela, espelhando medalhas |
| Não há marcação de conquista "emblemável" no catálogo | Baixo | Coluna + curadoria |
| Molduras por tempo não existem | Baixo | Cálculo + CSS |
| Brasão da academia não aparece no cartão do atleta | Baixo | Tela |
