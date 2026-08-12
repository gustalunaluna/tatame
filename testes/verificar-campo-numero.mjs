/**
 * Verifica que apagar um campo numérico apaga MESMO.
 *
 * O bug: `value` era `number` e o onChange fazia `+e.target.value`. Como `+""`
 * é 0 (e não NaN), limpar o campo repintava "0" ali dentro — e o número
 * digitado em seguida entrava depois do zero. Duração de 120 minutos aparecia
 * na tela como "0120".
 *
 * Este teste digita como uma pessoa digita: seleciona tudo, apaga, escreve.
 * Se o zero fantasma voltar, ele reprova.
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
  const url = rota.request().url();
  const json = (b) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: "u1", questionario_em: "2026-07-30T01:32:14.123065+00:00", seeded: true }]);
  return json([]);
});

await pagina.goto(`${BASE}/diario`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(700);

await pagina.getByRole("button", { name: /Novo/ }).click();
await pagina.waitForTimeout(400);

await pagina.waitForSelector("#duracao", { timeout: 5000 });

const duracao = pagina.locator("#duracao");
const rolas = pagina.locator("#rolas");

// De quebra, confere o par rótulo/campo — sem ele o leitor de tela anuncia
// "campo em branco" e o toque no rótulo não foca nada.
const rotulado = await pagina.evaluate(() =>
  ["duracao", "rolas"].every(
    (id) => !!document.querySelector(`label[for="${id}"]`),
  ),
);

const antes = await duracao.inputValue();

// Apagar tudo e digitar, que é o gesto que produzia o bug.
await duracao.click();
await duracao.press("ControlOrMeta+a");
await duracao.press("Backspace");
const vazio = await duracao.inputValue();
await duracao.type("120");
const depoisDeDigitar = await duracao.inputValue();

// O mesmo em Rolas, com um número de um dígito só.
await rolas.click();
await rolas.press("ControlOrMeta+a");
await rolas.press("Backspace");
await rolas.type("6");
const rolasDepois = await rolas.inputValue();

// Sair do campo normaliza: vazio vira o mínimo, sem zero fantasma.
// Sai com Tab, não clicando fora — clicar fora fecha o diálogo e o campo
// deixa de existir antes de dar tempo de lê-lo.
await duracao.click();
await duracao.press("ControlOrMeta+a");
await duracao.press("Backspace");
await duracao.press("Tab");
await pagina.waitForTimeout(200);
const vazioDepoisDoBlur = await duracao.inputValue();

const resultado = {
  antes,
  rotuloLigadoAoCampo: rotulado,
  aoApagarFicaVazio: vazio === "",
  duracaoDigitada: depoisDeDigitar,
  rolasDigitado: rolasDepois,
  vazioDepoisDoBlur,
  semZeroFantasma: depoisDeDigitar === "120" && rolasDepois === "6",
};

console.log(JSON.stringify(resultado, null, 2));

await navegador.close();

if (!resultado.semZeroFantasma) {
  console.error(
    `FALHOU: esperava "120" e "6", veio "${depoisDeDigitar}" e "${rolasDepois}".`,
  );
  process.exit(1);
}
if (!resultado.aoApagarFicaVazio) {
  console.error("FALHOU: apagar o campo não deixou ele vazio.");
  process.exit(1);
}
