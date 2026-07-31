// Contraste da paleta — números, não opinião.
//
// Cada acento de faixa é usado como TEXTO sobre o fundo e sobre o cartão. O
// piso da WCAG para texto normal é 4.5:1; para texto grande (>=18px, ou negrito
// >=14px) é 3:1. Como os acentos aparecem em rótulos pequenos, o alvo aqui é
// 4.5:1 contra o cartão, que é o fundo mais claro dos dois.
//
// Também confere que o acento da faixa branca não se confunde com a cor do
// texto comum: se ele for quase igual, "destaque" deixa de destacar.
import cores from "./src/lib/cores.json" with { type: "json" };

/* --- OKLCH -> sRGB ------------------------------------------------------ */
function oklchParaRgb([L, C, h]) {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;

  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // fora do gamut sRGB o valor estoura; grampear é o que o navegador faz
  return lin.map((v) => Math.min(1, Math.max(0, v)));
}

/** Luminância relativa da WCAG, a partir do linear sRGB. */
function luminancia(linear) {
  const [r, g, b] = linear;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(corA, corB) {
  const a = luminancia(oklchParaRgb(corA));
  const b = luminancia(oklchParaRgb(corB));
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

/** Distância perceptual grosseira em OKLab — para "essas duas se confundem?" */
function distancia([L1, C1, h1], [L2, C2, h2]) {
  const r1 = (h1 * Math.PI) / 180, r2 = (h2 * Math.PI) / 180;
  const a1 = C1 * Math.cos(r1), b1 = C1 * Math.sin(r1);
  const a2 = C2 * Math.cos(r2), b2 = C2 * Math.sin(r2);
  return Math.hypot(L1 - L2, a1 - a2, b1 - b2);
}

/* --- verificação -------------------------------------------------------- */
const { base, faixas, medalhas } = cores;
const PISO_TEXTO = 4.5;
const PISO_DISTINCAO = 0.06; // abaixo disto, duas cores viram a mesma a olho nu

let falhou = false;
const linha = (nome, valor, piso, unidade = ":1") => {
  const ok = valor >= piso;
  if (!ok) falhou = true;
  console.log(
    `${ok ? "ok   " : "FALHA"}  ${nome.padEnd(34)} ${valor.toFixed(2)}${unidade}` +
      (ok ? "" : `   (mínimo ${piso})`),
  );
};

console.log("— acento de cada faixa como texto sobre o cartão —");
for (const [nome, f] of Object.entries(faixas)) {
  linha(`${nome} (${f.rotulo})`, contraste(f.acento, base.cartao), PISO_TEXTO);
}

console.log("\n— acento sobre o fundo da página —");
for (const [nome, f] of Object.entries(faixas)) {
  linha(nome, contraste(f.acento, base.fundo), PISO_TEXTO);
}

console.log("\n— texto comum e texto fraco —");
linha("texto sobre fundo", contraste(base.texto, base.fundo), 4.5);
linha("texto sobre cartão", contraste(base.texto, base.cartao), 4.5);
linha("texto fraco sobre cartão", contraste(base.textoFraco, base.cartao), 4.5);

console.log("\n— o acento se distingue do texto comum? —");
for (const [nome, f] of Object.entries(faixas)) {
  linha(nome, distancia(f.acento, base.texto), PISO_DISTINCAO, " ΔOKLab");
}

console.log("\n— medalhas sobre o cartão —");
for (const [nome, c] of Object.entries(medalhas)) {
  // são usadas em número grande e negrito: o piso é 3:1
  linha(nome, contraste(c, base.cartao), 3);
}

console.log("\n— ouro, prata e bronze se distinguem entre si? —");
linha("ouro vs prata", distancia(medalhas.ouro, medalhas.prata), PISO_DISTINCAO, " ΔOKLab");
linha("ouro vs bronze", distancia(medalhas.ouro, medalhas.bronze), PISO_DISTINCAO, " ΔOKLab");
linha("prata vs bronze", distancia(medalhas.prata, medalhas.bronze), PISO_DISTINCAO, " ΔOKLab");

console.log("\n— as faixas se distinguem entre si? —");
const nomes = Object.keys(faixas);
for (let i = 0; i < nomes.length; i++) {
  for (let j = i + 1; j < nomes.length; j++) {
    const d = distancia(faixas[nomes[i]].acento, faixas[nomes[j]].acento);
    if (d < PISO_DISTINCAO) {
      falhou = true;
      console.log(`FALHA  ${nomes[i]} e ${nomes[j]} quase iguais: ${d.toFixed(3)}`);
    }
  }
}
if (!falhou) console.log("ok    todos os pares acima do piso");

process.exit(falhou ? 1 : 0);
