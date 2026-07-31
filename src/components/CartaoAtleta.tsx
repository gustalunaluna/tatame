import type { CSSProperties, ReactNode } from "react";
import { Faixa } from "@/components/Faixa";
import { Link } from "@tanstack/react-router";
import { SeloDaPessoa } from "@/components/SeloVerificado";
import { cn } from "@/lib/utils";
import type { CartaoPublico } from "@/lib/social-types";

/** Iniciais para quando a pessoa não tem foto */
function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Como uma pessoa aparece para outra: foto, apelido, @ e faixa.
 * É o único formato em que dados de terceiros circulam no app.
 */
export function CartaoAtleta({
  atleta,
  detalhe,
  acao,
  i = 0,
  className,
}: {
  atleta: Pick<CartaoPublico, "nickname" | "handle" | "belt" | "degrees"> & {
    photoUrl?: string;
    gym?: string;
    verificado?: boolean;
    equipeOficial?: boolean;
  };
  detalhe?: ReactNode;
  acao?: ReactNode;
  i?: number;
  className?: string;
}) {
  return (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className={cn(
        "rise-in list-perf flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3",
        className,
      )}
    >
      {atleta.photoUrl ? (
        <img
          src={atleta.photoUrl}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-xl border border-border/60 object-cover"
        />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border/60 bg-secondary text-sm font-black text-muted-foreground">
          {iniciais(atleta.nickname) || "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* O nome leva ao perfil da pessoa. Só quando ela tem @ — sem @ não
            existe perfil público para abrir. */}
        {atleta.handle ? (
          <Link
            to="/atleta/$handle"
            params={{ handle: atleta.handle }}
            className="tap block active:scale-[0.98]"
          >
            <p className="flex items-center gap-1 text-sm font-bold">
              <span className="truncate">{atleta.nickname}</span>
              <SeloDaPessoa
                verificado={atleta.verificado}
                equipeOficial={atleta.equipeOficial}
                className="h-4 w-4"
              />
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              @{atleta.handle}
              {atleta.gym ? ` · ${atleta.gym}` : ""}
            </p>
          </Link>
        ) : (
          <p className="truncate text-sm font-bold">{atleta.nickname}</p>
        )}
        <Faixa
          belt={atleta.belt}
          degrees={atleta.degrees}
          compacta
          comTexto={false}
          className="mt-1.5"
        />
        {detalhe}
      </div>

      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}
