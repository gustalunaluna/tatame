// Confere que a tela Início lê o plano e a meta DE VERDADE, e não a tabela
// morta `plan_weeks` nem a faixa azul cravada no código.
//
// O truque do teste: o stub devolve dados propositalmente diferentes entre
// `plan_weeks` (o sistema velho) e `plan_cycles` (o novo). Se a tela ler o
// velho, o texto do ciclo não aparece — e o teste falha.
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

// 30 treinos de 90min = 45h → level 3 (passou o degrau de 25h, não o de 50h)
const treinos = Array.from({ length: 30 }, (_, i) => ({
  id: `t-${i}`, user_id: "u1",
  date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
  type: i % 2 ? "Gi" : "No-Gi", duration_min: 90, rolls: 5,
  partners: "", techniques: "", notes: "",
}));

const navegador = await abrirNavegador();
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

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rest/v1/trainings")) return json(treinos);
  if (url.includes("/rpc/achievement_stats")) return json({ total: 1006, unlocked: 140 });
  if (url.includes("/rpc/semear_conquistas")) return json(0);
  if (url.includes("/rpc/recalcular_conquistas")) return json(0);
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: "u1", seeded: true, nickname: "Gustavo", belt: "Branca",
      degrees: 3, master: "Gui", gym: "Bonsai", photo_url: "", birth_date: "2000-01-01",
      fights_won: 0, fights_lost: 0, goal_start: "2025-10-13" }]);

  // O sistema NOVO diz "Retenção ativa" / "Base e quadril"
  if (url.includes("/rest/v1/plan_cycles")) return json([
    { id: "c1", user_id: "u1", objective_slug: "retencao", nivel: "branca_avancada",
      titulo: "Retenção ativa", inicio: "2026-07-20", fim: "2026-08-16",
      nota_inicial: 2, nota_final: null, status: "ativo" },
  ]);
  if (url.includes("/rest/v1/plan_cycle_items")) return json([
    { id: "i1", cycle_id: "c1", user_id: "u1", semana: 1, foco: "Base e quadril",
      texto: "Item feito", alvo: 0, feito: 1, nota: "", ordem: 0 },
    { id: "i2", cycle_id: "c1", user_id: "u1", semana: 1, foco: "Base e quadril",
      texto: "Item aberto", alvo: 0, feito: 0, nota: "", ordem: 1 },
  ]);
  // O sistema VELHO diz "FOCO ANTIGO". Se isto aparecer na tela, é bug.
  if (url.includes("/rest/v1/plan_weeks")) return json([
    { id: "p1", user_id: "u1", week: 1, focus: "FOCO ANTIGO",
      items: [{ id: "x", label: "Item velho", done: false }] },
  ]);
  // Meta escolhida pelo usuário — nada de "Faixa Azul em 1 ano" fixo
  if (url.includes("/rest/v1/goals")) return json([
    { id: "g1", user_id: "u1", kind: "graduacao", title: "Faixa Roxa até 2029",
      target_belt: "Roxa", target_degrees: 0, event_name: "", target_number: null,
      target_date: "2029-01-01", status: "ativa", outcome: "" },
  ]);
  return json([]);
});

await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);
// `innerText` devolve o texto já com o `text-transform` do CSS aplicado, então
// os títulos vêm em caixa alta. Comparar sem diferenciar caixa evita um teste
// que falha por causa de estilo.
const texto = await pagina.locator("body").innerText();
const tem = (s) => texto.toLowerCase().includes(s.toLowerCase());

const checagens = [
  ["mostra o ciclo do sistema novo",        tem("Retenção ativa")],
  ["mostra o foco da semana do ciclo novo", tem("Base e quadril")],
  ["NÃO mostra a tabela morta plan_weeks",  !tem("FOCO ANTIGO")],
  ["mostra a meta escolhida pelo usuário",  tem("Faixa Roxa até 2029")],
  ["NÃO mostra a faixa azul cravada",       !tem("Faixa Azul em 1 ano")],
  ["level vem de horas, não de treinos",    /Level 3/i.test(texto)],
  ["mostra as horas de tatame",             tem("45h")],
  ["sem erro de página",                    erros.length === 0],
];

let falhou = false;
for (const [nome, ok] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok  " : "FALHA"}  ${nome}`);
}
if (erros.length) console.log("erros:", erros);
if (falhou) {
  console.log("\n--- texto da tela ---\n" + texto);
}

await navegador.close();
process.exit(falhou ? 1 : 0);
