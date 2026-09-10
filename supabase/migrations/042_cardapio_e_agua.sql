-- ============================================================================
-- 042 — O cardápio, a água e as metas escritas na mão
-- ============================================================================
-- A migração 041 deu à dieta o registro do que aconteceu. Esta dá o PLANO, e a
-- diferença entre as duas é a diferença entre um caderno e uma rotina.
--
-- POR QUE PLANO E FATO SÃO TABELAS SEPARADAS
--
-- `cardapio_itens` é o que está planejado comer em cada momento do dia, escrito
-- uma vez e válido todos os dias. `refeicoes` (041) continua sendo o que de
-- fato entrou na boca, num dia específico.
--
-- Juntar as duas obrigaria a copiar o cardápio inteiro para cada data do
-- calendário — inclusive as que ainda não chegaram — e a decidir o que fazer
-- quando o plano mudasse: reescrever o passado, ou conviver com dias antigos
-- apontando para um cardápio que não existe mais. Separadas, o plano muda sem
-- tocar em nenhum dia já vivido.
--
-- O VÍNCULO, E O QUE ELE PERMITE
--
-- `refeicoes.cardapio_item_id` diz a QUE ITEM DO PLANO aquela refeição
-- responde. É ele que faz o check diário funcionar sem inventar dado novo:
--
--   marcou "comi"     → nasce uma refeição igual ao item, apontando para ele
--   marcou "troquei"  → nasce uma refeição DIFERENTE, apontando para o mesmo
--                        item; o app compara os nomes e sabe que houve troca
--   não marcou nada   → não existe refeição; o item fica aberto
--
-- Trocar não é falha, é o caso normal — a marmita acabou, o restaurante
-- fechou. Um app que só oferece "comi" e "não comi" ensina a pessoa a mentir
-- no primeiro dia em que a vida não seguiu o plano.
--
-- `on delete set null`: apagar um item do cardápio não pode apagar o registro
-- de uma refeição que a pessoa realmente comeu. O vínculo se perde, o fato
-- fica.
--
-- Idempotente.
-- ============================================================================

/* --- 1. o cardápio -------------------------------------------------------- */
create table if not exists public.cardapio_itens (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  momento        text not null default '',
  alimento       text not null,
  porcao         text not null default '',
  kcal           integer not null default 0 check (kcal >= 0),
  proteina_g     numeric(6, 1) not null default 0 check (proteina_g >= 0),
  carboidrato_g  numeric(6, 1) not null default 0 check (carboidrato_g >= 0),
  gordura_g      numeric(6, 1) not null default 0 check (gordura_g >= 0),
  -- dentro do mesmo momento; entre momentos quem ordena é a lista MOMENTOS,
  -- que vive no código e muda sem migração
  ordem          integer not null default 0,
  created_at     timestamptz not null default now()
);

comment on table public.cardapio_itens is
  'O PLANO: o que está previsto comer em cada momento do dia. Vale todos os dias; o que aconteceu está em refeicoes.';

create index if not exists cardapio_itens_user_idx
  on public.cardapio_itens (user_id, momento, ordem);

/* --- 2. o vínculo entre o plano e o fato --------------------------------- */
alter table public.refeicoes
  add column if not exists cardapio_item_id uuid
    references public.cardapio_itens (id) on delete set null;

comment on column public.refeicoes.cardapio_item_id is
  'A que item do cardápio esta refeição responde. NULL = comeu fora do plano.';

-- Um item por dia, e só um: marcar "comi" duas vezes no mesmo almoço contaria
-- a caloria em dobro, e é um toque acidental de distância.
create unique index if not exists refeicoes_item_por_dia_idx
  on public.refeicoes (user_id, data, cardapio_item_id)
  where cardapio_item_id is not null;

/* --- 3. a água ------------------------------------------------------------ */
-- Uma linha por dia, com o total. Não uma linha por copo: o histórico de
-- horários de gole não responde nenhuma pergunta que alguém vá fazer, e
-- guardá-lo custaria dez linhas por dia para sempre.
create table if not exists public.consumo_de_agua (
  user_id    uuid not null references auth.users on delete cascade,
  data       date not null,
  ml         integer not null default 0 check (ml >= 0 and ml <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, data)
);

comment on table public.consumo_de_agua is
  'Quanta água no dia, em ml. Uma linha por dia — o horário de cada gole não responde pergunta nenhuma.';

/* --- 4. as metas que faltavam -------------------------------------------- */
-- 041 já tinha meta_kcal e meta_proteina_g. Faltavam os outros dois macros e a
-- água. Cada uma vale por si: quem tem nutricionista recebe os quatro números
-- prontos; quem não tem quer travar só a proteína.
alter table public.perfil_da_dieta
  add column if not exists meta_carboidrato_g integer,
  add column if not exists meta_gordura_g     integer,
  add column if not exists meta_agua_ml       integer;

comment on column public.perfil_da_dieta.meta_agua_ml is
  'Meta de água do dia. NULL = 35 ml/kg mais 600 ml por hora de treino (ver dieta.ts).';

/* --- 5. RLS: só o dono, em tudo ------------------------------------------ */
alter table public.cardapio_itens   enable row level security;
alter table public.consumo_de_agua  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['cardapio_itens', 'consumo_de_agua'] loop
    execute format('drop policy if exists "dono lê" on public.%I', t);
    execute format(
      'create policy "dono lê" on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "dono cria" on public.%I', t);
    execute format(
      'create policy "dono cria" on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "dono edita" on public.%I', t);
    execute format(
      'create policy "dono edita" on public.%I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);

    execute format('drop policy if exists "dono apaga" on public.%I', t);
    execute format(
      'create policy "dono apaga" on public.%I for delete to authenticated
         using (user_id = (select auth.uid()))', t);
  end loop;
end $$;
