-- ============================================================
-- TATAME — DIAGNÓSTICO (só leitura, não altera nada)
-- Cole no SQL Editor, clique em Run e me mande o resultado.
-- ============================================================
SELECT
  u.email                                                      AS "email",
  to_char(u.created_at,'DD/MM/YYYY HH24:MI')                    AS "criado em",
  (SELECT count(*) FROM public.trainings    t WHERE t.user_id=u.id) AS "treinos",
  (SELECT count(*) FROM public.analyses     a WHERE a.user_id=u.id) AS "analises",
  (SELECT count(*) FROM public.techniques   c WHERE c.user_id=u.id) AS "tecnicas",
  (SELECT count(*) FROM public.plan_weeks   p WHERE p.user_id=u.id) AS "plano",
  (SELECT count(*) FROM public.weak_points  w WHERE w.user_id=u.id) AS "metas",
  (SELECT count(*) FROM public.achievements h WHERE h.user_id=u.id) AS "conquistas",
  (SELECT count(*) FROM public.profiles     f WHERE f.user_id=u.id) AS "perfil",
  (SELECT max(goal_start)::text FROM public.profiles f WHERE f.user_id=u.id) AS "inicio jornada"
FROM auth.users u
ORDER BY u.created_at;
