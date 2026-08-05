import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { cn } from "@/lib/utils";

/**
 * As peças de uma tela de configuração.
 *
 * Uma tela de ajustes é uma lista de coisas sem relação nenhuma entre si —
 * senha, cor, meta semanal, exclusão de conta. O que impede isso de virar um
 * amontoado é o agrupamento: título de grupo em caixa alta, itens dentro de um
 * cartão só, e uma linha separando um do outro. É o padrão que iOS e Android
 * usam há quinze anos, e é padrão porque funciona — a pessoa varre os títulos,
 * não os itens.
 */
export function GrupoDeAjustes({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </h2>
      {descricao ? (
        <p className="mt-1 px-1 text-xs leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      ) : null}
      <div className="mt-2 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
        {children}
      </div>
    </section>
  );
}

/**
 * Uma linha que leva a outro lugar, ou que dispara algo.
 *
 * `valor` é o estado atual mostrado à direita — "Gustavo", "A da sua faixa",
 * "3 por semana". É ele que faz a tela de ajustes ser lida sem abrir item por
 * item: quem procura o que está errado enxerga na varredura.
 */
export function LinhaDeAjuste({
  rotulo,
  valor,
  para,
  aoTocar,
  icone,
  perigo = false,
}: {
  rotulo: string;
  valor?: string;
  para?: string;
  aoTocar?: () => void;
  icone?: ReactNode;
  /** Vermelho e sem seta: o que não tem volta não se parece com o resto. */
  perigo?: boolean;
}) {
  const conteudo = (
    <>
      {icone ? (
        <span className={cn("shrink-0", perigo ? "text-destructive" : "text-primary")}>
          {icone}
        </span>
      ) : null}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-semibold",
          perigo && "text-destructive",
        )}
      >
        {rotulo}
      </span>
      {valor ? (
        <span className="shrink-0 max-w-[45%] truncate text-sm text-muted-foreground">
          {valor}
        </span>
      ) : null}
      {!perigo && (para || aoTocar) ? (
        <Icone.avancar className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );

  const classe =
    "tap flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/50";

  if (para) {
    return (
      <Link to={para} className={classe}>
        {conteudo}
      </Link>
    );
  }
  if (aoTocar) {
    return (
      <button type="button" onClick={aoTocar} className={classe}>
        {conteudo}
      </button>
    );
  }
  return <div className={cn(classe, "active:bg-transparent")}>{conteudo}</div>;
}
