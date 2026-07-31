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
console.log("· build");
execFileSync("npm", ["run", "build"], { stdio: "pipe" });

console.log(`· subindo servidor em ${BASE}`);
const servidor = spawn(
  "npx",
  ["vite", "preview", "--port", String(PORTA), "--strictPort"],
  { stdio: "pipe" },
);

const encerrar = () => {
  // `kill` no processo, e não `pkill vite`: já derrubei o próprio shell assim.
  if (!servidor.killed) servidor.kill("SIGTERM");
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
    execFileSync("node", [`testes/${arquivo}`], {
      stdio: "pipe",
      env: { ...process.env, BASE },
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
