-- 010 — Histórico de graduação.
--
-- O perfil sabia a faixa atual e mais nada. Faltava o que, no jiu-jitsu, é
-- metade da história: quando cada faixa e cada grau vieram, e de quem. Numa
-- arte em que a graduação é dada por uma pessoa e não por uma prova, o nome de
-- quem amarrou a faixa é parte do registro.
--
-- Duas formas de dizer quem entregou:
--   - `mestre_id` aponta para um perfil do app. Aí o nome sai do perfil dele e
--     o selo de faixa preta verificada aparece sozinho, sem ninguém digitar.
--   - `mestre_nome` é texto livre, para quem não tem conta — a maioria dos
--     mestres, hoje.
-- Nunca os dois: quando há perfil, guardar uma cópia do nome criaria duas
-- verdades sobre a mesma pessoa, que divergem no dia em que ele se renomeia.
--
-- A chave única (user_id, belt, degrees) impede registrar duas vezes o mesmo
-- degrau — ninguém recebe o 2º grau da azul duas vezes.
--
-- Idempotente.

create table if not exists public.graduations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  belt       text not null check (belt in ('Branca','Azul','Roxa','Marrom','Preta','Coral','Vermelha')),
  -- 0 = a faixa em si; 1..4 = os graus dela
  degrees    integer not null default 0 check (degrees between 0 and 10),
  data       date not null,
  team_id    uuid references public.teams on delete set null,
  mestre_id  uuid references auth.users on delete set null,
  mestre_nome text not null default '',
  nota       text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, belt, degrees)
);

create index if not exists graduations_user_idx on public.graduations (user_id, data);

alter table public.graduations enable row level security;

-- Graduação é pública pelo mesmo motivo que a faixa é: ela existe para ser
-- vista, e já aparece no perfil de qualquer jeito.
drop policy if exists "graduação é pública para quem está logado" on public.graduations;
create policy "graduação é pública para quem está logado"
  on public.graduations for select to authenticated using (true);

drop policy if exists "dono cadastra a própria graduação" on public.graduations;
create policy "dono cadastra a própria graduação"
  on public.graduations for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dono edita a própria graduação" on public.graduations;
create policy "dono edita a própria graduação"
  on public.graduations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "dono apaga a própria graduação" on public.graduations;
create policy "dono apaga a própria graduação"
  on public.graduations for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.historico_de_graduacao(p_handle text)
  returns table (
    id uuid, belt text, degrees integer, data date, nota text,
    mestre_nome text, mestre_handle text, mestre_verificado boolean,
    team_slug text, team_nome text, team_crest text, sou_dono boolean
  )
  language sql stable security definer set search_path = public as $$
  select g.id, g.belt, g.degrees, g.data, g.nota,
         coalesce(nullif(btrim(g.mestre_nome), ''), mp.nickname, mp.handle, '') as mestre_nome,
         coalesce(mp.handle, ''),
         coalesce(public.e_mestre_verificado(g.mestre_id), false),
         coalesce(e.slug, ''), coalesce(e.name, ''), coalesce(e.crest_url, ''),
         g.user_id = auth.uid()
  from public.graduations g
  join public.profiles p on p.user_id = g.user_id
  left join public.profiles mp on mp.user_id = g.mestre_id
  left join public.teams e on e.id = g.team_id
  where p.handle = lower(btrim(p_handle))
  order by g.data desc, g.created_at desc;
$$;

revoke all on function public.historico_de_graduacao(text) from public;
grant execute on function public.historico_de_graduacao(text) to authenticated;
