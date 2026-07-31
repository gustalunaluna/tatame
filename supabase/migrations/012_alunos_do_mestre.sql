-- 012 — Os alunos de um mestre.
--
-- O perfil já mostrava "parceiros de rola", que é com quem a pessoa treina.
-- Faltava a outra relação, que num professor é a principal: quem ele gradua.
-- São coisas diferentes e um mestre tem as duas — juntar numa lista só apagaria
-- justamente a distinção que importa no perfil dele.
--
-- COMO SE DEFINE "ALUNO", e por que não é um campo digitado:
-- `perfil_publico` já descobre o mestre de alguém pegando o dono/mestre da
-- equipe ativa dela. Este arquivo lê a mesma relação de trás para frente —
-- alunos são os membros ativos das equipes que a pessoa comanda. Casar
-- `profiles.master` por texto seria tentador e errado: é campo livre, e
-- "Mestre Silva" com dois espaços viraria outra pessoa.
--
-- Idempotente.

create or replace function public.resumo_de_mestre(p_handle text)
  returns table (e_mestre boolean, alunos bigint, equipes bigint)
  language sql stable security definer set search_path = public as $$
  with alvo as (
    select user_id from public.profiles
    where handle = lower(btrim(replace(p_handle, '@', '')))
  ),
  comanda as (
    select t.id
    from public.team_members m
    join alvo a on a.user_id = m.user_id
    join public.teams t on t.id = m.team_id and t.status = 'aprovada'
    where m.status = 'ativo' and m.role in ('dono', 'mestre')
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

create or replace function public.alunos_do_mestre(
  p_handle text,
  p_limite integer default 8,
  p_offset integer default 0
) returns table (
  user_id uuid, handle text, nickname text, belt text, degrees integer,
  photo_url text, verificado boolean, equipe_oficial boolean, team_nome text
)
  language sql stable security definer set search_path = public as $$
  with alvo as (
    select user_id from public.profiles
    where handle = lower(btrim(replace(p_handle, '@', '')))
  ),
  comanda as (
    select t.id, t.name
    from public.team_members m
    join alvo a on a.user_id = m.user_id
    join public.teams t on t.id = m.team_id and t.status = 'aprovada'
    where m.status = 'ativo' and m.role in ('dono', 'mestre')
  ),
  -- o `distinct on` precisa ordenar pela própria chave, então a ordenação de
  -- exibição vem depois, numa camada de fora
  lista as (
    select distinct on (p.user_id)
           p.user_id, p.handle, p.nickname, p.belt, coalesce(p.degrees, 0) as degrees,
           coalesce(p.photo_url, '') as photo_url,
           public.e_mestre_verificado(p.user_id) as verificado,
           true as equipe_oficial,
           c.name as team_nome
    from public.team_members m
    join comanda c on c.id = m.team_id
    join public.profiles p on p.user_id = m.user_id
    where m.status = 'ativo' and m.role = 'membro'
      and p.handle is not null
      and p.user_id <> (select user_id from alvo)
    order by p.user_id
  )
  select * from lista
  -- graduação primeiro: numa academia, é a ordem que as pessoas esperam ver
  order by array_position(
             array['Vermelha','Coral','Preta','Marrom','Roxa','Azul','Branca'], belt),
           degrees desc, nickname
  limit greatest(0, least(p_limite, 200)) offset greatest(0, p_offset);
$$;

revoke all on function public.resumo_de_mestre(text) from public, anon;
revoke all on function public.alunos_do_mestre(text, integer, integer) from public, anon;
grant execute on function public.resumo_de_mestre(text) to authenticated;
grant execute on function public.alunos_do_mestre(text, integer, integer) to authenticated;
