import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  /**
   * A data do build, para a tela de Configurações mostrar.
   *
   * Não é enfeite: é a primeira pergunta de qualquer suporte — "qual versão
   * você está usando?" — e, com as lojas no meio, a resposta deixa de ser
   * óbvia. O aparelho pode estar com um APK de três semanas atrás enquanto a
   * web já rodou dez publicações.
   */
  define: {
    __VERSAO__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    // autoCodeSplitting: cada rota vira um pedaço próprio, carregado quando a
    // pessoa chega nela. Sem isso, abrir o Início baixaria a tela de Conquistas.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),

    /**
     * O app é usado dentro de academia, que é justamente onde o sinal morre:
     * subsolo, parede de bloco, celular no fundo da mochila. Sem service worker
     * o Ponteira não abria nessas condições — e "registre seu treino" é uma
     * promessa que se cumpre no vestiário, não em casa.
     */
    VitePWA({
      // O app se atualiza sozinho na próxima abertura. Um diário de treino não
      // tem sessão longa o bastante para justificar perguntar "deseja
      // atualizar?" no meio do uso.
      registerType: "autoUpdate",
      injectRegister: "auto",

      // public/manifest.webmanifest já existe, está ligado no index.html e tem
      // os três ícones. Deixar o plugin gerar outro criaria dois manifestos
      // disputando a instalação.
      manifest: false,

      workbox: {
        // Sem isto, abrir /diario offline devolve 404: não há servidor para
        // responder, e as rotas são todas do cliente.
        navigateFallback: "/index.html",

        /**
         * Só o esqueleto entra no precache: o HTML, o CSS, o pedaço do app e o
         * das dependências. Os 57 pedaços de rota ficam de fora.
         *
         * A primeira versão levava `**\/*.js` e precarregava os 60 arquivos de
         * uma vez — 1 MB em rajada no primeiro acesso, justamente no wi-fi de
         * academia que motivou tudo isto. E, quando a pessoa navegava antes de
         * a rajada terminar, as requisições em voo eram abortadas: no navegador
         * isso é só ruído no console, mas era ruído suficiente para derrubar
         * quatro suítes que conferem "nenhum erro de página".
         *
         * As rotas entram no cache conforme são visitadas, pela regra de
         * `assets` mais abaixo. Quem abriu uma tela uma vez a tem offline.
         */
        globPatterns: [
          "index.html",
          "assets/index-*.css",
          "assets/index-*.js",
          "assets/deps-*.js",
          "manifest.webmanifest",
          "icon-*.png",
          "favicon.ico",
        ],

        runtimeCaching: [
          {
            /**
             * Autenticação nunca entra em cache. Guardar resposta de /auth/v1/
             * no CacheStorage deixaria o token de sessão legível em disco e
             * faria o app "abrir logado" com credencial já vencida.
             *
             * Esta regra vem ANTES da leitura de dados de propósito: o Workbox
             * usa a primeira que casar, e /auth/v1/ não pode escorregar para a
             * regra de baixo.
             */
            urlPattern: ({ url }) => url.pathname.startsWith("/auth/v1/"),
            handler: "NetworkOnly",
          },
          {
            /**
             * Leitura de dados: tenta a rede e cai no cache quando ela não
             * responde em 3s. É isto que faz o histórico de treino aparecer
             * offline em vez de uma tela vazia.
             *
             * Só GET. Gravação offline exigiria fila com reenvio, que é outro
             * problema — hoje o app avisa o erro em vez de fingir que salvou.
             */
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith("/rest/v1/") && request.method === "GET",
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-leitura",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            /**
             * Os pedaços de rota, guardados conforme são visitados.
             *
             * O nome do arquivo carrega o hash do conteúdo, então a versão em
             * cache nunca fica velha: um build novo gera um nome novo. Por isso
             * serve do cache primeiro e revalida atrás, sem risco de servir
             * código antigo.
             */
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "rotas",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],

  build: {
    // Um PWA instalado no celular não precisa de transpile para navegador
    // velho: es2022 deixa o código moderno passar direto, sem inchar.
    target: "es2022",

    rollupOptions: {
      output: {
        /**
         * Separa o que quase nunca muda (as dependências) do que muda toda
         * semana (o app).
         *
         * O ganho não é no primeiro acesso — é do segundo em diante. Quando eu
         * publico uma correção de tela, o navegador rebaixa só o pedaço do app
         * e reaproveita React, roteador e Supabase do cache. Antes, qualquer
         * mudança invalidava os 640 kB inteiros.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // SÓ o que o app precisa antes de pintar a primeira tela entra aqui.
          //
          // A tentação é mandar todo o node_modules para um pedaço "vendor" —
          // e foi o que fiz primeiro. O caminho crítico subiu de 195 para
          // 235 kB gzip, porque isso ARRASTA para o pedaço eager dependências
          // que o Rollup tinha colocado, com razão, dentro das rotas
          // preguiçosas. Deixar o resto sem regra é o que mantém cada
          // dependência no pedaço de quem realmente a usa.
          const noCaminhoCritico =
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("@tanstack") ||
            id.includes("@supabase");

          if (noCaminhoCritico) return "deps";
          // sem retorno: o Rollup decide, e normalmente decide certo
        },
      },
    },

    // O aviso padrão dispara em 500 kB e virou ruído. O que interessa medir é
    // o gzip do caminho crítico — quem cuida disso é `npm run orcamento`.
    chunkSizeWarningLimit: 700,
  },
});
