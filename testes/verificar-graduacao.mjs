// Histórico de graduação no perfil de outra pessoa.
//
// O que importa provar aqui: que o mestre com conta vira link + selo de
// verificado sozinho, e que o mestre só escrito aparece como texto — são os
// dois caminhos que a tabela permite, e confundir os dois criaria perfil
// clicável para gente que não existe.
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const graduacoes = [
  { id: "g3", belt: "Roxa", degrees: 1, data: "2024-06-14", nota: "",
    mestre_nome: "Mestre Silva", mestre_handle: "mestre.silva",
    mestre_verificado: true, team_slug: "academia-teste",
    team_nome: "Academia Teste", team_crest: "", sou_dono: false },
  { id: "g2", belt: "Roxa", degrees: 0, data: "2022-11-25",
    nota: "Já na Academia Teste",
    mestre_nome: "Mestre Silva", mestre_handle: "mestre.silva",
    mestre_verificado: true, team_slug: "academia-teste",
    team_nome: "Academia Teste", team_crest: "", sou_dono: false },
  // este veio de outra academia: nome escrito, sem perfil
  { id: "g1", belt: "Azul", degrees: 0, data: "2018-12-20",
    nota: "Cerimônia de fim de ano",
    mestre_nome: "Professor Anderson", mestre_handle: "",
    mestre_verificado: false, team_slug: "", team_nome: "", team_crest: "",
    sou_dono: false },
];

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
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rpc/historico_de_graduacao")) return json(graduacoes);
  if (url.includes("/rpc/resumo_medalhas_do_atleta")) return json({ ouro: 0, prata: 0, bronze: 0, total: 0 });
  if (url.includes("/rpc/medalhas_do_atleta")) return json([]);
  if (url.includes("/rpc/semear_conquistas")) return json(0);
  if (url.includes("/rpc/recalcular_conquistas")) return json(0);
  if (url.includes("/rpc/perfil_publico"))
    return json([{ user_id: "u2", questionario_em: "2026-07-30T01:32:14.123065+00:00", handle: "mariana.teste", nickname: "Mariana",
      belt: "Roxa", degrees: 1, bio: "", photo_url: "", idade: 30,
      gym: "Academia Teste", master: "Mestre Silva", verificado: false,
      equipe_oficial: true, team_slug: "academia-teste", master_handle: "mestre.silva",
      master_nickname: "Mestre Silva", parceiros: 12, treinos: 200,
      conquistas_feitas: 90, conquistas_total: 1006, sou_parceiro: true }]);
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: "u1", questionario_em: "2026-07-30T01:32:14.123065+00:00", seeded: true, nickname: "Gustavo", belt: "Branca",
      degrees: 3, handle: "gustavo", master: "", gym: "", photo_url: "",
      birth_date: "2000-01-01", fights_won: 0, fights_lost: 0, goal_start: "2025-10-13" }]);
  return json([]);
});

await pagina.goto(`${BASE}/atleta/mariana.teste`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1000);
const texto = (await pagina.locator("body").innerText()).toLowerCase();
const tem = (s) => texto.includes(s.toLowerCase());

// o mestre COM perfil vira link para /atleta/<handle>
const linkMestre = await pagina
  .locator('a[href="/atleta/mestre.silva"]')
  .count();
// o mestre SEM perfil não pode virar link nenhum
const linkAnderson = await pagina
  .locator('a', { hasText: "Professor Anderson" })
  .count();
const selos = await pagina
  .locator('span[title="Faixa preta verificada"]')
  .count();

const checagens = [
  ["mostra os 3 degraus da escada",
    tem("faixa roxa") && tem("1º grau na roxa") && tem("faixa azul")],
  ["diz quem entregou", tem("entregue por") && tem("mestre silva")],
  ["mestre com conta vira link", linkMestre > 0],
  ["mestre só escrito NÃO vira link",
    tem("professor anderson") && linkAnderson === 0],
  ["mestre com conta ganha selo de verificado", selos >= 1],
  ["mostra a academia da época", tem("academia teste")],
  ["mostra a observação", tem("cerimônia de fim de ano")],
  ["sem erro de página", erros.length === 0],
];

let falhou = false;
for (const [nome, ok] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}`);
}
if (erros.length) console.log("erros:", [...new Set(erros)]);
if (falhou) console.log("\n--- texto ---\n" + texto);

await navegador.close();
process.exit(falhou ? 1 : 0);
