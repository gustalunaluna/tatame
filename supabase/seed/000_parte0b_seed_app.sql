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
