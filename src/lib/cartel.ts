/**
 * O cartel — a conta, e só a conta.
 *
 * Módulo sem import nenhum, pelo mesmo motivo de `hexagono-derivado.ts`: o que
 * é aritmética pura fica testável sem navegador e sem sessão. `lutas-storage`
 * cuida do banco e chama isto aqui; o teste chama isto direto.
 */

export type Resultado = "vitoria" | "derrota" | "empate";

export type Metodo =
  | "finalizacao"
  | "pontos"
  | "vantagem"
  | "decisao"
  | "wo"
  | "interrompida";

export const RESULTADOS: { valor: Resultado; nome: string }[] = [
  { valor: "vitoria", nome: "Vitória" },
  { valor: "derrota", nome: "Derrota" },
  { valor: "empate", nome: "Empate" },
];

export const METODOS: { valor: Metodo; nome: string }[] = [
  { valor: "finalizacao", nome: "Finalização" },
  { valor: "pontos", nome: "Pontos" },
  { valor: "vantagem", nome: "Vantagem" },
  { valor: "decisao", nome: "Decisão do árbitro" },
  { valor: "wo", nome: "W.O." },
  { valor: "interrompida", nome: "Interrompida" },
];

/** Os comuns, para não obrigar a digitar. A lista não é fechada. */
export const GOLPES_COMUNS = [
  "Armlock",
  "Arco e flecha",
  "Triângulo",
  "Omoplata",
  "Mata-leão",
  "Estrangulamento de lapela",
  "Katagatame",
  "Kimura",
  "Americana",
  "Cruzado",
  "Mão de vaca",
  "Chave de pé",
];

export const FAIXAS_DE_OPONENTE = [
  "Branca",
  "Azul",
  "Roxa",
  "Marrom",
  "Preta",
  "Coral",
  "Vermelha",
];

export interface Luta {
  id: string;
  data: string;
  evento: string;
  oficial: boolean;
  oponente: string;
  oponenteFaixa: string;
  categoria: string;
  resultado: Resultado;
  metodo: Metodo | null;
  golpe: string;
  tempoSeg: number | null;
  notas: string;
}

export type NovaLuta = Omit<Luta, "id">;

export interface Cartel {
  vitorias: number;
  derrotas: number;
  empates: number;
  /** Vitórias por finalização — a métrica que o contador antigo não dava. */
  porFinalizacao: number;
  finalizacoesSofridas: number;
  total: number;
}

/**
 * A conta do cartel.
 *
 * `profiles.fights_won` continua existindo e continua sendo o que o perfil
 * mostra — mas quem o escreve é o gatilho da migração 038, a partir das
 * mesmas linhas. O que se calcula aqui é o que o contador NÃO sabe: quantas
 * vieram de finalização, quantas derrotas vieram de finalização, e os empates.
 *
 * Só luta OFICIAL entra. Superluta e treino registrados aqui servem para
 * análise; cartel é competição.
 */
export function resumirCartel(lutas: Luta[]): Cartel {
  const oficiais = lutas.filter((l) => l.oficial);
  return {
    vitorias: oficiais.filter((l) => l.resultado === "vitoria").length,
    derrotas: oficiais.filter((l) => l.resultado === "derrota").length,
    empates: oficiais.filter((l) => l.resultado === "empate").length,
    porFinalizacao: oficiais.filter(
      (l) => l.resultado === "vitoria" && l.metodo === "finalizacao",
    ).length,
    finalizacoesSofridas: oficiais.filter(
      (l) => l.resultado === "derrota" && l.metodo === "finalizacao",
    ).length,
    total: oficiais.length,
  };
}

/**
 * Como o cartel se escreve: 3V-1D, ou 3V-1D-1E quando houve empate.
 *
 * O E só aparece se existir. "2V-1D-0E" faz o leitor procurar um empate que
 * não houve, e cartel é para ser lido de relance.
 */
export function cartelEmTexto(c: Cartel): string {
  const base = `${c.vitorias}V-${c.derrotas}D`;
  return c.empates > 0 ? `${base}-${c.empates}E` : base;
}
