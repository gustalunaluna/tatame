// A meta de graduação mostra de onde para onde, e veste a cor do ALVO.
//
// Os dois casos que importam:
//   - trocar de cor  (Branca → Azul): o cartão fica azul, não da faixa atual
//   - ganhar um grau (Branca 2 → Branca 3): a rota também aparece, porque é o
//     que acontece na maior parte da vida de quem treina
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));

mkdirSync("telas", { recursive: true });

const meta = (id, titulo, belt, graus) => ({
  id, user_id: G.perfil.user_id, kind: "graduacao", title: titulo,
  target_belt: belt, target_degrees: graus, event_name: "", target_number: null,
  target_date: "2027-06-01", status: "ativa", outcome: "",
});

const CASOS = [
  {
    nome: "troca de faixa (Branca → Azul)",
    faixaAtual: { belt: "Branca", degrees: 3 },
    metas: [meta("g1", "Faixa Azul", "Azul", 0)],
    esperaTitulo: "Branca 3 graus à Azul",
    esperaCor: "0.68 0.165 250", // o azul dos tokens
    arquivo: "meta-branca-para-azul",
  },
  {
    nome: "grau na mesma faixa (Branca 2 → Branca 3)",
    faixaAtual: { belt: "Branca", degrees: 2 },
    metas: [meta("g2", "3º grau na branca", "Branca", 3)],
    esperaTitulo: "Branca 2 graus à Branca 3 graus",
    esperaCor: "0.88 0.075 92", // a palha da branca
    arquivo: "meta-grau-na-branca",
  },
  {
    nome: "azul → roxa",
    faixaAtual: { belt: "Azul", degrees: 4 },
    metas: [meta("g3", "Faixa Roxa", "Roxa", 0)],
    esperaTitulo: "Azul 4 graus à Roxa",
    esperaCor: "0.66 0.19 305",
    arquivo: "meta-azul-para-roxa",
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

  await pagina.route(`https://${REF}.supabase.co/**`, (r) => {
    const u = r.request().url();
    const j = (b) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (u.includes("/auth/v1/user")) return j({ id: G.perfil.user_id, aud: "authenticated" });
    if (u.includes("/rest/v1/profiles"))
      return j([{ ...G.perfil, belt: caso.faixaAtual.belt, degrees: caso.faixaAtual.degrees }]);
    if (u.includes("/rest/v1/goals")) return j(caso.metas);
    if (u.includes("/rest/v1/trainings")) return j(G.treinos);
    if (u.includes("/rest/v1/weak_points")) return j([]);
    if (u.includes("/rest/v1/plan_cycles")) return j(G.ciclos);
    if (u.includes("/rest/v1/plan_cycle_items")) return j(G.itens_ciclo);
    if (u.includes("/rpc/achievement_stats")) return j(G.stats);
    if (u.includes("/rpc/semear_conquistas")) return j(0);
    if (u.includes("/rpc/recalcular_conquistas")) return j(0);
    return j([]);
  });

  await pagina.goto(`${BASE}/metas`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1200);
  await pagina.screenshot({ path: `telas/${caso.arquivo}.png`, fullPage: true });

  const texto = await pagina.locator("body").innerText();

  // A cor do cartão da meta.
  //
  // Cuidado que já me pegou: `CorDaFaixa` escreve --faixa no <html>, e o
  // <html> é o PRIMEIRO elemento que `[style*="--faixa"]` casa. O teste passava
  // a ler a faixa atual do usuário e acusava o app de errado quando ele estava
  // certo. Por isso a busca começa no cartão que contém o título da meta.
  const corNoCartao = await pagina.evaluate((titulo) => {
    const alvo = [...document.querySelectorAll("p")].find(
      (p) => p.textContent?.trim() === titulo,
    );
    const cartao = alvo?.closest('[style*="--faixa"]');
    return cartao ? getComputedStyle(cartao).getPropertyValue("--faixa").trim() : "";
  }, caso.metas[0].title);

  // A cor QUE O OLHO VÊ, e não só a variável. Foi o que faltou na primeira
  // versão deste teste: `--faixa` estava certa no cartão e mesmo assim ele
  // aparecia com a cor da faixa atual, porque `--primary` resolve no :root e
  // não recalcula quando um filho troca `--faixa`. Ler o `color` computado do
  // rótulo "GRADUAÇÃO" é o que pega isso.
  const corDoRotulo = await pagina.evaluate((titulo) => {
    const alvo = [...document.querySelectorAll("p")].find(
      (p) => p.textContent?.trim() === titulo,
    );
    const rotulo = alvo?.parentElement?.querySelector("p");
    return rotulo ? getComputedStyle(rotulo).color : "";
  }, caso.metas[0].title);

  // As duas faixas desenhadas, pelo rótulo de acessibilidade da rota
  const rotas = await pagina.locator('[role="img"][aria-label^="De "]').count();

  ver(`${caso.nome}: título da rota`, texto.includes(caso.esperaTitulo),
    `esperava "${caso.esperaTitulo}"`);
  ver(`${caso.nome}: desenha as duas faixas`, rotas >= 1, `rotas encontradas: ${rotas}`);
  ver(`${caso.nome}: --faixa do cartão aponta para o alvo`,
    corNoCartao.includes(caso.esperaCor),
    `--faixa no cartão: "${corNoCartao}", esperava conter "${caso.esperaCor}"`);
  ver(`${caso.nome}: o TEXTO do cartão sai na cor do alvo`,
    corDoRotulo.includes(caso.esperaCor),
    `cor do rótulo: "${corDoRotulo}", esperava conter "${caso.esperaCor}"`);
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
