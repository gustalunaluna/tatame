/**
 * Verifica o comportamento quando o banco RECUSA a gravação.
 * Antes da correção o app mostrava "Treino registrado. Boa!" mesmo assim,
 * e o treino se perdia em silêncio.
 */
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4184";

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "fake", refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "u1", email: "teste@exemplo.com", aud: "authenticated" },
  }));
}, [REF]);

const pagina = await ctx.newPage();

await pagina.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const req = rota.request();
  const url = req.url();
  const json = (b, status = 200) =>
    rota.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });

  // O insert de treino é recusado, como se a RLS ou a rede tivessem falhado.
  if (url.includes("/rest/v1/trainings") && req.method() === "POST") {
    return json({ message: "permission denied for table trainings", code: "42501" }, 403);
  }
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rest/v1/profiles")) return json([{ user_id: "u1", questionario_em: "2026-07-30T01:32:14.123065+00:00", seeded: true }]);
  return json([]);
});

await pagina.goto(`${BASE}/diario`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(700);

await pagina.getByRole("button", { name: /Novo/ }).click();
await pagina.waitForTimeout(400);
await pagina.getByRole("button", { name: /Salvar|Registrar/i }).last().click();
await pagina.waitForTimeout(1500);

const corpo = await pagina.locator("body").innerText();
console.log(JSON.stringify({
  mostrouSucessoIndevido: corpo.includes("Treino registrado"),
  mostrouErro: /Não deu para registrar o treino/.test(corpo),
  trechoDoAviso: corpo.match(/Não deu para[^\n]*/)?.[0] ?? null,
}, null, 2));

await navegador.close();
