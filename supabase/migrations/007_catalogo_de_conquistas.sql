-- 007 — O catálogo de conquistas vira tabela própria.
--
-- Descoberto ao testar a 006: as 1006 conquistas existiam como 1006 linhas de
-- UM usuário, criadas por um seed avulso (`supabase/seed/006_backfill_historico`).
-- `ensureSeeded` nunca inseriu conquista nenhuma. Ou seja: toda conta criada
-- pelo app abria a tela de Conquistas com 0 de 0. Passou despercebido porque a
-- única conta com dados era justamente a que tinha rodado o seed.
--
-- Agora a definição mora em `achievement_catalog` (uma linha por conquista) e
-- cada usuário recebe uma cópia do próprio estado na primeira abertura.
--
-- Idempotente.

create table if not exists public.achievement_catalog (
  key         text primary key,
  title       text not null,
  description text not null default '',
  tier        text not null,
  category    text not null,
  sort_order  integer not null default 0,
  target      integer
);

-- A definição de origem são as linhas que já existem. Pega a primeira ocorrência
-- de cada chave — todas as cópias por usuário são idênticas no que é catálogo.
insert into public.achievement_catalog (key, title, description, tier, category, sort_order, target)
select distinct on (a.key)
       a.key, a.title, coalesce(a.description, ''), a.tier, a.category,
       coalesce(a.sort_order, 0), a.target
from public.achievements a
order by a.key, a.created_at
on conflict (key) do nothing;

alter table public.achievement_catalog enable row level security;

drop policy if exists "catalogo é público para quem está logado" on public.achievement_catalog;
create policy "catalogo é público para quem está logado"
  on public.achievement_catalog for select to authenticated using (true);

-- Dá ao usuário as conquistas que faltam. Só insere o que não existe, então
-- rodar de novo não duplica nem apaga progresso.
create or replace function public.semear_conquistas()
  returns integer
  language plpgsql security definer set search_path = public as $$
declare
  eu uuid := auth.uid();
  criadas integer;
begin
  if eu is null then
    raise exception 'Sem sessão';
  end if;

  insert into public.achievements
    (user_id, key, title, description, tier, category, sort_order, target,
     unlocked, progress)
  select eu, c.key, c.title, c.description, c.tier, c.category, c.sort_order,
         c.target, false, 0
  from public.achievement_catalog c
  where not exists (
    select 1 from public.achievements a where a.user_id = eu and a.key = c.key
  );

  get diagnostics criadas = row_count;
  return criadas;
end $$;

revoke all on function public.semear_conquistas() from public;
grant execute on function public.semear_conquistas() to authenticated;
