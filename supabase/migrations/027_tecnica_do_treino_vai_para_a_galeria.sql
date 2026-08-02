-- ============================================================================
-- 027 — A técnica aprendida no treino vira técnica da galeria
-- ============================================================================
-- `trainings.techniques` era texto livre: "DLR → costas, tesourinha". E a
-- galeria (`techniques`) era outra coisa, alimentada por um formulário
-- separado. As duas nunca se falaram.
--
-- Na prática isso quer dizer que a informação mais valiosa do app — o que a
-- pessoa aprendeu, e quando — ficava presa numa string que nada consegue ler.
-- Não dá para responder "há quanto tempo não treino armlock", nem "quantas
-- vezes já vi essa passagem", que são as duas perguntas que uma galeria de
-- técnicas existe para responder.
--
-- ----------------------------------------------------------------------------
-- O QUE MUDA
-- ----------------------------------------------------------------------------
-- Uma tabela de ligação entre treino e técnica. A técnica continua morando na
-- galeria — é a biblioteca da pessoa — e o treino aponta para ela.
--
-- Consequência que precisa estar clara: tirar uma técnica de um treino NÃO a
-- apaga da galeria. A galeria é acervo, não histórico da sessão. Quem quer
-- apagar de vez apaga na galeria, e aí o vínculo cai junto.
--
-- ----------------------------------------------------------------------------
-- O NOME REPETIDO
-- ----------------------------------------------------------------------------
-- O risco óbvio de deixar criar técnica pelo diário é a galeria virar depósito
-- de quase-duplicatas: "Armlock", "armlock", "Armlock ", "Triângulo" e
-- "Triangulo". O índice único abaixo resolve maiúscula, espaço e acento, que
-- são a esmagadora maioria dos casos.
--
-- Acento sem `unaccent`: `translate()` é IMMUTABLE e serve em índice; a
-- extensão exigiria instalação e a função dela nem sempre é imutável.
-- ============================================================================

-- ATENÇÃO, de quem aplicou isto no banco e errou: na primeira passada os
-- acentos se perderam no caminho até o servidor e o `translate()` ficou com
-- origem e destino IGUAIS — identidade silenciosa. "Triângulo" e "Triangulo"
-- continuariam sendo duas técnicas, e nada avisaria. Se mexer aqui, confira:
--
--   select public.chave_da_tecnica('Triângulo') = public.chave_da_tecnica('TRIANGULO');
--
-- E lembre que o índice único depende desta função: mudá-la exige REFAZER o
-- índice, senão ele continua guardando as chaves da definição antiga.
create or replace function public.chave_da_tecnica(nome text)
returns text
language sql immutable
as $BODY$
  select lower(
    btrim(
      translate(
        coalesce(nome, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      )
    )
  );
$BODY$;

-- Antes do índice, junta o que já está repetido. Hoje não há nenhum caso, mas
-- a migração precisa valer num banco que tenha.
drop index if exists public.techniques_nome_unico_por_pessoa;

with duplicadas as (
  select id,
         first_value(id) over (
           partition by user_id, public.chave_da_tecnica(name)
           order by created_at
         ) as manter
  from public.techniques
)
delete from public.techniques t
using duplicadas d
where t.id = d.id and d.id <> d.manter;

create unique index techniques_nome_unico_por_pessoa
  on public.techniques (user_id, public.chave_da_tecnica(name));

-- ----------------------------------------------------------------------------
-- A ligação
-- ----------------------------------------------------------------------------
create table if not exists public.training_techniques (
  training_id  uuid not null references public.trainings(id) on delete cascade,
  technique_id uuid not null references public.techniques(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (training_id, technique_id)
);

create index if not exists training_techniques_tecnica_idx
  on public.training_techniques (technique_id);
create index if not exists training_techniques_pessoa_idx
  on public.training_techniques (user_id);

alter table public.training_techniques enable row level security;

drop policy if exists "cada um liga as proprias tecnicas" on public.training_techniques;
create policy "cada um liga as proprias tecnicas"
  on public.training_techniques for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- Achar-ou-criar, e ligar — numa transação só
-- ----------------------------------------------------------------------------
-- Feito no cliente isto seria ler, decidir e escrever em três viagens, com a
-- corrida clássica no meio: dois toques rápidos criam duas técnicas com o
-- mesmo nome, e o índice único derruba a segunda com um erro que a pessoa não
-- entende.
--
-- `on conflict` sobre o índice normalizado resolve: quem chega depois lê o que
-- o primeiro criou. O nome digitado é preservado como veio — o normalizado
-- serve para comparar, não para exibir.
create or replace function public.registrar_tecnica_do_treino(
  p_treino uuid,
  p_nome text,
  p_categoria text default ''
)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $BODY$
declare
  eu uuid := auth.uid();
  nome text := btrim(coalesce(p_nome, ''));
  id_tecnica uuid;
begin
  if eu is null then
    raise exception 'Entre para registrar técnica.';
  end if;
  if length(nome) < 2 then
    raise exception 'O nome da técnica precisa de pelo menos 2 letras.';
  end if;

  -- O treino tem que ser da própria pessoa. Sem esta linha, `security definer`
  -- deixaria pendurar técnica no treino de qualquer um.
  if not exists (
    select 1 from public.trainings t where t.id = p_treino and t.user_id = eu
  ) then
    raise exception 'Treino não encontrado.';
  end if;

  insert into public.techniques (user_id, name, category, notes, video_url, mastery)
  values (eu, nome, coalesce(nullif(btrim(p_categoria), ''), ''), '', '', 0)
  on conflict (user_id, public.chave_da_tecnica(name)) do update
    -- Não sobrescreve NADA do que já existe: quem tem "Armlock" com anotação e
    -- domínio 4 não pode perder isso por registrar de novo. O `do update`
    -- existe só para o RETURNING devolver a linha.
    set name = techniques.name
  returning id into id_tecnica;

  insert into public.training_techniques (training_id, technique_id, user_id)
  values (p_treino, id_tecnica, eu)
  on conflict do nothing;

  return id_tecnica;
end;
$BODY$;

revoke execute on function public.registrar_tecnica_do_treino(uuid, text, text)
  from public, anon;
grant execute on function public.registrar_tecnica_do_treino(uuid, text, text)
  to authenticated;

-- Desligar a técnica de um treino. Some o vínculo, não a técnica: a galeria é
-- acervo.
create or replace function public.desligar_tecnica_do_treino(
  p_treino uuid,
  p_tecnica uuid
)
returns void
language sql security definer
set search_path to 'public'
as $BODY$
  delete from public.training_techniques tt
  where tt.training_id = p_treino
    and tt.technique_id = p_tecnica
    and tt.user_id = (select auth.uid());
$BODY$;

revoke execute on function public.desligar_tecnica_do_treino(uuid, uuid)
  from public, anon;
grant execute on function public.desligar_tecnica_do_treino(uuid, uuid)
  to authenticated;

-- ----------------------------------------------------------------------------
-- A galeria, com o que o vínculo passa a permitir responder
-- ----------------------------------------------------------------------------
-- "Há quanto tempo não treino isso" é a pergunta que faz uma galeria de
-- técnicas valer alguma coisa. Sem a ligação, ela não tinha resposta.
create or replace function public.galeria_de_tecnicas()
returns table (
  id uuid, name text, category text, notes text, video_url text, mastery int,
  treinos int, ultima_vez date
)
language sql stable security definer
set search_path to 'public'
as $BODY$
  select t.id, t.name, coalesce(t.category, ''), coalesce(t.notes, ''),
         coalesce(t.video_url, ''), coalesce(t.mastery, 0),
         count(tt.training_id)::int,
         max(tr.date)
  from public.techniques t
  left join public.training_techniques tt on tt.technique_id = t.id
  left join public.trainings tr on tr.id = tt.training_id
  where t.user_id = (select auth.uid())
  group by t.id
  order by t.created_at;
$BODY$;

revoke execute on function public.galeria_de_tecnicas() from public, anon;
grant execute on function public.galeria_de_tecnicas() to authenticated;

-- As técnicas de um treino, para o diário mostrar e editar.
create or replace function public.tecnicas_do_treino(p_treino uuid)
returns table (id uuid, name text, category text)
language sql stable security definer
set search_path to 'public'
as $BODY$
  select t.id, t.name, coalesce(t.category, '')
  from public.training_techniques tt
  join public.techniques t on t.id = tt.technique_id
  join public.trainings tr on tr.id = tt.training_id
  where tt.training_id = p_treino and tr.user_id = (select auth.uid())
  order by t.name;
$BODY$;

revoke execute on function public.tecnicas_do_treino(uuid) from public, anon;
grant execute on function public.tecnicas_do_treino(uuid) to authenticated;
