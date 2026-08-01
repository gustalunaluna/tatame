# 14 — Banco de dados (ERD)

Postgres 17 no Supabase. 21 tabelas, RLS em todas.

## 14.1 O diagrama

```
                              ┌──────────────┐
                              │  auth.users  │  (Supabase / GoTrue)
                              └──────┬───────┘
                                     │ 1:1
                              ┌──────▼───────┐
              ┌───────────────┤   profiles   ├───────────────┐
              │               └──────┬───────┘               │
              │                      │                       │
   ═══════════▼══════════   ═════════▼═════════   ═══════════▼══════════
       REGISTRO                  SOCIAL                 PROGRESSÃO
   ══════════════════════   ═══════════════════   ══════════════════════

   ┌──────────────┐         ┌──────────────┐      ┌──────────────────┐
   │  trainings   │         │partnerships  │      │   achievements   │
   └──────┬───────┘         └──────────────┘      └────────┬─────────┘
          │ 1:N                                            │ N:1
   ┌──────▼────────────┐    ┌──────────────┐      ┌────────▼─────────┐
   │ training_partners │    │    teams     │      │achievement_catalog│
   └───────────────────┘    └──────┬───────┘      └──────────────────┘
                                   │ 1:N
   ┌──────────────┐         ┌──────▼───────┐      ┌──────────────────┐
   │  techniques  │         │ team_members │      │      goals       │
   └──────────────┘         └──────────────┘      └──────────────────┘

   ┌──────────────┐         ┌──────────────┐      ┌──────────────────┐
   │ weak_points  │         │ master_links │      │  graduations     │
   └──────────────┘         └──────────────┘      └──────────────────┘

   ┌──────────────┐         ┌──────────────┐      ┌──────────────────┐
   │   analyses   │         │    medals    │      │  plan_objectives │
   └──────────────┘         └──────────────┘      └────────┬─────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │  plan_templates  │
                                                  └────────┬─────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │   plan_cycles    │
                                                  └────────┬─────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │ plan_cycle_items │
                                                  └──────────────────┘
```

## 14.2 As tabelas

### Núcleo

| Tabela | Colunas | O que guarda |
|---|---|---|
| `profiles` | 20 | Nome, @, bio, faixa, graus, foto, academia declarada, lutas, `instrutor`, `verificado` |
| `trainings` | 11 | Uma sessão: data, tipo, duração, rolas, técnicas, notas |
| `techniques` | 9 | Biblioteca pessoal com nota de domínio |
| `weak_points` | 9 | Pontos fracos declarados, ligados a objetivo de plano |
| `analyses` | 6 | Análises geradas por período |

### Social

| Tabela | Colunas | O que guarda |
|---|---|---|
| `partnerships` | 5 | Relação recíproca: requester, addressee, status |
| `training_partners` | 11 | Uma rola: treino, parceiro, placar, confirmação, faixa no momento |
| `teams` | 11 | Academia: nome, slug, cidade, brasão, status, `matriz_id` |
| `team_members` | 5 | Vínculo com papel e status |
| `master_links` | 11 | Quem graduou quem, com período, papel e `principal` |

### Progressão

| Tabela | Colunas | O que guarda |
|---|---|---|
| `achievement_catalog` | 7 | As 1.006 conquistas, compartilhadas |
| `achievements` | 14 | O progresso de cada pessoa |
| `goals` | 14 | Metas: graduação, competição, volume, livre |
| `graduations` | 10 | Faixa, graus, data, quem entregou, academia |
| `medals` | 13 | Pódio: colocação, campeonato, categoria, federação, destaque |

### Plano

| Tabela | Colunas | O que guarda |
|---|---|---|
| `plan_objectives` | 6 | Catálogo de objetivos |
| `plan_templates` | 11 | Modelo por objetivo e faixa |
| `plan_cycles` | 12 | Um ciclo de quatro semanas de alguém |
| `plan_cycle_items` | 11 | Os itens do ciclo, marcáveis |
| `plan_weeks` | 7 | Agregado semanal |

### Sistema

| Tabela | Colunas | O que guarda |
|---|---|---|
| `app_admins` | 2 | Quem pode aprovar academia |

## 14.3 As decisões de modelagem

### `training_partners.partner_id` é anulável

`ON DELETE SET NULL`. Quando alguém apaga a conta, as rolas que ela teve com você
**não somem do seu histórico** — o nome fica, o vínculo cai.

O contrário (cascade) apagaria pedaços do diário de terceiros. Um diário que se
altera sozinho porque outra pessoa saiu do app quebra a promessa central.

### `master_links.mestre_id` é anulável

Mesma lógica, motivo diferente: **o mestre pode não ter conta**. Mitsuyo Maeda não
vai criar uma, e a linhagem precisa chegar até ele.

A restrição garante que ao menos um dos dois existe:

```sql
check (mestre_id is not null or btrim(mestre_nome) <> '')
```

E `mestres_de` prefere o perfil quando há conta:

```sql
coalesce(nullif(btrim(v.mestre_nome), ''), mp.nickname, mp.handle, '')
```

O nome digitado só vale quando não há conta — se o mestre está no app, quem manda
é o perfil dele, que ele mesmo mantém.

### A faixa no momento do registro

`training_partners` guarda a faixa do parceiro **quando a rola aconteceu**. Sem
isso, "rolei com ele quando ele era azul" seria impossível de contar, porque a
faixa atual sobrescreveria a história.

### A escada de graduação mora no banco

`grau_valido(belt, degrees)` é a fonte da regra, e três tabelas a usam em `CHECK`:
`profiles`, `graduations` e `goals`. Branca a marrom vão até o 4º grau, preta até
o 6º, coral aceita 7 e 8, vermelha aceita 9 e 10.

Sem isso a regra existiria só no formulário, e o backfill que criou "vermelha 3º
grau" teria acontecido de novo na primeira tela nova que alguém escrevesse.

### Catálogo separado do progresso

`achievement_catalog` (compartilhado) e `achievements` (por pessoa). A separação
nasceu de um bug: as conquistas tinham sido semeadas só para uma conta, e todo
usuário novo abria a tela em 0/0.

### `medals.team_id` anulável

Uma medalha pertence ao atleta. A academia representada é opcional, e a academia
pode **ocultar** a medalha do próprio perfil sem apagá-la do perfil do atleta.

O dado é do atleta; a vitrine é da academia.

## 14.4 As armadilhas documentadas

### A armadilha do GoTrue: colunas de token NULL

Oito colunas de `auth.users` precisam ser `''` e não `NULL`:

```
confirmation_token          email_change_token_new
recovery_token              email_change_token_current
email_change                phone_change
phone_change_token          reauthentication_token
```

Com qualquer uma em `NULL`, o login falha com **"invalid password"** — mesmo com a
senha correta. A mensagem de erro aponta para o lugar errado e custa horas.

### `revoke ... from public` não revoga `anon`

Supabase concede a `anon` via privilégios padrão. Revogar de `public` **não** tira
essa concessão. As migrações 006 a 010 deixaram funções chamáveis por visitante
não logado por causa disso; a 011 corrigiu com `revoke ... from anon` explícito.

Toda função nova precisa das duas linhas.

### `RETURNING` num `UPDATE` vê a linha depois

Descrito no capítulo 05. O estado anterior tem que vir da CTE de origem.

### `content-visibility: auto` esconde do `innerText`

A classe `list-perf` melhora o desempenho de listas longas, mas o conteúdo fora da
tela fica invisível para `innerText`. Nos testes, usar `textContent`.

## 14.5 RLS

Todas as tabelas têm RLS. O padrão é:

| Tabela | Leitura | Escrita |
|---|---|---|
| `profiles` | pública entre autenticados | só o dono |
| `trainings`, `techniques`, `goals` | só o dono | só o dono |
| `training_partners` | dono ou parceiro | dono cria; parceiro confirma |
| `partnerships` | os dois lados | requester cria; addressee responde |
| `teams` | pública entre autenticados | dono edita; admin aprova |
| `master_links` | pública entre autenticados | só o aluno |
| `medals`, `graduations` | pública entre autenticados | só o dono |

**A linhagem é pública entre quem está logado.** É assim no tatame: a pergunta
"de quem você é aluno?" se responde no primeiro dia.

## 14.6 As tabelas propostas

| Tabela | Capítulo |
|---|---|
| `chronicles` + `chronicle_people` | [07](07-cronicas-e-social.md) |
| `groups` + `group_members` | [07](07-cronicas-e-social.md) |
| `missions` | [05](05-conquistas-e-missoes.md) |
| `notifications` | [11](11-retencao.md) |
| coluna `emblemavel` em `achievement_catalog` | [08](08-titulos-e-cosmeticos.md) |
| coluna `destaque` em `achievements` | [08](08-titulos-e-cosmeticos.md) |
| coluna `confirmado` em `master_links` | [06](06-academia-e-linhagem.md) |
