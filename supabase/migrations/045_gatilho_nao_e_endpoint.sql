-- ============================================================================
-- 045 — Função de gatilho não é endpoint
-- ============================================================================
-- O PostgREST publica como rota qualquer função do schema `public` que o papel
-- tenha permissão de executar — inclusive as que existem só para rodar dentro
-- de um gatilho. Três escaparam:
--
--   lutas_atualiza_cartel          executável por ANÔNIMO (sem login)
--   master_links_guarda_situacao   executável por qualquer logado
--   update_updated_at_column       executável por qualquer logado
--
-- Todas são `security definer` e retornam `trigger`. Chamadas por fora do
-- gatilho elas quebram ou fazem coisa que ninguém pediu, e a primeira estava
-- exposta SEM AUTENTICAÇÃO — qualquer um com a chave pública podia bater em
-- /rest/v1/rpc/lutas_atualiza_cartel.
--
-- Tirar o EXECUTE não afeta os gatilhos: o Postgres não confere essa permissão
-- quando dispara um gatilho, só quando alguém chama a função pelo nome. É
-- exatamente o que as outras nove funções de gatilho deste banco já fazem —
-- estas três é que ficaram para trás.
revoke execute on function public.lutas_atualiza_cartel() from public, anon, authenticated;
revoke execute on function public.master_links_guarda_situacao() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
