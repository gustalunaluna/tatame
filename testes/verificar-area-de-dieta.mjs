// As duas áreas do app: o jiu-jitsu e a dieta.
//
// O pedido era "quase como se fossem dois apps num só", e o que entrega isso é
// a barra de baixo trocar de conteúdo ao entrar em /dieta. Essa troca é
// exatamente o tipo de coisa que quebra em silêncio: basta alguém mexer no
// `pathname.startsWith` ou renomear uma rota, e o app volta a ter uma área só
// sem nenhum erro no console e sem nenhum teste vermelho.
//
// O que este arquivo prende:
//   1. a barra do jiu-jitsu é a de sempre na raiz
//   2. entrando em /dieta a barra TROCA — e some de lá o que é do tatame
//   3. existe porta de volta explícita para o jiu-jitsu
//   4. "Hoje" e "Peso" não acendem juntos em /dieta/peso (um é prefixo do
//      outro; foi por isso que o `exato` existe)
//   5. as três telas da dieta abrem sem erro de página
//   6. a tela de hoje diz o que falta em vez de mostrar caloria inventada,
//      quando ainda não há peso nem altura
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));

mkdirSync("telas", { recursive: true });

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 780 },
  deviceScaleFactor: 2,
});

await ctx.addInitScript(([ref, uid]) => {
  localStorage.setItem(
    `sb-${ref}-auth-token`,
    JSON.stringify({
      access_token: "f",
      refresh_token: "f",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: uid, aud: "authenticated" },
    }),
  );
}, [REF, G.perfil.user_id]);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

// O dublê responde vazio para as tabelas da dieta: é o estado de quem acabou de
// abrir a área pela primeira vez, que é o estado em que a tela mais pode errar.
await pagina.route(`https://${REF}.supabase.co/**`, (r) => {
  const u = r.request().url();
  const j = (b) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (u.includes("/auth/v1/user")) return j({ id: G.perfil.user_id, aud: "authenticated" });
  if (u.includes("/rest/v1/profiles")) return j([G.perfil]);
  if (u.includes("/rest/v1/trainings")) return j(G.treinos);
  if (u.includes("/rest/v1/perfil_da_dieta")) return j(null);
  if (u.includes("/rpc/achievement_stats")) return j(G.stats);
  if (u.includes("/rpc/semear_conquistas")) return j(0);
  if (u.includes("/rpc/recalcular_conquistas")) return j(0);
  return j([]);
});

const checagens = [];
const ver = (n, ok, extra) => checagens.push([n, ok, extra]);

/** Os rótulos da barra de baixo, na ordem em que aparecem. */
const rotulosDaBarra = () =>
  pagina.evaluate(() =>
    [...document.querySelectorAll("nav.fixed.bottom-0 a, nav.fixed.bottom-0 button")].map(
      (e) => e.textContent?.trim() ?? "",
    ),
  );

/* --- 1. a barra do jiu-jitsu --------------------------------------------- */
await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);

const barraJiu = await rotulosDaBarra();
ver(
  "na raiz a barra é a do jiu-jitsu",
  barraJiu.includes("Técnicas") && barraJiu.includes("Diário"),
  barraJiu.join(" | "),
);
ver(
  "a dieta NÃO ocupa lugar na barra do jiu-jitsu",
  !barraJiu.includes("Peso"),
  barraJiu.join(" | "),
);

/* --- a porta de entrada -------------------------------------------------- */
const entrada = pagina.locator('a[href="/dieta"]').first();
ver("a tela inicial tem link para a Dieta", (await entrada.count()) > 0);
await entrada.click();
await pagina.waitForTimeout(1200);
ver(
  "o link leva para /dieta",
  new URL(pagina.url()).pathname === "/dieta",
  pagina.url(),
);

/* --- 2 e 3. a barra troca ------------------------------------------------ */
const barraDieta = await rotulosDaBarra();
ver(
  "em /dieta a barra vira a da dieta",
  barraDieta.includes("Peso") && barraDieta.includes("Metas"),
  barraDieta.join(" | "),
);
ver(
  "o que é do tatame sai da barra da dieta",
  !barraDieta.includes("Técnicas") && !barraDieta.includes("Diário"),
  barraDieta.join(" | "),
);
ver(
  "há porta de volta explícita para o jiu-jitsu",
  barraDieta.includes("Jiu-jitsu"),
  barraDieta.join(" | "),
);

/* --- 6. sem dado, a tela diz o que falta --------------------------------- */
const corpo = await pagina.locator("main").innerText();
ver(
  "sem peso e sem altura, a tela pede os dados em vez de inventar caloria",
  /Falta pouco/i.test(corpo),
  corpo.slice(0, 200).replace(/\n/g, " · "),
);
await pagina.screenshot({ path: "telas/dieta-hoje.png" });

/* --- 4. "Hoje" e "Peso" não acendem juntos ------------------------------- */
await pagina.goto(`${BASE}/dieta/peso`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);

const acesos = await pagina.evaluate(() =>
  [...document.querySelectorAll("nav.fixed.bottom-0 a")]
    .filter((a) => a.className.includes("text-primary"))
    .map((a) => a.textContent?.trim() ?? ""),
);
ver(
  'em /dieta/peso só "Peso" fica aceso — "Hoje" é prefixo dele e acendia junto',
  acesos.length === 1 && acesos[0] === "Peso",
  `acesos: ${acesos.join(" | ") || "nenhum"}`,
);
await pagina.screenshot({ path: "telas/dieta-peso.png" });

/* --- 5. as três telas abrem ---------------------------------------------- */
await pagina.goto(`${BASE}/dieta/ajustes`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);
const ajustes = await pagina.locator("main").innerText();
ver(
  "a tela de metas abre com os três objetivos",
  /Secar/.test(ajustes) && /Manter/.test(ajustes) && /Ganhar/.test(ajustes),
  ajustes.slice(0, 160).replace(/\n/g, " · "),
);
await pagina.screenshot({ path: "telas/dieta-metas.png" });

/* --- voltar para o jiu-jitsu funciona ------------------------------------ */
await pagina.goto(`${BASE}/dieta`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);
await pagina.locator('nav.fixed.bottom-0 a[href="/"]').click();
await pagina.waitForTimeout(1200);
ver(
  "a porta de volta devolve para o jiu-jitsu, com a barra de lá",
  new URL(pagina.url()).pathname === "/" &&
    (await rotulosDaBarra()).includes("Técnicas"),
  pagina.url(),
);

ver("sem erro de página em nenhuma das telas", erros.length === 0, erros.join(" ; "));

await navegador.close();

let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? `\n         → ${extra}` : ""}`);
}
process.exit(falhou ? 1 : 0);
