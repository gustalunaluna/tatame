import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Campo de número COM casa decimal — o irmão de `CampoNumero`.
 *
 * Existe porque metade da área de dieta não é inteira: peso é 77,4; proteína
 * é 31,5; porção é 1,5. `CampoNumero` apaga tudo que não é dígito, então ele
 * transformaria "77,4" em 774 embaixo do dedo de quem digita — silenciosamente,
 * e num campo onde o erro é de dez vezes.
 *
 * Herda as duas decisões que já estavam certas lá:
 *
 *   • por dentro guarda TEXTO, porque `number` não sabe dizer "vazio" e `+""`
 *     é 0 — o bug do "0120";
 *   • normaliza no BLUR, nunca durante a digitação, porque corrigir enquanto a
 *     pessoa escreve briga com o cursor.
 *
 * E resolve o problema próprio dele: no Brasil se digita vírgula, e o teclado
 * do celular oferece vírgula. `Number("77,4")` é `NaN`. A vírgula entra, é
 * aceita, e vira ponto só na hora de virar número.
 */
export function CampoDecimal({
  valor,
  aoMudar,
  min = 0,
  max,
  casas = 1,
  id,
  className,
  placeholder,
}: {
  valor: number;
  aoMudar: (n: number) => void;
  min?: number;
  max?: number;
  /** Quantas casas sobram depois do blur. */
  casas?: number;
  id?: string;
  className?: string;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(() => paraTexto(valor));

  // Valor mudou por fora (abrir o formulário, escolher um alimento da tabela,
  // multiplicar pela quantidade): o texto acompanha. A comparação é numérica
  // para "1,50" e 1.5 não parecerem diferentes.
  useEffect(() => {
    setTexto((atual) => (paraNumero(atual) === valor ? atual : paraTexto(valor)));
  }, [valor]);

  function digitou(bruto: string) {
    // Dígitos e UM separador. Fora isso não entra nada — nem "e", nem sinal,
    // nem a segunda vírgula de quem escorregou.
    let limpo = bruto.replace(/[^\d.,]/g, "").replace(/\./g, ",");
    const primeira = limpo.indexOf(",");
    if (primeira !== -1) {
      limpo =
        limpo.slice(0, primeira + 1) + limpo.slice(primeira + 1).replace(/,/g, "");
    }
    setTexto(limpo);
    aoMudar(limpo === "" || limpo === "," ? 0 : paraNumero(limpo));
  }

  function saiu() {
    const n = texto === "" ? min : Math.max(min, paraNumero(texto));
    const limitado = max !== undefined ? Math.min(max, n) : n;
    const arredondado = Number(limitado.toFixed(casas));
    setTexto(paraTexto(arredondado));
    aoMudar(arredondado);
  }

  return (
    <Input
      id={id}
      className={className}
      placeholder={placeholder}
      type="text"
      // `decimal` e não `numeric`: é o que faz o teclado do celular trazer a
      // vírgula junto com os números.
      inputMode="decimal"
      value={texto}
      onChange={(e) => digitou(e.target.value)}
      onBlur={saiu}
    />
  );
}

function paraNumero(t: string): number {
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function paraTexto(n: number): string {
  return String(n).replace(".", ",");
}
