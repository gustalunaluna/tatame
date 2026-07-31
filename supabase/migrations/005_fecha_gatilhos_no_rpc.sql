-- 005 — Fecha as funções de gatilho que estavam abertas no /rest/v1/rpc.
--
-- O problema: uma função de gatilho não é chamada por ninguém a não ser o
-- próprio Postgres, quando a linha muda. Mas ela é uma função como outra
-- qualquer, e o PostgREST publica toda função do schema `public` em
-- /rest/v1/rpc/<nome>. Como o padrão do Postgres é conceder EXECUTE a
-- `public`, essas cinco estavam chamáveis pela rede — duas delas até por
-- `anon`, ou seja, por qualquer pessoa com a chave publicável, que é pública
-- de propósito.
--
-- Chamar uma função de gatilho fora de um gatilho normalmente só levanta erro
-- ("trigger functions can only be called as triggers"), mas não é lugar de
-- apostar: a superfície não tem por que existir. Nenhuma delas precisa de
-- EXECUTE para funcionar — o gatilho roda com o dono da função.
--
-- Junto: `nivel_do_usuario` e `niveis_de_fallback` ficaram com search_path
-- fixo. São as duas únicas funções do schema que ainda tinham search_path
-- mutável, o que permite sequestrar a resolução de nomes de dentro da sessão
-- que as chama.
--
-- Idempotente.

-- ---------------------------------------------------------------------------
-- 1. As funções de gatilho saem do alcance da rede
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.tp_exige_parceria()',
    'public.tp_faixa_trigger()',
    'public.tp_confirmacao_trigger()',
    'public.teams_slug_trigger()',
    'public.limitar_feito()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. search_path fixo nas duas funções que faltavam
-- ---------------------------------------------------------------------------
-- Ambas são puras: recebem texto, devolvem texto, não tocam em tabela. Por
-- isso `pg_catalog` basta — não precisam enxergar `public`.
alter function public.nivel_do_usuario(text, integer) set search_path = pg_catalog;
alter function public.niveis_de_fallback(text)        set search_path = pg_catalog;
