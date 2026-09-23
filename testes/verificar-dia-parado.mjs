/**
 * O dia parado — a regra, não a tela.
 *
 * O que este arquivo prende é a única frase que o recurso inteiro promete:
 *
 *     dia parado não soma treino, não soma hora, e não quebra a sequência.
 *
 * Cada uma das três metades já esteve errada neste app ao mesmo tempo, e o
 * erro era do tipo que ninguém vê: o contador simplesmente ficava maior que a
 * verdade. Por isso a conta sai da tela e vem para cá, onde falha em 0,1s.
 *
 *   1. o que é treino e o que não é
 *   2. contagem e horas ignoram o dia parado
 *   3. a sequência ATRAVESSA o dia parado sem somá-lo
 *   4. sumir sem registrar continua quebrando — é essa diferença que faz o
 *      registro valer a pena
 *   5. doença de manhã + treino à noite no mesmo dia: é dia de treino
 */
import {
  contarTreinos,
  diasDePonte,
  diasTreinados,
  ehDiaParado,
  ehTreino,
  minutosDeTatame,
  somenteTreinos,
} from "../src/lib/dia-parado.ts";
import { sequenciaDeDias } from "../src/lib/sequencia.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const treino = (date, durationMin = 60, type = "Gi") => ({ date, type, durationMin });
const parado = (date, type = "Doença") => ({ date, type, durationMin: 0 });

/* --- 1. o que é treino ---------------------------------------------------- */
conferir("Gi com 60 min é treino", ehTreino(treino("2026-09-10")));
conferir("No-Gi com 60 min é treino", ehTreino(treino("2026-09-10", 60, "No-Gi")));
conferir("doença é dia parado", ehDiaParado(parado("2026-09-07")));
conferir("lesão é dia parado", ehDiaParado(parado("2026-09-07", "Lesão")));
conferir(
  "aula assistida é dia parado, não treino",
  ehDiaParado(parado("2026-09-09", "Assisti a aula")),
);
// O caso que inflava as horas: a linha era 'Gi' e tinha 60 minutos, mas a
// pessoa ficou de fora olhando. Com o motivo certo, ela deixa de ser tatame.
conferir(
  "Gi com zero minuto não é treino (linha forjada do jeito antigo)",
  ehDiaParado(treino("2026-09-07", 0)),
);

/* --- 2. contagem e horas -------------------------------------------------- */
const semana = [
  treino("2026-09-10", 90),
  parado("2026-09-09", "Assisti a aula"),
  parado("2026-09-08"),
  parado("2026-09-07"),
  treino("2026-09-06", 60),
];
conferir("conta dois treinos, não cinco", contarTreinos(semana) === 2, String(contarTreinos(semana)));
conferir("soma 150 minutos, não 150 mais zero vezes três", minutosDeTatame(semana) === 150, String(minutosDeTatame(semana)));
conferir("somenteTreinos devolve dois", somenteTreinos(semana).length === 2);
conferir(
  "os dias de ponte são os três parados",
  diasDePonte(semana).sort().join(",") === "2026-09-07,2026-09-08,2026-09-09",
  diasDePonte(semana).sort().join(","),
);

/* --- 3. a sequência atravessa --------------------------------------------- */
// Treinou 6, parou 7, 8 e 9 (registrado), treinou 10. São DOIS dias de treino
// em cinco de calendário — e a corrente continua de pé.
conferir(
  "a sequência atravessa três dias parados",
  sequenciaDeDias(diasTreinados(semana), "2026-09-10", diasDePonte(semana)) === 2,
  String(sequenciaDeDias(diasTreinados(semana), "2026-09-10", diasDePonte(semana))),
);
conferir(
  "e o dia parado NÃO vira um dia de treino a mais",
  sequenciaDeDias(diasTreinados(semana), "2026-09-10", diasDePonte(semana)) !== 5,
);

/* --- 4. sumir continua quebrando ------------------------------------------ */
const sumiu = [treino("2026-09-10"), treino("2026-09-06")];
conferir(
  "buraco sem registro quebra a sequência",
  sequenciaDeDias(diasTreinados(sumiu), "2026-09-10", diasDePonte(sumiu)) === 1,
  String(sequenciaDeDias(diasTreinados(sumiu), "2026-09-10", diasDePonte(sumiu))),
);
conferir(
  "ponte em dia nenhum não muda nada",
  sequenciaDeDias(["2026-09-09", "2026-09-10"], "2026-09-10", []) === 2,
);
// Hoje parado, ontem treinado: a corrente de ontem continua visível.
conferir(
  "hoje parado não apaga a sequência de ontem",
  sequenciaDeDias(["2026-09-09"], "2026-09-10", ["2026-09-10"]) === 1,
);

/* --- 5. o mesmo dia com as duas coisas ------------------------------------ */
// Registrou doença de manhã e acabou treinando à noite. O dia é de treino, e
// não pode entrar como ponte também — senão a mesma data estaria nas duas
// listas e a conta acertaria por acaso.
const virouATarde = [parado("2026-09-10"), treino("2026-09-10", 60)];
conferir(
  "doença de manhã + treino à noite conta como dia de treino",
  diasTreinados(virouATarde).join(",") === "2026-09-10",
);
conferir(
  "e esse dia não entra como ponte",
  diasDePonte(virouATarde).length === 0,
  diasDePonte(virouATarde).join(","),
);
conferir(
  "a sequência conta ele uma vez só",
  sequenciaDeDias(diasTreinados(virouATarde), "2026-09-10", diasDePonte(virouATarde)) === 1,
);

console.log(`${ok.length} conferências passaram`);
if (falhas.length) {
  console.error(`\n${falhas.length} falharam:`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
