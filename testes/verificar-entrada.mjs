/**
 * A tela de entrada.
 *
 * É a única tela que alguém vê antes de decidir se instala o app, e é a que
 * mais fácil quebra sem ninguém notar: ninguém abre `/auth` logado. Por isso
 * ela tem teste próprio.
 *
 * Confere quatro coisas que já quebraram ou quase quebraram aqui:
 *   1. a marca aparece — nome, faixa desenhada e escada de graduação
 *   2. a barra inferior NÃO aparece (ela cobria o "Criar minha conta")
 *   3. o formulário só existe depois do toque, e o "voltar" desfaz
 *   4. a escada usa a cor do TECIDO da faixa, não o acento
 *      (o acento da preta é vermelho — uma escada que termina em vermelho
 *       não é a graduação de ninguém)
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
// Sem rede: a tela de entrada não pode depender do Supabase para se desenhar.
await p.route("**/*supabase.co/**", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
);

await p.goto(`${BASE}/auth`, { waitUntil: "load" });
await p.waitForTimeout(1200);

/* --- 1. a marca ---------------------------------------------------------- */
conferir(
  "nome do app na tela",
  (await p.getByRole("heading", { name: "Ponteira", level: 1 }).count()) === 1,
);
conferir(
  "a faixa desenhada aparece",
  (await p.getByRole("img", { name: "Ponteira" }).count()) === 1,
);
const escada = p.getByRole("img", { name: /branca à preta/i });
conferir("a escada de faixas aparece", (await escada.count()) === 1);

/* --- 2. a barra inferior fica fora --------------------------------------- */
// Ela cobria o "Criar minha conta" e oferecia seis telas que devolviam a
// pessoa para cá. Fora da sessão não há para onde navegar.
conferir(
  "sem barra inferior fora da sessão",
  (await p.getByRole("link", { name: /^Início$/ }).count()) === 0,
);

// E o botão de baixo precisa receber o toque, não só existir.
// A primeira versão desta conferência só olhava se ele cabia na altura da
// tela — e passava com a barra inferior desenhada por cima dele. Cabe na tela
// e recebe o toque são coisas diferentes; o que quebrou foi a segunda.
const criar = p.getByRole("button", { name: /Criar minha conta/i });
const caixa = await criar.boundingBox();
const quemRecebe = caixa
  ? await p.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest("button")?.textContent?.trim() ?? el?.tagName ?? "nada";
      },
      [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2],
    )
  : "sem caixa";
conferir(
  "o toque em 'Criar minha conta' chega no botão",
  /Criar minha conta/i.test(quemRecebe),
  `quem está por cima: ${quemRecebe}`,
);

/* --- 3. o formulário vem depois do toque --------------------------------- */
conferir(
  "sem campos antes do toque",
  (await p.getByLabel(/E-mail/i).count()) === 0,
);

await p.getByRole("button", { name: /^Entrar$/ }).click();
await p.waitForTimeout(500);

conferir("campo de e-mail aparece", (await p.getByLabel(/E-mail/i).count()) === 1);
conferir("campo de senha aparece", (await p.getByLabel(/Senha/i).count()) === 1);

await p.getByRole("button", { name: "Voltar" }).click();
await p.waitForTimeout(400);
conferir(
  "o voltar devolve para o convite",
  (await p.getByLabel(/E-mail/i).count()) === 0 &&
    (await p.getByRole("button", { name: /Criar minha conta/i }).count()) === 1,
);

/* --- 4. a escada usa o tecido, não o acento ------------------------------ */
// oklch(0.2 0.01 260) — preto de kimono. O acento da preta é oklch(0.64 0.205 30),
// vermelho: se o último trecho vier claro e saturado, alguém trocou a fonte.
const ultimo = await escada.locator("span").last().evaluate((el) => {
  const c = getComputedStyle(el).backgroundColor;
  const [r, g, bl] = c.match(/[\d.]+/g).map(Number);
  return { c, luz: (r + g + bl) / 3, vermelhaco: r - Math.max(g, bl) };
});
conferir(
  "a ponta da escada é preta, não vermelha",
  ultimo.luz < 90 && ultimo.vermelhaco < 20,
  ultimo.c,
);

await b.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
