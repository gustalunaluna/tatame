import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    // autoCodeSplitting: cada rota vira um pedaço próprio, carregado quando a
    // pessoa chega nela. Sem isso, abrir o Início baixaria a tela de Conquistas.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
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
