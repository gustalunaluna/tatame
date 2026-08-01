# 07 — Crônicas do tatame, grupos e guildas

## 7.1 O que existe hoje

**Estado: CONSTRUÍDO.** O social do Ponteira hoje tem três peças:

| Peça | O que é |
|---|---|
| **Parceria** | Relação recíproca entre dois praticantes, com placar |
| **Academia** | Grupo institucional com papéis e aprovação |
| **Linhagem** | A corrente de quem graduou quem |

Não há feed, não há chat, não há postagem. Isso é decisão, não atraso — ver
capítulo 01, seção 1.5.

## 7.2 Crônicas do tatame

**Estado: PROPOSTO.**

### O problema

O app guarda o que aconteceu, mas não guarda **o que valeu a pena**. Um treino
com 90 minutos e 6 rolas é indistinguível, na base, do treino em que você passou
a guarda de alguém pela primeira vez em dois anos.

Todo praticante tem cinco ou seis dessas histórias. Elas não estão em lugar
nenhum.

### O desenho

Uma crônica é uma **entrada curta, datada, ligada a um treino**, que a pessoa
escreve porque quis — nunca porque o app pediu.

```
┌──────────────────────────────────────────────┐
│  14 de março de 2026        · Academia Teste │
│                                              │
│  Passei a guarda do Rafael.                  │
│                                              │
│  Dois anos tentando. Hoje saiu, e ele nem    │
│  percebeu na hora. Foi a coisa mais           │
│  silenciosa que já me aconteceu no tatame.   │
│                                              │
│  🥋 Rafael · Preta 1º grau                    │
└──────────────────────────────────────────────┘
```

### Três regras de projeto

**1. A crônica é privada por padrão.** Ela pode ser tornada visível no perfil,
uma a uma. O valor primário é a memória; a exibição é secundária.

**2. O app nunca gera crônica automaticamente.** "Parabéns, você completou 100
treinos!" não é crônica — é conquista, e já existe. Crônica é texto humano ou não
é nada.

**3. Marcar alguém numa crônica exige que seja parceiro.** E a pessoa marcada
pode se remover. Ver regra 5, capítulo 01.

### O gatilho de escrita

O problema de todo diário reflexivo é que ninguém escreve. Duas aberturas
propostas, ambas de baixo atrito:

- **Ao salvar um treino**, um campo opcional: *"Aconteceu alguma coisa hoje?"*
  Uma linha, sem título, sem formatação.
- **Na conquista aberta**, um convite: *"Quer registrar como foi?"* — o momento
  em que a pessoa já está com a sensação fresca.

### Modelo de dados proposto

```sql
create table public.chronicles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  training_id  uuid references public.trainings on delete set null,
  data         date not null,
  texto        text not null check (length(btrim(texto)) between 3 and 2000),
  publica      boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.chronicle_people (
  chronicle_id uuid references public.chronicles on delete cascade,
  user_id      uuid references auth.users on delete cascade,
  primary key (chronicle_id, user_id)
);
```

## 7.3 Grupos

**Estado: PROPOSTO.**

### A distinção que importa

O app já tem **academia**, que é institucional: tem dono, tem aprovação, tem
papéis, tem brasão. Um grupo é outra coisa.

| | Academia | Grupo |
|---|---|---|
| Natureza | Institucional | Informal |
| Entrada | Pedido + aprovação | Convite |
| Papéis | Seis, hierárquicos | Nenhum |
| Uma pessoa pertence a | Uma | Várias |
| Exemplo | Academia Gracie | "Turma das 6h", "Os que vão ao Open" |

Um grupo é o que existe no WhatsApp da academia hoje: um subconjunto que combina
coisas. O app não precisa do chat — precisa do **contexto compartilhado**.

### O que um grupo faz

1. **Um objetivo comum com progresso somado.** "A turma das 6h vai somar 500
   horas até dezembro." O progresso é a soma dos registros individuais, sem
   ranking interno.
2. **Visibilidade de quem apareceu.** Quem treinou esta semana, sem número, sem
   comparação — só presença.
3. **Um evento marcado.** "Open de São Paulo, 12 de maio" com quem vai.

### O que um grupo NÃO faz

Não tem ranking interno. Não tem líder com poder. Não tem chat. Não tem
"expulsar" — só sair e não convidar.

O motivo é o mesmo da regra 4: um grupo pequeno com ranking interno é a forma
mais eficiente possível de produzir constrangimento entre pessoas que se veem
três vezes por semana pessoalmente.

## 7.4 Guildas

**Estado: PROPOSTO, e com ressalva.**

"Guilda" é vocabulário de jogo, e o pedido de tê-las é legítimo — guildas são o
mecanismo de retenção mais forte que existe em jogos de serviço.

Mas há uma armadilha específica aqui: **o jiu-jitsu já tem guildas**. Chamam-se
academias, e a lealdade a elas é intensa, às vezes excessiva. Criar uma segunda
camada de pertencimento que compete com a academia real seria trabalhar contra a
cultura do esporte.

### A proposta, então

Guilda = **a academia, jogada como guilda**. Não uma entidade nova.

O que isso significa concretamente:

| Mecanismo de guilda | Versão Ponteira |
|---|---|
| Progresso coletivo | Horas somadas da academia no mês |
| Conquista de guilda | "A casa passou de 10.000 horas" |
| Identidade visual | Brasão, que já existe |
| Evento de guilda | Competição que a academia disputa em bloco |
| Ranking entre guildas | **Não** — ver regra 4 |

E o **mural da casa**: as medalhas da academia com o nome de quem ganhou, que já
está construído (capítulo 05). É a peça de orgulho coletivo que já funciona.

### O contorno de risco

Progresso coletivo tem um efeito colateral conhecido: quem não contribui sente
que está devendo. Numa academia de 1.200 pessoas isso é irrelevante; numa de 15,
é constrangedor.

**Regra proposta:** contribuição individual para o total coletivo **nunca é
visível**. O total é visível; quem o compôs, não.

## 7.5 Buracos conhecidos

| Buraco | Impacto | Esforço |
|---|---|---|
| Crônicas não existem | Médio — o dado emocional não é capturado | Tabela + tela + gatilhos de escrita |
| Grupos não existem | Médio | Tabela + convite + tela |
| Progresso coletivo da academia não existe | Baixo | RPC de agregação + caixa no perfil da academia |
| Não há como uma academia comunicar nada aos alunos | Alto para o professor | Ver capítulo 17 |
