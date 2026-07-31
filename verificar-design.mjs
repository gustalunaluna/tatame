#!/usr/bin/env node
// Guarda o sistema de design contra erosão.
//
// Um sistema só continua sendo sistema enquanto ninguém contorna ele — e
// contornar é sempre mais rápido no dia em que se está com pressa. Este script
// é o que transforma "combinado" em "regra": ele falha o build.
//
// Confere quatro coisas:
//   1. tokens.css está em dia com tokens.json (ninguém editou o gerado à mão)
//   2. nenhum arquivo importa lucide-react fora do registro de ícones
//   3. nenhuma cor crua (hex, rgb, oklch) escrita direto em componente
//   4. nenhum z-index solto — a escala de camadas existe para isso
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();
const problemas = [];

function arquivos(dir, ext = [".ts", ".tsx", ".css"]) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) saida.push(...arquivos(p, ext));
    else if (ext.some((e) => p.endsWith(e))) saida.push(p);
  }
  return saida;
}

const todos = arquivos(join(RAIZ, "src"));
const rel = (p) => relative(RAIZ, p);

/* --- 1. o CSS gerado está em dia? -------------------------------------- */
try {
  execFileSync("node", ["scripts/gerar-tokens.mjs", "--conferir"], { stdio: "pipe" });
  console.log("ok     tokens.css em dia com tokens.json");
} catch (e) {
  problemas.push(
    "tokens.css está fora de sincronia com tokens.json.\n" +
      "         Rode `npm run tokens` (e não edite o CSS gerado à mão).",
  );
}

/* --- 2. ícones só pelo registro ---------------------------------------- */
const REGISTRO = "src/design/icones.ts";
const forasIcone = todos
  .filter((p) => rel(p) !== REGISTRO)
  .filter((p) => readFileSync(p, "utf8").includes('from "lucide-react"'))
  .map(rel);

if (forasIcone.length) {
  problemas.push(
    `${forasIcone.length} arquivo(s) importam lucide-react direto, furando o registro:\n` +
      forasIcone.map((f) => `         ${f}`).join("\n") +
      `\n         Use \`import { Icone } from "@/design/icones"\` e dê um nome ao que o ícone SIGNIFICA.`,
  );
} else {
  console.log("ok     todo ícone passa pelo registro semântico");
}

/* --- 3. cor crua em componente ----------------------------------------- */
// Cor em componente é o começo do fim: ela não segue a faixa, não aparece no
// guia de estilo e ninguém acha quando quer trocar.
const COR_CRUA = /(#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\()/;
const permitidos = new Set([
  "src/design/icones.ts",
  "src/design/tokens.css", // gerado
  "src/lib/faixa-cores.ts", // lê do JSON e devolve string CSS — é a ponte oficial
]);

const comCorCrua = [];
for (const p of todos) {
  const r = rel(p);
  if (permitidos.has(r) || r.endsWith("styles.css")) continue;
  const linhas = readFileSync(p, "utf8").split("\n");
  linhas.forEach((l, i) => {
    if (l.trim().startsWith("//") || l.trim().startsWith("*")) return;
    if (COR_CRUA.test(l)) comCorCrua.push(`${r}:${i + 1}  ${l.trim().slice(0, 84)}`);
  });
}
if (comCorCrua.length) {
  problemas.push(
    `${comCorCrua.length} cor(es) escritas direto no código:\n` +
      comCorCrua.map((l) => `         ${l}`).join("\n") +
      `\n         Toda cor vem de design/tokens.json.`,
  );
} else {
  console.log("ok     nenhuma cor crua fora dos tokens");
}

/* --- 4. z-index solto --------------------------------------------------- */
const zSolto = [];
for (const p of todos) {
  const r = rel(p);
  if (r === "src/design/tokens.css") continue;
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((l, i) => {
      // z-10, z-[999], z-index: 5 — tudo que não sai da escala semântica
      if (/\bz-\[?\d/.test(l) || /z-index:\s*\d/.test(l)) {
        zSolto.push(`${r}:${i + 1}  ${l.trim().slice(0, 84)}`);
      }
    });
}
if (zSolto.length) {
  problemas.push(
    `${zSolto.length} z-index solto(s):\n` +
      zSolto.map((l) => `         ${l}`).join("\n") +
      `\n         Use a escala: var(--z-nav), var(--z-sobreposicao), var(--z-painel), var(--z-aviso).`,
  );
} else {
  console.log("ok     empilhamento só pela escala semântica");
}

/* --- resultado ---------------------------------------------------------- */
if (problemas.length) {
  console.log();
  for (const p of problemas) console.error(`FALHA  ${p}`);
  process.exit(1);
}
console.log("\nsistema de design íntegro.");
