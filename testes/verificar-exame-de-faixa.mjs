/**
 * O gerador de exame de faixa — a conta, não a tela.
 *
 * Roda sem navegador: `gerarExame` é aritmética determinística sobre uma
 * lista fixa, e subir Chromium para conferir isso seria gastar dez segundos
 * por nada.
 *
 * O que prende:
 *   1. mesma semente produz o MESMO exame — é o que torna a função confiável
 *      o bastante para o app confiar nela sem gravar o exame gerado em lugar
 *      nenhum além do banco
 *   2. sementes diferentes produzem exames diferentes — sem isso "gerar de
 *      novo" seria decoração
 *   3. as 19 projeções do syllabus aparecem todas, cobertas por descrição OU
 *      por comparação — nenhuma pode ficar de fora do exame
 *   4. faixa sem syllabus (Marrom, Preta) retorna null — nunca inventa
 *      conteúdo de exame que a academia não forneceu. A roxa tem folha e tem
 *      teste próprio: verificar-exame-roxa.mjs
 *   5. nenhuma pergunta nasce respondida ou com resposta preenchida
 *   6. TODA pergunta gerada tem gabarito não vazio — sem isso a
 *      autoavaliação não tem contra o que se medir
 *   7. resumoDoExame conta certas/erradas/por conferir/em branco a partir
 *      só do que o atleta marcou, e lista "para rever" com as erradas
 *   8. as projeções saem NA ORDEM DA FOLHA — o exame é para ser usado ao lado
 *      do papel da academia, não embaralhado
 */
import { gerarExame, contagemDoExame, resumoDoExame } from "../src/lib/exame-de-faixa.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

/* --- 1. determinístico -------------------------------------------------- */
const a1 = gerarExame("Azul", 42);
const a2 = gerarExame("Azul", 42);
conferir(
  "mesma semente produz o mesmo exame",
  JSON.stringify(a1) === JSON.stringify(a2),
);

/* --- 2. varia com a semente ---------------------------------------------- */
const b1 = gerarExame("Azul", 1);
const b2 = gerarExame("Azul", 2);
conferir(
  "sementes diferentes produzem exames diferentes",
  JSON.stringify(b1) !== JSON.stringify(b2),
);

/* --- 3. cobertura das 19 projeções ---------------------------------------- */
const PROJECOES = [
  "Single leg", "Double leg", "Osoto gari", "Kouchi gari", "Ouchi gari",
  "Kibisu gaeshi (safadinha)", "Colar drag em pé", "Colar drag para single leg",
  "Tomoe nage", "Sumi gaeshi", "O goshi", "Koshi guruma",
  "Ippon seoi nage (ajoelhado)", "Seoi nage (ajoelhado)", "Tani otoshi",
  "Tai otoshi", "Kata guruma", "Harai goshi", "De ashi barai",
];
for (const semente of [7, 99, 12345]) {
  const exame = gerarExame("Azul", semente);
  const proj = exame.filter((p) => p.categoria === "projecoes");
  const cobertas = new Set(proj.flatMap((p) => p.item.split(" × ")));
  const faltando = PROJECOES.filter((p) => !cobertas.has(p));
  conferir(
    `semente ${semente}: as 19 projeções aparecem todas`,
    faltando.length === 0,
    JSON.stringify(faltando),
  );
}

/* --- 4. faixa sem syllabus ------------------------------------------------ */
conferir("Marrom retorna null — sem syllabus fornecido", gerarExame("Marrom", 1) === null);
conferir("Preta retorna null — sem syllabus fornecido", gerarExame("Preta", 1) === null);
conferir("contagemDoExame de Marrom é null", contagemDoExame("Marrom") === null);
conferir("contagemDoExame de Preta é null", contagemDoExame("Preta") === null);
conferir("contagemDoExame de Azul é um número > 0", (contagemDoExame("Azul") ?? 0) > 0);

/* --- 5. nada nasce respondido ---------------------------------------------- */
const exame = gerarExame("Azul", 555);
conferir(
  "nenhuma pergunta nasce respondida",
  exame.every((p) => p.respondida === false && p.resposta === ""),
);
conferir(
  "a contagem bate com o tamanho real do exame gerado",
  exame.length === contagemDoExame("Azul"),
  `gerado=${exame.length} esperado=${contagemDoExame("Azul")}`,
);
conferir(
  "todo id é único dentro do exame",
  new Set(exame.map((p) => p.id)).size === exame.length,
);

/* --- 6. todo item tem gabarito ---------------------------------------- */
for (const semente of [3, 404, 8080]) {
  const ex = gerarExame("Azul", semente);
  const semGabarito = ex.filter((p) => !p.gabarito || p.gabarito.trim() === "");
  conferir(
    `semente ${semente}: toda pergunta tem gabarito não vazio`,
    semGabarito.length === 0,
    JSON.stringify(semGabarito.map((p) => p.item)),
  );
}

/* --- 6b. a ordem da folha ------------------------------------------------ */
const ORDEM_DA_FOLHA = new Map(PROJECOES.map((p, i) => [p, i]));
for (const semente of [2, 31, 60606]) {
  const proj = gerarExame("Azul", semente)
    .filter((p) => p.categoria === "projecoes")
    .map((p) =>
      Math.min(...p.item.split(" × ").map((i) => ORDEM_DA_FOLHA.get(i) ?? -1)),
    );
  conferir(
    `semente ${semente}: as projeções saem na ordem da folha`,
    proj.every((n, i) => n >= 0 && (i === 0 || n >= proj[i - 1])),
    JSON.stringify(proj),
  );
}

/* --- 7. resumoDoExame --------------------------------------------------- */
const paraResumo = gerarExame("Azul", 909).map((p, i) => {
  if (i < 10) return { ...p, respondida: true, acertou: true };
  if (i < 15) return { ...p, respondida: true, acertou: false };
  if (i < 20) return { ...p, respondida: true, acertou: null };
  return p; // em branco
});
const resumo = resumoDoExame(paraResumo);
conferir("resumoDoExame conta certas", resumo.certas === 10, String(resumo.certas));
conferir("resumoDoExame conta erradas", resumo.erradas === 5, String(resumo.erradas));
conferir("resumoDoExame conta por conferir", resumo.porConferir === 5, String(resumo.porConferir));
conferir(
  "resumoDoExame conta em branco",
  resumo.emBranco === paraResumo.length - 20,
  String(resumo.emBranco),
);
conferir(
  "paraRever tem exatamente as erradas",
  resumo.paraRever.length === 5,
  String(resumo.paraRever.length),
);
conferir(
  "resumo de exame recém-gerado tem tudo em branco",
  resumoDoExame(gerarExame("Azul", 1)).emBranco === contagemDoExame("Azul"),
);

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
