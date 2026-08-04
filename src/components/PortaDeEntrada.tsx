import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Icone } from "@/design/icones";

/**
 * A moldura das telas que ficam FORA do login.
 *
 * São quatro: entrar, esqueci a senha, nova senha e as páginas legais. Todas
 * precisam existir sem sessão — as duas lojas abrem a política de privacidade
 * sem instalar o app, e quem esqueceu a senha, por definição, não consegue
 * entrar para pedir uma nova.
 *
 * A tela de entrada (`/auth`) não usa esta moldura de propósito: ela é a
 * vitrine, tem faixa, escada de graduação e composição própria. Estas aqui são
 * as salas dos fundos — precisam ser legíveis, não impressionar.
 */
export function PortaDeEntrada({
  titulo,
  descricao,
  voltarPara = "/auth",
  children,
}: {
  titulo: string;
  descricao?: string;
  voltarPara?: string;
  children: ReactNode;
}) {
  return (
    <main className="topo-seguro lados-seguros min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md px-6 pt-6 pb-[calc(3rem+var(--safe-b))]">
        <Link
          to={voltarPara}
          aria-label="Voltar"
          className="tap -ml-2 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Icone.voltar className="size-5" />
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-balance">{titulo}</h1>
        {descricao ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        ) : null}

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
