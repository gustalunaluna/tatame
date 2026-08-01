/**
 * A linhagem, com os dados reais da corrente do Rickson.
 *
 * Confere o que só aparece quando a corrente tem mais de um degrau e termina
 * em alguém que não usa o app:
 *   1. os quatro nomes saem na ordem certa, do mais novo ao mais antigo
 *   2. quem tem conta vira link; quem não tem, não vira
 *   3. o mestre que NÃO é o principal aparece em "Outros mestres" — não pode
 *      sumir só porque a corrente segue um só
 *   4. o título do perfil lê a faixa: vermelha 9º grau é Grão-Mestre
 *   5. a caixa do perfil diz "Mestres" no plural e leva à linhagem
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const F = JSON.parse(readFileSync("fixtures/linhagem-gracie.json", "utf8"));

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(
    `sb-${ref}-auth-token`,
    JSON.stringify({
      access_token: "fake",
      refresh_token: "fake",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "00000000-0000-0000-0000-0000000000ff", aud: "authenticated" },
    }),
  );
}, [REF]);

const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

await p.route(`https://${REF}.supabase.co/**`, (rota) => {
  const url = rota.request().url();
  const json = (b) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user"))
    return json({ id: "00000000-0000-0000-0000-0000000000ff", aud: "authenticated" });
  if (url.includes("/rpc/perfil_publico")) return json([F.perfil]);
  if (url.includes("/rpc/linhagem_de")) return json(F.linhagem);
  if (url.includes("/rpc/mestres_de")) return json(F.mestres);
  return json([]);
});

/* --- a tela de linhagem -------------------------------------------------- */
await p.goto(`${BASE}/atleta/rickson.gracie/linhagem`, { waitUntil: "load" });
await p.waitForTimeout(1200);

// textContent, e não innerText: `list-perf` usa content-visibility, e o que
// está fora da tela fica invisível para o innerText.
const texto = await p.locator("body").evaluate((el) => el.textContent ?? "");

const esperados = [
  "Rickson Gracie",
  "Hélio Gracie",
  "Carlos Gracie",
  "Mitsuyo Maeda (Conde Koma)",
];
const posicoes = esperados.map((n) => texto.indexOf(n));
conferir(
  "os quatro elos aparecem",
  posicoes.every((i) => i >= 0),
  esperados.filter((_, i) => posicoes[i] < 0).join(", "),
);
conferir(
  "a corrente sai do mais novo para o mais antigo",
  posicoes.every((v, i) => i === 0 || v > posicoes[i - 1]),
  posicoes.join(" < "),
);

// Quem tem conta é navegável; Maeda não tem e não pode virar link morto.
conferir(
  "Hélio é link para o perfil dele",
  (await p.locator('a[href="/atleta/helio.gracie"]').count()) === 1,
);
conferir(
  "Maeda não vira link",
  (await p.getByRole("link", { name: /Maeda/ }).count()) === 0,
);

// O segundo mestre não está na corrente — mas não pode desaparecer.
conferir("o mestre fora da linha principal aparece", texto.includes("Rolls Gracie"));
conferir("está sob 'Outros mestres'", texto.includes("Outros mestres"));
conferir(
  "Rolls vem depois da corrente",
  texto.indexOf("Rolls Gracie") > texto.indexOf("Mitsuyo Maeda"),
);

conferir("3 gerações acima", texto.includes("3 gerações acima"), texto.slice(0, 120));

/* --- o perfil, que é de onde se chega aqui ------------------------------- */
await p.goto(`${BASE}/atleta/rickson.gracie`, { waitUntil: "load" });
await p.waitForTimeout(1200);
const perfil = await p.locator("body").evaluate((el) => el.textContent ?? "");

// Vermelha 9º grau. Chamar isso de "Mestre" seria rebaixar; de "Aluno",
// absurdo. É a leitura que o app precisa acertar sozinho.
conferir("vermelha 9º grau é Grão-Mestre", perfil.includes("Grão-Mestre"), perfil.slice(0, 200));
conferir("a caixa diz 'Mestres', no plural", perfil.includes("Mestres"));
conferir(
  "a caixa leva à linhagem",
  (await p.locator('a[href="/atleta/rickson.gracie/linhagem"]').count()) >= 1,
);

conferir("sem erro de JavaScript", erros.length === 0, erros.join(" | "));

await navegador.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
