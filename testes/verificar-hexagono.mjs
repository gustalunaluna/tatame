/**
 * O hexágono na tela — desenhado a partir das rolas, não de auto-avaliação.
 *
 * O modelo que vira rola em nota tem teste próprio (verificar-hexagono-derivado).
 * Aqui o que se prende é o que a TELA faz com o resultado:
 *
 *   1. os seis eixos aparecem, e na ORDEM FIXA — se alguém ordenar por nota,
 *      o formato de uma semana deixa de ser comparável com o de outra, que é a
 *      razão de o gráfico existir
 *   2. eixo sem rola registrada vira "?" e NÃO vira ponto no centro — ausência
 *      e nota zero são coisas opostas, e é o pior erro que este gráfico pode
 *      cometer
 *   3. a tabela diz "sem rolas registradas" em vez de mostrar um número
 *   4. a geometria está certa — nota 5 encosta no anel externo
 *   5. o plano só aponta para eixo que TEM dado
 *   6. o hexágono aparece também no Início
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

const hoje = new Date();
const diasAtras = (n) =>
  new Date(hoje.getTime() - n * 86400000).toISOString().slice(0, 10);

/**
 * O caso realista: o formulário de fechamento pergunta os cinco contadores de
 * uma vez, então fechar um treino acende os cinco eixos juntos. O que fica
 * separado é o GÁS, que depende de responder o ritmo da sessão — e aqui ele
 * não foi respondido.
 *
 * Muitas finalizações contra parceiro de faixa acima empurram a finalização
 * para perto do teto; zero raspadas deixam a guarda lá embaixo. As duas pontas
 * da escala numa figura só.
 */
const SINAIS = Array.from({ length: 40 }, (_, i) => ({
  data: diasAtras((i % 5) + 1),
  parceiro_faixa: "Preta",
  rolas: 1,
  fin_a_favor: 6,
  fin_sofridas: 0,
  pass_a_favor: 0,
  pass_sofridas: 0,
  rasp_a_favor: 0,
  rasp_sofridas: 0,
  confirmado: true,
  detalhado: true,
  ritmo_caiu_na: null,
  ritmo_respondido: false,
  rolas_da_sessao: 5,
}));

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

let sinais = SINAIS;

await p.route(`https://${REF}.supabase.co/**`, (rota) => {
  const url = rota.request().url();
  const json = (b) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: EU, aud: "authenticated" });
  if (url.includes("/rpc/sinais_do_jogo")) return json(sinais);
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: EU, questionario_em: "2026-07-30T01:32:14.123065+00:00", handle: "eu", nickname: "Eu", belt: "Branca", degrees: 0, birth_date: "1996-01-01" }]);
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

/* --- 2. eixo sem dado vira "?", nunca ponto no centro -------------------- */
// Só finalização e defesa foram alimentadas. Os outros quatro precisam ficar
// calados — e "calado" tem que ser visualmente diferente de "nota zero".
const interrogacoes = await p
  .locator('svg[role="img"] text')
  .evaluateAll((ns) => ns.filter((n) => n.textContent?.trim() === "?").length);
conferir(
  "o gás, sem o ritmo respondido, vira '?'",
  interrogacoes === 1,
  `${interrogacoes} interrogações`,
);
const marcadores = await p.locator('svg[role="img"] circle').count();
conferir(
  "e os cinco eixos com dado ganham marcador",
  marcadores === 5,
  `${marcadores} marcadores`,
);

/* --- 3. a tabela não inventa número -------------------------------------- */
const linhaGas = await p
  .locator("tr", { has: p.locator('th:text-is("Gás")') })
  .first()
  .evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
conferir(
  "a tabela diz 'sem rolas registradas' em vez de mostrar zero",
  /sem rolas registradas/.test(linhaGas),
  linhaGas,
);
const linhaFin = await p
  .locator("tr", { has: p.locator('th:text-is("Finalização")') })
  .first()
  .evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
conferir(
  "e mostra número onde há dado",
  /Finalização\s*[0-9]/.test(linhaFin) && !/sem rolas/.test(linhaFin),
  linhaFin,
);

/* --- 4. a geometria ------------------------------------------------------ */
// Centro (180,150), raio 98, primeiro eixo no topo. Finalização é o 3º eixo
// (índice 2). Muitas finalizações contra faixa acima levam a nota perto do
// teto, então o vértice tem que estar longe do centro.
const daAgora = await p
  .locator('svg[role="img"] polygon')
  .evaluateAll((ns) => {
    const serie = ns.find((n) => Number(n.getAttribute("stroke-width") ?? 0) === 2);
    return (serie?.getAttribute("points") ?? "")
      .split(" ")
      .map((par) => par.split(",").map(Number));
  });
const raio = (i) =>
  Math.hypot(daAgora[i][0] - 180, daAgora[i][1] - 150);
conferir(
  "o eixo com dado sai do centro",
  raio(2) > 50,
  `raio ${raio(2).toFixed(1)}`,
);
// Guarda: zero raspadas em 40 rolas respondidas. Isso É dado — nota baixa,
// não ausência. A diferença entre este vértice e o do gás é a diferença
// entre "não faço" e "não sei".
conferir(
  "zero raspadas respondidas é nota baixa, e nota baixa fica perto do centro",
  raio(0) > 0.6 && raio(0) < 35,
  `raio ${raio(0).toFixed(1)}`,
);
conferir(
  "e o gás, que ninguém respondeu, fica exatamente no centro",
  raio(5) < 0.6,
  `raio ${raio(5).toFixed(1)}`,
);

/* --- 5. o plano só usa eixo com dado ------------------------------------- */
const focos = await p
  .locator("ol li")
  .evaluateAll((ns) => ns.map((n) => n.querySelectorAll("span")[1]?.textContent?.trim() ?? ""));
conferir(
  "o plano nunca aponta para o eixo que o app não mediu",
  focos.length > 0 && !focos.includes("Gás"),
  focos.join(" > "),
);
conferir(
  "e aponta para a guarda, que é a nota mais baixa entre as medidas",
  focos[0] === "Guarda",
  focos.join(" > "),
);

/* --- 6. o hexágono também aparece no Início ------------------------------ */
await p.goto(`${BASE}/`, { waitUntil: "load" });
await p.waitForTimeout(1500);
conferir(
  "o hexágono aparece no Início",
  (await p.locator('svg[role="img"]').count()) >= 1,
);
conferir(
  "e leva para Evolução ao toque",
  (await p.locator('a[href="/metas"]').count()) >= 1,
);

/* --- 7. a fita de meses compara DENTRO do mesmo hexágono ----------------- */
// A comparação não é um segundo gráfico: é o mesmo, com um contorno tracejado
// por baixo. Este bloco prende as três coisas que fazem isso funcionar — a
// fita existir no Início, dois meses desenharem dois polígonos, e o "8
// semanas" devolver ao padrão.
const doisMeses = [
  ...Array.from({ length: 10 }, () => ({
    data: "2026-07-10", parceiro_faixa: "Azul", rolas: 1,
    fin_a_favor: 0, fin_sofridas: 0, pass_a_favor: 0, pass_sofridas: 0,
    rasp_a_favor: 3, rasp_sofridas: 0, confirmado: true, detalhado: true,
    ritmo_caiu_na: null, ritmo_respondido: false, rolas_da_sessao: 5,
  })),
  ...Array.from({ length: 10 }, () => ({
    data: "2026-08-02", parceiro_faixa: "Azul", rolas: 1,
    fin_a_favor: 0, fin_sofridas: 0, pass_a_favor: 3, pass_sofridas: 0,
    rasp_a_favor: 0, rasp_sofridas: 0, confirmado: true, detalhado: true,
    ritmo_caiu_na: null, ritmo_respondido: false, rolas_da_sessao: 5,
  })),
];
sinais = doisMeses;

await p.goto(`${BASE}/`, { waitUntil: "load" });
await p.waitForTimeout(2000);

const oitoSemanas = p.getByRole("button", { name: "8 semanas" });
conferir("a fita de meses aparece no Início", (await oitoSemanas.count()) === 1);
conferir(
  "e o padrão nasce marcado",
  (await oitoSemanas.getAttribute("aria-pressed")) === "true",
);

// Um polígono no padrão — a leitura rolante não sobrepõe nada.
conferir(
  "no padrão há uma figura só",
  (await p.locator('svg[role="img"] polygon:not([fill="none"])').count()) >= 1 &&
    (await p.locator('svg[role="img"] polygon[stroke-dasharray]').count()) === 0,
);

const jul = p.getByRole("button", { name: /jul\/26/ });
const ago = p.getByRole("button", { name: /ago\/26/ });
conferir("os dois meses com rola aparecem", (await jul.count()) === 1 && (await ago.count()) === 1);

await jul.click();
await p.waitForTimeout(600);
conferir(
  "tocar um mês desmarca o padrão",
  (await oitoSemanas.getAttribute("aria-pressed")) === "false",
);

await ago.click();
await p.waitForTimeout(700);
conferir(
  "dois meses desenham o contorno tracejado no MESMO hexágono",
  (await p.locator('svg[role="img"] polygon[stroke-dasharray]').count()) === 1,
);
// O mais novo em cima, o mais antigo tracejado — independente da ordem dos
// toques. Aqui jul foi tocado primeiro, e mesmo assim é ele o tracejado.
const titulo = await p.locator('svg[role="img"] title').first().textContent();
conferir(
  "o mais novo fica cheio e o mais antigo tracejado",
  /ago\/26 comparado com jul\/26/.test(titulo ?? ""),
  titulo ?? "",
);

await oitoSemanas.click();
await p.waitForTimeout(600);
conferir(
  "o botão do padrão devolve à leitura rolante",
  (await p.locator('svg[role="img"] polygon[stroke-dasharray]').count()) === 0 &&
    (await oitoSemanas.getAttribute("aria-pressed")) === "true",
);

/* --- sem nenhuma rola, o app se cala ------------------------------------- */
sinais = [];
await p.goto(`${BASE}/metas`, { waitUntil: "load" });
await p.waitForTimeout(1500);
const vazio = await p.locator("body").evaluate((el) => el.textContent ?? "");
conferir(
  "sem rolas, o app diz que está calado em vez de desenhar zeros",
  vazio.includes("calado"),
  vazio.slice(0, 100),
);
conferir(
  "e não desenha figura nenhuma",
  (await p.locator('svg[role="img"] polygon').count()) === 0,
);

/* ------------------------------------------------------------------------ */
conferir("nenhum erro de página", erros.length === 0, erros.join(" / "));

await navegador.close();

for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
