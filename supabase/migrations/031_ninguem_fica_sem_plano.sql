-- ============================================================================
-- 031 — Fechando os dois últimos buracos do plano
-- ============================================================================
-- Depois da 030, `branca_inicio` passou de 6 para 13 objetivos com conteúdo, e
-- como ela é a raiz do fallback isso encheu também `branca_avancada`, `roxa`,
-- `marrom` e `preta`. Sobraram dois furos, os dois no meio da tabela.
--
-- 1. `azul_avancada` ficava com 6 objetivos vazios
--
--    A cadeia dela é ['azul_avancada', 'azul', 'branca_avancada'] e para aí.
--    Como `azul` e `azul_avancada` não têm conteúdo próprio, ela só alcançava
--    os 8 de `branca_avancada` — e os outros 6 caíam no vazio, porque a busca
--    nunca chegava a `branca_inicio`.
--
--    A cadeia curta é deliberada e continua fazendo sentido para o topo: é
--    melhor um faixa-preta não ver plano nenhum do que ver "aprenda a fuga de
--    quadril". Por isso a correção NÃO é alongar todas as cadeias — é alongar
--    só esta. Entre um azul de 3 graus e um branca avançada há um degrau; o
--    conteúdo de `branca_inicio` é conservador para ele, não é ofensivo.
--
-- 2. `pernas` só existia em `roxa`
--
--    O objetivo exige faixa azul (`faixa_min = 'Azul'`), então nunca aparece
--    para branca. Mas azul e azul_avancada só olham para BAIXO, e abaixo delas
--    ninguém tem jogo de perna. Resultado: o único objetivo que a faixa azul
--    ganha ao graduar era exatamente o que não tinha conteúdo para ela.
--
--    Alongar a cadeia não resolve isso — resolver para cima faria um azul
--    receber plano de roxa. O certo é escrever o conteúdo na faixa em que o
--    tema aparece, que é o que está aqui embaixo.
-- ============================================================================

-- 1. a cadeia de azul_avancada alcança branca_inicio ------------------------
create or replace function public.niveis_de_fallback(p_nivel text)
returns text[]
language sql
immutable
set search_path to 'pg_catalog'
as $function$
  select case p_nivel
    when 'branca_inicio'   then array['branca_inicio']
    when 'branca_avancada' then array['branca_avancada','branca_inicio']
    when 'azul'            then array['azul','branca_avancada','branca_inicio']
    -- a única cadeia de quatro: sem o último degrau, seis objetivos ficavam
    -- sem plano nenhum para o azul de 3 e 4 graus
    when 'azul_avancada'   then array['azul_avancada','azul','branca_avancada','branca_inicio']
    when 'roxa'            then array['roxa','azul_avancada','azul']
    when 'marrom'          then array['marrom','roxa','azul_avancada']
    else                        array['preta','marrom','roxa']
  end;
$function$;

-- 2. jogo de perna para quem acabou de poder vê-lo --------------------------
insert into public.plan_templates (objective_slug, nivel, variante, titulo, resumo, semanas) values

('pernas', 'azul', '', 'Entrar na perna sem se machucar',
 'Jogo de perna na azul é onde mais gente se lesiona, e quase sempre por dois motivos: entrar sem controlar o quadril e demorar a bater. O mês trata a segurança como parte da técnica, não como aviso no fim da aula.',
 '[
   {"semana":1,"foco":"A regra antes da posição","itens":[
     {"texto":"Combinar com os parceiros: bateu, soltou na hora","alvo":0},
     {"texto":"Aprender a diferença entre reta e torção, e o que dói sem avisar","alvo":0},
     {"texto":"5 rolas batendo CEDO em qualquer chave de perna","alvo":5},
     {"texto":"Anotar em que entrada você se sente inseguro","alvo":0}]},
   {"semana":2,"foco":"Uma entrada só","itens":[
     {"texto":"Escolher UMA entrada de jogo de perna e ficar nela o mês","alvo":0},
     {"texto":"30 repetições dela sem resistência","alvo":30},
     {"texto":"4 rolas tentando só essa entrada","alvo":4},
     {"texto":"Anotar se você controla o quadril antes de girar","alvo":0}]},
   {"semana":3,"foco":"Defender antes de atacar","itens":[
     {"texto":"Aprender a soltar o pé antes de a chave fechar","alvo":0},
     {"texto":"4 rolas deixando o parceiro entrar de propósito, para escapar","alvo":4},
     {"texto":"Anotar quantas vezes escapou e quantas bateu","alvo":0},
     {"texto":"Perguntar a um faixa-marrom o que ele vê na sua defesa","alvo":0}]},
   {"semana":4,"foco":"Juntar com o resto do jogo","itens":[
     {"texto":"4 rolas ligando a sua guarda à entrada de perna","alvo":4},
     {"texto":"Anotar de que posição a entrada aparece sozinha","alvo":0},
     {"texto":"Nenhuma lesão no mês — se houve, o plano falhou","alvo":0},
     {"texto":"Reavaliar sua nota de jogo de perna de 0 a 5","alvo":0}]}
 ]'::jsonb)

on conflict (objective_slug, nivel, variante) do update set
  titulo = excluded.titulo,
  resumo = excluded.resumo,
  semanas = excluded.semanas,
  ativo = true,
  updated_at = now();
