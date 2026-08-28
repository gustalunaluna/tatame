/**
 * A escada que a aba Graduação mostra — os números, não a tela.
 *
 * Roda sem navegador: é uma tabela de regras e duas somas.
 *
 * O que prende:
 *   1. a BRANCA aparece. `ESCADA_IBJJF` é "o que se recebe", e ninguém recebe a
 *      branca — mas uma tela que promete "todas as faixas" e começa na azul
 *      deixa o faixa-branca de fora da própria escada
 *   2. a escada completa é a lista de recebimento intacta, com a branca na
 *      frente — nada some nem entra no meio
 *   3. o acumulado bate com a conta que o cabeçalho promete: 9 anos de preta
 *      até o 3º grau, 24 até o 6º, 31 no 7º, 38 no 8º, 48 no 9º
 *   4. o acumulado NÃO conta tempo de branca — não existe regra de tempo de
 *      branca, e somar zero como se fosse regra seria inventar número
 *   5. `tempoMinimoEmTexto` diz IDADE onde a regra é idade, e "sem prazo" onde
 *      não há prazo nenhum — as duas são resposta, não célula vazia
 *   6. a escada infantil é paralela: idades válidas, sem sobrepor a adulta, e
 *      sem nenhuma promessa de equivalência com faixa de adulto
 */
import {
  ESCADA_IBJJF,
  ESCADA_COMPLETA,
  ESCADA_INFANTIL,
  INICIO_DA_ESCADA,
  mesesAcumuladosAte,
  tempoMinimoEmTexto,
} from "../src/lib/tempos-ibjjf.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const acha = (faixa, grau) =>
  ESCADA_COMPLETA.find((d) => d.faixa === faixa && d.grau === grau);

/* --- 1 e 2. a branca entra, e nada mais muda ----------------------------- */
conferir("a branca abre a escada completa", ESCADA_COMPLETA[0]?.faixa === "Branca");
conferir(
  "a branca não tem prazo nem idade — é o começo",
  INICIO_DA_ESCADA.mesesMinimos === null && INICIO_DA_ESCADA.idadeMinima === null,
);
conferir(
  "a escada completa é só a de recebimento com a branca na frente",
  ESCADA_COMPLETA.length === ESCADA_IBJJF.length + 1 &&
    JSON.stringify(ESCADA_COMPLETA.slice(1)) === JSON.stringify([...ESCADA_IBJJF]),
);
conferir(
  "a branca não aparece duas vezes",
  ESCADA_COMPLETA.filter((d) => d.faixa === "Branca").length === 1,
);
conferir(
  "todo degrau da escada completa tem regra escrita",
  ESCADA_COMPLETA.every((d) => typeof d.regra === "string" && d.regra.trim().length > 0),
);

/* --- 3. as somas fecham --------------------------------------------------- */
const ANO = 12;
// Da azul à preta: 0 (branca não conta) + 24 + 18 + 12 = 54 meses.
conferir(
  "acumulado até a preta é 54 meses",
  mesesAcumuladosAte("Preta", 0) === 54,
  String(mesesAcumuladosAte("Preta", 0)),
);
conferir(
  "3º grau de preta: 9 anos de preta depois dos 54 meses",
  mesesAcumuladosAte("Preta", 3) === 54 + 9 * ANO,
  String(mesesAcumuladosAte("Preta", 3)),
);
conferir(
  "6º grau de preta: 24 anos de preta",
  mesesAcumuladosAte("Preta", 6) === 54 + 24 * ANO,
  String(mesesAcumuladosAte("Preta", 6)),
);
conferir(
  "7º grau (coral): 31 anos de preta",
  mesesAcumuladosAte("Coral", 7) === 54 + 31 * ANO,
  String(mesesAcumuladosAte("Coral", 7)),
);
conferir(
  "8º grau (coral): 38 anos de preta",
  mesesAcumuladosAte("Coral", 8) === 54 + 38 * ANO,
  String(mesesAcumuladosAte("Coral", 8)),
);
conferir(
  "9º grau (vermelha): 48 anos de preta",
  mesesAcumuladosAte("Vermelha", 9) === 54 + 48 * ANO,
  String(mesesAcumuladosAte("Vermelha", 9)),
);

/* --- 4. a branca não entra na soma ---------------------------------------- */
conferir(
  "o acumulado até a azul é zero — não há tempo de branca na regra",
  mesesAcumuladosAte("Azul", 0) === 0,
  String(mesesAcumuladosAte("Azul", 0)),
);
conferir(
  "a branca não está na escada de recebimento, então não tem acumulado",
  mesesAcumuladosAte("Branca", 0) === null,
);
conferir(
  "o 10º grau não soma tempo em cima do 9º",
  mesesAcumuladosAte("Vermelha", 10) === mesesAcumuladosAte("Vermelha", 9),
);

/* --- 5. o texto do tempo mínimo ------------------------------------------- */
conferir(
  "a azul mostra IDADE, não prazo",
  tempoMinimoEmTexto(acha("Azul", 0)) === "16 anos de idade",
  tempoMinimoEmTexto(acha("Azul", 0)),
);
conferir(
  "a branca mostra 'Sem prazo'",
  tempoMinimoEmTexto(INICIO_DA_ESCADA) === "Sem prazo",
  tempoMinimoEmTexto(INICIO_DA_ESCADA),
);
conferir(
  "a vermelha 10º grau mostra 'Sem prazo' — não se conquista por tempo",
  tempoMinimoEmTexto(acha("Vermelha", 10)) === "Sem prazo",
  tempoMinimoEmTexto(acha("Vermelha", 10)),
);
conferir(
  "a roxa mostra 2 anos",
  tempoMinimoEmTexto(acha("Roxa", 0)) === "2 anos",
  tempoMinimoEmTexto(acha("Roxa", 0)),
);
conferir(
  "a marrom mostra 18 meses, não 'ano e meio'",
  tempoMinimoEmTexto(acha("Marrom", 0)) === "18 meses",
  tempoMinimoEmTexto(acha("Marrom", 0)),
);

/* --- 6. a escada infantil -------------------------------------------------- */
conferir(
  "as 13 faixas de 4 a 15 anos estão lá",
  ESCADA_INFANTIL.length === 13,
  String(ESCADA_INFANTIL.length),
);
conferir(
  "toda faixa infantil tem faixa de idade coerente",
  ESCADA_INFANTIL.every((f) => f.de >= 4 && f.ate <= 15 && f.de <= f.ate),
);
conferir(
  "a cinza é de 4 a 6 anos",
  ESCADA_INFANTIL.filter((f) => f.nome.startsWith("Cinza")).every(
    (f) => f.de === 4 && f.ate === 6,
  ),
);
conferir(
  "a verde começa aos 13",
  ESCADA_INFANTIL.filter((f) => f.nome.startsWith("Verde")).every((f) => f.de === 13),
);
conferir(
  "nenhuma faixa infantil se chama Azul, Roxa, Marrom ou Preta",
  ESCADA_INFANTIL.every(
    (f) => !["Azul", "Roxa", "Marrom", "Preta"].includes(f.nome),
  ),
);
conferir(
  "nenhum nome de faixa infantil se repete",
  new Set(ESCADA_INFANTIL.map((f) => f.nome)).size === ESCADA_INFANTIL.length,
);

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
