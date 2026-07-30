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
