/**
 * O dia em que NÃO se treinou — e por que ele precisa de lugar próprio.
 *
 * Um diário de treino que só aceita treino força a pessoa a mentir ou a calar.
 * Quem passou três dias de cama tem duas saídas ruins: não registrar nada — e
 * aí o app diz que faltou por desleixo, zera a sequência e some com o motivo —
 * ou inventar uma linha de treino com zero minutos, que é o que dá para fazer
 * com o formulário que existe. Foi exatamente isso que aconteceu aqui, e o
 * estrago apareceu do outro lado: o app passou a contar dia de doença como
 * treino. Três treinos a mais e uma hora a mais que nunca existiram.
 *
 * Então o dia parado vira um registro de primeira classe, com uma regra só:
 *
 *     não soma treino, não soma hora — e também NÃO quebra a sequência.
 *
 * A segunda metade é o ponto. Zerar a corrente de quem ficou doente pune a
 * pessoa por ter sido honesta no registro, e um app que pune honestidade
 * ensina a mentir para ele. O dia parado é PONTE: a corrente passa por cima.
 *
 * Módulo sem import nenhum, pela mesma razão de `cartel.ts`, `dieta.ts` e
 * `sequencia.ts`: dá para testar sem navegador e sem sessão.
 */

/** Os dois tipos que são tatame de verdade. O resto é dia parado. */
export const TIPOS_DE_TREINO = ["Gi", "No-Gi"] as const;
export type TipoDeTreino = (typeof TIPOS_DE_TREINO)[number];

/**
 * Por que não treinou.
 *
 * "Assisti a aula" existe porque o caso apareceu na vida real: ir à academia
 * doente e ficar de fora olhando a técnica. Isso é presença, não é tatame —
 * e registrar como treino de uma hora foi o que inflou o contador de horas.
 *
 * "Descanso" não é derrota. Descanso planejado é parte do treino; o app não
 * tem por que tratá-lo como falha.
 */
export const MOTIVOS_DE_PARADA = [
  "Doença",
  "Lesão",
  "Descanso",
  "Viagem",
  "Assisti a aula",
  "Outro",
] as const;
export type MotivoDeParada = (typeof MOTIVOS_DE_PARADA)[number];

/** Uma explicação curta por motivo, para o formulário não ser só uma lista. */
export const EXPLICACAO_DO_MOTIVO: Record<MotivoDeParada, string> = {
  "Doença": "Gripe, virose, febre — corpo fora de operação.",
  "Lesão": "Machucado que impede treinar.",
  "Descanso": "Descanso planejado. Não é falha; é parte do plano.",
  "Viagem": "Fora da cidade, sem tatame.",
  "Assisti a aula": "Foi à academia e ficou de fora. Presença, não tatame.",
  "Outro": "Trabalho, prova, chuva, o que for.",
};

/** O mínimo que este módulo precisa saber de uma linha do diário. */
export interface LinhaDoDiario {
  date: string;
  type: string;
  durationMin: number;
}

/**
 * Isto foi tatame?
 *
 * As duas metades da regra — o tipo e os minutos — têm de concordar, e é a
 * restrição `trainings_dia_parado_e_dia_parado` (migração 044) que garante que
 * concordem no banco. A função do banco que recalcula as conquistas corta por
 * `duration_min > 0`; aqui o corte é o mesmo, para tela e banco nunca
 * mostrarem números diferentes para a mesma pergunta.
 */
export function ehTreino(d: LinhaDoDiario): boolean {
  return (
    (TIPOS_DE_TREINO as readonly string[]).includes(d.type) && d.durationMin > 0
  );
}

export function ehDiaParado(d: LinhaDoDiario): boolean {
  return !ehTreino(d);
}

export function ehMotivoDeParada(tipo: string): tipo is MotivoDeParada {
  return (MOTIVOS_DE_PARADA as readonly string[]).includes(tipo);
}

/** Só os treinos de verdade. */
export function somenteTreinos<T extends LinhaDoDiario>(lista: T[]): T[] {
  return lista.filter(ehTreino);
}

/** Só os dias parados. */
export function somenteParados<T extends LinhaDoDiario>(lista: T[]): T[] {
  return lista.filter(ehDiaParado);
}

/** Quantos treinos — a resposta que o contador da tela inicial devia dar. */
export function contarTreinos(lista: LinhaDoDiario[]): number {
  return somenteTreinos(lista).length;
}

/** Minutos de tatame. Dia parado não soma nada, por definição. */
export function minutosDeTatame(lista: LinhaDoDiario[]): number {
  return somenteTreinos(lista).reduce((n, t) => n + (t.durationMin || 0), 0);
}

/** As datas em que houve tatame, sem repetir o dia de dois treinos. */
export function diasTreinados(lista: LinhaDoDiario[]): string[] {
  return [...new Set(somenteTreinos(lista).map((t) => t.date))];
}

/**
 * As datas que são PONTE: dia parado registrado em que não houve treino
 * nenhum.
 *
 * O "em que não houve treino nenhum" importa: quem registrou doença de manhã e
 * acabou treinando à noite tem as duas linhas na mesma data, e essa data é dia
 * de treino — não ponte. Sem este corte, o mesmo dia entraria nas duas listas
 * e a sequência contaria certo por acaso, não por regra.
 */
export function diasDePonte(lista: LinhaDoDiario[]): string[] {
  const treinados = new Set(diasTreinados(lista));
  return [
    ...new Set(
      somenteParados(lista)
        .map((t) => t.date)
        .filter((d) => !treinados.has(d)),
    ),
  ];
}
