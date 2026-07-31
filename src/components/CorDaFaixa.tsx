import { useEffect } from "react";
import { usePerfil } from "@/lib/bjj-storage";
import { acentoDaFaixa, textoSobreAcento } from "@/lib/faixa-cores";

/**
 * Pinta o app com a faixa de quem está logado.
 *
 * Não renderiza nada: escreve duas variáveis no elemento raiz, e todo o resto
 * do app — que já usava `--primary` em 94 lugares — passa a seguir a graduação
 * sem precisar de uma linha a mais.
 *
 * Fica no layout autenticado de propósito. Na tela de login não há faixa para
 * ler, e ali o app usa a cor de marca (a palha do kimono), que é o padrão
 * declarado no CSS.
 */
export function CorDaFaixa() {
  const { perfil } = usePerfil();
  const faixa = perfil?.belt;

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty("--faixa", acentoDaFaixa(faixa));
    raiz.style.setProperty("--faixa-contraste", textoSobreAcento(faixa));

    // Sair da conta tem que devolver o padrão, senão a tela de login herda a
    // cor da última pessoa que usou o aparelho.
    return () => {
      raiz.style.removeProperty("--faixa");
      raiz.style.removeProperty("--faixa-contraste");
    };
  }, [faixa]);

  return null;
}
