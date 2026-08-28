/**
 * A QUALIDADE das perguntas — não o gerador, as perguntas em si.
 *
 * Roda sem navegador: é leitura de texto.
 *
 * Existe porque o exame já saiu ruim uma vez, e saiu ruim de um jeito que
 * nenhum teste de então pegava: todos passavam. Havia cinco moldes genéricos
 * carimbados em 78 itens, e o enunciado repetia o nome inteiro do item que a
 * tela já imprimia logo acima. Determinismo, cobertura e contagem estavam
 * todos certos; o exame é que era imprestável.
 *
 * O que prende, então, é o que faz uma pergunta ser de mestre e não de
 * formulário:
 *
 *   1. TODO item do syllabus tem pergunta escrita — nenhum caindo na rede de
 *      segurança do gerador
 *   2. Pelo menos DUAS por item, senão "cada geração varia as perguntas" é
 *      propaganda enganosa
 *   3. O enunciado NÃO repete o nome do item. Esse era o defeito visível
 *   4. Toda pergunta termina em "?" — é pergunta, não comando de formulário
 *   5. Nenhuma abre com os moldes velhos ("Descreva X:", "Em que situação...")
 *   6. Nenhuma pergunta idêntica em dois itens diferentes: se a mesma frase
 *      serve para o osoto gari e para o ushiro ukemi, ela não é sobre
 *      nenhum dos dois
 */
import { gerarExame, escoposDaFaixa, ESCOPO_FAIXA } from "../src/lib/exame-de-faixa.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

/**
 * Todas as perguntas que o app consegue produzir para uma faixa, item a item.
 *
 * Varre muitas sementes porque o sorteio escolhe UMA pergunta por item por
 * geração: um item com duas perguntas escritas só mostra as duas depois de
 * várias gerações. 120 sementes é folga larga para um sorteio entre 2 ou 3.
 */
function bancoDe(faixa, escopo) {
  const por = new Map();
  for (let semente = 1; semente <= 120; semente += 1) {
    for (const p of gerarExame(faixa, semente, escopo) ?? []) {
      if (!por.has(p.item)) por.set(p.item, new Set());
      por.get(p.item).add(p.pergunta);
    }
  }
  return por;
}

/** Só a parte legível do item: "01 — Mão de vaca" → "mão de vaca". */
const nomeLimpo = (item) =>
  item
    .replace(/^\d{2}\s+—\s+/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .toLowerCase();

const ABERTURAS_DE_FORMULARIO = [
  /^descreva /i,
  /^em que situação/i,
  /^o que é a /i,
  /^explique /i,
];

for (const [faixa, escopo] of [
  ["Azul", ESCOPO_FAIXA],
  ["Roxa", "1º e 2º grau"],
  ["Roxa", "3º e 4º grau"],
  ["Roxa", ESCOPO_FAIXA],
]) {
  const banco = bancoDe(faixa, escopo);
  const rotulo = `${faixa}/${escopo}`;

  /* --- 1 e 2. toda pergunta escrita, pelo menos duas por item --------- */
  const semPergunta = [...banco].filter(([, qs]) => qs.size === 0);
  conferir(`${rotulo}: nenhum item sem pergunta`, semPergunta.length === 0);

  const comUmaSo = [...banco].filter(([, qs]) => qs.size < 2);
  conferir(
    `${rotulo}: todo item tem pelo menos 2 perguntas`,
    comUmaSo.length === 0,
    JSON.stringify(comUmaSo.map(([item]) => item)),
  );

  const naRede = [...banco].filter(([, qs]) =>
    [...qs].some((q) => q.startsWith("Explique ")),
  );
  conferir(
    `${rotulo}: nenhum item caiu na rede de segurança do gerador`,
    naRede.length === 0,
    JSON.stringify(naRede.map(([item]) => item)),
  );

  /* --- 3. o enunciado não repete o nome do item ----------------------- */
  const repetindo = [];
  for (const [item, qs] of banco) {
    // Comparações citam os dois nomes por necessidade — a pergunta É sobre a
    // relação entre eles. A regra vale para item simples.
    if (item.includes(" × ")) continue;
    const nome = nomeLimpo(item);
    for (const q of qs) {
      if (nome.length > 8 && q.toLowerCase().includes(nome)) repetindo.push(`${item}: ${q}`);
    }
  }
  conferir(
    `${rotulo}: o enunciado não repete o nome do item`,
    repetindo.length === 0,
    JSON.stringify(repetindo.slice(0, 3)),
  );

  /* --- 4 e 5. é pergunta, e não é molde ------------------------------- */
  const semInterrogacao = [];
  const deFormulario = [];
  for (const [item, qs] of banco) {
    for (const q of qs) {
      if (!q.trim().endsWith("?")) semInterrogacao.push(`${item}: ${q}`);
      if (ABERTURAS_DE_FORMULARIO.some((re) => re.test(q))) deFormulario.push(`${item}: ${q}`);
    }
  }
  conferir(
    `${rotulo}: toda pergunta termina em "?"`,
    semInterrogacao.length === 0,
    JSON.stringify(semInterrogacao.slice(0, 3)),
  );
  conferir(
    `${rotulo}: nenhuma pergunta usa os moldes velhos`,
    deFormulario.length === 0,
    JSON.stringify(deFormulario.slice(0, 3)),
  );

  /* --- 6. nenhuma frase serve para dois itens ------------------------- */
  const donos = new Map();
  for (const [item, qs] of banco) {
    for (const q of qs) {
      if (!donos.has(q)) donos.set(q, new Set());
      donos.get(q).add(item);
    }
  }
  const compartilhadas = [...donos].filter(([, itens]) => itens.size > 1);
  conferir(
    `${rotulo}: nenhuma pergunta se repete entre itens diferentes`,
    compartilhadas.length === 0,
    JSON.stringify(compartilhadas.slice(0, 2).map(([q]) => q)),
  );
}

/* --- a variação continua existindo --------------------------------------- */
for (const faixa of ["Azul", "Roxa"]) {
  const escopo = escoposDaFaixa(faixa)[0];
  const texto = (semente) =>
    gerarExame(faixa, semente, escopo)
      .map((p) => p.pergunta)
      .join("|");
  conferir(
    `${faixa}: sementes diferentes ainda mudam as perguntas`,
    texto(1) !== texto(2),
  );
}

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
