/** Login de verdade: sem stub nenhum, bate no Supabase real. */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:4190";
const SENHA = "Tatame#2026";
const CONTAS = ["joao", "maria", "carlos", "mestre"];

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const resultado = [];
for (const nome of CONTAS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const respostas = [];
  p.on("requestfailed", (r) => {
    if (r.url().includes("supabase.co")) respostas.push({ falhou: r.failure()?.errorText, url: r.url().slice(0, 80) });
  });
  p.on("response", async (r) => {
    if (r.url().includes("/auth/v1/token")) {
      respostas.push({ status: r.status(), corpo: (await r.text().catch(() => "")).slice(0, 200) });
    }
  });
  await p.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await p.getByLabel(/E-mail/i).fill(`${nome}.teste@tatame.app`);
  await p.getByLabel(/Senha/i).fill(SENHA);
  await p.getByRole("button", { name: /^Entrar$/ }).click();
  await p.waitForTimeout(4000);
  resultado.push({
    conta: nome,
    url: new URL(p.url()).pathname,
    entrou: !p.url().includes("/auth"),
    resposta: respostas[0] ?? null,
    aviso: (await p.locator("body").innerText()).match(/(Invalid|Database error|Não |Failed|erro)[^\n]*/i)?.[0] ?? null,
  });
  await ctx.close();
}
console.log(JSON.stringify(resultado, null, 2));
await b.close();
