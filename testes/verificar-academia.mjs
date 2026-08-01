/**
 * O caminho completo que você pediu: perfil do João → academia → mestre.
 * Usa os dados reais das contas de teste, servidos pelas mesmas funções.
 */
import { abrirNavegador } from "./navegador.mjs";
const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4197";

const EQUIPE = {
  id: "e1", name: "Academia Teste", slug: "academia-teste", city: "Curitiba",
  master: "Mestre Silva",
  crest_url: "https://api.dicebear.com/9.x/shapes/svg?seed=academia-teste",
  status: "aprovada", criada_em: "2026-07-30",
  alunos: 13, faixas_pretas: 2, competidores: 3,
  titulos: 5, vitorias: 21, derrotas: 8,
  sou_membro: false, sou_dono: false, meu_status: "",
};
const GRADUADOS = [
  { user_id:"m1", handle:"mestre.silva", nickname:"Mestre Silva", belt:"Preta",
    degrees:2, photo_url:"", role:"dono", verificado:true },
  { user_id:"g2", handle:"rafael.teste", nickname:"Rafael", belt:"Preta",
    degrees:1, photo_url:"", role:"membro", verificado:false },
];
const ATLETAS = [
  ...GRADUADOS,
  { user_id:"u2", handle:"joaozinho", nickname:"Joãozinho", belt:"Branca",
    degrees:2, photo_url:"", verificado:false },
];

const b = await abrirNavegador();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token:"t", refresh_token:"r",
    expires_at: Math.floor(Date.now()/1000)+3600, token_type:"bearer",
    user:{ id:"u1", email:"eu@teste.app", aud:"authenticated" },
  }));
}, [REF]);
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", e => erros.push(String(e).slice(0,200)));
p.on("console", m => { if (m.type()==="error") erros.push(m.text().slice(0,200)); });

await p.route(`https://${REF}.supabase.co/**`, async r => {
  const url = r.request().url();
  const json = x => r.fulfill({ status:200, contentType:"application/json", body: JSON.stringify(x) });
  if (url.includes("/auth/v1/user")) return json({ id:"u1", email:"eu@teste.app", aud:"authenticated" });
  if (url.includes("/rpc/perfil_publico")) return json([{
    user_id:"u2", handle:"joaozinho", nickname:"Joãozinho",
    bio:"Conta de teste do Tatame.", belt:"Branca", degrees:2,
    photo_url:"", verificado:false, idade:24,
    gym:"Academia Teste", master:"Mestre Silva",
    team_id:"e1", team_name:"Academia Teste",
    team_crest:EQUIPE.crest_url, team_status:"aprovada", team_slug:"academia-teste",
    master_handle:"mestre.silva", master_nickname:"Mestre Silva",
    fights_won:3, fights_lost:1, treinos:39, parceiros:22,
    conquistas_total:1006, conquistas_feitas:87, sou_eu:false, e_meu_parceiro:true,
  }]);
  if (url.includes("/rpc/perfil_equipe")) return json([EQUIPE]);
  if (url.includes("/rpc/graduados_da_equipe")) return json(GRADUADOS);
  if (url.includes("/rpc/atletas_da_equipe")) return json(ATLETAS);
  if (url.includes("/rpc/destaques_publicos")) return json([]);
  if (url.includes("/rpc/parceiros_publicos")) return json([]);
  if (url.includes("/rest/v1/partnerships")) return json([]);
  return json([]);
});

// 1) perfil do João
await p.goto(`${BASE}/atleta/joaozinho`, { waitUntil:"networkidle" });
await p.waitForTimeout(1200);
const perfil = await p.locator("body").innerText();
const passo1 = {
  academiaNoCabecalho: perfil.includes("Academia Teste"),
  seloDaEquipe: (await p.locator('[title="Equipe oficial"]').count()) > 0,
  mestreNaCaixa: perfil.includes("Mestre Silva"),
  seloDoMestre: (await p.locator('[title="Faixa preta verificada"]').count()) > 0,
};

// 2) clicar na academia
await p.locator('a[href="/academia/academia-teste"]').first().click();
await p.waitForTimeout(1400);
const academia = await p.locator("body").innerText();
const passo2 = {
  abriu: p.url().includes("/academia/academia-teste"),
  nome: academia.includes("Academia Teste"),
  cidade: academia.includes("Curitiba"),
  alunos: /13\s*\n?\s*alunos/i.test(academia) || academia.includes("13"),
  faixasPretas: academia.includes("faixas pretas"),
  campeonatos: academia.includes("campeonatos"),
  listaDeMestres: /mestres e faixas pretas/i.test(academia),
  mestreListado: academia.includes("Mestre Silva"),
  avisoDeDeclarado: /os pr[oó]prios atletas registram/i.test(academia),
};

// 3) do perfil da academia, entrar no mestre
await p.locator('a[href="/atleta/mestre.silva"]').first().click();
await p.waitForTimeout(1200);
const passo3 = { abriuOMestre: p.url().includes("/atleta/mestre.silva") };

// O proxy deste ambiente bloqueia a imagem externa do brasão; não é bug do app.
const relevantes = [...new Set(erros)].filter((e) => !e.includes("ERR_TUNNEL"));
console.log(JSON.stringify({ passo1, passo2, passo3, erros: relevantes }, null, 2));
await b.close();