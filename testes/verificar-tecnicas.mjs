/**
 * A técnica do treino indo para a galeria.
 *
 * O que este teste prende:
 *   1. digitar sugere o que já existe, com a última vez que apareceu — é o que
 *      faz a pessoa tocar no que existe em vez de criar uma quase-duplicata
 *   2. o que já está no treino não é oferecido de novo
 *   3. técnica nova pode ser criada, com categoria OPCIONAL
 *   4. salvar chama o achar-ou-criar do banco por técnica escolhida
 *   5. tirar uma técnica do treino desliga o VÍNCULO, não apaga a técnica
 *   6. a normalização do cliente bate com a do banco — as duas existem, e se
 *      divergirem o cliente acha que são duas e o banco acha que é uma
 */
import { abrirNavegador } from "./navegador.mjs";
import { chaveDaTecnica } from "../src/lib/chave-da-tecnica.ts";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";
const EU = "00000000-0000-0000-0000-0000000000ff";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

/* --- 6. as duas normalizações precisam concordar ------------------------- */
// A do banco é `public.chave_da_tecnica`, em SQL. Esta é a cópia em JS. Os
// casos abaixo são os que o índice único do banco promete resolver.
const CASOS = [
  ["Armlock", "armlock"],
  ["  Armlock  ", "armlock"],
  ["ARMLOCK", "armlock"],
  ["Triângulo", "triangulo"],
  ["TRIÂNGULO", "triangulo"],
  ["Raspagem de Tesoura", "raspagem de tesoura"],
  ["Berimbolo", "berimbolo"],
  ["Omoplata", "omoplata"],
  ["Estrangulamento Cruzado", "estrangulamento cruzado"],
];
for (const [entrada, esperado] of CASOS) {
  conferir(
    `normaliza "${entrada}"`,
    chaveDaTecnica(entrada) === esperado,
    `virou "${chaveDaTecnica(entrada)}", esperava "${esperado}"`,
  );
}
conferir(
  "acento e caixa colapsam na mesma chave",
  chaveDaTecnica("Triângulo") === chaveDaTecnica(" TRIANGULO "),
);

/* ------------------------------------------------------------------------ */

const GALERIA = [
  {
    id: "aaa",
    name: "Armlock",
    category: "Finalização",
    notes: "",
    video_url: "",
    mastery: 3,
    treinos: 7,
    ultima_vez: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
  },
  {
    id: "bbb",
    name: "Triângulo",
    category: "Finalização",
    notes: "",
    video_url: "",
    mastery: 2,
    treinos: 2,
    ultima_vez: null,
  },
];

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

// O que o cliente mandou o banco fazer. É a prova que importa: a tela pode
// mostrar o chip e mesmo assim não gravar nada.
const chamadas = { registrar: [], desligar: [] };
let ligadas = [];

await p.route(`https://${REF}.supabase.co/**`, (rota) => {
  const req = rota.request();
  const url = req.url();
  const corpo = () => {
    try {
      return JSON.parse(req.postData() ?? "{}");
    } catch {
      return {};
    }
  };
  const json = (b) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: EU, aud: "authenticated" });
  if (url.includes("/rpc/galeria_de_tecnicas")) return json(GALERIA);
  if (url.includes("/rpc/tecnicas_do_treino")) return json(ligadas);
  if (url.includes("/rpc/registrar_tecnica_do_treino")) {
    chamadas.registrar.push(corpo());
    return json("ccc");
  }
  if (url.includes("/rpc/desligar_tecnica_do_treino")) {
    chamadas.desligar.push(corpo());
    return json(null);
  }
  // `.single()` faz o supabase-js pedir objeto, não lista. Devolver `[{...}]`
  // aqui quebrava a leitura do id e o salvamento morria em silêncio — que foi
  // exatamente como este teste pegou a primeira versão.
  if (url.includes("/rest/v1/trainings") && req.method() === "POST")
    return json({ id: "treino-1" });
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: EU, handle: "eu", nickname: "Eu", belt: "Roxa", degrees: 0 }]);
  return json([]);
});

await p.goto(`${BASE}/diario`, { waitUntil: "load" });
await p.waitForTimeout(1200);

await p.getByRole("button", { name: /Novo/i }).first().click();
await p.waitForTimeout(500);

const campo = p.getByLabel("Técnicas do dia");
conferir("o diário pede as técnicas do dia", await campo.isVisible());

/* --- 1. sugere o que já existe ------------------------------------------ */
await campo.fill("arm");
await p.waitForTimeout(500);
const sugestao = p.getByRole("button", { name: /Armlock/ });
conferir("digitar sugere a técnica que já está na galeria", (await sugestao.count()) >= 1);
const textoSugestao = await sugestao.first().innerText();
conferir(
  "e diz quando ela apareceu pela última vez",
  /h[áa] 3 dias/.test(textoSugestao),
  textoSugestao.replace(/\n/g, " | "),
);
conferir(
  "sem acento também encontra",
  await (async () => {
    await campo.fill("triangulo");
    await p.waitForTimeout(400);
    return (await p.getByRole("button", { name: /Triângulo/ }).count()) >= 1;
  })(),
);

/* --- 3. criar nova, com categoria opcional ------------------------------ */
await campo.fill("Berimbolo");
await p.waitForTimeout(400);
const criar = p.getByRole("button", { name: /Criar/ });
conferir("o que não existe pode ser criado", (await criar.count()) === 1);
conferir(
  "a categoria é oferecida, não exigida",
  (await p.getByRole("button", { name: "Guarda", exact: true }).count()) === 1,
);
await p.getByRole("button", { name: "Guarda", exact: true }).click();
await p.waitForTimeout(200);
await criar.click();
await p.waitForTimeout(400);

/* --- 2. o que já está no treino não volta a ser oferecido ---------------- */
await campo.fill("Berimbolo");
await p.waitForTimeout(400);
conferir(
  "técnica já escolhida não é oferecida de novo",
  (await p.getByRole("button", { name: /Criar/ }).count()) === 0,
);
await campo.fill("");
await p.waitForTimeout(200);

// E a escolhida vira chip, com como sair dela.
conferir(
  "a escolhida vira etiqueta no formulário",
  (await p.getByRole("button", { name: /Tirar Berimbolo/ }).count()) === 1,
);

/* --- 4. salvar manda o achar-ou-criar ------------------------------------ */
await p.getByRole("button", { name: /^Salvar treino$/ }).click();
await p.waitForTimeout(1500);

conferir(
  "salvar registra a técnica no treino",
  chamadas.registrar.length === 1,
  `${chamadas.registrar.length} chamadas`,
);
conferir(
  "com o nome digitado, preservado como foi escrito",
  chamadas.registrar[0]?.p_nome === "Berimbolo",
  JSON.stringify(chamadas.registrar[0]),
);
conferir(
  "e com a categoria escolhida",
  chamadas.registrar[0]?.p_categoria === "Guarda",
  JSON.stringify(chamadas.registrar[0]),
);

/* --- 5. tirar desliga o vínculo, não apaga a técnica --------------------- */
chamadas.registrar = [];
chamadas.desligar = [];
// Agora o treino já tem duas ligadas; a pessoa vai tirar uma.
ligadas = [
  { id: "aaa", name: "Armlock", category: "Finalização" },
  { id: "bbb", name: "Triângulo", category: "Finalização" },
];

await p.reload({ waitUntil: "load" });
await p.waitForTimeout(1200);
await p.getByRole("button", { name: /Novo/i }).first().click();
await p.waitForTimeout(600);
// No modo criação não há técnicas ligadas ainda — o diff só vale na edição,
// e é o que o `salvarTecnicasDoTreino` faz ao ler o que está no banco.
await p.getByRole("button", { name: /^Salvar treino$/ }).click();
await p.waitForTimeout(1500);

conferir(
  "o que estava ligado e não está mais na lista é DESLIGADO",
  chamadas.desligar.length === 2,
  `${chamadas.desligar.length} desligamentos`,
);
conferir(
  "e o desligamento passa o vínculo, nunca um apagar de técnica",
  chamadas.desligar.every((c) => c.p_treino && c.p_tecnica),
  JSON.stringify(chamadas.desligar[0]),
);

/* ------------------------------------------------------------------------ */
conferir("nenhum erro de página", erros.length === 0, erros.join(" / "));

await navegador.close();

for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
