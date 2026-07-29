-- ============================================================
-- TATAME — Seed das ~1.000 conquistas (rodar DEPOIS de criar
-- sua conta no app). Aplica ao PRIMEIRO usuário cadastrado.
-- Pode rodar de novo sem duplicar (ON CONFLICT DO NOTHING).
-- ============================================================
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado ainda. Crie sua conta no app primeiro.';
  END IF;

  -- ===== Base (36 marcos principais) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'first_log','Primeiro registro','Registre seu primeiro treino','Branca','Especial',1),
  (uid,'first_roll','Primeira rola','Complete seu primeiro rolo','Branca','Especial',2),
  (uid,'train_white','Parceiro Branca','Treine com um faixa branca','Branca','Parceiro',3),
  (uid,'train_blue','Parceiro Azul','Treine com um faixa azul','Branca','Parceiro',4),
  (uid,'train_purple','Parceiro Roxa','Treine com um faixa roxa','Branca','Parceiro',5),
  (uid,'train_brown','Parceiro Marrom','Treine com um faixa marrom','Branca','Parceiro',6),
  (uid,'train_black','Parceiro Preta','Treine com um faixa preta','Branca','Parceiro',7),
  (uid,'streak_3','3 dias seguidos','Treine 3 dias consecutivos','Branca','Frequencia',8),
  (uid,'first_week','Primeira semana','Registre 3 treinos numa semana','Branca','Frequencia',9),
  (uid,'first_sub','Primeira finalizacao','Registre sua primeira finalizacao','Branca','Tecnica',10),
  (uid,'two_a_day','Dose dupla','Faca 2 treinos no mesmo dia','Azul','Frequencia',11),
  (uid,'streak_7','7 dias seguidos','Treine 7 dias consecutivos','Azul','Frequencia',12),
  (uid,'beat_white','Vitoria vs Branca','Ganhe de um faixa branca','Azul','Vitoria',13),
  (uid,'armlock','Armlock!','Aplique um armlock','Azul','Tecnica',14),
  (uid,'triangle','Triangulo!','Aplique um triangulo','Azul','Tecnica',15),
  (uid,'omoplata','Omoplata!','Aplique uma omoplata','Azul','Tecnica',16),
  (uid,'take_back','Pegou as costas','Conquiste as costas num rolo','Azul','Tecnica',17),
  (uid,'logs_20','20 treinos','Registre 20 treinos','Azul','Frequencia',18),
  (uid,'survive_black','Sobrevivente','Role com faixa preta sem ser finalizado','Azul','Vitoria',19),
  (uid,'streak_20','20 dias seguidos','Treine 20 dias consecutivos','Roxa','Frequencia',20),
  (uid,'beat_blue','Vitoria vs Azul','Ganhe de um faixa azul','Roxa','Vitoria',21),
  (uid,'mataleao','Mata-leao','Finalize com mata-leao pelas costas','Roxa','Tecnica',22),
  (uid,'chain','Sequencia mortal','Encadeie omoplata-triangulo-armlock num rolo','Roxa','Tecnica',23),
  (uid,'takedown','Quedou!','Aplique uma queda num rolo','Roxa','Tecnica',24),
  (uid,'two_blacks','Dois pretas','Treine com dois faixas pretas no mesmo dia','Roxa','Parceiro',25),
  (uid,'logs_50','50 treinos','Registre 50 treinos','Roxa','Frequencia',26),
  (uid,'beat_purple','Vitoria vs Roxa','Ganhe de um faixa roxa','Roxa','Vitoria',27),
  (uid,'month_streak','Um mes seguido','Treine 30 dias consecutivos','Marrom','Frequencia',28),
  (uid,'compete','Estreia','Compita pela primeira vez','Marrom','Competicao',29),
  (uid,'win_match','Primeira vitoria oficial','Venca uma luta em competicao','Marrom','Competicao',30),
  (uid,'beat_brown','Vitoria vs Marrom','Ganhe de um faixa marrom','Marrom','Vitoria',31),
  (uid,'logs_100','100 treinos','Registre 100 treinos','Marrom','Frequencia',32),
  (uid,'sub_black','Cacador','Finalize um faixa preta num rolo','Marrom','Tecnica',33),
  (uid,'win_comp','Campeao','Ganhe um campeonato','Preta','Competicao',34),
  (uid,'streak_100','100 dias','Treine 100 dias consecutivos','Preta','Frequencia',35),
  (uid,'all_done','Faixa Preta do Tatame','Desbloqueie todas as outras conquistas','Preta','Especial',36)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Volume de treinos =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'vol_train_'||n,'Treine '||n||' vezes','Acumule '||n||' treinos registrados',
   CASE WHEN o<=3 THEN 'Branca' WHEN o<=7 THEN 'Azul' WHEN o<=11 THEN 'Roxa' WHEN o<=15 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',100+o
  FROM unnest(ARRAY[1,5,10,20,30,50,75,100,150,200,300,400,500,750,1000,1500,2000,3000,5000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Dias seguidos =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'streak_days_'||n,n||' dias seguidos','Treine '||n||' dias consecutivos',
   CASE WHEN o<=3 THEN 'Branca' WHEN o<=6 THEN 'Azul' WHEN o<=10 THEN 'Roxa' WHEN o<=14 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',200+o
  FROM unnest(ARRAY[2,3,5,7,10,14,20,30,45,60,90,120,150,200,270,365,500,730,1000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Semanas seguidas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'streak_weeks_'||n,n||' semanas seguidas','Treine toda semana por '||n||' semanas',
   CASE WHEN o<=2 THEN 'Branca' WHEN o<=4 THEN 'Azul' WHEN o<=7 THEN 'Roxa' WHEN o<=9 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',300+o
  FROM unnest(ARRAY[2,4,8,12,16,24,36,52,78,104,156,208]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Rolas acumuladas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'rolls_total_'||n,n||' rolas','Complete '||n||' rolas no total',
   CASE WHEN o<=2 THEN 'Branca' WHEN o<=4 THEN 'Azul' WHEN o<=6 THEN 'Roxa' WHEN o<=8 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',400+o
  FROM unnest(ARRAY[10,25,50,100,250,500,1000,2500,5000,10000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Horas de tatame =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'hours_'||n,n||' horas de tatame','Acumule '||n||' horas treinando',
   CASE WHEN o<=2 THEN 'Branca' WHEN o<=4 THEN 'Azul' WHEN o<=6 THEN 'Roxa' WHEN o<=8 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',500+o
  FROM unnest(ARRAY[10,25,50,100,250,500,1000,2000,5000]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Parceiros por faixa =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'partner_'||b.slug||'_'||c.n,'Treine com '||c.n||' faixas '||b.label,'Some '||c.n||' parceiros faixa '||b.label,
   b.tier,'Parceiro',600 + b.ord*10 + c.o
  FROM (VALUES ('white','branca','Branca',1),('blue','azul','Azul',2),('purple','roxa','Roxa',3),('brown','marrom','Marrom',4),('black','preta','Preta',5),('coral','coral','Preta',6)) AS b(slug,label,tier,ord)
  CROSS JOIN unnest(ARRAY[1,5,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== N pretas no mesmo dia =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'blacks_sameday_'||n,n||' pretas no mesmo dia','Treine com '||n||' faixas pretas num unico dia',
   CASE WHEN o<=2 THEN 'Roxa' WHEN o<=4 THEN 'Marrom' ELSE 'Preta' END,'Parceiro',700+o
  FROM unnest(ARRAY[2,3,4,5,7,10]) WITH ORDINALITY AS t(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Vitorias por faixa =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'beat_'||b.slug||'_'||c.n,'Venca '||c.n||' faixas '||b.label,'Ganhe '||c.n||' rolos contra faixa '||b.label,
   b.tier,'Vitoria',800 + b.ord*10 + c.o
  FROM (VALUES ('white','branca','Azul',1),('blue','azul','Roxa',2),('purple','roxa','Marrom',3),('brown','marrom','Marrom',4),('black','preta','Preta',5)) AS b(slug,label,tier,ord)
  CROSS JOIN unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Finalizacoes (40 tecnicas x marcos) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sub_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Finalize '||c.n||' vez(es) com '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o<=5 THEN 'Marrom' ELSE 'Preta' END,'Finalizacao',1000+c.o
  FROM (VALUES
   ('armlockb','armlock'),('triangulob','triangulo'),('omoplatab','omoplata'),('kimura','kimura'),
   ('americana','americana'),('mataleaob','mata-leao'),('katagatame','katagatame'),('ezequiel','ezequiel'),
   ('guilhotina','guilhotina'),('darce','brabo (darce)'),('anaconda','anaconda'),('peruano','peruano'),
   ('relogio','estrangulamento relogio'),('baseball','baseball bat choke'),('bowarrow','arco e flecha'),
   ('lapela','estrangulamento de lapela'),('cruzado','estrangulamento cruzado'),('armtriangle','triangulo de braco'),
   ('northsouth','north-south choke'),('papercutter','paper cutter'),('gravata','gravata'),('botinha','chave de pe reta'),
   ('toehold','toe hold'),('heelhook','heel hook'),('kneebar','chave de joelho'),('bicepslicer','biceps slicer'),
   ('calfslicer','calf slicer'),('wristlock','mao de vaca'),('gogoplata','gogoplata'),('crucifixo','estrangulamento crucifixo'),
   ('loopchoke','loop choke'),('mountchoke','estrangulamento da montada'),('bulldog','bulldog choke'),('vonflue','von flue choke'),
   ('bananasplit','banana split'),('electricchair','electric chair'),('twister','twister'),('suloev','suloev stretch'),
   ('pacoca','pacoca'),('estrangcostas','estrangulamento pelas costas')
  ) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100,250]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Raspagens =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sweep_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Aplique '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o=4 THEN 'Marrom' ELSE 'Preta' END,'Raspagem',2000+c.o
  FROM (VALUES ('tesoura','raspagem tesoura'),('gancho','raspagem de gancho'),('balao','raspagem balao'),('flor','raspagem flor de lotus'),('dlr','raspagem De La Riva'),('xguard','raspagem X-guard'),('slx','raspagem single-leg X'),('aranha','raspagem da aranha'),('lasso','raspagem lasso'),('borboleta','raspagem borboleta'),('meia','raspagem da meia-guarda'),('joelhosh','raspagem joelho-shield'),('tornozelo','raspagem por tornozelo'),('overhook','raspagem com overhook'),('situp','raspagem sit-up'),('hipbump','raspagem hip bump'),('pendulo','raspagem pendulo'),('deephalf','raspagem deep half'),('williams','williams guard sweep'),('berimbolosw','berimbolo')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Passagens =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'pass_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Passe a guarda '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o=4 THEN 'Marrom' ELSE 'Preta' END,'Passagem',2100+c.o
  FROM (VALUES ('toureando','passagem toureando'),('kneeslice','knee slice'),('stack','stack pass'),('legdrag','leg drag'),('overunder','over-under'),('dobradinha','dobradinha'),('pressao','passagem de pressao'),('longstep','long step'),('xpass','x-pass'),('float','passagem flutuante'),('bodylock','body lock pass'),('smash','smash pass'),('cortando','passagem cortando'),('joelhomeio','joelho no meio'),('saltando','passagem saltando'),('ninja','ninja pass')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Quedas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'td_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Derrube '||c.n||' vez(es) com '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o<=3 THEN 'Roxa' WHEN c.o=4 THEN 'Marrom' ELSE 'Preta' END,'Queda',2200+c.o
  FROM (VALUES ('single','single leg'),('double','double leg'),('ouchi','ouchi gari'),('kouchi','kouchi gari'),('ippon','ippon seoi nage'),('morote','morote seoi'),('ogoshi','o goshi'),('uchimata','uchi mata'),('taiotoshi','tai otoshi'),('haraigoshi','harai goshi'),('kosoto','kosoto gari'),('anklepick','ankle pick'),('highc','high crotch'),('footsweep','foot sweep'),('tomoenage','tomoe nage'),('arrasto','arrasto (drag)')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,25,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Escapes/defesas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'esc_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Consiga '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o=2 THEN 'Roxa' ELSE 'Marrom' END,'Escape',2300+c.o
  FROM (VALUES ('montada','escape da montada'),('costas','escape das costas'),('lateral','escape da lateral'),('kesa','escape do kesa gatame'),('cemkg','escape do 100kg'),('tridef','defesa de triangulo'),('armdef','defesa de armlock'),('guildef','defesa de guilhotina'),('matadef','defesa de mata-leao'),('kimdef','defesa de kimura'),('legdef','defesa de chave de pe'),('turtle','saida da tartaruga')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,50]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Controles =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'pos_'||s.slug||'_'||c.n, s.name||' x'||c.n,'Conquiste/segure '||c.n||' vez(es): '||s.name,
   CASE WHEN c.o=1 THEN 'Azul' WHEN c.o=2 THEN 'Roxa' WHEN c.o=3 THEN 'Marrom' ELSE 'Preta' END,'Controle',2400+c.o
  FROM (VALUES ('mount','montada'),('back','pegar as costas'),('kob','joelho na barriga'),('sidec','controle lateral'),('northsouth','controle norte-sul'),('crucifixo','crucifixo'),('bodytri','triangulo de corpo nas costas'),('turtletop','controle da tartaruga')) AS s(slug,name)
  CROSS JOIN unnest(ARRAY[1,10,50,100]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Graduacao =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'grad_branca4','4o grau na Branca','Conquiste o 4o grau na faixa branca','Branca','Graduacao',3000),
  (uid,'grad_azul','FAIXA AZUL','Seja graduado faixa azul','Azul','Graduacao',3010),
  (uid,'grad_roxa','FAIXA ROXA','Seja graduado faixa roxa','Roxa','Graduacao',3030),
  (uid,'grad_marrom','FAIXA MARROM','Seja graduado faixa marrom','Marrom','Graduacao',3050),
  (uid,'grad_preta','FAIXA PRETA','Seja graduado faixa preta','Preta','Graduacao',3070),
  (uid,'grad_coral_7','7o grau — Faixa Coral','Conquiste o 7o grau (coral vermelho e preto)','Coral','Graduacao',3096),
  (uid,'grad_coral_8','8o grau — Faixa Coral','Conquiste o 8o grau (coral vermelho e branco)','Coral','Graduacao',3097),
  (uid,'grad_vermelha_9','9o grau — Faixa Vermelha','Conquiste o 9o grau (faixa vermelha)','Vermelha','Graduacao',3098),
  (uid,'grad_vermelha_10','10o grau — Faixa Vermelha','Grao-mestre: o 10o grau, reservado aos pioneiros','Vermelha','Graduacao',3099)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'grad_'||b.slug||'_'||g,g||'o grau na '||b.label,'Conquiste o '||g||'o grau na faixa '||b.label,b.tier,'Graduacao',b.base+g
  FROM (VALUES ('azul','Azul','Azul',3011),('roxa','Roxa','Roxa',3031),('marrom','Marrom','Marrom',3051)) b(slug,label,tier,base)
  CROSS JOIN generate_series(1,4) g
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'grad_preta_'||g,g||'o grau na Preta','Conquiste o '||g||'o grau na faixa preta','Preta','Graduacao',3071+g
  FROM generate_series(1,6) g
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Competicao (contagens) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'comp_events_'||n,'Compita '||n||' vez(es)','Participe de '||n||' campeonatos',
   CASE WHEN o<=2 THEN 'Roxa' WHEN o<=4 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3100+o
  FROM unnest(ARRAY[1,3,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'comp_wins_'||n,'Venca '||n||' luta(s)','Venca '||n||' lutas em competicao',
   CASE WHEN o<=1 THEN 'Roxa' WHEN o<=3 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3120+o
  FROM unnest(ARRAY[1,5,10,25,50,100]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Competicao (marcos) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'comp_debut','Estreia oficial','Compita pela primeira vez','Roxa','Competicao',3140),
  (uid,'comp_first_medal','Primeira medalha','Suba ao podio pela primeira vez','Roxa','Competicao',3141),
  (uid,'comp_win_sub','Vitoria por finalizacao','Venca uma luta finalizando','Marrom','Competicao',3142),
  (uid,'comp_win_pts','Vitoria por pontos','Venca uma luta nos pontos','Roxa','Competicao',3143),
  (uid,'comp_bronze','Bronze','Conquiste uma medalha de bronze','Roxa','Competicao',3144),
  (uid,'comp_silver','Prata','Conquiste uma medalha de prata','Marrom','Competicao',3145),
  (uid,'comp_gold','Ouro','Conquiste uma medalha de ouro','Marrom','Competicao',3146),
  (uid,'comp_gold_abs','Ouro no absoluto','Venca a categoria absoluto','Preta','Competicao',3147),
  (uid,'comp_state','Campeao estadual','Venca um campeonato estadual','Marrom','Competicao',3148),
  (uid,'comp_national','Campeao nacional','Venca um campeonato nacional','Preta','Competicao',3149),
  (uid,'comp_pan','Medalha no Pan','Medalhe no Pan-americano IBJJF','Preta','Competicao',3150),
  (uid,'comp_worlds_medal','Medalha no Mundial','Medalhe no Mundial IBJJF','Preta','Competicao',3151),
  (uid,'comp_worlds_gold','Campeao Mundial','Seja campeao mundial IBJJF','Preta','Competicao',3152),
  (uid,'comp_euro','Medalha no Europeu','Medalhe no Europeu IBJJF','Preta','Competicao',3153),
  (uid,'comp_adcc','ADCC','Compita no ADCC','Preta','Competicao',3154),
  (uid,'comp_master','Master Worlds','Medalhe no Master Mundial','Marrom','Competicao',3155),
  (uid,'comp_nogi_medal','Medalha No-Gi','Medalhe num campeonato No-Gi','Marrom','Competicao',3156),
  (uid,'comp_travel_state','Competir fora','Compita em outro estado','Marrom','Competicao',3157),
  (uid,'comp_intl','Competir internacional','Compita fora do pais','Preta','Competicao',3158),
  (uid,'comp_final_sub','Final finalizada','Finalize na final de um campeonato','Marrom','Competicao',3159)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Seminarios e educacao =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sem_'||s.slug,'Seminario de '||s.name,'Participe de um seminario de '||s.name,'Roxa','Educacao',3200+s.o
  FROM (VALUES ('gi','Gi',1),('nogi','No-Gi',2),('leglock','leglocks',3),('wrestling','wrestling e quedas',4),('passagem','passagem de guarda',5),('guarda','jogo de guarda',6),('final','finalizacoes',7)) s(slug,name,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'sem_count_'||n,'Participe de '||n||' seminario(s)','Some '||n||' seminarios no total',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Educacao',3210+o
  FROM unnest(ARRAY[1,3,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'edu_online','Curso online','Faca um curso online de BJJ','Branca','Educacao',3220),
  (uid,'edu_review','Estudioso','Estude um treino em video','Branca','Educacao',3221),
  (uid,'edu_notebook','Caderno de guerra','Mantenha um caderno de BJJ por 1 mes','Azul','Educacao',3222),
  (uid,'edu_watch_worlds','Torcedor','Assista a um Mundial','Branca','Educacao',3223),
  (uid,'edu_dropin','Visitante','Treine em outra academia (drop-in)','Azul','Educacao',3224),
  (uid,'edu_openmat_1','Primeiro open mat','Participe de um open mat','Azul','Educacao',3225),
  (uid,'edu_openmat_10','Rato de open mat','Participe de 10 open mats','Roxa','Educacao',3226),
  (uid,'edu_openmat_50','Lenda do open mat','Participe de 50 open mats','Marrom','Educacao',3227),
  (uid,'edu_help_teach','Monitor','Ajude a dar uma aula','Roxa','Educacao',3228),
  (uid,'edu_teach_class','Professor por um dia','De uma aula sozinho','Marrom','Educacao',3229),
  (uid,'edu_graduate','Mestre','Ajude a graduar um aluno','Preta','Educacao',3230),
  (uid,'edu_help_beginner','Padrinho','Ensine um iniciante','Azul','Educacao',3231),
  (uid,'edu_kids','Tio do tatame','Ajude na aula das criancas','Roxa','Educacao',3232),
  (uid,'edu_referee','Arbitro','Arbitre uma competicao','Marrom','Educacao',3233),
  (uid,'edu_private_1','Aula particular','Faca uma aula particular','Azul','Educacao',3234),
  (uid,'edu_private_10','Dedicado','Faca 10 aulas particulares','Roxa','Educacao',3235),
  (uid,'edu_camp','Camp de treino','Participe de um camp de treino','Marrom','Educacao',3236),
  (uid,'edu_other_state','Tatame viajante','Treine em outro estado','Roxa','Educacao',3237),
  (uid,'edu_other_country','Passaporte do jiu','Treine em outro pais','Marrom','Educacao',3238),
  (uid,'edu_gyms_3','Explorador','Treine em 3 academias diferentes','Roxa','Educacao',3239),
  (uid,'edu_gyms_5','Nomade','Treine em 5 academias diferentes','Marrom','Educacao',3240),
  (uid,'edu_gyms_10','Cidadao do mundo','Treine em 10 academias diferentes','Preta','Educacao',3241),
  (uid,'edu_idol','Treino dos sonhos','Treine com um atleta que voce admira','Roxa','Educacao',3242),
  (uid,'edu_ceremony','Cerimonia','Participe de uma cerimonia de graduacao','Azul','Educacao',3243),
  (uid,'edu_seminar_champ','Frente a frente','Faca um seminario com um campeao mundial','Roxa','Educacao',3244)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Volume Gi / No-Gi =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'vol_'||g.slug||'_'||c.n,c.n||' treinos '||g.name,'Acumule '||c.n||' treinos '||g.name,
   CASE WHEN c.o<=2 THEN 'Azul' WHEN c.o<=4 THEN 'Roxa' WHEN c.o<=6 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3250+g.ord*10+c.o
  FROM (VALUES ('gi','de Gi',1),('nogi','de No-Gi',2)) g(slug,name,ord)
  CROSS JOIN unnest(ARRAY[10,25,50,100,250,500,1000]) WITH ORDINALITY AS c(n,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Social / jornada / estudo =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'partners_div_'||n,n||' parceiros diferentes','Role com '||n||' parceiros distintos',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Social',3300+o
  FROM unnest(ARRAY[10,25,50,100,200]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'months_active_'||n,n||' meses de jornada','Complete '||n||' meses treinando',
   CASE WHEN o<=1 THEN 'Branca' WHEN o<=3 THEN 'Azul' WHEN o<=4 THEN 'Roxa' WHEN o<=6 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3310+o
  FROM unnest(ARRAY[1,3,6,12,24,36,60,120]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'twoaday_'||n,n||'x treino duplo','Faca 2 treinos no mesmo dia '||n||' vez(es)',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3320+o
  FROM unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'study_mastery_'||n,'Domine '||n||' tecnica(s)','Chegue a nota 5 em '||n||' tecnicas da biblioteca',
   CASE WHEN o=1 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o=4 THEN 'Marrom' ELSE 'Preta' END,'Estudo',3330+o
  FROM unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'rollsday_'||n,n||' rolas num dia','Faca '||n||' rolas num unico treino',
   CASE WHEN o=1 THEN 'Azul' WHEN o=2 THEN 'Roxa' WHEN o=3 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3340+o
  FROM unnest(ARRAY[5,7,10,15]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Finalizar pretas (por tecnica) =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'subblack_'||s.slug,'Preta finalizado: '||s.name,'Finalize um faixa preta com '||s.name,'Preta','Lendaria',3400+s.o
  FROM (VALUES ('armlock','armlock',1),('triangulo','triangulo',2),('omoplata','omoplata',3),('kimura','kimura',4),('americana','americana',5),('mataleao','mata-leao',6),('katagatame','katagatame',7),('ezequiel','ezequiel',8),('guilhotina','guilhotina',9),('darce','brabo',10),('anaconda','anaconda',11),('peruano','peruano',12),('relogio','estrangulamento relogio',13),('baseball','baseball choke',14),('bowarrow','arco e flecha',15),('lapela','estrang. de lapela',16),('cruzado','estrang. cruzado',17),('armtriangle','triangulo de braco',18),('northsouth','north-south',19),('botinha','chave de pe reta',20),('heelhook','heel hook',21),('kneebar','chave de joelho',22),('gogoplata','gogoplata',23),('crucifixo','crucifixo',24),('loopchoke','loop choke',25)) s(slug,name,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'firstsub_'||b.slug,'Finalize um faixa '||b.label,'Finalize um parceiro faixa '||b.label||' num rolo',b.tier,'Finalizacao',3440+b.o
  FROM (VALUES ('white','branca','Azul',1),('blue','azul','Roxa',2),('purple','roxa','Roxa',3),('brown','marrom','Marrom',4),('black','preta','Preta',5)) b(slug,label,tier,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'subblack_count_'||n,'Cace '||n||' preta(s)','Finalize '||n||' faixas pretas no total',
   CASE WHEN o<=2 THEN 'Marrom' ELSE 'Preta' END,'Lendaria',3450+o
  FROM unnest(ARRAY[1,3,5,10]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Guardas dominadas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'guard_'||s.slug,'Domine a guarda '||s.name,'Jogue e domine a guarda '||s.name,'Roxa','Estudo',3460+s.o
  FROM (VALUES ('fechada','fechada',1),('aranha','aranha',2),('dlr','De La Riva',3),('slx','single-leg X',4),('xguard','X-guard',5),('borboleta','borboleta',6),('meia','meia-guarda',7),('lasso','lasso',8),('deep','deep half',9),('reverse','reverse De La Riva',10)) s(slug,name,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Estudo / analises / descanso / medalhas =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'videos_'||n,'Assista '||n||' video(s)','Estude '||n||' treinos em video',
   CASE WHEN o=1 THEN 'Branca' WHEN o=2 THEN 'Azul' WHEN o=3 THEN 'Roxa' ELSE 'Marrom' END,'Estudo',3480+o
  FROM unnest(ARRAY[1,10,50,100]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'analyses_'||n,'Receba '||n||' analise(s)','Acumule '||n||' analises do treinador',
   CASE WHEN o=1 THEN 'Branca' WHEN o<=3 THEN 'Azul' WHEN o=4 THEN 'Roxa' ELSE 'Marrom' END,'Estudo',3490+o
  FROM unnest(ARRAY[1,5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'rest_'||n,'Descanse com sabedoria x'||n,'Registre '||n||' dias de descanso','Branca','Frequencia',3500+o
  FROM unnest(ARRAY[5,10,25,50]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'medals_'||n,'Conquiste '||n||' medalha(s)','Some '||n||' medalhas em competicao',
   CASE WHEN o=1 THEN 'Roxa' WHEN o<=2 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3510+o
  FROM unnest(ARRAY[1,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Estilo de vida =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'life_first_gi','Primeiro kimono','Vista seu primeiro kimono','Branca','Estilo',3520),
  (uid,'life_night','Coruja do tatame','Treine a noite','Branca','Estilo',3521),
  (uid,'life_morning','Madrugador','Treine de manha cedo','Azul','Estilo',3522),
  (uid,'life_weekend','Guerreiro de fim de semana','Treine sabado e domingo','Azul','Estilo',3523),
  (uid,'life_holiday','Sem folga','Treine num feriado','Azul','Estilo',3524),
  (uid,'life_birthday','Aniversario no tatame','Treine no dia do seu aniversario','Roxa','Estilo',3525),
  (uid,'life_newyear','Ano novo, mesma pegada','Treine em 1 de janeiro','Roxa','Estilo',3526),
  (uid,'life_sixweek','Semana cheia','Treine 6 dias numa mesma semana','Roxa','Estilo',3527)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Lendarias =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'leg_streak_year','Um ano invicto contra a preguica','Treine 365 dias seguidos','Preta','Lendaria',3600),
  (uid,'leg_streak_1000','Mil dias de guerra','Treine 1000 dias seguidos','Preta','Lendaria',3601),
  (uid,'leg_5000','Cinco mil','Acumule 5000 treinos','Preta','Lendaria',3602),
  (uid,'leg_10years','Uma decada no tatame','Treine por 10 anos','Coral','Lendaria',3603),
  (uid,'leg_sub_worldchamp','Mataria o rei','Finalize um campeao mundial','Preta','Lendaria',3604),
  (uid,'leg_worlds_bb','Topo do mundo','Seja campeao mundial faixa preta','Preta','Lendaria',3605),
  (uid,'leg_adcc_medal','Elite do grappling','Medalhe no ADCC','Preta','Lendaria',3606),
  (uid,'leg_undefeated_year','Intocavel','Fique 1 ano invicto em competicao','Preta','Lendaria',3607),
  (uid,'leg_beat_all_belts','Sem distincao','Venca ao menos uma vez cada faixa','Preta','Lendaria',3608),
  (uid,'leg_30subs','Arsenal completo','Aplique 30 finalizacoes diferentes','Preta','Lendaria',3609),
  (uid,'leg_iron90','Ferro puro','Treine 90 dias sem parar','Preta','Lendaria',3610),
  (uid,'leg_double_gold_bb','Duplo ouro','Double gold faixa preta','Preta','Lendaria',3611),
  (uid,'leg_grand_slam','Grand Slam','Venca os 4 majors da IBJJF','Preta','Lendaria',3612),
  (uid,'leg_supergslam','Super Grand Slam','4 majors + ADCC na mesma temporada','Preta','Lendaria',3613),
  (uid,'leg_form_champion','Mestre de campeoes','Forme um campeao','Coral','Lendaria',3614),
  (uid,'leg_mentor10','Legado','Gradue 3 faixas pretas','Coral','Lendaria',3615),
  (uid,'leg_500partners','Rei do tatame','Role com 500 parceiros diferentes','Preta','Lendaria',3616),
  (uid,'leg_no_tap_month','Impassavel','Passe um mes sem bater num rolo','Preta','Lendaria',3617),
  (uid,'leg_win100','Centuriao','100 vitorias em competicao','Preta','Lendaria',3618),
  (uid,'leg_hours5000','Dez mil horas quase la','Acumule 5000 horas de tatame','Preta','Lendaria',3619),
  (uid,'leg_perfect_year','Ano perfeito','Treine toda semana por 1 ano','Preta','Lendaria',3620),
  (uid,'leg_absolute_bb','Rei do absoluto','Venca um absoluto de faixa preta','Preta','Lendaria',3621),
  (uid,'leg_1000subs','Mil finalizacoes','Acumule 1000 finalizacoes','Preta','Lendaria',3622),
  (uid,'leg_100comp','Veterano de guerra','Compita 100 vezes','Preta','Lendaria',3623),
  (uid,'leg_own_gym','Fundador','Abra sua propria academia','Coral','Lendaria',3624)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Bloco final =====
  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'winsub_'||b.slug,'Finalize um faixa '||b.label,'Venca um faixa '||b.label||' por finalizacao',b.tier,'Vitoria',3700+b.o
  FROM (VALUES ('white','branca','Azul',1),('blue','azul','Roxa',2),('purple','roxa','Marrom',3),('brown','marrom','Marrom',4),('black','preta','Preta',5)) b(slug,label,tier,o)
  ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'spar_'||n,n||' rounds de sparring','Acumule '||n||' rounds de sparring',
   CASE WHEN o<=2 THEN 'Azul' WHEN o<=3 THEN 'Roxa' WHEN o<=4 THEN 'Marrom' ELSE 'Preta' END,'Frequencia',3710+o
  FROM unnest(ARRAY[50,100,250,500,1000,2500]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'winsub_count_'||n,'Venca '||n||'x por finalizacao','Venca '||n||' lutas por finalizacao',
   CASE WHEN o=1 THEN 'Roxa' WHEN o<=3 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3720+o
  FROM unnest(ARRAY[1,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'winpts_count_'||n,'Venca '||n||'x por pontos','Venca '||n||' lutas nos pontos',
   CASE WHEN o=1 THEN 'Roxa' WHEN o<=3 THEN 'Marrom' ELSE 'Preta' END,'Competicao',3730+o
  FROM unnest(ARRAY[1,5,10,25]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order)
  SELECT uid,'survivemin_'||n,'Segure '||n||' min com um preta','Role '||n||' minutos com um faixa preta sem ser finalizado',
   CASE WHEN o=1 THEN 'Roxa' WHEN o=2 THEN 'Marrom' ELSE 'Preta' END,'Vitoria',3740+o
  FROM unnest(ARRAY[3,5,10]) WITH ORDINALITY AS t(n,o) ON CONFLICT (user_id,key) DO NOTHING;

  INSERT INTO achievements (user_id,key,title,description,tier,category,sort_order) VALUES
  (uid,'partner_coral','Treine com um faixa coral','Role com um mestre faixa coral','Preta','Parceiro',3750),
  (uid,'partner_red','Treine com um faixa vermelha','Role com um grao-mestre faixa vermelha','Preta','Parceiro',3751),
  (uid,'partner_worldchamp','Treine com um campeao mundial','Divida o tatame com um campeao mundial','Preta','Parceiro',3752),
  (uid,'partner_champion_beat','Encoste num campeao','Pontue ou raspe um campeao mundial num rolo','Preta','Lendaria',3753),
  (uid,'escape_black_back','Fuga impossivel','Escape das costas de um faixa preta','Marrom','Escape',3754),
  (uid,'no_pass_black','Muralha','Nao seja passado por um preta num rolo inteiro','Preta','Vitoria',3755),
  (uid,'leg_back_finish_black','Predador de costas','Pegue as costas de um preta e finalize','Preta','Lendaria',3756),
  (uid,'leg_teach_5years','Semeador','Ensine jiu-jitsu por 5 anos','Coral','Lendaria',3757),
  (uid,'leg_worlds_double','Bicampeao mundial','Venca o Mundial faixa preta duas vezes','Vermelha','Lendaria',3758),
  (uid,'leg_hall_fame','Lenda viva','Entre para a historia do seu time','Vermelha','Lendaria',3759)
  ON CONFLICT (user_id,key) DO NOTHING;

  -- ===== Metas (target) para as barras de progresso =====
  UPDATE achievements SET target=(regexp_match(key,'(\d+)$'))[1]::int
   WHERE user_id=uid AND key ~ '\d+$' AND key NOT LIKE 'grad%' AND target IS NULL;

  RAISE NOTICE 'Conquistas cadastradas: %', (SELECT count(*) FROM achievements WHERE user_id=uid);
END $$;
