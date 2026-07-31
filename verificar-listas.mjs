/**
 * Com muita gente, o perfil não pode despejar todo mundo: mostra uma amostra,
 * o "+N" e um caminho para a lista completa.
 */
import { chromium } from "playwright";
const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4199";
const N = 103; // total de parceiros do sujeito

const pessoa = (i) => ({
  user_id: `u${i}`, handle: `atleta${i}`, nickname: `Atleta ${i}`,
  belt: ["Branca","Azul","Roxa","Marrom","Preta"][i % 5],
  degrees: i % 5, photo_url: "", verificado: i % 20 === 0, equipe_oficial: true,
});

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
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
  const url = new URL(r.request().url());
  const json = x => r.fulfill({ status:200, contentType:"application/json", body: JSON.stringify(x) });
  const corpo = r.request().postDataJSON?.() ?? {};
  if (url.pathname.includes("/auth/v1/user")) return json({ id:"u1", email:"eu@teste.app", aud:"authenticated" });
  if (url.pathname.includes("/rpc/perfil_publico")) return json([{
    user_id:"u2", handle:"joaozinho", nickname:"Joãozinho", bio:"", belt:"Branca",
    degrees:2, photo_url:"", verificado:false, idade:24, gym:"", master:"",
    team_id:null, team_name:"", team_crest:"", team_status:"", team_slug:"",
    master_handle:"", master_nickname:"",
    fights_won:0, fights_lost:0, treinos:39, parceiros:N,
    conquistas_total:0, conquistas_feitas:0, sou_eu:false, e_meu_parceiro:true,
  }]);
  if (url.pathname.includes("/rpc/parceiros_publicos")) {
    const lim = corpo.p_limite ?? 8, off = corpo.p_offset ?? 0;
    console.log("RPC parceiros_publicos ->", JSON.stringify(corpo), "lim=", lim);
    return json(Array.from({ length: Math.max(0, Math.min(lim, N - off)) },
      (_, k) => pessoa(off + k + 1)));
  }
  if (url.pathname.includes("/rpc/destaques_publicos")) return json([]);
  if (url.pathname.includes("/rest/v1/partnerships")) return json([]);
  return json([]);
});

await p.goto(`${BASE}/atleta/joaozinho`, { waitUntil:"networkidle" });
await p.waitForTimeout(1200);
const perfil = await p.locator("body").innerText();
const chips = await p.locator('a[href^="/atleta/atleta"]').count();

const passo1 = {
  contagemNoTitulo: perfil.includes(String(N)),
  amostraLimitada: chips <= 8,
  mostraMais: perfil.includes(`+${N - 8}`),
};

await p.locator('a[href="/atleta/joaozinho/parceiros"]').first().click();
await p.waitForTimeout(1400);
const lista1 = await p.locator('a[href^="/atleta/atleta"]').count();
const corpoLista = await p.locator('body').innerText();
if (!(await p.getByRole('button', { name: /Ver mais/i }).count())) {
  console.log('SEM BOTAO. url:', p.url(), '| itens:', lista1, '| corpo:', corpoLista.slice(0, 300));
  await b.close(); process.exit(1);
}
await p.getByRole('button', { name: /Ver mais/i }).click();
await p.waitForTimeout(1400);
const lista2 = await p.locator('a[href^="/atleta/atleta"]').count();

console.log(JSON.stringify({
  passo1,
  listaCompleta: { primeiraPagina: lista1, aposVerMais: lista2, cresceu: lista2 > lista1 },
  erros: [...new Set(erros)],
}, null, 2));
await b.close();
