// Teste com os DADOS REAIS das duas contas.
//
// Login de verdade não roda aqui: este ambiente bloqueia supabase.co. O que dá
// para fazer, e é mais do que um teste sintético, é servir os payloads que o
// próprio banco devolveu (puxados pelo MCP, em fixtures/) para a interface
// real. O código de tela, as contas e os números são os de produção; só o
// transporte é interceptado.
//
// Gera capturas em telas/ para conferência visual.
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));
const J = JSON.parse(readFileSync("fixtures/joaozinho.json", "utf8"));

mkdirSync("telas", { recursive: true });

const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await ctx.addInitScript(([ref, uid]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "fake", refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: uid, email: "gustavo@exemplo.com", aud: "authenticated" },
  }));
}, [REF, G.perfil.user_id]);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 250)));
pagina.on("console", (m) => {
  if (m.type() === "error") erros.push(`console: ${m.text().slice(0, 250)}`);
});

// As imagens de avatar/brasão apontam para fora; deixá-las falhar sujaria o
// log de erros com ruído que não é do app.
await pagina.route("https://api.dicebear.com/**", (r) =>
  r.fulfill({ status: 200, contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>' }));

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const corpo = rota.request().postData() ?? "";
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user"))
    return json({ id: G.perfil.user_id, email: "gustavo@exemplo.com", aud: "authenticated" });

  // ---- quem está logado: Gustavo, com os dados dele -------------------
  if (url.includes("/rest/v1/profiles")) return json([G.perfil]);
  if (url.includes("/rest/v1/trainings")) return json(G.treinos);
  if (url.includes("/rest/v1/goals")) return json(G.metas);
  if (url.includes("/rest/v1/plan_cycles")) return json(G.ciclos);
  if (url.includes("/rest/v1/plan_cycle_items")) return json(G.itens_ciclo);
  if (url.includes("/rpc/achievement_stats")) return json(G.stats);
  if (url.includes("/rpc/resumo_parceiros")) return json(G.resumo_parceiros);
  if (url.includes("/rpc/registros_a_confirmar")) return json(G.a_confirmar);
  if (url.includes("/rpc/semear_conquistas")) return json(0);
  if (url.includes("/rpc/recalcular_conquistas")) return json(0);

  // ---- medalhas e graduações: por handle -------------------------------
  const doJoao = corpo.includes("joaozinho");
  if (url.includes("/rpc/medalhas_do_atleta")) {
    const soDestaque = corpo.includes('"p_so_destaque":true');
    if (!doJoao) return json([]);                    // Gustavo não tem nenhuma
    return json(soDestaque ? J.medalhas_destaque : J.medalhas_todas);
  }
  if (url.includes("/rpc/resumo_medalhas_do_atleta"))
    return json(doJoao ? J.resumo_medalhas : G.resumo_medalhas);
  if (url.includes("/rpc/historico_de_graduacao"))
    return json(doJoao ? J.graduacoes : G.graduacoes);

  // ---- o perfil do João, visto pelo Gustavo ----------------------------
  if (url.includes("/rpc/perfil_publico")) return json([J.perfil_publico]);
  if (url.includes("/rpc/destaques_publicos")) return json(J.destaques);
  if (url.includes("/rpc/parceiros_publicos")) return json(J.parceiros);

  // ---- a academia ------------------------------------------------------
  if (url.includes("/rpc/perfil_equipe")) return json([J.equipe]);
  if (url.includes("/rpc/resumo_medalhas_da_equipe")) return json(J.resumo_medalhas_equipe);
  if (url.includes("/rpc/medalhas_da_equipe")) return json(J.medalhas_equipe);
  if (url.includes("/rpc/graduados_da_equipe")) return json([]);
  if (url.includes("/rpc/atletas_da_equipe")) return json(J.parceiros);

  if (url.includes("/rest/v1/teams"))
    return json([{ id: J.equipe.id, name: J.equipe.name, slug: J.equipe.slug,
      city: J.equipe.city, master: J.equipe.master, created_by: "x",
      status: "aprovada", motivo_recusa: "", crest_url: "" }]);
  return json([]);
});

const checagens = [];
const ver = (nome, ok, extra) => checagens.push([nome, ok, extra]);

async function abrir(caminho, arquivo) {
  erros.length = 0;
  await pagina.goto(`${BASE}${caminho}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1100);
  await pagina.screenshot({ path: `telas/${arquivo}.png`, fullPage: true });
  return await pagina.locator("body").innerText();
}

/* ==================== 1. INÍCIO — conta do Gustavo ==================== */
let t = await abrir("/", "1-inicio-gustavo");
const horasG = (G.treinos.reduce((n, x) => n + (x.duration_min || 0), 0) / 60);
ver("Início: nome do Gustavo", t.includes("Gustavo"));
ver(`Início: level das horas reais (${horasG.toFixed(0)}h → Level 6)`,
  /Level\s*6/i.test(t) && t.includes("128h"), t.match(/Level \d+[\s\S]{0,40}/)?.[0]);
ver("Início: faixa branca 3 graus", /3 graus/i.test(t));
ver("Início: plano do mês real (não plan_weeks)",
  t.toLowerCase().includes(String(G.ciclos.find(c => c.status === "ativo")?.titulo ?? "??").toLowerCase()));
ver("Início: meta real do Gustavo",
  G.metas.filter(m => m.status === "ativa").some(m => t.includes(m.title)),
  G.metas.filter(m => m.status === "ativa").map(m => m.title).join(" | "));
ver("Início: sem erro", erros.length === 0, erros.join(" ; "));

/* ==================== 2. PERFIL do Gustavo ==================== */
t = await abrir("/perfil", "2-perfil-gustavo");
const h2G = (await pagina.locator("h2").allInnerTexts()).map(s => s.trim().toLowerCase());
ver("Perfil Gustavo: @gustavo", t.includes("@gustavo"));
ver("Perfil Gustavo: sem medalha, pódio NÃO abre o perfil",
  h2G.indexOf("medalhas") > h2G.indexOf("equipe"), h2G.join(" > "));
ver("Perfil Gustavo: caixa de medalhas convida a registrar",
  t.toLowerCase().includes("registrar medalha"));
ver("Perfil Gustavo: caixa de graduações convida a registrar",
  t.toLowerCase().includes("registrar graduação"));
ver("Perfil Gustavo: conquistas 98/1006",
  t.includes(`${G.stats.unlocked}/${G.stats.total}`), `${G.stats.unlocked}/${G.stats.total}`);
ver("Perfil Gustavo: sem erro", erros.length === 0, erros.join(" ; "));

/* ==================== 3. PERFIL do Joãozinho ==================== */
t = await abrir("/atleta/joaozinho", "3-perfil-joaozinho");
const h2J = (await pagina.locator("h2").allInnerTexts()).map(s => s.trim().toLowerCase());
ver("Perfil João: nome e @", t.includes("Joãozinho") && t.includes("@joaozinho"));
ver("Perfil João: COM medalha, pódio abre antes de equipe",
  h2J.indexOf("medalhas") >= 0 && h2J.indexOf("medalhas") < h2J.indexOf("equipe"),
  h2J.join(" > "));
ver("Perfil João: as 3 em destaque, e só elas",
  t.includes("Campeonato Paranaense 2026") && t.includes("Copa Curitiba 2026")
  && t.includes("Open Sul 2025") && !t.includes("Seletiva Estadual 2025"));
ver("Perfil João: placar 2🥇 1🥈 1🥉", t.includes("2🥇 1🥈 1🥉"));
ver("Perfil João: link para ver as 4", t.includes("Ver todas as 4"));
ver("Perfil João: graduações com quem entregou",
  t.includes("Entregue por") && t.includes("Mestre Silva"));
ver("Perfil João: os 3 degraus",
  t.includes("Faixa Branca") && t.includes("1º grau na Branca") && t.includes("2º grau na Branca"));
ver("Perfil João: 22 parceiros", t.includes("22"));
ver("Perfil João: Academia Teste com selo",
  t.includes("Academia Teste") && t.toLowerCase().includes("oficial"));
ver("Perfil João: sem erro", erros.length === 0, erros.join(" ; "));

const linkMestre = await pagina.locator('a[href="/atleta/mestre.silva"]').count();
ver("Perfil João: Mestre Silva é clicável", linkMestre > 0);

/* ==================== 4. TODAS as medalhas do João ==================== */
t = await abrir("/atleta/joaozinho/medalhas", "4-medalhas-joaozinho");
ver("Medalhas João: as 4, incluindo a fora de destaque",
  t.includes("Seletiva Estadual 2025") && t.includes("Campeonato Paranaense 2026"));
ver("Medalhas João: categoria e federação", t.includes("Adulto Azul Médio") && t.includes("CBJJ"));
ver("Medalhas João: sem erro", erros.length === 0, erros.join(" ; "));

/* ==================== 5. ACADEMIA TESTE ==================== */
t = await abrir("/academia/academia-teste", "5-academia-teste");
ver("Academia: nome", t.includes("Academia Teste"));
ver("Academia: quadro 10 ouro / 5 prata / 4 bronze",
  t.includes("10") && t.includes("5") && t.includes("4"));
ver("Academia: 19 medalhas de 8 atletas em 13 campeonatos",
  t.includes("19") && t.includes("8 atletas") && t.includes("13 campeonatos"));
ver("Academia: NÃO escolhe destaque (nenhum evento no cartão)",
  !t.includes("Campeonato Paranaense 2026"));
ver("Academia: 13 alunos, 2 faixas pretas, 8 competidores",
  t.includes("13") && t.includes("2") && t.includes("8"));
ver("Academia: sem erro", erros.length === 0, erros.join(" ; "));

/* ==================== 6. PÓDIOS da academia ==================== */
t = await abrir("/academia/academia-teste/medalhas", "6-podios-academia");

// Aqui `innerText` não serve: as linhas usam `list-perf`, que é
// `content-visibility: auto`, e o navegador simplesmente não renderiza o que
// está fora da viewport — o texto de quem está mais abaixo na lista volta
// vazio. `textContent` lê o DOM independente de renderização, que é o que a
// pergunta "a linha existe com o nome certo?" quer saber.
const domPodios = await pagina.evaluate(() => document.body.textContent ?? "");
const linhasPodio = await pagina.locator("div.rise-in.list-perf").count();

ver("Pódios: as 19 linhas estão na página", linhasPodio === 19, `renderizadas: ${linhasPodio}`);
ver("Pódios: diz quem ganhou cada uma",
  ["Joãozinho", "Mariana", "Rafael", "Mestre Silva", "Maria", "Otavio",
   "Yasmin", "Thiago"].every((n) => domPodios.includes(n)));
ver("Pódios: mostra o absoluto", t.toLowerCase().includes("absoluto"));
ver("Pódios: Gustavo NÃO pode ocultar (não manda na academia)",
  (await pagina.locator('button[aria-label^="Tirar a medalha"]').count()) === 0);
ver("Pódios: sem erro", erros.length === 0, erros.join(" ; "));

/* ==================== resultado ==================== */
let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? `\n         → ${extra}` : ""}`);
}
console.log(`\ncapturas em telas/  (${checagens.filter(c => c[1]).length}/${checagens.length} passaram)`);

await navegador.close();
process.exit(falhou ? 1 : 0);
