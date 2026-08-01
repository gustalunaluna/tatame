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

export function abrirNavegador(opcoes = {}) {
  return chromium.launch({
    ...(existsSync(PRE_INSTALADO) ? { executablePath: PRE_INSTALADO } : {}),
    ...opcoes,
  });
}
