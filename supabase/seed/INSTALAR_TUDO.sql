-- ============================================================================
--  TATAME — INSTALAR TUDO (arquivo único)
-- ============================================================================
--  Cole INTEIRO no SQL Editor do Supabase e clique em Run.
--  Pré-requisito: já ter criado sua conta no app (tela "Oss, guerreiro").
--  Seguro rodar mais de uma vez: não duplica nada.
--
--  O que faz, em ordem:
--   0) Se já existir uma tabela `profiles` de outro template, guarda como backup
--   1) Cria/completa todas as tabelas do app, com segurança por usuário (RLS)
--   2) Cria o que o app cria no 1º login (perfil, 14 técnicas, plano, metas)
--   3) Cadastra as ~1.000 conquistas
--   4) Traz seus 6 treinos detalhados, 3 análises e 9 posições ⭐
--   5) Backfill: 3 treinos/semana desde 13/10/2025 + graus da faixa branca
--   6) Atualiza metas, plano e notas de domínio (check-in 29/07)
--   7) Mostra um relatório no final
-- ============================================================================


-- ############### 000_parte0_corrige_base.sql ###############
-- ============================================================
-- PARTE 0 — Corrige a base e prepara tudo o que o app precisa
-- Trata o caso de já existir uma tabela `profiles` de outro
-- template (com `id` em vez de `user_id`): guarda como backup.
-- ============================================================

-- ===== 0.1) profiles com formato errado? guarda como backup =====
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
     )
  THEN
    EXECUTE 'ALTER TABLE public.profiles RENAME TO profiles_backup_'
            || to_char(now(),'YYYYMMDDHH24MISS');
    RAISE NOTICE 'A tabela profiles existente nao era a do app — guardada como backup.';
  END IF;
END $$;

-- ############### 001_schema.sql ###############
-- ============================================================
-- TATAME — Schema completo do banco
-- SEGURO RODAR MAIS DE UMA VEZ: cria só o que estiver faltando.
-- ============================================================

-- ===== Tabelas =====
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  goal_start DATE NOT NULL DEFAULT CURRENT_DATE,
  seeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 0,
  rolls INTEGER NOT NULL DEFAULT 0,
  partners TEXT NOT NULL DEFAULT '',
  techniques TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  mastery INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week INTEGER NOT NULL,
  focus TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week)
);

CREATE TABLE IF NOT EXISTS public.weak_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  label TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_date DATE,
  target INTEGER,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garante as colunas novas caso a tabela já existisse de uma versão anterior
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS target INTEGER;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

-- ===== Índices =====
CREATE INDEX IF NOT EXISTS analyses_user_date_idx ON public.analyses (user_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS achievements_user_key_idx ON public.achievements (user_id, key);

-- ===== Permissões + segurança por usuário (RLS) =====
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','trainings','techniques','plan_weeks','weak_points','analyses','achievements']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- ===== updated_at automático =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','trainings','techniques','plan_weeks','weak_points']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- Remove políticas antigas de versões anteriores deste script (evita duplicidade)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND policyname <> 'own rows'
      AND tablename IN ('profiles','trainings','techniques','plan_weeks','weak_points','analyses','achievements')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

DO $$ BEGIN RAISE NOTICE 'Schema do Tatame pronto. Agora crie sua conta no app e rode o 004.'; END $$;

-- ############### 000_parte0b_seed_app.sql ###############
-- ============================================================
-- PARTE 0B — Cria o que o app normalmente cria no primeiro login
-- (perfil, 14 técnicas base, plano de 8 semanas, pontos fracos)
-- e marca seeded=true para o app não duplicar depois.
-- ============================================================
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado. Crie sua conta no app primeiro e rode este script de novo.';
  END IF;

  -- Perfil
  INSERT INTO profiles (user_id, goal_start, seeded)
  VALUES (uid, '2025-10-13', true)
  ON CONFLICT (user_id) DO UPDATE SET goal_start='2025-10-13', seeded=true;

  -- 14 técnicas base (só se a biblioteca estiver vazia)
  IF NOT EXISTS (SELECT 1 FROM techniques WHERE user_id=uid) THEN
    INSERT INTO techniques (user_id,name,category,notes,video_url,mastery) VALUES
    (uid,'Guarda Aranha','Guarda','Pegadas na manga + pés no bíceps. Base de controle e ataques.','',2),
    (uid,'Guarda De La Riva (DLR)','Guarda','Gancho por fora, pegada no tornozelo/gola. Rota principal para as costas.','',2),
    (uid,'Single-leg X (SLX)','Guarda','Controle da perna do oponente. Raspagens e transições para as costas.','',1),
    (uid,'Meia-guarda com joelho-shield','Guarda','Joelho no peito do oponente, quadril fora da linha.','',2),
    (uid,'Omoplata','Finalização','Encadeia com triângulo e armbar. Também raspa.','',3),
    (uid,'Triângulo','Finalização','Ângulo é rei. Puxa cabeça, aperta.','',3),
    (uid,'Armbar','Finalização','Controle do braço + polegar pra cima.','',3),
    (uid,'Kimura','Finalização','Do fundo, meia-guarda e cima.','',2),
    (uid,'Americana','Finalização','Da montada e 100kg. Cotovelo colado no chão.','',2),
    (uid,'Mata-leão','Finalização','Costas — encaixe do braço e aperto.','',2),
    (uid,'Katagatame','Finalização','Braço-cabeça, ângulo lateral.','',2),
    (uid,'Tesourinha','Raspagem','Raspagem clássica da guarda fechada.','',2),
    (uid,'Double leg','Queda','Entrada de duas pernas — usar base de boxe.','',1),
    (uid,'Guilhotina','Defesa','Defesa contra double leg e cabeça baixa.','',2);
  END IF;

  -- Plano de 8 semanas (só se não existir)
  IF NOT EXISTS (SELECT 1 FROM plan_weeks WHERE user_id=uid) THEN
    INSERT INTO plan_weeks (user_id,week,focus,items)
    SELECT uid, w.week, w.focus,
      (SELECT jsonb_agg(jsonb_build_object('id', gen_random_uuid()::text, 'label', l, 'done', false))
       FROM unnest(w.items) l)
    FROM (VALUES
      (1,'Fundamentos de retenção — quadril rápido', ARRAY['Drill de quadril (shrimp) — 5 min','Manter pernas na linha vs. passador','Enfrentar o passador (nunca dar as costas)','3 rolos focando só em não passar']),
      (2,'Inside position + grip fighting inicial', ARRAY['Buscar inside position em toda troca','Pegar primeiro — 2-on-1 na manga','Estudar 1 vídeo de quebra de pegada','Rolo focado em vencer o grip fighting']),
      (3,'De La Riva — entrada e controle', ARRAY['Drill entrada DLR — 20 reps por lado','Pegada tornozelo + gola/manga','Berimbolo básico — treinar rotação','2 rolos abrindo com DLR']),
      (4,'DLR → costas (back take)', ARRAY['Transição DLR → SLX','Rotação para pegar costas com gancho','Encaixar 2º gancho + controle do braço','Finalizar 1x com mata-leão no rolo']),
      (5,'Single-leg X — controle e raspagem', ARRAY['Entrada SLX pela DLR','Raspagem SLX para top','Ashi garami básico — controle da linha','2 rolos abrindo com SLX']),
      (6,'SLX → costas', ARRAY['Rotação SLX pra trás pegando costas','Transição SLX ↔ DLR','Encadear back take com finalização','Rolo focado só em pegar costas']),
      (7,'Grip fighting avançado — pegadas cruzadas', ARRAY['Cross-grip (manga cruzada)','Quebrar pegada dele antes de agir','Pegar primeiro em toda troca em pé','3 rolos ganhando o grip']),
      (8,'Integração — retenção + costas encadeadas', ARRAY['Rolo teste: 5 min sem ser passado','Pegar costas 3x na semana','Registrar aprendizados no diário','Revisar plano — próximo ciclo'])
    ) AS w(week,focus,items);
  END IF;

  -- Pontos fracos base
  INSERT INTO weak_points (user_id,label,score,history)
  SELECT uid, l, 2, '[]'::jsonb
  FROM (VALUES ('Jogo em pé / quedas'),('Defesa de costas'),('Forçar pegadas')) v(l)
  WHERE NOT EXISTS (SELECT 1 FROM weak_points w WHERE w.user_id=uid AND w.label=v.l);

  RAISE NOTICE 'Base do app pronta (perfil, tecnicas, plano, pontos fracos).';
END $$;

-- ############### 002_conquistas.sql ###############
-- ============================================================
-- TATAME — Seed das ~1.000 conquistas (rodar DEPOIS de criar
-- sua conta no app). Aplica ao PRIMEIRO usuário cadastrado.
-- Pode rodar de novo sem duplicar (ON CONFLICT DO NOTHING).
-- ============================================================
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado ainda. Crie sua conta no app primeiro.';
  END IF;

  -- ===== Base (36 marcos principais) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'first_log','Primeiro registro','Registre seu primeiro treino','Branca','Especial',1),
  (uid,'first_roll','Primeira rola','Complete seu primeiro rolo','Branca','Especial',2),
  (uid,'train_white','Parceiro Branca','Treine com um faixa branca','Branca','Parceiro',3),
  (uid,'train_blue','Parceiro Azul','Treine com um faixa azul','Branca','Parceiro',4),
  (uid,'train_purple','Parceiro Roxa','Treine com um faixa roxa','Branca','Parceiro',5),
  (uid,'train_brown','Parceiro Marrom','Treine com um faixa marrom','Branca','Parceiro',6),
  (uid,'train_black','Parceiro Preta','Treine com um faixa preta','Branca','Parceiro',7),
  (uid,'streak_3','3 dias seguidos','Treine 3 dias consecutivos','Branca','Frequencia',8),
  (uid,'first_week','Primeira semana','Registre 3 treinos numa semana','Branca','Frequencia',9),
  (uid,'first_sub','Primeira finalizacao','Registre sua primeira finalizacao','Branca','Tecnica',10),
  (uid,'two_a_day','Dose dupla','Faca 2 treinos no mesmo dia','Azul','Frequencia',11),
  (uid,'streak_7','7 dias seguidos','Treine 7 dias consecutivos','Azul','Frequencia',12),
  (uid,'beat_white','Vitoria vs Branca','Ganhe de um faixa branca','Azul','Vitoria',13),
  (uid,'armlock','Armlock!','Aplique um armlock','Azul','Tecnica',14),
  (uid,'triangle','Triangulo!','Aplique um triangulo','Azul','Tecnica',15),
  (uid,'omoplata','Omoplata!','Aplique uma omoplata','Azul','Tecnica',16),
  (uid,'take_back','Pegou as costas','Conquiste as costas num rolo','Azul','Tecnica',17),
  (uid,'logs_20','20 treinos','Registre 20 treinos','Azul','Frequencia',18),
  (uid,'survive_black','Sobrevivente','Role com faixa preta sem ser finalizado','Azul','Vitoria',19),
  (uid,'streak_20','20 dias seguidos','Treine 20 dias consecutivos','Roxa','Frequencia',20),
  (uid,'beat_blue','Vitoria vs Azul','Ganhe de um faixa azul','Roxa','Vitoria',21),
  (uid,'mataleao','Mata-leao','Finalize com mata-leao pelas costas','Roxa','Tecnica',22),
  (uid,'chain','Sequencia mortal','Encadeie omoplata-triangulo-armlock num rolo','Roxa','Tecnica',23),
  (uid,'takedown','Quedou!','Aplique uma queda num rolo','Roxa','Tecnica',24),
  (uid,'two_blacks','Dois pretas','Treine com dois faixas pretas no mesmo dia','Roxa','Parceiro',25),
  (uid,'logs_50','50 treinos','Registre 50 treinos','Roxa','Frequencia',26),
  (uid,'beat_purple','Vitoria vs Roxa','Ganhe de um faixa roxa','Roxa','Vitoria',27),
  (uid,'month_streak','Um mes seguido','Treine 30 dias consecutivos','Marrom','Frequencia',28),
  (uid,'compete','Estreia','Compita pela primeira vez','Marrom','Competicao',29),
  (uid,'win_match','Primeira vitoria oficial','Venca uma luta em competicao','Marrom','Competicao',30),
  (uid,'beat_brown','Vitoria vs Marrom','Ganhe de um faixa marrom','Marrom','Vitoria',31),
  (uid,'logs_100','100 treinos','Registre 100 treinos','Marrom','Frequencia',32),
  (uid,'sub_black','Cacador','Finalize um faixa preta num rolo','Marrom','Tecnica',33),
  (uid,'win_comp','Campeao','Ganhe um campeonato','Preta','Competicao',34),
  (uid,'streak_100','100 dias','Treine 100 dias consecutivos','Preta','Frequencia',35),
  (uid,'all_done','Faixa Preta do Tatame','Desbloqueie todas as outras conquistas','Preta','Especial',36)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Volume de treinos =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'vol_train_'||n,'Treine '||n||' vezes','Acumule '||n||' treinos registrados',
   CASE WHEN o<=3 THEN 'Branca' WHEN o<=7 THEN 'Azul' WHEN o<=11 THEN 'Roxa' WHEN o<=15 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',100+o
  FROM unnest(ARRAY[1,5,10,20,30,50,75,100,150,200,300,400,500,750,1000,1500,2000,3000,5000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Dias seguidos =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'streak_days_'||n,n||' dias seguidos','Treine '||n||' dias consecutivos',
   CASE WHEN o<=3 THEN 'Branca' WHEN o<=6 THEN 'Azul' WHEN o<=10 THEN 'Roxa' WHEN o<=14 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',200+o
  FROM unnest(ARRAY[2,3,5,7,10,14,20,30,45,60,90,120,150,200,270,365,500,730,1000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Semanas seguidas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'streak_weeks_'||n,n||' semanas seguidas','Treine toda semana por '||n||' semanas',
   CASE WHEN o<=2 THEN 'Branca' WHEN o<=4 THEN 'Azul' WHEN o<=7 THEN 'Roxa' WHEN o<=9 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',300+o
  FROM unnest(ARRAY[2,4,8,12,16,24,36,52,78,104,156,208]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Rolas acumuladas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'rolls_total_'||n,n||' rolas','Complete '||n||' rolas no total',
   CASE WHEN o<=2 THEN 'Branca' WHEN o<=4 THEN 'Azul' WHEN o<=6 THEN 'Roxa' WHEN o<=8 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',400+o
  FROM unnest(ARRAY[10,25,50,100,250,500,1000,2500,5000,10000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Horas de tatame =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'hours_'||n,n||' horas de tatame','Acumule '||n||' horas treinando',
   CASE WHEN o<=2 THEN 'Branca' WHEN o<=4 THEN 'Azul' WHEN o<=6 THEN 'Roxa' WHEN o<=8 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',500+o
  FROM unnest(ARRAY[10,25,50,100,250,500,1000,2000,5000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Parceiros por faixa =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'partner_'||b.slug||'_'||c.n,'Treine com '||c.n||' faixas '||b.label,'Some '||c.n||' parceiros faixa '||b.label,
   b.tier,'Parceiro',600 + b.ord*10 + c.o
  FROM (VALUES ('white','branca','Branca',1),('blue','azul','Azul',2),('purple','roxa','Roxa',3),('brown','marrom','Marrom',4),('black','preta','Preta',5),('coral','coral','Preta',6)) AS b(slug,label,tier,ord)
  CROSS JOIN unnest(ARRAY[1,5,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== N pretas no mesmo dia =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'blacks_sameday_'||n,n||' pretas no mesmo dia','Treine com '||n||' faixas pretas num unico dia',
   CASE WHEN o<=2 THEN 'Roxa' WHEN o<=4 THEN 'Marrom' ELSE 'Preta' END,'Parceiro',700+o
  FROM unnest(ARRAY[2,3,4,5,7,10]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Vitorias por faixa =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'beat_'||b.slug||'_'||c.n,'Venca '||c.n||' faixas '||b.label,'Ganhe '||c.n||' rolos contra faixa '||b.label,
   b.tier,'Vitoria',800 + b.ord*10 + c.o
  FROM (VALUES ('white','branca','Azul',1),('blue','azul','Roxa',2),('purple','roxa','Marrom',3),('brown','marrom','Marrom',4),('black','preta','Preta',5)) AS b(slug,label,tier,ord)
  CROSS JOIN unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Finalizacoes (40 tecnicas x marcos) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sub_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Finalize '||c.n||' vez(es) com '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o<=5 THEN 'Marrom' ELSE 'Preta' END,'Finalizacao',1000+c.o
  FROM (VALUES
   ('armlockb','armlock'),('triangulob','triangulo'),('omoplatab','omoplata'),('kimura','kimura'),
   ('americana','americana'),('mataleaob','mata-leao'),('katagatame','katagatame'),('ezequiel','ezequiel'),
   ('guilhotina','guilhotina'),('darce','brabo (darce)'),('anaconda','anaconda'),('peruano','peruano'),
   ('relogio','estrangulamento relogio'),('baseball','baseball bat choke'),('bowarrow','arco e flecha'),
   ('lapela','estrangulamento de lapela'),('cruzado','estrangulamento cruzado'),('armtriangle','triangulo de braco'),
   ('northsouth','north-south choke'),('papercutter','paper cutter'),('gravata','gravata'),('botinha','chave de pe reta'),
   ('toehold','toe hold'),('heelhook','heel hook'),('kneebar','chave de joelho'),('bicepslicer','biceps slicer'),
   ('calfslicer','calf slicer'),('wristlock','mao de vaca'),('gogoplata','gogoplata'),('crucifixo','estrangulamento crucifixo'),
   ('loopchoke','loop choke'),('mountchoke','estrangulamento da montada'),('bulldog','bulldog choke'),('vonflue','von flue choke'),
   ('bananasplit','banana split'),('electricchair','electric chair'),('twister','twister'),('suloev','suloev stretch'),
   ('pacoca','pacoca'),('estrangcostas','estrangulamento pelas costas')
  ) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100,250]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Raspagens =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sweep_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Aplique '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o=4 THEN 'Marrom' ELSE 'Preta' END,'Raspagem',2000+c.o
  FROM (VALUES ('tesoura','raspagem tesoura'),('gancho','raspagem de gancho'),('balao','raspagem balao'),('flor','raspagem flor de lotus'),('dlr','raspagem De La Riva'),('xguard','raspagem X-guard'),('slx','raspagem single-leg X'),('aranha','raspagem da aranha'),('lasso','raspagem lasso'),('borboleta','raspagem borboleta'),('meia','raspagem da meia-guarda'),('joelhosh','raspagem joelho-shield'),('tornozelo','raspagem por tornozelo'),('overhook','raspagem com overhook'),('situp','raspagem sit-up'),('hipbump','raspagem hip bump'),('pendulo','raspagem pendulo'),('deephalf','raspagem deep half'),('williams','williams guard sweep'),('berimbolosw','berimbolo')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Passagens =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'pass_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Passe a guarda '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o=4 THEN 'Marrom' ELSE 'Preta' END,'Passagem',2100+c.o
  FROM (VALUES ('toureando','passagem toureando'),('kneeslice','knee slice'),('stack','stack pass'),('legdrag','leg drag'),('overunder','over-under'),('dobradinha','dobradinha'),('pressao','passagem de pressao'),('longstep','long step'),('xpass','x-pass'),('float','passagem flutuante'),('bodylock','body lock pass'),('smash','smash pass'),('cortando','passagem cortando'),('joelhomeio','joelho no meio'),('saltando','passagem saltando'),('ninja','ninja pass')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Quedas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'td_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Derrube '||c.n||' vez(es) com '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o=4 THEN 'Marrom' ELSE 'Preta' END,'Queda',2200+c.o
  FROM (VALUES ('single','single leg'),('double','double leg'),('ouchi','ouchi gari'),('kouchi','kouchi gari'),('ippon','ippon seoi nage'),('morote','morote seoi'),('ogoshi','o goshi'),('uchimata','uchi mata'),('taiotoshi','tai otoshi'),('haraigoshi','harai goshi'),('kosoto','kosoto gari'),('anklepick','ankle pick'),('highc','high crotch'),('footsweep','foot sweep'),('tomoenage','tomoe nage'),('arrasto','arrasto (drag)')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Escapes/defesas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'esc_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Consiga '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o=2 THEN 'Roxa' ELSE 'Marrom' END,'Escape',2300+c.o
  FROM (VALUES ('montada','escape da montada'),('costas','escape das costas'),('lateral','escape da lateral'),('kesa','escape do kesa gatame'),('cemkg','escape do 100kg'),('tridef','defesa de triangulo'),('armdef','defesa de armlock'),('guildef','defesa de guilhotina'),('matadef','defesa de mata-leao'),('kimdef','defesa de kimura'),('legdef','defesa de chave de pe'),('turtle','saida da tartaruga')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,50]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Controles =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'pos_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Conquiste/segure '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o=2 THEN 'Roxa' WHEN c.o=3 THEN 'Marrom' ELSE 'Preta' END,'Controle',2400+c.o
  FROM (VALUES ('mount','montada'),('back','pegar as costas'),('kob','joelho na barriga'),('sidec','controle lateral'),('northsouth','controle norte-sul'),('crucifixo','crucifixo'),('bodytri','triangulo de corpo nas costas'),('turtletop','controle da tartaruga')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Graduacao =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'grad_branca4','4o grau na Branca','Conquiste o 4o grau na faixa branca','Branca','Graduacao',3000),
  (uid,'grad_azul','FAIXA AZUL','Seja graduado faixa azul','Azul','Graduacao',3010),
  (uid,'grad_roxa','FAIXA ROXA','Seja graduado faixa roxa','Roxa','Graduacao',3030),
  (uid,'grad_marrom','FAIXA MARROM','Seja graduado faixa marrom','Marrom','Graduacao',3050),
  (uid,'grad_preta','FAIXA PRETA','Seja graduado faixa preta','Preta','Graduacao',3070),
  (uid,'grad_coral_7','7o grau — Faixa Coral','Conquiste o 7o grau (coral vermelho e preto)','Coral','Graduacao',3096),
  (uid,'grad_coral_8','8o grau — Faixa Coral','Conquiste o 8o grau (coral vermelho e branco)','Coral','Graduacao',3097),
  (uid,'grad_vermelha_9','9o grau — Faixa Vermelha','Conquiste o 9o grau (faixa vermelha)','Vermelha','Graduacao',3098),
  (uid,'grad_vermelha_10','10o grau — Faixa Vermelha','Grao-mestre: o 10o grau, reservado aos pioneiros','Vermelha','Graduacao',3099)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'grad_'||b.slug||'_'||g,g||'o grau na '||b.label,'Conquiste o '||g||'o grau na faixa '||b.label,b.tier,'Graduacao',b.base+g
  FROM (VALUES ('azul','Azul','Azul',3011),('roxa','Roxa','Roxa',3031),('marrom','Marrom','Marrom',3051)) b(slug,label,tier,base)
  CROSS JOIN generate_series(1,4) g
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'grad_preta_'||g,g||'o grau na Preta','Conquiste o '||g||'o grau na faixa preta','Preta','Graduacao',3071+g
  FROM generate_series(1,6) g
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Competicao (contagens) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'comp_events_'||n,'Compita '||n||' vez(es)','Participe de '||n||' campeonatos',
   CASE WHEN o<=2 THEN 'Roxa' WHEN o<=4 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3100+o
  FROM unnest(ARRAY[1,3,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'comp_wins_'||n,'Venca '||n||' luta(s)','Venca '||n||' lutas em competicao',
   CASE WHEN o<=1 THEN 'Roxa' WHEN o<=3 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3120+o
  FROM unnest(ARRAY[1,5,10,25,50,100]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Competicao (marcos) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'comp_debut','Estreia oficial','Compita pela primeira vez','Roxa','Competicao',3140),
  (uid,'comp_first_medal','Primeira medalha','Suba ao podio pela primeira vez','Roxa','Competicao',3141),
  (uid,'comp_win_sub','Vitoria por finalizacao','Venca uma luta finalizando','Marrom','Competicao',3142),
  (uid,'comp_win_pts','Vitoria por pontos','Venca uma luta nos pontos','Roxa','Competicao',3143),
  (uid,'comp_bronze','Bronze','Conquiste uma medalha de bronze','Roxa','Competicao',3144),
  (uid,'comp_silver','Prata','Conquiste uma medalha de prata','Marrom','Competicao',3145),
  (uid,'comp_gold','Ouro','Conquiste uma medalha de ouro','Marrom','Competicao',3146),
  (uid,'comp_gold_abs','Ouro no absoluto','Venca a categoria absoluto','Preta','Competicao',3147),
  (uid,'comp_state','Campeao estadual','Venca um campeonato estadual','Marrom','Competicao',3148),
  (uid,'comp_national','Campeao nacional','Venca um campeonato nacional','Preta','Competicao',3149),
  (uid,'comp_pan','Medalha no Pan','Medalhe no Pan-americano IBJJF','Preta','Competicao',3150),
  (uid,'comp_worlds_medal','Medalha no Mundial','Medalhe no Mundial IBJJF','Preta','Competicao',3151),
  (uid,'comp_worlds_gold','Campeao Mundial','Seja campeao mundial IBJJF','Preta','Competicao',3152),
  (uid,'comp_euro','Medalha no Europeu','Medalhe no Europeu IBJJF','Preta','Competicao',3153),
  (uid,'comp_adcc','ADCC','Compita no ADCC','Preta','Competicao',3154),
  (uid,'comp_master','Master Worlds','Medalhe no Master Mundial','Marrom','Competicao',3155),
  (uid,'comp_nogi_medal','Medalha No-Gi','Medalhe num campeonato No-Gi','Marrom','Competicao',3156),
  (uid,'comp_travel_state','Competir fora','Compita em outro estado','Marrom','Competicao',3157),
  (uid,'comp_intl','Competir internacional','Compita fora do pais','Preta','Competicao',3158),
  (uid,'comp_final_sub','Final finalizada','Finalize na final de um campeonato','Marrom','Competicao',3159)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Seminarios e educacao =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sem_'||s.slug,'Seminario de '||s.name,'Participe de um seminario de '||s.name,'Roxa','Educacao',3200+s.o
  FROM (VALUES ('gi','Gi',1),('nogi','No-Gi',2),('leglock','leglocks',3),('wrestling','wrestling e quedas',4),('passagem','passagem de guarda',5),('guarda','jogo de guarda',6),('final','finalizacoes',7)) s(slug,name,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sem_count_'||n,'Participe de '||n||' seminario(s)','Some '||n||' seminarios no total',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Educacao',3210+o
  FROM unnest(ARRAY[1,3,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'edu_online','Curso online','Faca um curso online de BJJ','Branca','Educacao',3220),
  (uid,'edu_review','Estudioso','Estude um treino em video','Branca','Educacao',3221),
  (uid,'edu_notebook','Caderno de guerra','Mantenha um caderno de BJJ por 1 mes','Azul','Educacao',3222),
  (uid,'edu_watch_worlds','Torcedor','Assista a um Mundial','Branca','Educacao',3223),
  (uid,'edu_dropin','Visitante','Treine em outra academia (drop-in)','Azul','Educacao',3224),
  (uid,'edu_openmat_1','Primeiro open mat','Participe de um open mat','Azul','Educacao',3225),
  (uid,'edu_openmat_10','Rato de open mat','Participe de 10 open mats','Roxa','Educacao',3226),
  (uid,'edu_openmat_50','Lenda do open mat','Participe de 50 open mats','Marrom','Educacao',3227),
  (uid,'edu_help_teach','Monitor','Ajude a dar uma aula','Roxa','Educacao',3228),
  (uid,'edu_teach_class','Professor por um dia','De uma aula sozinho','Marrom','Educacao',3229),
  (uid,'edu_graduate','Mestre','Ajude a graduar um aluno','Preta','Educacao',3230),
  (uid,'edu_help_beginner','Padrinho','Ensine um iniciante','Azul','Educacao',3231),
  (uid,'edu_kids','Tio do tatame','Ajude na aula das criancas','Roxa','Educacao',3232),
  (uid,'edu_referee','Arbitro','Arbitre uma competicao','Marrom','Educacao',3233),
  (uid,'edu_private_1','Aula particular','Faca uma aula particular','Azul','Educacao',3234),
  (uid,'edu_private_10','Dedicado','Faca 10 aulas particulares','Roxa','Educacao',3235),
  (uid,'edu_camp','Camp de treino','Participe de um camp de treino','Marrom','Educacao',3236),
  (uid,'edu_other_state','Tatame viajante','Treine em outro estado','Roxa','Educacao',3237),
  (uid,'edu_other_country','Passaporte do jiu','Treine em outro pais','Marrom','Educacao',3238),
  (uid,'edu_gyms_3','Explorador','Treine em 3 academias diferentes','Roxa','Educacao',3239),
  (uid,'edu_gyms_5','Nomade','Treine em 5 academias diferentes','Marrom','Educacao',3240),
  (uid,'edu_gyms_10','Cidadao do mundo','Treine em 10 academias diferentes','Preta','Educacao',3241),
  (uid,'edu_idol','Treino dos sonhos','Treine com um atleta que voce admira','Roxa','Educacao',3242),
  (uid,'edu_ceremony','Cerimonia','Participe de uma cerimonia de graduacao','Azul','Educacao',3243),
  (uid,'edu_seminar_champ','Frente a frente','Faca um seminario com um campeao mundial','Roxa','Educacao',3244)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Volume Gi / No-Gi =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'vol_'||g.slug||'_'||c.n,c.n||' treinos '||g.name,'Acumule '||c.n||' treinos '||g.name,
   CASE WHEN c.o<=2 THEN 'Azul' WHEN c.o<=4 THEN 'Roxa' WHEN c.o<=6 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3250+g.ord*10+c.o
  FROM (VALUES ('gi','de Gi',1),('nogi','de No-Gi',2)) g(slug,name,ord)
  CROSS JOIN unnest(ARRAY[10,25,50,100,250,500,1000]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Social / jornada / estudo =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'partners_div_'||n,n||' parceiros diferentes','Role com '||n||' parceiros distintos',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Social',3300+o
  FROM unnest(ARRAY[10,25,50,100,200]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'months_active_'||n,n||' meses de jornada','Complete '||n||' meses treinando',
   CASE WHEN o<=1 THEN 'Branca' WHEN o<=3 THEN 'Azul' WHEN o<=4 THEN 'Roxa' WHEN o<=6 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3310+o
  FROM unnest(ARRAY[1,3,6,12,24,36,60,120]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'twoaday_'||n,n||'x treino duplo','Faca 2 treinos no mesmo dia '||n||' vez(es)',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3320+o
  FROM unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'study_mastery_'||n,'Domine '||n||' tecnica(s)','Chegue a nota 5 em '||n||' tecnicas da biblioteca',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Estudo',3330+o
  FROM unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'rollsday_'||n,n||' rolas num dia','Faca '||n||' rolas num unico treino',
   CASE WHEN o=1 THEN 'Azul' WHEN o=2 THEN 'Roxa' WHEN o=3 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3340+o
  FROM unnest(ARRAY[5,7,10,15]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Finalizar pretas (por tecnica) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'subblack_'||s.slug,'Preta finalizado: '||s.name,'Finalize um faixa preta com '||s.name,'Preta','Lendaria',3400+s.o
  FROM (VALUES ('armlock','armlock',1),('triangulo','triangulo',2),('omoplata','omoplata',3),('kimura','kimura',4),('americana','americana',5),('mataleao','mata-leao',6),('katagatame','katagatame',7),('ezequiel','ezequiel',8),('guilhotina','guilhotina',9),('darce','brabo',10),('anaconda','anaconda',11),('peruano','peruano',12),('relogio','estrangulamento relogio',13),('baseball','baseball choke',14),('bowarrow','arco e flecha',15),('lapela','estrang. de lapela',16),('cruzado','estrang. cruzado',17),('armtriangle','triangulo de braco',18),('northsouth','north-south',19),('botinha','chave de pe reta',20),('heelhook','heel hook',21),('kneebar','chave de joelho',22),('gogoplata','gogoplata',23),('crucifixo','crucifixo',24),('loopchoke','loop choke',25)) s(slug,name,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'firstsub_'||b.slug,'Finalize um faixa '||b.label,'Finalize um parceiro faixa '||b.label||' num rolo',b.tier,'Finalizacao',3440+b.o
  FROM (VALUES ('white','branca','Azul',1),('blue','azul','Roxa',2),('purple','roxa','Roxa',3),('brown','marrom','Marrom',4),('black','preta','Preta',5)) b(slug,label,tier,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'subblack_count_'||n,'Cace '||n||' preta(s)','Finalize '||n||' faixas pretas no total',
   CASE WHEN o<=2 THEN 'Marrom' ELSE 'Preta' END,'Lendaria',3450+o
  FROM unnest(ARRAY[1,3,5,10]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Guardas dominadas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'guard_'||s.slug,'Domine a guarda '||s.name,'Jogue e domine a guarda '||s.name,'Roxa','Estudo',3460+s.o
  FROM (VALUES ('fechada','fechada',1),('aranha','aranha',2),('dlr','De La Riva',3),('slx','single-leg X',4),('xguard','X-guard',5),('borboleta','borboleta',6),('meia','meia-guarda',7),('lasso','lasso',8),('deep','deep half',9),('reverse','reverse De La Riva',10)) s(slug,name,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Estudo / analises / descanso / medalhas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'videos_'||n,'Assista '||n||' video(s)','Estude '||n||' treinos em video',
   CASE WHEN o=1 THEN 'Branca' WHEN o=2 THEN 'Azul' WHEN o=3 THEN 'Roxa' ELSE 'Marrom' END,'Estudo',3480+o
  FROM unnest(ARRAY[1,10,50,100]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'analyses_'||n,'Receba '||n||' analise(s)','Acumule '||n||' analises do treinador',
   CASE WHEN o=1 THEN 'Branca' WHEN o<=3 THEN 'Azul' WHEN o=4 THEN 'Roxa' ELSE 'Marrom' END,'Estudo',3490+o
  FROM unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'rest_'||n,'Descanse com sabedoria x'||n,'Registre '||n||' dias de descanso','Branca','Frequencia',3500+o
  FROM unnest(ARRAY[5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'medals_'||n,'Conquiste '||n||' medalha(s)','Some '||n||' medalhas em competicao',
   CASE WHEN o=1 THEN 'Roxa' WHEN o<=2 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3510+o
  FROM unnest(ARRAY[1,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Estilo de vida =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'life_first_gi','Primeiro kimono','Vista seu primeiro kimono','Branca','Estilo',3520),
  (uid,'life_night','Coruja do tatame','Treine a noite','Branca','Estilo',3521),
  (uid,'life_morning','Madrugador','Treine de manha cedo','Azul','Estilo',3522),
  (uid,'life_weekend','Guerreiro de fim de semana','Treine sabado e domingo','Azul','Estilo',3523),
  (uid,'life_holiday','Sem folga','Treine num feriado','Azul','Estilo',3524),
  (uid,'life_birthday','Aniversario no tatame','Treine no dia do seu aniversario','Roxa','Estilo',3525),
  (uid,'life_newyear','Ano novo, mesma pegada','Treine em 1 de janeiro','Roxa','Estilo',3526),
  (uid,'life_sixweek','Semana cheia','Treine 6 dias numa mesma semana','Roxa','Estilo',3527)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Lendarias =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'leg_streak_year','Um ano invicto contra a preguica','Treine 365 dias seguidos','Preta','Lendaria',3600),
  (uid,'leg_streak_1000','Mil dias de guerra','Treine 1000 dias seguidos','Preta','Lendaria',3601),
  (uid,'leg_5000','Cinco mil','Acumule 5000 treinos','Preta','Lendaria',3602),
  (uid,'leg_10years','Uma decada no tatame','Treine por 10 anos','Coral','Lendaria',3603),
  (uid,'leg_sub_worldchamp','Mataria o rei','Finalize um campeao mundial','Preta','Lendaria',3604),
  (uid,'leg_worlds_bb','Topo do mundo','Seja campeao mundial faixa preta','Preta','Lendaria',3605),
  (uid,'leg_adcc_medal','Elite do grappling','Medalhe no ADCC','Preta','Lendaria',3606),
  (uid,'leg_undefeated_year','Intocavel','Fique 1 ano invicto em competicao','Preta','Lendaria',3607),
  (uid,'leg_beat_all_belts','Sem distincao','Venca ao menos uma vez cada faixa','Preta','Lendaria',3608),
  (uid,'leg_30subs','Arsenal completo','Aplique 30 finalizacoes diferentes','Preta','Lendaria',3609),
  (uid,'leg_iron90','Ferro puro','Treine 90 dias sem parar','Preta','Lendaria',3610),
  (uid,'leg_double_gold_bb','Duplo ouro','Double gold faixa preta','Preta','Lendaria',3611),
  (uid,'leg_grand_slam','Grand Slam','Venca os 4 majors da IBJJF','Preta','Lendaria',3612),
  (uid,'leg_supergslam','Super Grand Slam','4 majors + ADCC na mesma temporada','Preta','Lendaria',3613),
  (uid,'leg_form_champion','Mestre de campeoes','Forme um campeao','Coral','Lendaria',3614),
  (uid,'leg_mentor10','Legado','Gradue 3 faixas pretas','Coral','Lendaria',3615),
  (uid,'leg_500partners','Rei do tatame','Role com 500 parceiros diferentes','Preta','Lendaria',3616),
  (uid,'leg_no_tap_month','Impassavel','Passe um mes sem bater num rolo','Preta','Lendaria',3617),
  (uid,'leg_win100','Centuriao','100 vitorias em competicao','Preta','Lendaria',3618),
  (uid,'leg_hours5000','Dez mil horas quase la','Acumule 5000 horas de tatame','Preta','Lendaria',3619),
  (uid,'leg_perfect_year','Ano perfeito','Treine toda semana por 1 ano','Preta','Lendaria',3620),
  (uid,'leg_absolute_bb','Rei do absoluto','Venca um absoluto de faixa preta','Preta','Lendaria',3621),
  (uid,'leg_1000subs','Mil finalizacoes','Acumule 1000 finalizacoes','Preta','Lendaria',3622),
  (uid,'leg_100comp','Veterano de guerra','Compita 100 vezes','Preta','Lendaria',3623),
  (uid,'leg_own_gym','Fundador','Abra sua propria academia','Coral','Lendaria',3624)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Bloco final =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'winsub_'||b.slug,'Finalize um faixa '||b.label,'Venca um faixa '||b.label||' por finalizacao',b.tier,'Vitoria',3700+b.o
  FROM (VALUES ('white','branca','Azul',1),('blue','azul','Roxa',2),('purple','roxa','Marrom',3),('brown','marrom','Marrom',4),('black','preta','Preta',5)) b(slug,label,tier,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'spar_'||n,n||' rounds de sparring','Acumule '||n||' rounds de sparring',
   CASE WHEN o<=2 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o<=4 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3710+o
  FROM unnest(ARRAY[50,100,250,500,1000,2500]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'winsub_count_'||n,'Venca '||n||'x por finalizacao','Venca '||n||' lutas por finalizacao',
   CASE WHEN o=1 THEN 'Roxa' WHEN o<=3 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3720+o
  FROM unnest(ARRAY[1,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'winpts_count_'||n,'Venca '||n||'x por pontos','Venca '||n||' lutas nos pontos',
   CASE WHEN o=1 THEN 'Roxa' WHEN o<=3 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3730+o
  FROM unnest(ARRAY[1,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'survivemin_'||n,'Segure '||n||' min com um preta','Role '||n||' minutos com um faixa preta sem ser finalizado',
   CASE WHEN o=1 THEN 'Roxa' WHEN o=2 THEN 'Marrom' ELSE 'Preta' END,'Vitoria',3740+o
  FROM unnest(ARRAY[3,5,10]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'partner_coral','Treine com um faixa coral','Role com um mestre faixa coral','Preta','Parceiro',3750),
  (uid,'partner_red','Treine com um faixa vermelha','Role com um grao-mestre faixa vermelha','Preta','Parceiro',3751),
  (uid,'partner_worldchamp','Treine com um campeao mundial','Divida o tatame com um campeao mundial','Preta','Parceiro',3752),
  (uid,'partner_champion_beat','Encoste num campeao','Pontue ou raspe um campeao mundial num rolo','Preta','Lendaria',3753),
  (uid,'escape_black_back','Fuga impossivel','Escape das costas de um faixa preta','Marrom','Escape',3754),
  (uid,'no_pass_black','Muralha','Nao seja passado por um preta num rolo inteiro','Preta','Vitoria',3755),
  (uid,'leg_back_finish_black','Predador de costas','Pegue as costas de um preta e finalize','Preta','Lendaria',3756),
  (uid,'leg_teach_5years','Semeador','Ensine jiu-jitsu por 5 anos','Coral','Lendaria',3757),
  (uid,'leg_worlds_double','Bicampeao mundial','Venca o Mundial faixa preta duas vezes','Vermelha','Lendaria',3758),
  (uid,'leg_hall_fame','Lenda viva','Entre para a historia do seu time','Vermelha','Lendaria',3759)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Metas (target) para as barras de progresso =====
  UPDATE achievements SET target=(regexp_match(key,'(\d+)$'))[1]::int
   WHERE user_id=uid AND key ~ '\d+$' AND key NOT LIKE 'grad%' AND target IS NULL;

  RAISE NOTICE 'Conquistas cadastradas: %', (SELECT count(*) FROM achievements WHERE user_id=uid);
END $$;

-- ############### 003_meus_dados.sql ###############
-- ============================================================
-- TATAME — Meus dados (migrados do app antigo no Lovable)
-- Rodar DEPOIS do 002_conquistas.sql, logado no app ao menos 1x
-- (o app cria o perfil e as técnicas-base no primeiro login).
-- ============================================================
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado ainda. Crie sua conta no app primeiro.';
  END IF;

  -- Início da jornada (data do primeiro registro no app antigo)
  UPDATE profiles SET goal_start='2026-07-21' WHERE user_id=uid;

  -- Protecao: se os treinos ja foram migrados, nao insere de novo
  IF EXISTS (SELECT 1 FROM trainings WHERE user_id=uid) THEN
   RAISE NOTICE 'Treinos/analises/tecnicas ja migrados — pulando (apenas conquistas serao atualizadas).';
  ELSE

  -- ===== Treinos =====
  INSERT INTO trainings (user_id,date,type,duration_min,rolls,partners,techniques,notes) VALUES
  (uid,'2026-07-21','Gi',80,3,'Kris rafa daniel','Queda com lacada e derrubada no tripé de pé finalizando na botinha','O movimento foi tecnicamente simples consegui fazer a técnica tranquilamente para finalizar na botinha não foi tão simples, fiz os rolas primeiro com o faixa marrom kris acabei não pegando tomei 3 passagens e uma montada, consegui repor depois ele me finalizou em um armlock da montada, contra o rafael eu fiz uma passagem toureando quando ele puxou para guarda deixou fiz o knee slice passei peguei a montada fui caminhando com as mãos peguei uma katagatame e depois um estrangulamento com a lapela passando a perna por cima da cabeça, contra o daniel comecei puxando para guarda fechada já atacando um triângulo sai o quadril ajustei o triângulo peguei a perna dlee para se ele postular já sair na omoplata, em seguida acabei caindo na guarda dele ele me de um um ezequiel com as mãos na guarda fechada acabei batendo depois retornamos e puxei ele novamente para guarda já atacando um triângulo'),
  (uid,'2026-07-22','Gi',60,4,'Pedro,helena,jeff,gi,leo','Raspagem de gancho com over hook','Começamos treinando raspagem de gancho com overhook em seguida fizemos rolas o primeiro apenas fiquei repondo guarda para o Léo iniciante, em seguida fiz com pedro jovem campeão competidor de 15 anos fui de leve para não machucar ele apenas trocando posições, depois fiz com a gi mulher de 25 anos competidor boa faixa branca 3 graus, fiz sequência de omoplata para triângulo e armlock todos pegaram e eu soltava para continuar a sequência, e depois fiz com o Jefferson ele começou fazendo guarda fui passando, conseguir algumas passagens de knee slice não conseguir estabilizar bem o 100 kg ele me raspou utilizando minha perna voltei para guarda fechada, ele tentou me passar sai emborcando peguei as costas dele mas não finalizei antes do tempo'),
  (uid,'2026-07-23','Gi',60,4,'Thiago','Reposições e ajustes do triângulo','Levantar para que o adversário fique na linha do quadril para fazer a reposição no 100kg, ir se arrastando para ajustar o triângulo, fiz 3 rolas contra preta e azul comecei com o Thiago faixa preta fui dominado, apenas tentando repor guarda tive dificuldade ele me finalizou com arm lock não consegui sair, em seguida fiz com um faixa azul,começamos de pé ele puxou para guarda comecei a passagem acabei sendo raspado fui finalizado com um arm lock e um estrangulamento cruzado e no final peguei as costas  dele com uma cadeirinha mas não finalizei e no último novamente com faixa preta começamos de pé todos neste ganhei um single leg tentei uma queda não foi tão efetivo mas consegui manter uma meia guarda girei com ele segurando a lapela consegui manter a guarda ele não passou no último rola fiquei repondo e mantendo ele na meia'),
  (uid,'2026-07-24','Gi',60,4,'Jeferson,bruno,gi,dinda','Armlock invertido da guarda gancho','Fiz alguns drills do armlock invertido partindo da guarda gancho com over hook , em seguida fizemos alguns rolas comecei com o Jeferson faixa preta duríssimo, fui dominado estava tentando repor guarda não consegui em momento algum voltar para guarda, já contra o bruno fiz algumas raspagems simples ele voltou raspou da montada, me fechou na guarda fechada e segurou, depois fiz um mais soltinho com a filha do Jefferson peguei sarm lock costas montada e etc de leve ela era faixa laranja'),
  (uid,'2026-07-27','Gi',60,4,'Matheus tutu gi','Estrangulamento da guarda fechada com trava no braço e armlock invertido partindo da fechada','Fiz o primeiro rola com o matheus, faixa azul 2 graus, ele conseguiu a principio passar minha guarda tentou progredir para montada consegui repor a guarda, passei a guarda dele duas vezes com knee slice ele repôs as duas vezes não teve finalizações  fiz com tutu iniciante fiquei apenas fazendo posições para incentivar ele a se mexer e pegar as mecânicas, depois fiz com a gi fiz a delariva com ela fui para pegada de costas ela conseguiu estender meu braço e deu uma chance de braço reta em mim comigo estando nas costas dela e também me estrangulou com arco e flecha eu peguei costas montada e também raspei duas vezes ela'),
  (uid,'2026-07-28','Gi',60,1,'João batalha','Rolamentos, triângulo montada e guarda fechada','Fizemos vários drilss de rolamentos e também triângulo  da guarda fechada e da montada, fiz apenas um rola com o faixa branca dois graus, começamos de pé ele tentou me puxar para guarda eu passei para lateral depois de evitar a puxada cai na lateral ele tentou subir para a guarda fechada matei o braço dele é fiz um violino com braço dele, em seguida resetamos puxei ele pra guarda e ataquei triângulo imediatamente pegando, depois ele puxou para guarda evitei novamente, fui para lateral subi nele na montada tentei atacar triângulo da montada ele defendeu ataquei a omoplata ele levantou busquei a perna dele travei empurrei ele pra frente travei o quadril e finalizei na omoplata');

  -- ===== Análises do treinador =====
  INSERT INTO analyses (user_id,date,title,content) VALUES
  (uid,'2026-07-22','Análise 21-22/07','LEITURA: teu topo e uma maquina (vs Rafael: knee slice > montada > katagatame > estrangulamento de lapela; vs Helena: omoplata > triangulo > armlock). • PADRAO: consolidar depois de passar e o furo nº1 — foi raspado pelo Jefferson por nao estabilizar o 100kg e montado pelo marrom. • ALERTA: puxada + triangulo virou reflexo previsivel; tomou ezequiel dentro da guarda = POSTURA baixa (mesmo vicio da guilhotina). Pegou as costas (Jefferson) e nao finalizou. • FOCO: depois de passar, CONGELA e estabiliza 3s antes de atacar.'),
  (uid,'2026-07-23','Análise 23/07 (check-in)','LEITURA: rolou com 2 pretas e 1 azul. • POSITIVO: teu jogo em pe ACORDOU — comecou em pe e ganhou um single contra faixa-preta; retencao segurou (girou na lapela, a preta nao passou). • ALERTA VERMELHO: armlocks em serie — Thiago, o azul e antes o Kris = 3 finalizacoes de braco; sob pressao voce entrega o cotovelo. • Pegou as costas (cadeirinha no azul) e nao finalizou de novo. • FOCO: COTOVELOS COLADOS no corpo ao repor guarda e defender — nao dar o braco.'),
  (uid,'2026-07-29','Check-in 29/07','LEITURA (24, 27 e 28/07 — 3 treinos, 9 rolas): vs Jeferson (preta) fui dominado e nao repus guarda em momento algum. vs Bruno perdi a montada e fui raspado. vs Matheus (azul 2g) passei 2x de knee slice e ele repos as duas vezes. vs Gi: DLR > pegada de costas, mas TOMEI chave de braco reta e arco e flecha estando NAS COSTAS dela. vs Joao (branca 2g): evitei a puxada dele DUAS vezes e fui direto pra lateral, finalizei no violino, depois puxei armado e o triangulo pegou de primeira, e por cima encadeei triangulo da montada > omoplata e FINALIZEI. • PADROES: teu jogo em pe acordou de verdade (defender puxada e ir pra lateral era zero no diagnostico); encadeamento funciona tambem POR CIMA; CONSOLIDACAO segue como furo nº1 (3o check-in seguido); contra preta forte a retencao quebra. • ALERTAS: tomou finalizacao de braco ESTANDO NAS COSTAS — atacou antes de travar e entregou o cotovelo (4a chave de braco sofrida); costas: chegou 3x e finalizou 0. • FOCO: pegou as costas? TRAVA ANTES DE ATACAR — cinto de seguranca + triangulo de corpo + cotovelos colados, 3 segundos de controle, e SO DEPOIS briga a mao pro mata-leao.');

  -- ===== Meu jogo (posições personalizadas ⭐) =====
  INSERT INTO techniques (user_id,name,category,notes,video_url,mastery) VALUES
  (uid,'⭐ Entrada — Single do Boxeador','Queda','MEU JOGO. Usa a distancia e a mao-guia do boxe pra medir, faz o level change explosivo e ataca o single na perna mais proxima. Se ele defender com sprawl + guilhotina, NAO abaixa a cabeca: cabeca pra cima e pra fora, corre o angulo e pega o pe proximo. Objetivo: cair POR CIMA, nunca puxar guarda.','',1),
  (uid,'⭐ Puxada Armada → De La Riva','Guarda','MEU JOGO. So puxa guarda COM pegada montada: manga + gola (ou tornozelo). Nunca puxa passivo. Ao sentar, ja encaixa o gancho de DLR por fora da perna dele. Sem as duas pegadas, NAO puxa: wrestleia.','',2),
  (uid,'⭐ DLR Longa (pernas de 1,85)','Guarda','MEU JOGO — ponto de partida por baixo. Gancho por fora + pegada no tornozelo + gola/manga. Estica ele pra frente pra roubar a base. Daqui saem berimbolo, raspagem e costas.','',3),
  (uid,'⭐ Emboque da DLR → Costas','Raspagem','MEU JOGO FAVORITO. Da DLR longa, puxa a pegada do tornozelo/calca + gancho leva ele pra frente. Quando ele posta a mao, gira por baixo (berimbolo/emboque) e sobe atras. NAO force: aceita a reacao dele. Chegou nas costas → cinto de seguranca.','',2),
  (uid,'⭐ Aranha-Lasso → quebra de postura → DLR','Guarda','MEU JOGO. Lasso numa manga + pe na outra alca. Quebra a postura dele. Quando ele anda pra passar, troca pro gancho de DLR. A aranha ALIMENTA a DLR.','',2),
  (uid,'⭐ Knee Slice com Ancora (congela 3s)','Passagem','MEU AJUSTE Nº1. Depois do knee slice: crossface + underhook + joelho colado no chao. CONGELA 3 segundos, sente o peso, so DEPOIS avanca pra montada. Estabilizar vale mais que correr pra finalizacao.','',2),
  (uid,'⭐ Toureando → Costas','Passagem','MEU JOGO. No toureando, quando ele vira de quatro ou te da o lado, nao insiste por cima: pega as costas. Maos no cinto/pescoco, primeiro gancho, depois o segundo.','',2),
  (uid,'⭐ Costas Blindadas — Cinto + Triângulo de Corpo → Mata-leão','Finalização','Sequencia fixa: 1) Cinto de seguranca. 2) Fecha o TRIANGULO DE CORPO (pernas longas favorecem). 3) Briga de mao 2-contra-1 ate tirar a defesa. 4) Encaixa o mata-leao. Nunca ataca o pescoco antes de travar o controle.','',1),
  (uid,'⭐ Postura Blindada na Guarda (anti-ezequiel/guilhotina)','Defesa','Dentro da guarda fechada dele: queixo pra DENTRO, coluna ERETA, nunca estica a cabeca pra frente (vicio de boxeador). Maos: uma no quadril, uma na lapela, cotovelos colados. Cabeca erguida = sem estrangulamento.','',1);

  END IF;

  -- ===== Conquistas já desbloqueadas =====
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-21'
   WHERE user_id=uid AND key IN ('first_log','first_roll','train_brown','first_sub','triangle');
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-22'
   WHERE user_id=uid AND key IN ('train_white','beat_white','armlock','omoplata','take_back','chain');
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-23'
   WHERE user_id=uid AND key IN ('train_blue','train_black','streak_3','first_week','survive_black','takedown','two_blacks');
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-29'
   WHERE user_id=uid AND key IN (
    'vol_train_1','vol_train_5','streak_days_2','streak_days_3','rolls_total_10',
    'months_active_1','months_active_3','months_active_6',
    'partner_white_1','partner_white_5','partner_blue_1','partner_brown_1','partner_black_1',
    'sub_omoplatab_1','sub_triangulob_1','sub_armlockb_1','sub_katagatame_1','sub_lapela_1',
    'firstsub_white','pass_kneeslice_1','pass_toureando_1','td_single_1',
    'pos_mount_1','pos_back_1','pos_sidec_1','esc_montada_1',
    'life_first_gi','life_night','edu_help_beginner','analyses_1','videos_1','no_pass_black');

  -- ===== Progresso inicial das barras =====
  UPDATE achievements SET progress=LEAST(target,6) WHERE user_id=uid AND (key LIKE 'vol_train_%' OR key LIKE 'vol_gi_%');
  UPDATE achievements SET progress=LEAST(target,20) WHERE user_id=uid AND (key LIKE 'rolls_total_%' OR key LIKE 'spar_%');
  UPDATE achievements SET progress=LEAST(target,6) WHERE user_id=uid AND key LIKE 'hours_%';
  UPDATE achievements SET progress=LEAST(target,4) WHERE user_id=uid AND key LIKE 'streak_days_%';
  UPDATE achievements SET progress=LEAST(target,8) WHERE user_id=uid AND key LIKE 'months_active_%';
  UPDATE achievements SET progress=target WHERE user_id=uid AND unlocked=true AND target IS NOT NULL;

  RAISE NOTICE 'Dados pessoais migrados para o usuário %', uid;
END $$;

-- ############### 006_backfill_historico.sql ###############
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

-- ############### 005_checkin_2026-07-29.sql ###############
-- ============================================================
-- TATAME — Check-in 29/07: atualiza METAS, PLANO e DOMÍNIO
-- Aplica o que os treinos de 21–28/07 comprovam.
-- Seguro rodar mais de uma vez.
-- ============================================================
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado. Crie sua conta no app primeiro.';
  END IF;

  -- Garante os 3 pontos fracos base (caso o app ainda não os tenha criado)
  INSERT INTO weak_points (user_id,label,score,history)
  SELECT uid, l, 2, '[]'::jsonb
  FROM (VALUES ('Jogo em pé / quedas'),('Defesa de costas'),('Forçar pegadas')) v(l)
  WHERE NOT EXISTS (SELECT 1 FROM weak_points w WHERE w.user_id=uid AND w.label=v.l);

  -- ===== METAS: notas dos pontos fracos (com histórico p/ o gráfico) =====
  -- Jogo em pé: 1 -> 3 (ganhou single contra preta; evitou puxada 2x e passou pra lateral)
  UPDATE weak_points SET score=3,
    history = history || jsonb_build_array(jsonb_build_object('date','2026-07-29','score',3))
   WHERE user_id=uid AND label='Jogo em pé / quedas' AND score < 3;

  -- Forçar pegadas: 2 -> 3 (puxada armada funcionou; DLR com pegadas montadas)
  UPDATE weak_points SET score=3,
    history = history || jsonb_build_array(jsonb_build_object('date','2026-07-29','score',3))
   WHERE user_id=uid AND label='Forçar pegadas' AND score < 3;

  -- Defesa de costas: fica em 2 (sem evidência de escape das costas ainda)
  UPDATE weak_points SET score=2,
    history = history || jsonb_build_array(jsonb_build_object('date','2026-07-29','score',2))
   WHERE user_id=uid AND label='Defesa de costas';

  -- ===== METAS: dois pontos fracos novos que apareceram nos dados =====
  INSERT INTO weak_points (user_id,label,score,history)
  SELECT uid,'Consolidar depois de passar',1,
         jsonb_build_array(jsonb_build_object('date','2026-07-29','score',1))
  WHERE NOT EXISTS (SELECT 1 FROM weak_points WHERE user_id=uid AND label='Consolidar depois de passar');

  INSERT INTO weak_points (user_id,label,score,history)
  SELECT uid,'Defesa de braço (armlock)',1,
         jsonb_build_array(jsonb_build_object('date','2026-07-29','score',1))
  WHERE NOT EXISTS (SELECT 1 FROM weak_points WHERE user_id=uid AND label='Defesa de braço (armlock)');

  -- ===== PLANO: marca os itens que os treinos comprovam =====
  UPDATE plan_weeks SET items = (
    SELECT jsonb_agg(
      CASE WHEN elem->>'label' IN (
        -- Semana 1 — retenção
        'Enfrentar o passador (nunca dar as costas)',
        '3 rolos focando só em não passar',
        -- Semana 3 — De La Riva
        'Drill entrada DLR — 20 reps por lado',
        'Pegada tornozelo + gola/manga',
        -- Semana 4 — DLR para as costas
        'Rotação para pegar costas com gancho',
        -- Semana 8 — integração
        'Registrar aprendizados no diário'
      ) THEN jsonb_set(elem,'{done}','true'::jsonb) ELSE elem END
      ORDER BY ord
    )
    FROM jsonb_array_elements(items) WITH ORDINALITY AS a(elem, ord)
  )
  WHERE user_id=uid;

  -- ===== TÉCNICAS: nota de domínio conforme o que funcionou no rolo =====
  UPDATE techniques SET mastery=2
   WHERE user_id=uid AND name='⭐ Entrada — Single do Boxeador' AND mastery < 2;
  UPDATE techniques SET mastery=3
   WHERE user_id=uid AND name='⭐ Puxada Armada → De La Riva' AND mastery < 3;
  UPDATE techniques SET mastery=2
   WHERE user_id=uid AND name='⭐ Postura Blindada na Guarda (anti-ezequiel/guilhotina)' AND mastery < 2;
  -- Knee Slice com Âncora e Costas Blindadas ficam como estão: os furos da semana.

  RAISE NOTICE 'Metas, plano e dominio atualizados para o check-in de 29/07.';
END $$;

-- ############### RELATÓRIO FINAL ###############
SELECT 'Treinos' AS item, count(*)::text AS valor FROM trainings
UNION ALL SELECT 'Análises', count(*)::text FROM analyses
UNION ALL SELECT 'Técnicas', count(*)::text FROM techniques
UNION ALL SELECT 'Semanas do plano', count(*)::text FROM plan_weeks
UNION ALL SELECT 'Metas (pontos fracos)', count(*)::text FROM weak_points
UNION ALL SELECT 'Conquistas', count(*)::text FROM achievements
UNION ALL SELECT 'Conquistas desbloqueadas', count(*)::text FROM achievements WHERE unlocked
UNION ALL SELECT 'Rolas acumuladas', coalesce(sum(rolls),0)::text FROM trainings
UNION ALL SELECT 'Horas de tatame', floor(coalesce(sum(duration_min),0)/60.0)::text FROM trainings
UNION ALL SELECT 'Início da jornada', goal_start::text FROM profiles;
