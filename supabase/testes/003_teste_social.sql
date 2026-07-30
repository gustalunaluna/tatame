-- Teste das políticas da camada social, com duas contas de verdade.
-- Roda inteiro e se limpa no final. Se algum "esperado" não bater, é bug.
--
-- Uso: cole no SQL Editor do Supabase e rode. Confira a coluna `ok`.

-- ---------------------------------------------------------------------------
-- Cenário
-- ---------------------------------------------------------------------------
do $$
declare a uuid; b uuid; treino uuid; reg uuid; equipe uuid;
begin
  delete from auth.users where email in ('teste.a@tatame.local','teste.b@tatame.local');

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
          'authenticated','authenticated','teste.a@tatame.local','x',now(),now(),now())
  returning id into a;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
          'authenticated','authenticated','teste.b@tatame.local','x',now(),now(),now())
  returning id into b;

  insert into public.profiles (user_id, nickname, handle, belt, degrees, gym, master, goal_start, seeded)
  values (a,'Ana','ana.teste','Azul',1,'Bonsai','Gui',current_date,true),
         (b,'Joaozinho','joaozinho123','Branca',2,'Bonsai','Gui',current_date,true);

  create temp table ids (nome text primary key, id uuid);
  insert into ids values ('a', a), ('b', b);
end $$;

-- ---------------------------------------------------------------------------
-- ANA: privacidade dos dados alheios e busca só por @ exato
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='a'), 'role','authenticated')::text, true);

select
  'ANA' as quem,
  (select count(*) from public.buscar_por_handle('@joaozinho123')) = 1 as acha_pelo_arroba_exato,
  (select count(*) from public.buscar_por_handle('joao'))          = 0 as nao_acha_por_parcial,
  (select count(*) from public.buscar_por_handle('ana.teste'))     = 0 as nao_acha_a_si_mesma,
  (select count(*) from public.profiles)                            = 1 as le_so_o_proprio_perfil,
  (select count(*) from public.trainings)                           = 0 as nao_ve_treino_alheio;
rollback;

-- ANA convida, cria equipe e registra um treino
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='a'), 'role','authenticated')::text, true);

insert into public.partnerships (requester_id, addressee_id)
values ((select id from ids where nome='a'), (select id from ids where nome='b'));

perform public.pedir_equipe('Equipe De Teste','Curitiba','Gui');
commit;

-- ---------------------------------------------------------------------------
-- JOÃOZINHO: vê o convite, não vê equipe pendente alheia
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='b'), 'role','authenticated')::text, true);

select
  'JOAOZINHO' as quem,
  (select count(*) from public.partnerships
     where addressee_id = auth.uid() and status='pendente') = 1 as recebeu_o_convite,
  (select count(*) from public.teams)        = 0 as nao_ve_equipe_pendente_alheia,
  (select count(*) from public.team_members) = 0 as nao_ve_membros_de_equipe_alheia;

perform public.responder_parceria(
  (select id from public.partnerships where addressee_id = auth.uid() limit 1), true);
commit;

-- ---------------------------------------------------------------------------
-- ANA registra o treino com placar
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='a'), 'role','authenticated')::text, true);

insert into public.trainings (user_id, date, type, duration_min, rolls, partners, techniques, notes)
values (auth.uid(), current_date, 'Gi', 90, 6, '', '', '');

insert into public.training_partners (training_id, owner_id, partner_id, rolls, subs_for, subs_against)
values ((select id from public.trainings where user_id = auth.uid() order by created_at desc limit 1),
        auth.uid(), (select id from ids where nome='b'), 5, 3, 1);

-- parceiro sem conta: entra direto na contagem, ninguém tem o que confirmar
insert into public.training_partners (training_id, owner_id, partner_name, rolls, subs_for, subs_against)
values ((select id from public.trainings where user_id = auth.uid() order by created_at desc limit 1),
        auth.uid(), 'Pedro da academia', 2, 0, 2);

select
  'ANA antes da confirmacao' as quem,
  (select sessoes from public.resumo_parceiros()
     where partner_id = (select id from ids where nome='b')) = 0 as nao_conta_antes_de_confirmar,
  (select pendentes from public.resumo_parceiros()
     where partner_id = (select id from ids where nome='b')) = 1 as marca_como_pendente,
  (select sessoes from public.resumo_parceiros() where partner_id is null) = 1
    as parceiro_sem_conta_conta_na_hora;
commit;

-- ---------------------------------------------------------------------------
-- JOÃOZINHO tenta abusar, depois confirma
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='b'), 'role','authenticated')::text, true);

-- 1) adulterar o placar direto na tabela
update public.training_partners set subs_for = 0, subs_against = 99 where partner_id = auth.uid();

select
  'JOAOZINHO abusos' as quem,
  (select count(*) from public.training_partners where subs_against = 99) = 0
    as nao_consegue_adulterar_o_placar,
  (select count(*) from public.training_partners) = 1
    as so_enxerga_o_registro_sobre_ele,
  (select count(*) from public.trainings) = 0
    as nao_enxerga_o_treino_da_ana,
  (select count(*) from public.registros_a_confirmar()) = 1
    as recebe_para_confirmar;
rollback;

-- 2) confirmar registro que não é sobre ele → deve levantar exceção
do $$
declare alheio uuid;
begin
  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select id from ids where nome='b'), 'role','authenticated')::text, true);
  select id into alheio from public.training_partners where partner_id is null limit 1;
  begin
    perform public.responder_registro(alheio, true);
    raise exception 'FALHOU: confirmou registro alheio';
  exception when sqlstate 'P0001' then
    raise notice 'ok: nao confirma registro alheio';
  end;
  perform set_config('role','postgres', true);
end $$;

-- 3) confirmação legítima
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='b'), 'role','authenticated')::text, true);
select public.responder_registro(
  (select id from public.training_partners where partner_id = auth.uid() limit 1), true);
commit;

-- ---------------------------------------------------------------------------
-- O espelho: o mesmo treino, invertido para cada lado
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='a'), 'role','authenticated')::text, true);
select 'ANA depois' as quem, rolls = 5 as rolas_ok, subs_for = 3 as finalizou_3, subs_against = 1 as levou_1
from public.resumo_parceiros() where partner_id = (select id from ids where nome='b');
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from ids where nome='b'), 'role','authenticated')::text, true);
select 'JOAOZINHO depois' as quem, rolls = 5 as rolas_ok, subs_for = 1 as finalizou_1, subs_against = 3 as levou_3
from public.resumo_parceiros() where partner_id = (select id from ids where nome='a');
rollback;

-- ---------------------------------------------------------------------------
-- Limpeza
-- ---------------------------------------------------------------------------
delete from auth.users where email in ('teste.a@tatame.local','teste.b@tatame.local');
