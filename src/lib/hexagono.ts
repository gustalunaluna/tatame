import type { Faixa } from "./bjj-types.ts";
import { ePreta } from "./graduacao.ts";

/**
 * As seis áreas do jogo, e por que são estas seis.
 *
 * ------------------------------------------------------------------
 * DE ONDE VEM O RECORTE
 * ------------------------------------------------------------------
 * A análise técnico-tática de competição descreve a luta como uma cadeia de
 * fases com transições entre elas — em pé, guarda por baixo, passagem por
 * cima, controle, finalização, fuga. O recorte abaixo é essa cadeia, com uma
 * decisão deliberada: **o jogo em pé não ganha eixo próprio.**
 *
 * O motivo é dado: nos estudos de partidas de alto nível, queda, raspada e
 * pegada de costas acontecem MENOS DE UMA VEZ por competidor por luta, e a
 * puxada para a guarda — que não pontua — é a ação isolada mais frequente.
 * Um eixo de "quedas" ficaria colado no zero para quase todo mundo, e um eixo
 * que não varia não informa: só deforma o hexágono e rouba espaço dos cinco
 * que variam.
 *
 * ------------------------------------------------------------------
 * POR QUE HEXÁGONO, E NÃO LINHA
 * ------------------------------------------------------------------
 * O app mostrava a MÉDIA dos pontos ao longo do tempo, numa linha. A média de
 * seis habilidades é o número que mais esconde: quem melhorou muito a passagem
 * e piorou a defesa aparece parado. E "parado" é exatamente a leitura errada.
 *
 * O hexágono guarda as seis leituras separadas e mostra o FORMATO — que é o
 * que um professor enxerga em três rolas: não "o quanto", mas "de que lado".
 *
 * A ressalva honesta, porque gráfico de radar tem armadilha conhecida: a área
 * da figura cresce com o QUADRADO dos valores, então uma melhora pequena em
 * todos os eixos parece enorme se a pessoa ler a mancha em vez do raio. Duas
 * defesas contra isso, as duas implementadas:
 *   1. os anéis de 1 a 5 ficam desenhados e rotulados — a leitura é por raio
 *   2. a tabela embaixo repete os números, que é a leitura sem ilusão nenhuma
 * E a ORDEM DOS EIXOS nunca muda: o formato do mês passado só é comparável com
 * o de agora se os eixos estiverem no mesmo lugar. Por isso `EIXOS` é uma
 * constante ordenada, e nada no app reordena.
 */

export interface EixoDoJogo {
  slug: string;
  nome: string;
  /** O que a nota quer dizer, na prática — o que a pessoa avalia. */
  pergunta: string;
  /** A fase da luta a que pertence, para o plano saber o que prescrever. */
  fase: "por baixo" | "por cima" | "acabar" | "sobreviver" | "corpo";
}

/**
 * ORDEM FIXA. Não reordenar, não ordenar por nota, não filtrar.
 *
 * A sequência não é alfabética nem arbitrária: percorre a luta na ordem em que
 * ela acontece, e coloca os pares opostos frente a frente no hexágono —
 * guarda×passagem e retenção×defesa ficam em vértices opostos. Quem joga muito
 * por baixo vê a figura pender para um lado, e isso é a informação.
 */
export const EIXOS: readonly EixoDoJogo[] = [
  {
    slug: "guarda",
    nome: "Guarda",
    pergunta: "Por baixo, você ataca e raspa — ou só segura?",
    fase: "por baixo",
  },
  {
    slug: "passagem",
    nome: "Passagem",
    pergunta: "Você passa a guarda de quem é do seu nível?",
    fase: "por cima",
  },
  {
    slug: "finalizacao",
    nome: "Finalização",
    pergunta: "Chegando na posição, você termina?",
    fase: "acabar",
  },
  {
    slug: "retencao",
    nome: "Retenção",
    pergunta: "Quando começam a passar, você recompõe?",
    fase: "por baixo",
  },
  {
    slug: "defesa",
    nome: "Defesa",
    pergunta: "Preso embaixo, você escapa antes de bater?",
    fase: "sobreviver",
  },
  {
    slug: "gas",
    nome: "Gás",
    pergunta: "No quinto round você ainda é o mesmo?",
    fase: "corpo",
  },
] as const;

export const NOTA_MAXIMA = 5;

export type NotasDoHexagono = Record<string, number>;

/** Nota vazia — todos os eixos em zero, na ordem certa. */
export function hexagonoVazio(): NotasDoHexagono {
  return Object.fromEntries(EIXOS.map((e) => [e.slug, 0]));
}

/** Lê as notas na ORDEM DOS EIXOS, sempre. Buraco vira 0. */
export function emOrdem(notas: NotasDoHexagono | undefined | null): number[] {
  return EIXOS.map((e) => clamp(Number(notas?.[e.slug] ?? 0)));
}

const clamp = (n: number) =>
  Number.isFinite(n) ? Math.max(0, Math.min(NOTA_MAXIMA, n)) : 0;

/* ==================================================================
   O PLANO DE EVOLUÇÃO
   ================================================================== */

/**
 * De onde vem o plano.
 *
 * Quatro achados de ciência da aprendizagem, e o que cada um vira aqui:
 *
 * **1. Prática deliberada (Ericsson).** Repetição não é prática: prática é
 * repetição COM ALVO ESPECÍFICO, no limite da habilidade atual, com retorno
 * imediato. Vira: o plano nunca diz "treine passagem". Diz qual posição, com
 * que restrição, e como você sabe se deu certo.
 *
 * **2. Dificuldades desejáveis (Bjork).** Espaçamento, intercalação, prática
 * variada e recuperação ativa fazem o aprendizado parecer PIOR na hora e ficar
 * MELHOR depois. Vira: o plano espalha o mesmo tema por semanas separadas em
 * vez de empilhar tudo numa; e intercala dois temas em vez de fechar um antes
 * de abrir o outro.
 *
 * **3. Abordagem por restrições / dinâmica ecológica.** Em esporte de combate,
 * a técnica emerge de resolver um problema sob restrição — não de copiar um
 * movimento e depois "aplicar". Vira: tudo é rola posicional com regra, nunca
 * "faça 50 repetições no boneco".
 *
 * **4. Zona de desenvolvimento proximal (Vygotsky).** O ganho está logo acima
 * do que já se faz sozinho. Vira: o plano ataca o eixo MAIS BAIXO, mas com
 * parceiro e restrição calibrados pela faixa — o mesmo buraco se treina
 * diferente na branca e na marrom.
 *
 * O que o plano NÃO faz: prometer graduação. Ver regra 1 do capítulo 01 — o
 * app não gradua ninguém.
 */

export interface PrescricaoDoMes {
  /** O eixo mais baixo — é onde o mês inteiro aponta. */
  eixo: EixoDoJogo;
  nota: number;
  /** O segundo mais baixo. Entra intercalado, não depois. */
  eixoSecundario: EixoDoJogo;
  /** A frase que explica a escolha, para a tela não parecer oráculo. */
  porque: string;
  /** Quatro semanas. Cada uma é uma restrição, não uma lista de técnicas. */
  semanas: readonly SemanaDoPlano[];
  /** Como saber se funcionou — o retorno imediato da prática deliberada. */
  comoSaber: string;
}

export interface SemanaDoPlano {
  semana: number;
  foco: string;
  /** A rola posicional com restrição. É o coração do método. */
  restricao: string;
}

/**
 * Quanto tempo de rola posicional por semana, por faixa.
 *
 * Não é "quanto treinar" — é quanto do treino vira prática dirigida. Na branca
 * o volume é baixo de propósito: quem ainda não tem repertório precisa de aula
 * e de rola livre para construir vocabulário, e transformar o treino inteiro em
 * exercício de correção afasta.
 */
const MINUTOS_DIRIGIDOS: Record<string, number> = {
  Branca: 10,
  Azul: 15,
  Roxa: 20,
  Marrom: 25,
  Preta: 25,
};

export function minutosDirigidos(faixa: Faixa | string | undefined | null): number {
  const chave = ePreta(faixa) ? "Preta" : String(faixa ?? "Branca");
  return MINUTOS_DIRIGIDOS[chave] ?? MINUTOS_DIRIGIDOS.Branca;
}

/**
 * As restrições, por eixo e por faixa.
 *
 * Cada linha é uma rola posicional: uma posição de partida, uma condição de
 * vitória para cada lado, e uma restrição que força o problema a aparecer. A
 * restrição é o que faz o exercício ensinar — sem ela vira rola comum, e rola
 * comum ensina o que a pessoa já sabe fazer.
 */
const RESTRICOES: Record<string, Record<string, readonly string[]>> = {
  guarda: {
    iniciante: [
      "Guarda fechada. Você só vence raspando ou finalizando; ele só vence passando. Reinicia a cada passagem.",
      "Guarda fechada, mas você começa com as duas mãos na gola. Perdeu a pegada, reinicia.",
      "Meia-guarda por baixo. Objetivo único: chegar de joelhos ou recuperar guarda cheia.",
      "Guarda fechada contra parceiro que só quer abrir. Conte quantos minutos você segura fechada.",
    ],
    avancado: [
      "Guarda aberta, sem fechar as pernas. Só vale raspar — finalização não conta neste round.",
      "Você começa já com uma pegada de perna. Ele sabe. Round de 3 min, troca.",
      "Guarda por baixo contra parceiro em pé. Ele não pode ajoelhar; você não pode sentar.",
      "Duas guardas escolhidas por você. Alterna round a round — sem repetir a mesma duas vezes seguidas.",
    ],
  },
  passagem: {
    iniciante: [
      "Ele de guarda fechada, você por cima. Você vence abrindo e passando; ele vence raspando.",
      "Meia-guarda por cima. Só vale passar pelo lado da perna presa.",
      "Você começa de joelhos na guarda aberta dele. Não pode levantar em pé.",
      "Passagem com as duas mãos ocupadas na calça. Perdeu a pegada, recomeça de fora.",
    ],
    avancado: [
      "Passagem em pé, sem tocar a calça. Só pegada na perna ou no tronco.",
      "Você tem 90 segundos para passar. Não passou, ele pontua. Troca.",
      "Passe pressionando, sem correr para o lado. Round inteiro só de passagem por dentro.",
      "Alterne: um round passando por cima da perna, outro por baixo. Sem repetir.",
    ],
  },
  finalizacao: {
    iniciante: [
      "Você monta, ele defende. Você só vence finalizando; ele vence escapando. 2 min, troca.",
      "Pelas costas com os ganchos postos. Ele defende o pescoço. Sem reiniciar por 3 min.",
      "Cem quilos por cima. Você tem que finalizar dali — não vale trocar de posição.",
      "Escolha UMA finalização. O round inteiro é para ela. Ele sabe qual é.",
    ],
    avancado: [
      "Da montada, sem usar a finalização que você mais acerta.",
      "Ataque em cadeia: se ele defende a primeira, a segunda tem que sair em 5 segundos.",
      "Finalize a partir da guarda, por baixo. Posição dominante não conta neste round.",
      "Três finalizações que você nunca fez em rola. Uma por semana, na rola normal.",
    ],
  },
  retencao: {
    iniciante: [
      "Ele já está com a passagem começada, no seu joelho. Você vence recompondo a guarda.",
      "Deitado, ele em pé segurando suas duas pernas. Só vale recuperar a guarda — sem raspar.",
      "Quadril fora do chão o round inteiro. Encostou as costas, reinicia.",
      "Ele passa devagar, com 50% de força. Você recompõe quantas vezes conseguir em 4 min.",
    ],
    avancado: [
      "Ele começa no cem quilos. Você vence voltando para qualquer guarda.",
      "Retenção sem usar as mãos nas pernas dele. Só quadril e enquadramento.",
      "Round de 5 min. Conte quantas vezes ele passa. Semana seguinte, o alvo é uma a menos.",
      "Ele escolhe a passagem que mais funciona nele. Avisa qual é. Você retém mesmo assim.",
    ],
  },
  defesa: {
    iniciante: [
      "Você embaixo da montada. Vence escapando; ele vence finalizando. 2 min, troca.",
      "Costas tomadas, ganchos postos. Só vale defender o pescoço e virar. Sem bater — fale antes.",
      "Cem quilos em cima. Você vence recuperando meia-guarda.",
      "Round inteiro só sobrevivendo. Não vale atacar. É desconfortável de propósito.",
    ],
    avancado: [
      "Ele começa com a pegada de finalização já feita. Você defende dali.",
      "Escape sem virar as costas em nenhum momento.",
      "Ele monta e você tem 30 segundos para sair. Não saiu, reinicia. Dez vezes.",
      "Deixe ele chegar na sua pior posição de propósito, três vezes por rola.",
    ],
  },
  gas: {
    iniciante: [
      "Três rolas seguidas sem sentar entre elas. Anote em qual delas o ritmo caiu.",
      "Round de 5 min por baixo, sem parar. Só respirar pelo nariz.",
      "Rola com parceiro fresco a cada 2 min. Você não troca.",
      "Última rola do treino: a que você normalmente pula. Faça as quatro semanas.",
    ],
    avancado: [
      "Seis rolas, parceiro novo a cada uma. Você fica.",
      "Rola de 10 min sem pausa. O objetivo é o ritmo constante, não vencer.",
      "Comece cada round já cansado: 20 segundos de esforço antes de encostar no parceiro.",
      "Round inteiro respirando só pelo nariz. Abriu a boca, reinicia mentalmente o ritmo.",
    ],
  },
};

/**
 * O plano do mês.
 *
 * Ataca o eixo mais baixo e INTERCALA o segundo mais baixo — não fecha um para
 * abrir o outro. Intercalar parece pior durante o mês e rende mais no fim; é o
 * achado mais contra-intuitivo da lista, e o mais bem estabelecido.
 */
export function prescricaoDoMes(
  notas: NotasDoHexagono,
  faixa: Faixa | string | undefined | null,
): PrescricaoDoMes | null {
  // Só entra no ranking o eixo que ESTÁ no mapa. Ler eixo ausente como zero
  // fazia o plano mandar treinar exatamente aquilo que o app não mediu: o eixo
  // que ninguém respondeu vencia sempre, por ser o único em zero.
  const ranking = EIXOS.filter((e) => notas?.[e.slug] !== undefined)
    .map((e) => ({ eixo: e, nota: clamp(Number(notas[e.slug])) }))
    .sort((a, b) => a.nota - b.nota || EIXOS.indexOf(a.eixo) - EIXOS.indexOf(b.eixo));
  const pior = ranking[0];
  const segundo = ranking[1];
  if (!pior || !segundo) return null;

  const nivel = ePreta(faixa) || faixa === "Roxa" || faixa === "Marrom" ? "avancado" : "iniciante";
  const a = RESTRICOES[pior.eixo.slug]?.[nivel] ?? [];
  const b = RESTRICOES[segundo.eixo.slug]?.[nivel] ?? [];

  // Semana 1 e 3 no eixo principal, 2 e 4 no secundário: o intervalo entre as
  // duas visitas ao mesmo tema É o espaçamento, e é ele que faz o efeito.
  const semanas: SemanaDoPlano[] = [
    { semana: 1, foco: pior.eixo.nome, restricao: a[0] ?? "" },
    { semana: 2, foco: segundo.eixo.nome, restricao: b[0] ?? "" },
    { semana: 3, foco: pior.eixo.nome, restricao: a[1] ?? a[0] ?? "" },
    { semana: 4, foco: segundo.eixo.nome, restricao: b[1] ?? b[0] ?? "" },
  ];

  const min = minutosDirigidos(faixa);

  return {
    eixo: pior.eixo,
    nota: pior.nota,
    eixoSecundario: segundo.eixo,
    porque:
      pior.nota === segundo.nota
        ? `${pior.eixo.nome} e ${segundo.eixo.nome} empataram em ${pior.nota}. O mês vai nos dois, alternando.`
        : `${pior.eixo.nome} é sua nota mais baixa (${pior.nota} de ${NOTA_MAXIMA}). ` +
          `${segundo.eixo.nome} vem junto, intercalado — treinar dois temas alternados rende mais que fechar um de cada vez.`,
    semanas,
    comoSaber:
      `${min} minutos de rola posicional por semana, dentro do treino que você já faz. ` +
      `No fim do mês, refaça as seis notas: se ${pior.eixo.nome.toLowerCase()} subiu, ` +
      `o plano seguinte muda de alvo sozinho.`,
  };
}
