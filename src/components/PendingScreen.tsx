/**
 * Mostrado só quando a troca de tela passa de ~120ms. Repete a silhueta do
 * app (cabeçalho + cards) para a transição parecer contínua, em vez de um
 * giro genérico no meio da tela.
 */
export function PendingScreen() {
  return (
    <div
      className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando…</span>

      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-card" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-card/70" />
      </div>

      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-border/50 bg-card/60"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
