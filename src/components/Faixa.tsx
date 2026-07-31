import { cn } from "@/lib/utils";
import type { Faixa as TipoFaixa } from "@/lib/bjj-types";
import { tecidoDaFaixa } from "@/lib/faixa-cores";

/**
 * Representação visual da faixa: a cor, a ponteira preta e os graus.
 * `compacta` reduz para caber em cartões-resumo.
 */
export function Faixa({
  belt,
  degrees,
  compacta = false,
  comTexto = true,
  className,
}: {
  belt: TipoFaixa;
  degrees: number;
  compacta?: boolean;
  comTexto?: boolean;
  className?: string;
}) {
  const graus = Math.max(0, Math.min(4, degrees));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-sm border border-white/15",
          compacta ? "h-3.5 w-20" : "h-5 w-28",
        )}
        role="img"
        aria-label={`Faixa ${belt}${graus ? ` com ${graus} grau${graus > 1 ? "s" : ""}` : ""}`}
      >
        {/* O tecido vem da mesma paleta que o acento do app — uma fonte só.
            A coral é a única com duas cores, então continua sendo degradê. */}
        {belt === "Coral" ? (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(90deg, ${tecidoDaFaixa("Coral")} 0%, ${tecidoDaFaixa("Preta")} 100%)`,
            }}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: tecidoDaFaixa(belt) }}
          />
        )}
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full items-center bg-neutral-900",
            compacta ? "w-8 gap-[2px] px-[3px]" : "w-11 gap-[3px] px-1",
          )}
        >
          {Array.from({ length: graus }, (_, i) => (
            <span
              key={i}
              className={cn("h-full bg-white", compacta ? "w-[3px]" : "w-1")}
            />
          ))}
        </div>
      </div>
      {comTexto && (
        <span className={cn("font-bold", compacta ? "text-[11px]" : "text-xs")}>
          {belt}
          {graus > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {graus} grau{graus > 1 ? "s" : ""}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
