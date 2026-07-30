import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PendingScreen } from "./components/PendingScreen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Os dados de treino não mudam a cada segundo. Sem isto, toda troca de
        // aba refazia todas as consultas ao banco — era esse o atraso.
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Baixa o código da tela assim que o dedo encosta no ícone, antes do toque
    // completar. Quando a navegação acontece, o arquivo já está em memória.
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 60_000,
    // Se ainda assim demorar, mostra um esqueleto em vez de tela parada
    defaultPendingComponent: PendingScreen,
    defaultPendingMs: 120,
    defaultPendingMinMs: 200,
  });

  return router;
};
