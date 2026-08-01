import { FAIXAS, type Faixa } from "./bjj-types";

/**
 * A escada de graduação, como ela é de verdade.
 *
 * O app tratava coral e vermelha como faixas novas, cada uma recomeçando a
 * contagem de graus do zero — e oferecia "0 a 4 graus" para as duas, do mesmo
 * jeito que oferece para a branca. Está errado, e errado de um jeito que
 * qualquer faixa-preta percebe de imediato.
 *
 * O que acontece de fato: DEPOIS DA PRETA NÃO EXISTE FAIXA NOVA. Existe a
 * mesma faixa-preta, com mais graus, e a partir do sétimo o grau muda a cor do
 * tecido em vez de acrescentar uma listra. A faixa vermelha não é "uma faixa
 * vermelha sem graus" — é o nono grau de faixa-preta.
 *
 *   Branca, Azul, Roxa, Marrom   0 a 4 graus   listras na ponteira
 *   Preta                        0 a 6 graus   listras na ponteira
 *   Coral (vermelha e preta)     7º grau       o tecido muda
 *   Coral (vermelha e branca)    8º grau       o tecido muda
 *   Vermelha                     9º e 10º grau o tecido muda
 *
 * A consequência prática, e é a que o app errava: coral e vermelha NÃO
 * carregam listra nenhuma. Desenhar quatro listras brancas numa faixa vermelha
 * — que era o que a tela fazia — inventa uma graduação que não existe.
 */

/** Os graus que cada faixa admite. Fonte única. */
export const GRAUS_DA_FAIXA: Record<Faixa, readonly number[]> = {
  Branca: [0, 1, 2, 3, 4],
  Azul: [0, 1, 2, 3, 4],
  Roxa: [0, 1, 2, 3, 4],
  Marrom: [0, 1, 2, 3, 4],
  // Seis, não quatro. O 5º e o 6º grau de preta existem e o app não os oferecia.
  Preta: [0, 1, 2, 3, 4, 5, 6],
  // A partir daqui o grau É a faixa. Não há escolha a fazer além de qual dos dois.
  Coral: [7, 8],
  Vermelha: [9, 10],
} as const;

/**
 * A faixa carrega listra de grau na ponteira?
 *
 * Da branca à preta, sim — a listra é como o grau aparece. Da coral em diante,
 * não: o grau já está dito pela cor do tecido, e uma listra em cima disso seria
 * contar a mesma coisa duas vezes.
 */
export function temListras(faixa: Faixa | string | undefined | null): boolean {
  return !["Coral", "Vermelha"].includes(String(faixa ?? ""));
}

/** Os graus válidos para uma faixa. */
export function grausValidos(faixa: Faixa | string | undefined | null): readonly number[] {
  return GRAUS_DA_FAIXA[(faixa ?? "Branca") as Faixa] ?? GRAUS_DA_FAIXA.Branca;
}

/**
 * Encaixa um grau na faixa.
 *
 * Serve para quando a faixa muda no formulário: quem estava em "Preta 3º grau"
 * e escolhe Vermelha não pode continuar com 3, porque não existe vermelha 3º
 * grau. O valor mais próximo dentro da escada é o que faz sentido.
 */
export function ajustarGrau(
  faixa: Faixa | string | undefined | null,
  grau: number,
): number {
  const validos = grausValidos(faixa);
  if (validos.includes(grau)) return grau;
  return validos.reduce((melhor, atual) =>
    Math.abs(atual - grau) < Math.abs(melhor - grau) ? atual : melhor,
  );
}

/**
 * Uma posição única na escada inteira, para comparar graduações.
 *
 * Não dá para comparar só por grau (preta 6º e coral 7º são graus diferentes da
 * mesma progressão, mas marrom 4º e preta 0 não são), nem só por faixa. Este
 * número resolve os dois casos de uma vez.
 */
export function posicaoNaEscada(
  faixa: Faixa | string | undefined | null,
  grau = 0,
): number {
  const i = FAIXAS.indexOf((faixa ?? "Branca") as Faixa);
  const iSeguro = i < 0 ? 0 : i;
  // Coral e vermelha continuam a contagem da preta: o índice delas seria um
  // salto artificial. Ancorar as três no mesmo degrau mantém a ordem certa.
  const base = iSeguro >= FAIXAS.indexOf("Preta") ? FAIXAS.indexOf("Preta") : iSeguro;
  return base * 100 + Math.max(0, grau);
}

/**
 * O nome da graduação, como se fala.
 *
 * De branca a marrom se conta grau no plural ("Azul 3 graus"); da preta em
 * diante se diz o ordinal ("Preta 2º grau"), que é como aparece em diploma e em
 * chamada de pódio. Coral e vermelha dizem o grau também — porque o grau é o
 * que elas são.
 */
export function nomeDaGraduacao(
  faixa: Faixa | string | undefined | null,
  grau = 0,
): string {
  const belt = String(faixa ?? "Branca");
  const g = Math.max(0, grau);
  if (!g) return belt;
  if (["Preta", "Coral", "Vermelha"].includes(belt)) return `${belt} ${g}º grau`;
  return `${belt} ${g} ${g === 1 ? "grau" : "graus"}`;
}

/**
 * A explicação de uma linha, para as faixas que confundem.
 *
 * Vale a pena escrever na tela: muita gente que treina há anos não sabe que a
 * vermelha é o 9º grau de preta, e o app é um bom lugar para dizer isso sem
 * dar aula.
 */
export function explicacaoDaFaixa(
  faixa: Faixa | string | undefined | null,
  grau = 0,
): string | null {
  switch (String(faixa ?? "")) {
    case "Coral":
      return grau === 8
        ? "8º grau de faixa-preta — a coral vermelha e branca"
        : "7º grau de faixa-preta — a coral vermelha e preta";
    case "Vermelha":
      return grau === 10
        ? "10º grau de faixa-preta — reservado aos pioneiros"
        : "9º grau de faixa-preta";
    default:
      return null;
  }
}
