/**
 * A sequência de dias treinados — a conta, e só a conta.
 *
 * Módulo sem import nenhum, pela mesma razão de `cartel.ts` e `dieta.ts`: dá
 * para testar sem navegador e sem sessão.
 *
 * Ele saiu de dentro da tela por um motivo específico: a sequência passou a ser
 * mostrada em DUAS telas — o Início e o painel do Jiu-jitsu. Duas cópias da
 * mesma regra é como a escada de graduação já errou antes neste app: uma das
 * cópias envelhece, as duas telas discordam, e ninguém sabe qual acreditar.
 */

/**
 * Quantos dias seguidos, contando de trás para frente a partir de `hoje`.
 *
 * A regra que não é óbvia: **o dia de hoje não conta como quebra.** Quem treina
 * de manhã e abre o app de manhã vê a sequência; quem treina à noite e abre o
 * app às 8h da manhã veria a sequência zerada às vésperas de treinar de novo —
 * e a sequência é justamente o número que faz a pessoa não faltar. Zerar por
 * causa do relógio seria punir por um treino que ainda vai acontecer.
 *
 * Então: se hoje não tem treino, a contagem começa em ontem. Se ontem também
 * não tem, aí sim acabou.
 */
export function sequenciaDeDias(datas: string[], hoje: string): number {
  const treinados = new Set(datas);
  let dias = 0;
  let dia = hoje;

  for (let i = 0; i < 3650; i++) {
    if (treinados.has(dia)) dias++;
    else if (i > 0) break;
    dia = diaAnterior(dia);
  }
  return dias;
}

/** Um dia para trás, em UTC — nunca pelo fuso local, que muda de máquina. */
function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
