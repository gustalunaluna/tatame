/**
 * O mestre confirma o vínculo.
 *
 * Antes da migração 032, qualquer um se declarava aluno de qualquer um e o
 * vínculo aparecia na hora — no perfil, na linhagem e na lista de alunos
 * daquele mestre, sem ele saber. Em jiu-jitsu isso não é detalhe: dizer-se
 * aluno de alguém é reivindicar uma linhagem.
 *
 * Este teste roda contra a tela, com o banco dublado, e confere os dois lados
 * da regra:
 *
 *   1. o ALUNO vê o próprio vínculo pendente, marcado como "aguardando" —
 *      sumir com a linha seria pior, ele cadastrou e precisa saber que existe
 *   2. o MESTRE vê o pedido, com Confirmar e "Não sou"
 *   3. responder chama o banco, e chama com o id certo
 *   4. sem pedido nenhum, a seção não desenha nada — nem título, nem caixa
 *      vazia
 */
import { abrirNavegador } from "./navegador.mjs";
import { readFileSync } from "node:fs";

const G = JSON.parse(readFileSync("fixtures/gustavo.json", "utf8"));
const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const EU = G.perfil.user_id;

const falhas = [];
const ok = [];
function conferir(nome, condicao, detalhe = "") {
  if (condicao) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/** Sobe o app com um conjunto de respostas do banco e devolve a página. */
async function abrir(navegador, { mestres, pedidos, aoResponder }) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([ref, uid]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: "f", refresh_token: "f",
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
      user: { id: uid, aud: "authenticated" },
    }));
  }, [REF, EU]);

  const p = await ctx.newPage();
  await p.route(`https://${REF}.supabase.co/**`, async (rota) => {
    const u = rota.request().url();
    const j = (b) =>
      rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

    if (u.includes("/auth/v1/user")) return j({ id: EU, aud: "authenticated" });
    if (u.includes("/rest/v1/profiles")) return j([G.perfil]);
    if (u.includes("/rpc/meu_handle")) return j(G.perfil.handle);
    if (u.includes("/rpc/mestres_de")) return j(mestres);
    if (u.includes("/rpc/pedidos_de_aluno")) return j(pedidos);
    if (u.includes("/rpc/responder_pedido_de_aluno")) {
      aoResponder?.(JSON.parse(rota.request().postData() || "{}"));
      return j(null);
    }
    return j([]);
  });

  await p.goto(`${BASE}/meus-mestres`, { waitUntil: "load" });
  await p.waitForTimeout(1800);
  return { ctx, p };
}

const vinculo = (over = {}) => ({
  id: "v1", papel: "mestre", principal: true, desde: null, ate: null, nota: "",
  mestre_handle: "guipreta", mestre_nome: "Gui Souza", mestre_belt: "Preta",
  mestre_graus: 2, mestre_foto: "", mestre_verificado: true,
  team_slug: "", team_nome: "Team Thome", sou_dono: true,
  situacao: "aceito", ...over,
});

const navegador = await abrirNavegador();

/* --- 1. o aluno vê o próprio pendente ------------------------------------ */
{
  const { ctx, p } = await abrir(navegador, {
    mestres: [vinculo({ situacao: "pendente" })],
    pedidos: [],
  });
  const texto = await p.locator("body").innerText();
  conferir(
    "o aluno vê que está aguardando confirmação",
    /aguardando/i.test(texto) && /Gui/.test(texto),
  );
  conferir(
    "e a linha do mestre continua na tela",
    /Gui Souza/.test(texto),
  );
  await ctx.close();
}

/* --- 2. aceito não mostra aviso nenhum ----------------------------------- */
{
  const { ctx, p } = await abrir(navegador, { mestres: [vinculo()], pedidos: [] });
  const texto = await p.locator("body").innerText();
  conferir(
    "vínculo aceito não fala em aguardar",
    !/aguardando/i.test(texto),
  );
  await ctx.close();
}

/* --- 3. o mestre vê o pedido e responde ---------------------------------- */
{
  const chamadas = [];
  const { ctx, p } = await abrir(navegador, {
    mestres: [],
    pedidos: [{
      id: "p1", aluno_handle: "joaozinho", aluno_nome: "Joãozinho",
      aluno_belt: "Branca", aluno_graus: 2, aluno_foto: "",
      papel: "mestre", desde: null, pedido_em: "2026-08-01T10:00:00Z",
    }],
    aoResponder: (corpo) => chamadas.push(corpo),
  });

  const texto = await p.locator("body").innerText();
  conferir("o mestre vê o pedido", /Joãozinho/.test(texto));
  conferir(
    "e o aviso diz que nada aparece antes da resposta",
    /não aparece no perfil de ninguém|não aparece/i.test(texto),
  );

  const confirmar = p.getByRole("button", { name: /^Confirmar$/ });
  conferir("tem botão de confirmar", (await confirmar.count()) === 1);
  conferir(
    "e tem como dizer que não",
    (await p.getByRole("button", { name: /Não sou/i }).count()) === 1,
  );

  await confirmar.click();
  await p.waitForTimeout(900);
  conferir(
    "confirmar chama o banco com o id do pedido",
    chamadas.length === 1 && chamadas[0].p_id === "p1" && chamadas[0].p_aceitar === true,
    JSON.stringify(chamadas),
  );
  await ctx.close();
}

/* --- 4. sem pedido, sem seção -------------------------------------------- */
{
  const { ctx, p } = await abrir(navegador, { mestres: [vinculo()], pedidos: [] });
  const texto = await p.locator("body").innerText();
  conferir(
    "sem pedido nenhum, a seção não desenha nada",
    !/diz que você é mestre|dizem que você é mestre/i.test(texto),
  );
  await ctx.close();
}

await navegador.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
