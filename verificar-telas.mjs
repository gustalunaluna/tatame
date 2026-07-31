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
  if (url.includes("/rpc/resumo_parceiros")) return json([
    { partner_id: "u2", partner_name: "", sessoes: 12, rolls: 40, subs_for: 9, subs_against: 4, pendentes: 1, ultimo_treino: "2026-07-28" },
    { partner_id: null, partner_name: "Pedro da academia", sessoes: 5, rolls: 11, subs_for: 1, subs_against: 7, pendentes: 0, ultimo_treino: "2026-07-20" },
  ]);
  if (url.includes("/rpc/registros_a_confirmar")) return json([
    { id: "r1", autor_id: "u2", autor_handle: "joaozinho123", autor_nickname: "Joãozinho",
      data: "2026-07-29", rolls: 5, subs_for: 3, subs_against: 1 },
  ]);
  if (url.includes("/rpc/cartao_publico")) return json([
    { user_id: "u2", handle: "joaozinho123", nickname: "Joãozinho", belt: "Branca", degrees: 2, gym: "Bonsai", photo_url: "" },
  ]);
  if (url.includes("/rpc/membros_da_equipe")) return json([
    { user_id: "u1", handle: "gustavo", nickname: "Gustavo", belt: "Branca", degrees: 3, photo_url: "", role: "dono", status: "ativo" },
    { user_id: "u2", handle: "joaozinho123", nickname: "Joãozinho", belt: "Branca", degrees: 2, photo_url: "", role: "membro", status: "ativo" },
  ]);
  if (url.includes("/rest/v1/partnerships")) return json([
    { id: "p1", requester_id: "u1", addressee_id: "u2", status: "aceito", created_at: "2026-07-01" },
  ]);
  if (url.includes("/rest/v1/teams")) return json([
    { id: "e1", name: "Bonsai Jiu-Jitsu", slug: "bonsai-jiu-jitsu", city: "Curitiba",
      master: "Gui", created_by: "u1", status: "aprovada", motivo_recusa: "" },
  ]);
  if (url.includes("/rest/v1/team_members")) return json([
    { team_id: "e1", user_id: "u1", role: "dono", status: "ativo" },
  ]);
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
  if (url.includes("/rpc/objetivos_disponiveis")) return json([
    { slug: "retencao", nome: "Retenção de guarda", descricao: "Parar de ser passado.", tem_conteudo: true, nivel_usado: "branca_avancada" },
    { slug: "passagem", nome: "Passagem de guarda", descricao: "Passar com pressão.", tem_conteudo: true, nivel_usado: "branca_avancada" },
  ]);
  if (url.includes("/rest/v1/goals")) return json([
    { id: "g1", user_id: "u1", kind: "graduacao", title: "Faixa Azul", target_belt: "Azul",
      target_degrees: 0, event_name: "", target_number: null, target_date: "2026-10-13",
      status: "ativa", outcome: "" },
  ]);
  if (url.includes("/rest/v1/plan_cycles")) return json([
    { id: "c1", user_id: "u1", objective_slug: "retencao", template_id: "t1", nivel: "branca_avancada",
      titulo: "Retenção ativa", inicio: "2026-07-20", fim: "2026-08-16",
      nota_inicial: 2, nota_final: null, status: "ativo" },
  ]);
  if (url.includes("/rest/v1/plan_cycle_items")) return json(
    Array.from({ length: 16 }, (_, i) => ({
      id: `pi-${i}`, cycle_id: "c1", user_id: "u1", semana: Math.floor(i / 4) + 1,
      foco: `Foco ${Math.floor(i / 4) + 1}`, texto: `Item ${i}`,
      alvo: i % 3 === 0 ? 3 : 0, feito: i % 2, nota: "", ordem: i,
    })));
  if (url.includes("/rest/v1/plan_weeks"))
    return json(Array.from({ length: 8 }, (_, i) => ({ id: `p-${i}`, user_id: "u1",
      week: i + 1, focus: `Foco ${i + 1}`, items: [{ id: "i1", label: "Item", done: i < 3 }] })));
  return json([]);
});

const telas = ["/", "/diario", "/tecnicas", "/analises", "/plano", "/metas", "/conquistas", "/parceiros", "/equipe", "/perfil", "/minhas-medalhas"];
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
