-- ============================================================================
-- 025 — O hexágono do jogo: uma leitura por mês, não uma média
-- ============================================================================
-- `weak_points` guardava nota e histórico, e a tela mostrava a MÉDIA das notas
-- ao longo do tempo, numa linha. A média de seis habilidades é o número que
-- mais esconde: quem melhorou muito a passagem e piorou a defesa aparece
-- parado — e "parado" é exatamente a leitura errada.
--
-- Além disso o histórico era um `jsonb` reescrito inteiro a cada nota, com um
-- carimbo por TOQUE no slider. Mexer três vezes no mesmo dia criava três
-- pontos. Não dá para comparar mês com mês em cima disso.
--
-- Aqui a unidade é o MÊS, e é única por pessoa: uma linha por mês, seis notas.
-- É o que torna a sobreposição de dois hexágonos uma comparação honesta em vez
-- de um recorte arbitrário de duas datas.
--
-- Os seis eixos vivem no cliente (`src/lib/hexagono.ts`), que é a fonte da
-- ordem. Aqui eles são só chaves — mas o CHECK garante que ninguém grave um
-- eixo inventado, e o banco não vira depósito de chave solta.
-- ============================================================================

create table if not exists public.avaliacoes_do_jogo (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- Sempre o dia 1 do mês avaliado. É o que faz a unicidade por mês valer.
  mes        date not null,
  guarda      smallint not null default 0,
  passagem    smallint not null default 0,
  finalizacao smallint not null default 0,
  retencao    smallint not null default 0,
  defesa      smallint not null default 0,
  gas         smallint not null default 0,
  nota        text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint avaliacoes_mes_e_dia_um check (extract(day from mes) = 1),
  constraint avaliacoes_uma_por_mes unique (user_id, mes),
  constraint avaliacoes_notas_de_0_a_5 check (
    guarda between 0 and 5 and passagem between 0 and 5
    and finalizacao between 0 and 5 and retencao between 0 and 5
    and defesa between 0 and 5 and gas between 0 and 5
  )
);

create index if not exists avaliacoes_do_jogo_pessoa_mes_idx
  on public.avaliacoes_do_jogo (user_id, mes desc);

alter table public.avaliacoes_do_jogo enable row level security;

-- A avaliação é da pessoa e só dela. Diferente da linhagem, aqui não há razão
-- nenhuma para outro logado ler: é auto-avaliação, e auto-avaliação exposta
-- deixa de ser honesta na hora.
drop policy if exists "cada um le a propria avaliacao" on public.avaliacoes_do_jogo;
create policy "cada um le a propria avaliacao"
  on public.avaliacoes_do_jogo for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop trigger if exists avaliacoes_do_jogo_updated_at on public.avaliacoes_do_jogo;
create trigger avaliacoes_do_jogo_updated_at
  before update on public.avaliacoes_do_jogo
  for each row execute function public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- O que já existia não se perde
-- ----------------------------------------------------------------------------
-- `weak_points` tem histórico real de gente que usou o app. Cada carimbo vira
-- a nota daquele mês, e quando há mais de um no mesmo mês vale O ÚLTIMO — que
-- é a leitura mais recente, não a média de tentativas de ajustar o slider.
--
-- O `label` é texto livre, então o casamento com os seis eixos é por
-- aproximação de nome. O que não casar fica onde está: `weak_points` continua
-- existindo, e ninguém perde nada.
insert into public.avaliacoes_do_jogo
  (user_id, mes, guarda, passagem, finalizacao, retencao, defesa, gas)
select
  w.user_id,
  date_trunc('month', h.carimbo)::date as mes,
  max(case when eixo = 'guarda'      then h.nota else 0 end),
  max(case when eixo = 'passagem'    then h.nota else 0 end),
  max(case when eixo = 'finalizacao' then h.nota else 0 end),
  max(case when eixo = 'retencao'    then h.nota else 0 end),
  max(case when eixo = 'defesa'      then h.nota else 0 end),
  max(case when eixo = 'gas'         then h.nota else 0 end)
from public.weak_points w
cross join lateral (
  select
    case
      when w.label ilike '%guarda%'   and w.label not ilike '%passa%' then 'guarda'
      when w.label ilike '%passa%'                                    then 'passagem'
      when w.label ilike '%finaliza%' or w.label ilike '%submiss%'    then 'finalizacao'
      when w.label ilike '%reten%'    or w.label ilike '%recompo%'    then 'retencao'
      when w.label ilike '%defes%'    or w.label ilike '%escapa%'
        or w.label ilike '%fuga%'                                     then 'defesa'
      when w.label ilike '%gas%'      or w.label ilike '%gás%'
        or w.label ilike '%condicion%' or w.label ilike '%fôlego%'
        or w.label ilike '%folego%'   or w.label ilike '%cardio%'     then 'gas'
      else null
    end as eixo
) as m
cross join lateral (
  select (e->>'date')::date as carimbo, least(5, greatest(0, (e->>'score')::int)) as nota
  from jsonb_array_elements(coalesce(w.history, '[]'::jsonb)) as e
  where e ? 'date' and e ? 'score'
) as h
where m.eixo is not null
group by w.user_id, date_trunc('month', h.carimbo)
on conflict (user_id, mes) do nothing;
