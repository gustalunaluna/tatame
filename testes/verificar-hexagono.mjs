/**
 * O hexágono do jogo, a sobreposição de dois meses, e o plano que sai daí.
 *
 * O que este teste prende:
 *   1. os seis eixos aparecem, e na ORDEM FIXA — se alguém ordenar por nota,
 *      o formato de um mês deixa de ser comparável com o de outro, que é a
 *      razão de o gráfico existir
 *   2. são desenhados DOIS polígonos quando há mês de comparação, e um só
 *      quando não há
 *   3. as duas séries se distinguem sem depender de cor: a de agora tem
 *      marcadores e preenchimento, a de antes é tracejada e vazia
 *   4. a geometria está certa — nota 5 encosta no anel externo, nota 0 fica
 *      no centro
 *   5. a tabela repete os números com a diferença, que é a leitura sem a
 *      distorção de área do radar
 *   6. o plano aponta para o eixo MAIS BAIXO e intercala o segundo
 */
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const EU = "00000000-0000-0000-0000-0000000000ff";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

// Guarda 5 (o máximo), gás 0 (o mínimo) — extremos de propósito, para a
// geometria poder ser conferida contra o anel externo e contra o centro.
const AGORA = {
  mes: "2026-08-01",
  guarda: 5,
  passagem: 3,
  finalizacao: 2,
  retencao: 4,
  defesa: 1,
  gas: 0,
  nota: "voltei de lesão",
};
const ANTES = {
  mes: "2026-07-01",
  guarda: 3,
  passagem: 3,
  finalizacao: 1,
  retencao: 2,
  defesa: 1,
  gas: 2,
  nota: "",
};

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref, eu]) => {
  localStorage.setItem(
    `sb-${ref}-auth-token`,
    JSON.stringify({
      access_token: "fake",
      refresh_token: "fake",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: eu, aud: "authenticated" },
    }),
  );
}, [REF, EU]);

const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

let avaliacoes = [AGORA, ANTES];

await p.route(`https://${REF}.supabase.co/**`, (rota) => {
  const url = rota.request().url();
  const json = (b) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: EU, aud: "authenticated" });
  if (url.includes("/rest/v1/avaliacoes_do_jogo")) return json(avaliacoes);
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: EU, handle: "eu", nickname: "Eu", belt: "Roxa", degrees: 2 }]);
  return json([]);
});

await p.goto(`${BASE}/metas`, { waitUntil: "load" });
await p.waitForTimeout(1500);

const texto = await p.locator("body").evaluate((el) => el.textContent ?? "");

/* --- 1. os seis eixos, na ordem fixa ------------------------------------- */
const ORDEM = ["Guarda", "Passagem", "Finalização", "Retenção", "Defesa", "Gás"];
const rotulos = await p
  .locator('svg[role="img"] text')
  .evaluateAll((ns) => ns.map((n) => n.textContent?.trim() ?? ""));
const soEixos = rotulos.filter((t) => ORDEM.includes(t));
conferir(
  "os seis eixos aparecem",
  ORDEM.every((n) => soEixos.includes(n)),
  soEixos.join(", "),
);
conferir(
  "e na ordem fixa — reordenar quebraria a comparação entre meses",
  soEixos.join("|") === ORDEM.join("|"),
  soEixos.join("|"),
);

/* --- 2 e 3. duas séries, distinguíveis sem cor --------------------------- */
const poligonos = await p.locator('svg[role="img"] polygon').evaluateAll((ns) =>
  ns.map((n) => ({
    pontos: n.getAttribute("points") ?? "",
    traco: n.getAttribute("stroke-dasharray") ?? "",
    preenche: n.getAttribute("fill") ?? "",
    largura: Number(n.getAttribute("stroke-width") ?? 0),
  })),
);
// Os anéis também são polígonos; as séries são as de traço 2.
const series = poligonos.filter((g) => g.largura === 2);
conferir("duas séries desenhadas", series.length === 2, `${series.length} de traço 2`);

const tracejada = series.filter((s) => s.traco);
const cheia = series.filter((s) => !s.traco);
conferir("a série de antes é tracejada", tracejada.length === 1);
conferir(
  "a série de antes não tem preenchimento",
  tracejada[0]?.preenche === "none",
  tracejada[0]?.preenche,
);
conferir(
  "a série de agora é preenchida",
  cheia[0]?.preenche !== "none" && Boolean(cheia[0]?.preenche),
  cheia[0]?.preenche,
);

// Só dentro do gráfico: a legenda e os ícones da página também têm círculo,
// e contar a página inteira mediria outra coisa.
const marcadores = await p.locator('svg[role="img"] circle').count();
conferir(
  "só a série de agora tem marcadores (6)",
  marcadores === 6,
  `${marcadores} círculos no gráfico`,
);

/* --- 4. a geometria ------------------------------------------------------ */
// Centro (180,150), raio 98, primeiro eixo no topo. Guarda = 5 tem que
// encostar no anel externo: y = 150 - 98 = 52. Gás = 0 fica no centro.
const daAgora = cheia[0]?.pontos.split(" ").map((par) => par.split(",").map(Number)) ?? [];
conferir(
  "nota 5 encosta no anel externo",
  daAgora[0] && Math.abs(daAgora[0][0] - 180) < 0.5 && Math.abs(daAgora[0][1] - 52) < 0.5,
  JSON.stringify(daAgora[0]),
);
conferir(
  "nota 0 fica no centro",
  daAgora[5] && Math.abs(daAgora[5][0] - 180) < 0.5 && Math.abs(daAgora[5][1] - 150) < 0.5,
  JSON.stringify(daAgora[5]),
);

/* --- 5. a tabela --------------------------------------------------------- */
const linhaGuarda = await p
  .locator("tr", { has: p.locator('th:text-is("Guarda")') })
  .first()
  .evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
conferir(
  "a tabela mostra antes, agora e a diferença",
  /Guarda\s*3\s*5\s*\+2/.test(linhaGuarda),
  linhaGuarda,
);
const linhaGas = await p
  .locator("tr", { has: p.locator('th:text-is("Gás")') })
  .first()
  .evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
conferir("a piora aparece com sinal", /Gás\s*2\s*0\s*-2/.test(linhaGas), linhaGas);

/* --- 6. o plano ---------------------------------------------------------- */
// Gás é 0, o mais baixo; defesa é 1, o segundo. O plano vai nos dois,
// alternando — semana 1 e 3 no principal, 2 e 4 no secundário.
conferir("o plano aponta para o eixo mais baixo", texto.includes("O mês aponta para gás"), "");
conferir("e o segundo mais baixo entra junto", texto.includes("Defesa"), "");
const focos = await p
  .locator("ol li")
  .evaluateAll((ns) => ns.map((n) => n.querySelectorAll("span")[1]?.textContent?.trim() ?? ""));
conferir(
  "as semanas alternam entre os dois temas",
  focos.length === 4 && focos[0] === focos[2] && focos[1] === focos[3] && focos[0] !== focos[1],
  focos.join(" > "),
);

/* --- sem comparação, um polígono só -------------------------------------- */
avaliacoes = [AGORA];
await p.reload({ waitUntil: "load" });
await p.waitForTimeout(1500);
const soUm = await p
  .locator('svg[role="img"] polygon')
  .evaluateAll((ns) => ns.filter((n) => Number(n.getAttribute("stroke-width") ?? 0) === 2).length);
conferir("sem mês de comparação, uma série só", soUm === 1, `${soUm} séries`);

/* ------------------------------------------------------------------------ */
conferir("nenhum erro de página", erros.length === 0, erros.join(" / "));

await navegador.close();

for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
