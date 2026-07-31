/**
 * O level da tela inicial.
 *
 * Antes era `floor(treinos / 5) + 1`. Era o número mais em destaque do app e
 * não queria dizer nada: dez treinos de 40 minutos valiam o mesmo que dez de
 * duas horas, e subir de level era só uma questão de abrir o app cinco vezes.
 *
 * Agora o level vem de HORAS DE TATAME, que é como o jiu-jitsu de fato mede
 * quem está mais adiante — "mat time" é a palavra que todo mundo usa. Os
 * degraus abrem devagar no começo (uma semana de treino já sobe um) e vão
 * ficando mais longos, que é exatamente a sensação real de progredir na faixa.
 *
 * O que ele NÃO é: um substituto da faixa. A faixa quem dá é o professor, e
 * está logo acima na tela. O level é só o volume acumulado, dito em voz alta.
 */

/** Horas necessárias para ENTRAR em cada level, a partir do level 2. */
const DEGRAUS = [
  10, 25, 50, 80, 120, 170, 230, 300, 400, 520, 660, 820, 1000, 1200, 1450,
  1750, 2100, 2500, 3000,
];

/** Depois do último degrau escrito, cada level custa isto. */
const PASSO_FINAL = 600;

function horasParaOLevel(level: number): number {
  if (level <= 1) return 0;
  if (level - 2 < DEGRAUS.length) return DEGRAUS[level - 2];
  const extras = level - 1 - DEGRAUS.length;
  return DEGRAUS[DEGRAUS.length - 1] + extras * PASSO_FINAL;
}

export interface Nivel {
  level: number;
  horas: number;
  /** Horas em que este level começou. */
  pisoDoLevel: number;
  /** Horas necessárias para o próximo. */
  proximoEm: number;
  /** Quanto falta, em horas, arredondado para cima. */
  faltam: number;
  /** 0–100 dentro do level atual. */
  progresso: number;
}

export function nivelPorHoras(minutosTotais: number): Nivel {
  const horas = minutosTotais / 60;

  let level = 1;
  while (horas >= horasParaOLevel(level + 1)) level++;

  const piso = horasParaOLevel(level);
  const teto = horasParaOLevel(level + 1);
  const vao = teto - piso;

  return {
    level,
    horas,
    pisoDoLevel: piso,
    proximoEm: teto,
    faltam: Math.max(0, Math.ceil(teto - horas)),
    progresso: vao > 0 ? Math.min(100, ((horas - piso) / vao) * 100) : 0,
  };
}

/** "128h" para números redondos, "12,5h" quando ainda faz diferença. */
export function horasEmTexto(horas: number): string {
  if (horas >= 100) return `${Math.round(horas)}h`;
  return `${horas.toFixed(1).replace(".", ",").replace(",0", "")}h`;
}
