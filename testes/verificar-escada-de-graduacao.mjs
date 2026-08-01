/**
 * A escada de graduação.
 *
 * Depois da preta não existe faixa nova: existe a mesma faixa-preta com mais
 * graus, e a partir do sétimo o grau muda a cor do tecido em vez de
 * acrescentar listra. A vermelha é o 9º grau de preta, não uma faixa que
 * recomeça a contagem.
 *
 * O app errava isso em três lugares, e os três estão cobertos aqui:
 *   1. desenhava listras de grau na coral e na vermelha
 *   2. oferecia "0 a 4 graus" para todas as faixas, inclusive as duas
 *   3. não oferecia o 5º e o 6º grau de preta, que existem
 */
import { chromium } from "playwright";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const perfilDe = (belt, degrees) => ({
  user_id: "x", handle: "teste", nickname: "Teste", bio: "", belt, degrees,
  photo_url: "", verificado: false, idade: null, gym: "", master: "",
  team_id: null, team_name: "", team_crest: "", team_status: "", team_slug: "",
  master_handle: "", master_nickname: "", fights_won: 0, fights_lost: 0,
  treinos: 0, parceiros: 0, conquistas_total: 0, conquistas_feitas: 0,
  sou_eu: false, e_meu_parceiro: false, papel: "", instrutor: false, mestres: 0,
});

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "f", refresh_token: "f",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "00000000-0000-0000-0000-0000000000ff", aud: "authenticated" },
  }));
}, [REF]);

const p = await ctx.newPage();
let perfilAtual = perfilDe("Vermelha", 9);
await p.route(`https://${REF}.supabase.co/**`, (r) => {
  const u = r.request().url();
  const json = (x) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(x) });
  if (u.includes("/auth/v1/user"))
    return json({ id: "00000000-0000-0000-0000-0000000000ff", aud: "authenticated" });
  if (u.includes("/rpc/perfil_publico")) return json([perfilAtual]);
  return json([]);
});

/**
 * Conta as listras brancas desenhadas dentro da faixa.
 *
 * A ponteira é um bloco escuro com listras brancas dentro. Contar os filhos
 * dela é o que separa "a faixa tem grau desenhado" de "não tem".
 */
async function listrasNaFaixa(rotulo) {
  return p.locator(`[role="img"][aria-label="${rotulo}"] > div:nth-child(2) > span`).count();
}

/* --- 1. coral e vermelha não carregam listra ----------------------------- */
for (const [belt, degrees] of [["Vermelha", 9], ["Vermelha", 10], ["Coral", 7], ["Coral", 8]]) {
  perfilAtual = perfilDe(belt, degrees);
  await p.goto(`${BASE}/atleta/teste`, { waitUntil: "load" });
  await p.waitForTimeout(700);

  const listras = await listrasNaFaixa(`Faixa ${belt} ${degrees}º grau`);
  conferir(
    `${belt} ${degrees}º grau não tem listra desenhada`,
    listras === 0,
    `desenhou ${listras}`,
  );

  const texto = await p.locator("body").evaluate((el) => el.textContent ?? "");
  conferir(
    `${belt} ${degrees}º grau é anunciado com o grau certo`,
    texto.includes(`${degrees}º grau`),
    texto.slice(0, 160),
  );
  conferir(
    `${belt} ${degrees}º grau não vira "${belt} 4 graus"`,
    !texto.includes(`${belt} · 4 graus`) && !texto.includes("4 graus"),
  );
}

/* --- 2. as faixas com listra continuam com listra ------------------------ */
for (const [belt, degrees, esperado] of [
  ["Branca", 2, 2],
  ["Azul", 4, 4],
  ["Preta", 3, 3],
  // A ponteira só comporta quatro; o texto ao lado diz o número de verdade.
  ["Preta", 6, 4],
]) {
  perfilAtual = perfilDe(belt, degrees);
  await p.goto(`${BASE}/atleta/teste`, { waitUntil: "load" });
  await p.waitForTimeout(700);

  const listras = await listrasNaFaixa(`Faixa ${belt} ${degrees}${belt === "Preta" ? "º grau" : degrees === 1 ? " grau" : " graus"}`);
  conferir(
    `${belt} ${degrees} desenha ${esperado} listra(s)`,
    listras === esperado,
    `desenhou ${listras}`,
  );
}

/* --- 3. o 6º grau de preta é dito por extenso ---------------------------- */
perfilAtual = perfilDe("Preta", 6);
await p.goto(`${BASE}/atleta/teste`, { waitUntil: "load" });
await p.waitForTimeout(700);
const t = await p.locator("body").evaluate((el) => el.textContent ?? "");
conferir("preta 6º grau é anunciada como 6º, não como 4", t.includes("6º grau"), t.slice(0, 160));

// E preta 4º grau em diante é Mestre; até o 3º, Professor.
conferir("preta 6º grau é Mestre", t.includes("Mestre"), t.slice(0, 200));

perfilAtual = perfilDe("Preta", 2);
await p.goto(`${BASE}/atleta/teste`, { waitUntil: "load" });
await p.waitForTimeout(700);
const t2 = await p.locator("body").evaluate((el) => el.textContent ?? "");
conferir("preta 2º grau é Professor, não Mestre", t2.includes("Professor"), t2.slice(0, 200));

perfilAtual = perfilDe("Vermelha", 9);
await p.goto(`${BASE}/atleta/teste`, { waitUntil: "load" });
await p.waitForTimeout(700);
const t3 = await p.locator("body").evaluate((el) => el.textContent ?? "");
conferir("vermelha 9º grau é Grão-Mestre", t3.includes("Grão-Mestre"), t3.slice(0, 200));

await b.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
