-- ============================================================================
-- 037 — chave_da_tecnica ganha search_path fixo
-- ============================================================================
-- O linter do Supabase (0011_function_search_path_mutable) apontava esta como a
-- única função do esquema sem `search_path` fixo.
--
-- O risco é real mesmo numa função tão boba quanto esta: sem `search_path`
-- fixo, quem chama escolhe em qual esquema os nomes são resolvidos. Como ela é
-- usada em índice e em comparação de nome de técnica, uma sessão com o
-- search_path apontado para um esquema plantado poderia trocar o `lower` ou o
-- `translate` por outra coisa e mudar o resultado.
--
-- O corpo não muda uma vírgula — só o `set search_path`.
-- ============================================================================

create or replace function public.chave_da_tecnica(nome text)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select lower(
    btrim(
      translate(
        coalesce(nome, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      )
    )
  );
$$;
