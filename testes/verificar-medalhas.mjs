// Medalhas: perfil próprio, perfil de outro atleta, perfil da academia e as
// três listas. O que este teste garante, além de "não quebrou":
//
//   - o perfil de pessoa mostra no máximo 3 medalhas em destaque
//   - o perfil da academia NÃO escolhe 3: mostra o total por colocação
//   - a lista da academia diz quem ganhou cada medalha
//   - o botão de ocultar só aparece para quem manda na academia
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const medalha = (i, colocacao, evento, destaque) => ({
  id: `m-${i}`, colocacao, evento, categoria: "Adulto Azul Médio",
  federacao: "CBJJ", modalidade: "Gi", data: `2026-0${(i % 9) + 1}-10`,
  absoluto: i === 0, destaque, team_slug: "academia-teste",
  team_nome: "Academia Teste", team_crest: "", sou_dono: true,
});

// 7 medalhas, 3 delas em destaque
const minhas = [
  medalha(0, "ouro", "Campeonato Paranaense 2026", true),
  medalha(1, "prata", "Copa Curitiba 2026", true),
  medalha(2, "bronze", "Open Sul 2025", true),
  medalha(3, "ouro", "Seletiva Estadual 2025", false),
  medalha(4, "ouro", "Torneio de Inverno 2025", false),
  medalha(5, "prata", "Copa Bonsai 2024", false),
  medalha(6, "bronze", "Interno 2024", false),
];

const daEquipe = minhas.map((m, i) => ({
  id: m.id, colocacao: m.colocacao, evento: m.evento, categoria: m.categoria,
  federacao: m.federacao, modalidade: m.modalidade, data: m.data,
  absoluto: m.absoluto,
  atleta_handle: i % 2 ? "joaozinho" : "mariana",
  atleta_nome: i % 2 ? "Joãozinho" : "Mariana",
  atleta_foto: "", atleta_faixa: "Azul", atleta_graus: 1,
  // só nas duas primeiras, para provar que o botão segue o campo
  posso_ocultar: i < 2,
}));

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "fake", refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "u1", email: "t@e.com", aud: "authenticated" },
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
  const corpo = rota.request().postData() ?? "";
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rpc/semear_conquistas")) return json(0);
  if (url.includes("/rpc/recalcular_conquistas")) return json(0);
  if (url.includes("/rpc/achievement_stats")) return json({ total: 1006, unlocked: 140 });
  if (url.includes("/rpc/meu_handle")) return json("joaozinho");

  if (url.includes("/rpc/medalhas_do_atleta")) {
    const soDestaque = corpo.includes('"p_so_destaque":true');
    return json(soDestaque ? minhas.filter((m) => m.destaque) : minhas);
  }
  if (url.includes("/rpc/resumo_medalhas_do_atleta"))
    return json({ ouro: 3, prata: 2, bronze: 2, total: 7 });
  if (url.includes("/rpc/resumo_medalhas_da_equipe"))
    return json({ ouro: 26, prata: 23, bronze: 11, total: 60, atletas: 8, eventos: 12 });
  if (url.includes("/rpc/medalhas_da_equipe")) return json(daEquipe);

  if (url.includes("/rpc/perfil_publico"))
    return json([{ user_id: "u2", questionario_em: "2026-07-30T01:32:14.123065+00:00", handle: "joaozinho", nickname: "Joãozinho",
      belt: "Azul", degrees: 1, bio: "", photo_url: "", idade: 26,
      gym: "Academia Teste", master: "Mestre Silva", verificado: false,
      equipe_oficial: true, team_slug: "academia-teste", master_handle: "",
      master_nickname: "Mestre Silva", parceiros: 20, treinos: 39,
      conquistas_feitas: 40, conquistas_total: 1006, sou_parceiro: true }]);
  if (url.includes("/rpc/perfil_equipe"))
    return json([{ id: "e1", name: "Academia Teste", slug: "academia-teste",
      city: "Curitiba", master: "Mestre Silva", crest_url: "", status: "aprovada",
      criada_em: "2020-01-01", alunos: 24, faixas_pretas: 3, competidores: 8,
      titulos: 26, vitorias: 0, derrotas: 0, sou_membro: true, sou_dono: false,
      meu_status: "ativo" }]);
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: "u1", questionario_em: "2026-07-30T01:32:14.123065+00:00", seeded: true, nickname: "Gustavo", belt: "Branca",
      degrees: 3, handle: "gustavo", master: "Gui", gym: "Academia Teste",
      photo_url: "", birth_date: "2000-01-01", fights_won: 0, fights_lost: 0,
      goal_start: "2025-10-13" }]);
  if (url.includes("/rest/v1/teams"))
    return json([{ id: "e1", name: "Academia Teste", slug: "academia-teste",
      city: "Curitiba", master: "Mestre Silva", created_by: "u9",
      status: "aprovada", motivo_recusa: "", crest_url: "" }]);
  return json([]);
});

const checagens = [];
const ver = (nome, ok) => checagens.push([nome, ok]);

async function abrir(caminho) {
  erros.length = 0;
  await pagina.goto(`${BASE}${caminho}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(900);
  return (await pagina.locator("body").innerText()).toLowerCase();
}

// --- 1. Perfil de outra pessoa: no máximo 3 em destaque -------------------
let t = await abrir("/atleta/joaozinho");
ver("perfil do atleta mostra as 3 em destaque",
  t.includes("paranaense") && t.includes("curitiba") && t.includes("open sul"));
ver("perfil do atleta NÃO despeja as 7",
  !t.includes("torneio de inverno") && !t.includes("interno 2024"));
ver("perfil do atleta oferece ver todas", t.includes("ver todas as 7"));
ver("perfil do atleta sem erro", erros.length === 0);

// --- 2. Lista completa de um atleta --------------------------------------
t = await abrir("/atleta/joaozinho/medalhas");
ver("lista do atleta mostra todas as 7",
  t.includes("torneio de inverno") && t.includes("interno 2024"));
ver("lista do atleta mostra o placar", t.includes("3") && t.includes("ouro"));
ver("lista do atleta sem erro", erros.length === 0);

// --- 3. Perfil da academia: total, não destaque --------------------------
t = await abrir("/academia/academia-teste");
ver("academia mostra o total de ouro (26)", t.includes("26"));
ver("academia mostra o total de prata (23)", t.includes("23"));
ver("academia NÃO escolhe medalhas em destaque",
  !t.includes("paranaense") && !t.includes("open sul"));
ver("academia oferece ver todos os pódios", t.includes("ver todos os pódios"));
ver("academia sem erro", erros.length === 0);

// --- 4. Lista da academia: quem ganhou cada uma --------------------------
t = await abrir("/academia/academia-teste/medalhas");
ver("lista da academia diz quem ganhou",
  t.includes("joãozinho") && t.includes("mariana"));
ver("lista da academia mostra os campeonatos", t.includes("paranaense"));
ver("lista da academia sem erro", erros.length === 0);

const ocultarVisiveis = await pagina
  .locator('button[aria-label^="Tirar a medalha"]')
  .count();
ver("botão de ocultar só nas 2 que o stub permite", ocultarVisiveis === 2);

let falhou = false;
for (const [nome, ok] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}`);
}
if (erros.length) console.log("erros:", [...new Set(erros)]);

await navegador.close();
process.exit(falhou ? 1 : 0);
