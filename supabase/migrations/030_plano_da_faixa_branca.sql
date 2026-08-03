-- ============================================================================
-- 030 — O plano da faixa branca, nos sete temas que não tinham nada
-- ============================================================================
-- A auditoria disse que "azul, marrom e preta abrem o Plano do Mês e não
-- recebem nada". Estava errado, e a função que prova isso é
-- `niveis_de_fallback`: marrom cai em roxa, preta cai em marrom e depois roxa,
-- azul cai em branca_avancada. Ninguém fica com a tela vazia — no máximo
-- recebe conteúdo escrito para outra faixa.
--
-- O buraco de verdade estava no outro extremo, e ninguém tinha olhado:
--
--   branca_inicio É A RAIZ DO FALLBACK. Não herda de ninguém.
--
-- Dos 14 objetivos, `branca_inicio` tinha conteúdo em 6. Nos outros 8 a busca
-- percorria o array inteiro e voltava de mãos vazias. Um deles (`pernas`) exige
-- faixa azul e nem aparece para branca; sobram SETE temas em que um
-- faixa-branca escolhia o objetivo e não recebia plano nenhum:
--
--   raspagem · costas · controle · pegadas · cardio · nogi · competicao
--
-- É a pior versão do problema, na faixa com mais gente e menos repertório para
-- improvisar sozinha.
--
-- Sobre o conteúdo: é escrito para quem tem de zero a um grau, o que muda tudo.
-- Não há "berimbolo" nem "leg drag" aqui. Nesta faixa o ganho está em fugir do
-- que dói, segurar o que já pegou e não gastar todo o gás no primeiro rola —
-- e em ter permissão explícita para ser passado enquanto tenta.
--
-- Os alvos numéricos são baixos de propósito. Um plano de 6 rolas por semana
-- para quem treina duas vezes é um plano que já nasce fracassado, e a pessoa
-- desiste do plano antes de desistir da posição.
-- ============================================================================

insert into public.plan_templates (objective_slug, nivel, variante, titulo, resumo, semanas) values

-- ---------------------------------------------------------------- raspagem --
('raspagem', 'branca_inicio', '', 'Sair de baixo sem força',
 'Na branca a raspagem falha por um motivo só: tentar levantar o outro com o braço. O mês é sobre descobrir que quem raspa é o quadril e a perna.',
 '[
   {"semana":1,"foco":"Parar de ser esmagado","itens":[
     {"texto":"5 rolas começando de guarda fechada, sem abrir","alvo":5},
     {"texto":"Aprender a fuga de quadril e repetir 20 vezes por treino","alvo":0},
     {"texto":"Anotar em que momento a sua guarda abre sozinha","alvo":0},
     {"texto":"Pedir ao professor para ver a sua guarda fechada","alvo":0}]},
   {"semana":2,"foco":"Uma raspagem só","itens":[
     {"texto":"Escolher UMA raspagem da guarda fechada e ficar nela o mês","alvo":0},
     {"texto":"30 repetições dela sem parceiro resistindo","alvo":30},
     {"texto":"4 rolas tentando só essa raspagem","alvo":4},
     {"texto":"Anotar quantas vezes tentou e quantas saiu","alvo":0}]},
   {"semana":3,"foco":"O quadril, não o braço","itens":[
     {"texto":"Refazer a mesma raspagem prestando atenção só no quadril","alvo":0},
     {"texto":"4 rolas sem usar força de braço para virar ninguém","alvo":4},
     {"texto":"Perguntar a um faixa-azul o que ele sente quando você tenta","alvo":0},
     {"texto":"Anotar a diferença entre empurrar e desequilibrar","alvo":0}]},
   {"semana":4,"foco":"Contra quem resiste","itens":[
     {"texto":"4 rolas tentando a raspagem contra quem já sabe que vem","alvo":4},
     {"texto":"Aceitar ser passado enquanto tenta — é o preço do mês","alvo":0},
     {"texto":"Contar quantas saíram, comparado com a semana 2","alvo":0},
     {"texto":"Reavaliar sua nota de raspagem de 0 a 5","alvo":0}]}
 ]'::jsonb),

-- ------------------------------------------------------------------ costas --
('costas', 'branca_inicio', '', 'Chegar às costas e ficar lá',
 'Todo faixa-branca chega às costas alguma vez. Quase nenhum fica. O mês é sobre os ganchos e o cinturão, não sobre o estrangulamento.',
 '[
   {"semana":1,"foco":"Entender a posição","itens":[
     {"texto":"Aprender onde ficam os dois ganchos e por quê","alvo":0},
     {"texto":"Ficar 2 minutos nas costas de alguém que só se defende","alvo":2},
     {"texto":"Anotar o que faz você cair de lá","alvo":0},
     {"texto":"Ver um faixa-preta segurar as costas num treino","alvo":0}]},
   {"semana":2,"foco":"O cinturão antes do gancho","itens":[
     {"texto":"Treinar a pegada de cinturão 20 vezes","alvo":20},
     {"texto":"4 rolas em que você só tenta segurar, sem finalizar","alvo":4},
     {"texto":"Contar quantos segundos aguenta antes de perder","alvo":0},
     {"texto":"Anotar se perdeu por gancho ou por pegada","alvo":0}]},
   {"semana":3,"foco":"Chegar lá","itens":[
     {"texto":"Aprender UMA entrada nas costas, a mais simples da sua aula","alvo":0},
     {"texto":"20 repetições dessa entrada sem resistência","alvo":20},
     {"texto":"4 rolas tentando só essa entrada","alvo":4},
     {"texto":"Anotar de que posição ela apareceu","alvo":0}]},
   {"semana":4,"foco":"Segurar de verdade","itens":[
     {"texto":"4 rolas em que chegar nas costas conta como vitória","alvo":4},
     {"texto":"Aguentar 1 minuto lá contra alguém do seu tamanho","alvo":1},
     {"texto":"Só então tentar o estrangulamento","alvo":0},
     {"texto":"Reavaliar sua nota de costas de 0 a 5","alvo":0}]}
 ]'::jsonb),

-- ---------------------------------------------------------------- controle --
('controle', 'branca_inicio', '', 'Ficar por cima sem gastar tudo',
 'Passar já é difícil; chegar por cima e ser recuperado dois segundos depois é pior. O mês é sobre peso e paciência, não sobre pressa.',
 '[
   {"semana":1,"foco":"O peso, não os braços","itens":[
     {"texto":"Aprender os 100 quilos e onde apoiar o peito","alvo":0},
     {"texto":"Ficar 2 minutos nos 100 quilos sem tentar nada","alvo":2},
     {"texto":"Anotar onde suas mãos vão parar quando você cansa","alvo":0},
     {"texto":"Perguntar ao professor se seu quadril está no chão","alvo":0}]},
   {"semana":2,"foco":"A montada que não cai","itens":[
     {"texto":"Aprender a base da montada e por que os pés importam","alvo":0},
     {"texto":"4 rolas em que montar já é o objetivo do rola","alvo":4},
     {"texto":"Contar quantas vezes foi recuperado e como","alvo":0},
     {"texto":"Anotar se caiu para o lado ou por ponte","alvo":0}]},
   {"semana":3,"foco":"Trocar sem perder","itens":[
     {"texto":"Treinar a passagem de 100 quilos para montada, 20 vezes","alvo":20},
     {"texto":"4 rolas trocando de posição sem soltar a pressão","alvo":4},
     {"texto":"Anotar em qual troca você perde o controle","alvo":0},
     {"texto":"Repetir só essa troca no fim do treino","alvo":0}]},
   {"semana":4,"foco":"Contra quem explode","itens":[
     {"texto":"4 rolas por cima contra alguém mais forte que você","alvo":4},
     {"texto":"Manter a posição 1 minuto sem tentar finalizar","alvo":1},
     {"texto":"Anotar quanto gás isso custou, de 0 a 10","alvo":0},
     {"texto":"Reavaliar sua nota de controle de 0 a 5","alvo":0}]}
 ]'::jsonb),

-- ---------------------------------------------------------------- pegadas --
('pegadas', 'branca_inicio', '', 'Quem pega primeiro decide',
 'Faixa-branca sai pegando qualquer coisa e é pego em tudo. O mês é sobre olhar para as mãos — as suas e as dele — antes de olhar para a posição.',
 '[
   {"semana":1,"foco":"Ver as mãos","itens":[
     {"texto":"5 rolas prestando atenção em quem pegou primeiro","alvo":5},
     {"texto":"Anotar em que pegada você é dominado sempre","alvo":0},
     {"texto":"Aprender a soltar a pegada da sua gola","alvo":0},
     {"texto":"Repetir essa soltura 20 vezes","alvo":20}]},
   {"semana":2,"foco":"Duas pegadas suas","itens":[
     {"texto":"Escolher duas pegadas para usar o mês inteiro","alvo":0},
     {"texto":"4 rolas começando sempre por elas","alvo":4},
     {"texto":"Anotar se elas sobrevivem aos primeiros 10 segundos","alvo":0},
     {"texto":"Perguntar a um faixa-roxa se a sua pegada é forte","alvo":0}]},
   {"semana":3,"foco":"Não deixar pegar","itens":[
     {"texto":"4 rolas em que você não deixa pegar a sua manga","alvo":4},
     {"texto":"Treinar a mão pesada e a mão que não fica parada","alvo":0},
     {"texto":"Anotar quantas vezes soltou antes de ser puxado","alvo":0},
     {"texto":"Reparar em quanto braço isso economizou","alvo":0}]},
   {"semana":4,"foco":"Em pé e no chão","itens":[
     {"texto":"4 rolas começando em pé, disputando pegada de verdade","alvo":4},
     {"texto":"Usar as mesmas duas pegadas no chão","alvo":0},
     {"texto":"Anotar se a briga de pegada mudou o resultado do rola","alvo":0},
     {"texto":"Reavaliar sua nota de pegadas de 0 a 5","alvo":0}]}
 ]'::jsonb),

-- ------------------------------------------------------------------ cardio --
('cardio', 'branca_inicio', '', 'Chegar inteiro ao fim do treino',
 'O cansaço da faixa branca quase nunca é pulmão: é força usada onde não precisa e ar preso na hora errada. O mês trata disso antes de tratar de condicionamento.',
 '[
   {"semana":1,"foco":"Descobrir onde o gás vai","itens":[
     {"texto":"5 rolas anotando em que posição você mais cansa","alvo":5},
     {"texto":"Reparar se você prende a respiração quando aperta","alvo":0},
     {"texto":"Anotar quantos rolas aguenta antes de querer parar","alvo":0},
     {"texto":"Medir seu tempo total de treino na semana","alvo":0}]},
   {"semana":2,"foco":"Respirar embaixo","itens":[
     {"texto":"4 rolas respirando pelo nariz, sem prender","alvo":4},
     {"texto":"Ficar 2 minutos embaixo de alguém sem entrar em pânico","alvo":2},
     {"texto":"Anotar se conseguiu falar no fim do rola","alvo":0},
     {"texto":"Dormir 7h nas noites antes do treino","alvo":0}]},
   {"semana":3,"foco":"Parar de agarrar","itens":[
     {"texto":"4 rolas sem apertar nenhuma pegada com toda a força","alvo":4},
     {"texto":"Contar quantas vezes você segurou por medo, não por plano","alvo":0},
     {"texto":"Rolar um rola inteiro em ritmo 70%","alvo":1},
     {"texto":"Comparar o cansaço com a semana 1","alvo":0}]},
   {"semana":4,"foco":"Aguentar o treino inteiro","itens":[
     {"texto":"Ficar até o último rola de todos os treinos da semana","alvo":0},
     {"texto":"5 rolas seguidos num mesmo treino","alvo":5},
     {"texto":"Comparar o primeiro rola com o último","alvo":0},
     {"texto":"Reavaliar sua nota de cardio de 0 a 5","alvo":0}]}
 ]'::jsonb),

-- -------------------------------------------------------------------- nogi --
('nogi', 'branca_inicio', '', 'Sem kimono, sem pânico',
 'Tirar o kimono tira as suas pegadas e a sua defesa junto. O mês é sobre descobrir que sem pano se segura com ângulo e com cabeça, não com dedo.',
 '[
   {"semana":1,"foco":"O que some sem o pano","itens":[
     {"texto":"3 rolas sem kimono, sem cobrar nada de si","alvo":3},
     {"texto":"Anotar quais pegadas suas deixaram de existir","alvo":0},
     {"texto":"Reparar em quanto você escorrega e por quê","alvo":0},
     {"texto":"Perguntar a alguém de no-gi por onde começar","alvo":0}]},
   {"semana":2,"foco":"Segurar sem tecido","itens":[
     {"texto":"Aprender a pegada de pescoço e cotovelo","alvo":0},
     {"texto":"Treinar underhook 20 vezes","alvo":20},
     {"texto":"3 rolas usando só essas duas","alvo":3},
     {"texto":"Anotar se a posição durou mais que antes","alvo":0}]},
   {"semana":3,"foco":"A guarda que funciona sem gola","itens":[
     {"texto":"Escolher uma guarda que não dependa de pano","alvo":0},
     {"texto":"20 repetições da entrada dela","alvo":20},
     {"texto":"3 rolas jogando só essa guarda","alvo":3},
     {"texto":"Anotar quanto tempo conseguiu segurar","alvo":0}]},
   {"semana":4,"foco":"Juntar com o de kimono","itens":[
     {"texto":"3 rolas sem kimono e 3 com, no mesmo dia se der","alvo":3},
     {"texto":"Anotar o que funcionou nos dois","alvo":0},
     {"texto":"Perceber que o jogo é o mesmo, a pegada é que muda","alvo":0},
     {"texto":"Reavaliar sua nota de no-gi de 0 a 5","alvo":0}]}
 ]'::jsonb),

-- -------------------------------------------------------------- competicao --
('competicao', 'branca_inicio', '', 'A sua primeira competição',
 'Competir de faixa branca não é sobre ganhar: é sobre passar pela experiência inteira uma vez, para a segunda não ser mais um evento. O mês prepara o corpo e, principalmente, o susto.',
 '[
   {"semana":1,"foco":"Decidir e inscrever","itens":[
     {"texto":"Escolher UMA competição com data marcada","alvo":0},
     {"texto":"Conferir a categoria de peso e a faixa etária","alvo":0},
     {"texto":"Avisar o professor que você vai competir","alvo":0},
     {"texto":"Anotar quanto falta em dias","alvo":0}]},
   {"semana":2,"foco":"O jogo que você vai jogar","itens":[
     {"texto":"Escolher UMA raspagem e UMA passagem para o dia","alvo":0},
     {"texto":"30 repetições de cada, sem resistência","alvo":30},
     {"texto":"4 rolas usando só essas duas","alvo":4},
     {"texto":"Aprender a pontuação: vantagem, 2, 3 e 4","alvo":0}]},
   {"semana":3,"foco":"Simular o dia","itens":[
     {"texto":"3 rolas de 5 minutos com alguém que não te conhece","alvo":3},
     {"texto":"Treinar começar em pé, que é como a luta começa","alvo":0},
     {"texto":"Pesar-se de manhã, com kimono, uma vez","alvo":0},
     {"texto":"Anotar como o corpo reagiu ao nervoso","alvo":0}]},
   {"semana":4,"foco":"Chegar leve","itens":[
     {"texto":"Reduzir o volume de treino nos 3 dias antes","alvo":0},
     {"texto":"Separar kimono, documento e comprovante na véspera","alvo":0},
     {"texto":"Combinar com quem vai te acompanhar","alvo":0},
     {"texto":"Depois: anotar o que aprendeu, tendo ganhado ou não","alvo":0}]}
 ]'::jsonb)

on conflict (objective_slug, nivel, variante) do update set
  titulo = excluded.titulo,
  resumo = excluded.resumo,
  semanas = excluded.semanas,
  ativo = true,
  updated_at = now();
