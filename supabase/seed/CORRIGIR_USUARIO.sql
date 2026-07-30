-- ============================================================
-- TATAME — Move os dados para o SEU usuário
-- Use se o app aparecer vazio: os dados foram para outro usuário.
--
--  >>> EDITE A LINHA DO EMAIL ABAIXO com o e-mail que você usa
--      para entrar no app, depois cole tudo no SQL Editor e Run.
--
-- Seguro: se o seu usuário JÁ tiver os dados, o script não faz nada.
-- ============================================================
DO $$
DECLARE
  meu_email text := 'COLOQUE_SEU_EMAIL_AQUI';   -- <<<<<< EDITE AQUI
  destino uuid;
  n int;
BEGIN
  SELECT id INTO destino FROM auth.users WHERE lower(email) = lower(trim(meu_email));

  IF destino IS NULL THEN
    RAISE EXCEPTION 'Nao encontrei usuario com o e-mail "%". E-mails cadastrados: %',
      meu_email, (SELECT string_agg(email, ' | ') FROM auth.users);
  END IF;

  SELECT count(*) INTO n FROM public.trainings WHERE user_id = destino;
  IF n > 10 THEN
    RAISE NOTICE 'O usuario % ja tem % treinos. Nada a mover — o problema e outro.', meu_email, n;
    RETURN;
  END IF;

  -- Limpa o seed automatico do destino (dados padrao) para abrir espaco
  DELETE FROM public.plan_weeks   WHERE user_id = destino;
  DELETE FROM public.weak_points  WHERE user_id = destino;
  DELETE FROM public.techniques   WHERE user_id = destino;
  DELETE FROM public.achievements WHERE user_id = destino;
  DELETE FROM public.analyses     WHERE user_id = destino;
  DELETE FROM public.trainings    WHERE user_id = destino;
  DELETE FROM public.profiles     WHERE user_id = destino;

  -- Move tudo que estava no usuario errado
  UPDATE public.trainings    SET user_id = destino WHERE user_id <> destino;
  UPDATE public.analyses     SET user_id = destino WHERE user_id <> destino;
  UPDATE public.techniques   SET user_id = destino WHERE user_id <> destino;
  UPDATE public.plan_weeks   SET user_id = destino WHERE user_id <> destino;
  UPDATE public.weak_points  SET user_id = destino WHERE user_id <> destino;
  UPDATE public.achievements SET user_id = destino WHERE user_id <> destino;
  UPDATE public.profiles     SET user_id = destino WHERE user_id <> destino;

  SELECT count(*) INTO n FROM public.trainings WHERE user_id = destino;
  RAISE NOTICE 'Pronto: % treinos agora pertencem a %.', n, meu_email;
END $$;

-- Confirmação
SELECT u.email,
       (SELECT count(*) FROM public.trainings    t WHERE t.user_id=u.id) AS treinos,
       (SELECT count(*) FROM public.achievements h WHERE h.user_id=u.id) AS conquistas,
       (SELECT count(*) FROM public.achievements h WHERE h.user_id=u.id AND h.unlocked) AS desbloqueadas
FROM auth.users u ORDER BY u.created_at;
