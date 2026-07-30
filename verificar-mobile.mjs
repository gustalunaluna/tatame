/**
 * Verificação mobile: simula um aparelho com entalhe sobrescrevendo as
 * variáveis de área segura (o Chromium headless não expõe env() de verdade).
 * Confere que nada do app fica escondido atrás da barra de status nem da
 * barra inferior, e tira as capturas para conferência visual.
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4185";
const SAIDA = "capturas-mobile";
mkdirSync(SAIDA, { recursive: true });

// Entalhe do iPhone 14/15: 47px em cima, 34px de faixa de gestos embaixo.
const ENTALHE = `:root {
  --safe-t: 47px !important;
  --safe-b: 34px !important;
}
/* Faixas vermelhas marcam a zona proibida — se algo do app aparecer por
   baixo delas nas capturas, está escondido no aparelho de verdade. */
body::before, body::after {
  content: ""; position: fixed; left: 0; right: 0;
  background: rgba(255,0,0,0.28); z-index: 99999; pointer-events: none;
}
body::before { top: 0; height: 47px; }
body::after  { bottom: 0; height: 34px; }`;

const TIERS = ["Branca", "Azul", "Roxa", "Marrom", "Preta", "Coral", "Vermelha"];
const dados = {
  achievements: Array.from({ length: 1006 }, (_, i) => ({
    id: `id-${i}`, user_id: "u1", key: `k-${i}`, title: `Conquista ${i}`,
    description: `Descrição ${i}`, tier: TIERS[i % 7], category: "geral",
    sort_order: i, unlocked: i % 10 === 0, unlocked_date: null,
    target: null, progress: 0, featured: i < 3,
  })),
  trainings: Array.from({ length: 40 }, (_, i) => ({
    id: `t-${i}`, user_id: "u1",
    date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    type: i % 2 ? "Gi" : "No-Gi", duration_min: 90, rolls: 5,
    partners: "Gui", techniques: "guarda fechada", notes: "boa aula",
  })),
  profiles: [{
    user_id: "u1", seeded: true, nickname: "Gustavo", belt: "Branca", degrees: 3,
    master: "Gui", gym: "Bonsai", photo_url: "", birth_date: "2000-01-01",
    fights_won: 0, fights_lost: 0, goal_start: "2025-10-13",
  }],
};

const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await navegador.newContext({ ...devices["iPhone 13"], isMobile: true, hasTouch: true });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "fake", refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "u1", email: "t@e.com", aud: "authenticated" },
  }));
}, [REF]);

const pagina = await ctx.newPage();
await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rpc/achievement_stats")) return json({ total: 1006, unlocked: 101 });
  for (const [tabela, linhas] of Object.entries(dados)) {
    if (url.includes(`/rest/v1/${tabela}`)) return json(linhas);
  }
  return json([]);
});

const SAFE_T = 47, SAFE_B = 34;
const resultado = [];

async function medir(nome, rotulo) {
  // Menor distância entre o topo da barra de status e qualquer texto do app
  return pagina.evaluate(([t, b]) => {
    const alturaVisivel = window.innerHeight;
    let piorTopo = Infinity, piorBase = Infinity, culpadoTopo = "", culpadoBase = "";
    for (const el of document.querySelectorAll("h1, h2, p, span, a, button, input, label")) {
      if (el.closest("[aria-hidden='true']")) continue;
      const texto = (el.textContent ?? "").trim();
      if (!texto) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // ignora o que está fora da tela por rolagem, não por corte
      if (r.bottom < 0 || r.top > alturaVisivel) continue;
      const fixo = getComputedStyle(el).position === "fixed" ||
        !!el.closest("nav[style*='z-nav'], [role='dialog'], .fixed");
      const folgaTopo = r.top - t;
      if (folgaTopo < piorTopo) { piorTopo = folgaTopo; culpadoTopo = texto.slice(0, 30); }
      if (fixo) {
        const folgaBase = alturaVisivel - b - r.bottom;
        if (folgaBase < piorBase) { piorBase = folgaBase; culpadoBase = texto.slice(0, 30); }
      }
    }
    return { piorTopo: Math.round(piorTopo), culpadoTopo, piorBase: Math.round(piorBase), culpadoBase };
  }, [SAFE_T, SAFE_B]).then((m) => {
    resultado.push({ tela: rotulo, ...m });
    return m;
  });
}

for (const [rota, nome] of [["/", "inicio"], ["/diario", "diario"], ["/conquistas", "conquistas"], ["/perfil", "perfil"]]) {
  await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
  await pagina.addStyleTag({ content: ENTALHE });
  await pagina.waitForTimeout(700);
  await medir(nome, rota);
  await pagina.screenshot({ path: `${SAIDA}/${nome}.png` });
}

// Menu lateral aberto
await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.addStyleTag({ content: ENTALHE });
await pagina.waitForTimeout(500);
await pagina.getByRole("button", { name: "Abrir menu" }).click();
await pagina.waitForTimeout(600);
await medir("menu", "menu lateral");
await pagina.screenshot({ path: `${SAIDA}/menu.png` });

// Caixa de novo treino (a que não cabia na tela)
await pagina.goto(`${BASE}/diario`, { waitUntil: "networkidle" });
await pagina.addStyleTag({ content: ENTALHE });
await pagina.waitForTimeout(500);
await pagina.getByRole("button", { name: /Novo/ }).click();
await pagina.waitForTimeout(600);
const caixa = await pagina.locator("[role='dialog']").first().boundingBox();
const alturaTela = pagina.viewportSize().height;
await pagina.screenshot({ path: `${SAIDA}/novo-treino.png` });

console.log(JSON.stringify({
  folgas: resultado,
  caixaNovoTreino: {
    topo: Math.round(caixa.y),
    base: Math.round(caixa.y + caixa.height),
    alturaTela,
    cabeNaTela: caixa.y >= 0 && caixa.y + caixa.height <= alturaTela,
  },
}, null, 2));

await navegador.close();
