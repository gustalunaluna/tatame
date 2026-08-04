import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/** Roda dentro da casca nativa (loja) e não numa aba do navegador? */
export function ehNativo() {
  return Capacitor.isNativePlatform();
}

/**
 * Para onde os e-mails de confirmação e de recuperação devem voltar.
 *
 * Este é o detalhe que faz o app da loja funcionar ou não, e ele não é óbvio.
 *
 * Na web, `window.location.origin` é o site — e o link do e-mail abre a aba
 * certa. Dentro do Capacitor, `origin` é `capacitor://localhost` (iOS) ou
 * `http://localhost` (Android): endereços que só existem DENTRO do app. Um
 * link desses no corpo de um e-mail não abre em lugar nenhum — o cliente de
 * e-mail não sabe o que fazer com ele, e a pessoa fica com uma conta que não
 * confirma e uma senha que não troca.
 *
 * A saída é o esquema próprio do app, registrado nos dois projetos nativos.
 * O sistema operacional reconhece `app.ponteira.diario://` como "isto é
 * daquele aplicativo" e entrega o link para cá, onde `ouvirLinks()` embaixo
 * termina o serviço.
 *
 * ATENÇÃO: os dois endereços precisam estar na lista de Redirect URLs do
 * Supabase (Authentication › URL Configuration). O que não está na lista é
 * silenciosamente trocado pela Site URL, e o link volta para a web.
 */
export const ESQUEMA_NATIVO = "app.ponteira.diario";

export function baseDeRedirecionamento() {
  return ehNativo() ? `${ESQUEMA_NATIVO}://` : `${window.location.origin}/`;
}

/**
 * Recebe os links que o sistema entrega ao app.
 *
 * O Supabase manda a pessoa para um endereço do próprio Supabase, que valida o
 * token e só então redireciona para o `redirectTo` — carregando `access_token`
 * e `refresh_token` no fragmento. Na web o supabase-js lê esse fragmento
 * sozinho, porque ele está na barra de endereços. Aqui não há barra de
 * endereços: o link chega por evento, e a sessão precisa ser montada à mão.
 */
async function ouvirLinks() {
  const { App } = await import("@capacitor/app");

  App.addListener("appUrlOpen", async ({ url }) => {
    const fragmento = url.split("#")[1];
    if (!fragmento) return;

    const p = new URLSearchParams(fragmento);
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token || !refresh_token) return;

    await supabase.auth.setSession({ access_token, refresh_token });

    // `type=recovery` é o link de "esqueci a senha": a pessoa precisa cair na
    // tela de trocar a senha, não na home. Os demais (confirmação de cadastro)
    // já entraram — a home é o lugar certo.
    const destino = p.get("type") === "recovery" ? "/nova-senha" : "/";
    window.location.replace(destino);
  });
}

/**
 * Ajustes que só existem dentro do app da loja.
 *
 * Nada aqui roda na web: cada import é dinâmico e fica atrás do
 * `ehNativo()`, para que o peso dos plugins não entre no caminho crítico de
 * quem abre o site. O orçamento de 220 kB não sabe de lojas.
 */
export async function iniciarNativo() {
  if (!ehNativo()) return;

  await ouvirLinks();

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);

  // O app é escuro sempre. Sem isto o texto da barra de status sai preto sobre
  // o fundo preto no Android.
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  // A splash sai agora, e não por cronômetro: este ponto do código só é
  // alcançado depois que o React montou. Com `launchAutoHide` ligado, a splash
  // sumia antes da primeira pintura e aparecia um quadro vazio no meio.
  await SplashScreen.hide().catch(() => {});
}
