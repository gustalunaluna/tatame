-- ============================================================================
-- 044 — O dia parado ganha lugar próprio (e o banco passa a exigir coerência)
-- ============================================================================
-- A 043 ensinou a função das conquistas a não contar dia parado como treino.
-- Ela consertou a CONTA. Esta aqui conserta a ORIGEM: o app não tinha como
-- registrar "hoje não treinei", então a única saída era forjar um treino de
-- zero minuto com o tipo escrito na mão. Foi assim que nasceram as três linhas
-- de "Doença" — e é assim que nasceria a próxima confusão.
--
-- Agora `trainings` guarda os dois fatos do mesmo calendário, com uma regra
-- que o banco cobra:
--
--     tipo Gi/No-Gi  →  houve tatame  →  duration_min > 0
--     tipo motivo    →  não houve     →  duration_min = 0 e rolls = 0
--
-- Sem a restrição, as duas metades da regra podiam discordar, e a tela e a
-- função do banco passariam a responder coisas diferentes para "isto foi
-- treino?" — cada uma cortando por um critério. Com ela, não há como.
--
-- ----------------------------------------------------------------------------
-- A LINHA DE 09/09 QUE INFLAVA AS HORAS
-- ----------------------------------------------------------------------------
-- No dia 09/09 existem duas linhas: uma de doença (0 min) e uma de "Gi, 60
-- minutos, 0 rolas" cuja nota diz, com todas as letras, "apenas fiquei de fora
-- olhando as técnicas enquanto me recupero".
--
-- Isso é presença, não é tatame — e era exatamente a hora a mais que sobrava
-- na conta (165 contra 164). Ela vira o que sempre foi: dia parado, motivo
-- "Assisti a aula". A nota original fica intacta; quem escreveu explicou o que
-- aconteceu, e o registro continua dizendo a mesma coisa. O que muda é o app
-- parar de chamar aquilo de uma hora de treino.
update public.trainings
   set type = 'Assisti a aula',
       duration_min = 0,
       rolls = 0,
       updated_at = now()
 where type in ('Gi', 'No-Gi')
   and duration_min > 0
   and rolls = 0
   and notes ilike '%fiquei de fora olhando%';

-- ----------------------------------------------------------------------------
-- A REGRA, COBRADA PELO BANCO
-- ----------------------------------------------------------------------------
-- `not valid` não entra aqui de propósito: quero que a restrição valha também
-- para o que já está gravado. Se alguma linha antiga a violasse, esta migração
-- falharia — e falhar aqui é melhor do que passar e deixar uma mentira no meio
-- do histórico. (Conferido antes de aplicar: nenhuma Gi/No-Gi com zero minuto.)
alter table public.trainings
  drop constraint if exists trainings_dia_parado_e_dia_parado;

alter table public.trainings
  add constraint trainings_dia_parado_e_dia_parado check (
    (type in ('Gi', 'No-Gi') and duration_min > 0)
    or (
      type in ('Doença', 'Lesão', 'Descanso', 'Viagem', 'Assisti a aula', 'Outro')
      and duration_min = 0
      and rolls = 0
    )
  );

comment on constraint trainings_dia_parado_e_dia_parado on public.trainings is
  'Treino tem minuto; dia parado tem motivo e zero. A tela e recalcular_conquistas cortam pelo mesmo critério por causa desta linha.';
