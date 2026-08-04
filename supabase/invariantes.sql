-- ============================================================================
-- Invariantes do banco — o que precisa ser verdade depois de toda migração
-- ============================================================================
-- Por que este arquivo existe:
--
-- A migração 024 fechou a porta que deixava o papel `anon` executar funções em
-- `public`. Meses depois, uma função nova nasceu aberta de novo — a trava valia
-- para o que existia naquele dia, não para o que viria. Ninguém percebeu,
-- porque as 29 suítes rodam contra o navegador e nenhuma delas olha o banco.
--
-- Uma regra que depende de alguém lembrar não é uma regra. Este script é a
-- lembrança escrita.
--
-- COMO RODAR
--
--   psql "$SUPABASE_DB_URL" -f supabase/invariantes.sql
--
-- ou cole no SQL Editor do painel do Supabase. Precisa de credencial com
-- acesso ao catálogo (service role ou a string de conexão do projeto), e é por
-- isso que ele NÃO está dentro de `npm test`: a suíte roda sem segredo, e um
-- teste que exige segredo para passar vira um teste que todo mundo ignora.
--
-- Toda linha com `situacao = 'FALHOU'` é um defeito, não um aviso.
-- ============================================================================

with

-- 1. RLS ligada em toda tabela de public ------------------------------------
-- Uma tabela sem RLS no Supabase é pública para qualquer pessoa com a chave
-- publicável, que por design vai no navegador.
rls as (
  select
    'RLS ligada em todas as tabelas' as invariante,
    count(*) filter (where not c.relrowsecurity) as violacoes,
    coalesce(string_agg(c.relname, ', ') filter (where not c.relrowsecurity), '') as quais
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),

-- 2. o papel anon não executa nada em public --------------------------------
-- Foi exatamente isto que reabriu sozinho depois da 024.
anon_funcoes as (
  select
    'Nenhuma função de public executável por anon' as invariante,
    count(*) as violacoes,
    coalesce(string_agg(p.proname, ', '), '') as quais
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'EXECUTE')
),

-- 3. nenhuma POLÍTICA abre linha para anon ----------------------------------
-- A primeira versão desta conferência olhava `has_table_privilege('anon', …)`
-- e acusava as 20 tabelas. Era falso positivo, e vale registrar por quê: no
-- Supabase o GRANT de SELECT ao papel `anon` é o padrão de fábrica, e não
-- expõe nada sozinho — com RLS ligada e nenhuma política que aceite `anon`,
-- toda consulta desse papel volta vazia.
--
-- Quem decide o que sai da tabela é a POLÍTICA. É ela que precisa ser olhada,
-- e é a única coisa que, mudando, abre dado de verdade.
anon_politicas as (
  select
    'Nenhuma política de public aceita anon' as invariante,
    count(*) as violacoes,
    coalesce(string_agg(tablename || '.' || policyname, ', '), '') as quais
  from pg_policies
  where schemaname = 'public'
    and ('anon' = any(roles) or 'public' = any(roles))
),

-- 4. toda faixa recebe plano em todo objetivo que ela enxerga ---------------
-- `branca_inicio` é a raiz do fallback: se ela tem buraco, o buraco não é
-- coberto por ninguém. Foi assim que sete temas ficaram sem conteúdo para a
-- faixa com mais gente, sem que nada acusasse.
niveis(nivel) as (
  values ('branca_inicio'),('branca_avancada'),('azul'),
         ('azul_avancada'),('roxa'),('marrom'),('preta')
),
visiveis as (
  select n.nivel, o.slug
  from niveis n
  cross join public.plan_objectives o
  where o.ativo
    and (o.faixa_min = 'Branca' or n.nivel not like 'branca%')
),
resolvidos as (
  select distinct on (v.nivel, v.slug) v.nivel, v.slug
  from visiveis v
  cross join lateral unnest(public.niveis_de_fallback(v.nivel))
    with ordinality as f(nivel_alvo, ord)
  join public.plan_templates t
    on t.objective_slug = v.slug
   and t.nivel = f.nivel_alvo
   and t.variante = ''
   and t.ativo
  order by v.nivel, v.slug, f.ord
),
plano as (
  select
    'Todo nível resolve plano em todo objetivo visível' as invariante,
    count(*) as violacoes,
    coalesce(string_agg(v.nivel || '/' || v.slug, ', '), '') as quais
  from visiveis v
  left join resolvidos r on r.nivel = v.nivel and r.slug = v.slug
  where r.slug is null
),

-- 5. o questionário de boas-vindas continua alcançável ----------------------
-- A coluna existiu por meses sem tela nenhuma que a preenchesse. Se uma conta
-- REAL e NOVA passar pelo cadastro e sair sem responder, a tela quebrou ou o
-- fluxo deixou de passar por ela.
--
-- Duas ressalvas viraram condição, e as duas custaram um alarme falso antes de
-- serem escritas:
--
--   · `demonstracao`, e não `seeded`. As 101 contas têm `seeded = true`, que só
--     quer dizer "o seed de técnicas já rodou aqui" — vale para toda conta que
--     abriu o app uma vez. Usar isso como marca de conta de teste dava zero
--     contas reais e uma conferência que nunca conferia nada.
--
--   · a data de corte. A única conta real nasceu em 30/07, e o questionário só
--     passou a existir na migração 029, em 03/08. Cobrar dela uma resposta que
--     não tinha onde ser dada é acusar o passado.
questionario as (
  select
    'Conta real criada após o questionário respondeu' as invariante,
    count(*) as violacoes,
    coalesce(string_agg(left(user_id::text, 8), ', '), '') as quais
  from public.profiles
  where not demonstracao
    and created_at > timestamptz '2026-08-03'
    and questionario_em is null
)

select invariante,
       case when violacoes = 0 then 'ok' else 'FALHOU' end as situacao,
       violacoes,
       quais
from (
  select * from rls
  union all select * from anon_funcoes
  union all select * from anon_politicas
  union all select * from plano
  union all select * from questionario
) t
order by (violacoes > 0) desc, invariante;

-- ============================================================================
-- Consultas soltas — não são invariantes, são as perguntas que se faz
-- ============================================================================
-- Quantas pessoas de verdade existem, e o que elas fizeram.
--
--   select count(*) filter (where not demonstracao) as reais,
--          count(*) filter (where demonstracao)     as demonstracao
--     from public.profiles;
--
-- Quem é real, e quando entrou pela última vez. `auth.users` é a fonte do
-- login; `profiles.created_at` não serve para ordenar, porque as contas
-- semeadas foram criadas todas no mesmo microssegundo.
--
--   select u.email, u.created_at, u.last_sign_in_at, p.nickname, p.belt
--     from public.profiles p
--     join auth.users u on u.id = p.user_id
--    where not p.demonstracao
--    order by u.last_sign_in_at desc nulls last;
--
-- Para marcar uma conta nova como demonstração:
--
--   update public.profiles set demonstracao = true where handle = '<handle>';
-- ============================================================================
