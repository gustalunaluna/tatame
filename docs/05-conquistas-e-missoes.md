# 05 — Conquistas, coleções, medalhas e missões

## 5.1 Conquistas

**Estado: CONSTRUÍDO.** Tabelas `achievement_catalog` (1.006 linhas) e
`achievements` (a cópia de cada pessoa).

### O catálogo

| Nível | Quantas | Exemplo |
|---|---|---|
| Branca | 44 | "1 mês de jornada" |
| Azul | 177 | "10 dias seguidos" |
| Roxa | 304 | "100 treinos de Gi" |
| Marrom | 239 | "10 rolas num dia" |
| Preta | 231 | "10 pretas no mesmo dia" |
| Coral | 7 | "7º grau — Faixa Coral" |
| Vermelha | 4 | "10º grau — Faixa Vermelha" |
| **Total** | **1.006** | |

O nível da conquista **não é a faixa exigida** — é a dificuldade. Um faixa-branca
pode abrir uma conquista "Roxa" se treinar muito; a cor só diz o quanto ela é
rara.

### Como abrem

`recalcular_conquistas()` roda depois de cada registro e compara métricas
acumuladas contra os alvos do catálogo. Famílias de métricas: treinos totais,
treinos por tipo, horas, rolas, parceiros distintos, sequência, meses de
jornada, medalhas, graduações.

### Dois defeitos que já custaram caro aqui

**1. O `RETURNING` que mentia.** A primeira versão contava conquistas novas assim:

```sql
update public.achievements a set unlocked = true ...
returning (not a.unlocked) as abriu   -- ERRADO
```

`RETURNING` num `UPDATE` enxerga a linha **depois** da atualização. `a.unlocked`
já era `true`, então `not a.unlocked` era sempre falso e o app nunca dizia
"você desbloqueou". O estado pré-atualização precisa vir da CTE de origem:

```sql
alvo as (
  select a.id, a.target, m.valor, a.unlocked as estava, ...
),
mexidas as (
  update ... from alvo where a.id = alvo.id
  returning (not alvo.estava and alvo.valor >= alvo.target) as abriu
)
```

**2. O catálogo que só existia para uma pessoa.** As conquistas tinham sido
semeadas para uma conta de teste. Toda conta criada pelo app abria a tela de
Conquistas em **0/0** — uma tela vazia que parecia bug e era. A correção foi
separar catálogo (compartilhado) de progresso (por pessoa) e criar
`semear_conquistas()`, que roda para quem ainda não tem.

Vale registrar porque é o padrão do erro: *um recurso testado só na conta de
quem o construiu.*

## 5.2 Medalhas e campeonatos

**Estado: CONSTRUÍDO.** Tabela `medals`.

Registro de pódio em competição: ouro, prata ou bronze, com campeonato,
categoria, data, federação e a academia representada.

### As duas leituras

O mesmo dado é lido de dois jeitos, porque atleta e academia querem coisas
diferentes.

**No perfil do atleta** — até **três medalhas em destaque**, escolhidas por quem
ganhou. Acima de três, "ver todas". Um gatilho no banco (`medals_limite_destaque`)
garante o máximo de três: a regra é da tabela, não da tela.

**No perfil da academia** — **totais por colocação**:

> Ouro 26× · Prata 23× · Bronze 19×

Não faz sentido uma academia "escolher três medalhas em destaque". O que ela
quer mostrar é volume, e o "ver tudo" abre a lista de campeonatos **com o nome
do atleta que ganhou cada uma**. É o mural da parede, digitalizado.

### O fluxo que liga os dois

O atleta registra a medalha e anexa a academia que representava. A medalha
aparece nos dois lugares a partir de um registro só. A academia pode **ocultar**
uma medalha do próprio perfil (`ocultar_medalha_da_equipe`) sem apagá-la do
perfil do atleta — porque o dado é do atleta, e a vitrine é da academia.

Estado atual dos dados de exemplo: Academia Teste com **59 medalhas de 13
atletas**.

## 5.3 Coleções

**Estado: PROPOSTO.**

Uma coleção é um conjunto de conquistas relacionadas que só faz sentido completo.
As 1.006 conquistas hoje são uma lista plana; agrupá-las produziria a sensação de
"faltam duas" que uma lista plana nunca dá.

Coleções propostas, todas montáveis com dado que já existe:

| Coleção | Conteúdo | O que celebra |
|---|---|---|
| **O ano** | Um treino em cada mês | Constância acima de intensidade |
| **A casa** | Rolar com 10, 25, 50 pessoas diferentes da academia | Quem circula em vez de rolar sempre com o mesmo |
| **As faixas** | Rolar com alguém de cada faixa | Amplitude — a coisa que mais falta em quem estagna |
| **Gi e No-Gi** | Volume nos dois | Contra a especialização precoce |
| **A linhagem** | Registrar a graduação e quem entregou, todas | Memória |
| **O pódio** | Ouro, prata e bronze | Só para quem compete |

A apresentação proposta é uma grade com o que falta visível — o mecanismo do
álbum de figurinhas, que é o mais antigo e mais eficaz da categoria.

## 5.4 Missões

**Estado: PROPOSTO.** Nada disso existe hoje.

### O problema que missões resolvem

Conquistas são de prazo longo e passivas: você as descobre depois de já ter
feito. Falta uma camada de prazo curto que diga *"faça isto esta semana"*.

### Desenho proposto

**Três missões semanais**, geradas na segunda-feira, expirando no domingo. Nunca
mais de três — uma lista longa vira dever de casa.

Os tipos:

| Tipo | Exemplo | Fonte do dado |
|---|---|---|
| **Volume** | "Treine 3 vezes esta semana" | `trainings` |
| **Amplitude** | "Role com alguém que você não rola há um mês" | `training_partners` |
| **Estudo** | "Registre 3 técnicas treinadas" | `trainings.techniques` |
| **Social** | "Confirme os registros pendentes" | `training_partners` |
| **Memória** | "Registre uma graduação antiga que faltava" | `graduations` |

### Três regras que precisam valer

**1. Missão nunca manda treinar mais do que o histórico da pessoa.** Se ela
treina duas vezes por semana, a missão de volume é duas, não quatro. Um app de
esporte de contato que empurra volume acima do hábito está empurrando lesão.

**2. Missão não expira com punição.** Falhar não tira nada. A missão some no
domingo e três novas aparecem. Punir falha é o mecanismo que faz um app de hábito
virar fonte de culpa, e culpa não faz ninguém voltar ao tatame.

**3. Nenhuma missão exige interação com pessoa específica.** "Role com o Fulano"
transformaria o app em pressão social sobre terceiros que não pediram nada.

### O que missões NÃO devem fazer

Não devem dar moeda (capítulo 09). Não devem alimentar ranking (regra 4). Não
devem ter "missão de fim de semana em dobro" — isso é calendário de jogo, e a
academia já tem o dela.

## 5.5 Buracos conhecidos

| Buraco | Impacto | Esforço |
|---|---|---|
| Missões não existem | Alto — falta o laço de prazo curto | Tabela + gerador + tela |
| Conquistas são lista plana, sem coleção | Médio | Agrupamento no catálogo + tela |
| Sem notificação, conquista aberta passa despercebida | Alto | Ver capítulo 11 |
| 1.006 conquistas é muito para navegar | Médio | Filtro por proximidade: "faltam poucas" |
