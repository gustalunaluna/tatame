/**
 * A comparação entre dois meses — os números, não a tela.
 *
 * O que este teste prende, e por que cada coisa importa:
 *
 *   1. o mês é FECHADO: rola de fora da janela não entra, nem por um dia
 *   2. dentro do mês NÃO HÁ DECAIMENTO — dia 1 pesa igual a dia 31
 *   3. por isso dois meses são comparáveis: o mais recente não ganha nota
 *      só por ser mais recente
 *   4. `mesesComRola` só oferece mês que tem o que desenhar
 *   5. `limitesDoMes` acerta o último dia, inclusive em fevereiro bissexto
 *
 * O item 2 é o coração. O hexágono do painel decai de propósito (meia-vida de
 * quatro semanas), porque responde "como está meu jogo hoje". Se esse mesmo
 * decaimento valesse aqui dentro, "julho" viraria "o fim de julho" — e a
 * comparação entre meses mediria o calendário, não o jiu-jitsu.
 */
import {
  derivarHexagono,
  derivarHexagonoDoPeriodo,
  limitesDoMes,
  mesesComRola,
} from "../src/lib/hexagono-derivado.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const rola = (o = {}) => ({
  data: "2026-07-15",
  parceiroFaixa: "Azul",
  rolas: 1,
  finAFavor: 0,
  finSofridas: 0,
  passAFavor: 0,
  passSofridas: 0,
  raspAFavor: 0,
  raspSofridas: 0,
  confirmado: true,
  detalhado: true,
  ritmoCaiuNa: null,
  ritmoRespondido: false,
  rolasDaSessao: 5,
  ...o,
});

const EU = { faixa: "Branca", idade: 26 };

/* --- 1. o mês é fechado --------------------------------------------------- */
// Doze finalizações em junho e nenhuma em julho. Se julho enxergar junho, a
// nota de finalização sobe — e a comparação inteira perde o sentido.
const junhoForte = Array.from({ length: 12 }, () =>
  rola({ data: "2026-06-20", finAFavor: 2 }),
);
const julhoVazio = Array.from({ length: 12 }, () => rola({ data: "2026-07-10" }));
const todos = [...junhoForte, ...julhoVazio];

const julho = derivarHexagonoDoPeriodo(todos, EU, "2026-07-01", "2026-07-31");
const junho = derivarHexagonoDoPeriodo(todos, EU, "2026-06-01", "2026-06-30");

conferir(
  "junho vê as finalizações de junho",
  junho.finalizacao.nota > 2.5,
  `nota ${junho.finalizacao.nota}`,
);
conferir(
  "julho NÃO vê as finalizações de junho",
  julho.finalizacao.nota < 2.5,
  `nota ${julho.finalizacao.nota}`,
);

// O último e o primeiro dia contam — o erro clássico de `<` no lugar de `<=`.
const naBorda = derivarHexagonoDoPeriodo(
  [rola({ data: "2026-07-01", finAFavor: 3 }), rola({ data: "2026-07-31", finAFavor: 3 })],
  EU,
  "2026-07-01",
  "2026-07-31",
);
conferir(
  "dia 1 e dia 31 estão dentro do mês",
  naBorda.finalizacao.amostra === 2,
  `amostra ${naBorda.finalizacao.amostra}`,
);

/* --- 2. sem decaimento dentro do mês -------------------------------------- */
// A MESMA rola, uma no começo e outra no fim do mês. Com decaimento, a do fim
// pesaria mais e as duas notas sairiam diferentes.
const cedo = derivarHexagonoDoPeriodo(
  Array.from({ length: 8 }, () => rola({ data: "2026-07-02", finAFavor: 2 })),
  EU,
  "2026-07-01",
  "2026-07-31",
);
const tarde = derivarHexagonoDoPeriodo(
  Array.from({ length: 8 }, () => rola({ data: "2026-07-30", finAFavor: 2 })),
  EU,
  "2026-07-01",
  "2026-07-31",
);
conferir(
  "começo e fim do mês pesam igual",
  cedo.finalizacao.nota === tarde.finalizacao.nota,
  `${cedo.finalizacao.nota} vs ${tarde.finalizacao.nota}`,
);

/* --- 3. e é isso que torna dois meses comparáveis ------------------------- */
// Desempenho idêntico em dois meses seguidos tem de dar nota idêntica. É o que
// o hexágono rolante NÃO faz — e a diferença entre os dois está conferida
// logo abaixo, para que ninguém "simplifique" um no outro depois.
const igualEmJulho = Array.from({ length: 8 }, () =>
  rola({ data: "2026-07-10", finAFavor: 2 }),
);
const igualEmAgosto = Array.from({ length: 8 }, () =>
  rola({ data: "2026-08-10", finAFavor: 2 }),
);
const ambos = [...igualEmJulho, ...igualEmAgosto];

const pJul = derivarHexagonoDoPeriodo(ambos, EU, "2026-07-01", "2026-07-31");
const pAgo = derivarHexagonoDoPeriodo(ambos, EU, "2026-08-01", "2026-08-31");
conferir(
  "mesmo desempenho em meses diferentes dá a mesma nota",
  pJul.finalizacao.nota === pAgo.finalizacao.nota,
  `jul ${pJul.finalizacao.nota} vs ago ${pAgo.finalizacao.nota}`,
);

// E a prova de que o modo rolante realmente daria outra coisa — o motivo de
// esta função existir separada em vez de reaproveitar a de cima.
const rolante = derivarHexagono(ambos, EU, new Date("2026-08-20T12:00:00"));
const soAgosto = derivarHexagono(igualEmAgosto, EU, new Date("2026-08-20T12:00:00"));
conferir(
  "o modo rolante mistura os meses (por isso a comparação usa o fechado)",
  rolante.finalizacao.amostra > soAgosto.finalizacao.amostra,
  `rolante ${rolante.finalizacao.amostra} vs só-agosto ${soAgosto.finalizacao.amostra}`,
);

/* --- 4. o seletor só oferece mês que desenha ------------------------------ */
const comNaoDetalhada = [
  rola({ data: "2026-05-10", detalhado: false }),
  rola({ data: "2026-06-10" }),
  rola({ data: "2026-07-10" }),
  rola({ data: "2026-07-20" }),
];
const lista = mesesComRola(comNaoDetalhada);
conferir(
  "mês sem contador preenchido fica fora da lista",
  !lista.includes("2026-05"),
  lista.join(", "),
);
conferir("mês repetido aparece uma vez só", lista.length === 2, lista.join(", "));
conferir(
  "a lista vem do mais novo para o mais velho",
  lista[0] === "2026-07" && lista[1] === "2026-06",
  lista.join(", "),
);

/* --- 5. o último dia do mês ---------------------------------------------- */
conferir("julho termina em 31", limitesDoMes("2026-07").ate === "2026-07-31");
conferir("junho termina em 30", limitesDoMes("2026-06").ate === "2026-06-30");
conferir(
  "fevereiro de ano bissexto termina em 29",
  limitesDoMes("2024-02").ate === "2024-02-29",
  limitesDoMes("2024-02").ate,
);
conferir(
  "fevereiro comum termina em 28",
  limitesDoMes("2026-02").ate === "2026-02-28",
  limitesDoMes("2026-02").ate,
);
conferir("o mês começa no dia 1", limitesDoMes("2026-12").de === "2026-12-01");

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
