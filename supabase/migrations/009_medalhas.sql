-- 009 — Medalhas de campeonato.
--
-- O atleta registra o que ganhou (ouro/prata/bronze, campeonato, categoria,
-- data, federação) e diz por qual academia estava competindo. A medalha
-- aparece no perfil dele e, se ele apontou a academia, no perfil dela também.
--
-- Duas decisões que valem explicação:
--
-- 1. PERFIL DA PESSOA mostra até 3 em destaque, escolhidas por ela. PERFIL DA
--    ACADEMIA não escolhe nada — mostra o total por colocação ("ouro 26x"),
--    porque numa academia com 40 alunos escolher 3 seria arbitrário e a
--    pergunta que importa ali é "quanto esta academia ganha".
--
-- 2. Qualquer um pode dizer que competiu por qualquer academia, e isso é uma
--    porta para encher o perfil dos outros de medalha inventada. O freio não é
--    aprovação prévia (ia travar o uso legítimo): é que a lista da academia
--    mostra QUEM ganhou cada medalha, então a mentira fica com nome e
--    sobrenome, e o dono ou mestre da academia pode ocultar uma linha do
--    perfil dela sem apagar a medalha do perfil do atleta.
--
-- Antes disto, o "campeonatos" da tela de academia contava metas de competição
-- concluídas — um número que dependia de a pessoa ter criado uma meta antes de
-- ganhar. Agora conta ouro de verdade.
--
-- Idempotente.

create table if not exists public.medals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  team_id     uuid references public.teams on delete set null,
  colocacao   text not null check (colocacao in ('ouro', 'prata', 'bronze')),
  evento      text not null,
  categoria   text not null default '',
  federacao   text not null default '',
  modalidade  text not null default 'Gi' check (modalidade in ('Gi', 'No-Gi')),
  data        date not null,
  absoluto    boolean not null default false,
  destaque    boolean not null default false,
  -- levantada pelo dono/mestre da academia; tira do perfil da equipe, não do
  -- perfil do atleta
  oculta_pela_equipe boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists medals_user_idx on public.medals (user_id, data desc);
create index if not exists medals_team_idx on public.medals (team_id)
  where team_id is not null;

alter table public.medals enable row level security;

-- Medalha é informação pública: ela existe para aparecer no perfil, e perfil
-- de atleta é visível para qualquer pessoa logada.
drop policy if exists "medalha é pública para quem está logado" on public.medals;
create policy "medalha é pública para quem está logado"
  on public.medals for select to authenticated using (true);

drop policy if exists "dono cadastra a própria medalha" on public.medals;
create policy "dono cadastra a própria medalha"
  on public.medals for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dono edita a própria medalha" on public.medals;
create policy "dono edita a própria medalha"
  on public.medals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dono apaga a própria medalha" on public.medals;
create policy "dono apaga a própria medalha"
  on public.medals for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Três em destaque, não mais
-- ---------------------------------------------------------------------------
create or replace function public.medals_limite_destaque() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.destaque and (
    select count(*) from public.medals
    where user_id = new.user_id and destaque and id <> new.id
  ) >= 3 then
    raise exception 'O perfil mostra três medalhas em destaque. Tire uma antes de pôr outra.';
  end if;
  return new;
end $$;

revoke all on function public.medals_limite_destaque() from public, anon, authenticated;

drop trigger if exists medals_destaque on public.medals;
create trigger medals_destaque before insert or update on public.medals
  for each row execute function public.medals_limite_destaque();

-- ---------------------------------------------------------------------------
-- Leitura: perfil da pessoa
-- ---------------------------------------------------------------------------
create or replace function public.medalhas_do_atleta(
  p_handle text,
  p_so_destaque boolean default false,
  p_limite integer default 50,
  p_offset integer default 0
) returns table (
  id uuid, colocacao text, evento text, categoria text, federacao text,
  modalidade text, data date, absoluto boolean, destaque boolean,
  team_slug text, team_nome text, team_crest text, sou_dono boolean
)
  language sql stable security definer set search_path = public as $$
  select m.id, m.colocacao, m.evento, m.categoria, m.federacao,
         m.modalidade, m.data, m.absoluto, m.destaque,
         coalesce(e.slug, ''), coalesce(e.name, ''), coalesce(e.crest_url, ''),
         m.user_id = auth.uid()
  from public.medals m
  join public.profiles p on p.user_id = m.user_id
  left join public.teams e on e.id = m.team_id
  where p.handle = lower(btrim(p_handle))
    and (not p_so_destaque or m.destaque)
  order by m.data desc, m.created_at desc
  limit greatest(0, least(p_limite, 200)) offset greatest(0, p_offset);
$$;

create or replace function public.resumo_medalhas_do_atleta(p_handle text)
  returns table (ouro bigint, prata bigint, bronze bigint, total bigint)
  language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where m.colocacao = 'ouro'),
    count(*) filter (where m.colocacao = 'prata'),
    count(*) filter (where m.colocacao = 'bronze'),
    count(*)
  from public.medals m
  join public.profiles p on p.user_id = m.user_id
  where p.handle = lower(btrim(p_handle));
$$;

-- ---------------------------------------------------------------------------
-- Leitura: perfil da academia
-- ---------------------------------------------------------------------------
create or replace function public.resumo_medalhas_da_equipe(p_slug text)
  returns table (ouro bigint, prata bigint, bronze bigint, total bigint,
                 atletas bigint, eventos bigint)
  language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where m.colocacao = 'ouro'),
    count(*) filter (where m.colocacao = 'prata'),
    count(*) filter (where m.colocacao = 'bronze'),
    count(*),
    count(distinct m.user_id),
    count(distinct lower(btrim(m.evento)))
  from public.medals m
  join public.teams e on e.id = m.team_id
  where e.slug = lower(btrim(p_slug))
    and e.status = 'aprovada'
    and not m.oculta_pela_equipe;
$$;

-- A lista da academia sempre diz quem ganhou: é o que torna a medalha
-- verificável por quem está lá dentro.
create or replace function public.medalhas_da_equipe(
  p_slug text,
  p_limite integer default 30,
  p_offset integer default 0
) returns table (
  id uuid, colocacao text, evento text, categoria text, federacao text,
  modalidade text, data date, absoluto boolean,
  atleta_handle text, atleta_nome text, atleta_foto text,
  atleta_faixa text, atleta_graus integer,
  posso_ocultar boolean
)
  language sql stable security definer set search_path = public as $$
  with e as (
    select * from public.teams
    where slug = lower(btrim(p_slug)) and status = 'aprovada'
  ),
  mando as (
    select exists (
      select 1 from public.team_members m, e
      where m.team_id = e.id and m.user_id = auth.uid()
        and m.status = 'ativo' and m.role in ('dono', 'mestre')
    ) as pode
  )
  select m.id, m.colocacao, m.evento, m.categoria, m.federacao,
         m.modalidade, m.data, m.absoluto,
         coalesce(p.handle, ''), coalesce(p.nickname, p.handle, ''),
         coalesce(p.photo_url, ''), coalesce(p.belt, 'Branca'),
         coalesce(p.degrees, 0),
         (select pode from mando)
  from public.medals m
  join e on e.id = m.team_id
  left join public.profiles p on p.user_id = m.user_id
  where not m.oculta_pela_equipe
  order by m.data desc, m.created_at desc
  limit greatest(0, least(p_limite, 200)) offset greatest(0, p_offset);
$$;

-- Dono ou mestre tira uma medalha do perfil da academia. Não apaga nada: a
-- medalha continua no perfil do atleta, que é dele.
create or replace function public.ocultar_medalha_da_equipe(
  p_medalha uuid,
  p_ocultar boolean
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  equipe uuid;
begin
  select team_id into equipe from public.medals where id = p_medalha;
  if equipe is null then
    raise exception 'Medalha não encontrada, ou não aponta para nenhuma academia.';
  end if;

  if not exists (
    select 1 from public.team_members m
    where m.team_id = equipe and m.user_id = auth.uid()
      and m.status = 'ativo' and m.role in ('dono', 'mestre')
  ) then
    raise exception 'Só o responsável ou um mestre da academia pode fazer isso.';
  end if;

  update public.medals set oculta_pela_equipe = p_ocultar where id = p_medalha;
end $$;

revoke all on function public.medalhas_do_atleta(text, boolean, integer, integer) from public;
revoke all on function public.resumo_medalhas_do_atleta(text) from public;
revoke all on function public.resumo_medalhas_da_equipe(text) from public;
revoke all on function public.medalhas_da_equipe(text, integer, integer) from public;
revoke all on function public.ocultar_medalha_da_equipe(uuid, boolean) from public;
grant execute on function public.medalhas_do_atleta(text, boolean, integer, integer) to authenticated;
grant execute on function public.resumo_medalhas_do_atleta(text) to authenticated;
grant execute on function public.resumo_medalhas_da_equipe(text) to authenticated;
grant execute on function public.medalhas_da_equipe(text, integer, integer) to authenticated;
grant execute on function public.ocultar_medalha_da_equipe(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- O "campeonatos" da academia passa a contar ouro de verdade
-- ---------------------------------------------------------------------------
-- Antes contava metas de competição concluídas, o que dependia de a pessoa ter
-- criado uma meta antes de ganhar. Agora `titulos` são os ouros da equipe.
create or replace function public.perfil_equipe(p_slug text)
  returns table (
    id uuid, name text, slug text, city text, master text, crest_url text,
    status text, criada_em date, alunos bigint, faixas_pretas bigint,
    competidores bigint, titulos bigint, vitorias bigint, derrotas bigint,
    sou_membro boolean, sou_dono boolean, meu_status text
  )
  language sql stable security definer set search_path = public as $$
  with t as (
    select * from public.teams where slug = lower(btrim(p_slug)) and status = 'aprovada'
  ),
  membros as (
    select m.user_id, p.belt, p.fights_won, p.fights_lost
    from public.team_members m
    join t on t.id = m.team_id
    left join public.profiles p on p.user_id = m.user_id
    where m.status = 'ativo'
  ),
  medalhas as (
    select m.colocacao from public.medals m, t
    where m.team_id = t.id and not m.oculta_pela_equipe
  )
  select
    t.id, t.name, t.slug, t.city, t.master, t.crest_url, t.status,
    t.created_at::date,
    (select count(*) from membros),
    (select count(*) from membros where belt in ('Preta','Coral','Vermelha')),
    -- competidor agora é quem tem medalha, e não quem digitou um placar.
    -- O apelido `t2` é necessário: `t` já está no FROM de fora.
    (select count(distinct m.user_id) from public.medals m, t t2
      where m.team_id = t2.id and not m.oculta_pela_equipe),
    (select count(*) from medalhas where colocacao = 'ouro'),
    (select coalesce(sum(coalesce(fights_won,0)), 0) from membros),
    (select coalesce(sum(coalesce(fights_lost,0)), 0) from membros),
    exists (select 1 from public.team_members m2
             where m2.team_id = t.id and m2.user_id = auth.uid() and m2.status = 'ativo'),
    exists (select 1 from public.team_members m2
             where m2.team_id = t.id and m2.user_id = auth.uid()
               and m2.status = 'ativo' and m2.role = 'dono'),
    coalesce((select m2.status from public.team_members m2
               where m2.team_id = t.id and m2.user_id = auth.uid()), '')
  from t;
$$;
