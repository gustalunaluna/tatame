/**
 * O hexágono conta o treino que acabou de ser registrado.
 *
 * O defeito que este teste tranca: `useTrainings().invalidate()` derrubava o
 * cache do diário e das conquistas, mas NÃO o de `sinais_do_jogo` — que é
 * quem alimenta os seis eixos. Como as consultas do app valem 5 minutos, quem
 * registrasse um treino e fosse olhar o painel do jogo via exatamente o mesmo
 * gráfico de antes, por cinco minutos. Parecia que o hexágono tinha ignorado
 * o treino; ele estava lendo a resposta velha.
 *
 * Era invisível de dois jeitos: não dá erro, e passa despercebido por quem
 * testa registrando um treino e recarregando a página (recarregar zera o
 * cache e esconde o bug).
 *
 * A conferência é a única que prova de verdade: contar as idas ao
 * `/rpc/sinais_do_jogo`. Se depois de salvar o treino o app não perguntar de
 * novo ao banco, o número não sobe.
 *
 * Dois detalhes que o teste precisa respeitar, e o segundo já me enganou uma
 * vez aqui:
 *
 * 1. O react-query só REFAZ a consulta que está montada na tela. Invalidar em
 *    `/diario` só marca como velha; a ida ao banco acontece quando o painel do
 *    jogo monta. Por isso o roteiro é início → diário → salvar → início.
 *
 * 2. A navegação tem que ser PELA BARRA DO APP, nunca por `page.goto()`.
 *    `goto` recarrega a página e joga fora o cache inteiro — com ele, a volta
 *    ao início sempre consulta o banco, com correção ou sem ela, e o teste
 *    passa nos dois casos. Foi exatamente o que aconteceu na primeira versão
 *    disto: verde com o conserto e verde sem ele, ou seja, medindo nada.
 */
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const falhas = [];
const ok = [];

function conferir(nome, condicao, detalhe = "") {
  if (condicao) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

const hoje = new Date().toISOString().slice(0, 10);

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
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

const p = await ctx.newPage();

let idasAosSinais = 0;
let treinosGravados = 0;

await p.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const metodo = rota.request().method();
  const json = (b) =>
    rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(b),
    });

  if (url.includes("/rpc/sinais_do_jogo")) {
    idasAosSinais++;
    return json([]);
  }
  if (url.includes("/auth/v1/user"))
    return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rest/v1/trainings")) {
    if (metodo === "POST") {
      treinosGravados++;
      return json([{ id: "t-novo", user_id: "u1", date: hoje }]);
    }
    return json([]);
  }
  if (url.includes("/rest/v1/profiles"))
    return json([
      {
        user_id: "u1",
        questionario_em: "2026-07-30T01:32:14.123065+00:00",
        seeded: true,
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
  if (url.includes("/rpc/achievement_stats")) return json({ total: 100, unlocked: 10 });
  return json([]);
});

/* --- 1. o painel monta e busca os sinais uma vez ------------------------- */
await p.goto(`${BASE}/`, { waitUntil: "load" });
await p.waitForTimeout(2500);

const antes = idasAosSinais;
conferir("o painel do jogo consulta os sinais ao abrir", antes >= 1, `${antes} idas`);

/* --- 2. registra um treino ---------------------------------------------- */
// Pela barra do app: `goto` recarregaria a página e zeraria o cache, que é
// justamente o que o teste precisa manter vivo. Ver a nota 2 no topo.
await p.getByRole("link", { name: /^Diário$/ }).first().click();
await p.waitForTimeout(1500);

await p.getByRole("button", { name: /Novo/i }).first().click();
await p.waitForTimeout(800);

const salvar = p.getByRole("button", { name: /Salvar treino/i }).first();
conferir("o formulário de treino abre", (await salvar.count()) === 1);
await salvar.click();
await p.waitForTimeout(2000);

conferir("o treino foi gravado", treinosGravados >= 1, `${treinosGravados} POSTs`);

/* --- 3. o painel volta e PERGUNTA DE NOVO -------------------------------- */
// Sem a invalidação, o react-query serve o cache de 5 minutos e este número
// fica parado — que é exatamente o defeito. De novo pela barra, sem recarregar.
await p.getByRole("link", { name: /^Início$/ }).first().click();
await p.waitForTimeout(2500);

conferir(
  "depois de salvar, o hexágono relê o banco",
  idasAosSinais > antes,
  `antes ${antes}, depois ${idasAosSinais}`,
);

await navegador.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
