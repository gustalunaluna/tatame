import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { SeloDaPessoa } from "@/components/SeloVerificado";
import type { Faixa } from "@/lib/bjj-types";
import { FotoDoAtleta } from "@/components/FotoDoAtleta";

export interface AtletaNaLista {
  userId: string;
  handle: string;
  nickname: string;
  belt: Faixa;
  degrees: number;
  photoUrl?: string;
  verificado?: boolean;
  equipeOficial?: boolean;
  role?: string;
}

/** Linha de atleta em qualquer lista — sempre leva ao perfil dele. */
export function LinhaDeAtleta({
  a,
  i = 0,
  detalhe,
}: {
  a: AtletaNaLista;
  i?: number;
  detalhe?: string;
}) {
  return (
    <Link
      to="/atleta/$handle"
      params={{ handle: a.handle }}
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className="rise-in list-perf tap flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3 active:scale-[0.99]"
    >
      <FotoDoAtleta
        url={a.photoUrl}
        nome={a.nickname}
        semente={a.handle}
        belt={a.belt}
        degrees={a.degrees}
        className="h-11 w-11 rounded-xl border border-border/60"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-bold">
          <span className="truncate">{a.nickname}</span>
          <SeloDaPessoa
            verificado={a.verificado}
            equipeOficial={a.equipeOficial}
            className="h-3.5 w-3.5"
          />
        </p>
        <p className="truncate text-xs text-muted-foreground">
          @{a.handle}
          {detalhe && <span className="text-primary"> · {detalhe}</span>}
        </p>
        <FaixaVisual
          belt={a.belt}
          degrees={a.degrees}
          compacta
          comTexto={false}
          className="mt-1.5"
        />
      </div>
    </Link>
  );
}

/**
 * Amostra para caber num cartão de perfil. Acima do limite, mostra o resto
 * como "+N" em vez de despejar cem pessoas na tela.
 */
export function AmostraDeAtletas({
  atletas,
  total,
  limite = 8,
}: {
  atletas: AtletaNaLista[];
  total: number;
  limite?: number;
}) {
  const mostrados = atletas.slice(0, limite);
  const resto = total - mostrados.length;

  return (
    <div className="flex flex-wrap gap-2">
      {mostrados.map((a) => (
        <Link
          key={a.userId}
          to="/atleta/$handle"
          params={{ handle: a.handle }}
          className="tap flex items-center gap-1.5 rounded-xl border border-border/50 bg-secondary/40 px-2.5 py-1.5 active:scale-95"
        >
          <span className="text-xs font-semibold">{a.nickname}</span>
          <SeloDaPessoa
            verificado={a.verificado}
            equipeOficial={a.equipeOficial}
            className="h-3 w-3"
          />
          <FaixaVisual
            belt={a.belt}
            degrees={a.degrees}
            compacta
            comTexto={false}
          />
        </Link>
      ))}
      {resto > 0 && (
        <span className="self-center rounded-xl bg-primary/15 px-2.5 py-1.5 text-xs font-bold text-primary">
          +{resto}
        </span>
      )}
    </div>
  );
}
