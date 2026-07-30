-- Conteúdo dos planos mensais — faixa branca (início e avançada).
--
-- Cada plano é 1 mês = 4 semanas. A semana 4 é sempre de integração e teste:
-- é ela que fecha o ciclo e mede se adiantou.
--
-- Cada semana mistura três naturezas, que é o que faz o plano ser executável:
--   drill  — o que fazer antes ou depois da aula
--   rola   — a instrução que muda o jogo naquele dia
--   estudo — um vídeo, uma posição para observar
--
-- `alvo` > 0 vira contador na tela ("3 rolas" = 0/3). `alvo` 0 é check simples.
--
-- Idempotente: reexecutar atualiza o conteúdo sem duplicar.

create or replace function public.por_plano(
  p_objetivo text, p_nivel text, p_variante text,
  p_titulo text, p_resumo text, p_semanas jsonb
) returns void language sql security definer set search_path = public as $$
  insert into public.plan_templates (objective_slug, nivel, variante, titulo, resumo, semanas)
  values (p_objetivo, p_nivel, p_variante, p_titulo, p_resumo, p_semanas)
  on conflict (objective_slug, nivel, variante) do update
    set titulo = excluded.titulo, resumo = excluded.resumo,
        semanas = excluded.semanas, updated_at = now();
$$;
revoke all on function public.por_plano(text,text,text,text,text,jsonb) from public, anon, authenticated;

-- ===========================================================================
-- RETENÇÃO DE GUARDA
-- ===========================================================================
select public.por_plano('retencao', 'branca_inicio', '',
  'Não ser passado',
  'Antes de jogar guarda, aprender a não perder ela. Quadril, enquadramento e a linha das pernas.',
  $j$[
    {"semana":1,"foco":"Quadril solto","itens":[
      {"texto":"Fuga de quadril (shrimp) — 5 min antes da aula","alvo":3},
      {"texto":"No rola: manter os joelhos e os pés entre você e ele","alvo":0},
      {"texto":"Rolar podendo perder tudo, menos ser passado","alvo":3},
      {"texto":"Estudar um vídeo curto sobre fuga de quadril","alvo":0}]},
    {"semana":2,"foco":"Guarda fechada como abrigo","itens":[
      {"texto":"Fechar a guarda e segurar 1 min sem deixar abrir","alvo":3},
      {"texto":"Puxar a cabeça dele para baixo sempre que ele levantar a postura","alvo":0},
      {"texto":"Drill: ele tenta abrir, você fecha de novo — 10x","alvo":2},
      {"texto":"Perguntar ao professor como fechar a guarda de novo depois de aberta","alvo":0}]},
    {"semana":3,"foco":"Meia-guarda em vez de nada","itens":[
      {"texto":"Quando abrir a guarda, prender uma perna em vez de dar as costas","alvo":0},
      {"texto":"Drill de joelho-shield — 10x cada lado","alvo":2},
      {"texto":"Rolar começando já na meia-guarda","alvo":3},
      {"texto":"Nunca virar de costas para escapar — anotar se aconteceu","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de 5 min só tentando não ser passado","alvo":2},
      {"texto":"Repetir os drills das semanas 1 a 3, 3 min cada","alvo":2},
      {"texto":"Reavaliar sua nota de retenção de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

select public.por_plano('retencao', 'branca_avancada', '',
  'Retenção ativa',
  'Sair do modo sobrevivência: recompor guarda em movimento e ganhar a briga de pegadas antes da passagem.',
  $j$[
    {"semana":1,"foco":"Quadril e enquadramento","itens":[
      {"texto":"Fuga de quadril e ponte — 5 min antes da aula","alvo":3},
      {"texto":"No rola: joelhos e pés sempre na linha entre vocês","alvo":0},
      {"texto":"3 rolas em que você pode perder tudo, menos ser passado","alvo":3},
      {"texto":"Estudar um vídeo de recomposição de guarda","alvo":0}]},
    {"semana":2,"foco":"Recomposição","itens":[
      {"texto":"Drill: ele chega na meia-guarda, você recompõe — 10x cada lado","alvo":2},
      {"texto":"Joelho-shield com o quadril fora da linha de pressão","alvo":0},
      {"texto":"Começar rolas já na posição ruim, com ele na meia","alvo":3},
      {"texto":"Anotar quantas vezes conseguiu recompor","alvo":0}]},
    {"semana":3,"foco":"A briga de pegadas antes da passagem","itens":[
      {"texto":"Quebrar a pegada dele antes de fazer qualquer coisa","alvo":0},
      {"texto":"Pegar primeiro: manga e gola","alvo":0},
      {"texto":"3 rolas em que o objetivo é só vencer as pegadas","alvo":3},
      {"texto":"Estudar uma quebra de pegada específica e treinar 20x","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de 5 min sem ser passado, com alguém mais graduado","alvo":2},
      {"texto":"Repetir os drills das semanas 1 a 3, 3 min cada","alvo":2},
      {"texto":"Reavaliar sua nota de retenção de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- Variante para quem já joga De La Riva
select public.por_plano('retencao', 'branca_avancada', 'dlr',
  'Retenção pela De La Riva',
  'Usar o gancho da DLR como primeira barreira e recompor por ela quando ele tenta passar.',
  $j$[
    {"semana":1,"foco":"O gancho como barreira","itens":[
      {"texto":"Drill de entrada na DLR — 20 reps por lado","alvo":3},
      {"texto":"No rola: buscar o gancho antes que ele encoste no seu quadril","alvo":0},
      {"texto":"3 rolas abrindo sempre pela DLR","alvo":3},
      {"texto":"Estudar a pegada de tornozelo + gola","alvo":0}]},
    {"semana":2,"foco":"Quando ele tira o gancho","itens":[
      {"texto":"Drill: ele desmonta a DLR, você recompõe para meia ou fechada","alvo":2},
      {"texto":"Transição DLR para X e single-leg X","alvo":0},
      {"texto":"3 rolas praticando a saída quando a DLR morre","alvo":3},
      {"texto":"Anotar como ele costuma matar o seu gancho","alvo":0}]},
    {"semana":3,"foco":"Pegadas que sustentam a DLR","itens":[
      {"texto":"Nunca soltar a pegada de manga na troca","alvo":0},
      {"texto":"Quebrar a pegada dele na sua calça antes de agir","alvo":0},
      {"texto":"3 rolas vencendo a briga de pegadas de baixo","alvo":3},
      {"texto":"Estudar um vídeo de grip fighting na guarda aberta","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de 5 min sem ser passado, abrindo pela DLR","alvo":2},
      {"texto":"Repetir os drills das semanas 1 a 3","alvo":2},
      {"texto":"Reavaliar sua nota de retenção de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- PASSAGEM DE GUARDA
-- ===========================================================================
select public.por_plano('passagem', 'branca_inicio', '',
  'Passar com o básico',
  'Postura, abrir a guarda e uma passagem só — feita muitas vezes até sair sozinha.',
  $j$[
    {"semana":1,"foco":"Postura antes de tudo","itens":[
      {"texto":"Drill de postura na guarda fechada — 2 min por rodada","alvo":3},
      {"texto":"No rola: coluna ereta e cotovelos colados ao corpo","alvo":0},
      {"texto":"Nunca deixar ele puxar sua cabeça para baixo","alvo":0},
      {"texto":"Estudar um vídeo de postura na guarda fechada","alvo":0}]},
    {"semana":2,"foco":"Abrir a guarda","itens":[
      {"texto":"Drill de abertura em pé — 10x","alvo":3},
      {"texto":"Abrir sempre pelo mesmo lado até virar automático","alvo":0},
      {"texto":"3 rolas em que você só precisa abrir a guarda","alvo":3},
      {"texto":"Perguntar ao professor a abertura que ele prefere","alvo":0}]},
    {"semana":3,"foco":"Uma passagem só","itens":[
      {"texto":"Escolher uma passagem e treinar 20x por lado","alvo":3},
      {"texto":"No rola: tentar só essa passagem, mesmo que falhe","alvo":0},
      {"texto":"Chegar em 100kg e segurar 10 segundos antes de seguir","alvo":2},
      {"texto":"Estudar essa passagem em vídeo","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: quantas vezes você passa em 5 min","alvo":2},
      {"texto":"Repetir os drills das semanas 1 a 3","alvo":2},
      {"texto":"Reavaliar sua nota de passagem de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

select public.por_plano('passagem', 'branca_avancada', '',
  'Passar com pressão e por fora',
  'Duas rotas que se completam: pressão pelo meio quando ele trava, toureio quando ele abre espaço.',
  $j$[
    {"semana":1,"foco":"Tirar as pernas da frente","itens":[
      {"texto":"Drill de controle de tornozelos e joelhos — 10x cada lado","alvo":3},
      {"texto":"No rola: primeiro neutralizar as pernas, depois pensar em passar","alvo":0},
      {"texto":"3 rolas começando dentro da guarda aberta dele","alvo":3},
      {"texto":"Estudar um vídeo de leg drag ou toureio","alvo":0}]},
    {"semana":2,"foco":"Passagem por fora (toureando)","itens":[
      {"texto":"Drill de toureio — 20x por lado","alvo":3},
      {"texto":"Passar a linha do quadril antes de soltar a perna dele","alvo":0},
      {"texto":"3 rolas tentando só toureio","alvo":3},
      {"texto":"Anotar em que momento ele te alcança de volta","alvo":0}]},
    {"semana":3,"foco":"Passagem por dentro (pressão)","itens":[
      {"texto":"Drill de cabeça-quadril na meia-guarda — 10x cada lado","alvo":3},
      {"texto":"Peito no peito antes de tirar a perna","alvo":0},
      {"texto":"3 rolas passando só por pressão","alvo":3},
      {"texto":"Estudar over-under ou cabeça-quadril em vídeo","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: alternar toureio e pressão conforme a reação dele","alvo":2},
      {"texto":"Consolidar 10 segundos em cada passagem antes de seguir","alvo":2},
      {"texto":"Reavaliar sua nota de passagem de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- ESCAPES E DEFESA
-- ===========================================================================
select public.por_plano('escapes', 'branca_inicio', '',
  'Sair de baixo',
  'A habilidade que mais rende na faixa branca: sobreviver e sair das piores posições.',
  $j$[
    {"semana":1,"foco":"Enquadramento","itens":[
      {"texto":"Drill de frames contra o cem quilos — 10x cada lado","alvo":3},
      {"texto":"No rola: nunca deixar o braço passar por cima do seu peito","alvo":0},
      {"texto":"3 rolas começando embaixo do cem quilos","alvo":3},
      {"texto":"Estudar um vídeo de fuga do cem quilos","alvo":0}]},
    {"semana":2,"foco":"Sair da montada","itens":[
      {"texto":"Drill de ponte e rolamento — 10x cada lado","alvo":3},
      {"texto":"Prender o braço e o pé do mesmo lado antes de pontear","alvo":0},
      {"texto":"3 rolas começando montado","alvo":3},
      {"texto":"Anotar se ele te pega no armlock quando você empurra","alvo":0}]},
    {"semana":3,"foco":"Defender as costas","itens":[
      {"texto":"Drill de defesa de gola — mão no queixo, 10x","alvo":3},
      {"texto":"Cair sempre para o lado do braço dele que está por baixo","alvo":0},
      {"texto":"3 rolas começando com ele nas suas costas","alvo":3},
      {"texto":"Estudar a defesa de mata-leão","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de 5 min começando sempre em posição ruim","alvo":2},
      {"texto":"Repetir os drills das semanas 1 a 3","alvo":2},
      {"texto":"Reavaliar sua nota de escapes de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

select public.por_plano('escapes', 'branca_avancada', '',
  'Escapar antes de estar preso',
  'Deixar de escapar no último segundo: reconhecer a posição uma etapa antes e sair cedo.',
  $j$[
    {"semana":1,"foco":"Sair na transição","itens":[
      {"texto":"Drill: recompor guarda enquanto ele ainda está passando — 10x","alvo":3},
      {"texto":"No rola: reagir quando ele começa a passar, não quando já passou","alvo":0},
      {"texto":"3 rolas em que você só escapa, sem atacar","alvo":3},
      {"texto":"Estudar a fuga do cem quilos pelo joelho","alvo":0}]},
    {"semana":2,"foco":"Montada e cem quilos","itens":[
      {"texto":"Drill de ponte e cotovelo-joelho — 10x cada lado","alvo":3},
      {"texto":"Nunca empurrar com os dois braços estendidos","alvo":0},
      {"texto":"3 rolas começando montado ou embaixo do cem quilos","alvo":3},
      {"texto":"Anotar qual das duas posições é a pior pra você","alvo":0}]},
    {"semana":3,"foco":"Costas — o ponto crítico","itens":[
      {"texto":"Drill de defesa de gola e retirada do gancho — 10x cada lado","alvo":3},
      {"texto":"No rola: tirar um gancho antes de tentar virar","alvo":0},
      {"texto":"3 rolas começando com ele nas suas costas","alvo":3},
      {"texto":"Estudar uma saída de costas específica","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de 5 min começando sempre em posição ruim","alvo":2},
      {"texto":"Contar quantas vezes escapou antes de estar totalmente preso","alvo":0},
      {"texto":"Reavaliar sua nota de escapes de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- QUEDAS E JOGO EM PÉ
-- ===========================================================================
select public.por_plano('quedas', 'branca_inicio', '',
  'Não ficar perdido de pé',
  'Postura, pegada e uma decisão só: puxar para a guarda com critério ou tentar uma queda.',
  $j$[
    {"semana":1,"foco":"Postura e distância","itens":[
      {"texto":"Drill de deslocamento em pé — 3 min por treino","alvo":3},
      {"texto":"No rola em pé: manter a postura e não cruzar os pés","alvo":0},
      {"texto":"Começar 3 rolas de pé","alvo":3},
      {"texto":"Estudar um vídeo de postura e pegada em pé","alvo":0}]},
    {"semana":2,"foco":"Puxar para a guarda direito","itens":[
      {"texto":"Drill de puxada para guarda com pegada — 10x","alvo":3},
      {"texto":"Nunca sentar sem pegada — anotar se aconteceu","alvo":0},
      {"texto":"3 rolas puxando com pegada de manga e gola","alvo":3},
      {"texto":"Perguntar ao professor a puxada mais segura","alvo":0}]},
    {"semana":3,"foco":"Uma queda só","itens":[
      {"texto":"Escolher uma queda e treinar 20x por lado","alvo":3},
      {"texto":"Treinar a queda de segurança (ukemi) antes","alvo":2},
      {"texto":"Tentar essa queda no rola, mesmo falhando","alvo":3},
      {"texto":"Estudar essa queda em vídeo","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste começando de pé, 5 min","alvo":2},
      {"texto":"Decidir em 10 segundos: puxa ou derruba","alvo":0},
      {"texto":"Reavaliar sua nota de jogo em pé de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

select public.por_plano('quedas', 'branca_avancada', '',
  'Ganhar a pegada e derrubar',
  'Sair do puxa-para-a-guarda automático: vencer a briga de pegadas em pé e ter duas quedas de verdade.',
  $j$[
    {"semana":1,"foco":"Pegar primeiro","itens":[
      {"texto":"Drill de briga de pegadas em pé — 2 min por rodada","alvo":3},
      {"texto":"No rola: nunca deixar ele pegar a gola primeiro","alvo":0},
      {"texto":"3 rolas começando de pé","alvo":3},
      {"texto":"Estudar um vídeo de grip fighting em pé","alvo":0}]},
    {"semana":2,"foco":"Queda de kimono","itens":[
      {"texto":"Uma queda de judô, 20x por lado","alvo":3},
      {"texto":"Entrar na queda logo depois de quebrar a pegada dele","alvo":0},
      {"texto":"3 rolas tentando derrubar antes de puxar","alvo":3},
      {"texto":"Anotar em que momento ele te bloqueia","alvo":0}]},
    {"semana":3,"foco":"Queda de luta olímpica","itens":[
      {"texto":"Entrada de double leg ou single leg — 20x por lado","alvo":3},
      {"texto":"Usar sua base de boxe: mudar de nível antes de entrar","alvo":0},
      {"texto":"3 rolas usando essa entrada","alvo":3},
      {"texto":"Treinar a defesa de guilhotina que vem junto","alvo":2}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de pé: contar quedas a favor e contra","alvo":2},
      {"texto":"Alternar as duas quedas conforme a pegada que ganhar","alvo":0},
      {"texto":"Reavaliar sua nota de jogo em pé de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- PEGAR AS COSTAS
-- ===========================================================================
select public.por_plano('costas', 'branca_avancada', '',
  'Chegar nas costas e ficar lá',
  'Duas rotas de entrada e, principalmente, o controle depois — costas que escapa não vale ponto nem finalização.',
  $j$[
    {"semana":1,"foco":"O controle antes da entrada","itens":[
      {"texto":"Drill de encaixe dos dois ganchos + cinturão — 10x cada lado","alvo":3},
      {"texto":"No rola: ao pegar as costas, segurar 30s antes de atacar","alvo":0},
      {"texto":"3 rolas começando já nas costas dele","alvo":3},
      {"texto":"Estudar o controle de gola e o cinturão","alvo":0}]},
    {"semana":2,"foco":"Entrada pela guarda","itens":[
      {"texto":"Drill DLR para as costas — 20x por lado","alvo":3},
      {"texto":"No rola: buscar a rotação quando ele levanta o joelho","alvo":0},
      {"texto":"3 rolas abrindo pela DLR com intenção de costas","alvo":3},
      {"texto":"Estudar a transição DLR para single-leg X","alvo":0}]},
    {"semana":3,"foco":"Entrada por cima","itens":[
      {"texto":"Drill: ele vira de bruços, você encaixa os ganchos — 10x","alvo":3},
      {"texto":"Nunca soltar o controle do braço na transição","alvo":0},
      {"texto":"3 rolas buscando as costas a partir do cem quilos","alvo":3},
      {"texto":"Anotar quantas vezes ele escapou e por onde","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: pegar as costas e segurar 1 min sem finalizar","alvo":2},
      {"texto":"Encadear costas com mata-leão quando o controle estiver firme","alvo":2},
      {"texto":"Reavaliar sua nota de pegar as costas de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- FINALIZAÇÕES
-- ===========================================================================
select public.por_plano('finalizacao', 'branca_inicio', '',
  'Suas primeiras finalizações',
  'Três finalizações que funcionam desde o primeiro dia, e o controle que vem antes de cada uma.',
  $j$[
    {"semana":1,"foco":"Controle antes do ataque","itens":[
      {"texto":"Segurar cem quilos por 20 segundos antes de atacar","alvo":3},
      {"texto":"No rola: não atacar de posição instável","alvo":0},
      {"texto":"3 rolas só controlando, sem tentar finalizar","alvo":3},
      {"texto":"Estudar por que finalização de posição ruim falha","alvo":0}]},
    {"semana":2,"foco":"Armlock da montada","itens":[
      {"texto":"Drill de armlock da montada — 20x por lado","alvo":3},
      {"texto":"Polegar dele para cima antes de estender","alvo":0},
      {"texto":"Tentar armlock no rola, mesmo perdendo a posição","alvo":3},
      {"texto":"Estudar o armlock em vídeo","alvo":0}]},
    {"semana":3,"foco":"Mata-leão","itens":[
      {"texto":"Drill de encaixe do mata-leão — 20x por lado","alvo":3},
      {"texto":"Encaixar o braço embaixo do queixo, não na frente","alvo":0},
      {"texto":"3 rolas buscando as costas e o mata-leão","alvo":3},
      {"texto":"Anotar quando ele defende com a mão","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: controlar antes, atacar depois","alvo":2},
      {"texto":"Repetir os drills das semanas 2 e 3","alvo":2},
      {"texto":"Reavaliar sua nota de finalização de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

select public.por_plano('finalizacao', 'branca_avancada', '',
  'Encadear em vez de forçar',
  'Parar de insistir numa finalização só: montar cadeias em que a defesa dele abre o próximo ataque.',
  $j$[
    {"semana":1,"foco":"A cadeia do triângulo","itens":[
      {"texto":"Drill triângulo, armbar e omoplata em sequência — 10x","alvo":3},
      {"texto":"No rola: quando ele defender o triângulo, ir para o armbar","alvo":0},
      {"texto":"3 rolas atacando só por essa cadeia","alvo":3},
      {"texto":"Estudar a cadeia em vídeo","alvo":0}]},
    {"semana":2,"foco":"A cadeia do braço","itens":[
      {"texto":"Drill kimura para americana e para as costas — 10x","alvo":3},
      {"texto":"Nunca soltar o punho dele durante a troca","alvo":0},
      {"texto":"3 rolas atacando por kimura","alvo":3},
      {"texto":"Anotar como ele costuma defender","alvo":0}]},
    {"semana":3,"foco":"Finalizar quem defende bem","itens":[
      {"texto":"Rolar com alguém mais graduado buscando só finalizar","alvo":2},
      {"texto":"Ameaçar duas vezes antes de atacar de verdade","alvo":0},
      {"texto":"3 rolas usando a defesa dele como entrada","alvo":3},
      {"texto":"Estudar como criar a reação antes do ataque","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: contar tentativas encadeadas, não finalizações","alvo":2},
      {"texto":"Repetir as duas cadeias, 10x cada","alvo":2},
      {"texto":"Reavaliar sua nota de finalização de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- PEGADAS
-- ===========================================================================
select public.por_plano('pegadas', 'branca_avancada', '',
  'Pegar primeiro, quebrar antes',
  'A briga que decide o rola antes do rola começar. Quem pega primeiro escolhe o jogo.',
  $j$[
    {"semana":1,"foco":"Pegar primeiro","itens":[
      {"texto":"Drill de disputa de pegada — 2 min por rodada","alvo":3},
      {"texto":"No rola: sua mão encosta antes da dele, sempre","alvo":0},
      {"texto":"3 rolas em que o objetivo é só pegar primeiro","alvo":3},
      {"texto":"Estudar as pegadas básicas de manga e gola","alvo":0}]},
    {"semana":2,"foco":"Quebrar a pegada dele","itens":[
      {"texto":"Duas quebras de pegada, 20x cada","alvo":3},
      {"texto":"Quebrar antes de tentar qualquer posição","alvo":0},
      {"texto":"3 rolas quebrando toda pegada que ele conseguir","alvo":3},
      {"texto":"Anotar qual pegada dele mais te atrapalha","alvo":0}]},
    {"semana":3,"foco":"Pegada que sustenta o seu jogo","itens":[
      {"texto":"Definir as duas pegadas que abrem seu jogo preferido","alvo":0},
      {"texto":"Drill de entrada nessas duas — 20x","alvo":3},
      {"texto":"3 rolas buscando só essas pegadas","alvo":3},
      {"texto":"Estudar o 2-on-1 na manga","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: contar quantas vezes pegou primeiro","alvo":2},
      {"texto":"Repetir as quebras da semana 2","alvo":2},
      {"texto":"Reavaliar sua nota de pegadas de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- CABEÇA E TRAVAMENTO
-- ===========================================================================
select public.por_plano('cabeca', 'branca_inicio', '',
  'Parar de travar no rola',
  'Respirar, aceitar a posição ruim e voltar a jogar. Menos técnica, mais cabeça.',
  $j$[
    {"semana":1,"foco":"Respirar","itens":[
      {"texto":"Respirar pelo nariz durante todo o rola","alvo":3},
      {"texto":"Quando prender a respiração, soltar o ar e continuar","alvo":0},
      {"texto":"3 rolas leves, com foco só em não apressar","alvo":3},
      {"texto":"Anotar em que posição você trava mais","alvo":0}]},
    {"semana":2,"foco":"Aceitar a posição ruim","itens":[
      {"texto":"Começar 3 rolas embaixo, de propósito","alvo":3},
      {"texto":"Ficar 30 segundos numa posição ruim sem entrar em pânico","alvo":2},
      {"texto":"Nunca usar força explosiva para sair — sair por técnica","alvo":0},
      {"texto":"Conversar com o professor sobre o que te trava","alvo":0}]},
    {"semana":3,"foco":"Jogar, não sobreviver","itens":[
      {"texto":"Escolher uma posição e tentar chegar nela todo rola","alvo":3},
      {"texto":"Aceitar perder para tentar o que você estudou","alvo":0},
      {"texto":"3 rolas com alguém mais graduado, sem medo de perder","alvo":3},
      {"texto":"Anotar uma coisa que deu certo em cada rola","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste de 5 min mantendo a respiração controlada","alvo":2},
      {"texto":"Comparar como você se sentiu no começo e no fim do mês","alvo":0},
      {"texto":"Reavaliar sua nota de cabeça de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);

-- ===========================================================================
-- CARDIO
-- ===========================================================================
select public.por_plano('cardio', 'branca_avancada', '',
  'Aguentar o rola inteiro',
  'Cardio específico de jiu-jitsu: economia de movimento primeiro, condicionamento depois.',
  $j$[
    {"semana":1,"foco":"Economia antes de fôlego","itens":[
      {"texto":"Rolar 5 min tentando gastar o mínimo de força","alvo":3},
      {"texto":"Nunca usar força quando a alavanca resolve","alvo":0},
      {"texto":"Respirar pelo nariz o rola inteiro","alvo":3},
      {"texto":"Anotar em que minuto você começa a cansar","alvo":0}]},
    {"semana":2,"foco":"Volume","itens":[
      {"texto":"Fazer um rola a mais do que o normal em cada treino","alvo":3},
      {"texto":"Não sentar entre os rolas","alvo":0},
      {"texto":"20 min de corrida ou bicicleta fora do tatame","alvo":2},
      {"texto":"Dormir 7h nas noites de treino","alvo":3}]},
    {"semana":3,"foco":"Intensidade","itens":[
      {"texto":"Dois rolas em ritmo forte, com 1 min de descanso","alvo":3},
      {"texto":"Drill contínuo de 3 min sem parar","alvo":2},
      {"texto":"Terminar o treino sem pular o último rola","alvo":3},
      {"texto":"Anotar se a economia da semana 1 ajudou","alvo":0}]},
    {"semana":4,"foco":"Integração e teste","itens":[
      {"texto":"Rola-teste: 3 rolas seguidos de 5 min","alvo":2},
      {"texto":"Comparar com o minuto anotado na semana 1","alvo":0},
      {"texto":"Reavaliar sua nota de cardio de 0 a 5","alvo":0},
      {"texto":"Escolher o objetivo do mês que vem","alvo":0}]}
  ]$j$::jsonb);
