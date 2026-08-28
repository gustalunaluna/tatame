/**
 * O gerador do exame de faixa — a conta, sem banco e sem tela.
 *
 * O conteúdo vem do syllabus real da Team Thomé / Barbosa Jiu-Jitsu (a folha
 * "Posições Fundamentais — Exame de Faixa", primeira parte: posicionamentos,
 * movimentações e quedas, branca → azul). Não é uma lista inventada — é a
 * lista deles, estruturada.
 *
 * EXISTE CONTEÚDO PARA BRANCA → AZUL E AZUL → ROXA
 *
 * As demais transições (roxa→marrom, marrom→preta) não têm syllabus
 * fornecido. `gerarExame` para essas retorna null em vez de inventar técnica —
 * um exame de faixa é documento oficial da academia, e chutar conteúdo aqui
 * seria pior que não ter a função.
 *
 * ESCOPOS: A FOLHA DA ROXA COBRA COISAS DIFERENTES POR GRAU
 *
 * A folha Azul → Roxa é explícita: "o exame de 1º e 2º grau será exigido o
 * conhecimento das posições de 01 a 18, para o 3º e 4º graus o conhecimento
 * das posições de 19 a 36 (...) para o exame de faixa será exigido o
 * conhecimento de todas as posições". Ou seja, um azul liso e um azul 3 graus
 * não fazem a mesma prova, e gerar sempre as 36 seria gerar a prova errada
 * para a maioria das pessoas. Daí o `escopo`.
 *
 * DUAS COISAS DA FOLHA DA ROXA QUE O APP NÃO TEM E NÃO INVENTA
 *
 * 1. "Mais 04 projeções a ser informada antes do exame" — a academia só diz
 *    quais na hora. O app avisa que elas existem e não gera nenhuma.
 * 2. Os DRILLS não estão presos a nenhum grau na folha: a regra de 01–18 e
 *    19–36 fala em "posições", e drill não é posição. Então eles entram só no
 *    exame de faixa completo, e isso está escrito na tela — é leitura da
 *    folha, não regra da academia.
 *
 * NOTA MÍNIMA
 *
 * A folha da roxa fecha com "para aprovação será necessário atingir 70% de
 * acerto". A folha da azul não trazia percentual nenhum, então o app cobra os
 * 70% na roxa e não finge saber a nota de corte da azul.
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
  | "quedas"
  | "posicoes"
  | "drills";

export const NOME_DA_CATEGORIA: Record<Categoria, string> = {
  defesas: "Defesas numeradas",
  cambalhotas: "Cambalhotas",
  posturas: "Postura e movimentação",
  projecoes: "Projeções",
  quedas: "Quedas (ukemi)",
  posicoes: "Posições",
  drills: "Drills",
};

/**
 * O que o exame cobra. Na azul há um escopo só; na roxa a folha divide por
 * grau — ver a nota no topo.
 */
export const ESCOPO_FAIXA = "Exame de faixa";

export function escoposDaFaixa(faixaAlvo: FaixaAlvo): string[] | null {
  switch (faixaAlvo) {
    case "Azul":
      return [ESCOPO_FAIXA];
    case "Roxa":
      return ["1º e 2º grau", "3º e 4º grau", ESCOPO_FAIXA];
    default:
      return null;
  }
}

/** O escopo que o app escolhe sozinho quando ninguém escolheu. */
export function escopoPadrao(faixaAlvo: FaixaAlvo): string {
  return escoposDaFaixa(faixaAlvo)?.[0] ?? ESCOPO_FAIXA;
}

/**
 * A nota de corte da folha, em fração. `null` = a folha daquela faixa não
 * trazia percentual, e o app não inventa um.
 */
export function aprovacaoMinima(faixaAlvo: FaixaAlvo): number | null {
  return faixaAlvo === "Roxa" ? 0.7 : null;
}

/**
 * O que a folha exige e o app não consegue gerar. Aparece na tela junto do
 * exame — um exame que finge estar completo é pior que um exame que diz o que
 * falta nele.
 */
export function avisoDaFaixa(faixaAlvo: FaixaAlvo, escopo: string): string | null {
  if (faixaAlvo !== "Roxa") return null;
  if (escopo !== ESCOPO_FAIXA) {
    return "A folha divide por grau: este exame cobre só as posições desse bloco. Os drills e as projeções entram no exame de faixa completo.";
  }
  return "A folha pede mais 4 projeções que a academia só informa antes do exame. Elas não estão aqui porque o app não sabe quais são — pergunte ao professor e treine essas quatro por fora.";
}

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
/* O syllabus — Azul → Roxa                                             */
/*                                                                      */
/* Os números são os da folha, e ficam no nome do item de propósito: é  */
/* assim que o atleta acha a posição no papel que a academia entregou.  */
/* ------------------------------------------------------------------ */

/** Posições 01 a 18 — o que a folha cobra no exame de 1º e 2º grau. */
const ROXA_PRIMEIRO_BLOCO = [
  "01 — Reposição dos 100 kg para guarda fechada (para fora), meia emborcada",
  "02 — Reposição de meia guarda para guarda fechada",
  "03 — Drill toureada (passagem de guarda)",
  "04 — Passagem de guarda aberta (over under)",
  "05 — Mão de vaca",
  "06 — Omoplata com raspagem",
  "07 — Armlock da guarda fechada com pêndulo",
  "08 — Armdrag da guarda borboleta",
  "09 — Estrangulamento rodado da guarda sentada (baseball)",
  "10 — Raspagem kimura da guarda fechada",
  "11 — Ida para as costas da guarda fechada (cruzando a manga)",
  "12 — Abertura de guarda fechada em pé com passagem de guarda",
  "13 — Raspagem de meia guarda para single leg",
  "14 — Raspagem de guarda aranha com oponente de joelho",
  "15 — Saída das costas terminando na guarda fechada",
  "16 — Estrangulamento das costas (arco e flecha)",
  "17 — Triângulo partindo do overhook (esgrima atrás da axila)",
  "18 — Defesa de triângulo para double under",
];

/** Posições 19 a 36 — o que a folha cobra no exame de 3º e 4º grau. */
const ROXA_SEGUNDO_BLOCO = [
  "19 — Raspagem de guarda borboleta para montada",
  "20 — Armlock do joelho na barriga",
  "21 — Defesa de omoplata ficando em pé",
  "22 — Transição de meia guarda para meia guarda profunda",
  "23 — Raspagem de guarda X",
  "24 — Raspagem de guarda one leg",
  "25 — Passagem de guarda partindo do double under",
  "26 — Passagem de guarda aranha (dominando a barra da calça)",
  "27 — Estrangulamento com a própria lapela dos 100 kg",
  "28 — Raspagem da guarda fechada (catucada)",
  "29 — Saída do armlock girando (pedindo carona)",
  "30 — Kimura dos 100 kg com variação para armlock",
  "31 — Americana da montada para armlock",
  "32 — Quebra de pegada no armlock da montada",
  "33 — Transição de meia guarda para meia montada",
  "34 — Armlock da montada com variação para triângulo",
  "35 — Chave de pé reta da one leg",
  "36 — Defesa de chave de pé reta",
];

/**
 * Os drills da folha. Não estão presos a grau nenhum: a regra de 01–18 e
 * 19–36 fala em "posições", e drill não é posição — por isso entram só no
 * exame de faixa completo. É leitura da folha, não regra da academia.
 */
const ROXA_DRILLS = [
  "Ataques das costas com armlock e triângulo",
  "Passagem de guarda com braço por baixo do oponente, finalizando kimura e violino",
  "Abertura de guarda com as 3 passagens (joelho com joelho, long step, montada)",
];

/**
 * Pares de comparação da roxa, SEPARADOS POR BLOCO.
 *
 * Não é organização estética: um par que atravessasse os dois blocos seria
 * inutilizável num exame de grau, que só cobra metade da folha — e a contagem
 * de perguntas deixaria de ser um número fixo. Dentro de cada bloco vale a
 * mesma regra da azul: cada posição aparece em no máximo um par.
 *
 * Os pares são quase todos ataque × defesa da MESMA posição, porque é a
 * relação que a folha da roxa mais repete — e porque entender que a defesa
 * dele é a entrada do seu próximo ataque é justamente o que separa azul de
 * roxa.
 */
const PARES_ROXA_PRIMEIRO: [string, string][] = [
  [
    "01 — Reposição dos 100 kg para guarda fechada (para fora), meia emborcada",
    "02 — Reposição de meia guarda para guarda fechada",
  ],
  [
    "17 — Triângulo partindo do overhook (esgrima atrás da axila)",
    "18 — Defesa de triângulo para double under",
  ],
  ["03 — Drill toureada (passagem de guarda)", "04 — Passagem de guarda aberta (over under)"],
  ["07 — Armlock da guarda fechada com pêndulo", "10 — Raspagem kimura da guarda fechada"],
  [
    "11 — Ida para as costas da guarda fechada (cruzando a manga)",
    "15 — Saída das costas terminando na guarda fechada",
  ],
  [
    "13 — Raspagem de meia guarda para single leg",
    "14 — Raspagem de guarda aranha com oponente de joelho",
  ],
];

const PARES_ROXA_SEGUNDO: [string, string][] = [
  ["35 — Chave de pé reta da one leg", "36 — Defesa de chave de pé reta"],
  ["31 — Americana da montada para armlock", "32 — Quebra de pegada no armlock da montada"],
  [
    "22 — Transição de meia guarda para meia guarda profunda",
    "33 — Transição de meia guarda para meia montada",
  ],
  [
    "25 — Passagem de guarda partindo do double under",
    "26 — Passagem de guarda aranha (dominando a barra da calça)",
  ],
  ["19 — Raspagem de guarda borboleta para montada", "23 — Raspagem de guarda X"],
  ["20 — Armlock do joelho na barriga", "34 — Armlock da montada com variação para triângulo"],
  [
    "29 — Saída do armlock girando (pedindo carona)",
    "30 — Kimura dos 100 kg com variação para armlock",
  ],
];

/** Quantos pares entram por bloco. Fixo, para a contagem não variar. */
const PARES_ROXA_POR_BLOCO = 4;

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

  /* ---------------- Azul → Roxa: posições 01 a 18 ---------------- */

  "01 — Reposição dos 100 kg para guarda fechada (para fora), meia emborcada":
    "Debaixo da pressão dos 100 kg não se empurra de frente. Vira de lado (meia emborcada) para tirar o peito da linha do peso dele, e é a virada que abre o espaço do joelho — o joelho entra e você recompõe para FORA, do lado oposto ao que ele pressiona. Quem tenta levantar o peso dele gasta o braço e continua embaixo.",
  "02 — Reposição de meia guarda para guarda fechada":
    "Primeiro o frame — under-hook, ou antebraço no pescoço/ombro. Só depois a fuga de quadril, e aí o joelho de fora entra entre os dois corpos para fechar. Sem o frame antes, ele acompanha o seu quadril e você só troca uma meia guarda por outra pior.",
  "03 — Drill toureada (passagem de guarda)":
    "Controla as duas barras da calça (ou os joelhos), joga as pernas dele para um lado e passa pelo lado oposto — o capote do toureiro. O drill é o vaivém: joga, passa, ele recompõe, joga para o outro lado. O que se treina é o tempo e o controle das pernas, não a velocidade da corrida.",
  "04 — Passagem de guarda aberta (over under)":
    "Um braço por cima de uma coxa, o outro por baixo da outra, cabeça pressionando. É passagem de pressão, e é lenta de propósito: você caminha o ombro em direção ao peito dele e mata o quadril. Quem tenta fazer rápido perde a pegada; quem mantém a pressão passa mesmo sem velocidade nenhuma.",
  "05 — Mão de vaca":
    "A puxada de braço: domina o punho e o tríceps do MESMO braço, arrasta esse braço para o seu lado do corpo e ocupa na hora o espaço que ele deixou — quase sempre terminando nas costas ou no single leg. O nome muda de academia para academia; confirme com o professor qual versão a Team Thomé cobra.",
  "06 — Omoplata com raspagem":
    "Prende o ombro dele com a perna e, em vez de esperar a finalização, usa a rotação para raspar no momento em que ele se defende postando a mão no chão e girando. Ataque e raspagem são a mesma ação em direções diferentes: a defesa da omoplata é o que entrega a raspagem.",
  "07 — Armlock da guarda fechada com pêndulo":
    "Abre a guarda, controla o braço e usa o balanço da perna — o pêndulo — para girar o quadril até os 90° e levar a perna por cima da cabeça. O pêndulo é o que gera o giro sem força de braço: quem puxa o braço em vez de girar o quadril nunca chega ao ângulo.",
  "08 — Armdrag da guarda borboleta":
    "Sentado na borboleta, a puxada de braço e o gancho acontecem JUNTOS: o gancho levanta o lado dele enquanto o drag traz o corpo dele para o seu lado. Termina nas costas ou em raspagem. Feitos em sequência em vez de ao mesmo tempo, ele se recompõe no intervalo.",
  "09 — Estrangulamento rodado da guarda sentada (baseball)":
    "Da guarda sentada, as mãos cruzam na lapela como quem segura um taco de beisebol, e o rolamento por baixo dele é o que fecha o estrangulamento enquanto você gira. A pegada sozinha não finaliza — é o giro que aperta.",
  "10 — Raspagem kimura da guarda fechada":
    "Com a pegada de kimura no braço, ele posta a mão no chão para não ter o ombro girado — e é justamente essa mão que você tira da base. A raspagem vem pelo lado do braço preso. Aqui a kimura é controle, não finalização: ela força a escolha entre o ombro e a base.",
  "11 — Ida para as costas da guarda fechada (cruzando a manga)":
    "Cruza a manga dele para a sua outra mão. Isso trava o braço na frente do corpo dele e abre a linha das costas: abre a guarda, senta no ângulo e sobe pelo lado do braço cruzado. Sem cruzar a manga primeiro, ele recoloca o cotovelo e fecha a linha.",
  "12 — Abertura de guarda fechada em pé com passagem de guarda":
    "Levanta com postura, mão na barriga ou na lapela para ele não quebrar a sua postura, um pé recuado, e abre empurrando o joelho para baixo. Sai da abertura direto para a passagem — parar em pé com a guarda aberta é dar tempo de ele recompor a guarda que você acabou de abrir.",
  "13 — Raspagem de meia guarda para single leg":
    "Sobe com o under-hook e, em vez de raspar por cima, ataca a perna livre dele como no single leg em pé. A raspagem termina com você por cima e a perna dele ainda controlada — que é o que a diferencia de uma raspagem que só troca de posição.",
  "14 — Raspagem de guarda aranha com oponente de joelho":
    "Pés nos bíceps, mangas controladas, ele ajoelhado: estica uma perna e recolhe a outra para desequilibrá-lo na diagonal. A raspagem vem da DIFERENÇA de tensão entre as duas pernas, não de um puxão forte — quem faz força igual dos dois lados não move ninguém.",
  "15 — Saída das costas terminando na guarda fechada":
    "Pescoço primeiro: as duas mãos na lapela dele antes de qualquer movimento. Depois escorrega o quadril para o lado do braço que estrangula, tira o gancho daquele lado e desce até pôr as costas no tatame. De lá, fecha a guarda — parar em meia guarda é terminar o escape no meio.",
  "16 — Estrangulamento das costas (arco e flecha)":
    "Das costas: uma mão na gola profunda, a outra na perna dele do lado oposto, e o corpo gira formando o arco — gola e perna puxam em direções contrárias. É dos estrangulamentos mais fortes do gi porque o corpo inteiro entra na alavanca, não só os braços.",
  "17 — Triângulo partindo do overhook (esgrima atrás da axila)":
    "O overhook prende o braço dele por cima e atrás da axila. Isso sozinho já cria a condição do triângulo — um braço dentro, um fora — sem precisar quebrar a postura antes. De lá a perna sobe e fecha.",
  "18 — Defesa de triângulo para double under":
    "Postura antes de tudo: ombro no peito dele, empurra o joelho para baixo, e as duas mãos se juntam por baixo das coxas levantando o quadril dele do chão. Levantar o quadril é o que desfaz o ângulo do triângulo — e a passagem já sai montada de dentro da própria defesa.",

  /* ---------------- Azul → Roxa: posições 19 a 36 ---------------- */

  "19 — Raspagem de guarda borboleta para montada":
    "Com os dois ganchos e o controle de tronco, você levanta o lado dele e vai junto — e no fim do giro, em vez de parar por cima na 100 kg, monta direto. A montada só está disponível porque o gancho já tinha levantado o quadril dele do chão.",
  "20 — Armlock do joelho na barriga":
    "Do joelho na barriga, quando ele empurra o seu joelho, você gira por cima da cabeça dele e cai no armlock do braço que empurrou. A defesa dele é o que arma o ataque — sem o empurrão, não há braço exposto.",
  "21 — Defesa de omoplata ficando em pé":
    "Em vez de rolar, postura: firma a base, levanta de pé com o ombro ainda preso e caminha para o lado dele. Ficar em pé desfaz o ângulo da omoplata e transforma a finalização numa disputa de passagem, que é um problema muito menor.",
  "22 — Transição de meia guarda para meia guarda profunda":
    "Mergulha o ombro por baixo do quadril dele e leva o corpo para debaixo da base. Muda a natureza do jogo: sai de 'segurar a perna dele' para 'estar embaixo do centro de gravidade dele', que é de onde as raspagens saem quase de graça.",
  "23 — Raspagem de guarda X":
    "Na X, uma perna cruza por trás do joelho e a outra apoia no quadril; a raspagem é esticar as duas em direções opostas, tirando a base para o lado. É alavanca, não força — se está pesado, o encaixe está errado, não o músculo.",
  "24 — Raspagem de guarda one leg":
    "Na one leg (single leg X), você controla a perna dele entre as suas e derruba na direção do canto em que ele não tem apoio. A raspagem já termina com a perna dele controlada — que é exatamente por que ela conecta direto com a chave de pé reta da posição 35.",
  "25 — Passagem de guarda partindo do double under":
    "As duas mãos por baixo das coxas, quadril dele levantado e apoiado nos seus ombros. Você CAMINHA para frente até a linha do seu ombro ultrapassar o joelho dele, e só então desce para um dos lados. O erro é empurrar em vez de andar — empurrar devolve o quadril dele para o chão.",
  "26 — Passagem de guarda aranha (dominando a barra da calça)":
    "A mão vai à barra da calça para tirar o pé do bíceps e matar o controle de manga. Dominada a barra, a aranha deixa de existir e o que sobra é uma passagem de guarda aberta comum. A passagem não é contra a aranha — é depois de desmontá-la.",
  "27 — Estrangulamento com a própria lapela dos 100 kg":
    "Da pressão dos 100 kg, puxa a lapela DELE por baixo do pescoço e usa o próprio peso para fechar. A pressão que já estava lá vira o aperto: não se larga a posição para finalizar, o que é o motivo de ser tão difícil de defender.",
  "28 — Raspagem da guarda fechada (catucada)":
    "A raspagem de gancho clássica: controla manga e cotovelo do mesmo lado, tira a base pelo lado do braço controlado e usa o pé no quadril e a perna por trás para catucar e virar por cima. Se o braço dele não estiver controlado, ele posta a mão e a raspagem morre.",
  "29 — Saída do armlock girando (pedindo carona)":
    "Antes de o braço esticar, gira na direção do polegar juntando as mãos — o gesto de pedir carona — e leva o corpo por cima, saindo pelo lado em que a alavanca não trabalha. Depois que o braço estica, essa saída já não existe. O tempo é a técnica inteira.",
  "30 — Kimura dos 100 kg com variação para armlock":
    "Da 100 kg, a kimura pega o braço mais distante; se ele estica o braço para o ombro não girar, esse mesmo braço esticado é o armlock. Uma defesa é a entrada da outra — o ataque não é a kimura, é o dilema entre as duas.",
  "31 — Americana da montada para armlock":
    "Da montada, a americana ataca o ombro com o braço dele em L no chão; se ele se defende puxando o cotovelo e esticando o braço, troca direto para o armlock. É a mesma disputa de braço lida nas duas direções — dobrar ou esticar.",
  "32 — Quebra de pegada no armlock da montada":
    "Ele juntou as mãos: a quebra vem do corpo, não do bíceps. Gira o quadril, apoia o pé, e puxa com as duas mãos contra o POLEGAR dele, que é o elo fraco da pegada. Polegar não segura contra corpo inteiro; braço contra braço, ele segura o dia todo.",
  "33 — Transição de meia guarda para meia montada":
    "Por cima na meia guarda, libera a perna presa e sobe o joelho até a linha do quadril dele. A meia montada é a estação intermediária que preserva a pressão — pular direto para a montada cheia é onde a maioria perde a posição.",
  "34 — Armlock da montada com variação para triângulo":
    "Da montada, se ele empurra com os braços, um braço dentro e um fora abre o armlock; se ele retira o braço para se defender, o mesmo ângulo abre o triângulo. É o dilema clássico da montada: defender de um lado entrega o outro.",
  "35 — Chave de pé reta da one leg":
    "Da one leg o pé dele já está entre as suas pernas: prende o calcanhar na dobra do braço, junta as mãos e ESTENDE O QUADRIL. A força vem do quadril, não do braço — é onde a raspagem e a finalização são o mesmo movimento.",
  "36 — Defesa de chave de pé reta":
    "Gira a perna presa na direção do dedão, o que tira o dorso do pé da linha da alavanca, e ao mesmo tempo senta em direção a ele, empurra o joelho dele e puxa o calcanhar para fora. A defesa é imediata: esperar para ver se dói é como se perde pé.",

  /* ---------------- Azul → Roxa: drills ---------------- */

  "Ataques das costas com armlock e triângulo":
    "Das costas, quando ele defende o pescoço com os braços, são os braços que viram alvo: um braço em cima e um embaixo abre o armlock; os dois defendendo em cima abre o triângulo por trás. O drill é encadear — ele defende o estrangulamento e você já está no ataque seguinte, sem parar para pensar.",
  "Passagem de guarda com braço por baixo do oponente, finalizando kimura e violino":
    "O mesmo braço por baixo serve para passar e para finalizar: se o braço dele fica exposto, kimura; se a lapela está disponível, o violino — o estrangulamento feito de cima, com o braço por baixo do pescoço e a mão puxando a lapela, na posição de quem segura um violino. O drill treina a não largar o under-hook para passar.",
  "Abertura de guarda com as 3 passagens (joelho com joelho, long step, montada)":
    "Uma abertura só, três saídas: joelho com joelho (o joelho corta por dentro), long step (o passo grande girando por trás) e a montada direta. O ponto do drill é que a abertura não muda — o que escolhe a passagem é a reação dele, não a sua preferência.",
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

  /* ---------------- Azul → Roxa ---------------- */

  "01 — Reposição dos 100 kg para guarda fechada (para fora), meia emborcada × 02 — Reposição de meia guarda para guarda fechada":
    "As duas voltam para a guarda fechada, de dívidas diferentes. Da 100 kg você não tem NADA preso dele e precisa primeiro sair da linha do peso — a virada vem antes do joelho. Da meia guarda você já tem uma perna dele, e o que falta é o frame: com under-hook ou antebraço, o joelho entra; sem, ele acompanha o quadril. Uma é escapar e depois recompor; a outra é recompor a partir do que já se tem.",
  "17 — Triângulo partindo do overhook (esgrima atrás da axila) × 18 — Defesa de triângulo para double under":
    "É o mesmo triângulo dos dois lados. O overhook cria a condição (um braço dentro, um fora) sem quebrar postura; a defesa desfaz exatamente essa condição levantando o quadril com as duas mãos por baixo das coxas. Treinar as duas juntas ensina o momento exato em que o triângulo deixa de ser defensável — que é antes do que quase todo mundo pensa.",
  "03 — Drill toureada (passagem de guarda) × 04 — Passagem de guarda aberta (over under)":
    "Duas passagens com filosofias opostas. A toureada é de MOVIMENTO: joga as pernas para um lado e passa pelo outro, e se ele recompõe você joga de novo. A over under é de PRESSÃO: você não vai para lugar nenhum rápido, caminha o ombro e mata o quadril. Contra guardeiro ágil a toureada cansa você; contra guardeiro forte a over under demora mas chega.",
  "07 — Armlock da guarda fechada com pêndulo × 10 — Raspagem kimura da guarda fechada":
    "As duas saem da guarda fechada atacando um braço, e as duas usam a defesa dele como matéria-prima. No armlock o pêndulo gera o giro do quadril; na raspagem kimura a mão que ele posta no chão para salvar o ombro é a base que você tira. É a mesma ideia: pegar o braço não é para finalizar, é para forçar uma escolha.",
  "11 — Ida para as costas da guarda fechada (cruzando a manga) × 15 — Saída das costas terminando na guarda fechada":
    "É o mesmo caminho percorrido nos dois sentidos, e por isso valem juntas. Cruzar a manga trava o braço na frente e abre a linha das costas; escapar é exatamente desfazer isso — pescoço primeiro, quadril para o lado do braço que estrangula, tirar o gancho. Quem sabe montar sabe onde ela quebra.",
  "13 — Raspagem de meia guarda para single leg × 14 — Raspagem de guarda aranha com oponente de joelho":
    "As duas raspam contra um adversário ajoelhado, com motores diferentes. A da meia guarda precisa do under-hook e ataca a perna livre — é briga de corpo colado. A da aranha não encosta: o desequilíbrio vem da diferença de tensão entre uma perna esticada e outra recolhida. Uma é força estruturada; a outra é alavanca à distância.",
  "35 — Chave de pé reta da one leg × 36 — Defesa de chave de pé reta":
    "Ataque e defesa da mesma perna. O ataque prende o calcanhar na dobra do braço e estende o QUADRIL; a defesa gira na direção do dedão para tirar o dorso do pé da alavanca e puxa o calcanhar antes que o quadril estenda. As duas são disputas de tempo, e nas duas quem espera perde.",
  "31 — Americana da montada para armlock × 32 — Quebra de pegada no armlock da montada":
    "As duas são a mesma disputa de braço na montada, de lados opostos. Você ataca dobrando (americana) e, se ele estica, troca para o armlock; ele se defende juntando as mãos, e a quebra vem de girar o quadril e puxar contra o polegar — nunca braço contra braço. Saber quebrar a pegada é saber por que ele juntou as mãos.",
  "22 — Transição de meia guarda para meia guarda profunda × 33 — Transição de meia guarda para meia montada":
    "Mesma posição de partida, sentidos contrários. A profunda é de QUEM ESTÁ EMBAIXO: mergulha o ombro e vai para debaixo do centro de gravidade dele. A meia montada é de QUEM ESTÁ EM CIMA: libera a perna e sobe o joelho na linha do quadril. Estudar as duas é entender a meia guarda como posição em disputa, não como posição de defesa.",
  "25 — Passagem de guarda partindo do double under × 26 — Passagem de guarda aranha (dominando a barra da calça)":
    "Duas passagens que atacam camadas diferentes. A double under já assume o quadril levantado e é uma questão de CAMINHAR até o ombro ultrapassar o joelho. A da aranha nem começou: primeiro se domina a barra da calça para desmontar o controle: só depois existe passagem, e ela vira uma passagem aberta comum.",
  "19 — Raspagem de guarda borboleta para montada × 23 — Raspagem de guarda X":
    "As duas raspam tirando a base, com ferramentas diferentes. A borboleta LEVANTA — o gancho tira o quadril dele do chão e por isso dá para montar direto no fim do giro. A X ESTICA — as duas pernas em direções opostas cortam o apoio para o lado. Uma sobe o adversário, a outra o desmonta no lugar.",
  "20 — Armlock do joelho na barriga × 34 — Armlock da montada com variação para triângulo":
    "Os dois armlocks nascem do que ele faz para tirar você de cima. No joelho na barriga é o empurrão no seu joelho que entrega o braço, e você gira por cima da cabeça. Na montada é o empurrão nos seus quadris, e aí armlock e triângulo são o mesmo ângulo: se ele retira o braço para salvar o cotovelo, entrega o pescoço.",
  "29 — Saída do armlock girando (pedindo carona) × 30 — Kimura dos 100 kg com variação para armlock":
    "Uma é escapar do armlock, a outra é entrar nele — e juntas ensinam onde está a janela. A saída só existe ANTES de o braço esticar: gira no sentido do polegar e passa por cima. A kimura da 100 kg força o braço a esticar, que é justamente o instante em que a saída deixa de estar disponível.",
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

/**
 * As posições da roxa pedem mais que descrição.
 *
 * Na azul a maior parte do syllabus é vocabulário — o que é, como se faz. Na
 * roxa quase toda posição é uma resposta a alguma coisa que o adversário fez,
 * então as perguntas cobram o PORQUÊ: o detalhe que faz funcionar, a reação
 * dele que abre a posição, e o que acontece quando falha.
 */
const TEMPLATES_POSICAO: Template[] = [
  (item) => `Descreva ${item}: pegada, sequência e o detalhe que faz funcionar.`,
  (item) => `${item} — qual o erro mais comum, e o que ele custa?`,
  (item) => `Em que reação do adversário ${item} se abre?`,
  (item) => `${item}: se não der certo, onde você fica e o que faz em seguida?`,
  (item) => `Por que ${item} funciona? Explique a alavanca, não os passos.`,
];

const TEMPLATES_POSICAO_COMPARAR: TemplateComparar[] = [
  (a, b) => `Qual a diferença entre ${a} e ${b}?`,
  (a, b) => `Como ${a} e ${b} se conectam? Em que momento você escolhe uma ou outra?`,
];

const TEMPLATES_DRILL: Template[] = [
  (item) => `${item} — o que exatamente esse drill treina, além dos movimentos?`,
  (item) => `Descreva o drill "${item}" e a ordem em que as coisas acontecem.`,
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
 * Uma categoria em que parte dos itens vira comparação e o resto vira
 * descrição — cada par cobre DUAS técnicas de uma vez, e nenhuma técnica da
 * lista fica de fora.
 *
 * Era só das projeções; virou genérica quando a roxa passou a usar o mesmo
 * arranjo em dois blocos. A regra que sustenta a contagem fixa continua a
 * mesma: `pares` tem que ser disjunto dentro de si — uma técnica em dois
 * pares faria a cobertura variar por semente.
 */
function perguntasComPares(
  categoria: Categoria,
  itens: string[],
  pares: [string, string][],
  quantosPares: number,
  templatesDescrever: Template[],
  templatesComparar: TemplateComparar[],
  aleatorio: () => number,
): Pergunta[] {
  const escolhidos = embaralhar(pares, aleatorio).slice(0, quantosPares);
  const cobertas = new Set(escolhidos.flat());

  const comparacoes: Pergunta[] = escolhidos.map(([a, b]) => {
    const item = `${a} × ${b}`;
    return {
      id: gerarId(aleatorio),
      categoria,
      item,
      pergunta: escolher(templatesComparar, aleatorio)(a, b),
      gabarito: GABARITO_PAR[item] ?? "",
      resposta: "",
      respondida: false,
      acertou: null,
    };
  });

  const descricoes = perguntasDaCategoriaSimples(
    categoria,
    itens.filter((p) => !cobertas.has(p)),
    templatesDescrever,
    aleatorio,
  );

  return embaralhar([...comparacoes, ...descricoes], aleatorio);
}

/** Quantas perguntas `perguntasComPares` produz — sem gerar nada. */
function contagemComPares(
  itens: string[],
  pares: [string, string][],
  quantosPares: number,
): number {
  const usados = Math.min(quantosPares, pares.length);
  return usados + (itens.length - 2 * usados);
}

/**
 * Os blocos de posição que cada escopo da roxa cobra. `null` quer dizer que
 * aquele escopo não existe para aquela faixa.
 */
function blocosDaRoxa(escopo: string): string[][] | null {
  switch (escopo) {
    case "1º e 2º grau":
      return [ROXA_PRIMEIRO_BLOCO];
    case "3º e 4º grau":
      return [ROXA_SEGUNDO_BLOCO];
    case ESCOPO_FAIXA:
      return [ROXA_PRIMEIRO_BLOCO, ROXA_SEGUNDO_BLOCO];
    default:
      return null;
  }
}

const PARES_DO_BLOCO = new Map<string[], [string, string][]>([
  [ROXA_PRIMEIRO_BLOCO, PARES_ROXA_PRIMEIRO],
  [ROXA_SEGUNDO_BLOCO, PARES_ROXA_SEGUNDO],
]);

/**
 * Gera o exame para a faixa-alvo e o escopo pedidos.
 *
 * Retorna `null` quando não há syllabus para aquela transição, ou quando o
 * escopo não existe naquela faixa. Chamar duas vezes com a mesma semente
 * produz exatamente o mesmo exame; sementes diferentes embaralham tudo.
 */
export function gerarExame(
  faixaAlvo: FaixaAlvo,
  semente: number,
  escopo: string = escopoPadrao(faixaAlvo),
): Pergunta[] | null {
  if (!escoposDaFaixa(faixaAlvo)?.includes(escopo)) return null;

  const aleatorio = criarGerador(semente);

  if (faixaAlvo === "Azul") {
    return [
      ...perguntasDaCategoriaSimples("defesas", DEFESAS_NUMERADAS, TEMPLATES_DEFESA, aleatorio),
      ...perguntasDaCategoriaSimples("cambalhotas", CAMBALHOTAS, TEMPLATES_CAMBALHOTA, aleatorio),
      ...perguntasDaCategoriaSimples("posturas", POSTURAS, TEMPLATES_POSTURA, aleatorio),
      ...perguntasComPares(
        "projecoes",
        PROJECOES,
        PARES_PROJECAO,
        PARES_USADOS_POR_EXAME,
        TEMPLATES_PROJECAO_DESCREVER,
        TEMPLATES_PROJECAO_COMPARAR,
        aleatorio,
      ),
      ...perguntasDaCategoriaSimples("quedas", QUEDAS, TEMPLATES_QUEDA, aleatorio),
    ];
  }

  const blocos = blocosDaRoxa(escopo);
  if (!blocos) return null;

  const posicoes = blocos.flatMap((bloco) =>
    perguntasComPares(
      "posicoes",
      bloco,
      PARES_DO_BLOCO.get(bloco) ?? [],
      PARES_ROXA_POR_BLOCO,
      TEMPLATES_POSICAO,
      TEMPLATES_POSICAO_COMPARAR,
      aleatorio,
    ),
  );

  // Os drills só no exame de faixa — ver a nota no topo sobre por quê.
  const drills =
    escopo === ESCOPO_FAIXA
      ? perguntasDaCategoriaSimples("drills", ROXA_DRILLS, TEMPLATES_DRILL, aleatorio)
      : [];

  return [...posicoes, ...drills];
}

/**
 * Quantas perguntas um exame teria — para mostrar antes de gerar, sem gerar.
 *
 * Só é um número fixo porque toda lista de pares é disjunta dentro do próprio
 * bloco: as comparações cobrem sempre o dobro de técnicas únicas, e o resto
 * vira descrição, sem variação por semente.
 */
export function contagemDoExame(
  faixaAlvo: FaixaAlvo,
  escopo: string = escopoPadrao(faixaAlvo),
): number | null {
  if (!escoposDaFaixa(faixaAlvo)?.includes(escopo)) return null;

  if (faixaAlvo === "Azul") {
    return (
      DEFESAS_NUMERADAS.length +
      CAMBALHOTAS.length +
      POSTURAS.length +
      contagemComPares(PROJECOES, PARES_PROJECAO, PARES_USADOS_POR_EXAME) +
      QUEDAS.length
    );
  }

  const blocos = blocosDaRoxa(escopo);
  if (!blocos) return null;

  const posicoes = blocos.reduce(
    (soma, bloco) =>
      soma + contagemComPares(bloco, PARES_DO_BLOCO.get(bloco) ?? [], PARES_ROXA_POR_BLOCO),
    0,
  );
  return posicoes + (escopo === ESCOPO_FAIXA ? ROXA_DRILLS.length : 0);
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
  /**
   * Certas sobre o TOTAL do exame, não sobre o que já foi conferido.
   *
   * É a leitura honesta: uma pergunta em branco não é uma pergunta certa, e
   * mostrar 100% para quem conferiu duas de trinta seria um número bonito e
   * mentiroso. `null` só quando o exame não tem pergunta nenhuma.
   */
  aproveitamento: number | null;
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
    aproveitamento: null,
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

  if (resumo.total > 0) resumo.aproveitamento = resumo.certas / resumo.total;

  return resumo;
}

export interface VereditoDoExame {
  /** A nota de corte da folha, em fração. */
  minimo: number;
  /** O exame inteiro já foi conferido? Sem isso não há veredito, só parcial. */
  fechado: boolean;
  /** `null` enquanto sobrar pergunta em branco ou por conferir. */
  aprovado: boolean | null;
  /** Quantas certas ainda faltam para bater o mínimo. 0 = já bateu. */
  faltamParaPassar: number;
}

/**
 * O veredito contra a nota de corte da folha — quando existe uma.
 *
 * Retorna `null` para faixas cuja folha não trazia percentual (a da azul não
 * trazia): inventar 70% ali seria inventar a regra da academia, que é
 * exatamente o que este arquivo se recusa a fazer com o conteúdo.
 *
 * `aprovado` fica em `null` enquanto houver pergunta em branco ou por
 * conferir. Não é preciosismo: dizer "reprovado" para quem respondeu metade é
 * dizer algo falso, e dizer "aprovado" antes do fim é pior ainda.
 */
export function vereditoDoExame(
  resumo: ResumoDoExame,
  faixaAlvo: FaixaAlvo,
): VereditoDoExame | null {
  const minimo = aprovacaoMinima(faixaAlvo);
  if (minimo === null || resumo.total === 0) return null;

  const fechado = resumo.porConferir === 0 && resumo.emBranco === 0;
  const precisa = Math.ceil(minimo * resumo.total);

  return {
    minimo,
    fechado,
    aprovado: fechado ? resumo.certas >= precisa : null,
    faltamParaPassar: Math.max(0, precisa - resumo.certas),
  };
}
