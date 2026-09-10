/**
 * A conta da dieta — a aritmética, não a tela.
 *
 * Roda sem navegador, como `verificar-cartel`: subir Chromium para conferir uma
 * equação de metabolismo seria gastar dez segundos por nada.
 *
 * O que prende, e por que cada um destes já é um jeito conhecido de errar:
 *
 *   1. a basal usa Mifflin-St Jeor de verdade, com os valores certos para os
 *      dois sexos — a diferença entre eles é de 166 kcal, e um sinal trocado
 *      aqui erra a meta do dia inteiro
 *   2. o gasto do treino desconta o repouso (MET − 1). Somar o MET cheio em
 *      cima de uma basal que já cobre 24 horas conta o mesmo repouso duas
 *      vezes — é o erro clássico dos aplicativos de dieta
 *   3. o fator de vida é 1,2, o de sedentário, PORQUE o treino entra
 *      separado. Se alguém trocar por 1,55 "para ficar mais realista", a conta
 *      passa a contar o treino duas vezes
 *   4. rola pesa mais que técnica: o mesmo tempo de aula gasta mais quando
 *      teve rola
 *   5. minuto de rola nunca passa da duração do treino
 *   6. carboidrato é o que sobra depois de proteína e gordura, e nunca fica
 *      negativo
 *   7. o peso de um dia é o da última pesagem ATÉ ele, nunca uma futura
 *   8. a tendência compara médias de duas janelas, não dois pontos — e devolve
 *      null quando falta amostra, em vez de inventar "estável"
 *   9. o déficit de secar é 15%, não um número agressivo
 *  10. escalar um alimento por 1 devolve ele mesmo
 */
import {
  AJUSTE_DO_OBJETIVO,
  ALIMENTOS,
  buscarAlimentos,
  escalar,
  FATOR_VIDA,
  gastoDoDia,
  gastoDoTreino,
  idadeEm,
  imc,
  MET_ROLA,
  MET_TECNICA,
  metaDeCalorias,
  metasDeMacro,
  MINUTOS_POR_ROLA,
  pesoEm,
  porMomento,
  somarRefeicoes,
  taxaBasal,
  tendenciaDePeso,
  treinosDoDia,
} from "../src/lib/dieta.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};
const perto = (a, b, tolerancia = 0.5) => Math.abs(a - b) <= tolerancia;

/* --- 1. a basal ---------------------------------------------------------- */
// Gustavo: 1,85 m, 77 kg. Aos 25: 10·77 + 6,25·185 − 5·25 + 5 = 1806,25 → 1806
conferir(
  "Mifflin-St Jeor masculino",
  taxaBasal("masculino", 77, 185, 25) === 1806,
  String(taxaBasal("masculino", 77, 185, 25)),
);
// Mesma pessoa, fórmula feminina: 1806,25 − 5 − 161 = 1640,25 → 1640
conferir(
  "Mifflin-St Jeor feminino",
  taxaBasal("feminino", 77, 185, 25) === 1640,
  String(taxaBasal("feminino", 77, 185, 25)),
);
conferir(
  "a diferença entre os sexos é os 166 kcal da equação",
  taxaBasal("masculino", 70, 175, 30) - taxaBasal("feminino", 70, 175, 30) === 166,
);

conferir("idade em anos completos", idadeEm("2000-09-15", "2026-09-10") === 25);
conferir("aniversário no próprio dia já conta", idadeEm("2000-09-10", "2026-09-10") === 26);
conferir("sem data de nascimento não se inventa idade", idadeEm(null, "2026-09-10") === null);

/* --- 2 e 3. o repouso não entra duas vezes -------------------------------- */
conferir("o fator de vida é o de sedentário, porque o treino entra à parte", FATOR_VIDA === 1.2);

// 60 min de técnica pura, 77 kg: (5,3 − 1) · 3,5 · 77 · 60 / 200 = 347,4
const soTecnica = gastoDoTreino({ date: "2026-09-10", durationMin: 60, rolls: 0 }, 77);
conferir(
  "técnica pura desconta o repouso (MET − 1)",
  perto(soTecnica.kcal, ((MET_TECNICA - 1) * 3.5 * 77 * 60) / 200, 1),
  String(soTecnica.kcal),
);
conferir("sem rola, tudo é minuto de técnica", soTecnica.minutosDeRola === 0 && soTecnica.minutosDeTecnica === 60);

// O teste que pega o erro de somar o MET cheio: se alguém tirar o "− 1", este
// número sobe uns 80 kcal por hora e o teste quebra.
conferir(
  "o MET cheio NÃO é usado",
  soTecnica.kcal < (MET_TECNICA * 3.5 * 77 * 60) / 200 - 50,
  String(soTecnica.kcal),
);

/* --- 4 e 5. a rola pesa mais --------------------------------------------- */
const comRola = gastoDoTreino({ date: "2026-09-10", durationMin: 60, rolls: 5 }, 77);
conferir(
  "mesma duração com rola gasta mais que sem",
  comRola.kcal > soTecnica.kcal,
  `${comRola.kcal} vs ${soTecnica.kcal}`,
);
conferir(
  "cinco rolas viram 30 minutos de rola",
  comRola.minutosDeRola === 5 * MINUTOS_POR_ROLA && comRola.minutosDeTecnica === 30,
  JSON.stringify(comRola),
);
conferir("MET de rola é maior que o de técnica", MET_ROLA > MET_TECNICA);

// Vinte rolas em uma hora não existem — mas o dado do diário pode dizer isso,
// e a conta não pode devolver minuto de técnica negativo por causa disso.
const exagero = gastoDoTreino({ date: "2026-09-10", durationMin: 60, rolls: 20 }, 77);
conferir(
  "minuto de rola nunca passa da duração",
  exagero.minutosDeRola === 60 && exagero.minutosDeTecnica === 0,
  JSON.stringify(exagero),
);

const zerado = gastoDoTreino({ date: "2026-09-10", durationMin: 0, rolls: 0 }, 77);
conferir("treino de duração zero não gasta nada", zerado.kcal === 0);

/* --- o dia --------------------------------------------------------------- */
const treinos = [
  { date: "2026-09-10", durationMin: 100, rolls: 6 },
  { date: "2026-09-10", durationMin: 60, rolls: 4 },
  { date: "2026-09-09", durationMin: 60, rolls: 4 },
];
conferir("treinosDoDia filtra por data", treinosDoDia(treinos, "2026-09-10").length === 2);

const basal = taxaBasal("masculino", 77, 185, 25);
const dia = gastoDoDia(treinosDoDia(treinos, "2026-09-10"), 77, basal);
conferir(
  "o total é basal + vida + treino",
  dia.total === dia.basal + dia.vida + dia.treino,
  JSON.stringify(dia),
);
conferir("a vida é 20% da basal", dia.vida === Math.round(basal * 0.2), String(dia.vida));
conferir("os minutos somam os dois treinos", dia.minutosTreinados === 160);

const paradoNoDomingo = gastoDoDia([], 77, basal);
conferir(
  "dia sem treino ainda gasta basal e vida",
  paradoNoDomingo.treino === 0 && paradoNoDomingo.total === Math.round(basal * 1.2),
  JSON.stringify(paradoNoDomingo),
);

/* --- 6 e 9. as metas ------------------------------------------------------ */
conferir("secar é −15%, não um corte agressivo", AJUSTE_DO_OBJETIVO.secar === -0.15);
conferir("manter não mexe no gasto", AJUSTE_DO_OBJETIVO.manter === 0);
conferir("ganhar é +10%", AJUSTE_DO_OBJETIVO.ganhar === 0.1);

conferir("meta de manter é o próprio gasto", metaDeCalorias("manter", 3000, null) === 3000);
conferir("meta de secar tira 15%", metaDeCalorias("secar", 3000, null) === 2550);
conferir(
  "meta manual manda mais que a fórmula",
  metaDeCalorias("secar", 3000, 2800) === 2800,
);
conferir(
  "meta manual zerada é ausência de meta, não meta zero",
  metaDeCalorias("manter", 3000, 0) === 3000,
);

const macros = metasDeMacro("secar", 77, 2550, null);
conferir("proteína de secar é 2,2 g/kg", macros.proteinaG === Math.round(2.2 * 77), String(macros.proteinaG));
conferir("gordura é 25% das calorias", macros.gorduraG === Math.round((2550 * 0.25) / 9));
conferir(
  "carboidrato é o resto, e os três fecham a meta",
  perto(macros.proteinaG * 4 + macros.carboidratoG * 4 + macros.gorduraG * 9, 2550, 6),
  JSON.stringify(macros),
);

// Meta absurdamente baixa: proteína e gordura sozinhas já estouram. O
// carboidrato não pode virar negativo e mandar a tela desenhar barra invertida.
const apertado = metasDeMacro("secar", 100, 800, null);
conferir("carboidrato nunca fica negativo", apertado.carboidratoG >= 0, JSON.stringify(apertado));

conferir(
  "proteína manual manda mais que a fórmula",
  metasDeMacro("manter", 77, 2500, 200).proteinaG === 200,
);

/* --- o que entrou --------------------------------------------------------- */
const refeicao = (p) => ({
  id: Math.random().toString(36).slice(2),
  data: "2026-09-10",
  momento: "Almoço",
  alimento: "Arroz",
  porcao: "100 g",
  kcal: 128,
  proteinaG: 2.5,
  carboidratoG: 28,
  gorduraG: 0.2,
  ...p,
});

const somado = somarRefeicoes([
  refeicao({ kcal: 128, proteinaG: 2.5 }),
  refeicao({ kcal: 165, proteinaG: 31, carboidratoG: 0, gorduraG: 3.6 }),
]);
conferir("soma as calorias", somado.kcal === 293, JSON.stringify(somado));
conferir("soma a proteína", perto(somado.proteinaG, 33.5, 0.01));
conferir("dia vazio soma zero", somarRefeicoes([]).kcal === 0);

const agrupado = porMomento([
  refeicao({ momento: "Jantar" }),
  refeicao({ momento: "Café da manhã" }),
  refeicao({ momento: "Almoço" }),
  refeicao({ momento: "Madrugada depois do plantão" }),
]);
conferir(
  "os momentos saem na ordem do dia, com o texto livre no fim",
  agrupado.map(([m]) => m).join(" | ") ===
    "Café da manhã | Almoço | Jantar | Madrugada depois do plantão",
  agrupado.map(([m]) => m).join(" | "),
);

/* --- 7. o peso do dia ----------------------------------------------------- */
const pesagem = (data, pesoKg) => ({ id: data, data, pesoKg, gorduraPct: null, nota: "" });
const balanca = [
  pesagem("2026-09-01", 78),
  pesagem("2026-09-05", 77.5),
  pesagem("2026-09-12", 76.9),
];
conferir("pega a pesagem do próprio dia", pesoEm(balanca, "2026-09-05") === 77.5);
conferir("sem pesagem no dia, usa a última anterior", pesoEm(balanca, "2026-09-08") === 77.5);
conferir(
  "NÃO usa uma pesagem futura",
  pesoEm(balanca, "2026-08-30") === null,
  String(pesoEm(balanca, "2026-08-30")),
);

/* --- 8. a tendência ------------------------------------------------------- */
conferir(
  "sem amostra nas duas janelas, a tendência é null e não 'estável'",
  tendenciaDePeso([pesagem("2026-09-09", 77)], "2026-09-10") === null,
);

// Janela recente (últimos 14 dias) em 77,0; anterior (14 dias antes) em 78,0.
// Um quilo em 14 dias é meio quilo por semana, para baixo.
const perdendo = [
  pesagem("2026-08-15", 78.2),
  pesagem("2026-08-20", 77.8),
  pesagem("2026-09-01", 77.1),
  pesagem("2026-09-08", 76.9),
];
const t = tendenciaDePeso(perdendo, "2026-09-10");
conferir("a tendência sai quando há amostra nas duas janelas", t !== null);
conferir(
  "a tendência é negativa quando o peso cai",
  t !== null && t.porSemana < 0,
  t ? String(t.porSemana) : "null",
);
conferir(
  "a tendência é kg por semana, não por janela",
  t !== null && perto(t.porSemana, (t.mediaRecente - t.mediaAnterior) / 2, 0.001),
);
conferir(
  "a tendência conta as amostras de cada janela",
  t !== null && t.amostrasRecentes === 2 && t.amostrasAnteriores === 2,
  t ? `${t.amostrasRecentes}/${t.amostrasAnteriores}` : "null",
);

// Um dia de macarrão não é ganho de peso. Duas médias iguais com um pico no
// meio precisam devolver ~0, senão a tela vira alarme falso toda semana.
const ruido = [
  pesagem("2026-08-16", 77.0),
  pesagem("2026-08-24", 77.0),
  pesagem("2026-08-30", 78.6),
  pesagem("2026-09-06", 75.4),
];
const semDirecao = tendenciaDePeso(ruido, "2026-09-10");
conferir(
  "oscilação de água não vira tendência",
  semDirecao !== null && perto(semDirecao.porSemana, 0, 0.05),
  semDirecao ? String(semDirecao.porSemana) : "null",
);

conferir("IMC de 77 kg e 1,85 m", perto(imc(77, 185), 22.5, 0.05), String(imc(77, 185)));
conferir("altura zero não divide por zero", imc(77, 0) === 0);

/* --- 10. a tabela de alimentos -------------------------------------------- */
conferir("a tabela tem alimento", ALIMENTOS.length >= 40, String(ALIMENTOS.length));
conferir(
  "nenhum alimento tem nome repetido",
  new Set(ALIMENTOS.map((a) => a.nome)).size === ALIMENTOS.length,
);
// 4 kcal por grama de proteína e de carboidrato, 9 de gordura, 7 de álcool.
// Este era o teste que pegava erro de digitação na tabela — e pegou de cara uma
// coisa melhor: a cerveja não fechava, porque dois terços das calorias dela são
// etanol, que não é nenhum dos três macros. Daí o campo `alcoolG`.
const kcalDosMacros = (a) =>
  a.proteinaG * 4 + a.carboidratoG * 4 + a.gorduraG * 9 + (a.alcoolG ?? 0) * 7;
// A folga acomoda fibra, poliol e arredondamento de tabela; o que ela NÃO
// acomoda é uma vírgula fora do lugar, que é o erro que este teste caça.
const fecha = (a) => a.kcal === 0 || Math.abs(kcalDosMacros(a) - a.kcal) <= Math.max(35, a.kcal * 0.2);

conferir(
  "os macros de cada alimento batem com a caloria declarada",
  ALIMENTOS.every(fecha),
  ALIMENTOS.filter((a) => !fecha(a))
    .map((a) => `${a.nome} (${a.kcal} vs ${Math.round(kcalDosMacros(a))})`)
    .join(", "),
);

const frango = ALIMENTOS.find((a) => a.nome.startsWith("Peito de frango"));
conferir("escalar por 1 devolve o próprio alimento", escalar(frango, 1).kcal === frango.kcal);
conferir("escalar por 2 dobra", escalar(frango, 2).kcal === frango.kcal * 2);
conferir("escalar por 1,5", escalar(frango, 1.5).kcal === Math.round(frango.kcal * 1.5));
conferir("quantidade negativa não vira caloria negativa", escalar(frango, -3).kcal === 0);

conferir(
  "a busca ignora acento",
  buscarAlimentos("feijao").some((a) => a.nome.includes("Feijão")),
);
conferir(
  "a busca ignora caixa",
  buscarAlimentos("FRANGO").some((a) => a.nome.includes("frango")),
);
conferir("busca sem resultado devolve lista vazia", buscarAlimentos("zzzzz").length === 0);

/* --- relatório ------------------------------------------------------------ */
console.log(`${ok.length} conferências passaram`);
if (falhas.length) {
  console.error(`\n${falhas.length} falharam:`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
