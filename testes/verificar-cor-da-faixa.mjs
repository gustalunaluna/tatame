// A cor do app é a faixa de quem está logado.
//
// O teste abre a MESMA tela cinco vezes, mudando só a faixa no perfil, e lê a
// cor computada de `--primary`. Se o app tivesse voltado a ter uma cor fixa de
// marca, os cinco valores seriam iguais e isto falharia.
//
// Também confere o que mais importa na prática: que a cor do texto de destaque
// realmente muda, e que nada ficou verde-limão.
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));

mkdirSync("telas", { recursive: true });

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];

const navegador = await abrirNavegador();
const vistos = new Map();
const erros = [];

for (const faixa of FAIXAS) {
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(([ref, uid]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: "f", refresh_token: "f",
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
      user: { id: uid, email: "g@e.com", aud: "authenticated" },
    }));
  }, [REF, G.perfil.user_id]);

  const pagina = await ctx.newPage();
  pagina.on("pageerror", (e) => erros.push(`${faixa}: ${String(e).slice(0, 150)}`));

  await pagina.route("https://api.dicebear.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg/>" }));

  await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
    const url = rota.request().url();
    const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (url.includes("/auth/v1/user")) return json({ id: G.perfil.user_id, aud: "authenticated" });
    if (url.includes("/rest/v1/profiles"))
      return json([{ ...G.perfil, belt: faixa, degrees: 3 }]);
    if (url.includes("/rest/v1/trainings")) return json(G.treinos);
    if (url.includes("/rest/v1/goals")) return json(G.metas);
    if (url.includes("/rest/v1/plan_cycles")) return json(G.ciclos);
    if (url.includes("/rest/v1/plan_cycle_items")) return json(G.itens_ciclo);
    if (url.includes("/rpc/achievement_stats")) return json(G.stats);
    if (url.includes("/rpc/semear_conquistas")) return json(0);
    if (url.includes("/rpc/recalcular_conquistas")) return json(0);
    if (url.includes("/rpc/resumo_medalhas_do_atleta")) return json(G.resumo_medalhas);
    return json([]);
  });

  await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1300);

  const medido = await pagina.evaluate(() => {
    const raiz = getComputedStyle(document.documentElement);
    // um número em destaque qualquer, para conferir que a cor chegou ao texto
    const alvo = document.querySelector(".text-primary");
    return {
      primary: raiz.getPropertyValue("--primary").trim(),
      faixa: raiz.getPropertyValue("--faixa").trim(),
      corDoTexto: alvo ? getComputedStyle(alvo).color : "",
    };
  });

  vistos.set(faixa, medido);
  await pagina.screenshot({ path: `telas/faixa-${faixa.toLowerCase()}.png` });
  await ctx.close();
}

await navegador.close();

/* --- resultado --- */
const checagens = [];
const ver = (n, ok, extra) => checagens.push([n, ok, extra]);

for (const [faixa, m] of vistos) {
  console.log(`  ${faixa.padEnd(8)} --faixa: ${m.faixa.padEnd(24)} texto: ${m.corDoTexto}`);
}
console.log();

const faixasUnicas = new Set([...vistos.values()].map((m) => m.faixa));
ver("cada faixa tem a sua cor", faixasUnicas.size === FAIXAS.length,
  `${faixasUnicas.size} cores distintas para ${FAIXAS.length} faixas`);

const textosUnicos = new Set([...vistos.values()].map((m) => m.corDoTexto));
ver("a cor chega ao texto de destaque", textosUnicos.size === FAIXAS.length,
  `${textosUnicos.size} cores de texto distintas`);

ver("--primary segue --faixa",
  [...vistos.values()].every((m) => m.primary === m.faixa));

// O verde-limão era oklch(0.92 0.24 130): claridade alta e croma altíssimo em
// torno do matiz 130. Nenhuma faixa pode cair nessa faixa de valores.
const aindaTemLimao = [...vistos.values()].some((m) => {
  const n = m.faixa.match(/[\d.]+/g)?.map(Number) ?? [];
  return n.length >= 3 && n[0] > 0.85 && n[1] > 0.18 && n[2] > 110 && n[2] < 160;
});
ver("o verde-limão sumiu", !aindaTemLimao);

ver("sem erro de página", erros.length === 0, erros.join(" ; "));

let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? ` → ${extra}` : ""}`);
}
process.exit(falhou ? 1 : 0);
