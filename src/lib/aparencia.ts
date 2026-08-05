import { useEffect, useState } from "react";
import { FAIXAS, type Faixa } from "./bjj-types";

/**
 * A cor do app, e a única exceção que ela admite.
 *
 * ------------------------------------------------------------------
 * O PADRÃO CONTINUA SENDO A FAIXA
 * ------------------------------------------------------------------
 * O acento do app vem da graduação de quem está logado — é a decisão de
 * projeto descrita em `faixa-cores.ts`, e ela não mudou: a cor é conquistada,
 * não escolhida, e muda sozinha no dia em que a faixa muda. Toda conta nova
 * abre assim, e quem nunca entrar aqui nunca vai saber que dava para trocar.
 *
 * O que existe agora é uma SAÍDA para quem quer outra. Três casos legítimos:
 * quem é daltônico e não distingue o acento da própria faixa; quem é faixa
 * branca e acha o app apagado demais; e quem simplesmente prefere outra cor —
 * motivo suficiente, num app que é da pessoa.
 *
 * ------------------------------------------------------------------
 * POR QUE SÓ AS CORES DAS FAIXAS
 * ------------------------------------------------------------------
 * A escolha não é um seletor livre de cores, e isso é deliberado. Os sete
 * acentos das faixas são os únicos valores auditados: `verificar-contraste.mjs`
 * confere cada um contra o fundo, contra o cartão e contra o texto que fica
 * por cima deles, e é isso que garante que nenhum botão do app fique
 * ilegível. Um seletor livre entregaria à pessoa a possibilidade de escolher
 * amarelo-claro e transformar metade das telas em texto invisível — sem aviso,
 * sem volta óbvia, e sem nada que o verificador consiga pegar.
 *
 * Sete cores testadas valem mais que dezesseis milhões sem garantia nenhuma.
 *
 * ------------------------------------------------------------------
 * POR QUE NO APARELHO, E NÃO NO BANCO
 * ------------------------------------------------------------------
 * Preferência de aparência é do aparelho: vale offline, aplica antes de
 * qualquer consulta e não custa uma coluna nova nem uma migração. O preço é
 * não acompanhar quem troca de celular — aceitável para uma cor, e reversível
 * a qualquer momento se algum dia fizer falta.
 */

const CHAVE = "ponteira:cor";

/** `null` = seguir a faixa, que é o padrão. */
export type EscolhaDeCor = Faixa | null;

/** As opções oferecidas, na ordem da graduação. */
export const CORES_DISPONIVEIS = FAIXAS;

function ler(): EscolhaDeCor {
  try {
    const v = localStorage.getItem(CHAVE);
    // Só aceita nome de faixa conhecido. Um valor estranho no armazenamento —
    // versão antiga, edição manual, extensão do navegador — volta ao padrão em
    // vez de escrever lixo na variável CSS.
    return v && (FAIXAS as readonly string[]).includes(v) ? (v as Faixa) : null;
  } catch {
    // localStorage joga em aba anônima de alguns navegadores.
    return null;
  }
}

function gravar(escolha: EscolhaDeCor) {
  try {
    if (escolha === null) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, escolha);
  } catch {
    /* sem armazenamento: a cor vale só nesta sessão, e tudo bem */
  }
}

/** Avisa as outras telas abertas que a escolha mudou. */
const EVENTO = "ponteira:cor-mudou";

export function useCorEscolhida() {
  const [escolha, setEscolha] = useState<EscolhaDeCor>(ler);

  useEffect(() => {
    const atualizar = () => setEscolha(ler());
    window.addEventListener(EVENTO, atualizar);
    // `storage` cobre a mesma conta aberta em outra aba.
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return {
    escolha,
    escolher(nova: EscolhaDeCor) {
      gravar(nova);
      setEscolha(nova);
      window.dispatchEvent(new Event(EVENTO));
    },
  };
}
