-- 008 — Editar um treino depois de salvo.
--
-- Até agora só dava para criar e apagar. Errou o número de rolas, apaga o
-- treino inteiro e digita tudo de novo, parceiros junto. Num app de registro
-- diário isso é o atrito que faz a pessoa parar de registrar.
--
-- Editar os campos do treino já era possível pela tabela (`useTrainings.update`
-- existe e a RLS permite). O que faltava era a lista de parceiros, e ela tem
-- duas armadilhas:
--
--   1. Regravar tudo do zero zeraria as confirmações que já foram dadas.
--   2. Sem cuidado, editar vira a brecha óbvia: o parceiro confirma "2
--      finalizações", o dono edita para "9" e o placar muda sem ninguém ver.
--
-- A resposta para (1) é gravar por diferença: quem não mudou não é tocado.
-- Para (2), um gatilho — mudou número de um registro com parceiro de verdade,
-- ele volta para a fila e o relógio de 7 dias recomeça.
--
-- Idempotente.

create or replace function public.tp_reabre_confirmacao() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.partner_id is not null and (
       new.rolls        is distinct from old.rolls
    or new.subs_for     is distinct from old.subs_for
    or new.subs_against is distinct from old.subs_against
  ) then
    new.confirmacao := 'pendente';
    new.created_at  := now();
  end if;
  return new;
end $$;

revoke all on function public.tp_reabre_confirmacao() from public, anon, authenticated;

drop trigger if exists tp_reabre on public.training_partners;
create trigger tp_reabre before update on public.training_partners
  for each row execute function public.tp_reabre_confirmacao();

-- Grava a lista de parceiros de um treino de uma vez: apaga quem saiu,
-- atualiza quem mudou, insere quem entrou. Quem ficou igual não é tocado — e
-- por isso não perde a confirmação que já tinha.
--
-- p_linhas: [{ "id": uuid|null, "partner_id": uuid|null, "partner_name": text,
--              "partner_belt": text|null, "rolls": int, "subs_for": int,
--              "subs_against": int }]
create or replace function public.salvar_parceiros_do_treino(
  p_training uuid,
  p_linhas jsonb
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'Sem sessão';
  end if;

  if not exists (
    select 1 from public.trainings t where t.id = p_training and t.user_id = eu
  ) then
    raise exception 'Treino não encontrado, ou não é seu.';
  end if;

  with entrada as (
    select
      nullif(l->>'id', '')::uuid          as id,
      nullif(l->>'partner_id', '')::uuid  as partner_id,
      coalesce(l->>'partner_name', '')    as partner_name,
      nullif(l->>'partner_belt', '')      as partner_belt,
      coalesce((l->>'rolls')::int, 0)         as rolls,
      coalesce((l->>'subs_for')::int, 0)      as subs_for,
      coalesce((l->>'subs_against')::int, 0)  as subs_against
    from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) l
    -- linha vazia não vira registro
    where nullif(l->>'partner_id', '') is not null
       or btrim(coalesce(l->>'partner_name', '')) <> ''
  ),
  apagadas as (
    delete from public.training_partners tp
    where tp.training_id = p_training
      and tp.owner_id = eu
      -- o filtro `id is not null` importa: `not in` com NULL na lista devolve
      -- NULL, e aí nenhuma linha seria apagada
      and tp.id not in (select id from entrada where id is not null)
  ),
  atualizadas as (
    update public.training_partners tp
    set rolls        = e.rolls,
        subs_for     = e.subs_for,
        subs_against = e.subs_against,
        partner_name = case when e.partner_id is null then btrim(e.partner_name) else '' end,
        partner_belt = case when e.partner_id is null then e.partner_belt else tp.partner_belt end
    from entrada e
    where tp.id = e.id and tp.owner_id = eu and tp.training_id = p_training
  )
  insert into public.training_partners
    (training_id, owner_id, partner_id, partner_name, partner_belt,
     rolls, subs_for, subs_against)
  select p_training, eu, e.partner_id,
         case when e.partner_id is null then btrim(e.partner_name) else '' end,
         case when e.partner_id is null then e.partner_belt else null end,
         e.rolls, e.subs_for, e.subs_against
  from entrada e
  where e.id is null;
end $$;

revoke all on function public.salvar_parceiros_do_treino(uuid, jsonb) from public;
grant execute on function public.salvar_parceiros_do_treino(uuid, jsonb) to authenticated;

-- Os parceiros de um treino, para preencher o formulário de edição.
create or replace function public.parceiros_do_treino(p_training uuid)
  returns table (
    id uuid, partner_id uuid, partner_name text, partner_belt text,
    rolls integer, subs_for integer, subs_against integer,
    confirmacao text, handle text, nickname text
  )
  language sql stable security definer set search_path = public as $$
  select tp.id, tp.partner_id,
         coalesce(nullif(tp.partner_name, ''), p.nickname, p.handle, '') as partner_name,
         coalesce(tp.partner_belt, p.belt) as partner_belt,
         tp.rolls, tp.subs_for, tp.subs_against, tp.confirmacao,
         coalesce(p.handle, ''), coalesce(p.nickname, '')
  from public.training_partners tp
  left join public.profiles p on p.user_id = tp.partner_id
  where tp.training_id = p_training and tp.owner_id = auth.uid()
  order by tp.created_at;
$$;

revoke all on function public.parceiros_do_treino(uuid) from public;
grant execute on function public.parceiros_do_treino(uuid) to authenticated;
