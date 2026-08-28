/**
 * O exame Azul → Roxa — a conta, não a tela.
 *
 * Roda sem navegador: é aritmética determinística sobre listas fixas.
 *
 * A folha da roxa traz três regras que a da azul não tinha, e todas as três
 * são fáceis de implementar errado de um jeito que ninguém percebe olhando a
 * tela. É o que este arquivo prende:
 *
 *   1. ESCOPO. "O exame de 1º e 2º grau será exigido o conhecimento das
 *      posições de 01 a 18, para o 3º e 4º graus o conhecimento das posições
 *      de 19 a 36." Um exame de grau que vaze uma posição do outro bloco está
 *      cobrando matéria que a folha não cobra — e ninguém repara, porque a
 *      pergunta parece legítima. Aqui isso falha o teste.
 *   2. NOTA DE CORTE. 70% na roxa; a folha da azul não trazia percentual
 *      nenhum, e o app não pode inventar um.
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
} from "../src/lib/exame-de-faixa.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const PRIMEIRO = "1º e 2º grau";
const SEGUNDO = "3º e 4º grau";

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
conferir(
  "a roxa tem três escopos, na ordem da folha",
  JSON.stringify(escoposDaFaixa("Roxa")) ===
    JSON.stringify([PRIMEIRO, SEGUNDO, ESCOPO_FAIXA]),
  JSON.stringify(escoposDaFaixa("Roxa")),
);
conferir(
  "a azul tem um escopo só — a folha dela não divide por grau",
  JSON.stringify(escoposDaFaixa("Azul")) === JSON.stringify([ESCOPO_FAIXA]),
);
conferir("marrom continua sem syllabus", escoposDaFaixa("Marrom") === null);
conferir("preta continua sem syllabus", escoposDaFaixa("Preta") === null);
conferir("o padrão da roxa é o exame de grau mais baixo", escopoPadrao("Roxa") === PRIMEIRO);
conferir(
  "escopo inventado não gera exame",
  gerarExame("Roxa", 1, "5º grau") === null && contagemDoExame("Roxa", "5º grau") === null,
);
conferir(
  "escopo da roxa não vale na azul",
  gerarExame("Azul", 1, PRIMEIRO) === null,
);
conferir("marrom continua retornando null", gerarExame("Marrom", 1) === null);
conferir("preta continua retornando null", gerarExame("Preta", 1) === null);

/* --- 2. os blocos não vazam um no outro ---------------------------------- */
for (const semente of [1, 77, 2024]) {
  const a = numerosCobertos(gerarExame("Roxa", semente, PRIMEIRO));
  const b = numerosCobertos(gerarExame("Roxa", semente, SEGUNDO));

  const faltandoA = faixaDe(1, 18).filter((n) => !a.has(n));
  const vazandoA = [...a].filter((n) => n > 18);
  const faltandoB = faixaDe(19, 36).filter((n) => !b.has(n));
  const vazandoB = [...b].filter((n) => n < 19);

  conferir(
    `semente ${semente}: 1º/2º grau cobre as 18 primeiras posições`,
    faltandoA.length === 0,
    `faltando ${JSON.stringify(faltandoA)}`,
  );
  conferir(
    `semente ${semente}: 1º/2º grau não cobra nada de 19 a 36`,
    vazandoA.length === 0,
    `vazou ${JSON.stringify(vazandoA)}`,
  );
  conferir(
    `semente ${semente}: 3º/4º grau cobre as 18 últimas posições`,
    faltandoB.length === 0,
    `faltando ${JSON.stringify(faltandoB)}`,
  );
  conferir(
    `semente ${semente}: 3º/4º grau não cobra nada de 01 a 18`,
    vazandoB.length === 0,
    `vazou ${JSON.stringify(vazandoB)}`,
  );
}

/* --- 3. o exame de faixa cobre as 36 ------------------------------------- */
for (const semente of [5, 909]) {
  const todas = numerosCobertos(gerarExame("Roxa", semente, ESCOPO_FAIXA));
  const faltando = faixaDe(1, 36).filter((n) => !todas.has(n));
  conferir(
    `semente ${semente}: o exame de faixa cobre as 36 posições`,
    faltando.length === 0,
    `faltando ${JSON.stringify(faltando)}`,
  );
}

/* --- 4. drills só no exame de faixa -------------------------------------- */
const drillsDe = (perguntas) => perguntas.filter((p) => p.categoria === "drills");
conferir(
  "os 3 drills entram no exame de faixa",
  drillsDe(gerarExame("Roxa", 3, ESCOPO_FAIXA)).length === 3,
);
conferir(
  "nenhum drill no exame de 1º e 2º grau",
  drillsDe(gerarExame("Roxa", 3, PRIMEIRO)).length === 0,
);
conferir(
  "nenhum drill no exame de 3º e 4º grau",
  drillsDe(gerarExame("Roxa", 3, SEGUNDO)).length === 0,
);

/* --- 5. a contagem prometida bate com o exame gerado --------------------- */
for (const escopo of [PRIMEIRO, SEGUNDO, ESCOPO_FAIXA]) {
  for (const semente of [11, 4242]) {
    const gerado = gerarExame("Roxa", semente, escopo).length;
    const prometido = contagemDoExame("Roxa", escopo);
    conferir(
      `${escopo}, semente ${semente}: a contagem bate com o exame`,
      gerado === prometido,
      `gerado=${gerado} prometido=${prometido}`,
    );
  }
}
conferir(
  "o exame de faixa é maior que cada exame de grau",
  contagemDoExame("Roxa", ESCOPO_FAIXA) > contagemDoExame("Roxa", PRIMEIRO) &&
    contagemDoExame("Roxa", ESCOPO_FAIXA) > contagemDoExame("Roxa", SEGUNDO),
);

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
conferir("a roxa cobra 70%", aprovacaoMinima("Roxa") === 0.7);
conferir(
  "a azul não tem nota de corte — a folha dela não trazia percentual",
  aprovacaoMinima("Azul") === null,
);
conferir(
  "sem nota de corte não há veredito",
  vereditoDoExame(resumoDoExame(gerarExame("Azul", 1)), "Azul") === null,
);

/** Marca as `certas` primeiras como acertadas e o resto como erradas. */
const comNota = (perguntas, certas) =>
  perguntas.map((p, i) => ({ ...p, respondida: true, acertou: i < certas }));

const total = contagemDoExame("Roxa", ESCOPO_FAIXA);
const base = gerarExame("Roxa", 7, ESCOPO_FAIXA);
const precisa = Math.ceil(0.7 * total);

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
conferir(
  "o exame de faixa avisa das 4 projeções que a academia informa na hora",
  /projeç/i.test(avisoDaFaixa("Roxa", ESCOPO_FAIXA) ?? ""),
  String(avisoDaFaixa("Roxa", ESCOPO_FAIXA)),
);
conferir(
  "o exame de grau avisa que cobre só um bloco",
  (avisoDaFaixa("Roxa", PRIMEIRO) ?? "").length > 0,
);
conferir("a azul não tem aviso", avisoDaFaixa("Azul", ESCOPO_FAIXA) === null);

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
