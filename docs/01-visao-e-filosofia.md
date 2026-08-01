# 01 — Visão e filosofia de design

## 1.1 O que o Ponteira é

O Ponteira é o diário de quem treina jiu-jitsu.

Não é rede social de luta, não é academia digital, não é vitrine de atleta
profissional. É o caderno que quase todo praticante começa e quase ninguém
mantém: o que treinei hoje, com quem rolei, o que não funcionou, quanto tempo
falta para a próxima faixa.

O nome vem da ponta preta da faixa — a **ponteira**, onde ficam os graus. É o
único lugar do kimono onde o tempo aparece.

## 1.2 Para quem

**O praticante regular.** Treina duas a quatro vezes por semana, faixa branca a
roxa, não compete ou compete pouco. É a maioria absoluta e é para quem o app é
desenhado. O que ele quer: não perder a conta do que já fez, e ter uma noção
honesta de onde está.

**O competidor.** Treina mais, compete, coleciona medalha. Precisa das mesmas
coisas mais o registro de campeonato e o histórico de lutas.

**O professor e a academia.** Precisam ver a turma: quem está sumido, quem está
perto de graduar, quantos alunos ativos. Hoje o app atende isso parcialmente.

Quem **não** é público: o espectador. O Ponteira não tem feed de notícias, não
tem vídeo de luta profissional, não tem conteúdo para consumir. Se a pessoa não
treina, não há nada aqui para ela.

## 1.3 O problema, em uma frase

O jiu-jitsu mede progresso em anos, e a memória humana mede em semanas.

O intervalo entre duas graduações é de um a três anos. Nesse tempo a pessoa
treina duzentas, trezentas vezes, e a única coisa que sobra é uma sensação
vaga de que "está melhorando" — ou, nos meses ruins, de que "está estagnada".
Não há evidência de nenhum dos dois lados.

O Ponteira existe para produzir a evidência.

## 1.4 As sete regras

Estas regras existem para encerrar discussão de design. Quando duas ideias
brigam, ganha a que respeita mais regras. Elas estão em ordem de força.

---

### Regra 1 — A faixa é do professor, nunca do app

O app **não gradua ninguém**. Não sugere graduação, não diz "você já poderia ser
azul", não calcula faixa por horas.

Isto não é humildade: é a única coisa que separa um diário de treino de uma
farsa. A graduação no jiu-jitsu é um julgamento humano, feito por alguém que te
vê rolar. Um algoritmo que emitisse faixa destruiria em um mês a confiança de
quem entende o esporte — e quem entende o esporte é o público inteiro.

**Consequência prática:** o nível por horas (capítulo 04) fica visualmente
ABAIXO da faixa na tela inicial, e a tela explica em uma linha que ele não
substitui graduação.

---

### Regra 2 — O que o app diz tem que ser verdade

Todo número mostrado precisa vir de algo que a pessoa fez, não de uma estimativa
que parece boa.

Foi a regra que matou a versão anterior do nível, que era `floor(treinos/5)+1`:
dez treinos de quarenta minutos valiam o mesmo que dez de duas horas. O número
mais destacado do app não queria dizer nada, e quem percebia isso parava de
acreditar em todos os outros.

**Consequência prática:** quando não há dado, o app diz que não há. "Ainda não
tem parceiros" é uma frase melhor que um gráfico zerado bonito.

---

### Regra 3 — A cor é conquistada, não escolhida

O acento visual do app é a **faixa de quem está logado**. Um faixa-branca abre um
app de cor palha; um roxa abre um app roxo; e no dia da graduação o app inteiro
muda de cor junto.

Nenhum outro esporte permite isso. Cor de tema em app é sempre preferência —
aqui é resultado. É o mecanismo de identidade mais barato e mais forte que o
produto tem, e ele já existe.

**Consequência prática:** não existe seletor de tema. Não existe cor de marca
dentro da sessão. Ver capítulo 16 para a implementação.

---

### Regra 4 — Nada de comparação direta entre pessoas

Não há ranking global. Não há "você treinou mais que 72% dos usuários". Não há
placar público de submissões.

O jiu-jitsu já tem hierarquia visível e permanente na cintura de todo mundo.
Adicionar uma segunda hierarquia, calculada por volume de treino, cria um
incentivo perverso: treinar machucado, inflar registro, evitar parceiro difícil.
Todos os três são danos reais ao praticante.

**Consequência prática:** as comparações permitidas são consigo mesmo (este mês
contra o anterior) e dentro de uma parceria consentida (o placar de rola só
aparece entre quem aceitou ser parceiro dos dois lados).

---

### Regra 5 — O social é opt-in e recíproco

Toda relação no app precisa de aceite dos dois lados. Parceria é convite e
resposta. Registro de rola com placar precisa de confirmação do outro. Entrada
em academia é pedido e aprovação.

Sem isso, o app viraria um lugar onde qualquer um escreve o histórico de
qualquer um. "Finalizei o Fulano seis vezes" tem que passar pelo Fulano.

**Consequência prática:** existe prazo de contestação (capítulo 03). Registro
não confirmado não conta para estatística de ninguém.

---

### Regra 6 — Celular primeiro, e celular de verdade

O app é usado no vestiário, com uma mão, suando, com o kimono ainda molhado, em
trinta segundos antes de sair. Não é usado sentado.

**Consequência prática:** alvo de toque mínimo de 44px; barra inferior com áreas
seguras de iOS respeitadas; nenhuma tela essencial exige rolagem para chegar à
ação principal; e o caminho crítico tem orçamento de peso auditado a cada build
(hoje 202,9 kB gzip, teto 220).

---

### Regra 7 — Erro silencioso é o pior erro

Um app de registro pessoal que perde um registro sem avisar é pior que um app
que não existe, porque a pessoa só descobre meses depois, quando o dado
importava.

**Consequência prática:** falha de gravação tem teste próprio
(`testes/verificar-falha-gravacao.mjs`); toda mutação mostra confirmação ou erro;
e o sistema de design tem um guarda que quebra o build quando uma variável CSS
aponta para nome inexistente — porque CSS não reclama disso, o valor vira `auto`,
e o bug só aparece na tela de alguém.

---

## 1.5 O que o Ponteira não vai ser

Escrever isto é tão importante quanto escrever o resto, porque cada item aqui é
uma ideia que já vai aparecer e precisa de resposta pronta.

**Não vai ter vídeo.** Nem de técnica, nem de rola. Hospedar vídeo é caro, moderar
vídeo é mais caro, e o mercado de instrução em vídeo já é resolvido por outros.

**Não vai ter chat.** Chat exige moderação 24h e transforma o produto em outra
coisa. A comunicação entre praticantes já acontece no WhatsApp da academia.

**Não vai ter ranking global.** Ver regra 4.

**Não vai vender vantagem.** Ver capítulo 09.

**Não vai ter feed infinito.** O app deve ser aberto por trinta segundos e
fechado. Um app de treino que consome vinte minutos de rolagem está roubando o
tempo que deveria ir para o tatame.

## 1.6 A frase que resume

> Todo rola conta. Todo grau tem história.

É a tagline da tela de entrada. A primeira metade é sobre registro — nada do que
você fez é pequeno demais para ficar guardado. A segunda é sobre linhagem — todo
grau foi dado por alguém, que recebeu o dele de alguém, e isso é uma corrente que
chega até 1917.
