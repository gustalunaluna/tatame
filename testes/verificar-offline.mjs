/**
 * O app abre sem internet.
 *
 * Esta é a condição normal de uso, não a exceção: subsolo de academia, parede
 * de bloco, celular no fundo da mochila. Antes do service worker o Ponteira
 * mostrava a tela de dinossauro do Chrome — um diário de treino que só
 * funciona com sinal não serve para registrar treino.
 *
 * Confere quatro coisas:
 *   1. o service worker instala e assume o controle da página
 *   2. recarregar offline ainda pinta o app
 *   3. uma rota interna abre offline (é o navigateFallback; sem ele, /diario
 *      offline devolve 404, porque não há servidor para responder e as rotas
 *      são todas do cliente)
 *   4. /auth/v1/ ficou FORA do cache — token de sessão em disco seria um furo,
 *      e o app "abriria logado" com credencial vencida
 *
 * O que NÃO está aqui: "quem está logado não é expulso offline". Essa regra
 * morava neste arquivo e passava com a correção ligada e desligada, porque a
 * sessão plantada no localStorage nunca era aceita pelo supabase-js. Ela agora
 * é conferida direto na função que decide, em verificar-sessao-offline.mjs.
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
// `serviceWorkers: "allow"` porque aqui ele É o objeto do teste. O padrão do
// navegador de teste é bloquear — ver o comentário em navegador.mjs.
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "allow",
});
const p = await ctx.newPage();

/* --- 1. o service worker assume ------------------------------------------ */

await p.goto(`${BASE}/auth`, { waitUntil: "load" });

// `ready` resolve quando há registro ativo, mas a primeira carga da página não
// é controlada por ele — o SW só assume no próximo documento. Por isso o
// recarregamento abaixo, antes de qualquer conferência de offline.
const registrou = await p
  .evaluate(() => navigator.serviceWorker.ready.then(() => true))
  .catch(() => false);
conferir("o service worker registra", registrou === true);

await p.reload({ waitUntil: "load" });
const controlada = await p.evaluate(() => !!navigator.serviceWorker.controller);
conferir("o service worker controla a página", controlada);

// Espera o precache terminar de gravar. Sem isto o teste corre contra um cache
// pela metade e falha por corrida, não por defeito.
await p.waitForTimeout(1500);

/* --- 2. recarregar offline ainda pinta ----------------------------------- */

await ctx.setOffline(true);

const recarregouOffline = await p
  .reload({ waitUntil: "load" })
  .then(() => true)
  .catch(() => false);
conferir("a página recarrega offline", recarregouOffline);

conferir(
  "a marca aparece offline",
  (await p.getByRole("heading", { name: "Ponteira", level: 1 }).count()) === 1,
);

/* --- 3. rota interna offline --------------------------------------------- */

// /diario nunca foi visitada nesta sessão: se abrir, foi o navigateFallback
// devolvendo o index.html do precache, que é exatamente o que se quer provar.
const abriuRotaInterna = await p
  .goto(`${BASE}/diario`, { waitUntil: "load" })
  .then((r) => r === null || r.status() < 400)
  .catch(() => false);
conferir("uma rota interna abre offline", abriuRotaInterna);

// O `load` termina antes de a guarda de sessão decidir para onde ir, e a
// primeira versão desta conferência lia o DOM no meio dessa decisão: falhava
// por corrida, com o app funcionando. Esperar o desenho é o certo.
await p
  .waitForFunction(
    () => (document.getElementById("root")?.childElementCount ?? 0) > 0,
    null,
    { timeout: 8000 },
  )
  .catch(() => {});

// Sem sessão o app manda para /auth — o que importa aqui é que ele PINTOU
// alguma coisa em vez de devolver erro de rede do navegador.
conferir(
  "o app desenha offline em vez de erro de rede",
  await p.evaluate(
    () => (document.getElementById("root")?.childElementCount ?? 0) > 0,
  ),
);

await ctx.setOffline(false);

/* --- 4. autenticação fora do cache --------------------------------------- */

const cacheado = await p.evaluate(async () => {
  const nomes = await caches.keys();
  const urls = [];
  for (const n of nomes) {
    const c = await caches.open(n);
    for (const req of await c.keys()) urls.push(req.url);
  }
  return {
    auth: urls.filter((u) => u.includes("/auth/v1/")).length,
    total: urls.length,
  };
});
conferir(
  "nenhuma resposta de /auth/v1/ foi para o cache",
  cacheado.auth === 0,
  `${cacheado.auth} encontradas`,
);
conferir(
  "o precache gravou o app",
  cacheado.total > 10,
  `${cacheado.total} entradas`,
);

await b.close();

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
