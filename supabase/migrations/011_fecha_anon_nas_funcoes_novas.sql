-- 011 — Fecha o `anon` nas funções e tabelas das migrações 006 a 010.
--
-- O erro foi meu e vale registrar: escrevi `revoke all on function ... from
-- public` achando que isso bastava. Não basta. No Supabase o papel `anon`
-- recebe EXECUTE por privilégio padrão (`alter default privileges`), que é uma
-- concessão dele mesmo — revogar de PUBLIC não a toca. As funções das
-- migrações anteriores só apareciam no advisor como "authenticated pode
-- executar" porque tinham revoke explícito de anon; as minhas apareceram como
-- "anon pode executar", que é outra coisa.
--
-- O que estava exposto, e o que não estava: as funções de escrita não eram
-- exploráveis, porque todas começam por `auth.uid()` e param em "Sem sessão"
-- ou não casam com nenhuma linha. As de leitura, sim: `medalhas_do_atleta`,
-- `historico_de_graduacao` e os resumos devolviam dados de perfil para quem
-- tem só a chave publicável e nunca entrou no app. São dados que qualquer
-- usuário logado veria de qualquer forma, mas "logado" sempre foi a fronteira
-- pretendida — e é ela que este arquivo restabelece.
--
-- Idempotente.

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.dias_para_contestar(text, timestamptz)',
    'public.tp_vale(text, timestamptz)',
    'public.resumo_parceiros()',
    'public.registros_a_confirmar()',
    'public.recalcular_conquistas()',
    'public.semear_conquistas()',
    'public.salvar_parceiros_do_treino(uuid, jsonb)',
    'public.parceiros_do_treino(uuid)',
    'public.medalhas_do_atleta(text, boolean, integer, integer)',
    'public.resumo_medalhas_do_atleta(text)',
    'public.medalhas_da_equipe(text, integer, integer)',
    'public.resumo_medalhas_da_equipe(text)',
    'public.ocultar_medalha_da_equipe(uuid, boolean)',
    'public.historico_de_graduacao(text)',
    'public.perfil_equipe(text)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from anon', f);
    end if;
  end loop;
end $$;

-- As tabelas novas seguem a mesma regra. A política já dizia `to authenticated`,
-- mas o GRANT de tabela é uma camada anterior à política: sem ele revogado, o
-- PostgREST ainda anuncia a tabela para o papel anônimo.
revoke all on table public.medals from anon;
revoke all on table public.graduations from anon;
revoke all on table public.achievement_catalog from anon;
