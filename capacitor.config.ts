import type { CapacitorConfig } from "@capacitor/cli";

/**
 * O Ponteira nas lojas.
 *
 * A PWA não entra na App Store: a Apple exige um binário nativo (diretriz
 * 4.2 — "minimum functionality"), e um atalho para um site não conta. O
 * Capacitor resolve isso empacotando o MESMO `dist/` que a Vercel publica
 * dentro de uma casca nativa. Não há segunda base de código, e o app da loja
 * e o da web nunca divergem.
 *
 * O Google Play aceitaria uma TWA (Bubblewrap), que é mais leve — mas seriam
 * dois empacotamentos diferentes para manter. Um só, nos dois lugares, custa
 * menos do que a economia de peso vale.
 */
const config: CapacitorConfig = {
  /**
   * Identificador do app nas duas lojas. Depois da primeira publicação ele é
   * IMUTÁVEL: mudar significa um app novo, sem os usuários nem as avaliações
   * do anterior. Confira antes de submeter.
   */
  appId: "app.ponteira.diario",
  appName: "Ponteira",

  /**
   * O build da web, sem intermediário. `npm run build` gera aqui, e
   * `npx cap sync` copia para dentro dos dois projetos nativos.
   */
  webDir: "dist",

  /**
   * Conteúdo empacotado, NÃO uma janela apontada para o site.
   *
   * Existe a opção `server.url` de carregar a versão publicada ao vivo — é
   * tentador, porque publicaria correção sem passar pela revisão da loja. É
   * também o motivo nº 1 de reprovação por "minimum functionality": o revisor
   * abre um app que é um navegador disfarçado. E quebraria o offline, que hoje
   * funciona. Fica empacotado.
   */
  android: {
    // O app já é escuro por decisão de projeto; o fundo do WebView precisa
    // combinar, senão pisca branco entre a splash e a primeira pintura.
    backgroundColor: "#1c1c20",
  },
  ios: {
    backgroundColor: "#1c1c20",
    // Sem "borracha" no fim da rolagem: dentro de um app nativo o efeito
    // denuncia o WebView e não combina com nenhuma das telas.
    scrollEnabled: true,
    contentInset: "never",
  },

  plugins: {
    SplashScreen: {
      // A splash sai quando o app manda, não por cronômetro: quem decide é o
      // primeiro render de verdade (ver src/lib/nativo.ts).
      launchAutoHide: false,
      backgroundColor: "#1c1c20",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1c1c20",
    },
  },
};

export default config;
