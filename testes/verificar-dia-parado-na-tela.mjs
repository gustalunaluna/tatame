/**
 * O dia parado na TELA — o caminho inteiro, do botão ao contador.
 *
 * A conta já é conferida sem navegador em `verificar-dia-parado.mjs`. O que
 * este aqui prende é o que só o navegador mostra:
 *
 *   1. dá para registrar "hoje não treinei" sem forjar um treino de zero
 *      minuto — que era a única saída antes, e foi o que inflou o contador
 *   2. o que vai para o banco é dia parado de verdade: 0 minuto, 0 rola, e o
 *      motivo no lugar de Gi/No-Gi (a restrição da 044 recusa outra coisa)
 *   3. o Diário mostra o dia parado SEM vestir de treino — nada de "0 min"
 *   4. o Início não conta o dia parado como treino, e a sequência atravessa
 *   5. o formulário de treino recusa duração zero e aponta o caminho certo
 */
import { abrirNavegador } from "./navegador.mjs";

const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4183";

const dia = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// Treinou hoje, parou anteontem e antes-de-anteontem (registrado), treinou nos
// dois dias anteriores. Três treinos em cinco dias de calendário — e a corrente
// de pé, porque as duas faltas foram avisadas.
const linhas = [
  { id: "t0", user_id: "u1", date: dia(0), type: "Gi", duration_min: 120, rolls: 5, partners: "", techniques: "", notes: "" },
  { id: "p1", user_id: "u1", date: dia(1), type: "Doença", duration_min: 0, rolls: 0, partners: "", techniques: "", notes: "Virose desde sábado." },
  { id: "p2", user_id: "u1", date: dia(2), type: "Assisti a aula", duration_min: 0, rolls: 0, partners: "", techniques: "", notes: "" },
  { id: "t3", user_id: "u1", date: dia(3), type: "Gi", duration_min: 120, rolls: 5, partners: "", techniques: "", notes: "" },
  { id: "t4", user_id: "u1", date: dia(4), type: "No-Gi", duration_min: 120, rolls: 5, partners: "", techniques: "", notes: "" },
];

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const navegador = await abrirNavegador();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "fake", refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer",
    user: { id: "u1", email: "teste@exemplo.com", aud: "authenticated" },
  }));
}, [REF]);

const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

/** O corpo do último POST em `trainings` — é ele que prova o que foi gravado. */
let gravado = null;

await p.route(`https://${REF}.supabase.co/**`, async (rota) => {
  const req = rota.request();
  const url = req.url();
  const json = (b) => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

  if (url.includes("/auth/v1/user")) return json({ id: "u1", email: "t@e.com", aud: "authenticated" });
  if (url.includes("/rest/v1/trainings")) {
    if (req.method() === "POST") {
      const corpo = req.postDataJSON();
      gravado = Array.isArray(corpo) ? corpo[0] : corpo;
      return json([{ id: "novo", user_id: "u1", partners: "", techniques: "", ...gravado }]);
    }
    return json(linhas);
  }
  if (url.includes("/rpc/achievement_stats")) return json({ total: 1006, unlocked: 140 });
  if (url.includes("/rpc/semear_conquistas")) return json(0);
  if (url.includes("/rpc/recalcular_conquistas")) return json(0);
  if (url.includes("/rest/v1/profiles"))
    return json([{ user_id: "u1", questionario_em: "2026-07-30T01:32:14.123065+00:00", seeded: true,
      nickname: "Gustavo", belt: "Branca", degrees: 3, master: "Gui", gym: "Bonsai",
      photo_url: "", birth_date: "2000-01-01", fights_won: 0, fights_lost: 0, goal_start: "2025-10-13" }]);
  return json([]);
});

/* --- 3 e 4. o Início conta treino, não linha de diário -------------------- */
await p.goto(`${BASE}/`, { waitUntil: "load" });
await p.waitForTimeout(1800);
const inicio = await p.locator("body").innerText();

conferir(
  "o total conta 3 treinos, não as 5 linhas do diário",
  /3\s*treinos/i.test(inicio),
  inicio.replace(/\n+/g, " | ").slice(0, 400),
);
// O bloco "no total" é onde o número aparece sozinho; procurar "5 treinos"
// solto no corpo pega a frase das rolas pendentes e falha por engano.
const inicioNum = inicio.replace(/\s+/g, " ");
conferir(
  "o contador do total é 3 — as cinco linhas do diário não viram cinco treinos",
  /no total 3\s*treinos/i.test(inicioNum),
  inicioNum.slice(0, 400),
);
conferir(
  "e o do mês também",
  /neste m[êe]s 3\s*treinos/i.test(inicioNum),
  inicioNum.slice(0, 400),
);
conferir(
  "a sequência atravessa os dois dias parados e marca 3 dias",
  /3\s*dias/i.test(inicio),
  inicio.replace(/\n+/g, " | ").slice(0, 400),
);

/* --- área do jiu-jitsu: horas de tatame sem o dia parado ------------------ */
await p.goto(`${BASE}/jiu-jitsu`, { waitUntil: "load" });
await p.waitForTimeout(1200);
const areaJJ = await p.locator("body").innerText();
conferir(
  "a área do jiu-jitsu soma 6h de tatame (3 × 2h), sem o dia parado",
  areaJJ.includes("6h") && /3\s*treinos/i.test(areaJJ),
  areaJJ.replace(/\n+/g, " | ").slice(0, 300),
);

/* --- 3. o Diário mostra o dia parado sem vestir de treino ----------------- */
await p.goto(`${BASE}/diario`, { waitUntil: "load" });
await p.waitForTimeout(1500);
const diario = await p.locator("body").innerText();

conferir("o diário mostra o motivo do dia parado", diario.includes("Doença"));
conferir(
  "e diz o que ele significa",
  diario.toLowerCase().includes("não quebra a sequência"),
  diario.replace(/\n+/g, " | ").slice(0, 400),
);
conferir(
  "o dia parado NÃO aparece como treino de 0 min",
  // "120 min" contém "0 min": o corte tem de ser no começo do número.
  !/(^|[^\d])0 min/m.test(diario),
  diario.replace(/\n+/g, " | ").slice(0, 400),
);

/* --- 1 e 2. registrar um dia parado --------------------------------------- */
await p.getByRole("button", { name: "Dia parado", exact: true }).click();
await p.waitForTimeout(500);
conferir(
  "o formulário abre com os seis motivos",
  (await p.getByRole("button", { name: "Lesão", exact: true }).count()) === 1,
);
await p.getByRole("button", { name: "Lesão", exact: true }).click();
await p.getByLabel("O que aconteceu").fill("Dedo do pé travado.");
await p.getByRole("button", { name: "Registrar dia parado" }).click();
await p.waitForTimeout(1200);

conferir("o dia parado foi gravado", !!gravado, "nada foi para o banco");
conferir(
  "gravou o motivo no lugar de Gi/No-Gi",
  gravado?.type === "Lesão",
  JSON.stringify(gravado),
);
conferir(
  "gravou zero minuto e zero rola — é isso que a restrição da 044 exige",
  gravado?.duration_min === 0 && gravado?.rolls === 0,
  JSON.stringify(gravado),
);
conferir(
  "e levou a anotação junto",
  String(gravado?.notes ?? "").includes("Dedo do pé"),
  JSON.stringify(gravado),
);

/* --- 5. treino de zero minuto é barrado na porta -------------------------- */
gravado = null;
await p.getByRole("button", { name: "Novo", exact: true }).click();
await p.waitForTimeout(500);
await p.getByLabel("Duração (min)").fill("0");
await p.getByRole("button", { name: "Salvar treino" }).click();
await p.waitForTimeout(900);
const comAviso = await p.locator("body").innerText();
conferir(
  "treino sem duração não é gravado",
  gravado === null,
  JSON.stringify(gravado),
);
conferir(
  "e o aviso aponta o caminho certo em vez de mostrar erro de banco",
  comAviso.toLowerCase().includes("dia parado"),
  comAviso.replace(/\n+/g, " | ").slice(0, 300),
);

conferir("nenhum erro de página", erros.length === 0, erros.join(" / "));

await navegador.close();

for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
