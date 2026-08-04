-- ============================================================================
-- 036 — Dá para sair: exclusão de conta e exportação dos próprios dados
-- ============================================================================
-- Até aqui não havia porta de saída. Quem criava conta ficava com ela para
-- sempre: nem apagar, nem levar os dados embora.
--
-- Isso é exigência de três lados ao mesmo tempo:
--   • LGPD, art. 18, VI e V — eliminação e portabilidade dos dados;
--   • App Store, diretriz 5.1.1(v) — app que cria conta tem de excluir conta;
--   • Google Play — mesma exigência, e ainda um caminho web para pedir a
--     exclusão sem instalar o app.
--
-- Esta migração faz três coisas, nesta ordem — e a primeira é a que importa.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. A equipe não morre junto com quem a fundou
-- ----------------------------------------------------------------------------
-- `teams.created_by` era NOT NULL e apontava para auth.users com ON DELETE
-- CASCADE. Some quem fundou, some a equipe — e `team_members` cascateia de
-- `teams`, então TODOS os membros perdiam o vínculo. Uma pessoa exercendo um
-- direito próprio apagaria dado de dezenas de terceiros.
--
-- Passa a SET NULL: a equipe fica sem fundador registrado e continua de pé.
-- A política "ver equipes" (`status = 'aprovada' OR created_by = auth.uid()`)
-- continua correta com NULL — `NULL = uid` não é verdadeiro, e equipe aprovada
-- é visível pelo primeiro termo de qualquer jeito.

alter table public.teams
  alter column created_by drop not null;

alter table public.teams
  drop constraint if exists teams_created_by_fkey;

alter table public.teams
  add constraint teams_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

comment on column public.teams.created_by is
  'Quem pediu a criação da equipe. NULL quando essa pessoa excluiu a conta — a equipe sobrevive ao fundador de propósito (migração 036).';


-- ----------------------------------------------------------------------------
-- 2. Exportar os próprios dados
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER de propósito (é o padrão, explicitado aqui para quem lê):
-- a função roda com os privilégios de quem chama, então o RLS de cada tabela
-- decide o que sai. Não existe caminho para exportar dado alheio, e isso não
-- depende de nenhum `where user_id = auth.uid()` estar escrito certo aqui.

create or replace function public.meus_dados()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'exportado_em',  now(),
    'formato',       'ponteira/1',
    'perfil',        (select to_jsonb(p) from profiles p where p.user_id = auth.uid()),
    'treinos',       (select coalesce(jsonb_agg(to_jsonb(t) order by t.date), '[]'::jsonb) from trainings t where t.user_id = auth.uid()),
    'tecnicas',      (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from techniques x where x.user_id = auth.uid()),
    'parceiros',     (select coalesce(jsonb_agg(to_jsonb(tp)), '[]'::jsonb) from training_partners tp where tp.owner_id = auth.uid()),
    'graduacoes',    (select coalesce(jsonb_agg(to_jsonb(g) order by g.data), '[]'::jsonb) from graduations g where g.user_id = auth.uid()),
    'medalhas',      (select coalesce(jsonb_agg(to_jsonb(m) order by m.data), '[]'::jsonb) from medals m where m.user_id = auth.uid()),
    'metas',         (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from goals g where g.user_id = auth.uid()),
    'conquistas',    (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from achievements a where a.user_id = auth.uid()),
    'analises',      (select coalesce(jsonb_agg(to_jsonb(a) order by a.date), '[]'::jsonb) from analyses a where a.user_id = auth.uid()),
    'planos',        (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from plan_cycles c where c.user_id = auth.uid()),
    'plano_itens',   (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from plan_cycle_items i where i.user_id = auth.uid()),
    'plano_semanas', (select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) from plan_weeks w where w.user_id = auth.uid()),
    'jogo',          (select coalesce(jsonb_agg(to_jsonb(av) order by av.mes), '[]'::jsonb) from avaliacoes_do_jogo av where av.user_id = auth.uid()),
    'pontos_fracos', (select coalesce(jsonb_agg(to_jsonb(wp)), '[]'::jsonb) from weak_points wp where wp.user_id = auth.uid()),
    'mestres',       (select coalesce(jsonb_agg(to_jsonb(ml)), '[]'::jsonb) from master_links ml where ml.aluno_id = auth.uid()),
    'equipes',       (select coalesce(jsonb_agg(to_jsonb(tm)), '[]'::jsonb) from team_members tm where tm.user_id = auth.uid())
  );
$$;

comment on function public.meus_dados() is
  'Exportação LGPD art. 18, V. SECURITY INVOKER: o RLS de cada tabela é quem decide o que sai.';

revoke execute on function public.meus_dados() from public, anon;
grant  execute on function public.meus_dados() to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Excluir a própria conta
-- ----------------------------------------------------------------------------
-- Precisa ser SECURITY DEFINER: `auth.users` não é do usuário, e apagar a linha
-- de lá é o que dispara os ON DELETE CASCADE de todas as tabelas do app de uma
-- vez — nenhum órfão fica para trás, sem lista de tabelas para manter aqui e
-- esquecer de atualizar depois.
--
-- O que NÃO é apagado, de propósito, porque é dado de outra pessoa:
--   • training_partners.partner_id → SET NULL, e o partner_name fica. O treino
--     do seu parceiro continua dizendo que ele rolou com você naquele dia.
--   • graduations.mestre_id e master_links.mestre_id → SET NULL, mestre_nome
--     fica. A graduação do aluno não perde de quem ela veio.
--   • teams → agora SET NULL (parte 1). A equipe sobrevive.
--
-- `auth.uid()` é lido de dentro da função e nunca vem por parâmetro: não há
-- assinatura possível para "apague a conta de outro".

create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'Precisa estar autenticado para excluir a conta.'
      using errcode = '28000';
  end if;

  delete from auth.users where id = eu;
end;
$$;

comment on function public.excluir_minha_conta() is
  'Exclusão LGPD art. 18, VI / App Store 5.1.1(v). Apaga auth.users e deixa o CASCADE varrer o resto. Só apaga quem chama.';

revoke execute on function public.excluir_minha_conta() from public, anon;
grant  execute on function public.excluir_minha_conta() to authenticated;
