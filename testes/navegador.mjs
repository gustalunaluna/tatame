import { chromium } from "playwright";
import { existsSync } from "node:fs";

/**
 * Abre o Chromium onde quer que ele esteja.
 *
 * Os testes tinham `executablePath: "/opt/pw-browsers/chromium"` escrito na
 * mão, nos 22 arquivos. Esse é o caminho do ambiente onde eles foram escritos —
 * no runner do GitHub o Playwright instala em `~/.cache/ms-playwright`, e as 22
 * suítes falhavam com "executable doesn't exist" em TODO commit, desde sempre.
 *
 * Um caminho absoluto de máquina dentro de um teste é uma dependência
 * invisível: passa na sua mão e reprova em qualquer outro lugar, sem dizer que
 * o problema é o ambiente e não o código.
 *
 * Aqui a regra é: se o navegador pré-instalado existe, usa; senão deixa o
 * Playwright resolver sozinho, que é o que ele sabe fazer.
 */
const PRE_INSTALADO = process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium";

/**
 * E, desde que o app ganhou service worker, o navegador aberto aqui vem com
 * ele BLOQUEADO por padrão.
 *
 * O motivo é sutil e custou quatro suítes vermelhas: as suítes dublam o
 * Supabase com `page.route`, que intercepta a rede DA PÁGINA. Um service
 * worker se instala entre a página e a rede, e as requisições passam a sair
 * dele — onde o dublê não alcança. O resultado é o app tentando falar com o
 * Supabase de verdade no meio do teste: dado que não vem, e `ERR_FAILED` no
 * console, que é justamente o que várias suítes conferem que não pode
 * acontecer.
 *
 * Bloquear é o certo: nessas suítes o service worker não é o objeto do teste,
 * é um intruso no meio do dublê. Quem precisa dele — `verificar-offline.mjs`,
 * onde ele É o objeto do teste — abre o contexto com
 * `{ serviceWorkers: "allow" }` e recupera o comportamento real.
 */
export function abrirNavegador(opcoes = {}) {
  return chromium.launch({
    ...(existsSync(PRE_INSTALADO) ? { executablePath: PRE_INSTALADO } : {}),
    ...opcoes,
  }).then(envolver);
}

/**
 * Devolve o mesmo navegador, com `newContext` passando a bloquear service
 * workers quando a suíte não disse o contrário.
 *
 * É um embrulho, e não um helper novo que cada teste precise chamar, de
 * propósito: assim as 27 suítes existentes herdam a proteção sem alteração, e
 * a exceção fica visível em quem a pede.
 */
function envolver(navegador) {
  const original = navegador.newContext.bind(navegador);
  navegador.newContext = (opcoes = {}) =>
    original({ serviceWorkers: "block", ...opcoes });
  return navegador;
}
