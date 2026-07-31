import { Faixa as FaixaVisual } from "@/components/Faixa";
import { Icone } from "@/design/icones";
import { acentoDaFaixa } from "@/lib/faixa-cores";
import { FAIXAS, type Faixa } from "@/lib/bjj-types";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/**
 * De onde você está para onde você quer chegar — as duas faixas lado a lado,
 * como nos cartazes de graduação que toda academia pendura.
 *
 * Serve tanto para trocar de cor ("Branca à Azul") quanto para ganhar um grau
 * na mesma ("Branca 2 graus à Branca 3 graus"), que é a maior parte da vida de
 * quem treina — e era justamente o caso que o app não sabia mostrar.
 */

/** Ordem oficial. Usada para dizer o que é avanço e o que é retrocesso. */
const ORDEM: Faixa[] = [...FAIXAS];

export function comparar(
  de: { belt: Faixa; degrees: number },
  para: { belt: Faixa; degrees: number },
): "avanca" | "igual" | "volta" {
  const a = ORDEM.indexOf(de.belt) * 10 + Math.min(de.degrees, 9);
  const b = ORDEM.indexOf(para.belt) * 10 + Math.min(para.degrees, 9);
  return b > a ? "avanca" : b === a ? "igual" : "volta";
}

/** "Branca · 2 graus" — o jeito como se fala no tatame. */
export function nomeDaFaixa(belt: Faixa, degrees: number): string {
  return degrees > 0
    ? `${belt} · ${degrees} grau${degrees > 1 ? "s" : ""}`
    : belt;
}

/** "Branca à Azul" / "Branca 2 graus à Branca 3 graus" */
export function tituloDaRota(
  de: { belt: Faixa; degrees: number },
  para: { belt: Faixa; degrees: number },
): string {
  const curto = (f: Faixa, g: number) =>
    g > 0 ? `${f} ${g} grau${g > 1 ? "s" : ""}` : f;
  return `${curto(de.belt, de.degrees)} à ${curto(para.belt, para.degrees)}`;
}

export function RotaDeGraduacao({
  de,
  para,
  brasao,
  compacta = false,
  comTitulo = true,
  className,
}: {
  de: { belt: Faixa; degrees: number };
  para: { belt: Faixa; degrees: number };
  /** Brasão da academia, no meio — como nos cartazes. Sem ele, entra a seta. */
  brasao?: string;
  compacta?: boolean;
  comTitulo?: boolean;
  className?: string;
}) {
  const titulo = tituloDaRota(de, para);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex w-full items-center gap-2"
        role="img"
        aria-label={`De ${nomeDaFaixa(de.belt, de.degrees)} para ${nomeDaFaixa(para.belt, para.degrees)}`}
      >
        {/* A faixa de agora, espelhada: a ponteira aponta para o meio, como
            nos cartazes em que as duas faixas se encontram no brasão. */}
        <div className="min-w-0 flex-1 -scale-x-100">
          <FaixaVisual
            belt={de.belt}
            degrees={de.degrees}
            compacta={compacta}
            comTexto={false}
            cheia
          />
        </div>

        {brasao ? (
          <img
            src={brasao}
            alt=""
            loading="lazy"
            className={cn(
              "shrink-0 rounded-full object-contain",
              compacta ? "h-8 w-8" : "h-11 w-11",
            )}
          />
        ) : (
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-full border border-border/60 bg-card",
              compacta ? "h-6 w-6" : "h-8 w-8",
            )}
            style={{ color: acentoDaFaixa(para.belt) } as CSSProperties}
          >
            <Icone.avancar className={compacta ? "h-3 w-3" : "h-4 w-4"} />
          </span>
        )}

        {/* A faixa-alvo, na posição normal. */}
        <div className="min-w-0 flex-1">
          <FaixaVisual
            belt={para.belt}
            degrees={para.degrees}
            compacta={compacta}
            comTexto={false}
            cheia
          />
        </div>
      </div>

      {comTitulo && (
        <p
          className={cn(
            "mt-2 text-center font-black",
            compacta ? "text-xs" : "text-sm",
          )}
        >
          {titulo}
        </p>
      )}
    </div>
  );
}
