import type { Faixa } from "./bjj-types";

/**
 * Como se chama alguém no jiu-jitsu.
 *
 * O app chamava todo dono de academia de "mestre". Dentro do tatame isso soa
 * errado, e errado de um jeito que quem treina percebe na hora: mestre é
 * tratamento de faixa-preta veterano. Um preta 1º grau que abriu a própria
 * academia é professor, não mestre — e chamá-lo assim constrange quem recebe
 * tanto quanto quem lê.
 *
 * A escada real, como ela é usada nas academias:
 *
 *   Branca a azul     Aluno.
 *   Roxa              Aluno. Pode instruir — é o primeiro degrau de quem
 *                     ensina, quase sempre sob supervisão.
 *   Marrom            Aluno. Instrutor, se dá aula.
 *   Preta 1º a 3º     Professor.
 *   Preta 4º a 6º     Mestre.
 *   Coral (7º/8º)     Mestre.
 *   Vermelha (9º/10º) Grão-Mestre.
 *
 * Duas regras que valem sobre a faixa:
 *
 *   1. O papel dado pela academia ganha da faixa. Se a academia registrou
 *      alguém como professor, ele é professor ali, mesmo que a faixa sozinha
 *      dissesse instrutor. Quem conhece o aluno é a casa, não a tabela.
 *   2. Ninguém sobe além do que a faixa permite. A academia não transforma um
 *      faixa-azul em mestre — o banco recusa antes (013), e aqui a leitura
 *      acompanha.
 */

/** A partir da roxa a pessoa pode se declarar instrutora. */
export function podeSerInstrutor(faixa: Faixa | string | undefined | null): boolean {
  return ["Roxa", "Marrom", "Preta", "Coral", "Vermelha"].includes(String(faixa ?? ""));
}

/** Faixa-preta em diante — quem gradua. */
export function ePreta(faixa: Faixa | string | undefined | null): boolean {
  return ["Preta", "Coral", "Vermelha"].includes(String(faixa ?? ""));
}

export type PapelNaAcademia =
  | "dono"
  | "mestre"
  | "professor"
  | "instrutor"
  | "monitor"
  | "membro";

export type Titulo =
  | "Aluno"
  | "Monitor"
  | "Instrutor"
  | "Professor"
  | "Mestre"
  | "Grão-Mestre";

/** Ordem de senioridade. Serve para não deixar o papel passar da faixa. */
const ESCADA: Titulo[] = [
  "Aluno",
  "Monitor",
  "Instrutor",
  "Professor",
  "Mestre",
  "Grão-Mestre",
];

const degrau = (t: Titulo) => ESCADA.indexOf(t);

/** O teto que a faixa sozinha permite. */
function tetoDaFaixa(faixa: Faixa | string | undefined | null, graus = 0): Titulo {
  switch (String(faixa ?? "")) {
    case "Vermelha":
      return "Grão-Mestre";
    case "Coral":
      return "Mestre";
    case "Preta":
      // O 4º grau é a fronteira. Antes dele, professor; dele em diante,
      // mestre. É a divisão que as federações usam e que o tatame reconhece.
      return graus >= 4 ? "Mestre" : "Professor";
    case "Marrom":
    case "Roxa":
      return "Instrutor";
    default:
      return "Aluno";
  }
}

/** O que a faixa diz por si só, sem papel de academia e sem declaração. */
function padraoDaFaixa(faixa: Faixa | string | undefined | null, graus = 0): Titulo {
  const teto = tetoDaFaixa(faixa, graus);
  // Roxa e marrom PODEM instruir; não é o que são por padrão. Um roxa que
  // nunca deu aula é aluno, e chamá-lo de instrutor é inventar um cargo.
  return teto === "Instrutor" ? "Aluno" : teto;
}

const DO_PAPEL: Record<PapelNaAcademia, Titulo> = {
  dono: "Professor",
  mestre: "Mestre",
  professor: "Professor",
  instrutor: "Instrutor",
  monitor: "Monitor",
  membro: "Aluno",
};

/**
 * O título de alguém, lendo faixa, papel na academia e a declaração de
 * instrutor — nessa ordem de força, com a faixa como teto.
 */
export function tituloDe({
  belt,
  degrees = 0,
  papel,
  instrutor = false,
}: {
  belt: Faixa | string | undefined | null;
  degrees?: number;
  papel?: PapelNaAcademia | string | null;
  instrutor?: boolean;
}): Titulo {
  const teto = tetoDaFaixa(belt, degrees);
  let titulo = padraoDaFaixa(belt, degrees);

  if (instrutor && degrau("Instrutor") > degrau(titulo)) titulo = "Instrutor";

  const doPapel = papel ? DO_PAPEL[papel as PapelNaAcademia] : undefined;
  if (doPapel && degrau(doPapel) > degrau(titulo)) titulo = doPapel;

  // O teto da faixa vale por último e sobre tudo: dono de academia faixa-azul
  // continua sendo aluno de faixa-azul.
  return degrau(titulo) > degrau(teto) ? teto : titulo;
}

/**
 * O título junto da faixa, do jeito que se apresenta alguém.
 *
 *   "Professor · Preta 2º grau"   "Aluno · Azul 3 graus"
 *
 * Aluno some quando a faixa já diz tudo: escrever "Aluno · Branca" em todo
 * perfil de iniciante transforma o título em ruído em vez de informação.
 */
export function tituloComFaixa({
  belt,
  degrees = 0,
  papel,
  instrutor = false,
}: {
  belt: Faixa | string | undefined | null;
  degrees?: number;
  papel?: PapelNaAcademia | string | null;
  instrutor?: boolean;
}): string {
  const titulo = tituloDe({ belt, degrees, papel, instrutor });
  const faixa = nomeDaGraduacao(belt, degrees);
  return titulo === "Aluno" ? faixa : `${titulo} · ${faixa}`;
}

/**
 * A graduação escrita como se fala.
 *
 * De branca a marrom se conta grau no plural ("Azul 3 graus"); da preta em
 * diante se diz o ordinal ("Preta 2º grau"), que é como aparece em diploma e
 * em chamada de pódio.
 */
export function nomeDaGraduacao(
  belt: Faixa | string | undefined | null,
  degrees = 0,
): string {
  const faixa = String(belt ?? "Branca");
  const g = Math.max(0, degrees);
  if (!g) return faixa;
  if (ePreta(faixa)) return `${faixa} ${g}º grau`;
  return `${faixa} ${g} ${g === 1 ? "grau" : "graus"}`;
}
