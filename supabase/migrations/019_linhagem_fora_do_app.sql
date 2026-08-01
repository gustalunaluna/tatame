-- ============================================================================
-- 019 — A linhagem atravessa quem não usa o app
-- ============================================================================
-- `master_links.aluno_id` aponta para `auth.users`. Isso significa que só quem
-- tem conta pode TER um mestre — e portanto a corrente parava no primeiro nome
-- de fora.
--
-- Na prática isso quebrava o caso normal, não o excepcional. Quase ninguém tem
-- o mestre do mestre cadastrado aqui. Uma linhagem real como
--
--     Gustavo → Emy Lopes → Felipe Thome → Barbosa (B9)
--
-- rendia dois níveis: Gustavo e a Emy, e acabou.
--
-- `linhagem_externa` guarda quem está na corrente sem usar o app. Por ser
-- auto-referente, ela continua: a Emy aponta para o Felipe, que aponta para o
-- Barbosa, que aponta para quem vier.
-- ============================================================================

create table if not exists public.linhagem_externa (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null check (length(btrim(nome)) between 2 and 80),
  academia  text not null default '',
  -- Faixa e grau são opcionais: ninguém sabe a graduação exata do mestre do
  -- mestre, e exigir isso faria a pessoa inventar.
  belt      text check (belt is null or belt in
              ('Branca','Azul','Roxa','Marrom','Preta','Coral','Vermelha')),
  degrees   int,
  mestre_externo_id uuid references public.linhagem_externa(id) on delete set null,
  -- Ou alguém que por acaso usa o app: a corrente pode voltar para dentro.
  mestre_id         uuid references auth.users(id) on delete set null,
  criado_por uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint linhagem_externa_grau check (
    belt is null or degrees is null or public.grau_valido(belt, degrees)
  )
);

create index if not exists linhagem_externa_criador_idx
  on public.linhagem_externa (criado_por);
create index if not exists linhagem_externa_mestre_ext_idx
  on public.linhagem_externa (mestre_externo_id) where mestre_externo_id is not null;

alter table public.linhagem_externa enable row level security;

drop policy if exists "linhagem externa e publica entre logados" on public.linhagem_externa;
create policy "linhagem externa e publica entre logados"
  on public.linhagem_externa for select to authenticated using (true);

drop policy if exists "quem criou edita" on public.linhagem_externa;
create policy "quem criou edita" on public.linhagem_externa for all to authenticated
  using (criado_por = (select auth.uid())) with check (criado_por = (select auth.uid()));

alter table public.master_links add column if not exists mestre_externo_id uuid
  references public.linhagem_externa(id) on delete set null;

alter table public.master_links drop constraint if exists master_links_check;
alter table public.master_links add constraint master_links_tem_mestre check (
  mestre_id is not null or mestre_externo_id is not null or btrim(mestre_nome) <> ''
);

create index if not exists master_links_mestre_ext_idx
  on public.master_links (mestre_externo_id) where mestre_externo_id is not null;
