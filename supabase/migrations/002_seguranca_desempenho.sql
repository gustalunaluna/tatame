-- 002 — Correções de segurança e desempenho apontadas pelos advisors do Supabase.
-- Idempotente: pode rodar quantas vezes quiser.

-- ---------------------------------------------------------------------------
-- 1. RLS: avaliar auth.uid() UMA vez por consulta, e não uma vez por linha.
--    Em `achievements` (1006 linhas) isso era 1006 chamadas por leitura.
--    Envolver em (select ...) faz o Postgres tratar como InitPlan constante.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','trainings','techniques','plan_weeks','weak_points','analyses','achievements'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'own ' || t, t);
    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id)
    $f$, 'own ' || t, t);
  end loop;
end $$;

-- O nome da policy de profiles era "own profile" (singular) no 001.
drop policy if exists "own profile" on public.profiles;

-- ---------------------------------------------------------------------------
-- 2. Índices nas chaves estrangeiras que ainda não tinham.
--    Sem eles, toda leitura filtrada por user_id era varredura sequencial.
-- ---------------------------------------------------------------------------
create index if not exists trainings_user_date_idx
  on public.trainings (user_id, date desc);
create index if not exists techniques_user_idx
  on public.techniques (user_id);
create index if not exists weak_points_user_idx
  on public.weak_points (user_id);
create index if not exists achievements_user_unlocked_idx
  on public.achievements (user_id, unlocked);

-- ---------------------------------------------------------------------------
-- 3. rls_auto_enable é um event trigger (rede de proteção do template que
--    liga RLS em tabelas novas). Ele roda pelo sistema, não por chamada REST —
--    então expor EXECUTE em /rest/v1/rpc para anon/authenticated só dá
--    superfície de ataque sem dar nada em troca.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- achievement_stats é lida pelo app logado e respeita RLS (security invoker).
revoke all on function public.achievement_stats() from public, anon;
grant execute on function public.achievement_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage: o bucket `avatars` é público, então a URL pública já funciona
--    sem policy de SELECT. A policy antiga liberava LISTAR todos os arquivos
--    do bucket (enumerar as fotos de todo mundo). Restringe para a própria
--    pasta — a leitura por URL continua igual.
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_own_read" on storage.objects;
create policy "avatars_own_read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- As demais policies de storage também ganham o (select auth.uid()).
drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

analyze public.achievements;
analyze public.trainings;
