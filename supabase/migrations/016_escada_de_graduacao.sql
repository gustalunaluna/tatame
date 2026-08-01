-- ============================================================================
-- 016 — A escada de graduação, como ela é de verdade
-- ============================================================================
-- O app tratava coral e vermelha como faixas novas, cada uma recomeçando a
-- contagem de graus do zero. Não é assim.
--
-- DEPOIS DA PRETA NÃO EXISTE FAIXA NOVA. Existe a mesma faixa-preta com mais
-- graus, e a partir do sétimo o grau muda a cor do tecido em vez de
-- acrescentar listra:
--
--   Branca, Azul, Roxa, Marrom   0 a 4    listras na ponteira
--   Preta                        0 a 6    listras na ponteira
--   Coral (vermelha e preta)     7º grau  o tecido muda
--   Coral (vermelha e branca)    8º grau  o tecido muda
--   Vermelha                     9º e 10º o tecido muda
--
-- Três coisas estavam erradas:
--
--   1. `graduations` tinha coral e vermelha com 0 a 4 graus — registros de um
--      backfill que tratou as duas como faixas comuns. São 10 linhas.
--   2. A preta só admitia até o 4º grau nos formulários. O 5º e o 6º existem.
--   3. `goals.target_degrees` parava em 6, o que impedia uma meta de coral ou
--      de vermelha.
--
-- Sem trava no banco, isso volta na próxima tela que alguém escrever.
-- ============================================================================

/* --- 1. a regra, num lugar só -------------------------------------------- */
create or replace function public.grau_valido(p_belt text, p_graus int)
returns boolean
language sql immutable
set search_path to 'pg_catalog'
as $$
  select case p_belt
    when 'Branca'   then p_graus between 0 and 4
    when 'Azul'     then p_graus between 0 and 4
    when 'Roxa'     then p_graus between 0 and 4
    when 'Marrom'   then p_graus between 0 and 4
    when 'Preta'    then p_graus between 0 and 6
    when 'Coral'    then p_graus in (7, 8)
    when 'Vermelha' then p_graus in (9, 10)
    else false
  end;
$$;

revoke execute on function public.grau_valido(text, int) from public, anon;
grant execute on function public.grau_valido(text, int) to authenticated;

/* --- 2. as travas antigas saem antes do conserto ------------------------- */
-- A ordem importa e me custou duas tentativas: a trava velha de `goals`
-- limitava o alvo a 6, e ela recusava o próprio UPDATE que conserta a linha
-- de meta para faixa vermelha. Derrubar primeiro, consertar, travar de novo.
alter table public.graduations drop constraint if exists graduations_degrees_check;
alter table public.goals       drop constraint if exists goals_target_degrees_check;

/* --- 3. conserta o que já está gravado errado ---------------------------- */
-- Coral e vermelha com grau de 1 a 4 são graduações que não existem: foram
-- inventadas por um backfill que tratou as duas como faixas comuns. Apagar é
-- o certo — corrigir o número criaria um histórico de cerimônias que nunca
-- aconteceram. O que fica é a mais antiga de cada faixa, essa sim real.
delete from public.graduations
where belt in ('Coral', 'Vermelha') and degrees between 1 and 4;

update public.graduations set degrees = 7 where belt = 'Coral'    and degrees = 0;
update public.graduations set degrees = 9 where belt = 'Vermelha' and degrees = 0;

update public.profiles set degrees = least(degrees, 6)
where belt = 'Preta' and degrees > 6;

update public.profiles set degrees = least(degrees, 4)
where belt in ('Branca', 'Azul', 'Roxa', 'Marrom') and degrees > 4;

-- Uma meta de "faixa vermelha, sem grau" não existe: a vermelha É o 9º grau.
update public.goals set target_degrees = 7
where target_belt = 'Coral'
  and (target_degrees is null or target_degrees not in (7, 8));

update public.goals set target_degrees = 9
where target_belt = 'Vermelha'
  and (target_degrees is null or target_degrees not in (9, 10));

/* --- 4. a trava ---------------------------------------------------------- */
alter table public.graduations add constraint graduations_escada_check
  check (public.grau_valido(belt, degrees));

alter table public.profiles drop constraint if exists profiles_escada_check;
alter table public.profiles add constraint profiles_escada_check
  check (public.grau_valido(belt, degrees));

alter table public.goals add constraint goals_target_degrees_check
  check (
    target_degrees is null
    or target_belt is null
    or public.grau_valido(target_belt, target_degrees)
  );
