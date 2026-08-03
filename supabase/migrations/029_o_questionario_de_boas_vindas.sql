-- ============================================================================
-- 029 — O questionário de boas-vindas passa a existir de verdade
-- ============================================================================
-- `profiles.questionario_em` foi criada na migração 004 e nunca recebeu um
-- único valor. O motivo não era desinteresse de quem usa: NÃO HAVIA TELA. A
-- coluna esperava um formulário que nunca foi escrito, e nenhuma linha do app
-- lia ou gravava nela.
--
-- Isso não era detalhe cosmético. Duas das peças mais caras do produto
-- dependem de saber quem é a pessoa antes do primeiro treino:
--
--   · o hexágono pesa cada rola pela faixa de quem estava na frente — sem
--     saber a SUA faixa, o cálculo não tem referência;
--   · o plano do mês escolhe conteúdo por faixa E grau (`nivel_do_usuario`),
--     e quem não diz a faixa cai no padrão 'Branca' 0 grau.
--
-- O app só tinha como perguntar isso na tela de Perfil, que é onde ninguém vai
-- no primeiro minuto.
--
-- O que esta migração acrescenta é UMA coluna. A frequência semanal é a única
-- resposta do questionário que ainda não tinha onde morar — faixa, graus e
-- data de início já têm coluna desde o começo.
--
-- Por que coluna e não `perfil_jogo` (jsonb, hoje vazia): a frequência é usada
-- para calibrar meta e ritmo de plano, ou seja, entra em consulta e em
-- comparação. Campo que se consulta merece tipo e restrição; jsonb aqui só
-- adiaria a validação para o momento da leitura.
-- ============================================================================

alter table public.profiles
  add column if not exists treinos_por_semana smallint;

-- 1 a 14: menos que 1 não é frequência, e 14 é duas vezes por dia todo dia —
-- acima disso é dedo errado, não rotina. NULL continua valendo: é quem ainda
-- não respondeu, e o app precisa distinguir "não sei" de "treino uma vez".
alter table public.profiles
  drop constraint if exists profiles_treinos_por_semana_faixa;
alter table public.profiles
  add constraint profiles_treinos_por_semana_faixa
  check (treinos_por_semana is null
         or (treinos_por_semana between 1 and 14));

comment on column public.profiles.treinos_por_semana is
  'Quantas vezes por semana a pessoa pretende treinar. Vem do questionário de boas-vindas. NULL = ainda não respondeu.';

comment on column public.profiles.questionario_em is
  'Quando a pessoa terminou o questionário de boas-vindas. NULL = ainda não respondeu, e o app manda para /boas-vindas.';

-- Nenhuma política nova: `profiles` já tem RLS, e as políticas existentes são
-- por `user_id = auth.uid()`. Uma coluna nova entra sob a mesma regra da linha
-- que a contém — quem pode gravar o próprio perfil pode gravar isto.
