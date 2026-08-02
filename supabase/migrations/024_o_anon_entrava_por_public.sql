-- ============================================================================
-- 024 — O `anon` não entrava por `anon`. Entrava por `PUBLIC`.
-- ============================================================================
-- A 017 varreu o catálogo inteiro procurando função que o `anon` pudesse
-- executar e revogou de todas. Rodou sem erro, e não fechou nada:
--
--   proacl de registros_a_confirmar()
--   {=X/postgres, postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
--    ^^^^^^^^^^^
--    o "=X" sem nome antes do "=" é o PUBLIC
--
-- `anon` nunca teve concessão própria. Ele executava porque é membro de
-- `PUBLIC`, e `revoke ... from anon` não tira o que veio por `PUBLIC` — tira
-- uma concessão que não existia, e termina com sucesso.
--
-- É o espelho exato do erro que a 017 foi escrita para corrigir. Lá, `revoke
-- ... from public` tinha deixado o `anon` de pé por concessão direta; aqui,
-- `revoke ... from anon` deixou o `PUBLIC` de pé. As duas metades precisam ser
-- revogadas, sempre, e o teste tem que ser `has_function_privilege`, que é o
-- único que enxerga os dois caminhos.
--
-- O que ficou aberto, verificado no banco:
--
--   registros_a_confirmar()      SECURITY DEFINER, chamável sem login
--   pode_ser_instrutor(text)     inofensiva, mas sem motivo para estar aberta
--   update_updated_at_column()   um GATILHO, exposto como RPC
--
-- Antes de revogar, esta migração GARANTE a concessão explícita ao
-- `authenticated` de tudo que ele hoje consegue executar. Sem isso, tirar o
-- `PUBLIC` derrubaria junto qualquer função em que o acesso do usuário logado
-- vinha só por ali — o app inteiro cairia num deploy silencioso.
-- ============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as logado_usa
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    -- Primeiro segura quem tem direito, depois derruba a porta.
    if f.logado_usa then
      execute format('grant execute on function %s to authenticated', f.assinatura);
    end if;
    execute format('revoke execute on function %s from public', f.assinatura);
    execute format('revoke execute on function %s from anon', f.assinatura);
  end loop;
end $$;

-- A trava para o futuro tinha o mesmo furo: só revogava de `anon`, e função
-- nova nasce com EXECUTE para PUBLIC. As duas linhas juntas é que fecham.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- Prova, no próprio banco: se sobrou uma, a migração falha aqui em vez de
-- passar verde e deixar o buraco para o auditor achar de novo.
do $$
declare aberta text;
begin
  select string_agg(p.oid::regprocedure::text, ', ')
    into aberta
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if aberta is not null then
    raise exception 'anon ainda executa: %', aberta;
  end if;
end $$;
