/**
 * A sequência de dias — a conta, não a tela.
 *
 * Ela saiu de dentro do painel do jiu-jitsu quando o Início passou a mostrá-la
 * também: duas cópias da mesma regra em duas telas é como a escada de
 * graduação já errou antes neste app.
 *
 * O que prende:
 *   1. dias seguidos contam seguido
 *   2. um buraco no meio para a contagem
 *   3. HOJE não conta como buraco — quem treina à noite e abre o app de manhã
 *      não pode ver a sequência zerada horas antes de treinar de novo
 *   4. mas ONTEM conta: faltou ontem e hoje, acabou
 *   5. dia repetido (dois treinos no mesmo dia) vale um dia só
 *   6. lista vazia é zero, e não NaN
 */
import { sequenciaDeDias } from "../src/lib/sequencia.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const HOJE = "2026-09-10";

/* --- 1. dias seguidos ----------------------------------------------------- */
conferir(
  "três dias seguidos terminando hoje",
  sequenciaDeDias(["2026-09-08", "2026-09-09", "2026-09-10"], HOJE) === 3,
  String(sequenciaDeDias(["2026-09-08", "2026-09-09", "2026-09-10"], HOJE)),
);

/* --- 2. o buraco para ----------------------------------------------------- */
conferir(
  "um dia sem treino no meio para a contagem",
  sequenciaDeDias(["2026-09-06", "2026-09-08", "2026-09-09", "2026-09-10"], HOJE) === 3,
  String(sequenciaDeDias(["2026-09-06", "2026-09-08", "2026-09-09", "2026-09-10"], HOJE)),
);

/* --- 3. hoje não é buraco -------------------------------------------------- */
// Este é o teste que importa: são 8 da manhã, ele treina às 19h, e a sequência
// de 47 semanas não pode aparecer zerada na tela do café da manhã.
conferir(
  "sem treino HOJE, a contagem começa em ontem e não zera",
  sequenciaDeDias(["2026-09-08", "2026-09-09"], HOJE) === 2,
  String(sequenciaDeDias(["2026-09-08", "2026-09-09"], HOJE)),
);

/* --- 4. ontem é buraco ----------------------------------------------------- */
conferir(
  "faltou hoje E ontem: acabou",
  sequenciaDeDias(["2026-09-07", "2026-09-08"], HOJE) === 0,
  String(sequenciaDeDias(["2026-09-07", "2026-09-08"], HOJE)),
);

/* --- 5. dois treinos no mesmo dia ------------------------------------------ */
conferir(
  "dois treinos no mesmo dia valem um dia",
  sequenciaDeDias(["2026-09-10", "2026-09-10", "2026-09-09"], HOJE) === 2,
  String(sequenciaDeDias(["2026-09-10", "2026-09-10", "2026-09-09"], HOJE)),
);

/* --- 6. vazio -------------------------------------------------------------- */
conferir("lista vazia é zero", sequenciaDeDias([], HOJE) === 0);
conferir(
  "só um treino, hoje",
  sequenciaDeDias([HOJE], HOJE) === 1,
  String(sequenciaDeDias([HOJE], HOJE)),
);

/* --- atravessa o mês e o ano ----------------------------------------------- */
conferir(
  "a contagem atravessa a virada do mês",
  sequenciaDeDias(["2026-08-31", "2026-09-01"], "2026-09-01") === 2,
);
conferir(
  "a contagem atravessa a virada do ano",
  sequenciaDeDias(["2025-12-31", "2026-01-01"], "2026-01-01") === 2,
);

console.log(`${ok.length} conferências passaram`);
if (falhas.length) {
  console.error(`\n${falhas.length} falharam:`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
