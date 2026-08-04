import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    /**
     * `<main>`, e não `<div>`.
     *
     * Nenhuma das 23 telas autenticadas tinha marco de conteúdo principal —
     * só a de entrada. Leitor de tela oferece "pular para o principal" a
     * partir desse marco; sem ele, a única forma de chegar ao conteúdo é
     * percorrer tudo desde o começo, em toda navegação.
     *
     * É uma palavra de diferença, e vale para o app inteiro porque todas as
     * telas passam por aqui.
     */
    <main className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5">
      {/* `items-start`, e não `items-center`: com o título em duas linhas o
          botão de ação subia junto e ficava desalinhado do começo do texto. */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          {/**
           * `text-balance` no lugar de `truncate`.
           *
           * Truncar era a escolha errada para o título de uma página: num
           * aparelho de 360px, "Mestres e linhagem" e "Minhas graduações"
           * chegavam perto do limite, e qualquer título mais longo virava
           * reticências — o nome da tela em que a pessoa está é a última coisa
           * que se deve esconder. Deixar quebrar em duas linhas equilibradas
           * custa altura e não custa informação.
           */}
          <h1 className="text-balance text-2xl font-black leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-pretty text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </main>
  );
}
