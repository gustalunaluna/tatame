-- 003 — Camada social: equipes, parceiros de treino e placar entre parceiros.
--
-- Princípio de segurança que orienta o arquivo inteiro: a tabela `profiles`
-- continua fechada — ninguém lê a linha de ninguém. Tudo que outra pessoa vê
-- de você passa por função SECURITY DEFINER que devolve só os campos públicos
-- (apelido, @, faixa, graus, academia, foto). Nada de data de nascimento,
-- metas ou cartel.
--
-- Idempotente: pode rodar quantas vezes quiser.

-- ---------------------------------------------------------------------------
-- 1. @ público no perfil — é por ele que uma pessoa acha a outra
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists handle text;

-- minúsculas, sem acento, 3–20 caracteres, letras/números/ponto/underline
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_handle_formato') then
    alter table public.profiles
      add constraint profiles_handle_formato
      check (handle is null or handle ~ '^[a-z0-9][a-z0-9._]{2,19}$');
  end if;
end $$;

create unique index if not exists profiles_handle_idx on public.profiles (handle)
  where handle is not null;

-- ---------------------------------------------------------------------------
-- 2. Quem administra o app (aprova equipes)
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

drop policy if exists "admins leem a si mesmos" on public.app_admins;
create policy "admins leem a si mesmos" on public.app_admins
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sou_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 3. Equipes — entram pendentes e só aparecem na busca depois de aprovadas
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 60),
  slug text not null unique,
  city text not null default '',
  master text not null default '',
  created_by uuid not null references auth.users on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'recusada')),
  motivo_recusa text not null default '',
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;

create index if not exists teams_status_idx on public.teams (status);
create index if not exists teams_created_by_idx on public.teams (created_by);

-- Sem depender da extensão unaccent (nem sempre disponível): troca manual.
create or replace function public.unaccent_simples(txt text) returns text
  language sql immutable set search_path = pg_catalog as $$
  select translate(
    txt,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

-- Normaliza o nome para detectar "Bonsai", "bonsai jiu jitsu" e "Bonsai JJ"
-- como a mesma equipe na hora de barrar duplicata.
create or replace function public.gerar_slug(txt text) returns text
  language sql immutable set search_path = public as $$
  select regexp_replace(
           lower(public.unaccent_simples(btrim(txt))),
           '[^a-z0-9]+', '-', 'g'
         );
$$;

create or replace function public.teams_slug_trigger() returns trigger
  language plpgsql set search_path = public as $$
begin
  new.slug := public.gerar_slug(new.name);
  return new;
end $$;

drop trigger if exists teams_slug on public.teams;
create trigger teams_slug before insert or update of name on public.teams
  for each row execute function public.teams_slug_trigger();

-- ---------------------------------------------------------------------------
-- 4. Membros da equipe — o dono aceita quem entra
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  team_id uuid not null references public.teams on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'membro' check (role in ('dono', 'membro')),
  status text not null default 'pendente'
    check (status in ('pendente', 'ativo', 'recusado')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_members enable row level security;

create index if not exists team_members_user_idx on public.team_members (user_id, status);

-- Estas duas existem por um motivo específico: uma política de `team_members`
-- que consultasse `team_members` cairia em recursão infinita de RLS. Como são
-- SECURITY DEFINER, elas leem a tabela por fora da política.
create or replace function public.sou_da_equipe(equipe uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = equipe and user_id = auth.uid() and status = 'ativo'
  );
$$;

create or replace function public.sou_dono_da_equipe(equipe uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = equipe and user_id = auth.uid()
      and role = 'dono' and status = 'ativo'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Parcerias — convite com aceite dos dois lados
-- ---------------------------------------------------------------------------
create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users on delete cascade,
  addressee_id uuid not null references auth.users on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'aceito', 'recusado')),
  created_at timestamptz not null default now(),
  constraint parceria_nao_e_consigo check (requester_id <> addressee_id)
);
alter table public.partnerships enable row level security;

-- Um par de pessoas só pode ter uma parceria, tanto faz quem convidou
create unique index if not exists partnerships_par_idx on public.partnerships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
create index if not exists partnerships_addressee_idx
  on public.partnerships (addressee_id, status);
create index if not exists partnerships_requester_idx
  on public.partnerships (requester_id, status);

-- ---------------------------------------------------------------------------
-- 6. Parceiros dentro de um treino — o placar
-- ---------------------------------------------------------------------------
-- `owner_id` é o dono do treino (repetido aqui de propósito: deixa a RLS
-- resolver sem consultar `trainings` a cada linha).
-- `subs_for`  = finalizações do dono do treino no parceiro
-- `subs_against` = finalizações do parceiro no dono
create table if not exists public.training_partners (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  partner_id uuid references auth.users on delete set null,
  partner_name text not null default '',
  rolls integer not null default 0 check (rolls between 0 and 100),
  subs_for integer not null default 0 check (subs_for between 0 and 100),
  subs_against integer not null default 0 check (subs_against between 0 and 100),
  -- Só conta para os dois depois que o parceiro confirma.
  confirmacao text not null default 'pendente'
    check (confirmacao in ('pendente', 'confirmado', 'contestado', 'nao_se_aplica')),
  created_at timestamptz not null default now(),
  constraint parceiro_identificado check (partner_id is not null or btrim(partner_name) <> ''),
  constraint nao_e_voce_mesmo check (partner_id is null or partner_id <> owner_id)
);
alter table public.training_partners enable row level security;

create index if not exists training_partners_owner_idx
  on public.training_partners (owner_id, partner_id);
create index if not exists training_partners_partner_idx
  on public.training_partners (partner_id, confirmacao);
create index if not exists training_partners_training_idx
  on public.training_partners (training_id);

-- Parceiro não cadastrado não tem quem confirme: já nasce fora da contagem.
create or replace function public.tp_confirmacao_trigger() returns trigger
  language plpgsql set search_path = public as $$
begin
  if new.partner_id is null then
    new.confirmacao := 'nao_se_aplica';
  end if;
  return new;
end $$;

drop trigger if exists tp_confirmacao on public.training_partners;
create trigger tp_confirmacao before insert on public.training_partners
  for each row execute function public.tp_confirmacao_trigger();

-- ===========================================================================
-- POLÍTICAS
-- ===========================================================================

-- Equipes: qualquer pessoa logada enxerga as aprovadas; você enxerga as suas
-- (mesmo pendentes); admin enxerga tudo.
drop policy if exists "ver equipes" on public.teams;
create policy "ver equipes" on public.teams
  for select to authenticated
  using (
    status = 'aprovada'
    or created_by = (select auth.uid())
    or public.sou_admin()
  );

drop policy if exists "pedir equipe" on public.teams;
create policy "pedir equipe" on public.teams
  for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'pendente');

drop policy if exists "admin decide equipe" on public.teams;
create policy "admin decide equipe" on public.teams
  for update to authenticated
  using (public.sou_admin()) with check (public.sou_admin());

-- Membros: você vê os seus vínculos e os membros ativos de equipes onde você
-- está ativo. O dono da equipe vê os pedidos pendentes dela.
drop policy if exists "ver membros" on public.team_members;
create policy "ver membros" on public.team_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (status = 'ativo' and public.sou_da_equipe(team_id))
    or public.sou_dono_da_equipe(team_id)
    or public.sou_admin()
  );

drop policy if exists "pedir entrada" on public.team_members;
create policy "pedir entrada" on public.team_members
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dono decide membro" on public.team_members;
create policy "dono decide membro" on public.team_members
  for update to authenticated
  using (public.sou_dono_da_equipe(team_id))
  with check (public.sou_dono_da_equipe(team_id));

drop policy if exists "sair da equipe" on public.team_members;
create policy "sair da equipe" on public.team_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- Parcerias: só os dois lados enxergam.
drop policy if exists "ver parcerias" on public.partnerships;
create policy "ver parcerias" on public.partnerships
  for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

drop policy if exists "convidar parceiro" on public.partnerships;
create policy "convidar parceiro" on public.partnerships
  for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pendente');

-- Só o convidado responde ao convite (a checagem de quem pode fazer o quê
-- está na função responder_parceria; aqui garantimos o alcance da linha).
drop policy if exists "responder parceria" on public.partnerships;
create policy "responder parceria" on public.partnerships
  for update to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()));

drop policy if exists "desfazer parceria" on public.partnerships;
create policy "desfazer parceria" on public.partnerships
  for delete to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- Registros de treino: o dono manda na linha; o parceiro só lê a sua.
-- A leitura é uma policy só com o OU dentro, de propósito: duas policies
-- permissivas de SELECT fariam o Postgres avaliar as duas a cada linha lida.
drop policy if exists "dono do registro" on public.training_partners;
drop policy if exists "parceiro le o proprio registro" on public.training_partners;

drop policy if exists "ler registro do treino" on public.training_partners;
create policy "ler registro do treino" on public.training_partners
  for select to authenticated
  using (owner_id = (select auth.uid()) or partner_id = (select auth.uid()));

drop policy if exists "dono grava o registro" on public.training_partners;
create policy "dono grava o registro" on public.training_partners
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "dono edita o registro" on public.training_partners;
create policy "dono edita o registro" on public.training_partners
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "dono apaga o registro" on public.training_partners;
create policy "dono apaga o registro" on public.training_partners
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ===========================================================================
-- FUNÇÕES — a única porta pelos dados de outra pessoa
-- ===========================================================================

-- Cartão público: só o que pode ser visto por terceiros.
create or replace function public.cartao_publico(ids uuid[])
  returns table (
    user_id uuid, handle text, nickname text,
    belt text, degrees integer, gym text, photo_url text
  )
  language sql stable security definer set search_path = public as $$
  select p.user_id, p.handle, p.nickname, p.belt, p.degrees, p.gym, p.photo_url
  from public.profiles p
  where p.user_id = any(ids) and p.handle is not null;
$$;

-- Busca por @ exato. De propósito não aceita busca parcial: assim ninguém
-- varre a base de usuários — é preciso já saber o @ da pessoa.
create or replace function public.buscar_por_handle(termo text)
  returns table (
    user_id uuid, handle text, nickname text,
    belt text, degrees integer, gym text, photo_url text
  )
  language sql stable security definer set search_path = public as $$
  select p.user_id, p.handle, p.nickname, p.belt, p.degrees, p.gym, p.photo_url
  from public.profiles p
  where p.handle = lower(btrim(replace(termo, '@', '')))
    and p.user_id <> auth.uid();
$$;

-- Responder convite de parceria (só o convidado, só de pendente).
create or replace function public.responder_parceria(parceria uuid, aceita boolean)
  returns void language plpgsql security definer set search_path = public as $$
begin
  update public.partnerships
  set status = case when aceita then 'aceito' else 'recusado' end
  where id = parceria
    and addressee_id = auth.uid()
    and status = 'pendente';
  if not found then
    raise exception 'Convite não encontrado, já respondido, ou não é seu.';
  end if;
end $$;

-- Confirmar (ou contestar) um registro que alguém fez sobre você.
create or replace function public.responder_registro(registro uuid, concorda boolean)
  returns void language plpgsql security definer set search_path = public as $$
begin
  update public.training_partners
  set confirmacao = case when concorda then 'confirmado' else 'contestado' end
  where id = registro
    and partner_id = auth.uid()
    and confirmacao = 'pendente';
  if not found then
    raise exception 'Registro não encontrado, já respondido, ou não é sobre você.';
  end if;
end $$;

-- Placar consolidado por parceiro. Junta os dois lados: o que você anotou e o
-- que anotaram sobre você (invertendo as finalizações), contando apenas o que
-- foi confirmado pelos dois.
create or replace function public.resumo_parceiros()
  returns table (
    partner_id uuid,
    partner_name text,
    sessoes bigint,
    rolls bigint,
    subs_for bigint,
    subs_against bigint,
    pendentes bigint,
    ultimo_treino date
  )
  language sql stable security definer set search_path = public as $$
  with eu as (select auth.uid() as id),
  linhas as (
    -- registros que EU fiz
    select
      tp.partner_id,
      tp.partner_name,
      tp.training_id,
      tp.rolls, tp.subs_for, tp.subs_against, tp.confirmacao
    from public.training_partners tp, eu
    where tp.owner_id = eu.id
    union all
    -- registros que fizeram SOBRE MIM — o placar vira do avesso
    select
      tp.owner_id as partner_id,
      '' as partner_name,
      tp.training_id,
      tp.rolls, tp.subs_against as subs_for, tp.subs_for as subs_against, tp.confirmacao
    from public.training_partners tp, eu
    where tp.partner_id = eu.id
  )
  select
    l.partner_id,
    coalesce(max(nullif(btrim(l.partner_name), '')), '') as partner_name,
    count(*) filter (where l.confirmacao in ('confirmado', 'nao_se_aplica')) as sessoes,
    coalesce(sum(l.rolls) filter (where l.confirmacao in ('confirmado', 'nao_se_aplica')), 0) as rolls,
    coalesce(sum(l.subs_for) filter (where l.confirmacao in ('confirmado', 'nao_se_aplica')), 0) as subs_for,
    coalesce(sum(l.subs_against) filter (where l.confirmacao in ('confirmado', 'nao_se_aplica')), 0) as subs_against,
    count(*) filter (where l.confirmacao = 'pendente') as pendentes,
    max(t.date) as ultimo_treino
  from linhas l
  join public.trainings t on t.id = l.training_id
  group by l.partner_id
  order by rolls desc, sessoes desc;
$$;

-- Registros que estão esperando a SUA confirmação.
create or replace function public.registros_a_confirmar()
  returns table (
    id uuid, autor_id uuid, autor_handle text, autor_nickname text,
    data date, rolls integer, subs_for integer, subs_against integer
  )
  language sql stable security definer set search_path = public as $$
  select tp.id, tp.owner_id, p.handle, p.nickname,
         t.date, tp.rolls, tp.subs_for, tp.subs_against
  from public.training_partners tp
  join public.trainings t on t.id = tp.training_id
  left join public.profiles p on p.user_id = tp.owner_id
  where tp.partner_id = auth.uid() and tp.confirmacao = 'pendente'
  order by t.date desc;
$$;

-- Membros ativos de uma equipe, em cartão público (só para quem é da equipe).
create or replace function public.membros_da_equipe(equipe uuid)
  returns table (
    user_id uuid, handle text, nickname text,
    belt text, degrees integer, photo_url text, role text, status text
  )
  language sql stable security definer set search_path = public as $$
  select m.user_id, p.handle, p.nickname, p.belt, p.degrees, p.photo_url,
         m.role, m.status
  from public.team_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.team_id = equipe
    and public.sou_da_equipe(equipe)
    and (m.status = 'ativo' or public.sou_dono_da_equipe(equipe))
  order by (m.role = 'dono') desc, p.nickname;
$$;

-- Quem cria uma equipe já entra como dono ativo dela (mesmo antes de aprovada).
create or replace function public.pedir_equipe(nome text, cidade text, mestre text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare
  nova uuid;
  existente uuid;
begin
  select id into existente from public.teams where slug = public.gerar_slug(nome);
  if existente is not null then
    raise exception 'Já existe uma equipe com esse nome.';
  end if;

  insert into public.teams (name, city, master, created_by)
  values (btrim(nome), btrim(cidade), btrim(mestre), auth.uid())
  returning id into nova;

  insert into public.team_members (team_id, user_id, role, status)
  values (nova, auth.uid(), 'dono', 'ativo');

  return nova;
end $$;

-- ===========================================================================
-- PERMISSÕES — nenhuma dessas funções é para visitante anônimo
-- ===========================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'sou_admin()', 'cartao_publico(uuid[])',
    'buscar_por_handle(text)', 'responder_parceria(uuid,boolean)',
    'responder_registro(uuid,boolean)', 'resumo_parceiros()',
    'registros_a_confirmar()', 'membros_da_equipe(uuid)',
    'pedir_equipe(text,text,text)',
    'sou_da_equipe(uuid)', 'sou_dono_da_equipe(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

revoke all on function public.gerar_slug(text) from public, anon;
revoke all on function public.unaccent_simples(text) from public, anon, authenticated;
