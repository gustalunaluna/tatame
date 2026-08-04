-- ============================================================================
-- 035 — O avatar saiu do app; a coluna fica
-- ============================================================================
-- A funcionalidade de avatar (migração 034) foi removida a pedido. Todo o
-- código saiu: catálogo de peças, os dois renderizadores, o editor, a tela
-- dedicada e a suíte de teste.
--
-- `profiles.avatar` NÃO é derrubada, e a razão é uma linha:
--
--   um perfil chegou a salvar um avatar antes da remoção.
--
-- Derrubar a coluna é o único passo irreversível de toda a remoção — o código
-- volta de um `git revert`, o dado não volta de lugar nenhum. Uma coluna jsonb
-- dormente com uma linha preenchida não custa consulta, não custa índice e não
-- aparece em tela nenhuma; apagar o que alguém montou, para economizar isso,
-- seria uma troca ruim.
--
-- Ela fica marcada como órfã para o próximo que abrir o esquema não procurar o
-- código que a lê — não existe mais.
--
-- PARA DERRUBAR DE VEZ, quando não fizer mais falta:
--
--   alter table public.profiles drop column avatar;
-- ============================================================================

comment on column public.profiles.avatar is
  'ÓRFÃ desde a migração 035: o avatar foi removido do app e nenhum código lê ou grava esta coluna. Mantida porque um perfil tinha dado salvo. Pode ser derrubada quando não fizer falta.';
