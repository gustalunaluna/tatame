/** O perfil de outra pessoa: tudo que você pediu tem que estar lá. */
import { chromium } from "playwright";
const REF = "jqcuysthbcdbohkavfeb";
const BASE = process.env.BASE ?? "http://localhost:4195";

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([ref]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: "t", refresh_token: "r",
    expires_at: Math.floor(Date.now()/1000)+3600, token_type: "bearer",
    user: { id: "u1", email: "eu@teste.app", aud: "authenticated" },
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
    bio:"Comecei em 2025. Guardeiro.", belt:"Branca", degrees:2,
    photo_url:"", verificado:false, idade:24,
    gym:"Academia Teste", master:"Mestre Silva",
    team_id:"e1", team_name:"Academia Teste", team_crest:"", team_status:"aprovada",
    fights_won:3, fights_lost:1, treinos:42, parceiros:2,
    conquistas_total:1006, conquistas_feitas:87, sou_eu:false, e_meu_parceiro:true,
  }]);
  if (url.includes("/rpc/destaques_publicos")) return json([
    { id:"a1", title:"Primeiro grau", tier:"Branca", unlocked:true },
    { id:"a2", title:"30 dias seguidos", tier:"Azul", unlocked:true },
  ]);
  if (url.includes("/rpc/parceiros_publicos")) return json([
    { user_id:"u3", handle:"maria.bjj", nickname:"Maria", belt:"Azul", degrees:1, photo_url:"" },
  ]);
  if (url.includes("/rest/v1/partnerships")) return json([
    { id:"p1", requester_id:"u1", addressee_id:"u2", status:"aceito", created_at:"2026-07-01" },
  ]);
  if (url.includes("/rpc/cartao_publico")) return json([
    { user_id:"u2", handle:"joaozinho", nickname:"Joãozinho", belt:"Branca", degrees:2, gym:"", photo_url:"", bio:"" },
  ]);
  return json([]);
});

await p.goto(`${BASE}/atleta/joaozinho`, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const c = await p.locator("body").innerText();
console.log(JSON.stringify({
  nome: c.includes("Joãozinho"),
  arroba: c.includes("@joaozinho"),
  idade: c.includes("24 anos"),
  bio: c.includes("Guardeiro"),
  faixa: c.includes("Branca"),
  lutas: c.includes("Vitórias") && c.includes("3"),
  treinos: c.includes("42 treinos"),
  equipe: c.includes("Academia Teste"),
  mestre: c.includes("Mestre Silva"),
  parceirosDele: c.includes("Maria"),
  conquistasDestaque: c.includes("30 dias seguidos"),
  contagemConquistas: c.includes("87/1006"),
  mostraVinculo: c.includes("parceiros de rola"),
  erros: [...new Set(erros)],
}, null, 2));
await b.close();
