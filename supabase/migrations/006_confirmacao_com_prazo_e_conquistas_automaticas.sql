-- 006 — Duas coisas que estavam paradas: a confirmação e as conquistas.
--
-- (A) CONFIRMAÇÃO COM PRAZO
--     Hoje um registro nasce 'pendente' e morre 'pendente'. Eram 60 de 106.
--     Ninguém vai abrir o app para confirmar que rolou com o Zé na terça.
--     A regra passa a ser: quem não contestou em 7 dias, concordou. Isso não
--     mexe na coluna — o silêncio é lido como aceite na hora da leitura, o que
--     dispensa agendador e não perde a informação de que ninguém respondeu.
--     Contestar continua valendo para sempre: 'contestado' nunca conta.
--
-- (B) CONQUISTAS AUTOMÁTICAS
--     1006 conquistas, 98 abertas — todas na mão. As de técnica dependem de
--     dados que o app não registra (qual finalização foi aplicada em qual
--     rola), e essas seguem manuais, honestamente. Mas frequência, volume,
--     sequência, parceiros por faixa, estudo e graduação saem inteiras dos
--     dados que já estão no banco. `recalcular_conquistas()` faz essa conta.
--
-- Idempotente.

-- ---------------------------------------------------------------------------
-- A. O silêncio vira aceite depois de 7 dias
-- ---------------------------------------------------------------------------

-- Quantos dias o parceiro ainda tem para contestar. Fora da janela, ou já
-- respondido, devolve 0.
create or replace function public.dias_para_contestar(
  p_confirmacao text,
  p_criado_em timestamptz
) returns integer
  language sql stable set search_path = pg_catalog as $$
  select case
    when p_confirmacao <> 'pendente' then 0
    else greatest(0, 7 - floor(extract(epoch from (now() - p_criado_em)) / 86400)::int)
  end;
$$;

-- O registro conta para o placar? Confirmado e 'não se aplica' sempre contam.
-- Pendente conta depois de 7 dias. Contestado nunca conta.
create or replace function public.tp_vale(
  p_confirmacao text,
  p_criado_em timestamptz
) returns boolean
  language sql stable set search_path = pg_catalog as $$
  select p_confirmacao in ('confirmado', 'nao_se_aplica')
      or (p_confirmacao = 'pendente' and p_criado_em < now() - interval '7 days');
$$;

revoke all on function public.dias_para_contestar(text, timestamptz) from public;
revoke all on function public.tp_vale(text, timestamptz) from public;
grant execute on function public.dias_para_contestar(text, timestamptz) to authenticated;
grant execute on function public.tp_vale(text, timestamptz) to authenticated;

-- O placar por parceiro passa a respeitar o prazo. `pendentes` agora conta só
-- o que ainda está dentro da janela — o resto já virou placar.
create or replace function public.resumo_parceiros()
  returns table (
    partner_id uuid,
    partner_name text,
    sessoes bigint,
    rolls bigint,
    subs_for bigint,
    subs_against bigint,
    pendentes bigint,
    ultimo_treino date
  )
  language sql stable security definer set search_path = public as $$
  with eu as (select auth.uid() as id),
  linhas as (
    select tp.partner_id, tp.partner_name, tp.training_id,
           tp.rolls, tp.subs_for, tp.subs_against, tp.confirmacao, tp.created_at
    from public.training_partners tp, eu
    where tp.owner_id = eu.id
    union all
    select tp.owner_id, '', tp.training_id,
           tp.rolls, tp.subs_against, tp.subs_for, tp.confirmacao, tp.created_at
    from public.training_partners tp, eu
    where tp.partner_id = eu.id
  ),
  vale as (
    select l.*, public.tp_vale(l.confirmacao, l.created_at) as conta
    from linhas l
  )
  select
    v.partner_id,
    coalesce(max(nullif(btrim(v.partner_name), '')), '') as partner_name,
    count(*) filter (where v.conta) as sessoes,
    coalesce(sum(v.rolls) filter (where v.conta), 0) as rolls,
    coalesce(sum(v.subs_for) filter (where v.conta), 0) as subs_for,
    coalesce(sum(v.subs_against) filter (where v.conta), 0) as subs_against,
    count(*) filter (where v.confirmacao = 'pendente' and not v.conta) as pendentes,
    max(t.date) as ultimo_treino
  from vale v
  join public.trainings t on t.id = v.training_id
  group by v.partner_id
  order by rolls desc, sessoes desc;
$$;

-- A fila de confirmação some sozinha: passados os 7 dias o registro não pede
-- mais nada. Enquanto está na fila, o app agora sabe dizer quanto falta.
drop function if exists public.registros_a_confirmar();
create function public.registros_a_confirmar()
  returns table (
    id uuid, autor_id uuid, autor_handle text, autor_nickname text,
    data date, rolls integer, subs_for integer, subs_against integer,
    dias_restantes integer
  )
  language sql stable security definer set search_path = public as $$
  select tp.id, tp.owner_id, p.handle, p.nickname,
         t.date, tp.rolls, tp.subs_for, tp.subs_against,
         public.dias_para_contestar(tp.confirmacao, tp.created_at)
  from public.training_partners tp
  join public.trainings t on t.id = tp.training_id
  left join public.profiles p on p.user_id = tp.owner_id
  where tp.partner_id = auth.uid()
    and tp.confirmacao = 'pendente'
    and tp.created_at >= now() - interval '7 days'
  order by tp.created_at asc;
$$;

-- ---------------------------------------------------------------------------
-- B. Conquistas que se desbloqueiam sozinhas
-- ---------------------------------------------------------------------------
--
-- O desenho: em vez de listar 400 chaves à mão, cada família de conquista tem
-- um padrão de chave com o número embutido (`vol_train_50`, `hours_100`,
-- `partner_black_25`). A função calcula UMA métrica por família e casa com
-- todas as chaves da família de uma vez, lendo o alvo da própria linha.
--
-- Conquista aberta na mão nunca fecha de volta: quem marcou "Armlock!" porque
-- pegou um armlock não perde isso porque a função não sabe medir armlock.

create or replace function public.recalcular_conquistas()
  returns integer
  language plpgsql security definer set search_path = public as $$
declare
  eu uuid := auth.uid();
  novas integer := 0;
  parciais integer := 0;
begin
  if eu is null then
    raise exception 'Sem sessão';
  end if;

  drop table if exists _metricas;
  create temp table _metricas (familia text primary key, valor numeric);

  -- ---- Métricas de treino ------------------------------------------------
  with t as (select * from public.trainings where user_id = eu),
  dias as (select date, count(*) as sessoes, coalesce(sum(rolls), 0) as rolls
           from t group by date),
  -- ilhas de dias consecutivos: data menos a posição na fila é constante
  -- dentro de uma sequência sem buraco
  ilhas as (
    select date - (row_number() over (order by date))::int as grupo from dias
  ),
  semanas as (select distinct date_trunc('week', date)::date as semana from t),
  ilhas_semana as (
    select semana - ((row_number() over (order by semana)) * 7)::int as grupo
    from semanas
  )
  insert into _metricas (familia, valor)
            select 'treinos',      (select count(*) from t)
  union all select 'horas',        (select coalesce(sum(duration_min), 0) / 60.0 from t)
  union all select 'rolas',        (select coalesce(sum(rolls), 0) from t)
  union all select 'gi',           (select count(*) from t where type = 'Gi')
  union all select 'nogi',         (select count(*) from t where type = 'No-Gi')
  union all select 'meses',        (select count(distinct date_trunc('month', date)) from t)
  union all select 'duplos',       (select count(*) from dias where sessoes >= 2)
  union all select 'rolas_no_dia', (select coalesce(max(rolls), 0) from dias)
  union all select 'seq_dias',
    (select coalesce(max(c), 0) from (select count(*) c from ilhas group by grupo) x)
  union all select 'seq_semanas',
    (select coalesce(max(c), 0) from (select count(*) c from ilhas_semana group by grupo) x)
  union all select 'tecnicas_dominadas',
    (select count(*) from public.techniques where user_id = eu and mastery >= 4)
  union all select 'videos',
    (select count(*) from public.techniques
     where user_id = eu and coalesce(btrim(video_url), '') <> '')
  union all select 'analises',
    (select count(*) from public.analyses where user_id = eu)
  union all select 'parceiros_distintos',
    (select count(distinct coalesce(tp.partner_id::text, lower(btrim(tp.partner_name))))
     from public.training_partners tp
     where tp.owner_id = eu and public.tp_vale(tp.confirmacao, tp.created_at));

  -- ---- Parceiros por faixa ----------------------------------------------
  insert into _metricas (familia, valor)
  select 'parceiro_' || lower(f.cor),
         (select count(distinct coalesce(tp.partner_id::text, lower(btrim(tp.partner_name))))
          from public.training_partners tp
          where tp.owner_id = eu
            and tp.partner_belt = f.cor
            and public.tp_vale(tp.confirmacao, tp.created_at))
  from (values ('Branca'), ('Azul'), ('Roxa'), ('Marrom'), ('Preta'), ('Coral')) f(cor);

  -- pretas diferentes num mesmo dia
  insert into _metricas (familia, valor)
  select 'pretas_no_dia', coalesce(max(q), 0) from (
    select count(distinct coalesce(tp.partner_id::text, lower(btrim(tp.partner_name)))) as q
    from public.training_partners tp
    join public.trainings t on t.id = tp.training_id
    where tp.owner_id = eu and tp.partner_belt = 'Preta'
      and public.tp_vale(tp.confirmacao, tp.created_at)
    group by t.date
  ) x;

  -- ---- Contadores: a chave carrega o alvo -------------------------------
  with padroes(familia, padrao) as (values
    ('treinos',             '^(vol_train|logs)_[0-9]+$'),
    ('horas',               '^hours_[0-9]+$'),
    ('rolas',               '^(rolls_total|spar)_[0-9]+$'),
    ('gi',                  '^vol_gi_[0-9]+$'),
    ('nogi',                '^vol_nogi_[0-9]+$'),
    ('meses',               '^months_active_[0-9]+$'),
    ('duplos',              '^twoaday_[0-9]+$'),
    ('rolas_no_dia',        '^rollsday_[0-9]+$'),
    ('seq_dias',            '^(streak_days_|streak_)[0-9]+$'),
    ('seq_semanas',         '^streak_weeks_[0-9]+$'),
    ('tecnicas_dominadas',  '^study_mastery_[0-9]+$'),
    ('videos',              '^videos_[0-9]+$'),
    ('analises',            '^analyses_[0-9]+$'),
    ('parceiros_distintos', '^partners_div_[0-9]+$'),
    ('parceiro_branca',     '^partner_white_[0-9]+$'),
    ('parceiro_azul',       '^partner_blue_[0-9]+$'),
    ('parceiro_roxa',       '^partner_purple_[0-9]+$'),
    ('parceiro_marrom',     '^partner_brown_[0-9]+$'),
    ('parceiro_preta',      '^partner_black_[0-9]+$'),
    ('parceiro_coral',      '^partner_coral_[0-9]+$'),
    ('pretas_no_dia',       '^blacks_sameday_[0-9]+$')
  ),
  alvo as (
    -- `estava` guarda o estado ANTES do update: RETURNING enxerga a linha nova,
    -- então quem tem que lembrar do passado é a origem do join.
    select a.id, a.target, m.valor, a.unlocked as estava,
           least(m.valor, a.target)::int as novo_progresso
    from public.achievements a
    join padroes p on a.key ~ p.padrao
    join _metricas m on m.familia = p.familia
    where a.user_id = eu and a.target is not null
  ),
  mexidas as (
    update public.achievements a
    set progress = alvo.novo_progresso,
        unlocked = a.unlocked or alvo.valor >= alvo.target,
        unlocked_date = case
          when a.unlocked then a.unlocked_date
          when alvo.valor >= alvo.target then current_date
          else a.unlocked_date
        end
    from alvo
    where a.id = alvo.id
      and (a.progress is distinct from alvo.novo_progresso
           or (not a.unlocked and alvo.valor >= alvo.target))
    returning (not alvo.estava and alvo.valor >= alvo.target) as abriu
  )
  select count(*) filter (where abriu) into novas from mexidas;

  -- ---- Marcos de sim/não -------------------------------------------------
  with m as (select familia, valor from _metricas),
  marcos(chave, atingido) as (
             select 'first_log',     (select valor from m where familia='treinos') >= 1
    union all select 'first_roll',    (select valor from m where familia='rolas') >= 1
    union all select 'first_week',    (select valor from m where familia='seq_dias') >= 7
    union all select 'month_streak',  (select valor from m where familia='seq_dias') >= 30
    union all select 'two_a_day',     (select valor from m where familia='duplos') >= 1
    union all select 'two_blacks',    (select valor from m where familia='pretas_no_dia') >= 2
    union all select 'train_white',   (select valor from m where familia='parceiro_branca') >= 1
    union all select 'train_blue',    (select valor from m where familia='parceiro_azul') >= 1
    union all select 'train_purple',  (select valor from m where familia='parceiro_roxa') >= 1
    union all select 'train_brown',   (select valor from m where familia='parceiro_marrom') >= 1
    union all select 'train_black',   (select valor from m where familia='parceiro_preta') >= 1
    union all select 'partner_coral', (select valor from m where familia='parceiro_coral') >= 1
  ),
  mexidas as (
    update public.achievements a
    set unlocked = true, unlocked_date = coalesce(a.unlocked_date, current_date)
    from marcos k
    where a.user_id = eu and a.key = k.chave and k.atingido and not a.unlocked
    returning 1
  )
  select count(*) into parciais from mexidas;
  novas := novas + parciais;

  -- ---- Graduação: a faixa do perfil abre a escada até ela ---------------
  -- As chaves não seguem um padrão só (a branca tem `grad_branca4` sem
  -- underscore, a preta continua em coral e vermelha), então vale a pena
  -- listar. Cada chave sabe em que degrau da escada ela fica.
  with escada(chave, pos, grau) as (values
    ('grad_branca_1', 1, 1), ('grad_branca_2', 1, 2), ('grad_branca_3', 1, 3),
    ('grad_branca4',  1, 4),
    ('grad_azul',     2, 0), ('grad_azul_1',   2, 1), ('grad_azul_2',   2, 2),
    ('grad_azul_3',   2, 3), ('grad_azul_4',   2, 4),
    ('grad_roxa',     3, 0), ('grad_roxa_1',   3, 1), ('grad_roxa_2',   3, 2),
    ('grad_roxa_3',   3, 3), ('grad_roxa_4',   3, 4),
    ('grad_marrom',   4, 0), ('grad_marrom_1', 4, 1), ('grad_marrom_2', 4, 2),
    ('grad_marrom_3', 4, 3), ('grad_marrom_4', 4, 4),
    ('grad_preta',    5, 0), ('grad_preta_1',  5, 1), ('grad_preta_2',  5, 2),
    ('grad_preta_3',  5, 3), ('grad_preta_4',  5, 4), ('grad_preta_5',  5, 5),
    ('grad_preta_6',  5, 6),
    ('grad_coral_7',  6, 7), ('grad_coral_8',  6, 8),
    ('grad_vermelha_9', 7, 9), ('grad_vermelha_10', 7, 10)
  ),
  atual as (
    select coalesce(o.pos, 0) as pos, coalesce(p.degrees, 0) as graus
    from public.profiles p
    left join (values ('Branca',1),('Azul',2),('Roxa',3),('Marrom',4),
                      ('Preta',5),('Coral',6),('Vermelha',7)) o(cor, pos)
      on o.cor = p.belt
    where p.user_id = eu
  ),
  abrir as (
    select e.chave from escada e, atual a
    where e.pos < a.pos or (e.pos = a.pos and e.grau <= a.graus)
  ),
  mexidas as (
    update public.achievements a
    set unlocked = true, unlocked_date = coalesce(a.unlocked_date, current_date)
    from abrir b
    where a.user_id = eu and a.key = b.chave and not a.unlocked
    returning 1
  )
  select count(*) into parciais from mexidas;
  novas := novas + parciais;

  drop table if exists _metricas;
  return novas;
end $$;

revoke all on function public.recalcular_conquistas() from public;
grant execute on function public.recalcular_conquistas() to authenticated;
