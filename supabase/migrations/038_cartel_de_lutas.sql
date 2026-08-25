-- ============================================================================
-- 038 — O cartel vira luta, não contador
-- ============================================================================
-- Antes disto o cartel eram duas colunas em `profiles`: fights_won e
-- fights_lost. Dois inteiros digitados à mão. Eles respondem "quantas ganhei"
-- e nada além disso — não respondem COMO, contra quem, em qual evento, nem se
-- a derrota de sempre chega pelo mesmo caminho.
--
-- Uma luta é o dado de maior qualidade que este app pode guardar. Vale mais
-- que dez rolas de treino: adversário desconhecido, árbitro, placar valendo,
-- sem ninguém aliviando. Guardá-la como "+1 no contador" joga fora quase tudo
-- o que ela ensinou.
--
-- POR QUE TRÊS RESULTADOS E NÃO DOIS
--
-- `empate` existe porque nem toda luta termina com um braço levantado: evento
-- informal sem critério de desempate, luta interrompida por lesão, treino
-- cronometrado que acaba no zero a zero. Forçar isso a virar vitória ou
-- derrota é gravar mentira. Regra de IBJJF não tem empate — vai para decisão
-- do árbitro, e isso se registra como vitória ou derrota com metodo='decisao'.
--
-- O CARTEL PASSA A SER DERIVADO
--
-- O gatilho no fim recalcula profiles.fights_won/fights_lost a partir daqui.
-- A partir do momento em que alguém registra a primeira luta, o log é a fonte
-- da verdade e o número digitado à mão deixa de valer. Quem nunca registrar
-- nenhuma luta continua com o contador manual funcionando como antes — o
-- gatilho só dispara quando existe linha em `lutas`.
--
-- Só luta OFICIAL entra no cartel. Rola de treino registrado aqui serve para
-- análise, mas cartel é competição.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.lutas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  data           date not null,
  evento         text not null default '',
  -- competição vale para o cartel; treino/superluta informal fica de fora
  oficial        boolean not null default true,
  oponente       text not null default '',
  oponente_faixa text check (
    oponente_faixa is null or oponente_faixa in
      ('Branca', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha')
  ),
  categoria      text not null default '',
  resultado      text not null check (resultado in ('vitoria', 'derrota', 'empate')),
  metodo         text check (
    metodo is null or metodo in
      ('finalizacao', 'pontos', 'vantagem', 'decisao', 'wo', 'interrompida')
  ),
  -- o nome do golpe quando metodo='finalizacao': armlock, arco e flecha,
  -- triângulo. Texto livre de propósito — o vocabulário do jiu-jitsu é grande
  -- e regional demais para caber num check, e a tela oferece os comuns.
  golpe          text not null default '',
  tempo_seg      integer check (tempo_seg is null or tempo_seg between 0 and 5400),
  notas          text not null default '',
  created_at     timestamptz not null default now()
);

comment on table public.lutas is
  'Cartel luta a luta. Fonte da verdade de profiles.fights_won/fights_lost via gatilho.';
comment on column public.lutas.oficial is
  'Competição (entra no cartel) x treino ou superluta informal (não entra).';
comment on column public.lutas.golpe is
  'Nome do golpe quando metodo=finalizacao. Texto livre por escolha.';

create index if not exists lutas_user_idx on public.lutas (user_id, data desc);

alter table public.lutas enable row level security;

-- Mesma lógica das medalhas: cartel existe para aparecer no perfil, e perfil
-- de atleta é visível para qualquer pessoa logada.
drop policy if exists "luta é pública para quem está logado" on public.lutas;
create policy "luta é pública para quem está logado"
  on public.lutas for select to authenticated using (true);

drop policy if exists "dono registra a própria luta" on public.lutas;
create policy "dono registra a própria luta"
  on public.lutas for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dono edita a própria luta" on public.lutas;
create policy "dono edita a própria luta"
  on public.lutas for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dono apaga a própria luta" on public.lutas;
create policy "dono apaga a própria luta"
  on public.lutas for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- O cartel se recalcula sozinho
-- ---------------------------------------------------------------------------
-- Recontar tudo a cada mudança em vez de somar e subtrair: um cartel tem
-- dezenas de linhas, não milhões, e contador incremental erra silenciosamente
-- quando uma linha é editada de vitória para derrota. Recontar não erra.
create or replace function public.lutas_atualiza_cartel() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  alvo uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles p
     set fights_won = (
           select count(*) from public.lutas l
            where l.user_id = alvo and l.oficial and l.resultado = 'vitoria'
         ),
         fights_lost = (
           select count(*) from public.lutas l
            where l.user_id = alvo and l.oficial and l.resultado = 'derrota'
         ),
         updated_at = now()
   where p.user_id = alvo;
  return null;
end $$;

drop trigger if exists lutas_cartel on public.lutas;
create trigger lutas_cartel
  after insert or update or delete on public.lutas
  for each row execute function public.lutas_atualiza_cartel();
