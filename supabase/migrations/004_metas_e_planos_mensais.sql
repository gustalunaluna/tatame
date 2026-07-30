-- 004 — Metas de longo prazo e planos mensais de evolução.
--
-- Separação que orienta o arquivo:
--   META  = o destino. "Faixa azul até 13/10/2026", "pódio no Paranaense".
--           Poucas, longas, a data é escolha do usuário — o app não opina.
--   PLANO = o caminho. Um objetivo, quatro semanas, itens executáveis.
--           Trocado todo mês.
--
-- `plan_weeks` continua existindo e intacta: o app atual lê dela. A troca da
-- tela para o modelo novo acontece em outro passo, com os dados já migrados.
--
-- Idempotente.

-- ---------------------------------------------------------------------------
-- 1. METAS
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('graduacao', 'competicao', 'volume', 'livre')),
  title text not null check (length(btrim(title)) between 2 and 120),

  -- graduacao
  target_belt text check (target_belt is null or target_belt in
    ('Branca','Azul','Roxa','Marrom','Preta','Coral','Vermelha')),
  target_degrees integer check (target_degrees is null or target_degrees between 0 and 6),

  -- competicao
  event_name text not null default '',

  -- volume ("150 treinos até dezembro")
  target_number integer check (target_number is null or target_number > 0),

  -- a data é sempre do usuário
  target_date date,

  status text not null default 'ativa'
    check (status in ('ativa', 'concluida', 'arquivada')),
  -- para competicao: ouro/prata/bronze/participou/nao_foi. Livre nos demais.
  outcome text not null default '',
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;

create index if not exists goals_user_idx on public.goals (user_id, status, target_date);

drop policy if exists "minhas metas" on public.goals;
create policy "minhas metas" on public.goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. CATÁLOGO DE OBJETIVOS — o que a pessoa escolhe melhorar no mês
-- ---------------------------------------------------------------------------
create table if not exists public.plan_objectives (
  slug text primary key,
  nome text not null,
  descricao text not null default '',
  -- alguns objetivos não fazem sentido na faixa branca
  faixa_min text not null default 'Branca',
  ordem integer not null default 0,
  ativo boolean not null default true
);
alter table public.plan_objectives enable row level security;

drop policy if exists "catalogo visivel" on public.plan_objectives;
create policy "catalogo visivel" on public.plan_objectives
  for select to authenticated using (ativo);

insert into public.plan_objectives (slug, nome, descricao, faixa_min, ordem) values
  ('retencao',    'Retenção de guarda',   'Parar de ser passado. Quadril, enquadramento e recomposição.', 'Branca', 1),
  ('passagem',    'Passagem de guarda',   'Passar com pressão, no toureio ou por fora.',                  'Branca', 2),
  ('raspagem',    'Raspagens',            'Sair de baixo e chegar por cima.',                             'Branca', 3),
  ('finalizacao', 'Finalizações',         'Encaixar, encadear e finalizar quem defende.',                 'Branca', 4),
  ('costas',      'Pegar as costas',      'Chegar nas costas e manter o controle.',                       'Branca', 5),
  ('controle',    'Controle por cima',    'Montada, cem quilos e costas — segurar e evoluir.',            'Branca', 6),
  ('escapes',     'Escapes e defesa',     'Sair de montada, cem quilos e das costas.',                    'Branca', 7),
  ('quedas',      'Quedas e jogo em pé',  'Não ficar perdido de pé. Puxar ou derrubar com critério.',     'Branca', 8),
  ('pegadas',     'Pegadas e grip fight', 'Pegar primeiro e quebrar a pegada dele.',                      'Branca', 9),
  ('cardio',      'Cardio para o rola',   'Aguentar o rola inteiro sem apagar.',                          'Branca', 10),
  ('cabeca',      'Cabeça e travamento',  'Parar de travar no rola. Respirar e jogar.',                   'Branca', 11),
  ('nogi',        'Jogo sem kimono',      'Adaptar o jogo para o no-gi.',                                 'Branca', 12),
  ('pernas',      'Jogo de perna',        'Ashi garami, entradas e defesa de chave de perna.',            'Azul',   13),
  ('competicao',  'Preparar competição',  'Chegar afiado na data do campeonato.',                         'Branca', 14)
on conflict (slug) do update
  set nome = excluded.nome, descricao = excluded.descricao,
      faixa_min = excluded.faixa_min, ordem = excluded.ordem;

-- ---------------------------------------------------------------------------
-- 3. BASE DE CONTEÚDO — objetivo × nível × variante
-- ---------------------------------------------------------------------------
-- `nivel` separa por faixa E grau, porque branca 0 grau e branca 3 graus
-- precisam de coisas diferentes dentro do mesmo objetivo.
create table if not exists public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  objective_slug text not null references public.plan_objectives(slug) on delete cascade,
  nivel text not null check (nivel in
    ('branca_inicio','branca_avancada','azul','azul_avancada','roxa','marrom','preta')),
  -- '' é o plano padrão do nível; 'dlr', 'meia', 'passador'… são variantes
  -- escolhidas pelo perfil de jogo da pessoa.
  variante text not null default '',
  titulo text not null,
  resumo text not null default '',
  -- [{semana, foco, itens:[{texto, alvo}]}] — alvo 0 = check simples
  semanas jsonb not null default '[]'::jsonb,
  -- null = conteúdo do app; preenchido = escrito por um admin
  created_by uuid references auth.users on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (objective_slug, nivel, variante)
);
alter table public.plan_templates enable row level security;

create index if not exists plan_templates_busca_idx
  on public.plan_templates (objective_slug, nivel) where ativo;

drop policy if exists "conteudo visivel" on public.plan_templates;
create policy "conteudo visivel" on public.plan_templates
  for select to authenticated using (ativo);

drop policy if exists "admin escreve conteudo" on public.plan_templates;
create policy "admin escreve conteudo" on public.plan_templates
  for all to authenticated
  using (public.sou_admin()) with check (public.sou_admin());

-- ---------------------------------------------------------------------------
-- 4. O MÊS DA PESSOA
-- ---------------------------------------------------------------------------
create table if not exists public.plan_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  objective_slug text references public.plan_objectives(slug) on delete set null,
  -- guardado só como origem; o ciclo não depende do template para existir
  template_id uuid references public.plan_templates on delete set null,
  nivel text not null default '',
  titulo text not null,
  inicio date not null default current_date,
  fim date not null default (current_date + 27),
  -- a nota de 0 a 5 no objetivo, antes e depois. É o que mede se adiantou.
  nota_inicial integer check (nota_inicial is null or nota_inicial between 0 and 5),
  nota_final integer check (nota_final is null or nota_final between 0 and 5),
  status text not null default 'ativo' check (status in ('ativo','encerrado')),
  created_at timestamptz not null default now()
);
alter table public.plan_cycles enable row level security;

create index if not exists plan_cycles_user_idx
  on public.plan_cycles (user_id, status, inicio desc);

drop policy if exists "meus ciclos" on public.plan_cycles;
create policy "meus ciclos" on public.plan_cycles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Os itens são COPIADOS do template para o ciclo, de propósito: a pessoa pode
-- editar o próprio plano, e mexer no conteúdo do app depois não reescreve o
-- histórico de ninguém.
create table if not exists public.plan_cycle_items (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.plan_cycles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  semana integer not null check (semana between 1 and 6),
  foco text not null default '',
  texto text not null check (length(btrim(texto)) between 1 and 300),
  -- 0 = check simples; >0 = contador ("3 rolas" vira 0/3)
  alvo integer not null default 0 check (alvo between 0 and 50),
  feito integer not null default 0 check (feito >= 0),
  nota text not null default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.plan_cycle_items enable row level security;

create index if not exists plan_cycle_items_ciclo_idx
  on public.plan_cycle_items (cycle_id, semana, ordem);
create index if not exists plan_cycle_items_user_idx
  on public.plan_cycle_items (user_id);

drop policy if exists "meus itens de plano" on public.plan_cycle_items;
create policy "meus itens de plano" on public.plan_cycle_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- `feito` nunca passa do alvo
create or replace function public.limitar_feito() returns trigger
  language plpgsql set search_path = public as $$
begin
  if new.alvo > 0 and new.feito > new.alvo then
    new.feito := new.alvo;
  elsif new.alvo = 0 and new.feito > 1 then
    new.feito := 1;
  end if;
  return new;
end $$;

drop trigger if exists limitar_feito on public.plan_cycle_items;
create trigger limitar_feito before insert or update on public.plan_cycle_items
  for each row execute function public.limitar_feito();

-- ---------------------------------------------------------------------------
-- 5. PERFIL DE JOGO — as respostas do questionário de entrada
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists perfil_jogo jsonb
  not null default '{}'::jsonb;
alter table public.profiles add column if not exists questionario_em timestamptz;
alter table public.profiles add column if not exists verificado boolean
  not null default false;

-- ---------------------------------------------------------------------------
-- 6. PONTOS FORTES E FRACOS — o mesmo mecanismo, com tipo
-- ---------------------------------------------------------------------------
alter table public.weak_points add column if not exists kind text
  not null default 'fraco';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'weak_points_kind_check') then
    alter table public.weak_points
      add constraint weak_points_kind_check check (kind in ('fraco','forte'));
  end if;
end $$;

-- liga o ponto ao objetivo, quando houver — é o que faz a nota de 0 a 5
-- virar a medida do ciclo em vez de um slider solto
alter table public.weak_points add column if not exists objective_slug text
  references public.plan_objectives(slug) on delete set null;

create index if not exists weak_points_kind_idx
  on public.weak_points (user_id, kind);
