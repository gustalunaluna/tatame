-- ============================================================================
-- 032 — Ninguém entra na linhagem de outra pessoa sem ela saber
-- ============================================================================
-- Hoje qualquer um declara qualquer um como seu mestre, e o vínculo aparece
-- na hora: no perfil público, na corrente da linhagem e na lista de alunos
-- daquele mestre. A outra pessoa não é avisada, não confirma, e não tem como
-- desfazer.
--
-- No banco agora são 117 vínculos, e 112 deles apontam para uma conta real.
-- São 112 declarações sobre o nome de outra pessoa, nenhuma consentida.
--
-- Em jiu-jitsu isso não é detalhe de privacidade — é a moeda social do
-- esporte. Dizer-se aluno de alguém é reivindicar uma linhagem, e linhagem é
-- exatamente o que o Ponteira se propõe a registrar direito. Um registro que
-- aceita qualquer reivindicação não registra nada.
--
-- O app JÁ resolve isso em outro lugar: parceria de treino nasce 'pendente' e
-- só vale quando o outro lado confirma. Esta migração leva o mesmo desenho
-- para o vínculo de mestre.
--
-- AS REGRAS
--
--   · mestre COM conta  → o vínculo nasce pendente e só ele confirma
--   · mestre SEM conta  → nasce aceito, porque não há a quem perguntar. É o
--                         "mestre de fora" que a migração 023 já tratava, e
--                         continua valendo: quem não está no app não pode
--                         confirmar nem recusar
--   · trocar o mestre de um vínculo já aceito devolve ao pendente
--   · o aluno NUNCA muda a própria situação — é o ponto inteiro
--
-- O QUE ACONTECE COM OS 117 EXISTENTES
--
-- Ficam todos como aceitos. São contas semeadas (`seeded = true` nas 101), ou
-- seja, dado de demonstração e não gente de verdade: exigir confirmação
-- retroativa esvaziaria a linhagem da demo sem proteger ninguém. A regra vale
-- do primeiro vínculo real em diante.
-- ============================================================================

alter table public.master_links
  add column if not exists situacao text not null default 'pendente';

alter table public.master_links
  drop constraint if exists master_links_situacao_valida;
alter table public.master_links
  add constraint master_links_situacao_valida
  check (situacao in ('pendente', 'aceito', 'recusado'));

-- Os que já existiam: ver o cabeçalho. Roda ANTES do gatilho existir, senão
-- ele barra a própria migração por não haver auth.uid() aqui.
update public.master_links set situacao = 'aceito' where situacao <> 'aceito';

comment on column public.master_links.situacao is
  'pendente = o mestre ainda não confirmou; aceito = confirmado, ou mestre sem conta; recusado = o mestre negou. Só aceito aparece em público.';

-- ---------------------------------------------------------------- gatilho --
-- Por que gatilho e não WITH CHECK na política: a regra depende do valor
-- ANTERIOR da linha (mudou a situação? mudou o mestre?), e política de RLS não
-- enxerga o `old`. Escrever isso como política daria uma expressão ilegível
-- que ainda deixaria o aluno se autoconfirmar em algum caminho.
create or replace function public.master_links_guarda_situacao()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Sem JWT é migração ou service role, que já passam por cima da RLS de
  -- qualquer jeito. Barrar aqui só quebraria seed e backfill.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A situação inicial não é escolha do cliente. Mandar 'aceito' no insert
    -- era o jeito óbvio de furar tudo.
    new.situacao := case when new.mestre_id is null then 'aceito' else 'pendente' end;
    return new;
  end if;

  -- Trocar de mestre recomeça a conversa: quem foi apontado agora não
  -- confirmou nada.
  if new.mestre_id is distinct from old.mestre_id then
    new.situacao := case when new.mestre_id is null then 'aceito' else 'pendente' end;
    return new;
  end if;

  if new.situacao is distinct from old.situacao
     and auth.uid() is distinct from old.mestre_id then
    raise exception 'Só o mestre confirma ou recusa o vínculo.';
  end if;

  return new;
end;
$function$;

drop trigger if exists master_links_guarda_situacao on public.master_links;
create trigger master_links_guarda_situacao
  before insert or update on public.master_links
  for each row execute function public.master_links_guarda_situacao();

-- --------------------------------------------------------------- políticas --
-- O aluno já podia editar o próprio vínculo (nota, datas, academia). Falta o
-- mestre poder tocar na linha para responder — o gatilho acima é quem garante
-- que ele só mexe na situação.
drop policy if exists "mestre responde ao vínculo" on public.master_links;
create policy "mestre responde ao vínculo" on public.master_links
  for update to authenticated
  using (mestre_id = (select auth.uid()))
  with check (mestre_id = (select auth.uid()));

-- ------------------------------------------------------- o que fica visível --
-- A corrente da linhagem é pública por natureza: só sobe por vínculo aceito.
create or replace function public.linhagem_de(p_handle text)
 returns table(nivel integer, handle text, nome text, belt text, graus integer, foto text, verificado boolean, tem_conta boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with recursive corrente as (
    select 0 as nivel, p.user_id as id, array[p.user_id] as visitados
    from public.profiles p
    where p.handle = lower(btrim(replace(p_handle, '@', '')))

    union all

    -- So continua por quem TEM conta: e a unica pessoa que pode ter declarado
    -- o proprio mestre. E so por vinculo ACEITO: a corrente e publica, e um
    -- pedido ainda nao respondido nao pode aparecer nela.
    select c.nivel + 1, ml.mestre_id, c.visitados || ml.mestre_id
    from corrente c
    join lateral (
      select ml.mestre_id
      from public.master_links ml
      where ml.aluno_id = c.id and ml.mestre_id is not null
        and ml.situacao = 'aceito'
      order by ml.principal desc, ml.desde nulls last, ml.created_at
      limit 1
    ) ml on true
    where c.nivel < 20 and not (ml.mestre_id = any(c.visitados))
  ),
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
        and ml.situacao = 'aceito'
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
$function$;

-- A lista de mestres de alguém: o público vê os aceitos; o dono vê também os
-- próprios pendentes (para saber que está esperando), e o mestre vê o pedido
-- que chegou para ele.
create or replace function public.mestres_de(p_handle text)
 returns table(id uuid, papel text, principal boolean, desde date, ate date, nota text, mestre_handle text, mestre_nome text, mestre_belt text, mestre_graus integer, mestre_foto text, mestre_verificado boolean, team_slug text, team_nome text, sou_dono boolean, situacao text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select v.id, v.papel, v.principal, v.desde, v.ate, v.nota,
         coalesce(mp.handle, ''),
         coalesce(mp.nickname, mp.handle, nullif(btrim(le.nome), ''),
                  nullif(btrim(v.mestre_nome), ''), ''),
         coalesce(mp.belt, le.belt, ''),
         coalesce(mp.degrees, le.degrees, 0),
         coalesce(mp.photo_url, ''),
         coalesce(public.e_mestre_verificado(v.mestre_id), false),
         coalesce(t.slug, ''),
         coalesce(nullif(t.name, ''), nullif(btrim(le.academia), ''), ''),
         v.aluno_id = auth.uid(),
         v.situacao
  from public.master_links v
  join public.profiles p on p.user_id = v.aluno_id
  left join public.profiles mp on mp.user_id = v.mestre_id
  left join public.linhagem_externa le on le.id = v.mestre_externo_id
  left join public.teams t on t.id = v.team_id
  where p.handle = lower(btrim(replace(p_handle, '@', '')))
    and (v.situacao = 'aceito'
         or v.aluno_id = auth.uid()
         or v.mestre_id = auth.uid())
  order by v.principal desc, v.desde nulls last, v.created_at;
$function$;

-- ------------------------------------------------- a caixa de entrada dele --
create or replace function public.pedidos_de_aluno()
 returns table(id uuid, aluno_handle text, aluno_nome text, aluno_belt text, aluno_graus integer, aluno_foto text, papel text, desde date, pedido_em timestamptz)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select v.id,
         coalesce(a.handle, ''),
         coalesce(a.nickname, a.handle, '?'),
         coalesce(a.belt, ''),
         coalesce(a.degrees, 0),
         coalesce(a.photo_url, ''),
         v.papel, v.desde, v.created_at
  from public.master_links v
  join public.profiles a on a.user_id = v.aluno_id
  where v.mestre_id = auth.uid() and v.situacao = 'pendente'
  order by v.created_at desc;
$function$;

create or replace function public.responder_pedido_de_aluno(p_id uuid, p_aceitar boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update public.master_links
     set situacao = case when p_aceitar then 'aceito' else 'recusado' end
   where id = p_id
     and mestre_id = auth.uid()
     and situacao = 'pendente';

  if not found then
    raise exception 'Pedido não encontrado, ou já respondido.';
  end if;
end;
$function$;

-- ----------------------------------------------------------------- grants --
-- A migração 024 fechou `public` para o papel anônimo, e a 027 mostrou que a
-- trava não vale para função criada depois: cada uma precisa fechar a própria
-- porta. `supabase/invariantes.sql` confere que isto continua verdade.
revoke all on function public.pedidos_de_aluno() from public, anon;
revoke all on function public.responder_pedido_de_aluno(uuid, boolean) from public, anon;
revoke all on function public.master_links_guarda_situacao() from public, anon;
grant execute on function public.pedidos_de_aluno() to authenticated;
grant execute on function public.responder_pedido_de_aluno(uuid, boolean) to authenticated;

-- `mestres_de` mudou de assinatura (ganhou `situacao`), e trocar assinatura
-- exige DROP antes do CREATE. O DROP leva os grants junto: a função renasce
-- com o padrão do Postgres, que é EXECUTE para `public` — e `anon` está
-- dentro de `public`.
--
-- Foi `supabase/invariantes.sql` que pegou isto, minutos depois de aplicar a
-- migração acima. É a segunda vez que essa porta se abre sozinha (a primeira
-- foi na 027) e a segunda vez que ela é fechada por conferência, não por
-- memória de alguém.
revoke all on function public.mestres_de(text) from public, anon;
grant execute on function public.mestres_de(text) to authenticated;
