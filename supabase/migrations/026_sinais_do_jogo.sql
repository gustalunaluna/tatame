-- ============================================================================
-- 026 — Os números que faltavam para o hexágono se calcular sozinho
-- ============================================================================
-- `training_partners` já guardava a peça mais difícil: quantas finalizações
-- saíram e quantas foram sofridas, POR PARCEIRO, com a faixa dele na época e
-- confirmação dos dois lados. Isso cobre dois dos seis eixos — finalização e
-- defesa — e cobre bem.
--
-- Faltavam quatro. Passagem e retenção são o mesmo evento visto dos dois lados
-- (você passou / passaram em você), e guarda se mede por raspada. Gás não é
-- por parceiro: é da sessão inteira, e por isso vai em `trainings`.
--
-- ----------------------------------------------------------------------------
-- POR QUE CONTAGEM, E NÃO NOTA
-- ----------------------------------------------------------------------------
-- A auto-avaliação de 0 a 5 media a confiança da pessoa, não o jiu-jitsu dela.
-- Faixa-branca em semana ruim se dá 1; a mesma pessoa depois de uma rola boa
-- se dá 4. O gráfico media o humor.
--
-- "Fui finalizado 3 vezes" é fato. "Minha defesa é 2 de 5" é veredito. Só o
-- primeiro pode ser conferido pelo parceiro — e é por isso que `confirmacao`
-- existe e vale para estes campos também.
--
-- ----------------------------------------------------------------------------
-- O RITMO, E POR QUE ELE É UM NÚMERO DE ROLA
-- ----------------------------------------------------------------------------
-- "Você tem gás?" é pergunta de opinião. "Em que rola o ritmo caiu?" é
-- observação: um número, comparável com o total de rolas da sessão. Zero quer
-- dizer que caiu na primeira; nulo quer dizer que não caiu — que é diferente
-- de não ter sido respondido, e por isso a coluna aceita nulo com sentido
-- próprio junto de `ritmo_respondido`.
-- ============================================================================

alter table public.training_partners
  add column if not exists passes_for      smallint not null default 0,
  add column if not exists passes_against  smallint not null default 0,
  add column if not exists sweeps_for      smallint not null default 0,
  add column if not exists sweeps_against  smallint not null default 0,
  -- ------------------------------------------------------------------------
  -- A coluna mais importante desta migração
  -- ------------------------------------------------------------------------
  -- Zero e "não respondi" são a MESMA coisa para o banco e coisas opostas para
  -- o hexágono. Sem esta bandeira, as 138 rolas que já existem entrariam como
  -- "dez rolas, ninguém me passou, ninguém me finalizou" — e o app anunciaria
  -- retenção 3,7 e defesa 3,7 para quem nunca respondeu nada. Nota inventada
  -- nas duas direções: péssima na passagem, ótima na defesa.
  --
  -- Só linha com `detalhado` conta. É o mesmo desenho de `ritmo_respondido`.
  add column if not exists detalhado boolean not null default false;

alter table public.training_partners
  drop constraint if exists training_partners_contagens_sao_plausiveis;
alter table public.training_partners
  add constraint training_partners_contagens_sao_plausiveis check (
    passes_for between 0 and 99 and passes_against between 0 and 99
    and sweeps_for between 0 and 99 and sweeps_against between 0 and 99
  );

alter table public.trainings
  -- Em que rola o ritmo caiu. Nulo + respondido = não caiu.
  add column if not exists ritmo_caiu_na    smallint,
  add column if not exists ritmo_respondido boolean not null default false;

-- E NÃO há backfill. A tentação era marcar `detalhado` nas linhas que já
-- tinham `subs_for` preenchido -- afinal aquilo foi respondido de fato. Mas
-- `detalhado` quer dizer "respondi os CINCO contadores", e naquelas linhas
-- passagem e raspada nunca foram perguntadas: elas estão em zero por padrão,
-- não por observação.
--
-- Marcar aquelas linhas faria o hexágono anunciar guarda e passagem baixas a
-- partir de um valor que ninguém digitou -- exatamente o erro que a coluna
-- existe para impedir, entrando pela outra porta. Uma bandeira, um
-- significado.
--
-- O custo é pequeno e o ganho é a regra intacta: as rolas antigas só somam
-- quando forem fechadas pelo formulário novo.

alter table public.trainings drop constraint if exists trainings_ritmo_plausivel;
alter table public.trainings add constraint trainings_ritmo_plausivel check (
  ritmo_caiu_na is null or ritmo_caiu_na between 0 and 99
);

-- ----------------------------------------------------------------------------
-- Os sinais crus, para o cliente fazer a conta
-- ----------------------------------------------------------------------------
-- A ponderação por diferença de faixa, o amortecimento por amostra pequena e a
-- curva de idade vivem em `src/lib/hexagono-derivado.ts`, não aqui. O motivo é
-- prático: aquilo é um MODELO, muda com o que a gente aprender, e modelo que
-- mora em SQL não tem teste unitário barato. O banco entrega fato; o cliente
-- decide o que o fato vale.
create or replace function public.sinais_do_jogo(p_desde date)
returns table (
  data date,
  parceiro_faixa text,
  rolas int,
  fin_a_favor int, fin_sofridas int,
  pass_a_favor int, pass_sofridas int,
  rasp_a_favor int, rasp_sofridas int,
  confirmado boolean,
  detalhado boolean,
  ritmo_caiu_na int,
  ritmo_respondido boolean,
  rolas_da_sessao int
)
language sql stable security definer
set search_path to 'public'
as $$
  select
    t.date,
    coalesce(nullif(btrim(tp.partner_belt), ''), coalesce(pp.belt, '')),
    greatest(1, coalesce(tp.rolls, 1)),
    coalesce(tp.subs_for, 0), coalesce(tp.subs_against, 0),
    coalesce(tp.passes_for, 0), coalesce(tp.passes_against, 0),
    coalesce(tp.sweeps_for, 0), coalesce(tp.sweeps_against, 0),
    tp.confirmacao = 'confirmado',
    tp.detalhado,
    t.ritmo_caiu_na,
    t.ritmo_respondido,
    greatest(1, coalesce(t.rolls, 1))
  from public.trainings t
  join public.training_partners tp on tp.training_id = t.id
  -- A faixa preferida é a gravada na época; o perfil só entra se a época não
  -- foi registrada. Ler sempre o perfil reescreveria a história: quem graduou
  -- mês passado viraria "sempre foi roxa" nas rolas de dois anos atrás.
  left join public.profiles pp on pp.user_id = tp.partner_id
  where t.user_id = (select auth.uid())
    and tp.owner_id = (select auth.uid())
    and t.date >= p_desde
  order by t.date;
$$;

revoke execute on function public.sinais_do_jogo(date) from public, anon;
grant execute on function public.sinais_do_jogo(date) to authenticated;
