#!/usr/bin/env node
// Orçamento de peso do caminho crítico.
//
// "Otimizado" não é um estado, é um número que se mede — e que volta a piorar
// sozinho na primeira dependência que alguém adicionar sem olhar. Este script
// falha o build quando o que o celular precisa baixar ANTES de ver a primeira
// tela passa do teto.
//
// Mede gzip, não o cru: gzip é o que trafega.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const TETO_KB = 220; // caminho crítico, gzip

const html = readFileSync(join(DIST, "index.html"), "utf8");

/** Os arquivos que o index.html manda buscar de cara. */
const criticos = new Set();
for (const m of html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)) {
  criticos.add(m[1]);
}
// modulepreload conta: o navegador baixa antes de precisar
for (const m of html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([^"]+)"/g)) {
  criticos.add(m[1]);
}

const gz = (p) => gzipSync(readFileSync(p)).length;
const kb = (n) => (n / 1024).toFixed(1);

let total = 0;
const linhas = [];
for (const nome of [...criticos].sort()) {
  const caminho = join(DIST, "assets", nome);
  try {
    const t = gz(caminho);
    total += t;
    linhas.push([nome, t]);
  } catch {
    /* referenciado mas ausente — o build já teria falhado */
  }
}

linhas.sort((a, b) => b[1] - a[1]);
console.log("— caminho crítico (o que baixa antes da primeira tela) —");
for (const [nome, t] of linhas) {
  console.log(`  ${kb(t).padStart(7)} kB gzip   ${nome}`);
}

/* O resto: pesa, mas só quando a pessoa chega na tela que precisa dele. */
const todos = readdirSync(join(DIST, "assets")).filter((f) => f.endsWith(".js"));
const preguicosos = todos
  .filter((f) => !criticos.has(f))
  .map((f) => [f, gz(join(DIST, "assets", f))])
  .sort((a, b) => b[1] - a[1]);

const totalPreguicoso = preguicosos.reduce((n, [, t]) => n + t, 0);

console.log("\n— sob demanda (3 maiores de " + preguicosos.length + ") —");
for (const [nome, t] of preguicosos.slice(0, 3)) {
  console.log(`  ${kb(t).padStart(7)} kB gzip   ${nome}`);
}

console.log(
  `\n  crítico: ${kb(total)} kB gzip   ·   sob demanda: ${kb(totalPreguicoso)} kB   ·   teto: ${TETO_KB} kB`,
);

if (total / 1024 > TETO_KB) {
  console.error(
    `\nFALHA  o caminho crítico passou do teto (${kb(total)} kB > ${TETO_KB} kB).\n` +
      `       Alguma dependência nova entrou no caminho de entrada. Carregue-a\n` +
      `       sob demanda (lazy) ou justifique subindo o teto neste arquivo.`,
  );
  process.exit(1);
}
console.log("\nok     dentro do orçamento.");
