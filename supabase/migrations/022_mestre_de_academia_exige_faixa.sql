-- ============================================================================
-- 022 — Ser dono do cadastro não faz de ninguém mestre da academia
-- ============================================================================
-- `team_members.role = 'dono'` quer dizer duas coisas ao mesmo tempo: quem
-- ADMINISTRA o cadastro e quem É O MESTRE da casa. Elas quase sempre coincidem
-- — e não coincidem justamente no caso mais comum do começo: um aluno cadastra
-- a academia onde treina.
--
-- Resultado concreto, encontrado no perfil real do dono do app: um faixa-branca
-- que cadastrou a própria academia era lido como mestre dela, ganhava a caixa
-- "Alunos" no perfil, e apareceria como MESTRE de qualquer pessoa que entrasse
-- naquela equipe.
--
-- A regra do esporte resolve sem campo novo: quem gradua é faixa-preta.
-- Administrar o cadastro continua sendo do dono; ser LIDO como mestre exige a
-- faixa.
--
-- Junto, `perfil_publico` passa a preferir o mestre que a própria pessoa
-- declarou em `master_links` sobre o que ele deduzia da academia — o declarado
-- é fato, o deduzido é palpite.
-- ============================================================================

create or replace function public.resumo_de_mestre(p_handle text)
returns table (e_mestre boolean, alunos bigint, equipes bigint)
language sql stable security definer
set search_path to 'public'
as $$
  with alvo as (
    select user_id, belt from public.profiles
    where handle = lower(btrim(replace(p_handle, '@', '')))
  ),
  comanda as (
    select t.id
    from public.team_members m
    join alvo a on a.user_id = m.user_id
    join public.teams t on t.id = m.team_id and t.status = 'aprovada'
    where m.status = 'ativo'
      and m.role in ('dono', 'mestre', 'professor')
      and a.belt in ('Preta', 'Coral', 'Vermelha')
  )
  select
    exists (select 1 from comanda),
    (select count(distinct m.user_id)
       from public.team_members m
       where m.team_id in (select id from comanda)
         and m.status = 'ativo' and m.role = 'membro'
         and m.user_id <> (select user_id from alvo)),
    (select count(*) from comanda);
$$;

revoke execute on function public.resumo_de_mestre(text) from public, anon;
grant execute on function public.resumo_de_mestre(text) to authenticated;
