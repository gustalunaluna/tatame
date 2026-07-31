import type { CSSProperties } from "react";
import cores from "@/design/tokens.json";
import type { Faixa } from "./bjj-types";

/**
 * A cor do app é a SUA faixa.
 *
 * O verde-limão anterior não queria dizer nada: era a cor padrão de app de
 * academia, e por ser a mais gritante da tela roubava atenção das duas
 * linguagens de cor que o jiu-jitsu já tem e que o app já usava — a graduação
 * e o pódio.
 *
 * Agora o acento vem da faixa de quem está logado. Um faixa branca abre um app
 * diferente do que um roxa abre, e ele muda no dia da graduação. Nenhum outro
 * esporte permite isso: a cor é conquistada, não escolhida.
 *
 * Os valores vivem em `design/tokens.json`, que é a fonte única do visual:
 * o CSS é gerado dele e o verificador de contraste lê o mesmo arquivo.
 */

// O JSON entra como `number[]`, e o TypeScript não sabe que são sempre três.
// Ler por índice em vez de desestruturar evita a asserção de tupla — e o
// verificador de contraste garante que os valores estão certos.
const oklch = (v: number[]) => `oklch(${v[0]} ${v[1]} ${v[2]})`;

const FAIXAS: Record<
  string,
  { acento: number[]; tecido: number[]; rotulo: string }
> = cores.cor.faixa;

/** O acento da faixa, em CSS. É o que vira `--primary`. */
export function acentoDaFaixa(faixa: Faixa | undefined | null): string {
  return oklch((FAIXAS[faixa ?? "Branca"] ?? FAIXAS.Branca).acento);
}

/** A cor do tecido da faixa — usada no desenho dela, não como acento. */
export function tecidoDaFaixa(faixa: Faixa | undefined | null): string {
  return oklch((FAIXAS[faixa ?? "Branca"] ?? FAIXAS.Branca).tecido);
}

/**
 * Preto sobre acentos claros, branco sobre os escuros. Sem isto, o texto de
 * dentro de um botão some justamente nas faixas mais claras.
 */
export function textoSobreAcento(faixa: Faixa | undefined | null): string {
  const [l] = (FAIXAS[faixa ?? "Branca"] ?? FAIXAS.Branca).acento;
  return l > 0.72 ? oklch(cores.cor.base.fundo.valor) : "oklch(0.99 0 0)";
}

export const CORES_MEDALHA = {
  ouro: oklch(cores.cor.podio.ouro.valor),
  prata: oklch(cores.cor.podio.prata.valor),
  bronze: oklch(cores.cor.podio.bronze.valor),
};

/**
 * Estilo para vestir um TRECHO da tela com outra faixa — o cartão de uma meta
 * de graduação, uma prévia, um comparativo.
 *
 * Precisa devolver `--primary` junto, e não só `--faixa`: `--primary: var(--faixa)`
 * é declarado uma vez no `:root` e o que desce para os filhos é o valor JÁ
 * resolvido. Trocar só `--faixa` num filho não recalcula `--primary` — o
 * cartão da meta ficava com a cor da faixa atual mesmo tendo a variável certa.
 */
export function estiloDaFaixa(faixa: Faixa | undefined | null) {
  const acento = acentoDaFaixa(faixa);
  return {
    "--faixa": acento,
    "--faixa-contraste": textoSobreAcento(faixa),
    "--primary": acento,
    "--primary-foreground": textoSobreAcento(faixa),
    "--ring": acento,
  } as CSSProperties;
}
