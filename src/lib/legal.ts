/**
 * Os dados que as páginas legais precisam e que só o dono do app sabe.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ANTES DE SUBMETER ÀS LOJAS: troque CONTATO por um endereço que você lê.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * A Apple e o Google exigem um canal de contato que funcione — os dois testam,
 * e a LGPD (art. 18, §1º) obriga a existir uma via para o titular pedir seus
 * dados. O valor abaixo é um espaço reservado de propósito: publicar um e-mail
 * pessoal numa página aberta é decisão de quem é dono dele, não do código.
 *
 * Vale qualquer coisa que chegue até você: um endereço no domínio do app, um
 * alias do Gmail, uma conta separada. O que não vale é deixar como está.
 */
export const CONTATO = "contato@ponteira.app";

/** O domínio de produção, usado nos textos e no link canônico. */
export const DOMINIO = "ponteira.vercel.app";

/**
 * Quando os textos mudaram pela última vez.
 *
 * Não é enfeite: a LGPD e as lojas pedem que a pessoa consiga saber se o que
 * ela aceitou é o que está no ar. Atualize junto com qualquer mudança de texto.
 */
export const ATUALIZADO_EM = "4 de agosto de 2026";

/**
 * Idade mínima.
 *
 * O app guarda data de nascimento e é usado por quem treina — e muita gente
 * começa jiu-jitsu criança. A LGPD (art. 14) trata dado de criança e
 * adolescente em regime próprio, com consentimento específico de um dos pais
 * para menores de 12. Manter o cadastro em 16+ evita esse regime inteiro, e é
 * o que as duas lojas esperam ver declarado.
 */
export const IDADE_MINIMA = 16;
