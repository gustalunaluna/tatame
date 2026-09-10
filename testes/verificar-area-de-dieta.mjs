// As duas áreas do app: o jiu-jitsu e a dieta.
//
// O pedido era "quase como se fossem dois apps num só", e o que entrega isso é
// a barra de baixo trocar de conteúdo ao entrar em /dieta. Essa troca é
// exatamente o tipo de coisa que quebra em silêncio: basta alguém mexer no
// `pathname.startsWith` ou renomear uma rota, e o app volta a ter uma área só
// sem nenhum erro no console e sem nenhum teste vermelho.
//
// O que este arquivo prende:
//   1. as duas áreas ficam lado a lado na barra, o tempo todo — nenhuma das
//      duas some quando a pessoa está na outra
//   2. a barra NÃO troca de conteúdo por área: ela mudar embaixo do dedo foi
//      a primeira versão disto, e o custo era perder o caminho de volta
//   3. "Dieta" e "Jiu-jitsu" acendem quando é a vez de cada um, e /dieta/peso
//      não acende dois ao mesmo tempo
//   4. o menu tem as três gavetas — Jiu-jitsu, Dieta, Pessoal — e a do lugar
//      onde a pessoa está já vem aberta
//   5. as três telas da dieta abrem sem erro de página
//   6. a tela de hoje diz o que falta em vez de mostrar caloria inventada,
//      quando ainda não há peso nem altura
//   7. o INÍCIO continua sendo o painel do treino. A dieta é uma área nova, não
//      uma sócia: se a tela de abertura deixar de ser o tatame, o app mudou de
//      assunto sem ninguém ter decidido isso
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

/* --- 1 e 2. a barra carrega as duas áreas, sempre ------------------------- */
await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);

const barraNoInicio = await rotulosDaBarra();
ver(
  "a barra tem Início, Jiu-jitsu, Dieta, Perfil e Menu",
  ["Início", "Jiu-jitsu", "Dieta", "Perfil", "Menu"].every((r) =>
    barraNoInicio.includes(r),
  ),
  barraNoInicio.join(" | "),
);

/* --- a porta de entrada -------------------------------------------------- */
await pagina.locator('nav.fixed.bottom-0 a[href="/dieta"]').click();
await pagina.waitForTimeout(1200);
ver("a aba Dieta leva para /dieta", new URL(pagina.url()).pathname === "/dieta", pagina.url());

const barraNaDieta = await rotulosDaBarra();
ver(
  "a barra NÃO troca de conteúdo ao entrar na dieta",
  barraNaDieta.join("|") === barraNoInicio.join("|"),
  `${barraNoInicio.join(" | ")}  ≠  ${barraNaDieta.join(" | ")}`,
);
ver(
  "o jiu-jitsu continua a um toque de distância de dentro da dieta",
  barraNaDieta.includes("Jiu-jitsu"),
  barraNaDieta.join(" | "),
);

/* --- 3. quem acende ------------------------------------------------------ */
const acesosEm = () =>
  pagina.evaluate(() =>
    [...document.querySelectorAll("nav.fixed.bottom-0 a")]
      .filter((a) => a.className.includes("text-primary"))
      .map((a) => a.textContent?.trim() ?? ""),
  );

let acesos = await acesosEm();
ver('em /dieta só "Dieta" acende', acesos.length === 1 && acesos[0] === "Dieta",
  `acesos: ${acesos.join(" | ") || "nenhum"}`);

/* --- 6. sem dado, a tela diz o que falta --------------------------------- */
const corpo = await pagina.locator("main").innerText();
ver(
  "sem peso e sem altura, a tela pede os dados em vez de inventar caloria",
  /Falta pouco/i.test(corpo),
  corpo.slice(0, 200).replace(/\n/g, " · "),
);
await pagina.screenshot({ path: "telas/dieta-hoje.png" });

await pagina.goto(`${BASE}/dieta/peso`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);
acesos = await acesosEm();
ver(
  'em /dieta/peso a aba acesa continua sendo só "Dieta"',
  acesos.length === 1 && acesos[0] === "Dieta",
  `acesos: ${acesos.join(" | ") || "nenhum"}`,
);
await pagina.screenshot({ path: "telas/dieta-peso.png" });

/* --- 4. as três gavetas do menu ------------------------------------------ */
await pagina.locator('button[aria-label="Abrir menu"]').click();
await pagina.waitForTimeout(600);

const gavetas = pagina.locator('aside[role="dialog"] nav button[aria-expanded]');
const nomes = await gavetas.allInnerTexts();
ver(
  "o menu tem as gavetas Jiu-jitsu, Dieta e Pessoal",
  (await gavetas.count()) === 3 &&
    /Jiu-jitsu/.test(nomes.join(" ")) &&
    /Dieta/.test(nomes.join(" ")) &&
    /Pessoal/.test(nomes.join(" ")),
  nomes.join(" | ").replace(/\n/g, " "),
);

const abertas = [];
for (let i = 0; i < 3; i++) {
  if ((await gavetas.nth(i).getAttribute("aria-expanded")) === "true") {
    abertas.push((await gavetas.nth(i).innerText()).split("\n")[0]);
  }
}
ver(
  "estando em /dieta/peso, é a gaveta da Dieta que já vem aberta",
  abertas.length === 1 && /Dieta/.test(abertas[0]),
  `abertas: ${abertas.join(" | ") || "nenhuma"}`,
);
await pagina.screenshot({ path: "telas/menu-gavetas.png" });
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(400);

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

/* --- o Início continua sendo o tatame ------------------------------------ */
// Esta é a asserção que guarda a identidade do app. A dieta é uma área NOVA,
// não uma sócia: se um dia a tela de abertura deixar de mostrar o painel do
// treino, o app deixou de ser sobre jiu-jitsu sem ninguém ter decidido isso.
await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);
const inicio = await pagina.locator("main").innerText();
ver(
  "o Início é o painel do treino, e não um índice das duas áreas",
  /Oss, guerreiro/i.test(inicio) &&
    /sequ[êe]ncia/i.test(inicio) &&
    !/saldo/i.test(inicio),
  inicio.replace(/\n/g, " · ").slice(0, 260),
);

/* --- a aba Jiu-jitsu é o índice da área ---------------------------------- */
await pagina.locator('nav.fixed.bottom-0 a[href="/jiu-jitsu"]').click();
await pagina.waitForTimeout(1400);
ver(
  "a aba Jiu-jitsu leva ao índice da área",
  new URL(pagina.url()).pathname === "/jiu-jitsu",
  pagina.url(),
);
const indice = await pagina.locator("main").innerText();
ver(
  "o índice lista as telas do tatame e o caminho de volta ao painel",
  /Painel do treino/i.test(indice) &&
    /Diário/.test(indice) &&
    /Graduação/.test(indice),
  indice.replace(/\n/g, " · ").slice(0, 240),
);

ver("sem erro de página em nenhuma das telas", erros.length === 0, erros.join(" ; "));

await navegador.close();

let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? `\n         → ${extra}` : ""}`);
}
process.exit(falhou ? 1 : 0);
