-- ============================================================================
-- 021 — Cada um declara só o próprio mestre
-- ============================================================================
-- A migração 019 deixou `linhagem_externa` apontar para outro externo. Parecia
-- resolver o problema certo — a corrente parava cedo demais — mas resolvia
-- pelo caminho errado: permitia UMA pessoa escrever a linhagem INTEIRA
-- sozinha. Eu declarava quem graduou a minha mestra, e quem graduou aquele, e
-- assim por diante, tudo com o meu nome no `criado_por`.
--
-- A regra é: **cada um controla só a própria linha do tempo.** Quem graduou a
-- minha mestra é fato dela, não meu. O app já aplica esse princípio em
-- parceria (aceite dos dois lados) e em registro de rola (confirmação com
-- prazo); a linhagem tinha escapado.
--
-- A consequência é boa, e vale escrever: a corrente para no primeiro elo sem
-- conta, e CRESCE SOZINHA quando essa pessoa entra e declara o mestre dela.
-- Isso transforma a linhagem num artefato coletivo em vez de um texto que
-- alguém escreve — e dá ao mestre um motivo concreto para criar conta.
--
-- O que fica da 019: `linhagem_externa` continua guardando quem não usa o app
-- com nome, academia e faixa, o que é melhor que o `mestre_nome` avulso.
-- Some só a auto-referência.
-- ============================================================================

-- Sai quem só existia por alguém ter declarado pelos outros. Quem é mestre
-- direto de alguém fica: esse vínculo a própria pessoa declarou.
delete from public.linhagem_externa le
where not exists (
  select 1 from public.master_links ml where ml.mestre_externo_id = le.id
);

alter table public.linhagem_externa drop column if exists mestre_externo_id;
alter table public.linhagem_externa drop column if exists mestre_id;

create or replace function public.linhagem_de(p_handle text)
returns table (
  nivel int, handle text, nome text, belt text, graus int,
  foto text, verificado boolean, tem_conta boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  with recursive corrente as (
    select 0 as nivel, p.user_id as id, array[p.user_id] as visitados
    from public.profiles p
    where p.handle = lower(btrim(replace(p_handle, '@', '')))

    union all

    -- Só continua por quem TEM conta: é a única pessoa que pode ter declarado
    -- o próprio mestre.
    select c.nivel + 1, ml.mestre_id, c.visitados || ml.mestre_id
    from corrente c
    join lateral (
      select ml.mestre_id
      from public.master_links ml
      where ml.aluno_id = c.id and ml.mestre_id is not null
      order by ml.principal desc, ml.desde nulls last, ml.created_at
      limit 1
    ) ml on true
    where c.nivel < 20 and not (ml.mestre_id = any(c.visitados))
  ),
  -- O último elo: um mestre sem conta. Aparece com o que se sabe dele e
  -- encerra a corrente, porque só ele poderia dizer quem o graduou.
  folha as (
    select c.nivel + 1 as nivel,
           coalesce(nullif(btrim(le.nome), ''), nullif(btrim(m.mestre_nome), ''), '?') as nome,
           coalesce(le.belt, '') as belt,
           coalesce(le.degrees, 0) as graus
    from corrente c
    join lateral (
      select ml.mestre_nome, ml.mestre_externo_id
      from public.master_links ml
      where ml.aluno_id = c.id and ml.mestre_id is null
        and (ml.mestre_externo_id is not null or btrim(ml.mestre_nome) <> '')
      order by ml.principal desc, ml.desde nulls last, ml.created_at
      limit 1
    ) m on true
    left join public.linhagem_externa le on le.id = m.mestre_externo_id
    where not exists (select 1 from corrente d where d.nivel = c.nivel + 1)
  )
  select c.nivel, coalesce(p.handle, ''), coalesce(p.nickname, p.handle, '?'),
         coalesce(p.belt, ''), coalesce(p.degrees, 0), coalesce(p.photo_url, ''),
         coalesce(public.e_mestre_verificado(c.id), false), true
  from corrente c
  join public.profiles p on p.user_id = c.id

  union all
  select f.nivel, '', f.nome, f.belt, f.graus, '', false, false from folha f

  order by 1;
$$;

revoke execute on function public.linhagem_de(text) from public, anon;
grant execute on function public.linhagem_de(text) to authenticated;
