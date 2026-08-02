/**
 * O modelo que calcula o hexágono — os números, não a tela.
 *
 * É aqui que mora a decisão mais delicada do app: transformar rolas em nota
 * sem mentir. O que este teste prende:
 *
 *   1. sem dado, o app NÃO afirma nada — e "sem dado" nunca vira "é ruim"
 *   2. a diferença de faixa manda: o mesmo evento vale mais contra quem está
 *      acima e menos contra quem está abaixo
 *   3. amostra pequena não vira nota alta — uma noite boa não faz um 5
 *   4. eixo defensivo anda ao contrário: sofrer mais abaixa a nota
 *   5. o passado pesa menos que o presente, e a nota DESCE quando se para
 *   6. a idade só entra no gás
 */
import {
  derivarHexagono,
  pesosDoEvento,
  pesoDaData,
  referenciaDeGas,
  eixosComDado,
  AMOSTRA_MINIMA,
} from "../src/lib/hexagono-derivado.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const HOJE = new Date("2026-08-02T12:00:00");
const diasAtras = (n) =>
  new Date(HOJE.getTime() - n * 86400000).toISOString().slice(0, 10);

const rola = (o = {}) => ({
  data: diasAtras(3),
  parceiroFaixa: "Roxa",
  rolas: 1,
  finAFavor: 0,
  finSofridas: 0,
  passAFavor: 0,
  passSofridas: 0,
  raspAFavor: 0,
  raspSofridas: 0,
  confirmado: true,
  detalhado: true,
  ritmoCaiuNa: null,
  ritmoRespondido: false,
  rolasDaSessao: 5,
  ...o,
});

const ROXA = { faixa: "Roxa", idade: 30 };

/* --- 1. sem dado o app não afirma nada ----------------------------------- */
const vazio = derivarHexagono([], ROXA, HOJE);
conferir(
  "sem nenhuma rola, nenhum eixo afirma nada",
  eixosComDado(vazio) === 0 && Object.values(vazio).every((v) => !v.temDado),
);
conferir(
  "e 'sem dado' não é nota baixa — é ausência",
  vazio.guarda.nota === 0 && vazio.guarda.confianca === 0 && vazio.guarda.amostra === 0,
  JSON.stringify(vazio.guarda),
);

const duasRolas = derivarHexagono(
  [rola({ finAFavor: 1 }), rola({ finAFavor: 1 })],
  ROXA,
  HOJE,
);
conferir(
  `abaixo de ${AMOSTRA_MINIMA} rolas ponderadas o eixo segue calado`,
  duasRolas.finalizacao.temDado === false,
  `amostra ${duasRolas.finalizacao.amostra}`,
);

// O erro mais perigoso que este modelo podia cometer: ler contador em branco
// como "não aconteceu". Dez rolas sem preencher nada davam retenção 3,7 —
// nota ótima, inventada a partir de um valor padrão.
const semDetalhe = derivarHexagono(
  Array.from({ length: 10 }, () => rola({ detalhado: false })),
  ROXA,
  HOJE,
);
conferir(
  "rola registrada sem os contadores não vira nota nenhuma",
  ["guarda", "passagem", "finalizacao", "retencao", "defesa"].every(
    (k) => !semDetalhe[k].temDado && semDetalhe[k].amostra === 0,
  ),
  JSON.stringify(semDetalhe.retencao),
);

/* --- 2. a diferença de faixa manda --------------------------------------- */
const contraAcima = pesosDoEvento("Branca", "Preta");
const contraIgual = pesosDoEvento("Roxa", "Roxa");
const contraAbaixo = pesosDoEvento("Preta", "Branca");
conferir(
  "fazer contra quem está acima vale mais",
  contraAcima.aFavor > contraIgual.aFavor,
  `${contraAcima.aFavor} vs ${contraIgual.aFavor}`,
);
conferir(
  "sofrer de quem está acima dói menos",
  contraAcima.sofrido < contraIgual.sofrido,
  `${contraAcima.sofrido} vs ${contraIgual.sofrido}`,
);
conferir(
  "sofrer de quem está abaixo dói mais",
  contraAbaixo.sofrido > contraIgual.sofrido,
  `${contraAbaixo.sofrido} vs ${contraIgual.sofrido}`,
);
conferir(
  "o gap trava em 2 degraus — branca contra preta não vira multiplicador 16",
  contraAcima.aFavor === 4,
  String(contraAcima.aFavor),
);
conferir(
  "parceiro sem faixa registrada é neutro, não é chute",
  pesosDoEvento("Roxa", "").aFavor === 1 && pesosDoEvento("Roxa", "").sofrido === 1,
);

// O mesmo número de finalizações, um contra preta e outro contra branca.
const dez = (o) => Array.from({ length: 10 }, () => rola(o));
const contraPreta = derivarHexagono(
  dez({ parceiroFaixa: "Preta", finAFavor: 1 }),
  ROXA,
  HOJE,
);
const contraBranca = derivarHexagono(
  dez({ parceiroFaixa: "Branca", finAFavor: 1 }),
  ROXA,
  HOJE,
);
conferir(
  "finalizar preta rende nota maior que finalizar branca",
  contraPreta.finalizacao.nota > contraBranca.finalizacao.nota,
  `${contraPreta.finalizacao.nota} vs ${contraBranca.finalizacao.nota}`,
);

/* --- 3. amostra pequena puxa para o meio --------------------------------- */
const poucas = derivarHexagono(dez({ finAFavor: 2 }).slice(0, 4), ROXA, HOJE);
const muitas = derivarHexagono(
  Array.from({ length: 60 }, () => rola({ finAFavor: 2 })),
  ROXA,
  HOJE,
);
conferir(
  "com a mesma taxa, quem registrou mais chega mais longe",
  muitas.finalizacao.nota > poucas.finalizacao.nota,
  `${muitas.finalizacao.nota} (60 rolas) vs ${poucas.finalizacao.nota} (4)`,
);
conferir(
  "uma noite boa não faz um 5",
  poucas.finalizacao.nota < 4,
  String(poucas.finalizacao.nota),
);
conferir(
  "a confiança cresce com a amostra",
  muitas.finalizacao.confianca > poucas.finalizacao.confianca,
  `${muitas.finalizacao.confianca} vs ${poucas.finalizacao.confianca}`,
);
conferir(
  "nada registrado deixa a nota no meio da escala, não no chão",
  Math.abs(derivarHexagono(dez({}), ROXA, HOJE).finalizacao.nota - 2.5) < 1.3,
  String(derivarHexagono(dez({}), ROXA, HOJE).finalizacao.nota),
);

/* --- 4. eixo defensivo anda ao contrário --------------------------------- */
const apanhou = derivarHexagono(dez({ finSofridas: 2 }), ROXA, HOJE);
const naoApanhou = derivarHexagono(dez({ finSofridas: 0 }), ROXA, HOJE);
conferir(
  "ser finalizado abaixa a defesa",
  apanhou.defesa.nota < naoApanhou.defesa.nota,
  `${apanhou.defesa.nota} vs ${naoApanhou.defesa.nota}`,
);
const passaram = derivarHexagono(dez({ passSofridas: 2 }), ROXA, HOJE);
conferir(
  "ser passado abaixa a retenção",
  passaram.retencao.nota < naoApanhou.retencao.nota,
  `${passaram.retencao.nota} vs ${naoApanhou.retencao.nota}`,
);
conferir(
  "e finalizar não mexe na defesa",
  Math.abs(
    derivarHexagono(dez({ finAFavor: 3 }), ROXA, HOJE).defesa.nota -
      naoApanhou.defesa.nota,
  ) < 0.001,
);

/* --- 5. o tempo: o passado pesa menos, e a nota desce --------------------- */
conferir(
  "o treino de hoje pesa praticamente 1",
  pesoDaData(diasAtras(0), HOJE) > 0.98,
  String(pesoDaData(diasAtras(0), HOJE)),
);
conferir(
  "quatro semanas atrás pesa metade",
  Math.abs(pesoDaData(diasAtras(28), HOJE) - 0.5) < 0.01,
  String(pesoDaData(diasAtras(28), HOJE)),
);
const recente = derivarHexagono(dez({ data: diasAtras(3), passAFavor: 2 }), ROXA, HOJE);
const antigo = derivarHexagono(dez({ data: diasAtras(56), passAFavor: 2 }), ROXA, HOJE);
conferir(
  "a mesma passagem de dois meses atrás sustenta menos",
  antigo.passagem.amostra < recente.passagem.amostra &&
    antigo.passagem.nota < recente.passagem.nota,
  `amostra ${antigo.passagem.amostra} vs ${recente.passagem.amostra}`,
);
// Quem passava e parou. A comparação tem que ser da MESMA pessoa em dois
// momentos, com as mesmas rolas boas — senão não se mede o tempo, mede-se a
// diferença entre dois conjuntos de dados.
const rolasBoas = dez({ data: diasAtras(50), passAFavor: 3 });
const naEpoca = derivarHexagono(rolasBoas, ROXA, new Date("2026-06-16T12:00:00"));
const oitoSemanasDepois = derivarHexagono(
  [...rolasBoas, ...dez({ data: diasAtras(2) })],
  ROXA,
  HOJE,
);
conferir(
  "quem parou de passar vê a passagem cair",
  oitoSemanasDepois.passagem.nota < naEpoca.passagem.nota,
  `${oitoSemanasDepois.passagem.nota} hoje vs ${naEpoca.passagem.nota} na época`,
);

/* --- 6. a idade, e só no gás --------------------------------------------- */
conferir("aos 20 a referência é 70% da sessão", referenciaDeGas(20) === 0.7);
conferir(
  "aos 50 ela desce",
  referenciaDeGas(50) < referenciaDeGas(20) && referenciaDeGas(50) > 0.5,
  String(referenciaDeGas(50)),
);
conferir("e tem piso — não desce para sempre", referenciaDeGas(90) === 0.45);
conferir("sem idade informada, usa a referência de 20", referenciaDeGas(null) === 0.7);

const sessoes = (idade) =>
  derivarHexagono(
    Array.from({ length: 12 }, (_, i) => ({
      ...rola({ data: diasAtras(i * 2 + 1), ritmoRespondido: true, ritmoCaiuNa: 3 }),
      rolasDaSessao: 5,
    })),
    { faixa: "Roxa", idade },
    HOJE,
  );
conferir(
  "aguentar 3 de 5 rolas vale mais aos 50 do que aos 20",
  sessoes(50).gas.nota > sessoes(20).gas.nota,
  `${sessoes(50).gas.nota} (50 anos) vs ${sessoes(20).gas.nota} (20 anos)`,
);
conferir(
  "a idade não mexe nos outros eixos",
  sessoes(50).passagem.nota === sessoes(20).passagem.nota,
);

// O ritmo é da sessão, não do parceiro: quatro parceiros na mesma noite são
// uma leitura, não quatro.
const umaNoite = derivarHexagono(
  Array.from({ length: 4 }, () =>
    rola({ data: diasAtras(1), ritmoRespondido: true, ritmoCaiuNa: 2, rolasDaSessao: 4 }),
  ),
  ROXA,
  HOJE,
);
conferir(
  "quatro parceiros na mesma noite são UMA leitura de ritmo",
  umaNoite.gas.amostra <= 1.01,
  `amostra ${umaNoite.gas.amostra}`,
);
conferir(
  "não responder o ritmo deixa o gás calado",
  derivarHexagono(dez({ finAFavor: 1 }), ROXA, HOJE).gas.temDado === false,
);

/* ------------------------------------------------------------------------- */
for (const o of ok) console.log(`  ok   ${o}`);
for (const f of falhas) console.log(`  FALHA ${f}`);
console.log(`\n${ok.length} passaram, ${falhas.length} falharam`);
process.exit(falhas.length ? 1 : 0);
