// O menu lateral: todo item tem que ser alcançável e clicável.
//
// O bug que originou este teste: as camadas foram renomeadas nos tokens e o
// menu continuou pedindo `--z-overlay`, que deixou de existir. CSS não reclama
// de variável inexistente — o z-index virou `auto`, a barra inferior passou a
// pintar por cima, e o último item ("Conquistas") ficava escondido. Só dava
// para ver no celular, rolando até o fim.
//
// Por isso o teste não olha só "o item existe": ele rola até o último, confere
// que nada está por cima do ponto onde o dedo cairia, e clica de verdade.
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));

mkdirSync("telas", { recursive: true });

// Aparelho pequeno COM entalhe e barra de gestos: é onde o menu aperta.
const APARELHO = { width: 360, height: 640 };
const INSET_TOPO = 47;
const INSET_BASE = 34;

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: APARELHO, deviceScaleFactor: 2 });

await ctx.addInitScript(([ref, uid, t, b]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "f", refresh_token: "f",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: uid, aud: "authenticated" },
  }));
  // O navegador de teste não tem entalhe; simulamos as áreas seguras para que
  // o menu enfrente a mesma folga que enfrenta num celular de verdade.
  //
  // `addInitScript` roda ANTES do documento existir, então não dá para anexar
  // direto — é preciso esperar o <head> aparecer.
  const aplicar = () => {
    const s = document.createElement("style");
    s.textContent = `:root{--safe-t:${t}px !important;--safe-b:${b}px !important;}`;
    document.head.appendChild(s);
  };
  if (document.head) aplicar();
  else document.addEventListener("DOMContentLoaded", aplicar);
}, [REF, G.perfil.user_id, INSET_TOPO, INSET_BASE]);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));

await pagina.route(`https://${REF}.supabase.co/**`, (r) => {
  const u = r.request().url();
  const j = (b) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (u.includes("/auth/v1/user")) return j({ id: G.perfil.user_id, aud: "authenticated" });
  if (u.includes("/rest/v1/profiles")) return j([G.perfil]);
  if (u.includes("/rest/v1/trainings")) return j(G.treinos);
  if (u.includes("/rpc/achievement_stats")) return j(G.stats);
  if (u.includes("/rpc/semear_conquistas")) return j(0);
  if (u.includes("/rpc/recalcular_conquistas")) return j(0);
  return j([]);
});

const checagens = [];
const ver = (n, ok, extra) => checagens.push([n, ok, extra]);

await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);
await pagina.locator('button[aria-label="Abrir menu"]').click();
await pagina.waitForTimeout(600);

const itens = pagina.locator('aside[role="dialog"] nav a');
const total = await itens.count();
ver("o menu abre com todos os itens", total >= 10, `itens: ${total}`);

// O painel empilha acima da barra inferior?
const zPainel = await pagina.evaluate(() => {
  const p = document.querySelector('aside[role="dialog"]');
  const nav = document.querySelector("nav.fixed, [class*='fixed'][class*='bottom-0']");
  return {
    painel: p ? getComputedStyle(p).zIndex : "",
    ehAuto: p ? getComputedStyle(p).zIndex === "auto" : true,
  };
});
ver("o painel tem z-index de verdade (não `auto`)", !zPainel.ehAuto,
  `z-index do painel: "${zPainel.painel}"`);

// Rola até o fim da lista e mede o último item.
const ultimo = itens.nth(total - 1);
const rotulo = (await ultimo.innerText()).split("\n")[0];
await ultimo.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(400);
await pagina.screenshot({ path: "telas/menu-fim-da-lista.png" });

const caixa = await ultimo.boundingBox();
ver(`o último item ("${rotulo}") está dentro da tela`,
  !!caixa && caixa.y >= 0 && caixa.y + caixa.height <= APARELHO.height,
  caixa ? `y=${caixa.y.toFixed(0)} até ${(caixa.y + caixa.height).toFixed(0)}, tela=${APARELHO.height}` : "sem caixa");

// O teste que importa: quem recebe o toque no centro do último item?
const quemRecebe = await pagina.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  const link = el?.closest("a");
  return { tag: el?.tagName ?? "", href: link?.getAttribute("href") ?? "" };
}, [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2]);

// O href que o próprio item declara — é com ele que o toque tem que casar.
const destino = await ultimo.getAttribute("href");

// Asserção apertada de propósito. A primeira versão só exigia "algum href", e
// passava com o bug ativo: o ponto devolvia `/metas`, que é a aba Evolução da
// barra inferior pintando por cima. Um toque que chega em OUTRO link é
// exatamente o defeito, não o contrário dele.
ver(`o toque no último item chega NELE, e não em quem está por cima`,
  quemRecebe.href === destino,
  `elementFromPoint devolveu <${quemRecebe.tag}> href="${quemRecebe.href}", esperava "${destino}"`);
await ultimo.click({ timeout: 5000 }).catch(() => {});
await pagina.waitForTimeout(800);
const urlAgora = new URL(pagina.url()).pathname;
ver(`clicar em "${rotulo}" navega para ${destino}`, urlAgora === destino,
  `foi para "${urlAgora}", esperava "${destino}"`);

ver("sem erro de página", erros.length === 0, erros.join(" ; "));

await navegador.close();

let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? `\n         → ${extra}` : ""}`);
}
process.exit(falhou ? 1 : 0);
