import { EIXOS, NOTA_MAXIMA, type NotasDoHexagono } from "./hexagono.ts";

/**
 * O hexágono calculado, e não declarado.
 *
 * ------------------------------------------------------------------
 * POR QUE A AUTO-AVALIAÇÃO SAIU
 * ------------------------------------------------------------------
 * Pedir nota de 0 a 5 media a confiança da pessoa, não o jiu-jitsu dela. O
 * mesmo faixa-branca se dá 1 na semana em que apanhou e 4 na semana seguinte
 * sem ter mudado nada — e o gráfico registrava o humor com cara de medida.
 *
 * Agora o app conta EVENTOS: quantas finalizações saíram, quantas foram
 * sofridas, quantas passagens, quantas raspadas, em que rola o ritmo caiu.
 * "Fui finalizado 3 vezes" é fato; "minha defesa é 2" é veredito. Só o
 * primeiro o parceiro pode conferir.
 *
 * ------------------------------------------------------------------
 * O QUE "RELATIVO" QUER DIZER AQUI — TRÊS MECANISMOS
 * ------------------------------------------------------------------
 *
 * **1. Diferença de faixa (o principal).** Ser finalizado por um preta quando
 * se é branca é o esperado; ser finalizado por um branca quando se é roxa não
 * é. Cada evento pesa conforme o degrau entre você e o parceiro:
 *
 *     evento a favor  → peso 2^(gap)     (fez contra alguém acima: vale mais)
 *     evento sofrido  → peso 2^(-gap)    (sofreu de alguém acima: dói menos)
 *
 * com `gap` = faixa do parceiro − sua faixa, limitado a ±2 degraus. Um branca
 * que rola com preta não ganha multiplicador 16 e vira "roxa" por uma noite.
 *
 * Isto é o que faz a nota ser comparável entre faixas sem nivelar ninguém: um
 * roxa entre roxas e um branca entre brancas jogam ambos 50/50, e ambos podem
 * tirar 3. O que diferencia é o que cada um faz DENTRO do próprio nível.
 *
 * **2. Amostra pequena puxa para o meio.** Com três rolas registradas não se
 * sabe quase nada, e uma noite boa não pode virar nota 5. O valor observado
 * entra com peso `n / (n + K)` e o resto fica no meio da escala:
 *
 *     nota = 5 × [ p·observado + (1−p)·0,5 ],   p = n / (n + K)
 *
 * É encolhimento para a média — a forma padrão de tratar amostra curta. Na
 * prática: a nota começa no meio e vai se afastando conforme a pessoa registra.
 * Ela não pula, e é por isso que ela merece confiança.
 *
 * **3. Idade, e só onde a idade manda.** Um praticante de 45 anos que segura o
 * ritmo por cinco rolas está indo melhor que um de 20 que faz o mesmo. A
 * referência de gás sobe com a idade; nos outros cinco eixos a idade não entra,
 * porque não há evidência de que deva.
 *
 * ------------------------------------------------------------------
 * E O TEMPO
 * ------------------------------------------------------------------
 * Janela de 8 semanas, com as semanas recentes pesando mais (meia-vida de 4
 * semanas). É o que faz a nota SUBIR E DESCER em vez de acumular para sempre:
 * quem parou de passar guarda vê a passagem cair sozinha em um mês.
 */

/* ================================================================== */

export interface SinalDeRola {
  data: string;
  parceiroFaixa: string;
  rolas: number;
  finAFavor: number;
  finSofridas: number;
  passAFavor: number;
  passSofridas: number;
  raspAFavor: number;
  raspSofridas: number;
  confirmado: boolean;
  /** A pessoa realmente preencheu os contadores desta rola. */
  detalhado: boolean;
  ritmoCaiuNa: number | null;
  ritmoRespondido: boolean;
  rolasDaSessao: number;
}

export interface NotaDerivada {
  nota: number;
  /** Rolas ponderadas que alimentaram este eixo. É o que sustenta a nota. */
  amostra: number;
  /** 0 a 1 — o peso que os dados da pessoa têm contra o meio da escala. */
  confianca: number;
  /** Abaixo do piso o app não afirma nada, e diz isso na tela. */
  temDado: boolean;
}

export type HexagonoDerivado = Record<string, NotaDerivada>;

/* ================================================================== */

/** O degrau de cada faixa. Coral e vermelha são preta — o grau é a cor. */
const DEGRAU: Record<string, number> = {
  Branca: 0,
  Azul: 1,
  Roxa: 2,
  Marrom: 3,
  Preta: 4,
  Coral: 4,
  Vermelha: 4,
};

const degrauDe = (faixa: string | null | undefined): number | null => {
  const d = DEGRAU[String(faixa ?? "").trim()];
  return d === undefined ? null : d;
};

/** Limite do gap. Dois degraus já é o suficiente para dizer "muito acima". */
const GAP_MAX = 2;

/**
 * Os dois pesos de um evento, dada a diferença de faixa.
 *
 * Sem faixa registrada do parceiro o gap é 0 — peso neutro. Chutar seria pior:
 * um "provavelmente é da minha faixa" errado vira nota errada sem aviso.
 */
export function pesosDoEvento(minhaFaixa: string, faixaDoParceiro: string) {
  const meu = degrauDe(minhaFaixa) ?? 0;
  const dele = degrauDe(faixaDoParceiro);
  const gap = dele === null ? 0 : Math.max(-GAP_MAX, Math.min(GAP_MAX, dele - meu));
  return { aFavor: 2 ** gap, sofrido: 2 ** -gap, gap };
}

/**
 * O peso da semana. Meia-vida de 4 semanas.
 *
 * O que aconteceu ontem diz mais sobre o seu jogo de hoje do que o que
 * aconteceu há dois meses — mas o de dois meses não é lixo, e por isso decai
 * em vez de cair fora.
 */
const MEIA_VIDA_SEMANAS = 4;

export function pesoDaData(data: string, hoje: Date): number {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  const semanas = (hoje.getTime() - d.getTime()) / (7 * 86400000);
  if (semanas < 0) return 1;
  return 0.5 ** (semanas / MEIA_VIDA_SEMANAS);
}

/** Rolas ponderadas para a nota valer metade do caminho. */
const K_ENCOLHIMENTO = 10;

/** Abaixo disto a tela diz "ainda não sei" em vez de mostrar um número. */
export const AMOSTRA_MINIMA = 3;

/**
 * A taxa que corresponde ao meio da escala, por eixo.
 *
 * São eventos por rola ponderada. Entre iguais, um jogo equilibrado produz
 * mais ou menos um evento decisivo a cada duas ou três rolas — daí a ordem de
 * grandeza. Não são constantes sagradas: são a referência inicial, e o lugar
 * certo de calibrar quando houver dado real suficiente.
 */
const TAXA_MEDIA: Record<string, number> = {
  guarda: 0.45,
  passagem: 0.4,
  finalizacao: 0.35,
  retencao: 0.4,
  defesa: 0.35,
  gas: 0, // gás não usa taxa: ver `notaDeGas`
};

/**
 * Mapeia uma taxa observada para 0..1, com a taxa média caindo em 0,5.
 *
 * Curva saturante em vez de reta: dobrar a taxa média leva a ~0,67, e não a
 * 1,0. Uma reta faria a nota estourar o teto na primeira semana boa e depois
 * não ter para onde ir — e a escala precisa de espaço lá em cima a vida toda.
 */
function paraFracao(taxa: number, media: number): number {
  if (media <= 0) return 0.5;
  return taxa / (taxa + media);
}

/**
 * Eixos defensivos: o evento que conta é o SOFRIDO, então mais eventos é pior.
 * A fração é invertida — e não subtraída de 1 depois da nota, que daria outra
 * curva.
 */
const DEFENSIVO = new Set(["retencao", "defesa"]);

/* ================================================================== */

export interface ContextoDaPessoa {
  faixa: string;
  /** Anos. `null` quando a pessoa não informou a data de nascimento. */
  idade: number | null;
}

interface Acumulado {
  eventos: number;
  rolas: number;
}

/**
 * A referência de gás, em fração da sessão aguentada.
 *
 * Aos 20 anos, segurar o ritmo até 70% das rolas é o normal; aos 50, 55% já é
 * bom. A reta desce 0,5 ponto percentual por ano acima dos 20, com piso em
 * 45% — números modestos de propósito, porque a alternativa honesta seria não
 * ajustar nada, e não ajustar é pior: cobraria do praticante de 50 anos o
 * mesmo pulmão do de 20.
 */
export function referenciaDeGas(idade: number | null): number {
  if (idade === null) return 0.7;
  return Math.max(0.45, 0.7 - Math.max(0, idade - 20) * 0.005);
}

function notaDeGas(sinais: SinalDeRola[], hoje: Date, idade: number | null): NotaDerivada {
  // Uma leitura por SESSÃO, não por parceiro: o ritmo é da noite inteira, e
  // contar uma vez por parceiro daria peso quádruplo a quem anotou quatro.
  const porSessao = new Map<string, SinalDeRola>();
  for (const s of sinais) {
    if (s.ritmoRespondido && !porSessao.has(s.data)) porSessao.set(s.data, s);
  }

  let soma = 0;
  let peso = 0;
  for (const s of porSessao.values()) {
    const w = pesoDaData(s.data, hoje);
    // Não caiu = aguentou a sessão inteira.
    const fracao =
      s.ritmoCaiuNa === null ? 1 : Math.min(1, s.ritmoCaiuNa / Math.max(1, s.rolasDaSessao));
    soma += fracao * w;
    peso += w;
  }

  if (peso <= 0) {
    return { nota: 0, amostra: 0, confianca: 0, temDado: false };
  }

  const observado = soma / peso;
  const ref = referenciaDeGas(idade);
  const bruto = paraFracao(observado, ref);
  return montar(bruto, peso);
}

function montar(bruto: number, amostra: number): NotaDerivada {
  const confianca = amostra / (amostra + K_ENCOLHIMENTO);
  const encolhido = confianca * bruto + (1 - confianca) * 0.5;
  return {
    nota: Math.round(encolhido * NOTA_MAXIMA * 10) / 10,
    amostra: Math.round(amostra * 10) / 10,
    confianca: Math.round(confianca * 100) / 100,
    temDado: amostra >= AMOSTRA_MINIMA,
  };
}

/**
 * O hexágono da pessoa, a partir das rolas registradas.
 *
 * Devolve SEMPRE os seis eixos. Os que não têm amostra vêm com `temDado:
 * false` e nota zero — e a tela precisa tratar isso como "ainda não sei", não
 * como "você é ruim nisso". São coisas opostas, e confundi-las seria o pior
 * erro que este gráfico pode cometer.
 */
export function derivarHexagono(
  sinais: SinalDeRola[],
  pessoa: ContextoDaPessoa,
  hoje: Date = new Date(),
): HexagonoDerivado {
  const acc: Record<string, Acumulado> = Object.fromEntries(
    EIXOS.map((e) => [e.slug, { eventos: 0, rolas: 0 }]),
  );

  for (const s of sinais) {
    // Zero e "não respondi" são iguais para o banco e opostos para o gráfico.
    // Sem esta linha, uma rola registrada sem os contadores entraria como
    // "ninguém me passou, ninguém me finalizou" — e o app anunciaria retenção
    // e defesa altas para quem nunca respondeu nada.
    if (!s.detalhado) continue;
    const w = pesoDaData(s.data, hoje);
    if (w <= 0) continue;
    const { aFavor, sofrido } = pesosDoEvento(pessoa.faixa, s.parceiroFaixa);
    const rolas = Math.max(1, s.rolas);

    // Ofensivos: o evento pesa pela dificuldade; o denominador pesa pela
    // oportunidade, que é a mesma para todo mundo — por isso ele não leva o
    // peso de faixa junto, só o do tempo.
    acc.guarda.eventos += s.raspAFavor * aFavor * w;
    acc.guarda.rolas += rolas * w;

    acc.passagem.eventos += s.passAFavor * aFavor * w;
    acc.passagem.rolas += rolas * w;

    acc.finalizacao.eventos += s.finAFavor * aFavor * w;
    acc.finalizacao.rolas += rolas * w;

    // Defensivos: sofrer de quem está acima pesa menos.
    acc.retencao.eventos += s.passSofridas * sofrido * w;
    acc.retencao.rolas += rolas * w;

    acc.defesa.eventos += s.finSofridas * sofrido * w;
    acc.defesa.rolas += rolas * w;
  }

  const saida: HexagonoDerivado = {};
  for (const e of EIXOS) {
    if (e.slug === "gas") {
      saida.gas = notaDeGas(sinais, hoje, pessoa.idade);
      continue;
    }
    const a = acc[e.slug];
    if (!a || a.rolas <= 0) {
      saida[e.slug] = { nota: 0, amostra: 0, confianca: 0, temDado: false };
      continue;
    }
    const taxa = a.eventos / a.rolas;
    const bruta = paraFracao(taxa, TAXA_MEDIA[e.slug] ?? 0.4);
    // Quanto mais eventos sofridos, PIOR — a fração vira o seu complemento.
    saida[e.slug] = montar(DEFENSIVO.has(e.slug) ? 1 - bruta : bruta, a.rolas);
  }
  return saida;
}

/** Só as notas, para o hexágono desenhar. */
export function notasDe(h: HexagonoDerivado): NotasDoHexagono {
  return Object.fromEntries(EIXOS.map((e) => [e.slug, h[e.slug]?.nota ?? 0]));
}

/** Quantos eixos já têm o que dizer. Abaixo de 3 não vale desenhar figura. */
export function eixosComDado(h: HexagonoDerivado): number {
  return EIXOS.filter((e) => h[e.slug]?.temDado).length;
}
