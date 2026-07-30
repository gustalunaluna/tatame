import { cn } from "@/lib/utils";
import { useGrow } from "@/lib/motion";

/**
 * Barra de progresso fina. Cresce na montagem via `translate` — anima no
 * compositor, sem tocar no layout, e o raio da borda não distorce (o trilho
 * recorta). Com prefers-reduced-motion o valor é aplicado direto.
 */
export function Bar({
  value,
  className,
  fillClassName,
  label,
}: {
  /** 0 a 100 */
  value: number;
  className?: string;
  fillClassName?: string;
  /** Descrição para leitores de tela; omita em barras puramente decorativas */
  label?: string;
}) {
  const alvo = Math.max(0, Math.min(100, value));
  const atual = useGrow(alvo);

  return (
    <div
      role={label ? "progressbar" : "presentation"}
      aria-label={label}
      aria-valuenow={label ? Math.round(alvo) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("bar-fill h-full w-full rounded-full bg-primary", fillClassName)}
        style={{ transform: `translateX(-${100 - atual}%)` }}
      />
    </div>
  );
}
