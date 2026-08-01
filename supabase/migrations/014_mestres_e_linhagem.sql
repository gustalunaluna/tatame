-- ============================================================================
-- 014 — Ler os mestres de alguém e subir a linhagem
-- ============================================================================
-- Duas leituras diferentes da mesma tabela:
--
--   mestres_de('joao')  — os mestres DELE, todos, lado a lado. É o que o
--                         perfil mostra: quem o iniciou, quem o graduou.
--   linhagem_de('joao') — a CORRENTE para trás, um por nível, seguindo sempre
--                         o mestre principal. É a identidade do praticante:
--                         "sou do Rickson, que é do Hélio, que é do Carlos,
--                         que é do Maeda".
-- ============================================================================

/* --- os mestres de alguém ------------------------------------------------ */
create or replace function public.mestres_de(p_handle text)
returns table (
  id uuid, papel text, principal boolean, desde date, ate date, nota text,
  mestre_handle text, mestre_nome text, mestre_belt text, mestre_graus int,
  mestre_foto text, mestre_verificado boolean,
  team_slug text, team_nome text,
  sou_dono boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  select v.id, v.papel, v.principal, v.desde, v.ate, v.nota,
         coalesce(mp.handle, ''),
         -- O nome digitado só vale quando não há conta: se o mestre está no
         -- app, quem manda é o perfil dele, que ele mesmo mantém.
         coalesce(nullif(btrim(v.mestre_nome), ''), mp.nickname, mp.handle, ''),
         coalesce(mp.belt, ''), coalesce(mp.degrees, 0),
         coalesce(mp.photo_url, ''),
         coalesce(public.e_mestre_verificado(v.mestre_id), false),
         coalesce(t.slug, ''), coalesce(t.name, ''),
         v.aluno_id = auth.uid()
  from public.master_links v
  join public.profiles p on p.user_id = v.aluno_id
  left join public.profiles mp on mp.user_id = v.mestre_id
  left join public.teams t on t.id = v.team_id
  where p.handle = lower(btrim(replace(p_handle, '@', '')))
  order by v.principal desc, v.desde nulls last, v.created_at;
$$;

/* --- a linhagem, subindo pelo mestre principal --------------------------- */
create or replace function public.linhagem_de(p_handle text)
returns table (
  nivel int, handle text, nome text, belt text, graus int,
  foto text, verificado boolean, tem_conta boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  with recursive inicio as (
    select p.user_id, p.handle, p.nickname, p.belt, coalesce(p.degrees,0) as degrees,
           coalesce(p.photo_url,'') as photo_url
    from public.profiles p
    where p.handle = lower(btrim(replace(p_handle, '@', '')))
  ),
  corrente as (
    select 0 as nivel, i.user_id, i.handle, i.nickname as nome, i.belt,
           i.degrees, i.photo_url, true as tem_conta,
           array[i.user_id] as visitados
    from inicio i

    union all

    select c.nivel + 1,
           v.mestre_id,
           coalesce(mp.handle, ''),
           coalesce(nullif(btrim(v.mestre_nome), ''), mp.nickname, mp.handle, '?'),
           coalesce(mp.belt, ''), coalesce(mp.degrees, 0),
           coalesce(mp.photo_url, ''),
           v.mestre_id is not null,
           c.visitados || coalesce(v.mestre_id, '00000000-0000-0000-0000-000000000000'::uuid)
    from corrente c
    -- Um mestre por nível: o principal. Sem o `limit 1`, quem tem três
    -- mestres cadastrados vira três ramos e a linhagem deixa de ser corrente.
    join lateral (
      select * from public.master_links ml
      where ml.aluno_id = c.user_id
      order by ml.principal desc, ml.desde nulls last, ml.created_at
      limit 1
    ) v on true
    left join public.profiles mp on mp.user_id = v.mestre_id
    -- Duas travas. `visitados` corta ciclo (A é mestre de B que é mestre de A,
    -- cadastro errado que trava o banco); `nivel < 20` corta o resto. Uma
    -- linhagem real de jiu-jitsu tem 5 ou 6 níveis até o Maeda.
    where c.nivel < 20
      and (v.mestre_id is null or not (v.mestre_id = any(c.visitados)))
  )
  select nivel, handle, nome, belt, degrees, photo_url,
         coalesce(public.e_mestre_verificado(user_id), false), tem_conta
  from corrente
  order by nivel;
$$;

-- Nenhuma das duas é aberta a visitante não logado.
revoke execute on function public.mestres_de(text) from public, anon;
revoke execute on function public.linhagem_de(text) from public, anon;
grant execute on function public.mestres_de(text) to authenticated;
grant execute on function public.linhagem_de(text) to authenticated;
