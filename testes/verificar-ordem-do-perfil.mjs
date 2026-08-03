// A ordem das caixas no perfil segue a escolha da pessoa:
//   - com medalha em destaque, o pódio vem ANTES de equipe e mestre
//   - sem medalha em destaque, ele fica depois, como convite
//
// O teste roda o mesmo perfil duas vezes, mudando só a resposta de
// `medalhas_do_atleta(p_so_destaque=true)`, e compara a posição do texto
// "Medalhas" com a de "Equipe" no corpo da página.
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const emDestaque = [
  { id: "m1", colocacao: "ouro", evento: "Paranaense 2026",
    categoria: "Adulto Azul Médio", federacao: "CBJJ", modalidade: "Gi",
    data: "2026-05-10", absoluto: true, destaque: true,
    team_slug: "academia-teste", team_nome: "Academia Teste", team_crest: "",
    sou_dono: true },
];

const navegador = await abrirNavegador();

async function ordemDoPerfil({ caminho, comDestaque }) {
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
      if (soDestaque) return json(comDestaque ? emDestaque : []);
      return json(comDestaque ? emDestaque : []);
    }
    if (url.includes("/rpc/resumo_medalhas_do_atleta"))
      return json({ ouro: comDestaque ? 1 : 1, prata: 0, bronze: 0, total: 1 });
    if (url.includes("/rpc/historico_de_graduacao")) return json([]);
    if (url.includes("/rpc/perfil_publico"))
      return json([{ user_id: "u2", questionario_em: "2026-07-30T01:32:14.123065+00:00", handle: "joaozinho", nickname: "Joãozinho",
        belt: "Azul", degrees: 1, bio: "", photo_url: "", idade: 26,
        gym: "Academia Teste", master: "Mestre Silva", verificado: false,
        equipe_oficial: true, team_slug: "academia-teste",
        team_name: "Academia Teste", team_status: "aprovada", team_crest: "",
        master_handle: "mestre.silva", master_nickname: "Mestre Silva",
        parceiros: 20, treinos: 39, fights_won: 3, fights_lost: 1,
        conquistas_feitas: 40, conquistas_total: 1006, sou_parceiro: true }]);
    if (url.includes("/rest/v1/profiles"))
      return json([{ user_id: "u1", questionario_em: "2026-07-30T01:32:14.123065+00:00", seeded: true, nickname: "Gustavo", belt: "Branca",
        degrees: 3, handle: "gustavo", master: "Gui", gym: "Academia Teste",
        photo_url: "", birth_date: "2000-01-01", fights_won: 0, fights_lost: 0,
        goal_start: "2025-10-13" }]);
    if (url.includes("/rest/v1/teams"))
      return json([{ id: "e1", name: "Academia Teste", slug: "academia-teste",
        city: "Curitiba", master: "Mestre Silva", created_by: "u9",
        status: "aprovada", motivo_recusa: "", crest_url: "" }]);
    if (url.includes("/rest/v1/team_members"))
      return json([{ team_id: "e1", user_id: "u1", role: "membro", status: "ativo" }]);
    return json([]);
  });

  await pagina.goto(`${BASE}${caminho}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1100);

  // Procurar "equipe" no texto solto não serve: o selo de equipe oficial no
  // cabeçalho tem o rótulo "Equipe oficial" e aparece antes de qualquer caixa.
  // A ordem que interessa é a dos títulos das caixas — que são os <h2>.
  const titulos = (
    await pagina.locator("h2").allInnerTexts()
  ).map((t) => t.trim().toLowerCase());
  await ctx.close();

  return {
    titulos,
    posMedalhas: titulos.indexOf("medalhas"),
    posEquipe: titulos.indexOf("equipe"),
    erros,
  };
}

const casos = [
  ["perfil próprio", "/perfil"],
  ["perfil público", "/atleta/joaozinho"],
];

const checagens = [];
for (const [nome, caminho] of casos) {
  const com = await ordemDoPerfil({ caminho, comDestaque: true });
  const sem = await ordemDoPerfil({ caminho, comDestaque: false });

  // O cabeçalho do perfil também tem <h2> ("Lutas", o nome da pessoa), então o
  // que importa é a posição relativa entre as caixas, não o índice absoluto.
  const okCom =
    com.posMedalhas >= 0 && com.posEquipe >= 0 && com.posMedalhas < com.posEquipe;
  const okSem =
    sem.posEquipe >= 0 && (sem.posMedalhas < 0 || sem.posMedalhas > sem.posEquipe);

  checagens.push([`${nome}: com destaque, medalhas ANTES de equipe`, okCom]);
  checagens.push([`${nome}: sem destaque, medalhas DEPOIS de equipe`, okSem]);
  if (!okCom || !okSem)
    console.log(`  ${nome} com:`, com.titulos, "\n  sem:", sem.titulos);
  checagens.push([
    `${nome}: sem erro de página`,
    com.erros.length === 0 && sem.erros.length === 0,
  ]);
  if (com.erros.length || sem.erros.length)
    console.log(nome, "erros:", [...new Set([...com.erros, ...sem.erros])]);
}

let falhou = false;
for (const [nome, ok] of checagens) {
  if (!ok) falhou = true;
  console.log(`${ok ? "ok   " : "FALHA"}  ${nome}`);
}

await navegador.close();
process.exit(falhou ? 1 : 0);
