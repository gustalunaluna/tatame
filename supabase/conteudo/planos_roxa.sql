-- Planos mensais — faixa ROXA (todos os 14 objetivos).
--
-- O que muda de azul para roxa: a pessoa já sabe fazer as coisas. O problema
-- deixa de ser "aprender o movimento" e passa a ser "ter um sistema": entrar
-- sempre pelo mesmo lugar, ter a segunda opção pronta quando a primeira falha,
-- e conseguir impor o jogo em quem também sabe. Por isso os itens aqui falam
-- muito de encadeamento, de escolher UMA coisa e afundar, e de testar contra
-- quem é melhor — e não de "aprender a raspagem X".
--
-- Idempotente: reaplicar atualiza o texto, não duplica.

insert into public.plan_templates (objective_slug, nivel, variante, titulo, resumo, semanas, ativo)
values

-- ---------------------------------------------------------------- retenção
('retencao', 'roxa', '', 'Guarda que não abre',
 'Parar de recompor no susto: escolher onde a briga acontece e fazer o passador jogar o SEU jogo.',
 $j$[
  {"semana":1,"foco":"Mapear quem te passa","itens":[
    {"alvo":0,"texto":"Listar as 3 passagens que mais funcionam em você"},
    {"alvo":5,"texto":"5 rolas anotando em que momento exato a guarda abriu"},
    {"alvo":0,"texto":"Escolher UMA dessas passagens para resolver este mês"},
    {"alvo":0,"texto":"Achar a versão da sua guarda que mata essa passagem"}]},
  {"semana":2,"foco":"A primeira barreira","itens":[
    {"alvo":3,"texto":"Drill posicional: ele começa já na sua perna de dentro"},
    {"alvo":0,"texto":"Definir a pegada que sustenta a barreira e nunca soltar"},
    {"alvo":4,"texto":"4 rolas começando na posição em que você costuma perder"},
    {"alvo":0,"texto":"Anotar quantas vezes segurou na primeira barreira"}]},
  {"semana":3,"foco":"A segunda camada","itens":[
    {"alvo":0,"texto":"Definir para onde você vai quando a primeira barreira cai"},
    {"alvo":3,"texto":"Drill: barreira cai, você já está na próxima guarda"},
    {"alvo":4,"texto":"4 rolas em que perder a primeira camada não é derrota"},
    {"alvo":0,"texto":"Gravar um rola e ver quantas camadas você tem de verdade"}]},
  {"semana":4,"foco":"Contra quem é melhor","itens":[
    {"alvo":3,"texto":"3 rolas de 6 min com marrom ou preta, só retendo"},
    {"alvo":0,"texto":"Perguntar a um deles o que ele vê de aberto no seu jogo"},
    {"alvo":2,"texto":"Repetir os drills das semanas 2 e 3"},
    {"alvo":0,"texto":"Reavaliar sua nota de retenção de 0 a 5"}]}]$j$::jsonb, true),

-- ---------------------------------------------------------------- passagem
('passagem', 'roxa', '', 'Sistema de passagem',
 'Trocar o repertório solto por um funil: toda guarda que ele monta desemboca em duas ou três passagens suas.',
 $j$[
  {"semana":1,"foco":"Escolher o funil","itens":[
    {"alvo":0,"texto":"Definir seu par: uma passagem de pressão e uma de velocidade"},
    {"alvo":0,"texto":"Mapear que guardas te travam hoje"},
    {"alvo":5,"texto":"5 rolas usando só as duas passagens escolhidas"},
    {"alvo":0,"texto":"Anotar em qual guarda o funil não funciona"}]},
  {"semana":2,"foco":"Matar a guarda antes de passar","itens":[
    {"alvo":0,"texto":"Trabalhar a briga de pegada que impede ele de montar a guarda"},
    {"alvo":3,"texto":"Drill: neutralizar a pegada dele em 5 segundos, 10x"},
    {"alvo":4,"texto":"4 rolas em que o objetivo é só não deixar a guarda existir"},
    {"alvo":0,"texto":"Estudar um vídeo de grip fight do passador"}]},
  {"semana":3,"foco":"A ponte entre as duas","itens":[
    {"alvo":0,"texto":"Definir o gatilho que troca da passagem A para a B"},
    {"alvo":3,"texto":"Drill de troca: ele defende a A, você entra na B"},
    {"alvo":4,"texto":"4 rolas obrigando a troca pelo menos 3 vezes"},
    {"alvo":0,"texto":"Anotar quantas passagens vieram da segunda opção"}]},
  {"semana":4,"foco":"Consolidar depois de passar","itens":[
    {"alvo":3,"texto":"Passar e segurar 20 segundos antes de avançar, 10x"},
    {"alvo":3,"texto":"3 rolas com marrom ou preta, só passagem"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Reavaliar sua nota de passagem de 0 a 5"}]}]$j$::jsonb, true),

-- ------------------------------------------------------------- finalização
('finalizacao', 'roxa', '', 'Finalizar quem sabe defender',
 'Na roxa ninguém entrega mais o braço. O mês é sobre encadear: a finalização vira consequência da defesa dele, não surpresa.',
 $j$[
  {"semana":1,"foco":"A sua principal","itens":[
    {"alvo":0,"texto":"Escolher a finalização que você mais pega e assumir ela"},
    {"alvo":0,"texto":"Listar as 3 defesas mais comuns contra ela"},
    {"alvo":5,"texto":"5 rolas tentando só ela, mesmo que todos saibam"},
    {"alvo":0,"texto":"Anotar em que defesa você trava"}]},
  {"semana":2,"foco":"A resposta para cada defesa","itens":[
    {"alvo":0,"texto":"Definir a saída para cada uma das 3 defesas"},
    {"alvo":3,"texto":"Drill: parceiro defende do jeito 1, você troca — 10x cada"},
    {"alvo":4,"texto":"4 rolas em que só vale finalizar pela segunda opção"},
    {"alvo":0,"texto":"Estudar um vídeo da cadeia completa"}]},
  {"semana":3,"foco":"Chegar já com a pegada","itens":[
    {"alvo":0,"texto":"Pegar o encaixe ANTES de anunciar a finalização"},
    {"alvo":3,"texto":"Drill de encaixe cego: sem ele saber qual vem"},
    {"alvo":4,"texto":"4 rolas em que a pegada vem 2 movimentos antes"},
    {"alvo":0,"texto":"Contar quantas finalizações vieram sem aviso"}]},
  {"semana":4,"foco":"Contra quem não entrega","itens":[
    {"alvo":3,"texto":"3 rolas com marrom ou preta buscando a cadeia inteira"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Anotar quantas finalizações no mês vieram da cadeia"},
    {"alvo":0,"texto":"Reavaliar sua nota de finalização de 0 a 5"}]}]$j$::jsonb, true),

-- --------------------------------------------------------------- raspagem
('raspagem', 'roxa', '', 'Raspar quem tem base',
 'Parar de depender de o outro errar. Quebrar a base de propósito, e ter a segunda raspagem já pronta na direção contrária.',
 $j$[
  {"semana":1,"foco":"Quebrar a base de propósito","itens":[
    {"alvo":0,"texto":"Escolher a guarda de onde seu jogo de raspagem sai"},
    {"alvo":0,"texto":"Identificar o que tira a base dele: pegada, ângulo ou peso"},
    {"alvo":5,"texto":"5 rolas em que você só raspa dessa guarda"},
    {"alvo":0,"texto":"Anotar quantas vezes a base não quebrou"}]},
  {"semana":2,"foco":"O par de raspagens opostas","itens":[
    {"alvo":0,"texto":"Definir a raspagem para cada lado que ele defende"},
    {"alvo":3,"texto":"Drill: ele resiste para um lado, você vai para o outro"},
    {"alvo":4,"texto":"4 rolas usando só o par"},
    {"alvo":0,"texto":"Estudar um vídeo do par que você escolheu"}]},
  {"semana":3,"foco":"Raspar e já estar por cima","itens":[
    {"alvo":3,"texto":"Drill: raspar e chegar direto em posição de controle, 10x"},
    {"alvo":0,"texto":"Nunca soltar a pegada no meio da raspagem"},
    {"alvo":4,"texto":"4 rolas em que raspar sem consolidar não conta"},
    {"alvo":0,"texto":"Anotar quantas raspagens viraram controle de verdade"}]},
  {"semana":4,"foco":"Contra base pesada","itens":[
    {"alvo":3,"texto":"3 rolas com alguém mais pesado ou mais graduado"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Rever se o par escolhido é mesmo o certo para o seu corpo"},
    {"alvo":0,"texto":"Reavaliar sua nota de raspagem de 0 a 5"}]}]$j$::jsonb, true),

-- ----------------------------------------------------------------- quedas
('quedas', 'roxa', '', 'Queda com plano',
 'Não é aprender queda nova: é ter uma entrada de verdade, uma reação para quando ele defende, e saber quando puxar sem perder nada.',
 $j$[
  {"semana":1,"foco":"A sua entrada","itens":[
    {"alvo":0,"texto":"Escolher UMA queda para ser sua pelo resto do ano"},
    {"alvo":4,"texto":"Entradas sem finalizar, 20x por treino"},
    {"alvo":4,"texto":"4 rolas começando sempre de pé"},
    {"alvo":0,"texto":"Anotar o que ele faz quando você entra"}]},
  {"semana":2,"foco":"A briga de pegada em pé","itens":[
    {"alvo":0,"texto":"Definir a pegada de que sua queda depende"},
    {"alvo":3,"texto":"Drill: só grip fight em pé, 3 min por rodada"},
    {"alvo":4,"texto":"4 rolas em que vencer a pegada já é vitória"},
    {"alvo":0,"texto":"Estudar um vídeo de grip fight de wrestling ou judô"}]},
  {"semana":3,"foco":"A segunda queda","itens":[
    {"alvo":0,"texto":"Escolher a queda que sai quando ele defende a primeira"},
    {"alvo":3,"texto":"Drill de encadeamento: ele defende a A, você entra na B"},
    {"alvo":4,"texto":"4 rolas usando o par"},
    {"alvo":0,"texto":"Contar quantas quedas vieram da segunda"}]},
  {"semana":4,"foco":"Puxar com critério","itens":[
    {"alvo":0,"texto":"Definir quando puxar é escolha e não desistência"},
    {"alvo":3,"texto":"3 rolas em que puxar só vale já com pegada dominante"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Reavaliar sua nota de jogo em pé de 0 a 5"}]}]$j$::jsonb, true),

-- ---------------------------------------------------------------- pegadas
('pegadas', 'roxa', '', 'Ganhar antes de começar',
 'A pegada decide o rola antes do primeiro movimento. O mês é sobre pegar primeiro, quebrar rápido e não dar a pegada que ele quer.',
 $j$[
  {"semana":1,"foco":"Que pegada sustenta o seu jogo","itens":[
    {"alvo":0,"texto":"Listar as pegadas sem as quais seu jogo não existe"},
    {"alvo":5,"texto":"5 rolas em que a primeira pegada tem que ser sua"},
    {"alvo":0,"texto":"Anotar quantas vezes ele pegou primeiro"},
    {"alvo":0,"texto":"Identificar a pegada dele que mais te atrapalha"}]},
  {"semana":2,"foco":"Quebrar rápido","itens":[
    {"alvo":4,"texto":"Drill de quebra: 20 repetições da mesma quebra"},
    {"alvo":0,"texto":"Quebrar antes de pensar no que fazer depois"},
    {"alvo":4,"texto":"4 rolas em que ele não pode manter pegada por 5 segundos"},
    {"alvo":0,"texto":"Estudar um vídeo de quebras de pegada"}]},
  {"semana":3,"foco":"Negar a pegada dele","itens":[
    {"alvo":0,"texto":"Trabalhar a postura que impede a pegada preferida dele"},
    {"alvo":3,"texto":"Drill: ele tenta pegar, você nega por 1 minuto"},
    {"alvo":4,"texto":"4 rolas focando em negar, não em pegar"},
    {"alvo":0,"texto":"Anotar se negar mudou o rola"}]},
  {"semana":4,"foco":"No-gi também","itens":[
    {"alvo":3,"texto":"3 rolas sem kimono aplicando a mesma lógica"},
    {"alvo":0,"texto":"Traduzir suas pegadas de gi para pegadas de no-gi"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Reavaliar sua nota de pegadas de 0 a 5"}]}]$j$::jsonb, true),

-- ----------------------------------------------------------------- costas
('costas', 'roxa', '', 'Costas que não escapam',
 'Chegar nas costas já não é o problema. Manter contra quem sabe escapar, e finalizar de lá, é.',
 $j$[
  {"semana":1,"foco":"O controle antes do estrangulamento","itens":[
    {"alvo":0,"texto":"Fixar o gancho e o cinto antes de pensar em finalizar"},
    {"alvo":4,"texto":"Drill: segurar as costas 2 min sem tentar finalizar"},
    {"alvo":4,"texto":"4 rolas em que só vale segurar, não finalizar"},
    {"alvo":0,"texto":"Anotar por onde ele escapa"}]},
  {"semana":2,"foco":"Seguir a fuga","itens":[
    {"alvo":0,"texto":"Definir o que fazer quando ele joga o peso para um lado"},
    {"alvo":3,"texto":"Drill: ele foge para um lado, você acompanha e refixa"},
    {"alvo":4,"texto":"4 rolas em que perder as costas uma vez não encerra"},
    {"alvo":0,"texto":"Estudar um vídeo de retenção de costas"}]},
  {"semana":3,"foco":"Finalizar de lá","itens":[
    {"alvo":0,"texto":"Escolher a sua finalização das costas e a alternativa"},
    {"alvo":3,"texto":"Drill de encadeamento entre as duas"},
    {"alvo":4,"texto":"4 rolas buscando a cadeia inteira"},
    {"alvo":0,"texto":"Contar quantas saíram da alternativa"}]},
  {"semana":4,"foco":"Chegar lá de mais lugares","itens":[
    {"alvo":0,"texto":"Mapear as 3 posições de onde você chega nas costas"},
    {"alvo":3,"texto":"3 rolas com marrom ou preta buscando as costas"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Reavaliar sua nota de costas de 0 a 5"}]}]$j$::jsonb, true),

-- ---------------------------------------------------------------- controle
('controle', 'roxa', '', 'Peso que sufoca',
 'Controle não é força: é ângulo, conexão e paciência. O mês é sobre ficar em cima sem gastar, e avançar só quando ele já cedeu.',
 $j$[
  {"semana":1,"foco":"Peso, não força","itens":[
    {"alvo":0,"texto":"Trocar pegada de braço por peso de tronco em cada controle"},
    {"alvo":4,"texto":"Drill: 3 min por cima sem usar as mãos para segurar"},
    {"alvo":4,"texto":"4 rolas em que só vale manter, não avançar"},
    {"alvo":0,"texto":"Anotar quanto tempo você segurou de verdade"}]},
  {"semana":2,"foco":"A escada de posições","itens":[
    {"alvo":0,"texto":"Definir sua ordem: cem quilos, joelho, montada, costas"},
    {"alvo":3,"texto":"Drill de transição, 10 subidas completas"},
    {"alvo":4,"texto":"4 rolas subindo a escada inteira pelo menos 2 vezes"},
    {"alvo":0,"texto":"Anotar em que degrau você mais perde"}]},
  {"semana":3,"foco":"Matar a recomposição","itens":[
    {"alvo":0,"texto":"Bloquear o quadril dele antes que ele enquadre"},
    {"alvo":3,"texto":"Drill: ele tenta recompor, você mata o quadril"},
    {"alvo":4,"texto":"4 rolas em que ele não pode recompor nenhuma vez"},
    {"alvo":0,"texto":"Estudar um vídeo de pressão por cima"}]},
  {"semana":4,"foco":"Contra quem é grande","itens":[
    {"alvo":3,"texto":"3 rolas segurando alguém mais pesado"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Medir seu gasto: você acabou o rola com fôlego?"},
    {"alvo":0,"texto":"Reavaliar sua nota de controle de 0 a 5"}]}]$j$::jsonb, true),

-- ---------------------------------------------------------------- escapes
('escapes', 'roxa', '', 'Sair antes de estar preso',
 'Escapar na roxa é chegar antes: reconhecer a posição ruim dois movimentos antes dela fechar, e não aguentar até doer.',
 $j$[
  {"semana":1,"foco":"O momento antes","itens":[
    {"alvo":0,"texto":"Mapear o instante exato em que a posição ruim começa"},
    {"alvo":5,"texto":"5 rolas anotando quando dava para sair e você não saiu"},
    {"alvo":0,"texto":"Escolher a posição em que você mais fica preso"},
    {"alvo":0,"texto":"Estudar a defesa dessa posição, não o escape dela"}]},
  {"semana":2,"foco":"Enquadramento antes de força","itens":[
    {"alvo":4,"texto":"Drill: criar espaço só com antebraço e quadril, 10x"},
    {"alvo":0,"texto":"Nunca empurrar de peito aberto"},
    {"alvo":4,"texto":"4 rolas começando na posição pior possível"},
    {"alvo":0,"texto":"Anotar quantas vezes saiu sem explosão"}]},
  {"semana":3,"foco":"Escapar para algum lugar","itens":[
    {"alvo":0,"texto":"Definir onde você quer chegar depois de cada escape"},
    {"alvo":3,"texto":"Drill: escapar e já recompor guarda, 10x"},
    {"alvo":4,"texto":"4 rolas em que escapar e ser passado de novo não conta"},
    {"alvo":0,"texto":"Contar quantos escapes viraram guarda de verdade"}]},
  {"semana":4,"foco":"Sob pressão de verdade","itens":[
    {"alvo":3,"texto":"3 rolas começando montado embaixo de um marrom ou preta"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Anotar se a respiração te atrapalhou mais que a técnica"},
    {"alvo":0,"texto":"Reavaliar sua nota de escapes de 0 a 5"}]}]$j$::jsonb, true),

-- ----------------------------------------------------------------- pernas
('pernas', 'roxa', '', 'Jogo de perna com segurança',
 'Entrar, controlar e sair. E, tão importante quanto: defender bem, porque na roxa começam a aparecer os que chutam perna a sério.',
 $j$[
  {"semana":1,"foco":"A posição antes da chave","itens":[
    {"alvo":0,"texto":"Escolher seu ashi principal e fixar a posição sem finalizar"},
    {"alvo":4,"texto":"Drill de entrada, 15x cada lado, sem aplicar"},
    {"alvo":4,"texto":"4 rolas entrando na posição e soltando"},
    {"alvo":0,"texto":"Anotar de que guardas a entrada aparece"}]},
  {"semana":2,"foco":"Defesa primeiro","itens":[
    {"alvo":0,"texto":"Aprender a postura que impede ele de te pegar a perna"},
    {"alvo":3,"texto":"Drill: ele entra, você tira o pé antes de fechar"},
    {"alvo":4,"texto":"4 rolas em que só vale defender perna"},
    {"alvo":0,"texto":"Estudar um vídeo de defesa de chave de perna"}]},
  {"semana":3,"foco":"Aplicar com controle","itens":[
    {"alvo":0,"texto":"Aplicar devagar e soltar na hora certa — sempre"},
    {"alvo":3,"texto":"Drill de aplicação lenta com parceiro de confiança"},
    {"alvo":4,"texto":"4 rolas com quem topa jogo de perna"},
    {"alvo":0,"texto":"Confirmar com o professor o que é permitido na sua faixa"}]},
  {"semana":4,"foco":"Integrar ao seu jogo","itens":[
    {"alvo":0,"texto":"Ligar o jogo de perna à sua guarda principal"},
    {"alvo":3,"texto":"3 rolas em que a perna é uma opção, não o plano todo"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Reavaliar sua nota de jogo de perna de 0 a 5"}]}]$j$::jsonb, true),

-- ------------------------------------------------------------------- nogi
('nogi', 'roxa', '', 'No-gi sem improviso',
 'Sem pano, o jogo é conexão e ritmo. O mês é sobre traduzir o que você já faz, e não jogar de gi sem gi.',
 $j$[
  {"semana":1,"foco":"Traduzir o seu jogo","itens":[
    {"alvo":0,"texto":"Listar suas 5 posições de gi e achar a equivalente sem pano"},
    {"alvo":0,"texto":"Marcar as que simplesmente não existem no no-gi"},
    {"alvo":4,"texto":"4 rolas sem kimono usando só as traduções"},
    {"alvo":0,"texto":"Anotar o que sumiu do seu jogo"}]},
  {"semana":2,"foco":"Conexão no lugar da pegada","itens":[
    {"alvo":0,"texto":"Substituir pegada de pano por underhook, gable e cabeça"},
    {"alvo":3,"texto":"Drill de conexão: manter contato 2 min sem pegar nada"},
    {"alvo":4,"texto":"4 rolas em que soltar a conexão é derrota"},
    {"alvo":0,"texto":"Estudar um vídeo de controle no-gi"}]},
  {"semana":3,"foco":"Ritmo mais rápido","itens":[
    {"alvo":0,"texto":"Aceitar que a posição dura menos e decidir mais rápido"},
    {"alvo":4,"texto":"4 rolas de 4 min sem parar"},
    {"alvo":0,"texto":"Anotar onde você demorou demais para decidir"},
    {"alvo":3,"texto":"Drill de transição rápida entre controles"}]},
  {"semana":4,"foco":"Integrar","itens":[
    {"alvo":3,"texto":"3 rolas de gi tentando manter a pressão que o no-gi ensinou"},
    {"alvo":2,"texto":"Repetir os drills do mês"},
    {"alvo":0,"texto":"Decidir quanto do seu treino vai ser no-gi daqui pra frente"},
    {"alvo":0,"texto":"Reavaliar sua nota de no-gi de 0 a 5"}]}]$j$::jsonb, true),

-- ------------------------------------------------------------------ cardio
('cardio', 'roxa', '', 'Fôlego que sobra',
 'Na roxa o gasto vem de técnica ruim, não de pulmão ruim. O mês mistura condicionamento com economia de movimento.',
 $j$[
  {"semana":1,"foco":"Medir onde o gás vai","itens":[
    {"alvo":5,"texto":"5 rolas anotando em que posição você mais cansa"},
    {"alvo":0,"texto":"Identificar se o gasto é força inútil ou volume mesmo"},
    {"alvo":0,"texto":"Escolher a posição mais cara e resolver o técnico dela"},
    {"alvo":0,"texto":"Medir sua frequência cardíaca no fim do treino"}]},
  {"semana":2,"foco":"Respirar sob pressão","itens":[
    {"alvo":4,"texto":"Drill: 3 min embaixo respirando pelo nariz"},
    {"alvo":0,"texto":"Nunca prender a respiração ao passar ou escapar"},
    {"alvo":4,"texto":"4 rolas focando só em respirar constante"},
    {"alvo":0,"texto":"Anotar se conseguiu terminar sem ofegar"}]},
  {"semana":3,"foco":"Volume","itens":[
    {"alvo":6,"texto":"6 rolas seguidas de 5 min num mesmo treino"},
    {"alvo":2,"texto":"2 sessões de condicionamento fora do tatame"},
    {"alvo":0,"texto":"Dormir 7h nas noites antes dos treinos pesados"},
    {"alvo":0,"texto":"Anotar como foi o último rola de cada treino"}]},
  {"semana":4,"foco":"Testar","itens":[
    {"alvo":1,"texto":"Um treino de 10 rolas seguidos"},
    {"alvo":0,"texto":"Comparar o rola 1 com o rola 10"},
    {"alvo":2,"texto":"Repetir os drills de respiração"},
    {"alvo":0,"texto":"Reavaliar sua nota de cardio de 0 a 5"}]}]$j$::jsonb, true),

-- ------------------------------------------------------------------ cabeça
('cabeca', 'roxa', '', 'Jogar sem medo de perder',
 'Na roxa muita gente para de evoluir por medo de rodar. O mês é sobre voltar a arriscar e separar ego de aprendizado.',
 $j$[
  {"semana":1,"foco":"Ver o próprio medo","itens":[
    {"alvo":5,"texto":"5 rolas anotando quando você segurou por medo de perder"},
    {"alvo":0,"texto":"Listar com quem você joga travado e por quê"},
    {"alvo":0,"texto":"Admitir por escrito a posição que você evita"},
    {"alvo":0,"texto":"Definir o que você aceita perder este mês"}]},
  {"semana":2,"foco":"Jogar o que não sabe","itens":[
    {"alvo":4,"texto":"4 rolas usando só a posição que você evita"},
    {"alvo":0,"texto":"Rodar de propósito para alguém mais fraco, sem justificar"},
    {"alvo":0,"texto":"Anotar como foi a sensação"},
    {"alvo":0,"texto":"Contar a um parceiro o que você está treinando"}]},
  {"semana":3,"foco":"Ritmo e calma","itens":[
    {"alvo":4,"texto":"4 rolas em ritmo 70%, sem explodir nenhuma vez"},
    {"alvo":0,"texto":"Respirar fundo 3 vezes antes de cada rola"},
    {"alvo":0,"texto":"Não olhar o relógio durante o rola"},
    {"alvo":0,"texto":"Anotar se o resultado piorou de verdade"}]},
  {"semana":4,"foco":"Rodar sem se apagar","itens":[
    {"alvo":4,"texto":"4 rolas com quem te finaliza sempre"},
    {"alvo":0,"texto":"Perguntar a essa pessoa o que ela vê no seu jogo"},
    {"alvo":0,"texto":"Escrever o que mudou na sua cabeça no mês"},
    {"alvo":0,"texto":"Reavaliar sua nota de cabeça de 0 a 5"}]}]$j$::jsonb, true),

-- -------------------------------------------------------------- competição
('competicao', 'roxa', '', 'Camp de roxa',
 'Quatro semanas até a data: afinar o jogo que já existe, treinar as situações da luta e chegar leve — não inventar coisa nova.',
 $j$[
  {"semana":1,"foco":"Definir o plano de luta","itens":[
    {"alvo":0,"texto":"Escrever seu caminho: pé, passagem ou guarda, e a finalização"},
    {"alvo":0,"texto":"Confirmar categoria, peso e regras da federação"},
    {"alvo":5,"texto":"5 rolas jogando exatamente esse plano"},
    {"alvo":0,"texto":"Cortar do treino tudo que não está no plano"}]},
  {"semana":2,"foco":"Situações de luta","itens":[
    {"alvo":4,"texto":"Rolas começando 2 pontos atrás, 4x"},
    {"alvo":4,"texto":"Rolas começando 2 pontos à frente, segurando, 4x"},
    {"alvo":3,"texto":"Drill de vantagem: últimos 30 segundos"},
    {"alvo":0,"texto":"Anotar como você reage atrás no placar"}]},
  {"semana":3,"foco":"Pico","itens":[
    {"alvo":6,"texto":"6 lutas simuladas de 6 min com árbitro contando"},
    {"alvo":0,"texto":"Ajustar o peso sem cortar drástico"},
    {"alvo":2,"texto":"2 sessões leves de mobilidade"},
    {"alvo":0,"texto":"Revisar o plano com o professor"}]},
  {"semana":4,"foco":"Afinar e descansar","itens":[
    {"alvo":3,"texto":"3 treinos leves, só técnica, sem rola duro"},
    {"alvo":0,"texto":"Dormir 8h nas 3 noites antes"},
    {"alvo":0,"texto":"Separar kimono, documento e inscrição"},
    {"alvo":0,"texto":"Reler o plano de luta na véspera"}]}]$j$::jsonb, true)

on conflict (objective_slug, nivel, variante) do update
set titulo = excluded.titulo,
    resumo = excluded.resumo,
    semanas = excluded.semanas,
    ativo = excluded.ativo,
    updated_at = now();
