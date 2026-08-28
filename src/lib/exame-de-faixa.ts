/**
 * O gerador do exame de faixa — a conta, sem banco e sem tela.
 *
 * O conteúdo vem do syllabus real da Team Thomé / Barbosa Jiu-Jitsu (a folha
 * "Posições Fundamentais — Exame de Faixa", primeira parte: posicionamentos,
 * movimentações e quedas, branca → azul). Não é uma lista inventada — é a
 * lista deles, estruturada.
 *
 * SÓ EXISTE CONTEÚDO PARA BRANCA → AZUL
 *
 * As demais transições (azul→roxa, roxa→marrom, marrom→preta) não têm
 * syllabus fornecido. `gerarExame` para essas retorna null em vez de inventar
 * técnica — um exame de faixa é documento oficial da academia, e chutar
 * conteúdo aqui seria pior que não ter a função.
 *
 * POR QUE VARIA A CADA GERAÇÃO
 *
 * O syllabus (a lista de posições e quedas) é fixo — é o exame deles, não é
 * para reescrever. O que varia é a FORMA da pergunta: descrever, comparar,
 * projetar falha, aplicar. É o mesmo formato que rendeu a prova manual desta
 * conversa — pedir comparação e aplicação ensina mais que pedir descrição
 * repetida 40 vezes.
 *
 * SEMENTE, NÃO ALEATÓRIO PURO
 *
 * `gerarExame` recebe uma semente numérica e é determinístico a partir dela —
 * mesma semente, mesmo exame, sempre. Isso é o que torna a função testável
 * sem navegador: o teste fixa uma semente e confere o resultado. Quem chama
 * do app passa `Date.now()` como semente, e cada geração sai diferente.
 */

export type FaixaAlvo = "Azul" | "Roxa" | "Marrom" | "Preta";

export const FAIXAS_ALVO: FaixaAlvo[] = ["Azul", "Roxa", "Marrom", "Preta"];

export type Categoria =
  | "defesas"
  | "cambalhotas"
  | "posturas"
  | "projecoes"
  | "quedas";

export const NOME_DA_CATEGORIA: Record<Categoria, string> = {
  defesas: "Defesas numeradas",
  cambalhotas: "Cambalhotas",
  posturas: "Postura e movimentação",
  projecoes: "Projeções",
  quedas: "Quedas (ukemi)",
};

export interface Pergunta {
  id: string;
  categoria: Categoria;
  item: string;
  pergunta: string;
  resposta: string;
  respondida: boolean;
}

/* ------------------------------------------------------------------ */
/* PRNG determinístico — mulberry32. Pequeno, rápido, sem dependência.  */
/* ------------------------------------------------------------------ */

function criarGerador(semente: number) {
  let a = semente >>> 0;
  return function aleatorio() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(itens: T[], aleatorio: () => number): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function escolher<T>(itens: T[], aleatorio: () => number): T {
  return itens[Math.floor(aleatorio() * itens.length)];
}

/* ------------------------------------------------------------------ */
/* O syllabus — Branca → Azul, Primeira Parte                          */
/* ------------------------------------------------------------------ */

const DEFESAS_NUMERADAS = [
  "01 — Pé",
  "02 — Joelhos",
  "03 — Mãos (braços esticados)",
  "04 — Cotovelos / antebraço",
  "05 — Ombros",
];

const CAMBALHOTAS = ["Cambalhota para frente", "Cambalhota para trás"];

const POSTURAS = [
  "Postura dentro da guarda",
  "Posição de 100 kg",
  "Posicionamento nas guardas variadas",
  "Movimentações básicas",
  "Fuga de quadril — pé de dentro",
  "Fuga de quadril — pé de fora",
  "Pé de dentro emborca",
  "Pé de dentro arrasta",
  "Levantada técnica",
  "Troca de base",
  "Sprawl",
  "Passo do samurai",
];

const PROJECOES = [
  "Single leg",
  "Double leg",
  "Osoto gari",
  "Kouchi gari",
  "Ouchi gari",
  "Kibisu gaeshi (safadinha)",
  "Colar drag em pé",
  "Colar drag para single leg",
  "Tomoe nage",
  "Sumi gaeshi",
  "O goshi",
  "Koshi guruma",
  "Ippon seoi nage (ajoelhado)",
  "Seoi nage (ajoelhado)",
  "Tani otoshi",
  "Tai otoshi",
  "Kata guruma",
  "Harai goshi",
  "De ashi barai",
];

/**
 * Pares com relação real, para o template de comparação — CADA TÉCNICA
 * APARECE EM NO MÁXIMO UM PAR.
 *
 * É o que garante que "cobertas" tenha sempre exatamente o dobro do número
 * de pares escolhidos, não importa quais 5 dos 9 o sorteio pegue — e é o que
 * torna `contagemDoExame` um número fixo em vez de uma estimativa. Um par
 * repetindo item (ex: "Single leg" em três comparações) faz a cobertura
 * variar por semente, e o total de perguntas deixa de ser previsível.
 */
const PARES_PROJECAO: [string, string][] = [
  ["Ouchi gari", "Kouchi gari"],
  ["Tomoe nage", "Sumi gaeshi"],
  ["O goshi", "Koshi guruma"],
  ["Seoi nage (ajoelhado)", "Ippon seoi nage (ajoelhado)"],
  ["Single leg", "Double leg"],
  ["Colar drag em pé", "Colar drag para single leg"],
  ["Kibisu gaeshi (safadinha)", "Osoto gari"],
  ["Tai otoshi", "Kata guruma"],
  ["Tani otoshi", "Harai goshi"],
];

const QUEDAS = [
  "Mae ukemi",
  "Ushiro ukemi",
  "Yoko ukemi",
  "Zempo kaiten ukemi",
];

/**
 * Quantos pares de comparação entram em cada exame. Usada tanto para gerar
 * quanto para `contagemDoExame` — as duas precisam concordar, ou a contagem
 * mostrada antes de gerar mente sobre o exame que sai depois.
 */
const PARES_USADOS_POR_EXAME = 5;

/* ------------------------------------------------------------------ */
/* Templates de pergunta, por categoria                                 */
/* ------------------------------------------------------------------ */

type Template = (item: string) => string;
type TemplateComparar = (a: string, b: string) => string;

const TEMPLATES_DEFESA: Template[] = [
  (item) => `O que é a defesa numerada ${item}, e em que momento ela entra?`,
  (item) => `Descreva a defesa ${item}: o que protege e como se posiciona.`,
];

const TEMPLATES_CAMBALHOTA: Template[] = [
  (item) => `${item}: qual o cuidado principal para não machucar o pescoço?`,
  (item) => `Descreva ${item} passo a passo.`,
];

const TEMPLATES_POSTURA: Template[] = [
  (item) => `Descreva ${item}: como se executa e quando se usa.`,
  (item) => `${item} — o que dá errado quando alguém faz isso mal feito?`,
  (item) => `Em que situação de rola você usaria ${item}?`,
];

const TEMPLATES_PROJECAO_DESCREVER: Template[] = [
  (item) => `Descreva ${item}: pegada, entrada e direção da queda.`,
  (item) =>
    `${item} — se a projeção falhar, em que posição você fica? É caro ou barato tentar?`,
  (item) => `Contra que postura ou reação do adversário ${item} funciona melhor?`,
];

const TEMPLATES_PROJECAO_COMPARAR: TemplateComparar[] = [
  (a, b) => `Qual a diferença entre ${a} e ${b}?`,
  (a, b) => `${a} e ${b} atacam algo parecido. O que muda entre uma e outra?`,
];

const TEMPLATES_QUEDA: Template[] = [
  (item) =>
    `Descreva ${item}: onde você apoia, o que nunca se apoia sozinho, e o que protege a cabeça.`,
  (item) => `${item} — qual erro mais comum de quem está aprendendo?`,
];

/* ------------------------------------------------------------------ */

function gerarId(aleatorio: () => number): string {
  return Math.floor(aleatorio() * 1e9).toString(36);
}

function perguntasDaCategoriaSimples(
  categoria: Categoria,
  itens: string[],
  templates: Template[],
  aleatorio: () => number,
): Pergunta[] {
  return itens.map((item) => ({
    id: gerarId(aleatorio),
    categoria,
    item,
    pergunta: escolher(templates, aleatorio)(item),
    resposta: "",
    respondida: false,
  }));
}

/**
 * As projeções misturam descrição e comparação: cada par de
 * `PARES_PROJECAO` vira UMA pergunta de comparação (cobrindo as duas
 * técnicas de uma vez), e o restante das 19 vira pergunta de descrição.
 * O resultado sempre cobre as 19 — nenhuma fica de fora.
 */
function perguntasDeProjecao(aleatorio: () => number): Pergunta[] {
  const pares = embaralhar(PARES_PROJECAO, aleatorio).slice(0, PARES_USADOS_POR_EXAME);
  const cobertas = new Set(pares.flat());

  const comparacoes: Pergunta[] = pares.map(([a, b]) => ({
    id: gerarId(aleatorio),
    categoria: "projecoes",
    item: `${a} × ${b}`,
    pergunta: escolher(TEMPLATES_PROJECAO_COMPARAR, aleatorio)(a, b),
    resposta: "",
    respondida: false,
  }));

  const restantes = PROJECOES.filter((p) => !cobertas.has(p));
  const descricoes = perguntasDaCategoriaSimples(
    "projecoes",
    restantes,
    TEMPLATES_PROJECAO_DESCREVER,
    aleatorio,
  );

  return embaralhar([...comparacoes, ...descricoes], aleatorio);
}

/**
 * Gera o exame para a faixa-alvo pedida.
 *
 * Retorna `null` quando não há syllabus para aquela transição — hoje, só
 * Branca → Azul tem conteúdo. Chamar duas vezes com a mesma semente produz
 * exatamente o mesmo exame; sementes diferentes embaralham tudo.
 */
export function gerarExame(
  faixaAlvo: FaixaAlvo,
  semente: number,
): Pergunta[] | null {
  if (faixaAlvo !== "Azul") return null;

  const aleatorio = criarGerador(semente);

  const perguntas: Pergunta[] = [
    ...perguntasDaCategoriaSimples("defesas", DEFESAS_NUMERADAS, TEMPLATES_DEFESA, aleatorio),
    ...perguntasDaCategoriaSimples("cambalhotas", CAMBALHOTAS, TEMPLATES_CAMBALHOTA, aleatorio),
    ...perguntasDaCategoriaSimples("posturas", POSTURAS, TEMPLATES_POSTURA, aleatorio),
    ...perguntasDeProjecao(aleatorio),
    ...perguntasDaCategoriaSimples("quedas", QUEDAS, TEMPLATES_QUEDA, aleatorio),
  ];

  return perguntas;
}

/**
 * Quantas perguntas um exame para essa faixa teria — para mostrar antes de
 * gerar, sem precisar gerar.
 *
 * Só é um número fixo porque `PARES_PROJECAO` é disjunto (nenhuma técnica se
 * repete entre pares): `PARES_USADOS_POR_EXAME` comparações cobrem sempre o
 * dobro de técnicas únicas, e o restante das 19 vira descrição — sem
 * variação por semente.
 */
export function contagemDoExame(faixaAlvo: FaixaAlvo): number | null {
  if (faixaAlvo !== "Azul") return null;
  const paresUsados = Math.min(PARES_USADOS_POR_EXAME, PARES_PROJECAO.length);
  const projecoesEmPergunta = paresUsados + (PROJECOES.length - 2 * paresUsados);
  return (
    DEFESAS_NUMERADAS.length +
    CAMBALHOTAS.length +
    POSTURAS.length +
    projecoesEmPergunta +
    QUEDAS.length
  );
}
