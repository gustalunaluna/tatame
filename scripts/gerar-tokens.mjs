#!/usr/bin/env node
// Gera src/design/tokens.css a partir de src/design/tokens.json.
//
// Existe para que nenhum valor de cor, raio, duração ou camada seja escrito
// duas vezes. Antes, a paleta vivia no JSON E no CSS, e as duas cópias podiam
// divergir sem ninguém perceber — é o tipo de erro que só aparece meses depois,
// numa tela que ninguém abre.
//
//   npm run tokens              reescreve o CSS
//   npm run tokens -- --conferir  só verifica se está em dia (usado no CI)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(aqui, "..");
const ENTRADA = resolve(RAIZ, "src/design/tokens.json");
const SAIDA = resolve(RAIZ, "src/design/tokens.css");

const t = JSON.parse(readFileSync(ENTRADA, "utf8"));
const oklch = ([l, c, h]) => `oklch(${l} ${c} ${h})`;

const linhas = [];
const escreva = (s = "") => linhas.push(s);

escreva("/* ============================================================");
escreva("   GERADO POR scripts/gerar-tokens.mjs — NÃO EDITE À MÃO.");
escreva("   A fonte é src/design/tokens.json. Rode `npm run tokens`.");
escreva("   ============================================================ */");
escreva();
escreva(":root {");

/* ---- raio -------------------------------------------------------------- */
escreva("  /* raio */");
escreva(`  --radius: ${t.raio.base};`);
for (const [nome, delta] of Object.entries(t.raio.escala)) {
  escreva(
    delta === 0
      ? `  --radius-${nome}: var(--radius);`
      : `  --radius-${nome}: calc(var(--radius) ${delta > 0 ? "+" : "-"} ${Math.abs(delta)}px);`,
  );
}
escreva();

/* ---- cores base e estado ---------------------------------------------- */
escreva("  /* superfícies e texto */");
for (const [, def] of Object.entries(t.cor.base)) {
  escreva(`  --${def.css}: ${oklch(def.valor)};${def.nota ? `  /* ${def.nota} */` : ""}`);
}
escreva();
escreva("  /* estado */");
for (const [, def] of Object.entries(t.cor.estado)) {
  escreva(`  --${def.css}: ${oklch(def.valor)};`);
}
escreva();

/* ---- a faixa ----------------------------------------------------------- */
const padrao = t.cor.faixa.Branca;
escreva("  /* A FAIXA — trocada em tempo de execução por CorDaFaixa.tsx.");
escreva("     O valor abaixo é só o ponto de partida (faixa branca). */");
escreva(`  --faixa: ${oklch(padrao.acento)};`);
escreva(`  --faixa-contraste: ${oklch(t.cor.base.fundo.valor)};`);
escreva("  --primary: var(--faixa);");
escreva("  --primary-foreground: var(--faixa-contraste);");
escreva("  --accent: color-mix(in oklab, var(--faixa) 22%, var(--card));");
escreva("  --accent-foreground: var(--foreground);");
escreva("  --ring: var(--faixa);");
escreva();

/* ---- pódio ------------------------------------------------------------- */
escreva("  /* pódio — fora do sistema da faixa, de propósito */");
for (const [, def] of Object.entries(t.cor.podio)) {
  escreva(`  --${def.css}: ${oklch(def.valor)};`);
}
escreva();

/* ---- gráficos ---------------------------------------------------------- */
escreva("  /* gráficos: a série 1 é a faixa; as outras só precisam se distinguir */");
escreva("  --chart-1: var(--faixa);");
escreva("  --chart-2: oklch(0.72 0.13 220);");
escreva("  --chart-3: oklch(0.70 0.14 300);");
escreva("  --chart-4: oklch(0.78 0.12 85);");
escreva("  --chart-5: oklch(0.68 0.14 160);");
escreva();

/* ---- barra lateral ----------------------------------------------------- */
escreva("  /* barra lateral */");
escreva(`  --sidebar: ${oklch(t.cor.base.flutuante.valor)};`);
escreva(`  --sidebar-foreground: ${oklch(t.cor.base.texto.valor)};`);
escreva("  --sidebar-primary: var(--faixa);");
escreva("  --sidebar-primary-foreground: var(--faixa-contraste);");
escreva(`  --sidebar-accent: ${oklch(t.cor.base.secundario.valor)};`);
escreva(`  --sidebar-accent-foreground: ${oklch(t.cor.base.texto.valor)};`);
escreva(`  --sidebar-border: ${oklch(t.cor.base.borda.valor)};`);
escreva("  --sidebar-ring: var(--faixa);");
escreva();

/* ---- movimento --------------------------------------------------------- */
escreva("  /* movimento */");
escreva(`  --ease-out-quart: ${t.movimento.curva.saida};`);
escreva(`  --ease-out-expo: ${t.movimento.curva.saidaFf};`);
escreva(`  --ease-standard: ${t.movimento.curva.padrao};`);
escreva(`  --t-tap: ${t.movimento.duracao.toque};`);
escreva(`  --t-fast: ${t.movimento.duracao.rapido};`);
escreva(`  --t-base: ${t.movimento.duracao.base};`);
escreva(`  --t-enter: ${t.movimento.duracao.entrada};`);
escreva(`  --t-bar: ${t.movimento.duracao.barra};`);
escreva(`  --t-faixa: ${t.movimento.duracao.faixa};`);
escreva();

/* ---- camadas ----------------------------------------------------------- */
escreva("  /* camadas — nunca escreva z-index solto */");
for (const [nome, v] of Object.entries(t.camada)) {
  if (nome.startsWith("_")) continue;
  escreva(`  --z-${nome}: ${v};`);
}
escreva("}");
escreva();

/* ---- transição da faixa ------------------------------------------------ */
escreva("/* A troca de faixa é um acontecimento: o app inteiro muda de cor junto. */");
escreva("@property --faixa {");
escreva('  syntax: "<color>";');
escreva("  inherits: true;");
escreva(`  initial-value: ${oklch(padrao.acento)};`);
escreva("}");
escreva();
escreva("@media (prefers-reduced-motion: no-preference) {");
escreva("  :root {");
escreva("    transition: --faixa var(--t-faixa) var(--ease-out-expo);");
escreva("  }");
escreva("}");
escreva();

const css = linhas.join("\n");

if (process.argv.includes("--conferir")) {
  let atual = "";
  try {
    atual = readFileSync(SAIDA, "utf8");
  } catch {
    console.error("FALHA  src/design/tokens.css não existe. Rode `npm run tokens`.");
    process.exit(1);
  }
  if (atual !== css) {
    console.error(
      "FALHA  tokens.css está fora de sincronia com tokens.json.\n" +
        "       Alguém editou o CSS à mão, ou esqueceu de rodar `npm run tokens`.",
    );
    process.exit(1);
  }
  console.log("ok     tokens.css em dia com tokens.json");
  process.exit(0);
}

writeFileSync(SAIDA, css);
console.log(`ok     src/design/tokens.css gerado (${linhas.length} linhas)`);
