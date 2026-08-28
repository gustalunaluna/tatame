-- ============================================================================
-- 040 — O exame de faixa passa a ter escopo
-- ============================================================================
-- A folha Azul → Roxa da Team Thomé / Barbosa não cobra a mesma coisa de todo
-- mundo. Ela é explícita:
--
--   "O exame de 1º e 2º grau será exigido o conhecimento das posições de 01 a
--    18, para o 3º e 4º graus o conhecimento das posições de 19 a 36. (...)
--    Para o exame de faixa será exigido o conhecimento de todas as posições."
--
-- Ou seja, um azul liso e um azul 3 graus fazem provas DIFERENTES do mesmo
-- syllabus. Sem guardar qual deles o exame era, um exame de 14 perguntas
-- salvo hoje viraria amanhã "um exame de faixa incompleto" na tela — e o
-- placar mediria a pessoa contra uma prova que ela nunca fez.
--
-- POR QUE TEXTO E NÃO ENUM
--
-- O escopo é rótulo da folha da academia, não conceito do app: se a Team
-- Thomé reorganizar os blocos, ou se a folha da marrom dividir de outro jeito,
-- um enum obrigaria migração para cada mudança de papel. O CHECK fica em
-- `escoposDaFaixa` (src/lib/exame-de-faixa.ts), onde já está a lista.
--
-- O DEFAULT NÃO É ARBITRÁRIO
--
-- Todo exame que existe hoje no banco é branca → azul, e a folha da azul tem
-- um escopo só: o exame de faixa inteiro. Então o default rotula corretamente
-- o passado, sem precisar adivinhar nada.
--
-- Idempotente.
-- ============================================================================

alter table public.exames_de_faixa
  add column if not exists escopo text not null default 'Exame de faixa';

comment on column public.exames_de_faixa.escopo is
  'O que a folha da academia cobra neste exame: "1º e 2º grau", "3º e 4º grau" ou "Exame de faixa". Ver escoposDaFaixa() em src/lib/exame-de-faixa.ts.';
