/**
 * Os exames de transição — Branca → Azul e Azul → Roxa. A conta, não a tela.
 *
 * Roda sem navegador: é aritmética determinística sobre listas fixas.
 *
 * As duas folhas têm a MESMA estrutura, e por isso as conferências abaixo
 * rodam para as duas faixas. Foi a diferença de tratamento que escondeu o
 * primeiro erro grave desta feature: a azul entrava por um ramo só dela no
 * gerador, e nunca chegou a ter as 36 posições da própria folha — o app
 * cobrava dela só os fundamentos. Nenhum teste pegava, porque nenhum teste
 * exigia da azul o que exigia da roxa.
 *
 * O que prende:
 *
 *   1. ESCOPO. "O exame de 1º e 2º grau será exigido o conhecimento das
 *      posições de 01 a 18, para o 3º e 4º graus o conhecimento das posições
 *      de 19 a 36." Um exame de grau que vaze uma posição do outro bloco está
 *      cobrando matéria que a folha não cobra — e ninguém repara, porque a
 *      pergunta parece legítima. Aqui isso falha o teste.
 *   2. NOTA DE CORTE. Ela NÃO é a mesma: 60% na azul, 70% na roxa. São
 *      números da academia, um por folha — não uma constante do app.
 *   2b. FUNDAMENTOS. A folha "Posições Fundamentais" vale para todas as
 *      faixas, e a da azul manda literalmente somá-la ao exame de faixa.
 *      Um exame de faixa sem fundamentos cobra menos do que a academia cobra.
 *   3. DRILLS SÓ NO EXAME DE FAIXA. A regra de blocos fala em "posições", e
 *      drill não é posição.
 *   4. ORDEM DA FOLHA. O exame é para ser usado ao lado do papel da academia:
 *      a pergunta da posição 14 vem depois da 13 e antes da 15, e os drills
 *      vêm no fim, como na folha. Embaralhado, cada exame vira caça ao
 *      número.
 *
 * Mais o que já valia para a azul: determinismo, cobertura total do syllabus,
 * gabarito em toda pergunta, e nada nascendo respondido.
 */
import {
  gerarExame,
  contagemDoExame,
  resumoDoExame,
  vereditoDoExame,
  escoposDaFaixa,
  escopoPadrao,
  aprovacaoMinima,
  avisoDaFaixa,
  ESCOPO_FAIXA,
  ESCOPO_PRIMEIRO,
  ESCOPO_SEGUNDO,
} from "../src/lib/exame-de-faixa.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const PRIMEIRO = ESCOPO_PRIMEIRO;
const SEGUNDO = ESCOPO_SEGUNDO;

/** As duas faixas que têm folha. Tudo que é estrutural roda para as duas. */
const COM_FOLHA = ["Azul", "Roxa"];

/** Os números de posição que um exame tocou, por descrição ou por comparação. */
const numerosCobertos = (perguntas) =>
  new Set(
    perguntas
      .filter((p) => p.categoria === "posicoes")
      .flatMap((p) => p.item.split(" × "))
      .map((item) => Number(item.slice(0, 2))),
  );

const faixaDe = (de, ate) =>
  Array.from({ length: ate - de + 1 }, (_, i) => de + i);

/* --- 1. os escopos existem, e só os certos ------------------------------- */
for (const faixa of COM_FOLHA) {
  conferir(
    `${faixa}: três escopos, na ordem da folha`,
    JSON.stringify(escoposDaFaixa(faixa)) ===
      JSON.stringify([PRIMEIRO, SEGUNDO, ESCOPO_FAIXA]),
    JSON.stringify(escoposDaFaixa(faixa)),
  );
  conferir(
    `${faixa}: o padrão é o exame de faixa completo`,
    escopoPadrao(faixa) === ESCOPO_FAIXA,
    escopoPadrao(faixa),
  );
  conferir(
    `${faixa}: escopo inventado não gera exame`,
    gerarExame(faixa, 1, "5º grau") === null && contagemDoExame(faixa, "5º grau") === null,
  );
}
conferir("marrom continua sem folha", escoposDaFaixa("Marrom") === null);
conferir("preta continua sem folha", escoposDaFaixa("Preta") === null);
conferir("marrom continua retornando null", gerarExame("Marrom", 1) === null);
conferir("preta continua retornando null", gerarExame("Preta", 1) === null);

/* --- 2. os blocos não vazam um no outro ---------------------------------- */
for (const faixa of COM_FOLHA)
for (const semente of [1, 77, 2024]) {
  const a = numerosCobertos(gerarExame(faixa, semente, PRIMEIRO));
  const b = numerosCobertos(gerarExame(faixa, semente, SEGUNDO));

  const faltandoA = faixaDe(1, 18).filter((n) => !a.has(n));
  const vazandoA = [...a].filter((n) => n > 18);
  const faltandoB = faixaDe(19, 36).filter((n) => !b.has(n));
  const vazandoB = [...b].filter((n) => n < 19);

  conferir(
    `${faixa}, semente ${semente}: 1º/2º grau cobre as 18 primeiras posições`,
    faltandoA.length === 0,
    `faltando ${JSON.stringify(faltandoA)}`,
  );
  conferir(
    `${faixa}, semente ${semente}: 1º/2º grau não cobra nada de 19 a 36`,
    vazandoA.length === 0,
    `vazou ${JSON.stringify(vazandoA)}`,
  );
  conferir(
    `${faixa}, semente ${semente}: 3º/4º grau cobre as 18 últimas posições`,
    faltandoB.length === 0,
    `faltando ${JSON.stringify(faltandoB)}`,
  );
  conferir(
    `${faixa}, semente ${semente}: 3º/4º grau não cobra nada de 01 a 18`,
    vazandoB.length === 0,
    `vazou ${JSON.stringify(vazandoB)}`,
  );
}

/* --- 3. o exame de faixa cobre as 36, e soma os fundamentos -------------- */
const FUNDAMENTOS = ["defesas", "cambalhotas", "posturas", "projecoes", "quedas"];
for (const faixa of COM_FOLHA)
for (const semente of [5, 909]) {
  const ex = gerarExame(faixa, semente, ESCOPO_FAIXA);
  const todas = numerosCobertos(ex);
  const faltando = faixaDe(1, 36).filter((n) => !todas.has(n));
  conferir(
    `${faixa}, semente ${semente}: o exame de faixa cobre as 36 posições`,
    faltando.length === 0,
    `faltando ${JSON.stringify(faltando)}`,
  );

  // A folha da azul manda somar os fundamentos ao exame de faixa, e a regra
  // vale para todas as graduações. Sem isso o exame cobra menos que a
  // academia — que foi exatamente o erro que este arquivo passou a pegar.
  const semCategoria = FUNDAMENTOS.filter(
    (c) => !ex.some((p) => p.categoria === c),
  );
  conferir(
    `${faixa}, semente ${semente}: o exame de faixa traz os fundamentos`,
    semCategoria.length === 0,
    `faltando ${JSON.stringify(semCategoria)}`,
  );
}
for (const faixa of COM_FOLHA) {
  conferir(
    `${faixa}: os fundamentos NÃO entram nos exames de grau`,
    [PRIMEIRO, SEGUNDO].every((e) =>
      gerarExame(faixa, 4, e).every((p) => !FUNDAMENTOS.includes(p.categoria)),
    ),
  );
}

/* --- 4. drills só no exame de faixa -------------------------------------- */
const drillsDe = (perguntas) => perguntas.filter((p) => p.categoria === "drills");
conferir("a azul tem os 4 solo drills da folha", drillsDe(gerarExame("Azul", 3, ESCOPO_FAIXA)).length === 4);
conferir("a roxa tem os 3 drills da folha", drillsDe(gerarExame("Roxa", 3, ESCOPO_FAIXA)).length === 3);
for (const faixa of COM_FOLHA) {
  conferir(
    `${faixa}: nenhum drill nos exames de grau`,
    [PRIMEIRO, SEGUNDO].every((e) => drillsDe(gerarExame(faixa, 3, e)).length === 0),
  );
}

/* --- 5. a contagem prometida bate com o exame gerado --------------------- */
for (const faixa of COM_FOLHA)
 for (const escopo of [PRIMEIRO, SEGUNDO, ESCOPO_FAIXA]) {
  for (const semente of [11, 4242]) {
    const gerado = gerarExame(faixa, semente, escopo).length;
    const prometido = contagemDoExame(faixa, escopo);
    conferir(
      `${faixa}/${escopo}, semente ${semente}: a contagem bate com o exame`,
      gerado === prometido,
      `gerado=${gerado} prometido=${prometido}`,
    );
  }
}
for (const faixa of COM_FOLHA) {
  conferir(
    `${faixa}: o exame de faixa é maior que cada exame de grau`,
    contagemDoExame(faixa, ESCOPO_FAIXA) > contagemDoExame(faixa, PRIMEIRO) &&
      contagemDoExame(faixa, ESCOPO_FAIXA) > contagemDoExame(faixa, SEGUNDO),
  );
}

/* --- 6. determinismo, ids e gabaritos ------------------------------------ */
conferir(
  "mesma semente e mesmo escopo produzem o mesmo exame",
  JSON.stringify(gerarExame("Roxa", 42, PRIMEIRO)) ===
    JSON.stringify(gerarExame("Roxa", 42, PRIMEIRO)),
);
conferir(
  "sementes diferentes produzem exames diferentes",
  JSON.stringify(gerarExame("Roxa", 1, ESCOPO_FAIXA)) !==
    JSON.stringify(gerarExame("Roxa", 2, ESCOPO_FAIXA)),
);
conferir(
  "escopos diferentes produzem exames diferentes com a mesma semente",
  JSON.stringify(gerarExame("Roxa", 42, PRIMEIRO)) !==
    JSON.stringify(gerarExame("Roxa", 42, SEGUNDO)),
);
for (const escopo of [PRIMEIRO, SEGUNDO, ESCOPO_FAIXA]) {
  for (const semente of [8, 800, 80000]) {
    const ex = gerarExame("Roxa", semente, escopo);
    const semGabarito = ex.filter((p) => !p.gabarito || p.gabarito.trim() === "");
    conferir(
      `${escopo}, semente ${semente}: toda pergunta tem gabarito`,
      semGabarito.length === 0,
      JSON.stringify(semGabarito.map((p) => p.item)),
    );
  }
}
const umExame = gerarExame("Roxa", 555, ESCOPO_FAIXA);
conferir(
  "nenhuma pergunta nasce respondida",
  umExame.every((p) => p.respondida === false && p.resposta === "" && p.acertou === null),
);
conferir(
  "todo id é único dentro do exame",
  new Set(umExame.map((p) => p.id)).size === umExame.length,
);
conferir(
  "nenhuma posição aparece em duas perguntas",
  (() => {
    const vistos = umExame
      .filter((p) => p.categoria === "posicoes")
      .flatMap((p) => p.item.split(" × "));
    return new Set(vistos).size === vistos.length;
  })(),
);

/* --- 6b. a ordem da folha ------------------------------------------------ */
for (const escopo of [PRIMEIRO, SEGUNDO, ESCOPO_FAIXA]) {
  for (const semente of [2, 31, 60606]) {
    const ex = gerarExame("Roxa", semente, escopo);

    // Cada pergunta de posição entra na folha pelo MENOR dos seus números —
    // uma comparação "07 × 10" ocupa o lugar da 07.
    const numeros = ex
      .filter((p) => p.categoria === "posicoes")
      .map((p) => Math.min(...p.item.split(" × ").map((i) => Number(i.slice(0, 2)))));

    const foraDeOrdem = numeros.filter((n, i) => i > 0 && n < numeros[i - 1]);
    conferir(
      `${escopo}, semente ${semente}: as posições saem na ordem da folha`,
      foraDeOrdem.length === 0,
      `${JSON.stringify(numeros)}`,
    );
  }
}
conferir(
  "os drills vêm depois das posições, como na folha",
  (() => {
    const cats = gerarExame("Roxa", 9, ESCOPO_FAIXA).map((p) => p.categoria);
    return cats.lastIndexOf("posicoes") < cats.indexOf("drills");
  })(),
);
conferir(
  "a ordem não depende da semente — o que varia é o par e a formulação",
  (() => {
    const num = (semente) =>
      gerarExame("Roxa", semente, ESCOPO_FAIXA)
        .filter((p) => p.categoria === "posicoes")
        .map((p) => Math.min(...p.item.split(" × ").map((i) => Number(i.slice(0, 2)))));
    const a = num(100);
    const b = num(200);
    // Listas possivelmente diferentes (pares diferentes), mas as duas
    // crescentes — a folha manda na ordem, o sorteio manda no conteúdo.
    return (
      a.every((n, i) => i === 0 || n >= a[i - 1]) &&
      b.every((n, i) => i === 0 || n >= b[i - 1])
    );
  })(),
);

/* --- 7. a nota de corte -------------------------------------------------- */
// As duas notas são DIFERENTES, e essa é a conferência que importa: uma
// constante única no app passaria despercebida e reprovaria gente que a
// academia aprovaria.
conferir("a azul cobra 60%", aprovacaoMinima("Azul") === 0.6);
conferir("a roxa cobra 70%", aprovacaoMinima("Roxa") === 0.7);
conferir(
  "as notas de corte não são a mesma",
  aprovacaoMinima("Azul") !== aprovacaoMinima("Roxa"),
);
conferir(
  "faixa sem folha não tem nota de corte, e sem nota não há veredito",
  aprovacaoMinima("Marrom") === null &&
    vereditoDoExame(resumoDoExame([]), "Marrom") === null,
);

/** Marca as `certas` primeiras como acertadas e o resto como erradas. */
const comNota = (perguntas, certas) =>
  perguntas.map((p, i) => ({ ...p, respondida: true, acertou: i < certas }));

const total = contagemDoExame("Roxa", ESCOPO_FAIXA);
const base = gerarExame("Roxa", 7, ESCOPO_FAIXA);
const precisa = Math.ceil(0.7 * total);

// O mesmo corte, na azul, tem que dar um número MENOR de acertos exigidos —
// senão os 60% da folha não estão sendo usados em lugar nenhum.
const totalAzul = contagemDoExame("Azul", ESCOPO_FAIXA);
const baseAzul = gerarExame("Azul", 7, ESCOPO_FAIXA);
const precisaAzul = Math.ceil(0.6 * totalAzul);
const notaAzul = (certas) =>
  vereditoDoExame(
    resumoDoExame(baseAzul.map((p, i) => ({ ...p, respondida: true, acertou: i < certas }))),
    "Azul",
  );
conferir("azul: 60% exatos aprovam", notaAzul(precisaAzul).aprovado === true);
conferir("azul: uma certa a menos reprova", notaAzul(precisaAzul - 1).aprovado === false);
conferir(
  "azul: 70% de acerto passa, porque a folha dela pede 60",
  notaAzul(Math.ceil(0.7 * totalAzul)).aprovado === true,
);

const vExato = vereditoDoExame(resumoDoExame(comNota(base, precisa)), "Roxa");
conferir("bater exatamente o mínimo aprova", vExato.aprovado === true, JSON.stringify(vExato));
conferir("aprovado não deve nada", vExato.faltamParaPassar === 0);

const vUmAMenos = vereditoDoExame(resumoDoExame(comNota(base, precisa - 1)), "Roxa");
conferir(
  "uma certa a menos reprova",
  vUmAMenos.aprovado === false,
  JSON.stringify(vUmAMenos),
);
conferir("e diz que falta exatamente 1", vUmAMenos.faltamParaPassar === 1);

const vAberto = vereditoDoExame(resumoDoExame(base), "Roxa");
conferir(
  "exame em branco não tem veredito — nem aprovado nem reprovado",
  vAberto.aprovado === null && vAberto.fechado === false,
  JSON.stringify(vAberto),
);

const meio = base.map((p, i) =>
  i < 5 ? { ...p, respondida: true, acertou: true } : p,
);
const vMeio = vereditoDoExame(resumoDoExame(meio), "Roxa");
conferir(
  "exame pela metade continua sem veredito",
  vMeio.aprovado === null,
  JSON.stringify(vMeio),
);
conferir(
  "aproveitamento conta sobre o total, não sobre o conferido",
  Math.abs(resumoDoExame(meio).aproveitamento - 5 / total) < 1e-9,
  String(resumoDoExame(meio).aproveitamento),
);
conferir(
  "respondida mas não conferida não conta como certa",
  vereditoDoExame(
    resumoDoExame(base.map((p) => ({ ...p, respondida: true }))),
    "Roxa",
  ).aprovado === null,
);

/* --- 8. o que a folha pede e o app não gera ------------------------------ */
for (const faixa of COM_FOLHA) {
  conferir(
    `${faixa}: o exame de faixa avisa das 4 projeções que a academia informa na hora`,
    /projeç/i.test(avisoDaFaixa(faixa, ESCOPO_FAIXA) ?? ""),
    String(avisoDaFaixa(faixa, ESCOPO_FAIXA)),
  );
  conferir(
    `${faixa}: o exame de grau avisa que cobre só um bloco`,
    (avisoDaFaixa(faixa, PRIMEIRO) ?? "").length > 0,
  );
}
conferir("faixa sem folha não tem aviso", avisoDaFaixa("Marrom", ESCOPO_FAIXA) === null);

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
