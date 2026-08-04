-- ============================================================================
-- 033 — Conta real e conta de demonstração deixam de ser a mesma coisa
-- ============================================================================
-- Não havia como responder "quantas pessoas de verdade usam o app". Eu mesmo
-- venho usando `seeded = true` como se fosse a marca de conta de teste nesta
-- série de mudanças, e ESTÁ ERRADO:
--
--   `seeded` = "as técnicas iniciais já foram plantadas nesta conta"
--
-- É a trava de idempotência de `ensureSeeded` (src/lib/bjj-storage.ts): quem
-- tem `seeded = true` não recebe o seed de novo. Vale para TODA conta que já
-- abriu o app uma vez, real ou não — e por isso as 101 estão marcadas,
-- inclusive a única que é de gente.
--
-- A consequência prática do engano: virar `seeded` para false numa conta real
-- para "desmarcá-la como teste" faria o app replantar 23 técnicas duplicadas
-- na próxima abertura.
--
-- Daí a coluna nova. Uma pergunta, uma coluna.
--
-- COMO AS 101 SE DIVIDEM
--
--   69  @gracie.test   — alunos da academia de demonstração. `.test` é TLD
--                        reservado pela RFC 2606: não resolve, não existe, e
--                        por isso é o domínio certo para dado fabricado
--   31  @tatame.app    — contas de teste no domínio do próprio app
--    1  @hotmail.com   — a única conta de uma pessoa
--
-- O PADRÃO É `false`, de propósito
--
-- Quem se cadastrar amanhã é real até que se diga o contrário. Marcar
-- demonstração é ato deliberado, não classificação por heurística de e-mail —
-- a regra de domínio abaixo serve para arrumar o passado, uma vez só, e não
-- fica valendo para o futuro.
-- ============================================================================

alter table public.profiles
  add column if not exists demonstracao boolean not null default false;

comment on column public.profiles.demonstracao is
  'true = conta fabricada para demonstrar ou testar o app. NÃO confundir com `seeded`, que só diz se o seed inicial de técnicas já rodou. Contas novas nascem false.';

comment on column public.profiles.seeded is
  'Trava de idempotência do seed inicial de técnicas (ensureSeeded). NÃO indica conta de teste — para isso existe `demonstracao`.';

-- Arruma o passado pelo domínio do e-mail. Roda uma vez; daqui em diante a
-- coluna é preenchida por quem cria a conta de demonstração.
update public.profiles p
   set demonstracao = true
  from auth.users u
 where u.id = p.user_id
   and (u.email like '%@gracie.test' or u.email like '%@tatame.app');

-- Índice parcial: as consultas que interessam ("quantas contas reais",
-- "listar só gente") filtram por demonstracao = false, que é a minoria hoje e
-- a maioria depois. O parcial cobre os dois lados sem indexar o que não se
-- consulta.
create index if not exists profiles_reais_idx
  on public.profiles (created_at desc)
  where not demonstracao;
