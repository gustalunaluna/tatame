-- ============================================================================
-- 023 — O mestre declarado vale mais que o deduzido, e o vínculo externo tem nome
-- ============================================================================
-- Duas funções de leitura ficaram para trás das regras que a 021 e a 022
-- estabeleceram. Nenhuma das duas quebrava a tela — as duas mentiam em silêncio,
-- que é pior.
--
-- 1. `perfil_publico` deduzia o mestre pela academia e nunca olhava para
--    `master_links`. Quem declarou o próprio mestre no app via, no lugar dele, o
--    dono do cadastro da academia. A deducao continua existindo como palpite
--    para quem ainda nao declarou nada, mas agora exige faixa-preta — pela mesma
--    razao da 022 — e perde para a declaracao sempre que houver uma.
--
-- 2. `mestres_de` lia o nome do mestre em duas origens: o perfil de quem tem
--    conta, e o texto avulso de `master_links.mestre_nome`. A 021 criou uma
--    terceira, `mestre_externo_id`, e esta funcao nao a lia — um vinculo criado
--    assim aparecia no perfil e em /meus-mestres com o NOME VAZIO. Passa a ler as
--    tres, nesta ordem: perfil, cadastro externo, texto avulso. A academia e a
--    faixa seguem o mesmo caminho.
-- ============================================================================

create or replace function public.perfil_publico(p_handle text)
returns table (
  user_id uuid, handle text, nickname text, bio text, belt text, degrees integer,
  photo_url text, verificado boolean, idade integer, gym text, master text,
  team_id uuid, team_name text, team_crest text, team_status text, team_slug text,
  master_handle text, master_nickname text, fights_won integer, fights_lost integer,
  treinos bigint, parceiros bigint, conquistas_total bigint, conquistas_feitas bigint,
  sou_eu boolean, e_meu_parceiro boolean, papel text, instrutor boolean, mestres bigint
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
  -- 1. O mestre que a própria pessoa declarou vale mais que qualquer dedução.
  declarado as (
    select mp.handle, mp.nickname
    from public.master_links ml
    join public.profiles mp on mp.user_id = ml.mestre_id
    where ml.aluno_id = (select user_id from alvo)
    order by ml.principal desc, ml.desde nulls last, ml.created_at
    limit 1
  ),
  -- 2. Só se não houver declaração, deduz pela academia — e só faixa-preta.
  deduzido as (
    select p.handle, p.nickname
    from equipe e
    join public.team_members m on m.team_id = e.id and m.status = 'ativo'
         and m.role in ('dono','mestre','professor')
    join public.profiles p on p.user_id = m.user_id
    where p.handle is not null
      and p.user_id <> (select user_id from alvo)
      and p.belt in ('Preta','Coral','Vermelha')
    order by (m.role = 'mestre') desc, (m.role = 'professor') desc
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
    coalesce((select handle from declarado), (select handle from deduzido)),
    coalesce((select nickname from declarado), (select nickname from deduzido)),
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

create or replace function public.mestres_de(p_handle text)
returns table (
  id uuid, papel text, principal boolean, desde date, ate date, nota text,
  mestre_handle text, mestre_nome text, mestre_belt text, mestre_graus integer,
  mestre_foto text, mestre_verificado boolean,
  team_slug text, team_nome text, sou_dono boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  select v.id, v.papel, v.principal, v.desde, v.ate, v.nota,
         coalesce(mp.handle, ''),
         -- Três origens, nesta ordem: o perfil de quem tem conta (ele mantém o
         -- próprio nome), o cadastro externo, e por último o texto avulso.
         coalesce(mp.nickname, mp.handle, nullif(btrim(le.nome), ''),
                  nullif(btrim(v.mestre_nome), ''), ''),
         coalesce(mp.belt, le.belt, ''),
         coalesce(mp.degrees, le.degrees, 0),
         coalesce(mp.photo_url, ''),
         coalesce(public.e_mestre_verificado(v.mestre_id), false),
         coalesce(t.slug, ''),
         -- A academia do vínculo; se não houver, a que o cadastro externo diz.
         coalesce(nullif(t.name, ''), nullif(btrim(le.academia), ''), ''),
         v.aluno_id = auth.uid()
  from public.master_links v
  join public.profiles p on p.user_id = v.aluno_id
  left join public.profiles mp on mp.user_id = v.mestre_id
  left join public.linhagem_externa le on le.id = v.mestre_externo_id
  left join public.teams t on t.id = v.team_id
  where p.handle = lower(btrim(replace(p_handle, '@', '')))
  order by v.principal desc, v.desde nulls last, v.created_at;
$$;

revoke execute on function public.mestres_de(text) from public, anon;
grant execute on function public.mestres_de(text) to authenticated;

-- ----------------------------------------------------------------------------
-- O texto legado, onde ele virou duplicata
-- ----------------------------------------------------------------------------
-- `profiles.master` é de antes de existir `master_links`. Quem declarou o mestre
-- pelo app passou a ter as duas coisas — e escritas à mão, elas divergem: um
-- perfil real guardava "Emy lopes " (com espaço no fim) ao lado do vínculo para
-- "Emy Lopes". O perfil mostrava os dois, como se fossem duas pessoas.
--
-- Onde existe vínculo, o vínculo manda; o texto sai.
update public.profiles p
set master = null
where nullif(btrim(coalesce(p.master, '')), '') is not null
  and exists (select 1 from public.master_links ml where ml.aluno_id = p.user_id);
