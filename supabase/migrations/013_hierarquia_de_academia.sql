-- ============================================================================
-- 013 — Hierarquia de academia, como ela funciona de verdade
-- ============================================================================
-- O app tratava academia como um clube: dono e membro, e pronto. Uma academia
-- de jiu-jitsu não é isso. Ela tem uma cadeia de responsabilidade que todo
-- praticante reconhece, e o app precisava saber lê-la para não inventar
-- nomenclatura.
--
-- Como funciona de fato:
--
--   * MESTRE / PROFESSOR — quem responde pela academia e gradua. Na prática
--     "mestre" é reservado para faixa-preta veterano (4º grau em diante) e
--     "professor" para o faixa-preta que dá aula. Chamar um preta 1º grau de
--     "mestre" soa errado dentro do tatame, e o app não deve fazer isso.
--   * INSTRUTOR — dá aula sob a supervisão do professor. A partir da roxa já
--     se instrui na maioria das casas; é o primeiro degrau de quem ensina.
--   * MONITOR — ajuda na aula, normalmente com os iniciantes.
--   * ALUNO — todo mundo, inclusive quem instrui.
--
--   * MATRIZ e FILIAL — uma academia pode ser filiada a outra (Gracie Barra X
--     é filial da Gracie Barra). O vínculo é institucional e não muda quem
--     graduou quem.
--   * LINHAGEM — a corrente de quem graduou quem, pessoa a pessoa. É o que
--     dá identidade ao praticante, e ela atravessa academias: alguém pode
--     treinar numa academia e ter sido graduado por outra pessoa.
--
-- Duas consequências que o modelo antigo não suportava:
--   1. Uma pessoa tem MAIS DE UM MESTRE ao longo da vida — quem a iniciou,
--      quem a graduou preta, quem a recebeu depois de uma mudança de cidade.
--      Um campo de texto `master` não guarda isso.
--   2. Instrutor não é cargo só dado pela academia: a partir da roxa a pessoa
--      pode se declarar instrutora, e a academia pode confirmar.
-- ============================================================================

/* --- 1. os papéis dentro da academia ------------------------------------- */
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('dono', 'mestre', 'professor', 'instrutor', 'monitor', 'membro'));

/* --- 2. filiação entre academias ----------------------------------------- */
alter table public.teams add column if not exists matriz_id uuid
  references public.teams(id) on delete set null;

create index if not exists teams_matriz_idx on public.teams(matriz_id)
  where matriz_id is not null;

/* --- 3. quem pode se declarar instrutor ---------------------------------- */
alter table public.profiles add column if not exists instrutor boolean not null default false;

create or replace function public.pode_ser_instrutor(p_belt text)
returns boolean
language sql immutable
set search_path to 'pg_catalog'
as $$
  select p_belt in ('Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha');
$$;

-- A regra é do banco, não da tela. Se ficar só no formulário, qualquer
-- chamada direta à API cria um faixa-branca instrutor.
create or replace function public.instrutor_exige_faixa()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.instrutor and not public.pode_ser_instrutor(new.belt) then
    raise exception 'Instrutor a partir da faixa roxa. % não pode.', new.belt;
  end if;
  -- Rebaixou de faixa (correção de cadastro): perde a marca junto, em vez de
  -- ficar um branca instrutor porque um dia foi roxa.
  if not public.pode_ser_instrutor(new.belt) then
    new.instrutor := false;
  end if;
  return new;
end $$;

drop trigger if exists tp_instrutor_exige_faixa on public.profiles;
create trigger tp_instrutor_exige_faixa
  before insert or update of instrutor, belt on public.profiles
  for each row execute function public.instrutor_exige_faixa();

/* --- 4. os mestres de uma pessoa (vários, com história) ------------------ */
create table if not exists public.master_links (
  id          uuid primary key default gen_random_uuid(),
  aluno_id    uuid not null references auth.users(id) on delete cascade,
  -- Nulo de propósito: o mestre pode não ter conta no app. Mitsuyo Maeda não
  -- vai criar uma, e a linhagem precisa chegar até ele mesmo assim.
  mestre_id   uuid references auth.users(id) on delete set null,
  mestre_nome text not null default '',
  team_id     uuid references public.teams(id) on delete set null,
  papel       text not null default 'mestre'
              check (papel in ('mestre', 'professor', 'instrutor')),
  principal   boolean not null default false,
  desde       date,
  ate         date,
  nota        text not null default '',
  created_at  timestamptz not null default now(),
  check (mestre_id is not null or btrim(mestre_nome) <> '')
);

create index if not exists master_links_aluno_idx on public.master_links(aluno_id);
create index if not exists master_links_mestre_idx on public.master_links(mestre_id)
  where mestre_id is not null;

-- Vários mestres, um principal. É o principal que a linhagem segue.
create or replace function public.um_mestre_principal()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.principal then
    update public.master_links set principal = false
    where aluno_id = new.aluno_id and id <> new.id and principal;
  end if;
  return new;
end $$;

drop trigger if exists tp_um_mestre_principal on public.master_links;
create trigger tp_um_mestre_principal
  after insert or update of principal on public.master_links
  for each row when (new.principal) execute function public.um_mestre_principal();

alter table public.master_links enable row level security;

-- Linhagem é pública entre quem está logado: é assim no tatame, onde a
-- pergunta "de quem você é aluno?" se responde no primeiro dia.
drop policy if exists "vínculo de mestre é público para quem está logado" on public.master_links;
create policy "vínculo de mestre é público para quem está logado"
  on public.master_links for select to authenticated using (true);

drop policy if exists "dono cadastra o próprio mestre" on public.master_links;
create policy "dono cadastra o próprio mestre"
  on public.master_links for insert to authenticated
  with check (aluno_id = (select auth.uid()));

drop policy if exists "dono edita o próprio vínculo" on public.master_links;
create policy "dono edita o próprio vínculo"
  on public.master_links for update to authenticated
  using (aluno_id = (select auth.uid()))
  with check (aluno_id = (select auth.uid()));

drop policy if exists "dono apaga o próprio vínculo" on public.master_links;
create policy "dono apaga o próprio vínculo"
  on public.master_links for delete to authenticated
  using (aluno_id = (select auth.uid()));

revoke execute on function public.instrutor_exige_faixa() from public, anon;
revoke execute on function public.um_mestre_principal() from public, anon;
