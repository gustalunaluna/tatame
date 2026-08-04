import type { ReactNode } from "react";

/**
 * A tipografia das duas páginas legais.
 *
 * Texto jurídico é lido por obrigação, quase sempre no celular e quase sempre
 * com pressa. As três escolhas aqui vêm daí: medida curta (`max-w`), entrelinha
 * folgada e seções numeradas — dá para achar "como apago minha conta" sem ler
 * o resto. O corpo fica em 15px, acima do piso de 12px do resto do app, porque
 * aqui ninguém está escaneando números: está lendo prosa.
 */
export function SecaoLegal({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-foreground">
        <span className="text-muted-foreground">{numero}.</span> {titulo}
      </h2>
      <div className="mt-2 space-y-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

/** Lista de itens dentro de uma seção — usada para os inventários de dados. */
export function ListaLegal({ itens }: { itens: ReactNode[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {itens.map((item, i) => (
        <li key={i} className="list-disc marker:text-border">
          {item}
        </li>
      ))}
    </ul>
  );
}
