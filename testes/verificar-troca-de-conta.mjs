/**
 * Reproduz o vazamento relatado: sair de uma conta e entrar em outra SEM
 * recarregar a página. Antes da correção, a segunda conta via os dados da
 * primeira, porque o cache de consultas continuava válido por 5 minutos.
 *
 * O banco nunca vazou — quem vazava era o navegador.
 */
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4192";

const CONTAS = {
  a: {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    email: "gustavo@exemplo.test",
    perfil: { nickname: "Gustavo", belt: "Branca", degrees: 3, gym: "Bonsai" },
  },
  b: {
    id: "bbbbbbbb-0000-0000-0000-000000000002",
    email: "joao@exemplo.test",
    perfil: { nickname: "Joãozinho", belt: "Azul", degrees: 1, gym: "Academia Teste" },
  },
};

// Quem está "logado" do ponto de vista das rotas simuladas
let atual = CONTAS.a;

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });

await ctx.addInitScript(
  ([ref, conta]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: "tok-a", refresh_token: "ref-a",
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
      user: { id: conta.id, email: conta.email, aud: "authenticated" },
    }));
  },
  [REF, CONTAS.a],
);

const pagina = await ctx.newPage();

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const req = rota.request();
  const url = req.url();
  const json = (b, status = 200) =>
    rota.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/logout")) return rota.fulfill({ status: 204, body: "" });

  // Login: a partir daqui o "logado" passa a ser a conta B
  if (url.includes("/auth/v1/token")) {
    atual = CONTAS.b;
    return json({
      access_token: "tok-b", refresh_token: "ref-b", token_type: "bearer",
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: atual.id, email: atual.email, aud: "authenticated" },
    });
  }

  if (url.includes("/auth/v1/user"))
    return json({ id: atual.id, email: atual.email, aud: "authenticated" });

  if (url.includes("/rest/v1/profiles"))
    return json([{
      user_id: atual.id, seeded: true, ...atual.perfil,
      handle: atual === CONTAS.a ? "gustavo" : "joaozinho",
      bio: "", photo_url: "", birth_date: "2000-01-01",
      master: "", fights_won: 0, fights_lost: 0, goal_start: "2025-10-13",
    }]);

  if (url.includes("/rpc/achievement_stats")) return json({ total: 100, unlocked: 10 });
  return json([]);
});

const nomeNaTela = async () =>
  (await pagina.locator("h2").first().innerText().catch(() => "")).trim();

// UMA carga de página só. Daqui em diante tudo é navegação por dentro do
// app — que é onde o bug vivia. Um F5 criava um cache novo e escondia ele.
await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(600);

await pagina.getByRole("link", { name: /Perfil/ }).click();
await pagina.waitForTimeout(900);
const antes = await nomeNaTela();

await pagina.getByRole("link", { name: /Início/ }).click();
await pagina.waitForTimeout(600);
await pagina.getByRole("button", { name: /Sair/i }).click();
await pagina.waitForTimeout(800);

// Entra na conta B — mesma carga de página, sem F5.
// A tela de entrada abre no convite; o formulário vem depois do toque.
await pagina.getByRole("button", { name: /^Entrar$/ }).click();
await pagina.getByLabel(/E-mail/i).fill(CONTAS.b.email);
await pagina.getByLabel(/Senha/i).fill("qualquer");
await pagina.getByRole("button", { name: /^Entrar$/ }).click();
await pagina.waitForTimeout(1500);

await pagina.getByRole("link", { name: /Perfil/ }).click();
await pagina.waitForTimeout(1200);
const depois = await nomeNaTela();

console.log(JSON.stringify({
  contaA: antes,
  contaB: depois,
  vazou: depois === CONTAS.a.perfil.nickname,
  correto: depois === CONTAS.b.perfil.nickname,
}, null, 2));

await navegador.close();
