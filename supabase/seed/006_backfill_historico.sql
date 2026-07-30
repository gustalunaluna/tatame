-- ============================================================
-- TATAME — Backfill do histórico completo
-- • Início da jornada: 13/10/2025
-- • 3 treinos por semana (seg/qua/sex) até 19/07/2026, sem faltar nenhum
-- • Graus na faixa branca: 1º em 17/12/2025 · 2º e 3º em 03/06/2026
-- • Recalcula progresso e desbloqueia as conquistas de volume/frequência
--   a partir dos dados REAIS da tabela trainings.
-- Seguro rodar mais de uma vez.
-- ============================================================
DO $$
DECLARE
  uid uuid;
  n_trainings int;
  n_gi int;
  n_rolls int;
  n_hours int;
  n_months int;
  max_streak int;
  max_weeks int;
  n_novos int;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado. Crie sua conta no app primeiro.';
  END IF;

  -- ===== 1) Início da jornada =====
  UPDATE profiles SET goal_start='2025-10-13' WHERE user_id=uid;

  -- ===== 2) Treinos: 3x/semana (seg, qua, sex) de 13/10/2025 a 19/07/2026 =====
  -- Não toca nas datas que já existem (os treinos detalhados de 21–28/07).
  INSERT INTO trainings (user_id,date,type,duration_min,rolls,partners,techniques,notes)
  SELECT uid, d::date, 'Gi', 60, 4, '', '', ''
  FROM generate_series('2025-10-13'::date,'2026-07-19'::date,'1 day') d
  WHERE EXTRACT(ISODOW FROM d) IN (1,3,5)
    AND NOT EXISTS (SELECT 1 FROM trainings t WHERE t.user_id=uid AND t.date=d::date);
  GET DIAGNOSTICS n_novos = ROW_COUNT;

  -- ===== 3) Graus na faixa branca =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
   (uid,'grad_branca_1','1o grau na Branca','Conquiste o 1o grau na faixa branca','Branca','Graduacao',2996),
   (uid,'grad_branca_2','2o grau na Branca','Conquiste o 2o grau na faixa branca','Branca','Graduacao',2997),
   (uid,'grad_branca_3','3o grau na Branca','Conquiste o 3o grau na faixa branca','Branca','Graduacao',2998)
  ON CONFLICT (user_id,key) DO NOTHING;

  UPDATE achievements SET unlocked=true, unlocked_date='2025-12-17'
   WHERE user_id=uid AND key='grad_branca_1';
  UPDATE achievements SET unlocked=true, unlocked_date='2026-06-03'
   WHERE user_id=uid AND key IN ('grad_branca_2','grad_branca_3');

  -- ===== 4) Contadores calculados dos dados reais =====
  SELECT count(*), count(*) FILTER (WHERE type='Gi'),
         coalesce(sum(rolls),0), floor(coalesce(sum(duration_min),0)/60.0)
    INTO n_trainings, n_gi, n_rolls, n_hours
  FROM trainings WHERE user_id=uid;

  n_months := floor((CURRENT_DATE - '2025-10-13'::date)/30.44);

  -- maior sequência de dias consecutivos
  WITH d AS (SELECT DISTINCT date FROM trainings WHERE user_id=uid),
       g AS (SELECT date, date - (row_number() OVER (ORDER BY date))::int AS grp FROM d)
  SELECT coalesce(max(c),0) INTO max_streak
  FROM (SELECT count(*) AS c FROM g GROUP BY grp) x;

  -- maior sequência de semanas consecutivas com treino
  WITH w AS (SELECT DISTINCT date_trunc('week',date)::date AS wk FROM trainings WHERE user_id=uid),
       g AS (SELECT wk, wk - ((row_number() OVER (ORDER BY wk))::int * 7) AS grp FROM w)
  SELECT coalesce(max(c),0) INTO max_weeks
  FROM (SELECT count(*) AS c FROM g GROUP BY grp) x;

  -- ===== 5) Progresso das barras =====
  UPDATE achievements SET progress=LEAST(target,n_trainings) WHERE user_id=uid AND key LIKE 'vol_train_%';
  UPDATE achievements SET progress=LEAST(target,n_gi)        WHERE user_id=uid AND key LIKE 'vol_gi_%';
  UPDATE achievements SET progress=LEAST(target,n_rolls)     WHERE user_id=uid AND (key LIKE 'rolls_total_%' OR key LIKE 'spar_%');
  UPDATE achievements SET progress=LEAST(target,n_hours)     WHERE user_id=uid AND key LIKE 'hours_%';
  UPDATE achievements SET progress=LEAST(target,n_months)    WHERE user_id=uid AND key LIKE 'months_active_%';
  UPDATE achievements SET progress=LEAST(target,max_streak)  WHERE user_id=uid AND key LIKE 'streak_days_%';
  UPDATE achievements SET progress=LEAST(target,max_weeks)   WHERE user_id=uid AND key LIKE 'streak_weeks_%';

  -- ===== 6) Desbloqueia as de volume/frequência cuja meta foi batida =====
  UPDATE achievements SET unlocked=true, unlocked_date=CURRENT_DATE
   WHERE user_id=uid AND unlocked=false AND target IS NOT NULL AND progress >= target
     AND (key LIKE 'vol_train_%' OR key LIKE 'vol_gi_%' OR key LIKE 'rolls_total_%'
       OR key LIKE 'spar_%' OR key LIKE 'hours_%' OR key LIKE 'months_active_%'
       OR key LIKE 'streak_days_%' OR key LIKE 'streak_weeks_%');

  -- marcos equivalentes da lista base
  UPDATE achievements SET unlocked=true, unlocked_date=CURRENT_DATE
   WHERE user_id=uid AND unlocked=false AND (
     (key='logs_20'  AND n_trainings>=20) OR
     (key='logs_50'  AND n_trainings>=50) OR
     (key='logs_100' AND n_trainings>=100));

  UPDATE achievements SET progress=target
   WHERE user_id=uid AND unlocked AND target IS NOT NULL;

  RAISE NOTICE 'Backfill OK — % treinos novos. Totais: % treinos, % rolas, %h de tatame, % meses, maior sequencia % dias, % semanas seguidas.',
    n_novos, n_trainings, n_rolls, n_hours, n_months, max_streak, max_weeks;
END $$;
