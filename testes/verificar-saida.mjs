/**
 * As portas que as lojas exigem — e que nenhum usuário logado percorre.
 *
 * São quatro caminhos que só existem para quem está DE FORA ou está indo
 * embora, e é exatamente por isso que quebram calados: o dono do app nunca
 * esquece a própria senha, nunca lê os próprios termos e nunca exclui a
 * própria conta. A revisão da App Store e a do Google Play percorrem os
 * quatro, nessa ordem.
 *
 * Confere:
 *   1. "Esqueci minha senha" existe no login e leva a uma tela que funciona
 *   2. privacidade e termos abrem SEM sessão (é o que o revisor faz)
 *   3. o cadastro mostra o aceite, com os dois links
 *   4. a exclusão de conta não dispara sem a palavra digitada
 *
 * O item 4 é o que mais importa: o botão que não tem volta.
 */
import { abrirNavegador } from "./navegador.mjs";

const BASE = process.env.BASE ?? "http://localhost:4183";
const falhas = [];
const ok = [];

function conferir(nome, condicao, detalhe = "") {
  if (condicao) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

const b = await abrirNavegador();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();

// Sem Supabase: nenhuma destas telas pode depender de rede para se desenhar.
// A de recuperação de senha, em especial, é usada justamente por quem está
// com problema para entrar.
await p.route("**/*supabase.co/**", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
);

/* --- 1. o caminho de volta da senha -------------------------------------- */
await p.goto(`${BASE}/auth`, { waitUntil: "load" });
await p.waitForTimeout(1000);
await p.getByRole("button", { name: /^Entrar$/ }).click();
await p.waitForTimeout(400);

const linkEsqueci = p.getByRole("link", { name: /Esqueci minha senha/i });
conferir("o login oferece 'Esqueci minha senha'", (await linkEsqueci.count()) === 1);

await linkEsqueci.click();
await p.waitForTimeout(600);
conferir(
  "a tela de recuperação abre",
  (await p.getByRole("heading", { name: /Esqueci minha senha/i }).count()) === 1,
);
conferir(
  "e pede o e-mail",
  (await p.getByLabel(/E-mail/i).count()) === 1,
);
conferir(
  "sem barra inferior (está fora da sessão)",
  (await p.getByRole("link", { name: /^Início$/ }).count()) === 0,
);

/* --- 2. as páginas legais abrem sem sessão ------------------------------- */
// O revisor da loja clica no link do formulário de submissão, sem instalar
// nada. Se isto exigir login, a submissão é recusada ali mesmo.
for (const [rota, titulo] of [
  ["/privacidade", /Política de Privacidade/i],
  ["/termos", /Termos de Uso/i],
]) {
  await p.goto(`${BASE}${rota}`, { waitUntil: "load" });
  await p.waitForTimeout(800);
  conferir(
    `${rota} abre sem login`,
    (await p.getByRole("heading", { name: titulo, level: 1 }).count()) === 1,
  );
  // Uma página legal vazia passaria no teste acima e reprovaria na revisão.
  const texto = await p.locator("main").innerText();
  conferir(`${rota} tem conteúdo de verdade`, texto.length > 1200, `${texto.length} caracteres`);
}

// O e-mail de contato precisa existir e estar clicável — as duas lojas e a
// LGPD exigem um canal, e um `mailto:` vazio não é um canal.
await p.goto(`${BASE}/privacidade`, { waitUntil: "load" });
await p.waitForTimeout(600);
const contato = p.locator('a[href^="mailto:"]').first();
conferir("a privacidade traz um e-mail de contato", (await contato.count()) >= 1);

/* --- 3. o aceite no cadastro --------------------------------------------- */
await p.goto(`${BASE}/auth`, { waitUntil: "load" });
await p.waitForTimeout(1000);
await p.getByRole("button", { name: /Criar minha conta/i }).click();
await p.waitForTimeout(400);
conferir(
  "o cadastro mostra o aceite dos termos",
  (await p.getByRole("link", { name: /Termos de Uso/i }).count()) === 1 &&
    (await p.getByRole("link", { name: /Política de Privacidade/i }).count()) === 1,
);
// E o aceite não pode aparecer no login: lá não se aceita nada.
await p.getByRole("button", { name: /Já tem conta\?/i }).click();
await p.waitForTimeout(400);
conferir(
  "o aceite não aparece no login",
  (await p.getByRole("link", { name: /Termos de Uso/i }).count()) === 0,
);

/* --- 4. o botão que não tem volta ---------------------------------------- */
// Este precisa de sessão: a exclusão mora dentro do app. Sessão falsa no
// localStorage, no mesmo molde dos outros testes autenticados.
const REF = "jqcuysthbcdbohkavfeb";
const ctxLogado = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctxLogado.addInitScript(([ref]) => {
  localStorage.setItem(
    `sb-${ref}-auth-token`,
    JSON.stringify({
      access_token: "fake",
      refresh_token: "fake",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "u1", email: "teste@exemplo.com", aud: "authenticated" },
    }),
  );
}, [REF]);

const pl = await ctxLogado.newPage();
let excluiuNoBanco = false;
await pl.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const json = (b) =>
    rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(b),
    });
  if (url.includes("/rpc/excluir_minha_conta")) {
    excluiuNoBanco = true;
    return json(null);
  }
  if (url.includes("/auth/v1/user"))
    return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rest/v1/profiles"))
    return json([
      {
        user_id: "u1",
        questionario_em: "2026-07-30T01:32:14.123065+00:00",
        nickname: "Teste",
        belt: "Branca",
        degrees: 0,
        gym: "",
        master: "",
        photo_url: "",
        birth_date: "2000-01-01",
        fights_won: 0,
        fights_lost: 0,
        goal_start: "2025-10-13",
      },
    ]);
  return json([]);
});

// O endereço antigo virou desvio, e isso é teste, não detalhe: `/meus-dados`
// é a URL de exclusão que vai no formulário do Google Play. Se ela morrer numa
// reorganização de telas, quebra um link já publicado numa loja.
await pl.goto(`${BASE}/meus-dados`, { waitUntil: "load" });
await pl.waitForTimeout(1500);
conferir(
  "/meus-dados desvia para /configuracoes",
  new URL(pl.url()).pathname === "/configuracoes",
  pl.url(),
);

await pl.goto(`${BASE}/configuracoes`, { waitUntil: "load" });
await pl.waitForTimeout(1200);

for (const grupo of ["Conta", "Treino", "Aparência", "Privacidade e dados"]) {
  conferir(
    `grupo "${grupo}" na tela`,
    (await pl.getByRole("heading", { name: grupo, exact: true }).count()) >= 1,
  );
}

conferir(
  "a exportação está em Configurações",
  (await pl.getByRole("button", { name: /Baixar meus dados/i }).count()) === 1,
);

// A exclusão vive atrás de um toque, e o botão nasce travado.
await pl.getByRole("button", { name: /^Excluir minha conta$/i }).click();
await pl.waitForTimeout(600);

const botaoExcluir = pl.getByRole("button", { name: /Excluir para sempre/i });
conferir("o painel de exclusão abre", (await botaoExcluir.count()) === 1);
conferir("e o botão nasce travado", await botaoExcluir.isDisabled());

// Palavra errada não destrava — se destravar, um toque distraído apaga tudo.
await pl.getByLabel(/Digite/i).fill("excluirr");
await pl.waitForTimeout(200);
conferir("palavra errada mantém o botão travado", await botaoExcluir.isDisabled());

await pl.getByLabel(/Digite/i).fill("EXCLUIR");
await pl.waitForTimeout(200);
conferir("a palavra certa destrava", await botaoExcluir.isEnabled());

// Só agora a chamada poderia sair — e antes de tocar, nada foi chamado.
conferir("nada foi excluído antes do toque", excluiuNoBanco === false);

await b.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
