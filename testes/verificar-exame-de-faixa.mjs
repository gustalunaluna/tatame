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
 *   4. faixa sem syllabus (Roxa, Marrom, Preta) retorna null — nunca inventa
 *      conteúdo de exame que a academia não forneceu
 *   5. nenhuma pergunta nasce respondida ou com resposta preenchida
 */
import { gerarExame, contagemDoExame } from "../src/lib/exame-de-faixa.ts";

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
conferir("Roxa retorna null — sem syllabus fornecido", gerarExame("Roxa", 1) === null);
conferir("Marrom retorna null — sem syllabus fornecido", gerarExame("Marrom", 1) === null);
conferir("Preta retorna null — sem syllabus fornecido", gerarExame("Preta", 1) === null);
conferir("contagemDoExame de Roxa é null", contagemDoExame("Roxa") === null);
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

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
