-- ============================================================================
-- 020 — `linhagem_de` atravessa os dois tipos de elo
-- ============================================================================
-- Um elo da corrente agora pode ser de duas naturezas: alguém com conta
-- (`profiles`) ou alguém de fora (`linhagem_externa`, migração 019). A CTE
-- recursiva carrega `tipo` junto do id e decide por onde continuar.
--
-- Uma armadilha de sintaxe que custou uma tentativa: dentro do LATERAL, o
-- `order by`/`limit` do primeiro ramo valeria para a UNIÃO inteira se os ramos
-- não estivessem entre parênteses — e o Postgres recusa direto.
-- ============================================================================

create or replace function public.linhagem_de(p_handle text)
returns table (
  nivel int, handle text, nome text, belt text, graus int,
  foto text, verificado boolean, tem_conta boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  with recursive corrente as (
    select 0 as nivel, 'conta'::text as tipo, p.user_id as id,
           array[p.user_id] as visitados
    from public.profiles p
    where p.handle = lower(btrim(replace(p_handle, '@', '')))

    union all

    select c.nivel + 1, prox.tipo, prox.id, c.visitados || prox.id
    from corrente c
    join lateral (
      (
        -- Quem TEM conta continua pelo vínculo principal.
        select case when ml.mestre_id is not null then 'conta' else 'externo' end as tipo,
               coalesce(ml.mestre_id, ml.mestre_externo_id) as id
        from public.master_links ml
        where c.tipo = 'conta' and ml.aluno_id = c.id
          and (ml.mestre_id is not null or ml.mestre_externo_id is not null)
        order by ml.principal desc, ml.desde nulls last, ml.created_at
        limit 1
      )
      union all
      (
        -- Quem NÃO tem conta continua pela própria tabela: é isto que faz a
        -- corrente passar de largo por quem nunca vai abrir o app.
        select case when le.mestre_id is not null then 'conta' else 'externo' end,
               coalesce(le.mestre_id, le.mestre_externo_id)
        from public.linhagem_externa le
        where c.tipo = 'externo' and le.id = c.id
          and (le.mestre_id is not null or le.mestre_externo_id is not null)
      )
    ) prox on true
    where c.nivel < 20 and not (prox.id = any(c.visitados))
  ),
  -- O último elo pode ser um mestre só escrito, sem cadastro externo. Ele não
  -- continua a corrente, mas tem que aparecer nela — é o caso do Maeda.
  folha as (
    select c.nivel + 1 as nivel, m.mestre_nome as nome
    from corrente c
    join lateral (
      select ml.mestre_nome
      from public.master_links ml
      where ml.aluno_id = c.id
        and ml.mestre_id is null and ml.mestre_externo_id is null
        and btrim(ml.mestre_nome) <> ''
      order by ml.principal desc, ml.desde nulls last, ml.created_at
      limit 1
    ) m on true
    where c.tipo = 'conta'
      and not exists (select 1 from corrente d where d.nivel = c.nivel + 1)
  )
  select c.nivel,
         case when c.tipo = 'conta' then coalesce(p.handle, '') else '' end,
         case when c.tipo = 'conta'
              then coalesce(p.nickname, p.handle, '?')
              else coalesce(le.nome, '?') end,
         case when c.tipo = 'conta' then coalesce(p.belt, '') else coalesce(le.belt, '') end,
         case when c.tipo = 'conta' then coalesce(p.degrees, 0) else coalesce(le.degrees, 0) end,
         case when c.tipo = 'conta' then coalesce(p.photo_url, '') else '' end,
         c.tipo = 'conta' and coalesce(public.e_mestre_verificado(c.id), false),
         c.tipo = 'conta'
  from corrente c
  left join public.profiles p on c.tipo = 'conta' and p.user_id = c.id
  left join public.linhagem_externa le on c.tipo = 'externo' and le.id = c.id

  union all
  select f.nivel, '', f.nome, '', 0, '', false, false from folha f

  order by 1;
$$;

revoke execute on function public.linhagem_de(text) from public, anon;
grant execute on function public.linhagem_de(text) to authenticated;
