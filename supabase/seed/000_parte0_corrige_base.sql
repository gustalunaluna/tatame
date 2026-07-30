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
