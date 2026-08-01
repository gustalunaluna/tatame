-- ============================================================================
-- 017 — Fecha o `anon` em bloco, e trava para o futuro
-- ============================================================================
-- Nenhuma tela do app funciona sem login. Mas toda função em `public` fica
-- exposta em `/rest/v1/rpc`, e o Supabase concede EXECUTE ao papel `anon` por
-- PRIVILÉGIO PADRÃO — então cada função nova nasce aberta até alguém lembrar
-- de fechar. As migrações 005 e 011 fecharam listas nomeadas; o buraco é que
-- a lista precisa ser atualizada à mão toda vez.
--
-- O auditor do Supabase encontrou três que escaparam:
--
--   registros_a_confirmar()      SECURITY DEFINER, chamável sem login
--   pode_ser_instrutor(text)     inofensiva, mas sem motivo para estar aberta
--   update_updated_at_column()   um GATILHO, exposto como RPC
--
-- A terceira é a que importa: é exatamente a classe que a 005 existia para
-- fechar, e voltou porque a defesa era uma lista, não uma regra.
-- ============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format('revoke execute on function %s from anon', f.assinatura);
  end loop;
end $$;

-- A trava: função nova em `public` já nasce fechada para `anon`. Sem isto, o
-- próximo `create function` reabre o buraco sozinho.
alter default privileges in schema public revoke execute on functions from anon;
