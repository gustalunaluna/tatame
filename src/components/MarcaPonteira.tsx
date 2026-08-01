import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { tecidoDaFaixa } from "@/lib/faixa-cores";
import type { Faixa } from "@/lib/bjj-types";

/**
 * A marca: uma faixa atravessando, com a ponteira preta e os graus.
 *
 * É o mesmo desenho do ícone do app, em SVG inline para poder animar e para
 * acompanhar o tamanho do texto sem virar imagem borrada. Serve na tela de
 * entrada, na splash e em qualquer lugar que precise dizer "isto é o Ponteira"
 * sem escrever o nome.
 */
export function MarcaPonteira({
  graus = 4,
  animada = true,
  className,
}: {
  /** Quantos graus desenhar na ponteira. */
  graus?: number;
  animada?: boolean;
  className?: string;
}) {
  const quantos = Math.max(0, Math.min(4, graus));

  return (
    <svg
      viewBox="0 0 320 96"
      role="img"
      aria-label="Ponteira"
      className={cn("h-auto w-full", className)}
    >
      {/* o tecido */}
      <rect x="0" y="18" width="320" height="60" rx="3" fill="var(--marca-tecido)" />
      {/* costura, que é o que faz ler como pano e não como barra */}
      <rect x="0" y="26" width="176" height="2" fill="var(--marca-costura)" opacity="0.14" />
      <rect x="0" y="68" width="176" height="2" fill="var(--marca-costura)" opacity="0.14" />

      {/* a ponteira.
          O contorno não é enfeite: a ponteira é quase preta e o app inteiro é
          escuro. Sem a linha, ela some no fundo e a marca vira só um retângulo
          bege cortado no meio. */}
      <rect
        x="176.5"
        y="18.5"
        width="143"
        height="59"
        rx="3"
        fill="var(--marca-ponteira)"
        stroke="var(--marca-contorno)"
      />

      {/* os graus, entrando um a um */}
      <g fill="var(--marca-grau)">
        {Array.from({ length: quantos }, (_, i) => (
          <rect
            key={i}
            x={196 + i * 30}
            y={30}
            width={14}
            height={36}
            rx={2}
            className={animada ? "grau-entra" : undefined}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * A escada de faixas em uma linha só — branca, azul, roxa, marrom, preta.
 *
 * É o resumo visual do esporte inteiro: todo praticante lê essa sequência sem
 * legenda, e ela diz o que o app faz melhor do que qualquer frase. As cores
 * saem dos mesmos tokens que pintam o app.
 */
export function EscadaDeFaixas({
  className,
  animada = true,
}: {
  className?: string;
  animada?: boolean;
}) {
  const faixas: Faixa[] = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];

  return (
    <div
      className={cn(
        // A borda existe pela ponta preta: sem ela, o último trecho encosta no
        // fundo escuro e a escada parece ter quatro faixas.
        "flex h-1.5 w-full overflow-hidden rounded-full ring-1 ring-border",
        className,
      )}
      role="img"
      aria-label="Da faixa branca à preta"
    >
      {faixas.map((f, i) => (
        <span
          key={f}
          className={cn("h-full flex-1", animada && "escada-entra")}
          style={
            {
              // Aqui é o TECIDO, não o acento. O acento da preta é vermelho —
              // preto não serve de cor de destaque num app escuro —, e uma
              // escada que termina em vermelho não é a graduação de ninguém.
              background: tecidoDaFaixa(f),
              "--i": i,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
