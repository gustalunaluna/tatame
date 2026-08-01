/**
 * O caso exato relatado: alguém foi ACEITO como parceiro e NUNCA treinou
 * junto. Ele tem que aparecer na lista mesmo assim — é lista de amigos,
 * não de placares.
 */
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4194";

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "t", refresh_token: "r",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "u1", email: "eu@teste.app", aud: "authenticated" },
  }));
}, [REF]);

const pagina = await ctx.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));
pagina.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)); });

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const url = rota.request().url();
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "eu@teste.app", aud: "authenticated" });

  // Parceria aceita — a direção vem de fora, para testar os dois lados.
  if (url.includes("/rest/v1/partnerships")) return json([
    process.env.EU_ACEITEI
      ? { id: "p1", requester_id: "u2", addressee_id: "u1", status: "aceito", created_at: "2026-07-01" }
      : { id: "p1", requester_id: "u1", addressee_id: "u2", status: "aceito", created_at: "2026-07-01" },
  ]);
  if (url.includes("/rpc/cartao_publico")) return json([
    { user_id: "u2", handle: "joaozinho", nickname: "Joãozinho", belt: "Branca",
      degrees: 2, gym: "Academia Teste", photo_url: "", bio: "" },
  ]);

  // ...e NENHUM treino registrado junto. É aqui que ele sumia.
  if (url.includes("/rpc/resumo_parceiros")) return json([]);
  if (url.includes("/rpc/registros_a_confirmar")) return json([]);

  if (url.includes("/rest/v1/profiles")) return json([
    { user_id: "u1", seeded: true, nickname: "Eu", handle: "eu", belt: "Branca",
      degrees: 3, gym: "", master: "", photo_url: "", bio: "", birth_date: null,
      fights_won: 0, fights_lost: 0, goal_start: "2025-10-13" },
  ]);
  return json([]);
});

await pagina.goto(`${BASE}/parceiros`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);

const corpo = await pagina.locator("body").innerText();
console.log(JSON.stringify({
  direcao: process.env.EU_ACEITEI ? "ele convidou, EU aceitei" : "eu convidei, ele aceitou",
  apareceNaLista: corpo.includes("Joãozinho"),
  mostraQueNaoTreinaram: /ainda não treinaram juntos/i.test(corpo),
  diseVazioIndevidamente: /Nenhum parceiro ainda/i.test(corpo),
  tituloDaLista: corpo.match(/Seus parceiros[^\n]*/i)?.[0] ?? null,
  erros: [...new Set(erros)],
}, null, 2));

await navegador.close();
