import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Campo de número que aceita ficar VAZIO.
 *
 * ------------------------------------------------------------------
 * O BUG QUE ISTO CONSERTA
 * ------------------------------------------------------------------
 * Os cinco campos numéricos do app faziam assim:
 *
 *     value={durationMin}                       // é number
 *     onChange={(e) => setDuration(+e.target.value)}
 *
 * E aí, apagando o conteúdo, `e.target.value` vira `""`. O detalhe é que
 * `+""` é **0**, não `NaN` — então o estado virava zero e o campo repintava
 * com "0" no lugar onde a pessoa tinha acabado de apagar tudo.
 *
 * O resultado é o que dá para ver digitando: o zero fica lá, o número novo
 * entra depois dele, e a tela mostra **0120** em vez de 120. O valor salvo até
 * saía certo, porque `+"0120"` é 120 — o estrago era em confiança, não em
 * dado. Ninguém digita achando que ficou 120 quando está escrito 0120.
 *
 * A raiz é uma só: **um `number` não sabe dizer "vazio".** Zero e vazio são
 * estados diferentes para quem está digitando e viram o mesmo valor em
 * JavaScript.
 *
 * ------------------------------------------------------------------
 * A SOLUÇÃO
 * ------------------------------------------------------------------
 * Por dentro, o campo guarda TEXTO — que sabe ser vazio. Por fora, continua
 * entregando `number`, que é o que o formulário e o banco esperam. Quem chama
 * não muda de contrato.
 *
 * Enquanto a pessoa digita, campo vazio é campo vazio, e o valor reportado é
 * `0`. Ao sair do campo, o texto é normalizado: vazio vira o mínimo, e zeros à
 * esquerda somem. Normalizar só no blur é de propósito — corrigir durante a
 * digitação briga com o cursor e é pior que o bug original.
 */
export function CampoNumero({
  valor,
  aoMudar,
  min = 0,
  max,
  id,
  className,
}: {
  valor: number;
  aoMudar: (n: number) => void;
  min?: number;
  max?: number;
  id?: string;
  className?: string;
}) {
  const [texto, setTexto] = useState(String(valor));

  /**
   * Quando o valor muda POR FORA — abrir o formulário em modo edição, um
   * reset — o texto acompanha. A comparação é numérica de propósito: sem ela,
   * "07" e 7 pareceriam diferentes e o campo se reescreveria embaixo do dedo
   * de quem está digitando.
   */
  useEffect(() => {
    setTexto((atual) => (Number(atual) === valor ? atual : String(valor)));
  }, [valor]);

  function digitou(bruto: string) {
    // Só dígito. Isso resolve de uma vez o "e", o "+" e o "-" que o
    // type="number" aceita e que ninguém quer num campo de minutos.
    const limpo = bruto.replace(/\D/g, "");
    setTexto(limpo);
    aoMudar(limpo === "" ? 0 : Number(limpo));
  }

  function saiu() {
    const n = texto === "" ? min : Math.max(min, Number(texto));
    const final = max !== undefined ? Math.min(max, n) : n;
    setTexto(String(final));
    aoMudar(final);
  }

  return (
    <Input
      id={id}
      className={className}
      /**
       * `text` com `inputMode="numeric"`, e não `type="number"`.
       *
       * O teclado numérico do celular é o mesmo nos dois — quem o convoca é o
       * `inputMode`. O que se perde são as setinhas de incremento (que ninguém
       * usa no telefone) e a roda do mouse alterando o valor sem querer
       * durante a rolagem, que é um segundo bug conhecido do type="number".
       */
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={texto}
      onChange={(e) => digitou(e.target.value)}
      onBlur={saiu}
    />
  );
}
