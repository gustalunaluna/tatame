-- ============================================================================
-- 039 — O exame de faixa se gera sozinho
-- ============================================================================
-- A Team Thomé / Barbosa tem um exame escrito de verdade para branca → azul:
-- defesas numeradas, cambalhotas, postura e movimentação, dezenove projeções,
-- quatro quedas. O atleta escolhe a faixa que quer graduar, o app gera um
-- exame variado a partir daquele syllabus, e ele escreve as respostas — para
-- estudar sozinho, ou para levar pronto ao professor.
--
-- A GERAÇÃO NÃO MORA NO BANCO
--
-- `gerarExame` (src/lib/exame-de-faixa.ts) é função pura, sem import, testada
-- sem navegador — mesmo motivo de `hexagono-derivado.ts` e `cartel.ts`. O
-- banco só GUARDA o exame já gerado: a lista de perguntas, a semente que as
-- produziu, e as respostas escritas depois. Gerar de novo é outra linha, não
-- uma função de banco.
--
-- SÓ O DONO VÊ O PRÓPRIO EXAME
--
-- Diferente de medalha e luta, isto não é currículo público — é caderno de
-- estudo. RLS aqui é `auth.uid() = user_id` em toda operação, sem exceção
-- de leitura para "qualquer autenticado".
--
-- Idempotente.
-- ============================================================================

create table if not exists public.exames_de_faixa (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  faixa_alvo  text not null check (faixa_alvo in ('Azul', 'Roxa', 'Marrom', 'Preta')),
  -- a semente usada em gerarExame(): guardá-la permite, no futuro, reabrir o
  -- MESMO exame a partir do zero, mesmo sem ter salvo as perguntas inteiras.
  semente     bigint not null,
  -- array de { id, categoria, item, pergunta, resposta, respondida }
  perguntas   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.exames_de_faixa is
  'Exames de faixa gerados a partir do syllabus da academia (src/lib/exame-de-faixa.ts). Pessoal — não aparece no perfil público.';
comment on column public.exames_de_faixa.perguntas is
  'Array de perguntas geradas, cada uma com a resposta escrita pelo atleta. Ver tipo Pergunta em exame-de-faixa.ts.';

create index if not exists exames_de_faixa_user_idx
  on public.exames_de_faixa (user_id, created_at desc);

alter table public.exames_de_faixa enable row level security;

drop policy if exists "dono vê os próprios exames" on public.exames_de_faixa;
create policy "dono vê os próprios exames"
  on public.exames_de_faixa for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "dono cria o próprio exame" on public.exames_de_faixa;
create policy "dono cria o próprio exame"
  on public.exames_de_faixa for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dono edita o próprio exame" on public.exames_de_faixa;
create policy "dono edita o próprio exame"
  on public.exames_de_faixa for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dono apaga o próprio exame" on public.exames_de_faixa;
create policy "dono apaga o próprio exame"
  on public.exames_de_faixa for delete to authenticated
  using (user_id = (select auth.uid()));
