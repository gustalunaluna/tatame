/**
 * Os prazos mínimos da IBJJF — os números, não a tela.
 *
 * Roda sem navegador: é aritmética de calendário e uma tabela de regras, e
 * subir Chromium para conferir isso seria gastar dez segundos por nada.
 *
 * O que prende:
 *   1. a escada bate com a regra da federação, degrau a degrau
 *   2. faixa-branca NÃO tem prazo — tem idade. É o erro mais comum em app de
 *      jiu-jitsu: mostrar "faltam 8 meses para a azul" inventa uma regra
 *   3. os degraus da preta não são todos iguais: 3 anos nos três primeiros,
 *      5 nos três seguintes
 *   4. as somas fecham: 31 anos de preta para o 7º grau, 38 para o 8º,
 *      48 para o 9º
 *   5. meses contados por calendário, não por dias/30
 */
import {
  ESCADA_IBJJF,
  proximoDegrau,
  previsao,
  mesesEntre,
  emPortugues,
} from "../src/lib/tempos-ibjjf.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const dia = (s) => new Date(`${s}T00:00:00`);
const acha = (faixa, grau) =>
  ESCADA_IBJJF.find((d) => d.faixa === faixa && d.grau === grau);

/* --- 1 e 2. a escada, e a branca sem prazo -------------------------------- */
conferir(
  "a branca não tem tempo mínimo — tem idade",
  acha("Azul", 0)?.mesesMinimos === null && acha("Azul", 0)?.idadeMinima === 16,
  JSON.stringify(acha("Azul", 0)),
);
conferir("2 anos de azul para a roxa", acha("Roxa", 0)?.mesesMinimos === 24);
conferir("18 meses de roxa para a marrom", acha("Marrom", 0)?.mesesMinimos === 18);
conferir("1 ano de marrom para a preta", acha("Preta", 0)?.mesesMinimos === 12);
conferir("e 19 anos de idade para a preta", acha("Preta", 0)?.idadeMinima === 19);

/* --- 3. os degraus da preta não são iguais -------------------------------- */
conferir(
  "3 anos em cada um dos três primeiros graus",
  [1, 2, 3].every((g) => acha("Preta", g)?.mesesMinimos === 36),
  [1, 2, 3].map((g) => acha("Preta", g)?.mesesMinimos).join(", "),
);
conferir(
  "5 anos em cada um dos três seguintes",
  [4, 5, 6].every((g) => acha("Preta", g)?.mesesMinimos === 60),
  [4, 5, 6].map((g) => acha("Preta", g)?.mesesMinimos).join(", "),
);

/* --- 4. as somas fecham --------------------------------------------------- */
const ateOGrau = (alvo) => {
  let total = 0;
  for (const d of ESCADA_IBJJF) {
    // Conta a partir do dia em que a preta foi recebida: o degrau "Preta 0"
    // é a entrada, e não faz parte do tempo DE faixa-preta.
    if (d.faixa === "Preta" && d.grau === 0) {
      total = 0;
      continue;
    }
    if (["Preta", "Coral", "Vermelha"].includes(d.faixa)) {
      total += d.mesesMinimos ?? 0;
      if (d.grau === alvo) return total / 12;
    }
  }
  return null;
};
conferir("9 anos de preta até o 3º grau", ateOGrau(3) === 9, String(ateOGrau(3)));
conferir("24 anos até o 6º grau", ateOGrau(6) === 24, String(ateOGrau(6)));
conferir("31 anos para o 7º — a coral", ateOGrau(7) === 31, String(ateOGrau(7)));
conferir("38 anos para o 8º", ateOGrau(8) === 38, String(ateOGrau(8)));
conferir("48 anos para o 9º — a vermelha", ateOGrau(9) === 48, String(ateOGrau(9)));
conferir(
  "o 10º grau não se conquista por tempo",
  acha("Vermelha", 10)?.mesesMinimos === null &&
    /Gracie/.test(acha("Vermelha", 10)?.regra ?? ""),
  acha("Vermelha", 10)?.regra,
);
conferir(
  "e 50 anos de idade para a coral",
  acha("Coral", 7)?.idadeMinima === 50,
  String(acha("Coral", 7)?.idadeMinima),
);

/* --- a escada segue na ordem certa ---------------------------------------- */
conferir(
  "depois da preta 6º grau vem a coral, não uma faixa nova",
  proximoDegrau("Preta", 6)?.faixa === "Coral" &&
    proximoDegrau("Preta", 6)?.grau === 7,
);
conferir(
  "e depois da coral 8º vem a vermelha 9º",
  proximoDegrau("Coral", 8)?.faixa === "Vermelha" &&
    proximoDegrau("Coral", 8)?.grau === 9,
);
conferir("no topo da escada não há próximo", proximoDegrau("Vermelha", 10) === null);

/* --- 5. a conta de meses -------------------------------------------------- */
conferir(
  "24 meses cheios entre as mesmas datas de dois anos",
  mesesEntre(dia("2024-03-10"), dia("2026-03-10")) === 24,
);
conferir(
  "o dia que ainda não chegou não conta",
  mesesEntre(dia("2024-03-10"), dia("2026-03-09")) === 23,
);
conferir(
  "fevereiro não adianta a conta — dias/30 daria 24 aqui",
  mesesEntre(dia("2024-02-29"), dia("2026-02-28")) === 23,
  String(mesesEntre(dia("2024-02-29"), dia("2026-02-28"))),
);

/* --- a previsão ----------------------------------------------------------- */
const semPrazo = previsao("Branca", 3, "2025-09-02", dia("2026-08-02"));
conferir(
  "faixa-branca não recebe contagem regressiva",
  semPrazo?.mesesFaltando === null && semPrazo?.liberado === true,
  JSON.stringify(semPrazo),
);

const semData = previsao("Azul", 0, null, dia("2026-08-02"));
conferir(
  "sem a data da graduação, o app não inventa número",
  semData?.mesesFaltando === null && semData?.liberado === false,
  JSON.stringify(semData),
);

const azul = previsao("Azul", 0, "2025-08-02", dia("2026-08-02"));
conferir(
  "um ano de azul: 12 meses feitos, 12 faltando",
  azul?.mesesFeitos === 12 && azul?.mesesFaltando === 12,
  JSON.stringify(azul),
);
conferir("e a barra está na metade", Math.abs((azul?.fracao ?? 0) - 0.5) < 0.001);

const cumprida = previsao("Roxa", 0, "2024-01-02", dia("2026-08-02"));
conferir(
  "18 meses de roxa cumpridos liberam o mínimo",
  cumprida?.liberado === true && cumprida?.mesesFaltando === 0,
  JSON.stringify(cumprida),
);

/* --- o texto -------------------------------------------------------------- */
conferir("1 mês no singular", emPortugues(1) === "1 mês");
conferir("18 meses não vira ano e meio", emPortugues(18) === "18 meses");
conferir("24 vira 2 anos", emPortugues(24) === "2 anos");
conferir("27 vira 2 anos e 3 meses", emPortugues(27) === "2 anos e 3 meses", emPortugues(27));

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
