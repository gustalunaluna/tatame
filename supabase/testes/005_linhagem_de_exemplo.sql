-- ============================================================================
-- Linhagem de exemplo — a corrente inteira, de qualquer aluno até o Maeda
-- ============================================================================
-- Roda depois de 004_contas_de_teste.sql. É idempotente: só cria vínculo para
-- quem ainda não tem, então rodar duas vezes não duplica ninguém.
--
-- O que ele monta:
--
--   Mitsuyo Maeda (sem conta — e é assim mesmo)
--     └ Carlos Gracie
--        └ Hélio Gracie
--           ├ Rickson Gracie ─┐
--           ├ Carlos Gracie Jr┤  os 24 faixas-pretas da Academia Gracie
--           │                 └  e, abaixo deles, os alunos
--           └ Grão-Mestre Rui
--              └ Mestre Coral
--                 ├ Mestre Silva (dono da Academia Teste)
--                 └ Rafael
--                    └ os 16 alunos da Academia Teste
--
-- Duas regras que o seed respeita porque o jiu-jitsu respeita:
--
--   1. QUEM GRADUA É FAIXA-PRETA. Marrom e roxa instruem, não entregam faixa.
--      Por isso todo aluno abaixo da preta aponta para um preta, e o vínculo
--      com o instrutor do dia a dia entra separado, com papel 'instrutor' e
--      `principal = false` — ele aparece no perfil sem entrar na corrente.
--   2. UM FUNDADOR NÃO GRADUA FAIXA-BRANCA. A primeira versão deste seed
--      deixou faixas-brancas penduradas direto no Carlos Gracie, o que
--      encurtava a linhagem para três níveis e não acontece em academia
--      nenhuma. O bloco 3 conserta isso.
-- ============================================================================

/* --- 1. os 24 faixas-pretas da Academia Gracie --------------------------- */
with gracie as (select id from public.teams where slug = 'academia-gracie'),
graduadores as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as i
  from public.profiles p
  where p.handle in ('rickson.gracie', 'carlosjr.gracie', 'helio.gracie')
),
pretas as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as n
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from gracie) and tm.status = 'ativo' and p.belt = 'Preta'
)
insert into public.master_links (aluno_id, mestre_id, team_id, papel, principal, desde)
select pr.user_id, g.user_id, (select id from gracie), 'mestre', true,
       make_date(1990 + (pr.n % 20), 1 + (pr.n % 12), 15)
from pretas pr
join graduadores g on g.i = pr.n % 3
where not exists (select 1 from public.master_links ml where ml.aluno_id = pr.user_id);

/* --- 2. os alunos, cada um com o preta que o graduou --------------- */
with gracie as (select id from public.teams where slug = 'academia-gracie'),
pretas as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as i,
         count(*) over () as total
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from gracie) and tm.status = 'ativo' and p.belt = 'Preta'
),
alunos as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as n
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from gracie) and tm.status = 'ativo'
    and p.belt in ('Branca', 'Azul', 'Roxa', 'Marrom')
    and not exists (select 1 from public.master_links ml where ml.aluno_id = p.user_id)
)
insert into public.master_links (aluno_id, mestre_id, team_id, papel, principal, desde)
select a.user_id, pt.user_id, (select id from gracie), 'mestre', true,
       make_date(2008 + (a.n % 17), 1 + (a.n % 12), 10)
from alunos a
join pretas pt on pt.i = a.n % pt.total;

/* --- 3. ninguém abaixo da preta pendurado num fundador ------------------- */
with gracie as (select id from public.teams where slug = 'academia-gracie'),
pretas as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as i,
         count(*) over () as total
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from gracie) and tm.status = 'ativo' and p.belt = 'Preta'
),
errados as (
  select ml.id, (row_number() over (order by ml.id) - 1)::int as n
  from public.master_links ml
  join public.profiles aluno on aluno.user_id = ml.aluno_id
  join public.profiles mestre on mestre.user_id = ml.mestre_id
  where ml.principal
    and aluno.belt in ('Branca', 'Azul', 'Roxa', 'Marrom')
    and mestre.belt = 'Vermelha'
)
update public.master_links ml
set mestre_id = pt.user_id
from errados e
join pretas pt on pt.i = e.n % pt.total
where ml.id = e.id;

/* --- 4. o instrutor do dia a dia, fora da corrente ----------------------- */
-- `principal = false`: ele aparece em "Outros mestres" no perfil e NÃO entra
-- na linhagem. Quem dá a sua aula de terça não é necessariamente quem assina
-- a sua faixa, e o app precisa saber a diferença.
with gracie as (select id from public.teams where slug = 'academia-gracie'),
instrutores as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as i,
         count(*) over () as total
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from gracie) and tm.status = 'ativo' and tm.role = 'instrutor'
),
alunos as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as n
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from gracie) and tm.status = 'ativo'
    and p.belt in ('Branca', 'Azul')
    and (select count(*) from public.master_links ml where ml.aluno_id = p.user_id) = 1
)
insert into public.master_links (aluno_id, mestre_id, team_id, papel, principal, desde, nota)
select a.user_id, ins.user_id, (select id from gracie), 'instrutor', false,
       make_date(2018 + (a.n % 7), 1 + (a.n % 12), 5), 'aula do dia a dia'
from alunos a
join instrutores ins on ins.i = a.n % ins.total;

/* --- 5. a Academia Teste, pendurada na linhagem Gracie ------------------- */
-- É o que faz o exemplo valer: a conta do Joãozinho, faixa branca numa
-- academia de dezoito pessoas, sobe sete níveis até o Maeda.
with ids as (
  select handle, user_id from public.profiles
  where handle in ('helio.gracie', 'vermelha.teste', 'coral.teste', 'mestre.silva', 'rafael.teste')
),
teste as (select id from public.teams where slug = 'academia-teste'),
novos(aluno, mestre, com_equipe, quando) as (
  values ('vermelha.teste', 'helio.gracie',   false, date '1968-03-10'),
         ('coral.teste',    'vermelha.teste', true,  date '1985-06-01'),
         ('mestre.silva',   'coral.teste',    true,  date '2004-09-20'),
         ('rafael.teste',   'coral.teste',    true,  date '2011-11-05')
)
insert into public.master_links (aluno_id, mestre_id, team_id, papel, principal, desde)
select a.user_id, m.user_id,
       case when n.com_equipe then (select id from teste) end,
       'mestre', true, n.quando
from novos n
join ids a on a.handle = n.aluno
join ids m on m.handle = n.mestre
where not exists (select 1 from public.master_links ml where ml.aluno_id = a.user_id);

/* --- 6. os alunos da Academia Teste -------------------------------------- */
with teste as (select id from public.teams where slug = 'academia-teste'),
graduadores as (
  select user_id, (row_number() over (order by handle) - 1)::int as i, count(*) over () as total
  from public.profiles where handle in ('mestre.silva', 'rafael.teste')
),
alunos as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as n
  from public.team_members tm
  join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = (select id from teste) and tm.status = 'ativo'
    and p.belt in ('Branca', 'Azul', 'Roxa', 'Marrom')
    and not exists (select 1 from public.master_links ml where ml.aluno_id = p.user_id)
)
insert into public.master_links (aluno_id, mestre_id, team_id, papel, principal, desde)
select a.user_id, g.user_id, (select id from teste), 'mestre', true,
       make_date(2016 + (a.n % 9), 1 + (a.n % 12), 12)
from alunos a join graduadores g on g.i = a.n % g.total;

/* --- 7. as contas soltas de teste, uma por faixa ------------------------- */
with graduadores as (
  select user_id, (row_number() over (order by handle) - 1)::int as i, count(*) over () as total
  from public.profiles where handle in ('mestre.silva', 'rafael.teste', 'carlosjr.gracie')
),
soltos as (
  select p.user_id, (row_number() over (order by p.handle) - 1)::int as n
  from public.profiles p
  where p.handle in ('sofia.teste', 'diego.teste', 'nicolas.teste', 'bruno.teste',
                     'paula.teste', 'carlosjj', 'vitor.teste', 'felipe.teste', 'gustavo')
    and not exists (select 1 from public.master_links ml where ml.aluno_id = p.user_id)
)
insert into public.master_links (aluno_id, mestre_id, papel, principal, desde)
select s.user_id, g.user_id, 'mestre', true, make_date(2017 + (s.n % 8), 1 + (s.n % 12), 8)
from soltos s join graduadores g on g.i = s.n % g.total;

/* --- conferência --------------------------------------------------------- */
-- Sete níveis, terminando em quem nunca vai abrir o app.
--   select * from public.linhagem_de('joaozinho');
