-- ============================================================================
-- 043 — Dia parado não é treino (e não quebra a corrente)
-- ============================================================================
-- `recalcular_conquistas` contava TODA linha de `trainings` como treino. Só
-- que nem toda linha é treino: as de `duration_min = 0` existem para registrar
-- dia parado por doença ou lesão, e uma linha de aula assistida da arquibancada
-- registra presença, não tatame.
--
-- O estrago era silencioso e para MAIS, que é o pior lado para um app de
-- treino errar. No dia em que isto foi escrito, para o único usuário real:
--
--     o banco dizia      162 treinos e 165 horas
--     a verdade era      159 treinos e 164 horas
--
-- E como a função roda a cada treino salvo, corrigir o número na mão não
-- adiantava: o gatilho desfazia na gravação seguinte. Tinha que ser aqui.
--
-- TRÊS DEFEITOS, NÃO UM
--
--   1. contagem, horas, meses e Gi/No-Gi incluíam linha sem treino
--   2. `duplos` (dois treinos no mesmo dia) contava uma linha de doença mais
--      uma de treino na mesma data como dois treinos — 09/09 virou um
--      "dois-a-day" que não existiu
--   3. a sequência somava o dia parado como se fosse dia treinado
--
-- O QUE O DIA PARADO PASSA A SER: PONTE
--
-- Ele não soma treino, não soma hora — mas também NÃO quebra a sequência.
-- Quem ficou de cama não faltou por desleixo, e zerar a corrente por isso
-- pune a pessoa exatamente por ter sido honesta no registro. A linha entra na
-- fila das ilhas (mantendo a ilha inteira) e soma zero.
--
-- Idempotente: `create or replace` da função e `create index if not exists`.
-- ============================================================================

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
  -- `t` é TREINO DE VERDADE: linha com duração maior que zero.
  --
  -- As linhas de duração zero existem para registrar dia PARADO — doença,
  -- lesão. Contá-las como treino inflava contagem, horas, meses e sequência,
  -- ou seja: o app errava justamente os números que a pessoa mais olha, e
  -- errava para mais. Um dia de cama virava uma hora de tatame.
  with t as (
    select * from public.trainings where user_id = eu and duration_min > 0
  ),
  -- Para a SEQUÊNCIA o dia parado é PONTE, não quebra. Quem está de cama não
  -- faltou por desleixo, e perder a corrente por isso pune a pessoa por ter
  -- sido honesta no registro. Então o dia entra na fila (mantém a ilha
  -- inteira) mas soma zero: quem soma é `treinou`.
  dias_todos as (
    select date,
           count(*) filter (where duration_min > 0) as sessoes,
           coalesce(sum(rolls), 0) as rolls,
           least(count(*) filter (where duration_min > 0), 1)::int as treinou
    from public.trainings where user_id = eu group by date
  ),
  -- O resto das métricas de dia só enxerga dia treinado. Sem isto, um dia com
  -- uma linha de doença mais uma de treino contaria como dois treinos no dia.
  dias as (select date, sessoes, rolls from dias_todos where sessoes > 0),
  ilhas as (
    select treinou,
           date - (row_number() over (order by date))::int as grupo
    from dias_todos
  ),
  semanas as (
    select date_trunc('week', date)::date as semana, max(treinou) as treinou
    from dias_todos group by 1
  ),
  ilhas_semana as (
    select treinou,
           semana - ((row_number() over (order by semana)) * 7)::int as grupo
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
    (select coalesce(max(c), 0) from (select sum(treinou) c from ilhas group by grupo) x)
  union all select 'seq_semanas',
    (select coalesce(max(c), 0) from (select sum(treinou) c from ilhas_semana group by grupo) x)
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

-- ---------------------------------------------------------------------------
-- E um índice que faltava: `refeicoes.cardapio_item_id` (migração 042) é a
-- chave estrangeira que o check diário do cardápio consulta a cada abertura da
-- tela, e ela estava sem índice de cobertura. Com doze itens não se percebe;
-- com um ano de registro, percebe.
-- ---------------------------------------------------------------------------
create index if not exists refeicoes_cardapio_item_idx
  on public.refeicoes (cardapio_item_id)
  where cardapio_item_id is not null;
