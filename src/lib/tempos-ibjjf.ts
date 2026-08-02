import type { Faixa } from "./bjj-types";

/**
 * Os tempos mínimos de graduação da IBJJF — os de verdade.
 *
 * FONTE: Sistema Geral de Graduação da IBJJF, mais a atualização de período
 * mínimo publicada pela própria federação. Os valores estão em MESES para
 * caber numa conta só, e cada um está anotado com o que a regra diz.
 *
 * Três coisas que quase todo app de jiu-jitsu erra, e que aqui estão certas:
 *
 * 1. **A branca não tem tempo mínimo.** A IBJJF não fixa período de branca para
 *    azul — fixa IDADE: 16 anos. Um app que diz "faltam 8 meses para a azul"
 *    para um faixa-branca está inventando uma regra que não existe.
 *
 * 2. **O tempo entre graus de faixa colorida também não é regra da IBJJF.**
 *    Até a marrom, adotar ou não o sistema de graus é decisão do professor. Da
 *    preta em diante vira obrigatório. Então o app pode mostrar previsão de
 *    FAIXA, mas previsão de GRAU até a marrom seria chute com cara de norma.
 *
 * 3. **Os degraus da preta não são todos iguais.** São 3 anos para cada um dos
 *    três primeiros graus e 5 anos para cada um dos três seguintes — o que dá
 *    24 anos até o 6º grau, não 18. Depois disso o tempo dobra de escala.
 *
 * A conta fecha: 3+3+3 = 9 anos até o 3º grau; +5+5+5 = 24 até o 6º; +7 = 31
 * anos de faixa-preta para o 7º grau (coral vermelha e preta); +7 = 38 para o
 * 8º (coral vermelha e branca); +10 = 48 para o 9º (vermelha).
 */

const ANO = 12;

export interface DegrauDaEscada {
  /** O que a pessoa recebe ao completar este degrau. */
  faixa: Faixa;
  grau: number;
  /** Meses mínimos NA GRADUAÇÃO ANTERIOR antes de poder receber esta. */
  mesesMinimos: number | null;
  /** Idade mínima exigida pela IBJJF, quando há. */
  idadeMinima: number | null;
  /** O que a regra diz, em uma linha, para a tela poder mostrar. */
  regra: string;
}

/**
 * A escada inteira, na ordem em que se sobe.
 *
 * `mesesMinimos: null` quer dizer "a IBJJF não fixa tempo aqui" — e isso é
 * informação, não buraco. É a diferença entre "faltam X meses" e "não existe
 * prazo; depende do seu professor".
 */
export const ESCADA_IBJJF: readonly DegrauDaEscada[] = [
  {
    faixa: "Azul",
    grau: 0,
    mesesMinimos: null,
    idadeMinima: 16,
    regra: "A IBJJF não fixa tempo de branca. Fixa idade: 16 anos.",
  },
  {
    faixa: "Roxa",
    grau: 0,
    mesesMinimos: 2 * ANO,
    idadeMinima: 16,
    regra: "2 anos de faixa-azul, e 16 anos de idade.",
  },
  {
    faixa: "Marrom",
    grau: 0,
    mesesMinimos: 18,
    idadeMinima: 18,
    regra: "18 meses de faixa-roxa, e 18 anos de idade.",
  },
  {
    faixa: "Preta",
    grau: 0,
    mesesMinimos: 1 * ANO,
    idadeMinima: 19,
    regra: "1 ano de faixa-marrom, e 19 anos de idade.",
  },
  // A partir daqui o sistema de graus deixa de ser opcional.
  { faixa: "Preta", grau: 1, mesesMinimos: 3 * ANO, idadeMinima: null, regra: "3 anos de faixa-preta." },
  { faixa: "Preta", grau: 2, mesesMinimos: 3 * ANO, idadeMinima: null, regra: "3 anos no 1º grau." },
  { faixa: "Preta", grau: 3, mesesMinimos: 3 * ANO, idadeMinima: null, regra: "3 anos no 2º grau." },
  { faixa: "Preta", grau: 4, mesesMinimos: 5 * ANO, idadeMinima: null, regra: "5 anos no 3º grau." },
  { faixa: "Preta", grau: 5, mesesMinimos: 5 * ANO, idadeMinima: null, regra: "5 anos no 4º grau." },
  { faixa: "Preta", grau: 6, mesesMinimos: 5 * ANO, idadeMinima: null, regra: "5 anos no 5º grau." },
  {
    faixa: "Coral",
    grau: 7,
    mesesMinimos: 7 * ANO,
    idadeMinima: 50,
    regra: "7 anos no 6º grau — 31 anos de faixa-preta ao todo — e 50 anos de idade.",
  },
  {
    faixa: "Coral",
    grau: 8,
    mesesMinimos: 7 * ANO,
    idadeMinima: null,
    regra: "7 anos no 7º grau — 38 anos de faixa-preta ao todo.",
  },
  {
    faixa: "Vermelha",
    grau: 9,
    mesesMinimos: 10 * ANO,
    idadeMinima: null,
    regra: "10 anos no 8º grau — 48 anos de faixa-preta ao todo.",
  },
  {
    faixa: "Vermelha",
    grau: 10,
    mesesMinimos: null,
    idadeMinima: null,
    regra:
      "Não se conquista por tempo: é dos cinco irmãos Gracie — Carlos, Oswaldo, " +
      "George, Gastão e Hélio — os pioneiros que criaram a arte.",
  },
] as const;

/** O próximo degrau a partir de onde a pessoa está. */
export function proximoDegrau(
  faixa: Faixa | string | undefined | null,
  grau = 0,
): DegrauDaEscada | null {
  const i = ESCADA_IBJJF.findIndex((d) => d.faixa === faixa && d.grau === grau);
  // Faixa branca não está na escada como degrau (ninguém "recebe" a branca):
  // ela é o começo, e o próximo degrau é o primeiro da lista.
  if (i < 0) return ESCADA_IBJJF[0] ?? null;
  return ESCADA_IBJJF[i + 1] ?? null;
}

export interface PrevisaoDeGraduacao {
  degrau: DegrauDaEscada;
  /** Meses já cumpridos na graduação atual, quando dá para saber. */
  mesesFeitos: number | null;
  /** Meses que ainda faltam pelo mínimo da IBJJF. `null` = não há prazo. */
  mesesFaltando: number | null;
  /** 0 a 1. `null` quando não há prazo a cumprir. */
  fracao: number | null;
  /** A pessoa já cumpriu o tempo mínimo? */
  liberado: boolean;
}

/**
 * Onde a pessoa está em relação ao próximo degrau.
 *
 * `desde` é a data da graduação atual. Sem ela não dá para calcular nada, e o
 * app precisa dizer isso em vez de mostrar zero — "não sei" e "faltam 24 meses"
 * são respostas muito diferentes.
 *
 * O que esta função NÃO faz, de propósito: dizer que a pessoa vai ser
 * graduada. O tempo mínimo é condição necessária e não suficiente. Quem gradua
 * é o professor, e cumprir o prazo não gera direito nenhum.
 */
export function previsao(
  faixa: Faixa | string | undefined | null,
  grau: number,
  desde: string | Date | null | undefined,
  hoje: Date = new Date(),
): PrevisaoDeGraduacao | null {
  const degrau = proximoDegrau(faixa, grau);
  if (!degrau) return null;

  if (degrau.mesesMinimos === null) {
    return { degrau, mesesFeitos: null, mesesFaltando: null, fracao: null, liberado: true };
  }

  if (!desde) {
    return { degrau, mesesFeitos: null, mesesFaltando: null, fracao: null, liberado: false };
  }

  const inicio = desde instanceof Date ? desde : new Date(`${desde}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) {
    return { degrau, mesesFeitos: null, mesesFaltando: null, fracao: null, liberado: false };
  }

  const mesesFeitos = mesesEntre(inicio, hoje);
  const mesesFaltando = Math.max(0, degrau.mesesMinimos - mesesFeitos);
  return {
    degrau,
    mesesFeitos,
    mesesFaltando,
    fracao: Math.min(1, mesesFeitos / degrau.mesesMinimos),
    liberado: mesesFaltando === 0,
  };
}

/**
 * Meses cheios entre duas datas.
 *
 * Contar por `dias / 30` erra quase meio mês por ano e faz a barra andar
 * sozinha em fevereiro. Contando mês de calendário e descontando o dia que
 * ainda não chegou, "2 anos" vira exatamente 24.
 */
export function mesesEntre(inicio: Date, fim: Date): number {
  let m =
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth() - inicio.getMonth());
  if (fim.getDate() < inicio.getDate()) m -= 1;
  return Math.max(0, m);
}

/** "2 anos e 3 meses", "18 meses", "1 ano" — como se fala, não como se calcula. */
export function emPortugues(meses: number): string {
  if (meses <= 0) return "nenhum mês";
  if (meses < 24) return meses === 1 ? "1 mês" : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const parteAnos = anos === 1 ? "1 ano" : `${anos} anos`;
  if (!resto) return parteAnos;
  return `${parteAnos} e ${resto === 1 ? "1 mês" : `${resto} meses`}`;
}
