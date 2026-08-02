/**
 * Cadastrar um mestre que não usa o app — com faixa e academia.
 *
 * A metade da linhagem de qualquer faixa-preta é de gente que nunca vai abrir
 * este app, e até aqui o formulário só guardava o NOME dela. O mestre aparecia
 * no perfil como uma linha solta, sem faixa e sem academia, mesmo quando quem
 * cadastrou sabia as duas coisas.
 *
 * O que este teste prende:
 *   1. os campos de faixa/academia aparecem só para mestre de fora do app
 *   2. escolher alguém com conta faz os campos sumirem — a graduação dele é
 *      dele, e deixar outro declarar seria o erro que a migração 021 desfez
 *   3. os graus seguem a escada da faixa (preta vai até o 6º, não até o 4º)
 *   4. salvar cria a ficha em `linhagem_externa` E amarra o vínculo nela
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

// O que o cliente mandou gravar. É a única prova que importa: a tela pode
// mostrar os campos e mesmo assim jogar o conteúdo fora na hora de salvar.
const gravado = { externa: null, vinculo: null };

await p.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const req = rota.request();
  const url = req.url();
  const json = (b) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: EU, aud: "authenticated" });

  if (url.includes("/rest/v1/linhagem_externa") && req.method() === "POST") {
    gravado.externa = JSON.parse(req.postData() ?? "{}");
    return json({ id: "eeeeeeee-0000-0000-0000-000000000001" });
  }
  if (url.includes("/rest/v1/master_links") && req.method() === "POST") {
    gravado.vinculo = JSON.parse(req.postData() ?? "{}");
    return json([{ id: "aaaaaaaa-0000-0000-0000-000000000001" }]);
  }

  // Uma busca por "@emy" acha conta; qualquer outro termo não acha nada.
  if (url.includes("/rpc/buscar_por_handle")) {
    const termo = String(JSON.parse(req.postData() ?? "{}").termo ?? "");
    return json(
      termo.includes("emy")
        ? [{ user_id: "11111111-0000-0000-0000-000000000001", nickname: "Emy Lopes",
             handle: "emy", belt: "Preta", degrees: 1, photo_url: "", verificado: true }]
        : [],
    );
  }

  if (url.includes("/rpc/perfil_publico")) return json([]);
  return json([]);
});

await p.goto(`${BASE}/meus-mestres`, { waitUntil: "load" });
await p.waitForTimeout(900);

await p.getByRole("button", { name: /Cadastrar mestre|Novo|Adicionar/i }).first().click();
await p.waitForTimeout(400);

const campoNome = p.getByLabel("Quem é");
const campoAcademia = p.getByLabel("Academia dele");

// --- 1. sem conta escolhida, os campos estão lá --------------------------
conferir("a academia do mestre pode ser escrita", await campoAcademia.isVisible());

await campoNome.fill("Guico");
await p.waitForTimeout(800);
conferir(
  "nome sem conta mantém os campos de fora do app",
  await campoAcademia.isVisible(),
);

// --- 3. a escada de graus segue a faixa ----------------------------------
await p.getByRole("combobox", { name: "Faixa dele" }).click();
await p.waitForTimeout(250);
await p.getByRole("option", { name: "Preta", exact: true }).click();
await p.waitForTimeout(250);
await p.getByRole("combobox", { name: "Grau" }).click();
await p.waitForTimeout(250);
const graus = await p.getByRole("option").allTextContents();
conferir(
  "a preta oferece até o 6º grau",
  graus.some((g) => g.includes("6º")),
  graus.join(" | "),
);
conferir(
  "e não inventa um 7º — dali em diante o grau é a cor do tecido",
  !graus.some((g) => g.includes("7º")),
  graus.join(" | "),
);
await p.getByRole("option", { name: "2º grau" }).click();
await p.waitForTimeout(250);

await campoAcademia.fill("B9 Jiu-Jitsu");

// --- 4. salvar grava a ficha E amarra o vínculo nela ---------------------
await p.getByRole("button", { name: /^Cadastrar$/ }).click();
await p.waitForTimeout(1200);

conferir("a ficha do mestre de fora foi criada", gravado.externa !== null);
conferir(
  "com a faixa que foi escolhida",
  gravado.externa?.belt === "Preta" && gravado.externa?.degrees === 2,
  JSON.stringify(gravado.externa),
);
conferir(
  "com a academia que foi escrita",
  gravado.externa?.academia === "B9 Jiu-Jitsu",
  JSON.stringify(gravado.externa),
);
conferir(
  "o vínculo aponta para a ficha",
  gravado.vinculo?.mestre_externo_id === "eeeeeeee-0000-0000-0000-000000000001",
  JSON.stringify(gravado.vinculo),
);
conferir(
  "e guarda o nome também — é o que sobra se a ficha for apagada",
  gravado.vinculo?.mestre_nome === "Guico",
  JSON.stringify(gravado.vinculo),
);

// --- 2. com conta escolhida, os campos somem -----------------------------
await p.reload({ waitUntil: "load" });
await p.waitForTimeout(900);
await p.getByRole("button", { name: /Cadastrar mestre|Novo|Adicionar/i }).first().click();
await p.waitForTimeout(400);
await p.getByLabel("Quem é").fill("@emy");
await p.waitForTimeout(900);
await p.getByRole("button", { name: /usar este/i }).click();
await p.waitForTimeout(400);
conferir(
  "quem tem conta não tem a faixa declarada por outro",
  (await p.getByLabel("Academia dele").count()) === 0,
);

/* ------------------------------------------------------------------------ */
conferir("nenhum erro de página", erros.length === 0, erros.join(" / "));

await navegador.close();

for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
