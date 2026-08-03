-- ============================================================================
-- 028 — "Como foi a técnica hoje" é do DIA, não da técnica
-- ============================================================================
-- O botão de anotar técnica passa a pedir uma descrição junto do nome. A
-- pergunta que isso levanta: onde essa descrição mora?
--
-- A tentação é gravá-la em `techniques.notes`, que já existe. Está errado, e
-- de um jeito que só aparece na terceira vez:
--
--   1ª vez que registra armlock:  "consegui do 100 quilos"
--   2ª vez, três semanas depois:  "hoje travou, a pegada escapou"
--
-- Em `techniques.notes` a segunda apaga a primeira. E a primeira era a mais
-- valiosa das duas, porque é a que descreve o que funcionou.
--
-- A descrição é da SESSÃO. A mesma técnica rende observações diferentes a cada
-- treino, e é justamente a sequência delas que conta a história de como a
-- pessoa aprendeu aquilo. Por isso a nota vai no VÍNCULO.
--
-- `techniques.notes` continua existindo e continua sendo o que era: a
-- descrição geral da técnica, editada na galeria. As duas coisas convivem
-- porque são duas coisas.
-- ============================================================================

alter table public.training_techniques
  add column if not exists nota text not null default '';

alter table public.training_techniques
  drop constraint if exists training_techniques_nota_cabe;
alter table public.training_techniques
  add constraint training_techniques_nota_cabe check (length(nota) <= 2000);

-- ----------------------------------------------------------------------------
-- Registrar agora leva a nota do dia
-- ----------------------------------------------------------------------------
-- Cuidado no `on conflict` do vínculo: `do nothing` faria a segunda gravação
-- do mesmo treino perder a nota que a pessoa acabou de escrever. Aqui ele
-- atualiza — mas só quando há algo novo a dizer, para um salvamento sem
-- alteração não zerar o que já estava escrito.
create or replace function public.registrar_tecnica_do_treino(
  p_treino uuid,
  p_nome text,
  p_categoria text default '',
  p_nota text default ''
)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $BODY$
declare
  eu uuid := auth.uid();
  nome text := btrim(coalesce(p_nome, ''));
  -- NÃO se chama `nota`: dentro do `on conflict do update` uma variável com o
  -- nome da coluna sombreia a coluna, e o `case` passaria a comparar a
  -- variável em vez do valor que está chegando. O bug seria silencioso e só
  -- apareceria na segunda gravação do mesmo treino.
  nota_do_dia text := btrim(coalesce(p_nota, ''));
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

  insert into public.training_techniques (training_id, technique_id, user_id, nota)
  values (p_treino, id_tecnica, eu, nota_do_dia)
  on conflict (training_id, technique_id) do update
    set nota = case
                 when btrim(excluded.nota) <> '' then excluded.nota
                 else training_techniques.nota
               end;

  return id_tecnica;
end;
$BODY$;

revoke execute on function public.registrar_tecnica_do_treino(uuid, text, text, text)
  from public, anon;
grant execute on function public.registrar_tecnica_do_treino(uuid, text, text, text)
  to authenticated;

-- A assinatura de três argumentos vira lixo assim que o cliente novo sobe, e
-- sobrecarga esquecida é fonte de chamada indo para a função errada.
drop function if exists public.registrar_tecnica_do_treino(uuid, text, text);

-- ----------------------------------------------------------------------------
-- Leitura
-- ----------------------------------------------------------------------------
-- `create or replace` não muda o tipo de retorno de uma função que já existe:
-- o Postgres recusa com "cannot change return type". Uma coluna nova na tabela
-- de retorno é mudança de tipo, então tem que derrubar antes.
drop function if exists public.tecnicas_do_treino(uuid);

create function public.tecnicas_do_treino(p_treino uuid)
returns table (id uuid, name text, category text, nota text)
language sql stable security definer
set search_path to 'public'
as $BODY$
  select t.id, t.name, coalesce(t.category, ''), coalesce(tt.nota, '')
  from public.training_techniques tt
  join public.techniques t on t.id = tt.technique_id
  join public.trainings tr on tr.id = tt.training_id
  where tt.training_id = p_treino and tr.user_id = (select auth.uid())
  order by t.name;
$BODY$;

revoke execute on function public.tecnicas_do_treino(uuid) from public, anon;
grant execute on function public.tecnicas_do_treino(uuid) to authenticated;

-- O que a pessoa escreveu sobre uma técnica, treino a treino. É a história de
-- como ela aprendeu aquilo — e é o que `techniques.notes` sozinho apagava.
create or replace function public.anotacoes_da_tecnica(p_tecnica uuid)
returns table (data date, nota text)
language sql stable security definer
set search_path to 'public'
as $BODY$
  select tr.date, tt.nota
  from public.training_techniques tt
  join public.trainings tr on tr.id = tt.training_id
  where tt.technique_id = p_tecnica
    and tt.user_id = (select auth.uid())
    and btrim(tt.nota) <> ''
  order by tr.date desc;
$BODY$;

revoke execute on function public.anotacoes_da_tecnica(uuid) from public, anon;
grant execute on function public.anotacoes_da_tecnica(uuid) to authenticated;
