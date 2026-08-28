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
 *
 * CORREÇÃO: GABARITO + AUTOAVALIAÇÃO, NÃO CORRETOR AUTOMÁTICO
 *
 * Este app não tem IA para julgar texto livre — não existe backend que leia
 * "descreva o ouchi gari" e decida se a resposta está certa. Um corretor por
 * palavra-chave existiria, mas erraria o veredito toda vez que a resposta
 * certa viesse com outras palavras — e um app que finge julgar e erra é pior
 * que um app que não julga.
 *
 * Por isso cada `Pergunta` carrega um `gabarito`: uma resposta de referência,
 * escrita uma vez junto do syllabus, revelada depois que o atleta escreve a
 * própria resposta. Quem decide "acertei" ou "não acertei" é ele, contra um
 * padrão escrito — não o app sozinho. É autoavaliação, não correção
 * automática de verdade, e o app não finge o contrário em lugar nenhum.
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
  /** A resposta de referência — escrita uma vez, junto do syllabus, não gerada. */
  gabarito: string;
  resposta: string;
  respondida: boolean;
  /**
   * Autoavaliação contra o gabarito: null = ainda não conferiu, true/false =
   * o próprio atleta decidiu. Não existe corretor automático de texto livre
   * aqui — ver a nota no topo do arquivo sobre por quê.
   */
  acertou: boolean | null;
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

/* ------------------------------------------------------------------ */
/* Gabaritos — a resposta de referência de cada item.                  */
/*                                                                      */
/* Descrição técnica geral, não o vocabulário exato de nenhum professor */
/* específico — a autoridade final sobre "como a Team Thomé ensina" é   */
/* sempre o professor. Isto é o padrão contra o qual o atleta se        */
/* autoavalia, não um substituto da correção humana.                    */
/* ------------------------------------------------------------------ */

const GABARITO_ITEM: Record<string, string> = {
  // --- defesas numeradas: camadas de defesa contra a passagem, da mais
  // externa (pé) até a mais próxima de ser passado (ombros) ---
  "01 — Pé":
    "Primeira camada: o pé/perna impede o passador de se aproximar — pressiona joelho ou quadril dele, mantendo distância antes de qualquer contato mais próximo.",
  "02 — Joelhos":
    "Ele já venceu a barreira do pé; o joelho vira o frame — dobrado, apontando para o passador, protegendo a linha do quadril.",
  "03 — Mãos (braços esticados)":
    "Braço esticado empurrando quadril, ombro ou coxa do passador — a defesa mais comum e a mais fraca contra pressão de peso, porque depende só de força.",
  "04 — Cotovelos / antebraço":
    "O frame sobe de nível: em vez do braço esticado, que cansa e cede, o antebraço/cotovelo fica colado ao corpo — mais estrutura, menos força gasta.",
  "05 — Ombros":
    "Última camada antes da passagem se consumar — ele já está muito perto; o que resta é usar o ombro para girar e criar ângulo de reposição, não mais empurrar.",

  // --- cambalhotas ---
  "Cambalhota para frente":
    "Queixo colado no peito, nunca apoiar a cabeça no chão — rola pela nuca/ombro, não pelo topo da cabeça, para não comprimir a cervical.",
  "Cambalhota para trás":
    "Gira sob os ombros: mão apoia ao lado da cabeça, o ombro entra primeiro, e a cabeça sai da linha de rotação para não bater nem torcer o pescoço.",

  // --- posturas e movimentação ---
  "Postura dentro da guarda":
    "Tronco ereto, quadril baixo e colado, joelhos largos travando o quadril do adversário no chão — a disputa é manter essa postura contra a tentativa dele de quebrá-la.",
  "Posição de 100 kg":
    "Pressão de peso morto sobre o adversário, geralmente peito no peito ou joelho na barriga, sem gastar força ativa — a gravidade faz o trabalho de exaustão.",
  "Posicionamento nas guardas variadas":
    "A postura muda com o tipo de guarda: aberta pede tronco mais alto e ativo; fechada pede quadril colado e postura mais defensiva, sem se deixar puxar para dentro.",
  "Movimentações básicas":
    "O vocabulário de base que sustenta tudo — fuga de quadril, ponte, giro — executado como parte do jogo real, não como aquecimento isolado.",
  "Fuga de quadril — pé de dentro":
    "O pé mais próximo do adversário apoia por dentro; usada quando ainda há espaço para recuar o quadril na direção dele antes que ele feche o espaço.",
  "Fuga de quadril — pé de fora":
    "O pé apoia por fora do corpo do adversário, geralmente para criar ângulo e escapar de uma pressão mais fechada, girando para longe dele.",
  "Pé de dentro emborca":
    "A partir do pé de dentro, o movimento vira o corpo de bruços — geralmente parte de uma fuga que termina retirando você de baixo da pressão.",
  "Pé de dentro arrasta":
    "Variação em que, em vez de virar, você arrasta o quadril mantendo a frente para o adversário — recompõe posição sem expor as costas.",
  "Levantada técnica":
    "Levanta do chão sem dar as costas nem perder a base: mão no chão, quadril sobe primeiro, olho no adversário — nunca virar de costas para levantar.",
  "Troca de base":
    "Troca o apoio de mão/joelho de um lado para o outro sob pressão, mantendo o quadril estável — usada para inverter posição ou escapar de um ataque lateral.",
  "Sprawl":
    "Joga o quadril e as pernas para trás quando o adversário ataca a queda, achatando o peso sobre as costas dele para negar a entrada.",
  "Passo do samurai":
    "Passo largo e baixo, quadril atrás do joelho de apoio, usado para trocar de lado ou entrar em posição mantendo a base sempre carregada.",

  // --- projeções ---
  "Single leg":
    "Pegada numa perna (coxa/joelho), cabeça geralmente por fora, corpo colado — leva a queda empurrando a perna presa e cortando o ângulo. Falhar deixa você agachado com a perna ainda presa: recuperável, mas exposto a guilhotina se a cabeça ficar por dentro.",
  "Double leg":
    "Pegada nas duas pernas, nível baixo, explosão para frente levando as duas ao mesmo tempo. Falhar deixa você agachado à frente dele — recuperável, mas caro em gás.",
  "Osoto gari":
    "Ceifada grande por fora: pegada de manga/gola, gira o corpo varrendo por fora a perna de apoio dele enquanto puxa o tronco. Falhar pode entregar as costas se o giro passar do ponto.",
  "Kouchi gari":
    "Ceifada pequena por dentro: o pé rasteja por dentro atacando o calcanhar/tornozelo, sem o giro grande do osoto. Barata — falhar deixa você em pé, com a pegada intacta.",
  "Ouchi gari":
    "Ceifada grande por dentro: sua perna atravessa e varre a perna de trás dele por dentro, empurrando o tronco para trás. Falhar é barato: você continua em pé.",
  "Kibisu gaeshi (safadinha)":
    "Ataque ao calcanhar/tornozelo por trás, geralmente quando ele recua ou muda o peso — puxa o pé enquanto empurra o joelho, derrubando de costas. É contragolpe de reação, não entrada de frente.",
  "Colar drag em pé":
    "Puxa a cabeça/gola para baixo e para o lado, quebrando a postura dele em pé — geralmente abre caminho para uma queda de perna do lado que ele expôs.",
  "Colar drag para single leg":
    "A mesma puxada de cabeça, mas usada para cegar a reação dele e entrar direto na perna que o puxão deixou exposta.",
  "Tomoe nage":
    "Pegada nas duas lapelas ou mangas, você senta/cai de costas colocando o pé no quadril ou baixo-ventre dele, usando a inércia dele para frente para arremessá-lo por cima. Falhar deixa você de costas com ele em pé — cara.",
  "Sumi gaeshi":
    "O pé engancha por dentro da coxa dele e levanta o canto dele enquanto você puxa — funciona quando ele está com a postura baixa e curvada. Falhar geralmente te deixa em guarda gancho com o gancho já colocado — barata.",
  "O goshi":
    "Quadril grande: pegada ao redor da cintura, você gira de costas colando o quadril abaixo do dele e arremessa por cima, usando o braço na cintura como alavanca.",
  "Koshi guruma":
    "Mesma entrada de quadril do o goshi, mas o braço vai ao redor do pescoço em vez da cintura — controla a cabeça na queda.",
  "Ippon seoi nage (ajoelhado)":
    "\"Ippon\" indica pegada de um braço só — carrega o braço dele nas costas, entrando mais baixo e mais rápido, geralmente ajoelhando para reduzir a altura.",
  "Seoi nage (ajoelhado)":
    "Versão de dois braços: pegada de manga e gola, você entra de costas para ele, carrega o corpo inteiro sobre os ombros antes de puxar para baixo.",
  "Tani otoshi":
    "Deriva \"no vale\": trava a perna dele por trás enquanto puxa o tronco para o lado — ele cai porque a base foi cortada, não porque foi arremessado por cima.",
  "Tai otoshi":
    "Usa o próprio corpo como barreira: perna estendida na frente da dele, gira o tronco puxando, e ela tromba na sua perna e cai.",
  "Kata guruma":
    "\"Roda no ombro\": você abaixa, pega a perna dele, sobe o corpo dele nos seus ombros e gira, derrubando-o por cima como um saco.",
  "Harai goshi":
    "Varredura de quadril: entrada igual ao o goshi, mas a sua perna varre a perna dele por trás no momento do giro, somando quadril e varredura.",
  "De ashi barai":
    "Varre o pé que está avançando no exato instante em que ele apoia o peso ali — não precisa de força, precisa de tempo certo.",

  // --- quedas (ukemi) ---
  "Mae ukemi":
    "Cai nos antebraços formando um triângulo com o corpo reto — nunca nas mãos sozinhas, e a cabeça e o quadril nunca tocam o chão.",
  "Ushiro ukemi":
    "Queixo no peito, as duas mãos batem no tatame em diagonal na altura dos pés, pernas flexionadas com adução — a batida dissipa o impacto antes que ele chegue à cabeça.",
  "Yoko ukemi":
    "Cai de lado varrendo com a perna, um braço bate no tatame a 45°, cabeça longe do chão — a mais usada em grappling, porque a maioria das quedas termina de lado.",
  "Zempo kaiten ukemi":
    "Rolamento pelos ombros, nunca pela cabeça — a rotação atravessa a diagonal do corpo (mão, ombro oposto, quadril), dissolvendo a energia da queda em vez de recebê-la de impacto.",
};

/**
 * Gabarito das comparações — chave no mesmo formato usado no `item` da
 * pergunta de comparação (`"A × B"`), para achar direto sem reprocessar.
 */
const GABARITO_PAR: Record<string, string> = {
  "Ouchi gari × Kouchi gari":
    "Duas ceifadas por dentro: Ouchi é grande, ataca a perna de trás com giro maior de corpo; Kouchi é pequena, ataca o calcanhar/tornozelo mais perto, sem o giro grande. Kouchi é mais barata e mais rápida; Ouchi derruba mais forte quando entra.",
  "Tomoe nage × Sumi gaeshi":
    "As duas são sacrifício, mas para posturas opostas: Tomoe funciona contra quem está ereto e vindo para frente, usando a inércia dele; Sumi gaeshi funciona contra quem está curvado e baixo, levantando o canto dele. A defesa de uma tende a abrir a outra.",
  "O goshi × Koshi guruma":
    "A entrada de quadril é a mesma; muda o braço de controle — O goshi abraça a cintura, Koshi guruma controla a cabeça/pescoço. Koshi guruma dá mais controle da queda e custa mais tempo para armar.",
  "Seoi nage (ajoelhado) × Ippon seoi nage (ajoelhado)":
    "\"Ippon\" quer dizer um braço só: Ippon seoi entra com uma pegada, mais rápido e mais baixo; Seoi nage usa as duas mãos (manga e gola), mais lento de armar mas mais controlado na queda.",
  "Single leg × Double leg":
    "As duas são shots de wrestling: Single ataca uma perna só e permite mais variação de finalização; Double ataca as duas, é mais explosiva e definitiva, mas exige nível mais baixo e mais gás.",
  "Colar drag em pé × Colar drag para single leg":
    "É o mesmo puxão de cabeça — a diferença é o que vem depois: em pé, você usa a quebra de postura para atacar de perto; para single leg, você usa a distração do puxão para entrar direto na perna.",
  "Kibisu gaeshi (safadinha) × Osoto gari":
    "As duas derrubam para trás, mas Kibisu gaeshi é reativa — ataca o calcanhar quando ele recua ou muda o peso; Osoto gari é proativa — você cria a queda girando o corpo, sem esperar a reação dele.",
  "Tai otoshi × Kata guruma":
    "As duas usam o corpo como obstáculo, em alturas diferentes: Tai otoshi usa a perna estendida na altura do chão; Kata guruma sobe o corpo dele inteiro até os ombros. Kata guruma é mais espetacular e mais cara de errar.",
  "Tani otoshi × Harai goshi":
    "Tani otoshi corta a base por trás sem girar o corpo dele — ele cai de lado/atrás por perder o apoio; Harai goshi gira e varre ao mesmo tempo — ele voa por cima do quadril.",
};

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
    gabarito: GABARITO_ITEM[item] ?? "",
    resposta: "",
    respondida: false,
    acertou: null,
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

  const comparacoes: Pergunta[] = pares.map(([a, b]) => {
    const item = `${a} × ${b}`;
    return {
      id: gerarId(aleatorio),
      categoria: "projecoes",
      item,
      pergunta: escolher(TEMPLATES_PROJECAO_COMPARAR, aleatorio)(a, b),
      gabarito: GABARITO_PAR[item] ?? "",
      resposta: "",
      respondida: false,
      acertou: null,
    };
  });

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

/* ------------------------------------------------------------------ */

export interface ResumoDoExame {
  total: number;
  certas: number;
  erradas: number;
  /** Respondida, mas ainda sem "acertei"/"não acertei" marcado. */
  porConferir: number;
  /** Nem sequer respondida. */
  emBranco: number;
  /** Os itens marcados "não acertei" — o material de revisão. */
  paraRever: { categoria: Categoria; item: string; gabarito: string }[];
}

/**
 * Fecha a conta do exame a partir da autoavaliação de cada pergunta.
 *
 * Não julga nada — só soma o que o próprio atleta já decidiu. Um exame
 * recém-gerado tem `certas = erradas = 0` e todo mundo em `emBranco`; a
 * "correção" acontece pergunta a pergunta, não num botão de "corrigir tudo".
 */
export function resumoDoExame(perguntas: Pergunta[]): ResumoDoExame {
  const resumo: ResumoDoExame = {
    total: perguntas.length,
    certas: 0,
    erradas: 0,
    porConferir: 0,
    emBranco: 0,
    paraRever: [],
  };

  for (const p of perguntas) {
    if (!p.respondida) {
      resumo.emBranco += 1;
    } else if (p.acertou === true) {
      resumo.certas += 1;
    } else if (p.acertou === false) {
      resumo.erradas += 1;
      resumo.paraRever.push({ categoria: p.categoria, item: p.item, gabarito: p.gabarito });
    } else {
      resumo.porConferir += 1;
    }
  }

  return resumo;
}
