// O check diário: o cardápio na tela de hoje.
//
// Este é o fluxo que o app inteiro existe para servir às sete da manhã, e é
// também o mais fácil de quebrar em silêncio — basta o vínculo
// `cardapio_item_id` deixar de ser enviado no POST e tudo continua parecendo
// funcionar: a refeição é gravada, a caloria entra no saldo, e só o check é que
// nunca mais aparece marcado. Nenhum erro no console.
//
// Por isso o teste não olha a tela: ele olha O QUE SAI NA REDE.
//
// O que prende:
//   1. o cardápio aparece na tela de hoje, agrupado por momento
//   2. cada item tem um alvo de toque para "comi" e um botão "Troquei"
//   3. marcar "comi" grava uma refeição IGUAL ao item, com o vínculo
//   4. o contador diz quantos itens do dia já foram resolvidos
//   5. o que foi comido fora do plano não some da tela
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));
const UID = G.perfil.user_id;

mkdirSync("telas", { recursive: true });

const CARDAPIO = [
  {
    id: "c1", user_id: UID, momento: "Café da manhã",
    alimento: "Ovos mexidos e pão integral", porcao: "3 ovos, 2 fatias",
    kcal: 340, proteina_g: 24, carboidrato_g: 22, gordura_g: 17, ordem: 0,
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "c2", user_id: UID, momento: "Almoço",
    alimento: "Arroz, feijão, patinho e salada", porcao: "1 prato",
    kcal: 640, proteina_g: 42, carboidrato_g: 78, gordura_g: 15, ordem: 0,
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "c3", user_id: UID, momento: "Pós-treino",
    alimento: "Whey com banana", porcao: "1 scoop + 1 unidade",
    kcal: 190, proteina_g: 25, carboidrato_g: 21, gordura_g: 2, ordem: 0,
    created_at: "2026-09-01T08:00:00Z",
  },
];

// Uma refeição solta, sem vínculo: o que ele comeu fora do plano.
const FORA = {
  id: "r-fora", user_id: UID, data: new Date().toISOString().slice(0, 10),
  momento: "Lanche da tarde", alimento: "Coxinha", porcao: "1 unidade",
  kcal: 230, proteina_g: 7, carboidrato_g: 24, gordura_g: 12,
  cardapio_item_id: null, created_at: new Date().toISOString(),
};

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 900 },
  deviceScaleFactor: 2,
});

await ctx.addInitScript(([ref, uid]) => {
  localStorage.setItem(
    `sb-${ref}-auth-token`,
    JSON.stringify({
      access_token: "f", refresh_token: "f",
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
      user: { id: uid, aud: "authenticated" },
    }),
  );
}, [REF, UID]);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

/** Tudo que a página tentou GRAVAR em refeicoes. É aqui que o teste mora. */
const gravados = [];

await pagina.route(`https://${REF}.supabase.co/**`, (r) => {
  const u = r.request().url();
  const metodo = r.request().method();
  const j = (b, status = 200) =>
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });

  if (u.includes("/rest/v1/refeicoes") && metodo === "POST") {
    try {
      gravados.push(JSON.parse(r.request().postData() ?? "{}"));
    } catch {
      gravados.push({ ilegivel: r.request().postData() });
    }
    return j([], 201);
  }

  if (u.includes("/auth/v1/user")) return j({ id: UID, aud: "authenticated" });
  if (u.includes("/rest/v1/profiles")) return j([G.perfil]);
  if (u.includes("/rest/v1/trainings")) return j(G.treinos);
  if (u.includes("/rest/v1/cardapio_itens")) return j(CARDAPIO);
  if (u.includes("/rest/v1/refeicoes")) return j([FORA]);
  if (u.includes("/rest/v1/perfil_da_dieta")) return j(null);
  if (u.includes("/rpc/achievement_stats")) return j(G.stats);
  if (u.includes("/rpc/semear_conquistas")) return j(0);
  if (u.includes("/rpc/recalcular_conquistas")) return j(0);
  return j([]);
});

const checagens = [];
const ver = (n, ok, extra) => checagens.push([n, ok, extra]);

await pagina.goto(`${BASE}/dieta`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1400);

const corpo = await pagina.locator("main").innerText();

/* --- 1. o cardápio está na tela ------------------------------------------ */
ver(
  "os três itens do cardápio aparecem na tela de hoje",
  CARDAPIO.every((i) => corpo.includes(i.alimento)),
  CARDAPIO.filter((i) => !corpo.includes(i.alimento)).map((i) => i.alimento).join(", "),
);
ver(
  "agrupados pelo momento do dia",
  corpo.includes("Café da manhã") && corpo.includes("Almoço") && corpo.includes("Pós-treino"),
);

/* --- 4. o contador -------------------------------------------------------- */
ver(
  "o contador começa em 0 de 3",
  /0\/3/.test(corpo),
  corpo.slice(0, 400).replace(/\n/g, " · "),
);

/* --- 5. o que ficou fora do plano ---------------------------------------- */
ver(
  "o que foi comido fora do cardápio continua visível",
  corpo.includes("Coxinha") && /Fora do cardápio/i.test(corpo),
  corpo.replace(/\n/g, " · ").slice(0, 500),
);

/* --- 2. os dois caminhos, com o mesmo peso ------------------------------- */
const checks = pagina.locator('button[aria-label^="Marcar que comeu"]');
const trocas = pagina.locator('button[aria-label^="Troquei"]');
ver("cada item tem um check", (await checks.count()) === 3, `checks: ${await checks.count()}`);
ver(
  "cada item tem um 'Troquei' — trocar não pode ser mais difícil que confirmar",
  (await trocas.count()) === 3,
  `trocas: ${await trocas.count()}`,
);

// O alvo do dedo precisa ter tamanho de dedo: 44px é o mínimo que Apple e
// Google pedem, e um check de 24px num app que se usa de manhã cedo erra.
const caixa = await checks.first().boundingBox();
ver(
  "o check tem tamanho de toque (>= 40px)",
  !!caixa && caixa.width >= 40 && caixa.height >= 40,
  caixa ? `${caixa.width.toFixed(0)}×${caixa.height.toFixed(0)}` : "sem caixa",
);

await pagina.screenshot({ path: "telas/dieta-cardapio-do-dia.png", fullPage: true });

/* --- 3. marcar "comi" grava a refeição CERTA ----------------------------- */
await checks.nth(1).click(); // o almoço
await pagina.waitForTimeout(1200);

ver("marcar 'comi' grava uma refeição", gravados.length === 1, `gravou ${gravados.length}`);

const gravado = gravados[0] ?? {};
ver(
  "a refeição gravada é IGUAL ao item do cardápio",
  gravado.alimento === CARDAPIO[1].alimento && gravado.kcal === CARDAPIO[1].kcal,
  JSON.stringify(gravado),
);
// A asserção que importa: sem este campo tudo parece funcionar e o check nunca
// mais aparece marcado.
ver(
  "e carrega o vínculo com o item — é ele que faz o check existir",
  gravado.cardapio_item_id === "c2",
  `cardapio_item_id: ${String(gravado.cardapio_item_id)}`,
);
ver(
  "no momento certo do dia",
  gravado.momento === "Almoço",
  String(gravado.momento),
);

ver("sem erro de página", erros.length === 0, erros.join(" ; "));

await navegador.close();

let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? `\n         → ${extra}` : ""}`);
}
process.exit(falhou ? 1 : 0);
