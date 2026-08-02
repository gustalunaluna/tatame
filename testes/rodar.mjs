#!/usr/bin/env node
// Roda a suíte de navegador inteira, sobe e derruba o servidor sozinho.
//
// Antes eram 16 arquivos soltos na raiz que só rodavam se você lembrasse o
// nome de cada um, e depois de subir o `vite preview` na mão. Um teste que
// depende de disciplina não é rede de proteção.
//
//   npm test              tudo
//   npm test -- medalhas  só os que casam com "medalhas"
import { spawn, execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { setTimeout as espere } from "node:timers/promises";

const PORTA = Number(process.env.PORTA ?? 4183);
const BASE = `http://localhost:${PORTA}`;
const filtro = process.argv[2];

/* --- os que precisam de navegador vivem em testes/ ---------------------- */
const arquivos = readdirSync("testes")
  .filter((f) => f.startsWith("verificar-") && f.endsWith(".mjs"))
  .filter((f) => !filtro || f.includes(filtro))
  .sort();

if (!arquivos.length) {
  console.error(`nenhum teste casa com "${filtro}"`);
  process.exit(1);
}

/* --- build + servidor ---------------------------------------------------- */

// Antes de tudo: a porta está livre? Se um servidor de uma rodada anterior
// sobreviveu, o teste de saúde abaixo passa contra ELE — e a suíte inteira
// roda contra o build antigo, verde e mentindo. É o pior desfecho possível
// para uma rede de proteção, então isto para aqui.
try {
  await fetch(BASE, { signal: AbortSignal.timeout(1500) });
  console.error(
    `já tem alguém servindo em ${BASE}.\n` +
      "Derrube antes: a suíte rodaria contra o build daquele processo, não " +
      "contra o que acabou de ser construído.",
  );
  process.exit(1);
} catch {
  /* ninguém atende: é o que queremos */
}

console.log("· build");
execFileSync("npm", ["run", "build"], { stdio: "pipe" });

console.log(`· subindo servidor em ${BASE}`);
// Duas escolhas aqui, cada uma por um motivo que já custou tempo:
//
//   stdio "ignore" — com "pipe" o servidor herda o stdout deste processo, e
//   `npm test | tail` fica pendurado depois do último teste: o runner termina,
//   o relatório fica pronto, e nada aparece porque o cano continua aberto do
//   outro lado.
//
//   detached — `npx` não é o servidor: ele abre um `sh`, que abre o node do
//   vite. Matar o filho direto deixava os netos vivos, segurando a porta.
//   Com `detached` todos ficam no mesmo grupo, e dá para derrubar o grupo.
const servidor = spawn(
  "npx",
  ["vite", "preview", "--port", String(PORTA), "--strictPort"],
  { stdio: "ignore", detached: true },
);

const encerrar = () => {
  // O menos, e não o pid: derruba o grupo inteiro. `pkill vite` já derrubou o
  // meu próprio shell uma vez — nunca mais.
  try {
    process.kill(-servidor.pid, "SIGKILL");
  } catch {
    /* já morreu */
  }
};
process.on("exit", encerrar);
process.on("SIGINT", () => { encerrar(); process.exit(130); });

// espera o servidor responder, em vez de dormir um tempo fixo e torcer
let vivo = false;
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(BASE);
    if (r.ok) { vivo = true; break; }
  } catch { /* ainda subindo */ }
  await espere(250);
}
if (!vivo) {
  console.error("servidor não respondeu em 10s");
  encerrar();
  process.exit(1);
}

/* --- roda --------------------------------------------------------------- */
const falhas = [];
for (const arquivo of arquivos) {
  const nome = arquivo.replace(/^verificar-|\.mjs$/g, "");
  process.stdout.write(`  ${nome.padEnd(24)} `);
  const inicio = Date.now();
  try {
    execFileSync("node", ["--experimental-strip-types", `testes/${arquivo}`], {
      stdio: "pipe",
      // A flag vale para todos, e não só para quem precisa: é o que deixa um
      // teste importar direto de `src/*.ts` em vez de reescrever a regra em
      // JavaScript ao lado dela. Duas cópias da mesma regra foi exatamente
      // como a escada de graduação errou antes — e a cópia com nome era a
      // morta.
      env: { ...process.env, BASE, NODE_NO_WARNINGS: "1" },
      timeout: 180_000,
    });
    console.log(`ok    ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.log("FALHOU");
    falhas.push([nome, (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "")]);
  }
}

encerrar();

if (falhas.length) {
  for (const [nome, saida] of falhas) {
    console.error(`\n────── ${nome} ──────`);
    console.error(saida.trim().split("\n").slice(-25).join("\n"));
  }
  console.error(`\n${falhas.length} de ${arquivos.length} falharam.`);
  process.exit(1);
}
console.log(`\n${arquivos.length} suítes, todas passaram.`);
