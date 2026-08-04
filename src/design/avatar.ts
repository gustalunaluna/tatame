/**
 * As peças do avatar.
 *
 * SVG desenhado em código, e não imagem: o app tem orçamento de 220 kB no
 * caminho crítico, funciona offline e não fala com CDN nenhum. Um conjunto de
 * PNGs de avatar seria centenas de kB de rede que o vestiário não tem.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * A FAIXA NÃO ESTÁ AQUI, E ISSO É DE PROPÓSITO
 *
 * O pedido incluía escolher a faixa junto com cabelo e kimono. Não dá para
 * fazer isso sem desmentir o app: a descrição da loja diz "não gradua
 * ninguém — quem amarra a sua faixa é o seu professor", e a migração 032
 * acabou de exigir que o mestre confirme o vínculo justamente porque
 * reivindicação sem confirmação não vale nada.
 *
 * Um seletor de faixa no avatar deixaria qualquer um vestir preta na foto do
 * perfil. Seria o único lugar do produto onde a graduação é escolha.
 *
 * Então a faixa do avatar VEM DO PERFIL — `belt` e `degrees`, os mesmos que a
 * régua da IBJJF usa — e é desenhada como o aro em volta do retrato, com a
 * ponteira preta e os graus. Você muda de faixa no avatar do jeito que se
 * muda de faixa na vida: sendo graduado.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface Avatar {
  pele: number;
  cabelo: EstiloDeCabelo;
  corDoCabelo: number;
  barba: EstiloDeBarba;
  olhos: number;
  kimono: CorDoKimono;
  /** Até dois patches; a ordem é ombro, peito. */
  patches: [PatchId, PatchId];
}

export type EstiloDeCabelo =
  | "raspado"
  | "curto"
  | "ondulado"
  | "cacheado"
  | "coque"
  | "rabo";

export type EstiloDeBarba = "nenhuma" | "cavanhaque" | "cheia";

/** Só as três cores que a IBJJF aceita em competição. */
export type CorDoKimono = "branco" | "azul" | "preto";

export type PatchId =
  | "nenhum"
  | "academia"
  | "brasil"
  | "bandeira"
  | "circulo"
  | "listras";

/* ------------------------------------------------------------------ */
/* Paletas                                                             */
/* ------------------------------------------------------------------ */

/** Seis tons, do mais claro ao mais escuro. Índice, não nome. */
export const PELES = [
  "#F2D3BC",
  "#E5B99A",
  "#C88D63",
  "#A26840",
  "#734327",
  "#4A2B18",
] as const;

export const CORES_DE_CABELO = [
  "#0F0D0C", // preto
  "#3B2A20", // castanho escuro
  "#6B4A2F", // castanho
  "#A9743F", // claro
  "#D9B067", // loiro
  "#8E8E8E", // grisalho
  "#B4453C", // ruivo
] as const;

export const CORES_DE_OLHOS = [
  "#3B2A20", // castanho
  "#0F0D0C", // preto
  "#4A6B3F", // verde
  "#3C5A78", // azul
  "#8A6A3A", // mel
] as const;

export const KIMONOS: Record<CorDoKimono, { tecido: string; sombra: string }> = {
  branco: { tecido: "#EFEEE9", sombra: "#CFCDC5" },
  azul: { tecido: "#2E4C7E", sombra: "#22395E" },
  preto: { tecido: "#23252A", sombra: "#171920" },
};

/**
 * Patches. Cada um é um desenho pequeno; a cor não segue o tema do app de
 * propósito — patch de kimono é bordado, tem cor própria e não muda quando a
 * pessoa gradua.
 */
export const PATCHES: Record<
  PatchId,
  { nome: string; cores: readonly string[] }
> = {
  nenhum: { nome: "Nenhum", cores: [] },
  academia: { nome: "Academia", cores: ["#1D2B3A", "#E9D79F"] },
  brasil: { nome: "Brasil", cores: ["#1B7A3E", "#F5D742", "#1D3E8A"] },
  bandeira: { nome: "Bandeira", cores: ["#B33A32", "#EFEEE9"] },
  circulo: { nome: "Círculo", cores: ["#EFEEE9", "#1D2B3A"] },
  listras: { nome: "Listras", cores: ["#1D2B3A", "#B33A32"] },
};

/**
 * Os pigmentos fixos do desenho — os que não são escolha de ninguém.
 *
 * Ficam aqui, e não no componente, pela mesma regra que vale para o resto do
 * app: cor escrita dentro de componente não aparece no guia de estilo e
 * ninguém acha quando quer trocar. A diferença é que estes não são cor de
 * INTERFACE (não seguem a faixa, não mudam com o tema) e por isso não entram
 * em tokens.json — este arquivo é o catálogo deles.
 */
export const PIGMENTOS = {
  /** Fundo atrás do busto, dentro do recorte. */
  fundo: "#12161B",
  /** Sombra do queixo sobre o pescoço, e o traço do nariz e da boca. */
  sombra: "#000",
  branco: "#FFF",
  /** Aro por baixo do tecido: é o que faz a faixa preta existir no escuro. */
  aroDeContraste: "#3A3F49",
  /** A ponteira, onde a ponta da faixa cai. */
  ponteira: "#15171C",
} as const;

export const ESTILOS_DE_CABELO: { id: EstiloDeCabelo; nome: string }[] = [
  { id: "raspado", nome: "Raspado" },
  { id: "curto", nome: "Curto" },
  { id: "ondulado", nome: "Ondulado" },
  { id: "cacheado", nome: "Cacheado" },
  { id: "coque", nome: "Coque" },
  { id: "rabo", nome: "Rabo" },
];

export const ESTILOS_DE_BARBA: { id: EstiloDeBarba; nome: string }[] = [
  { id: "nenhuma", nome: "Sem barba" },
  { id: "cavanhaque", nome: "Cavanhaque" },
  { id: "cheia", nome: "Cheia" },
];

export const CORES_DE_KIMONO: { id: CorDoKimono; nome: string }[] = [
  { id: "branco", nome: "Branco" },
  { id: "azul", nome: "Azul" },
  { id: "preto", nome: "Preto" },
];

export const AVATAR_PADRAO: Avatar = {
  pele: 2,
  cabelo: "curto",
  corDoCabelo: 1,
  barba: "nenhuma",
  olhos: 0,
  kimono: "branco",
  patches: ["nenhum", "nenhum"],
};

/**
 * Lê o que veio do banco sem confiar nele.
 *
 * A coluna é `jsonb` e pode ter sido gravada por uma versão anterior do app,
 * ou ficar com um estilo que deixou de existir. Cada campo cai no padrão
 * quando não reconhece o valor — nunca quebra a tela por causa de um avatar.
 */
export function lerAvatar(bruto: unknown): Avatar {
  const o = (bruto ?? {}) as Record<string, unknown>;

  const dentro = (v: unknown, max: number, padrao: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max ? v : padrao;

  const umDe = <T extends string>(v: unknown, lista: readonly T[], padrao: T): T =>
    typeof v === "string" && (lista as readonly string[]).includes(v)
      ? (v as T)
      : padrao;

  const patches = Array.isArray(o.patches) ? o.patches : [];
  const idsDePatch = Object.keys(PATCHES) as PatchId[];

  return {
    pele: dentro(o.pele, PELES.length, AVATAR_PADRAO.pele),
    corDoCabelo: dentro(
      o.corDoCabelo,
      CORES_DE_CABELO.length,
      AVATAR_PADRAO.corDoCabelo,
    ),
    olhos: dentro(o.olhos, CORES_DE_OLHOS.length, AVATAR_PADRAO.olhos),
    cabelo: umDe(
      o.cabelo,
      ESTILOS_DE_CABELO.map((e) => e.id),
      AVATAR_PADRAO.cabelo,
    ),
    barba: umDe(
      o.barba,
      ESTILOS_DE_BARBA.map((e) => e.id),
      AVATAR_PADRAO.barba,
    ),
    kimono: umDe(
      o.kimono,
      CORES_DE_KIMONO.map((e) => e.id),
      AVATAR_PADRAO.kimono,
    ),
    patches: [
      umDe(patches[0], idsDePatch, "nenhum"),
      umDe(patches[1], idsDePatch, "nenhum"),
    ],
  };
}

/**
 * Um avatar estável a partir do identificador da pessoa.
 *
 * Quem nunca abriu o editor não deve virar um boneco genérico igual ao de
 * todo mundo: a lista de alunos de uma academia com 60 avatares idênticos não
 * ajuda ninguém a reconhecer ninguém. A semente é o próprio id, então o
 * sorteio é sempre o mesmo para a mesma pessoa — e continua sendo depois que
 * ela edita, porque aí o que vale é o que está gravado.
 */
export function avatarSorteado(semente: string): Avatar {
  let h = 2166136261;
  for (let i = 0; i < semente.length; i++) {
    h ^= semente.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const nn = (n: number, max: number) =>
    Math.abs(Math.imul(h, n + 1) >>> 8) % max;

  const cabelos = ESTILOS_DE_CABELO.map((e) => e.id);
  const barbas = ESTILOS_DE_BARBA.map((e) => e.id);
  const kimonos = CORES_DE_KIMONO.map((e) => e.id);

  return {
    pele: nn(1, PELES.length),
    cabelo: cabelos[nn(2, cabelos.length)],
    corDoCabelo: nn(3, CORES_DE_CABELO.length),
    // Barba entra em menos da metade: com sorteio uniforme metade da academia
    // aparecia barbada, o que não parece uma academia.
    barba: nn(4, 4) === 0 ? barbas[1 + nn(5, 2)] : "nenhuma",
    olhos: nn(6, CORES_DE_OLHOS.length),
    kimono: kimonos[nn(7, kimonos.length)],
    patches: ["nenhum", "nenhum"],
  };
}
