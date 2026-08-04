-- ============================================================================
-- 034 — O avatar do atleta
-- ============================================================================
-- Retrato desenhado, para quem não quer mandar foto. Guarda escolha de pele,
-- cabelo, barba, olhos, cor de kimono e patches.
--
-- UMA COLUNA jsonb, E NÃO OITO COLUNAS
--
-- O avatar é lido e gravado sempre inteiro, nunca por parte: ninguém consulta
-- "quantas pessoas usam cabelo cacheado", e nenhuma tela mostra só os olhos.
-- Não há junção, não há filtro, não há ordenação por nada disso. Um campo que
-- só se lê junto não ganha nada sendo oito colunas — ganha oito migrações toda
-- vez que aparecer uma peça nova.
--
-- O preço do jsonb é não ter validação no banco. Quem valida é `lerAvatar` em
-- design/avatar.ts, e ele valida na LEITURA: cada campo cai no padrão quando o
-- valor não é reconhecido. É o que permite acrescentar ou aposentar um estilo
-- de cabelo sem migração e sem quebrar a tela de quem tinha o antigo.
--
-- A FAIXA NÃO ESTÁ AQUI
--
-- O avatar não guarda faixa. Ela vem de `profiles.belt` e `profiles.degrees`,
-- e é desenhada como o aro do retrato. Guardar faixa no avatar criaria um
-- segundo lugar onde a graduação existe — e um deles seria escolha livre, o
-- que desmente a migração 032, que acabou de exigir confirmação do mestre para
-- um simples vínculo.
-- ============================================================================

alter table public.profiles
  add column if not exists avatar jsonb not null default '{}'::jsonb;

comment on column public.profiles.avatar is
  'Escolhas do retrato desenhado: pele, cabelo, barba, olhos, kimono e patches. NÃO guarda faixa — ela vem de belt/degrees. Validado na leitura por lerAvatar().';
