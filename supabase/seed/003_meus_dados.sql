-- ============================================================
-- TATAME — Meus dados (migrados do app antigo no Lovable)
-- Rodar DEPOIS do 002_conquistas.sql, logado no app ao menos 1x
-- (o app cria o perfil e as técnicas-base no primeiro login).
-- ============================================================
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado ainda. Crie sua conta no app primeiro.';
  END IF;

  -- Início da jornada (data do primeiro registro no app antigo)
  UPDATE profiles SET goal_start='2026-07-21' WHERE user_id=uid;

  -- ===== Treinos =====
  INSERT INTO trainings (user_id,date,type,duration_min,rolls,partners,techniques,notes) VALUES
  (uid,'2026-07-21','Gi',80,3,'Kris rafa daniel','Queda com lacada e derrubada no tripé de pé finalizando na botinha','O movimento foi tecnicamente simples consegui fazer a técnica tranquilamente para finalizar na botinha não foi tão simples, fiz os rolas primeiro com o faixa marrom kris acabei não pegando tomei 3 passagens e uma montada, consegui repor depois ele me finalizou em um armlock da montada, contra o rafael eu fiz uma passagem toureando quando ele puxou para guarda deixou fiz o knee slice passei peguei a montada fui caminhando com as mãos peguei uma katagatame e depois um estrangulamento com a lapela passando a perna por cima da cabeça, contra o daniel comecei puxando para guarda fechada já atacando um triângulo sai o quadril ajustei o triângulo peguei a perna dlee para se ele postular já sair na omoplata, em seguida acabei caindo na guarda dele ele me de um um ezequiel com as mãos na guarda fechada acabei batendo depois retornamos e puxei ele novamente para guarda já atacando um triângulo'),
  (uid,'2026-07-22','Gi',60,4,'Pedro,helena,jeff,gi,leo','Raspagem de gancho com over hook','Começamos treinando raspagem de gancho com overhook em seguida fizemos rolas o primeiro apenas fiquei repondo guarda para o Léo iniciante, em seguida fiz com pedro jovem campeão competidor de 15 anos fui de leve para não machucar ele apenas trocando posições, depois fiz com a gi mulher de 25 anos competidor boa faixa branca 3 graus, fiz sequência de omoplata para triângulo e armlock todos pegaram e eu soltava para continuar a sequência, e depois fiz com o Jefferson ele começou fazendo guarda fui passando, conseguir algumas passagens de knee slice não conseguir estabilizar bem o 100 kg ele me raspou utilizando minha perna voltei para guarda fechada, ele tentou me passar sai emborcando peguei as costas dele mas não finalizei antes do tempo'),
  (uid,'2026-07-23','Gi',60,4,'Thiago','Reposições e ajustes do triângulo','Levantar para que o adversário fique na linha do quadril para fazer a reposição no 100kg, ir se arrastando para ajustar o triângulo, fiz 3 rolas contra preta e azul comecei com o Thiago faixa preta fui dominado, apenas tentando repor guarda tive dificuldade ele me finalizou com arm lock não consegui sair, em seguida fiz com um faixa azul,começamos de pé ele puxou para guarda comecei a passagem acabei sendo raspado fui finalizado com um arm lock e um estrangulamento cruzado e no final peguei as costas  dele com uma cadeirinha mas não finalizei e no último novamente com faixa preta começamos de pé todos neste ganhei um single leg tentei uma queda não foi tão efetivo mas consegui manter uma meia guarda girei com ele segurando a lapela consegui manter a guarda ele não passou no último rola fiquei repondo e mantendo ele na meia'),
  (uid,'2026-07-24','Gi',60,4,'Jeferson,bruno,gi,dinda','Armlock invertido da guarda gancho','Fiz alguns drills do armlock invertido partindo da guarda gancho com over hook , em seguida fizemos alguns rolas comecei com o Jeferson faixa preta duríssimo, fui dominado estava tentando repor guarda não consegui em momento algum voltar para guarda, já contra o bruno fiz algumas raspagems simples ele voltou raspou da montada, me fechou na guarda fechada e segurou, depois fiz um mais soltinho com a filha do Jefferson peguei sarm lock costas montada e etc de leve ela era faixa laranja'),
  (uid,'2026-07-27','Gi',60,4,'Matheus tutu gi','Estrangulamento da guarda fechada com trava no braço e armlock invertido partindo da fechada','Fiz o primeiro rola com o matheus, faixa azul 2 graus, ele conseguiu a principio passar minha guarda tentou progredir para montada consegui repor a guarda, passei a guarda dele duas vezes com knee slice ele repôs as duas vezes não teve finalizações  fiz com tutu iniciante fiquei apenas fazendo posições para incentivar ele a se mexer e pegar as mecânicas, depois fiz com a gi fiz a delariva com ela fui para pegada de costas ela conseguiu estender meu braço e deu uma chance de braço reta em mim comigo estando nas costas dela e também me estrangulou com arco e flecha eu peguei costas montada e também raspei duas vezes ela'),
  (uid,'2026-07-28','Gi',60,1,'João batalha','Rolamentos, triângulo montada e guarda fechada','Fizemos vários drilss de rolamentos e também triângulo  da guarda fechada e da montada, fiz apenas um rola com o faixa branca dois graus, começamos de pé ele tentou me puxar para guarda eu passei para lateral depois de evitar a puxada cai na lateral ele tentou subir para a guarda fechada matei o braço dele é fiz um violino com braço dele, em seguida resetamos puxei ele pra guarda e ataquei triângulo imediatamente pegando, depois ele puxou para guarda evitei novamente, fui para lateral subi nele na montada tentei atacar triângulo da montada ele defendeu ataquei a omoplata ele levantou busquei a perna dele travei empurrei ele pra frente travei o quadril e finalizei na omoplata');

  -- ===== Análises do treinador =====
  INSERT INTO analyses (user_id,date,title,content) VALUES
  (uid,'2026-07-22','Análise 21-22/07','LEITURA: teu topo e uma maquina (vs Rafael: knee slice > montada > katagatame > estrangulamento de lapela; vs Helena: omoplata > triangulo > armlock). • PADRAO: consolidar depois de passar e o furo nº1 — foi raspado pelo Jefferson por nao estabilizar o 100kg e montado pelo marrom. • ALERTA: puxada + triangulo virou reflexo previsivel; tomou ezequiel dentro da guarda = POSTURA baixa (mesmo vicio da guilhotina). Pegou as costas (Jefferson) e nao finalizou. • FOCO: depois de passar, CONGELA e estabiliza 3s antes de atacar.'),
  (uid,'2026-07-23','Análise 23/07 (check-in)','LEITURA: rolou com 2 pretas e 1 azul. • POSITIVO: teu jogo em pe ACORDOU — comecou em pe e ganhou um single contra faixa-preta; retencao segurou (girou na lapela, a preta nao passou). • ALERTA VERMELHO: armlocks em serie — Thiago, o azul e antes o Kris = 3 finalizacoes de braco; sob pressao voce entrega o cotovelo. • Pegou as costas (cadeirinha no azul) e nao finalizou de novo. • FOCO: COTOVELOS COLADOS no corpo ao repor guarda e defender — nao dar o braco.'),
  (uid,'2026-07-29','Check-in 29/07','LEITURA (24, 27 e 28/07 — 3 treinos, 9 rolas): vs Jeferson (preta) fui dominado e nao repus guarda em momento algum. vs Bruno perdi a montada e fui raspado. vs Matheus (azul 2g) passei 2x de knee slice e ele repos as duas vezes. vs Gi: DLR > pegada de costas, mas TOMEI chave de braco reta e arco e flecha estando NAS COSTAS dela. vs Joao (branca 2g): evitei a puxada dele DUAS vezes e fui direto pra lateral, finalizei no violino, depois puxei armado e o triangulo pegou de primeira, e por cima encadeei triangulo da montada > omoplata e FINALIZEI. • PADROES: teu jogo em pe acordou de verdade (defender puxada e ir pra lateral era zero no diagnostico); encadeamento funciona tambem POR CIMA; CONSOLIDACAO segue como furo nº1 (3o check-in seguido); contra preta forte a retencao quebra. • ALERTAS: tomou finalizacao de braco ESTANDO NAS COSTAS — atacou antes de travar e entregou o cotovelo (4a chave de braco sofrida); costas: chegou 3x e finalizou 0. • FOCO: pegou as costas? TRAVA ANTES DE ATACAR — cinto de seguranca + triangulo de corpo + cotovelos colados, 3 segundos de controle, e SO DEPOIS briga a mao pro mata-leao.');

  -- ===== Meu jogo (posições personalizadas ⭐) =====
  INSERT INTO techniques (user_id,name,category,notes,video_url,mastery) VALUES
  (uid,'⭐ Entrada — Single do Boxeador','Queda','MEU JOGO. Usa a distancia e a mao-guia do boxe pra medir, faz o level change explosivo e ataca o single na perna mais proxima. Se ele defender com sprawl + guilhotina, NAO abaixa a cabeca: cabeca pra cima e pra fora, corre o angulo e pega o pe proximo. Objetivo: cair POR CIMA, nunca puxar guarda.','',1),
  (uid,'⭐ Puxada Armada → De La Riva','Guarda','MEU JOGO. So puxa guarda COM pegada montada: manga + gola (ou tornozelo). Nunca puxa passivo. Ao sentar, ja encaixa o gancho de DLR por fora da perna dele. Sem as duas pegadas, NAO puxa: wrestleia.','',2),
  (uid,'⭐ DLR Longa (pernas de 1,85)','Guarda','MEU JOGO — ponto de partida por baixo. Gancho por fora + pegada no tornozelo + gola/manga. Estica ele pra frente pra roubar a base. Daqui saem berimbolo, raspagem e costas.','',3),
  (uid,'⭐ Emboque da DLR → Costas','Raspagem','MEU JOGO FAVORITO. Da DLR longa, puxa a pegada do tornozelo/calca + gancho leva ele pra frente. Quando ele posta a mao, gira por baixo (berimbolo/emboque) e sobe atras. NAO force: aceita a reacao dele. Chegou nas costas → cinto de seguranca.','',2),
  (uid,'⭐ Aranha-Lasso → quebra de postura → DLR','Guarda','MEU JOGO. Lasso numa manga + pe na outra alca. Quebra a postura dele. Quando ele anda pra passar, troca pro gancho de DLR. A aranha ALIMENTA a DLR.','',2),
  (uid,'⭐ Knee Slice com Ancora (congela 3s)','Passagem','MEU AJUSTE Nº1. Depois do knee slice: crossface + underhook + joelho colado no chao. CONGELA 3 segundos, sente o peso, so DEPOIS avanca pra montada. Estabilizar vale mais que correr pra finalizacao.','',2),
  (uid,'⭐ Toureando → Costas','Passagem','MEU JOGO. No toureando, quando ele vira de quatro ou te da o lado, nao insiste por cima: pega as costas. Maos no cinto/pescoco, primeiro gancho, depois o segundo.','',2),
  (uid,'⭐ Costas Blindadas — Cinto + Triângulo de Corpo → Mata-leão','Finalização','Sequencia fixa: 1) Cinto de seguranca. 2) Fecha o TRIANGULO DE CORPO (pernas longas favorecem). 3) Briga de mao 2-contra-1 ate tirar a defesa. 4) Encaixa o mata-leao. Nunca ataca o pescoco antes de travar o controle.','',1),
  (uid,'⭐ Postura Blindada na Guarda (anti-ezequiel/guilhotina)','Defesa','Dentro da guarda fechada dele: queixo pra DENTRO, coluna ERETA, nunca estica a cabeca pra frente (vicio de boxeador). Maos: uma no quadril, uma na lapela, cotovelos colados. Cabeca erguida = sem estrangulamento.','',1);

  -- ===== Conquistas já desbloqueadas =====
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-21'
   WHERE user_id=uid AND key IN ('first_log','first_roll','train_brown','first_sub','triangle');
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-22'
   WHERE user_id=uid AND key IN ('train_white','beat_white','armlock','omoplata','take_back','chain');
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-23'
   WHERE user_id=uid AND key IN ('train_blue','train_black','streak_3','first_week','survive_black','takedown','two_blacks');
  UPDATE achievements SET unlocked=true, unlocked_date='2026-07-29'
   WHERE user_id=uid AND key IN (
    'vol_train_1','vol_train_5','streak_days_2','streak_days_3','rolls_total_10',
    'months_active_1','months_active_3','months_active_6',
    'partner_white_1','partner_white_5','partner_blue_1','partner_brown_1','partner_black_1',
    'sub_omoplatab_1','sub_triangulob_1','sub_armlockb_1','sub_katagatame_1','sub_lapela_1',
    'firstsub_white','pass_kneeslice_1','pass_toureando_1','td_single_1',
    'pos_mount_1','pos_back_1','pos_sidec_1','esc_montada_1',
    'life_first_gi','life_night','edu_help_beginner','analyses_1','videos_1','no_pass_black');

  -- ===== Progresso inicial das barras =====
  UPDATE achievements SET progress=LEAST(target,6) WHERE user_id=uid AND (key LIKE 'vol_train_%' OR key LIKE 'vol_gi_%');
  UPDATE achievements SET progress=LEAST(target,20) WHERE user_id=uid AND (key LIKE 'rolls_total_%' OR key LIKE 'spar_%');
  UPDATE achievements SET progress=LEAST(target,6) WHERE user_id=uid AND key LIKE 'hours_%';
  UPDATE achievements SET progress=LEAST(target,4) WHERE user_id=uid AND key LIKE 'streak_days_%';
  UPDATE achievements SET progress=LEAST(target,8) WHERE user_id=uid AND key LIKE 'months_active_%';
  UPDATE achievements SET progress=LEAST(target,3) WHERE user_id=uid AND key LIKE 'vol_gi_%';
  UPDATE achievements SET progress=target WHERE user_id=uid AND unlocked=true AND target IS NOT NULL;

  RAISE NOTICE 'Dados pessoais migrados para o usuário %', uid;
END $$;
