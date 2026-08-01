import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const TIERS = ["Branca", "Azul", "Roxa", "Marrom", "Preta", "Coral", "Vermelha"];
const conquistas = Array.from({ length: 1006 }, (_, i) => ({
  id: `id-${i}`,
  user_id: "u1",
  key: `k-${i}`,
  title: i === 500 ? "Agulha no palheiro" : `Conquista ${i}`,
  description: `Descrição da conquista ${i}`,
  tier: TIERS[i % 7],
  category: "geral",
  sort_order: i,
  unlocked: i % 10 === 0,
  unlocked_date: i % 10 === 0 ? "2026-01-01" : null,
  target: i % 3 === 0 ? 100 : null,
  progress: i % 3 === 0 ? 42 : 0,
  featured: false,
}));

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });

await ctx.addInitScript(
  ([ref]) => {
    localStorage.setItem(
      `sb-${ref}-auth-token`,
      JSON.stringify({
        access_token: "fake",
        refresh_token: "fake",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: "u1", email: "teste@exemplo.com", aud: "authenticated" },
      }),
    );
  },
  [REF],
);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e)));
pagina.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") erros.push(`${m.type()}: ${m.text().slice(0, 400)}`);
});

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const json = (body) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "teste@exemplo.com" });
  if (url.includes("/rest/v1/achievements")) return json(conquistas);
  if (url.includes("/rest/v1/profiles")) return json([{ user_id: "u1", seeded: true }]);
  return json([]);
});

await pagina.goto(`${BASE}/conquistas`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(800);
if (!pagina.url().includes("/conquistas")) {
  console.error("Redirecionou para", pagina.url());
  console.error((await pagina.locator("body").innerText()).slice(0, 300));
  await navegador.close();
  process.exit(1);
}

const cartoes = () => pagina.locator("details .rounded-2xl.flex").count();

await pagina.waitForTimeout(1200);
const inicial = await cartoes();
const corpo = await pagina.locator("body").innerText();
const resumo = corpo.match(/\d+\/\d+ conquistas/)?.[0] ?? `SEM RESUMO: ${corpo.slice(0, 200)}`;

// Abre uma faixa fechada e confere que as linhas entram no DOM sob demanda
const faixas = pagina.locator("details");
const qtdFaixas = await faixas.count();
if (qtdFaixas === 0) {
  console.error("Nenhuma faixa renderizada. Corpo:\n", corpo.slice(0, 500), "\nErros:", erros);
  await navegador.close();
  process.exit(1);
}
await faixas.nth(3).locator("summary").click();
await pagina.waitForTimeout(400);
const depoisDeAbrir = await cartoes();

// Busca
await pagina.getByPlaceholder("Buscar conquista…").fill("Agulha no palheiro");
await pagina.waitForTimeout(600);
const naBusca = await pagina.locator("text=Agulha no palheiro").count();

console.log(
  JSON.stringify(
    {
      resumo,
      faixas: qtdFaixas,
      cartoesNoCarregamento: inicial,
      cartoesAposAbrirUmaFaixa: depoisDeAbrir,
      achouNaBusca: naBusca,
      erros,
    },
    null,
    2,
  ),
);

await navegador.close();
