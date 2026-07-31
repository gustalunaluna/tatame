import { Link } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Caixa do perfil no estilo Steam: um título com contagem à direita, o
 * conteúdo em miniatura, e a caixa inteira leva para a lista completa.
 * É o padrão que faz o perfil ser um índice do resto do app em vez de
 * mais uma tela solta.
 */
export function CaixaDoPerfil({
  titulo,
  contagem,
  icone,
  para,
  aoTocar,
  vazio,
  children,
  verTodos,
  i = 0,
}: {
  titulo: string;
  contagem?: string;
  icone: ReactNode;
  /** rota para abrir ao tocar; use `aoTocar` quando não for navegação */
  para?: string;
  aoTocar?: () => void;
  /**
   * Link de rodapé, para quando o conteúdo da caixa já tem links dentro.
   * Envolver tudo num link nesse caso gera âncora dentro de âncora — HTML
   * inválido, que o navegador desfaz e faz o toque cair no lugar errado.
   */
  verTodos?: { para: string; rotulo: string };
  /** texto mostrado quando não há nada dentro */
  vazio?: string;
  children?: ReactNode;
  i?: number;
}) {
  const temConteudo = Boolean(children);

  const cabecalho = (
    <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
      <span className="text-primary">{icone}</span>
      <h2 className="min-w-0 flex-1 truncate text-sm font-bold">{titulo}</h2>
      {contagem && (
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {contagem}
        </span>
      )}
      {(para || aoTocar) && (
        <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );

  const corpo = (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className={cn(
        "rise-in list-perf overflow-hidden rounded-2xl border border-border/60 bg-card/60",
        (para || aoTocar) && "tap active:scale-[0.99]",
      )}
    >
      {cabecalho}
      <div className="p-4">
        {temConteudo ? (
          children
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {vazio ?? "Nada por aqui ainda."}
          </p>
        )}
        {verTodos && (
          <Link
            to={verTodos.para}
            className="tap mt-3 flex items-center justify-center gap-1 rounded-xl border border-primary/40 bg-primary/5 py-2 text-xs font-bold text-primary active:scale-[0.98]"
          >
            {verTodos.rotulo}
            <Icone.avancar className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );

  if (para) {
    return (
      <Link to={para} className="block">
        {corpo}
      </Link>
    );
  }
  if (aoTocar) {
    return (
      <button type="button" onClick={aoTocar} className="block w-full text-left">
        {corpo}
      </button>
    );
  }
  return corpo;
}
