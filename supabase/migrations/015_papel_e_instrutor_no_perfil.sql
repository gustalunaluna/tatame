-- ============================================================================
-- 015 — O perfil público passa a dizer o papel e a contagem de mestres
-- ============================================================================
-- Três colunas novas em `perfil_publico`:
--
--   papel     — o cargo da pessoa na academia dela ('dono', 'professor',
--               'instrutor', 'monitor', 'membro'). Sem isso a tela não tem
--               como escrever "Professor" em vez de "Aluno", e todo mundo
--               aparecia igual.
--   instrutor — a declaração própria, permitida da roxa em diante.
--   mestres   — quantos vínculos de mestre a pessoa tem. A caixa do perfil
--               mostra o principal e precisa saber se há mais para oferecer
--               "ver a linhagem".
--
-- A coluna de texto `master` continua existindo e continua sendo lida: é o
-- que quem cadastrou o mestre à mão antes de existir `master_links` tem
-- guardado, e apagar isso perderia dado de gente de verdade.
-- ============================================================================

drop function if exists public.perfil_publico(text);

create or replace function public.perfil_publico(p_handle text)
returns table (
  user_id uuid, handle text, nickname text, bio text,
  belt text, degrees int, photo_url text, verificado boolean,
  idade int, gym text, master text,
  team_id uuid, team_name text, team_crest text, team_status text, team_slug text,
  master_handle text, master_nickname text,
  fights_won int, fights_lost int,
  treinos bigint, parceiros bigint,
  conquistas_total bigint, conquistas_feitas bigint,
  sou_eu boolean, e_meu_parceiro boolean,
  papel text, instrutor boolean, mestres bigint
)
language sql stable security definer
set search_path to 'public'
as $$
  with alvo as (
    select p.* from public.profiles p
    where p.handle = lower(btrim(replace(p_handle, '@', '')))
  ),
  vinculo as (
    select tm.team_id, tm.role
    from alvo a
    join public.team_members tm on tm.user_id = a.user_id and tm.status = 'ativo'
    join public.teams t on t.id = tm.team_id and t.status = 'aprovada'
    limit 1
  ),
  equipe as (
    select t.* from vinculo v join public.teams t on t.id = v.team_id
  ),
  mestre as (
    select p.handle, p.nickname
    from equipe e
    join public.team_members m on m.team_id = e.id and m.status = 'ativo'
         and m.role in ('dono','mestre','professor')
    join public.profiles p on p.user_id = m.user_id
    where p.handle is not null and p.user_id <> (select user_id from alvo)
    order by (m.role = 'dono') desc, (m.role = 'mestre') desc
    limit 1
  )
  select
    a.user_id, a.handle, a.nickname, a.bio,
    a.belt, a.degrees, a.photo_url,
    public.e_mestre_verificado(a.user_id),
    case when a.birth_date is null then null
         else extract(year from age(a.birth_date))::int end,
    a.gym, a.master,
    e.id, e.name, e.crest_url, e.status, e.slug,
    (select handle from mestre), (select nickname from mestre),
    a.fights_won, a.fights_lost,
    (select count(*) from public.trainings tr where tr.user_id = a.user_id),
    (select count(*) from public.partnerships pa
      where pa.status = 'aceito'
        and (pa.requester_id = a.user_id or pa.addressee_id = a.user_id)),
    (select count(*) from public.achievements ac where ac.user_id = a.user_id),
    (select count(*) from public.achievements ac
      where ac.user_id = a.user_id and ac.unlocked),
    a.user_id = auth.uid(),
    public.sao_parceiros(a.user_id, auth.uid()),
    coalesce((select role from vinculo), ''),
    coalesce(a.instrutor, false),
    (select count(*) from public.master_links ml where ml.aluno_id = a.user_id)
  from alvo a
  left join equipe e on true;
$$;

revoke execute on function public.perfil_publico(text) from public, anon;
grant execute on function public.perfil_publico(text) to authenticated;
