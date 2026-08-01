-- ============================================================================
-- 018 — Índice em toda chave estrangeira
-- ============================================================================
-- Chave estrangeira sem índice custa duas vezes: no JOIN e, pior, no DELETE do
-- lado pai — o Postgres varre a tabela filha inteira para checar as
-- referências.
--
-- Com 101 contas isso não aparece. Com a base cheia, aparece na forma mais
-- difícil de diagnosticar: um DELETE que fica lento sozinho, sem ninguém ter
-- mudado nada. Duas destas são as que a linhagem usa.
-- ============================================================================

create index if not exists graduations_mestre_idx
  on public.graduations (mestre_id) where mestre_id is not null;
create index if not exists graduations_team_idx
  on public.graduations (team_id) where team_id is not null;
create index if not exists master_links_team_idx
  on public.master_links (team_id) where team_id is not null;
create index if not exists plan_cycles_objetivo_idx
  on public.plan_cycles (objective_slug);
create index if not exists plan_cycles_template_idx
  on public.plan_cycles (template_id);
create index if not exists plan_templates_criador_idx
  on public.plan_templates (created_by);
create index if not exists weak_points_objetivo_idx
  on public.weak_points (objective_slug);
