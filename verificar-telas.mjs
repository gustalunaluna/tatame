import { chromium } from "playwright";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const TIERS = ["Branca", "Azul", "Roxa", "Marrom", "Preta", "Coral", "Vermelha"];
const conquistas = Array.from({ length: 1006 }, (_, i) => ({
  id: `id-${i}`, user_id: "u1", key: `k-${i}`,
  title: `Conquista ${i}`, description: `Descrição ${i}`,
  tier: TIERS[i % 7], category: "geral", sort_order: i,
  unlocked: i % 10 === 0, unlocked_date: i % 10 === 0 ? "2026-01-01" : null,
  target: i % 3 === 0 ? 100 : null, progress: i % 3 === 0 ? 42 : 0, featured: i < 3,
}));
const treinos = Array.from({ length: 127 }, (_, i) => ({
  id: `t-${i}`, user_id: "u1",
  date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
  type: i % 2 ? "Gi" : "No-Gi", duration_min: 90, rolls: 5,
  partners: "Gui", techniques: "guarda fechada", notes: "boa aula",
}));
const pontos = Array.from({ length: 5 }, (_, i) => ({
  id: `w-${i}`, user_id: "u1", label: `Ponto ${i}`, score: 3,
  history: [
    { date: "2026-05-01", score: 2 },
    { date: "2026-06-01", score: 3 },
    { date: "2026-07-01", score: 4 },
  ],
}));

const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "fake", refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "u1", email: "teste@exemplo.com", aud: "authenticated" },
  }));
}, [REF]);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));
pagina.on("console", (m) => {
  if (m.type() === "error") erros.push(`console: ${m.text().slice(0, 200)}`);
});

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "teste@exemplo.com", aud: "authenticated" });
  if (url.includes("/rest/v1/achievements")) return json(conquistas);
  if (url.includes("/rest/v1/trainings")) return json(treinos);
  if (url.includes("/rest/v1/weak_points")) return json(pontos);
  if (url.includes("/rest/v1/rpc/achievement_stats")) return json({ total: 1006, unlocked: 101 });
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: "u1", seeded: true, nickname: "Gustavo", belt: "Branca", degrees: 3,
      master: "Gui", gym: "Bonsai", photo_url: "", birth_date: "2000-01-01",
      fights_won: 0, fights_lost: 0, goal_start: "2025-10-13" }]);
  if (url.includes("/rest/v1/analyses"))
    return json([{ id: "an-1", user_id: "u1", date: "2026-07-20", title: "Semana forte",
      content: "Texto da análise ".repeat(30), created_at: "2026-07-20T00:00:00Z" }]);
  if (url.includes("/rest/v1/techniques"))
    return json(Array.from({ length: 23 }, (_, i) => ({ id: `tec-${i}`, user_id: "u1",
      name: `Técnica ${i}`, category: "Guarda", notes: "", video_url: "", mastery: 3 })));
  if (url.includes("/rest/v1/plan_weeks"))
    return json(Array.from({ length: 8 }, (_, i) => ({ id: `p-${i}`, user_id: "u1",
      week: i + 1, focus: `Foco ${i + 1}`, items: [{ id: "i1", label: "Item", done: i < 3 }] })));
  return json([]);
});

const telas = ["/", "/diario", "/tecnicas", "/analises", "/plano", "/metas", "/conquistas", "/perfil"];
const resultado = [];

for (const tela of telas) {
  erros.length = 0;
  const t0 = Date.now();
  await pagina.goto(`${BASE}${tela}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(900);
  const corpo = await pagina.locator("body").innerText();
  resultado.push({
    tela,
    ms: Date.now() - t0,
    travou: corpo.includes("Algo travou"),
    nós: await pagina.evaluate(() => document.querySelectorAll("*").length),
    erros: [...new Set(erros)],
  });
}

console.log(JSON.stringify(resultado, null, 2));
await navegador.close();
