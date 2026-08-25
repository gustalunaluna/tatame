/**
 * O cartel — a conta, não a tela.
 *
 * Roda sem navegador: `resumirCartel` é aritmética sobre uma lista, e subir
 * Chromium para somar vitórias seria gastar dez segundos por nada.
 *
 * O que prende:
 *   1. luta NÃO oficial fica fora do cartel. Superluta e treino registrados
 *      servem para análise, mas cartel é competição — se isso vazar, o número
 *      do perfil vira ficção
 *   2. empate existe e não é contado como derrota. Foi a razão de o cartel
 *      deixar de ser dois inteiros
 *   3. o formato só mostra o E quando houve empate: "1V-1D" e não "1V-1D-0E"
 *   4. finalização a favor e sofrida são contadas separadamente — é a
 *      informação que o contador antigo não dava, e é ela que responde "como
 *      eu ganho" e "como eu perco"
 *   5. vitória por pontos não conta como vitória por finalização
 */
import { resumirCartel, cartelEmTexto } from "../src/lib/cartel.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

/** Uma luta com o mínimo preenchido; o teste sobrescreve o que importa. */
const luta = (p) => ({
  id: Math.random().toString(36).slice(2),
  data: "2026-08-22",
  evento: "FJU Challenger",
  oficial: true,
  oponente: "",
  oponenteFaixa: "Branca",
  categoria: "",
  resultado: "vitoria",
  metodo: "finalizacao",
  golpe: "Armlock",
  tempoSeg: null,
  notas: "",
  ...p,
});

/* --- 1. o que não é oficial não entra ------------------------------------- */
const comTreino = resumirCartel([
  luta({ resultado: "vitoria" }),
  luta({ resultado: "vitoria", oficial: false }),
  luta({ resultado: "derrota", oficial: false }),
]);
conferir(
  "luta não oficial fica fora do cartel",
  comTreino.vitorias === 1 && comTreino.derrotas === 0 && comTreino.total === 1,
  JSON.stringify(comTreino),
);

/* --- 2 e 3. o empate ------------------------------------------------------ */
const comEmpate = resumirCartel([
  luta({ resultado: "vitoria" }),
  luta({ resultado: "derrota" }),
  luta({ resultado: "empate", metodo: "interrompida", golpe: "" }),
]);
conferir(
  "empate não vira derrota",
  comEmpate.derrotas === 1 && comEmpate.empates === 1,
  JSON.stringify(comEmpate),
);
conferir(
  "com empate, o texto mostra o E",
  cartelEmTexto(comEmpate) === "1V-1D-1E",
  cartelEmTexto(comEmpate),
);
conferir(
  "sem empate, o texto não mostra 0E",
  cartelEmTexto(resumirCartel([luta({}), luta({ resultado: "derrota" })])) ===
    "1V-1D",
);

/* --- 4 e 5. o método ------------------------------------------------------ */
const estreia = resumirCartel([
  luta({ resultado: "vitoria", metodo: "finalizacao", golpe: "Armlock" }),
  luta({ resultado: "derrota", metodo: "finalizacao", golpe: "Arco e flecha" }),
  luta({ resultado: "vitoria", metodo: "pontos", golpe: "" }),
]);
conferir(
  "finalização a favor e sofrida são contadas em separado",
  estreia.porFinalizacao === 1 && estreia.finalizacoesSofridas === 1,
  JSON.stringify(estreia),
);
conferir(
  "vitória por pontos não conta como finalização",
  estreia.vitorias === 2 && estreia.porFinalizacao === 1,
  JSON.stringify(estreia),
);

/* --- o vazio -------------------------------------------------------------- */
const vazio = resumirCartel([]);
conferir(
  "cartel vazio é 0V-0D e não quebra",
  vazio.total === 0 && cartelEmTexto(vazio) === "0V-0D",
  cartelEmTexto(vazio),
);

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
