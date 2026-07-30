"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";
import { useGrow } from "@/lib/motion";

/**
 * A barra cresce de 0 até o valor na montagem — o movimento comunica
 * "isto é progresso", não só "isto é uma barra". Com prefers-reduced-motion
 * o valor é aplicado direto (ver useGrow).
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const alvo = Math.max(0, Math.min(100, value || 0));
  const atual = useGrow(alvo);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={alvo}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/15",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="bar-fill h-full w-full rounded-full bg-primary"
        style={{ transform: `translateX(-${100 - atual}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
