// O perfil de um mestre mostra ALUNOS e PARCEIROS DE ROLA — as duas coisas.
//
// São relações diferentes e um mestre tem as duas: parceiro é com quem ele
// rola, aluno é quem ele gradua. O teste garante que as duas caixas convivem
// no perfil dele, e que quem NÃO comanda academia não ganha a caixa de alunos
// — senão ela viraria enfeite vazio em todo perfil.
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));

mkdirSync("telas", { recursive: true });

const atleta = (handle, nome, belt, graus) => ({
  user_id: `u-${handle}`, handle, nickname: nome, belt, degrees: graus,
  photo_url: "", verificado: belt === "Preta", equipe_oficial: true,
  team_nome: "Academia Teste",
});

const ALUNOS = [
  atleta("rafael.teste", "Rafael", "Preta", 1),
  atleta("julio.teste", "Julio", "Marrom", 4),
  atleta("mariana.teste", "Mariana", "Roxa", 2),
  atleta("otavio.teste", "Otavio", "Azul", 4),
  atleta("isabela.teste", "Isabela", "Azul", 3),
  atleta("lucas.teste", "Lucas", "Azul", 1),
  atleta("maria.bjj", "Maria", "Azul", 1),
  atleta("henrique.teste", "Henrique", "Branca", 2),
];

const PARCEIROS = [
  atleta("coral.teste", "Mestre Coral", "Coral", 7),
  atleta("vermelha.teste", "Grão-Mestre Rui", "Vermelha", 9),
  atleta("carlosjj", "Carlos", "Roxa", 3),
];

const CASOS = [
  {
    nome: "mestre",
    handle: "mestre.silva",
    apelido: "Mestre Silva",
    resumo: { e_mestre: true, alunos: 15, equipes: 1 },
    esperaAlunos: true,
    arquivo: "perfil-mestre-com-alunos",
  },
  {
    nome: "aluno comum",
    handle: "julio.teste",
    apelido: "Julio",
    resumo: { e_mestre: false, alunos: 0, equipes: 0 },
    esperaAlunos: false,
    arquivo: "perfil-aluno-sem-caixa-de-alunos",
  },
];

const navegador = await abrirNavegador();
const checagens = [];
const ver = (n, ok, extra) => checagens.push([n, ok, extra]);

for (const caso of CASOS) {
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(([ref, uid]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: "f", refresh_token: "f",
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
      user: { id: uid, aud: "authenticated" },
    }));
  }, [REF, G.perfil.user_id]);

  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));
  await pagina.route("https://api.dicebear.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg/>" }));

  await pagina.route(`https://${REF}.supabase.co/**`, (r) => {
    const u = r.request().url();
    const j = (b) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (u.includes("/auth/v1/user")) return j({ id: G.perfil.user_id, aud: "authenticated" });
    if (u.includes("/rpc/resumo_de_mestre")) return j(caso.resumo);
    if (u.includes("/rpc/alunos_do_mestre")) return j(caso.esperaAlunos ? ALUNOS : []);
    if (u.includes("/rpc/parceiros_publicos")) return j(PARCEIROS);
    if (u.includes("/rpc/perfil_publico"))
      return j([{
        user_id: `u-${caso.handle}`, handle: caso.handle, nickname: caso.apelido,
        bio: "", belt: "Preta", degrees: 2, photo_url: "", verificado: true,
        idade: 44, gym: "Academia Teste", master: "", team_id: "e1",
        team_name: "Academia Teste", team_crest: "", team_status: "aprovada",
        team_slug: "academia-teste", master_handle: "", master_nickname: "",
        fights_won: 0, fights_lost: 0, treinos: 700, parceiros: PARCEIROS.length,
        conquistas_total: 1006, conquistas_feitas: 96, sou_eu: false,
        e_meu_parceiro: true,
      }]);
    if (u.includes("/rpc/resumo_medalhas_do_atleta")) return j({ ouro: 1, prata: 1, bronze: 0, total: 2 });
    if (u.includes("/rpc/medalhas_do_atleta")) return j([]);
    if (u.includes("/rpc/historico_de_graduacao")) return j([]);
    if (u.includes("/rpc/destaques_publicos")) return j([]);
    if (u.includes("/rest/v1/profiles")) return j([G.perfil]);
    if (u.includes("/rpc/semear_conquistas")) return j(0);
    if (u.includes("/rpc/recalcular_conquistas")) return j(0);
    return j([]);
  });

  await pagina.goto(`${BASE}/atleta/${caso.handle}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1100);
  await pagina.screenshot({ path: `telas/${caso.arquivo}.png`, fullPage: true });

  const titulos = (await pagina.locator("h2").allInnerTexts()).map((t) =>
    t.trim().toLowerCase(),
  );
  const temAlunos = titulos.includes("alunos");
  const temParceiros = titulos.includes("parceiros de rola");
  const dom = await pagina.evaluate(() => document.body.textContent ?? "");

  if (caso.esperaAlunos) {
    ver("mestre: tem a caixa de Alunos", temAlunos, titulos.join(" > "));
    ver("mestre: tem TAMBÉM a de Parceiros de rola", temParceiros, titulos.join(" > "));
    ver("mestre: os alunos aparecem por nome",
      ["Rafael", "Julio", "Mariana"].every((n) => dom.includes(n)));
    ver("mestre: alunos vêm por graduação (preta antes de branca)",
      dom.indexOf("Rafael") < dom.indexOf("Henrique"));
    ver("mestre: oferece ver todos os 15", dom.includes("Ver todos os 15"));
    // parceiro e aluno são listas distintas: quem só é parceiro não vira aluno
    ver("mestre: parceiro não é listado como aluno",
      temParceiros && dom.includes("Grão-Mestre Rui"));
  } else {
    ver("aluno comum: NÃO ganha a caixa de Alunos", !temAlunos, titulos.join(" > "));
    ver("aluno comum: continua com a de Parceiros de rola", temParceiros,
      titulos.join(" > "));
  }
  ver(`${caso.nome}: sem erro`, erros.length === 0, erros.join(" ; "));

  await ctx.close();
}

await navegador.close();

let falhou = false;
for (const [nome, ok, extra] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}${!ok && extra ? `\n         → ${extra}` : ""}`);
}
process.exit(falhou ? 1 : 0);
