-- ============================================================================
-- 041 — O diário da dieta
-- ============================================================================
-- O app passa a ter duas áreas: o jiu-jitsu, que já existia, e a dieta.
-- Elas não são dois bancos nem dois apps — são a mesma pessoa, e é justamente
-- por isso que valem juntas: a caloria gasta no dia sai do TREINO já
-- registrado em `trainings` (duração e número de rolas), não de um formulário
-- separado onde a pessoa reescreveria o que já escreveu no diário.
--
-- TRÊS TABELAS, E SÓ TRÊS
--
--   perfil_da_dieta  o que não muda todo dia: altura, sexo, objetivo, metas
--   pesagens         uma linha por dia em que subiu na balança
--   refeicoes        uma linha por item comido
--
-- A CONTA NÃO MORA NO BANCO
--
-- Basal, gasto do treino, meta de caloria e macro, tendência de peso — tudo
-- isso é `src/lib/dieta.ts`, função pura, sem import, testada sem navegador.
-- Mesmo motivo de `cartel.ts` e `exame-de-faixa.ts`. O banco guarda o que
-- aconteceu; quem interpreta é o código, que dá para versionar e testar.
--
-- ISTO É PRIVADO, PONTO
--
-- Medalha e cartel são currículo público. Peso e o que a pessoa comeu não são.
-- RLS aqui é `auth.uid() = user_id` em TODA operação, sem a exceção de leitura
-- para "qualquer autenticado" que as tabelas sociais têm.
--
-- Idempotente.
-- ============================================================================

/* --- 1. o perfil da dieta ------------------------------------------------- */
-- Uma linha por pessoa. `user_id` é a própria chave primária: duas linhas de
-- perfil para o mesmo dono seriam duas alturas diferentes, e nenhuma resposta
-- para "qual vale".
create table if not exists public.perfil_da_dieta (
  user_id         uuid primary key references auth.users on delete cascade,
  altura_cm       integer,
  sexo            text check (sexo is null or sexo in ('masculino', 'feminino')),
  objetivo        text not null default 'manter'
                    check (objetivo in ('secar', 'manter', 'ganhar')),
  -- quando preenchidas, mandam mais que o cálculo: quem tem nutricionista usa
  -- o número do nutricionista, não o da fórmula
  meta_kcal       integer,
  meta_proteina_g integer,
  updated_at      timestamptz not null default now()
);

comment on table public.perfil_da_dieta is
  'O que a conta da dieta precisa e não muda todo dia. Uma linha por pessoa.';
comment on column public.perfil_da_dieta.meta_kcal is
  'Meta manual. NULL = usa a conta de src/lib/dieta.ts (gasto ± ajuste do objetivo).';

/* --- 2. as pesagens ------------------------------------------------------- */
-- `unique (user_id, data)` de propósito: peso é um número por dia. Sem isso,
-- pesar de manhã e de noite viraria duas verdades sobre o mesmo dia, e a média
-- móvel passaria a pesar mais os dias em que a pessoa subiu duas vezes na
-- balança — exatamente os dias em que ela estava preocupada com o peso.
create table if not exists public.pesagens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  data        date not null,
  peso_kg     numeric(5, 2) not null check (peso_kg > 20 and peso_kg < 400),
  gordura_pct numeric(4, 1) check (gordura_pct is null or (gordura_pct >= 0 and gordura_pct <= 70)),
  nota        text not null default '',
  created_at  timestamptz not null default now(),
  unique (user_id, data)
);

comment on table public.pesagens is
  'Uma pesagem por dia. O que importa é a tendência de 14 dias, não o número do dia.';

create index if not exists pesagens_user_idx on public.pesagens (user_id, data desc);

/* --- 3. as refeições ------------------------------------------------------ */
-- `momento` é texto livre e sem CHECK, pelo mesmo motivo de `trainings.type`:
-- a lista sugerida vive no código (MOMENTOS, em dieta.ts), onde muda sem
-- migração. Quem come às 3 da manhã depois do plantão escreve o que quiser.
create table if not exists public.refeicoes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  data           date not null,
  momento        text not null default '',
  alimento       text not null,
  porcao         text not null default '',
  kcal           integer not null default 0 check (kcal >= 0),
  proteina_g     numeric(6, 1) not null default 0 check (proteina_g >= 0),
  carboidrato_g  numeric(6, 1) not null default 0 check (carboidrato_g >= 0),
  gordura_g      numeric(6, 1) not null default 0 check (gordura_g >= 0),
  created_at     timestamptz not null default now()
);

comment on table public.refeicoes is
  'Um item comido por linha. Agrupar por momento é trabalho da tela, não do banco.';

create index if not exists refeicoes_user_dia_idx
  on public.refeicoes (user_id, data desc, created_at);

/* --- 4. RLS: só o dono, em tudo ------------------------------------------ */
alter table public.perfil_da_dieta enable row level security;
alter table public.pesagens         enable row level security;
alter table public.refeicoes        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['perfil_da_dieta', 'pesagens', 'refeicoes'] loop
    execute format('drop policy if exists "dono lê" on public.%I', t);
    execute format(
      'create policy "dono lê" on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "dono cria" on public.%I', t);
    execute format(
      'create policy "dono cria" on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "dono edita" on public.%I', t);
    execute format(
      'create policy "dono edita" on public.%I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "dono apaga" on public.%I', t);
    execute format(
      'create policy "dono apaga" on public.%I for delete to authenticated
         using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

/* --- 5. os alimentos que a pessoa já usou -------------------------------- */
-- Ninguém come coisas diferentes todo dia. Depois de duas semanas, quase toda
-- refeição nova é a repetição de uma antiga — e obrigar a redigitar "Peito de
-- frango grelhado, 165 kcal, 31 g de proteína" pela vigésima vez é o motivo
-- pelo qual as pessoas param de registrar dieta na terceira semana.
--
-- `distinct on` precisa de SQL de verdade, não dá para fazer pelo cliente sem
-- baixar o histórico inteiro. Por isso uma função, e não uma view: view não
-- aceita parâmetro de limite.
--
-- `security invoker` — a RLS da tabela continua valendo, então esta função não
-- é um jeito de ler o prato dos outros.
create or replace function public.alimentos_recentes(p_limite integer default 24)
returns table (
  alimento      text,
  porcao        text,
  kcal          integer,
  proteina_g    numeric,
  carboidrato_g numeric,
  gordura_g     numeric,
  usos          bigint
)
language sql
security invoker
stable
set search_path = public
as $$
  with ultimas as (
    select distinct on (r.alimento)
      r.alimento, r.porcao, r.kcal, r.proteina_g, r.carboidrato_g, r.gordura_g,
      r.created_at
    from public.refeicoes r
    where r.user_id = (select auth.uid())
    order by r.alimento, r.created_at desc
  ),
  contagem as (
    select r.alimento, count(*) as usos
    from public.refeicoes r
    where r.user_id = (select auth.uid())
    group by r.alimento
  )
  select u.alimento, u.porcao, u.kcal, u.proteina_g, u.carboidrato_g,
         u.gordura_g, c.usos
  from ultimas u
  join contagem c on c.alimento = u.alimento
  order by c.usos desc, u.created_at desc
  limit greatest(1, least(coalesce(p_limite, 24), 100));
$$;

comment on function public.alimentos_recentes(integer) is
  'O que a pessoa mais registra, com os macros da última vez. Repetir um prato vira um toque.';

revoke all on function public.alimentos_recentes(integer) from public;
grant execute on function public.alimentos_recentes(integer) to authenticated;
