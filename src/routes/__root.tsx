import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";

function NotFoundComponent() {
  return (
    <div className="topo-seguro lados-seguros flex min-h-dvh items-center justify-center bg-background pb-[calc(1.5rem+var(--safe-b))]">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa rota não existe no tatame. Volta pra guarda.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

/**
 * Cada tela é carregada sob demanda. Depois de uma nova publicação, um
 * navegador com o HTML antigo em cache pede um arquivo que não existe mais e
 * a tela quebra. Nesse caso vale recarregar uma vez — não é erro do app.
 */
function ehChunkVelho(e: Error) {
  const t = `${e?.name} ${e?.message}`.toLowerCase();
  return (
    t.includes("dynamically imported module") ||
    t.includes("failed to fetch") ||
    t.includes("importing a module script failed") ||
    t.includes("chunkloaderror") ||
    t.includes("error loading")
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const desatualizado = ehChunkVelho(error);

  // Recarrega sozinho uma única vez (a trava evita laço de recarregamento)
  useEffect(() => {
    if (!desatualizado) return;
    const chave = "tatame:recarregou";
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, "1");
    window.location.reload();
  }, [desatualizado]);

  return (
    <div className="topo-seguro lados-seguros flex min-h-dvh items-center justify-center bg-background pb-[calc(1.5rem+var(--safe-b))]">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">
          {desatualizado ? "Atualizando o app…" : "Algo travou"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {desatualizado
            ? "Saiu uma versão nova. Recarregando — se não voltar sozinho, toque em Recarregar."
            : "Respira, ajusta a pegada e tenta de novo."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              if (desatualizado) {
                window.location.reload();
                return;
              }
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {desatualizado ? "Recarregar" : "Tentar de novo"}
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Tatame — Diário de BJJ" },
      {
        name: "description",
        content:
          "Aplicativo pessoal de Jiu-Jitsu: diário de treino, biblioteca de técnicas, plano de 8 semanas e metas.",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <Outlet />
      <BottomNav />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
