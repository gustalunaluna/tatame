/**
 * A dieta — a conta, e só a conta.
 *
 * Módulo sem import nenhum, pelo mesmo motivo de `cartel.ts` e
 * `hexagono-derivado.ts`: o que é aritmética fica testável sem navegador e sem
 * sessão. `dieta-storage.ts` cuida do banco e chama isto aqui; o teste chama
 * isto direto.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTE ARQUIVO NÃO É
 * ---------------------------------------------------------------------------
 * Não é uma medição. Caloria gasta em treino é ESTIMATIVA, e a margem é larga:
 * dois atletas do mesmo peso na mesma aula gastam diferente, e a mesma pessoa
 * gasta diferente em dois dias. O que está aqui é a melhor conta que dá para
 * fazer sem calorímetro, com as fontes anotadas — e a tela precisa dizer isso,
 * senão o número vira uma verdade que ele não é.
 *
 * O valor de verdade deste módulo não é o número de hoje: é a TENDÊNCIA. Peso
 * médio subindo com balanço fechado quer dizer que a conta está errada para
 * ESTE corpo, e aí quem manda é a balança, não a fórmula.
 */

/* ========================================================================== */
/* Tipos                                                                      */
/* ========================================================================== */

export type Sexo = "masculino" | "feminino";

export type Objetivo = "secar" | "manter" | "ganhar";

export const OBJETIVOS: {
  valor: Objetivo;
  nome: string;
  explicacao: string;
}[] = [
  {
    valor: "secar",
    nome: "Secar",
    explicacao: "Baixar de categoria ou tirar gordura sem perder força.",
  },
  {
    valor: "manter",
    nome: "Manter",
    explicacao: "Ficar no peso e treinar. O padrão para quem já está na faixa.",
  },
  {
    valor: "ganhar",
    nome: "Ganhar",
    explicacao: "Subir massa. Exige superávit e trabalho de força junto.",
  },
];

/** Como o dia se divide. Texto livre no banco — esta é a lista sugerida. */
export const MOMENTOS = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Pré-treino",
  "Pós-treino",
  "Jantar",
  "Ceia",
] as const;

export interface PerfilDaDieta {
  alturaCm: number;
  /** `null` enquanto a pessoa não respondeu. A basal não sai sem isto. */
  sexo: Sexo | null;
  objetivo: Objetivo;
  /** Sobrescreve a meta calculada. `null` = usa o cálculo. */
  metaKcal: number | null;
  /** Idem para os macros, em gramas. Cada um vale por si. */
  metaProteinaG: number | null;
  metaCarboidratoG: number | null;
  metaGorduraG: number | null;
  /** Meta de água do dia, em ml. `null` = calcula pelo peso e pelo treino. */
  metaAguaMl: number | null;
}

export interface Pesagem {
  id: string;
  data: string; // ISO yyyy-mm-dd
  pesoKg: number;
  gorduraPct: number | null;
  nota: string;
}

export type NovaPesagem = Omit<Pesagem, "id">;

export interface Refeicao {
  id: string;
  data: string; // ISO yyyy-mm-dd
  momento: string;
  alimento: string;
  /** Como foi medido: "2 conchas", "150 g", "1 unidade". Texto livre. */
  porcao: string;
  kcal: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
  /**
   * Qual item do cardápio esta refeição responde. `null` = comeu fora do plano.
   *
   * É este campo que faz o check diário funcionar sem duplicar dado: a
   * refeição continua sendo a única verdade sobre o que entrou na boca, e o
   * vínculo só diz a que pergunta ela respondeu.
   */
  itemDoCardapioId: string | null;
}

export type NovaRefeicao = Omit<Refeicao, "id">;

/** O treino, reduzido ao que a conta de caloria precisa dele. */
export interface TreinoParaConta {
  date: string;
  durationMin: number;
  rolls: number;
}

export interface Macros {
  kcal: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
}

/* ========================================================================== */
/* Metabolismo basal                                                          */
/* ========================================================================== */

/**
 * Mifflin-St Jeor (1990), que é a equação que as diretrizes clínicas usam
 * hoje para quem não é atleta de elite nem obeso mórbido. Erra menos que a
 * Harris-Benedict, que é de 1919 e superestima.
 *
 *   homem:   10·kg + 6,25·cm − 5·idade + 5
 *   mulher:  10·kg + 6,25·cm − 5·idade − 161
 */
export function taxaBasal(
  sexo: Sexo,
  pesoKg: number,
  alturaCm: number,
  idade: number,
): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade;
  return Math.round(base + (sexo === "masculino" ? 5 : -161));
}

/** Idade em anos completos numa data. `null` quando não dá para saber. */
export function idadeEm(nascimento: string | null, referencia: string): number | null {
  if (!nascimento) return null;
  const [an, mn, dn] = nascimento.split("-").map(Number);
  const [ar, mr, dr] = referencia.split("-").map(Number);
  if (!an || !ar) return null;
  let anos = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) anos -= 1;
  return anos >= 0 && anos < 130 ? anos : null;
}

/* ========================================================================== */
/* Gasto do treino                                                            */
/* ========================================================================== */

/**
 * Os METs vêm do Compendium of Physical Activities (Ainsworth, 2011):
 *
 *   15675  artes marciais / jiu-jitsu, ritmo moderado ....... 5,3
 *   15676  artes marciais / jiu-jitsu, ritmo vigoroso ...... 10,3
 *
 * A aula não tem um MET só. Técnica e drill são o ritmo moderado; a rola é o
 * vigoroso — e a diferença entre os dois é quase o dobro, grande demais para
 * ser arredondada num número médio. Por isso a conta separa os dois blocos.
 */
export const MET_TECNICA = 5.3;
export const MET_ROLA = 10.3;

/** Uma rola de 5 minutos mais a troca de parceiro. */
export const MINUTOS_POR_ROLA = 6;

/**
 * Fator de vida: o que o corpo gasta ACORDADO E FORA DO TREINO — digerir,
 * andar até o trabalho, existir de pé. 1,2 é o "sedentário" das tabelas, e é
 * o certo aqui de propósito: o treino entra separado, medido, logo abaixo.
 * Usar 1,55 ("moderadamente ativo") e ainda somar o treino é o erro clássico
 * dos aplicativos de dieta — conta o mesmo esforço duas vezes.
 */
export const FATOR_VIDA = 1.2;

export interface GastoDoTreino {
  minutosDeRola: number;
  minutosDeTecnica: number;
  kcal: number;
}

/**
 * A fórmula do MET é `kcal/min = MET · 3,5 · kg / 200`.
 *
 * Só que ela já inclui o repouso: um MET É o repouso. Como a basal deste
 * módulo já cobre as 24 horas do dia, somar o valor cheio contaria o repouso
 * do horário do treino duas vezes. Por isso `MET − 1`: o que se soma aqui é
 * só o que o treino gastou A MAIS do que ficar parado.
 */
function kcalPorMet(met: number, pesoKg: number, minutos: number): number {
  return ((met - 1) * 3.5 * pesoKg * minutos) / 200;
}

export function gastoDoTreino(t: TreinoParaConta, pesoKg: number): GastoDoTreino {
  const duracao = Math.max(0, t.durationMin);
  const minutosDeRola = Math.min(duracao, Math.max(0, t.rolls) * MINUTOS_POR_ROLA);
  const minutosDeTecnica = duracao - minutosDeRola;
  return {
    minutosDeRola,
    minutosDeTecnica,
    kcal: Math.round(
      kcalPorMet(MET_ROLA, pesoKg, minutosDeRola) +
        kcalPorMet(MET_TECNICA, pesoKg, minutosDeTecnica),
    ),
  };
}

export interface GastoDoDia {
  basal: number;
  /** O fator de vida, já descontada a basal — para a tela poder mostrar os três. */
  vida: number;
  treino: number;
  total: number;
  minutosTreinados: number;
}

export function gastoDoDia(
  treinos: TreinoParaConta[],
  pesoKg: number,
  basal: number,
): GastoDoDia {
  const treino = treinos.reduce((n, t) => n + gastoDoTreino(t, pesoKg).kcal, 0);
  const vida = Math.round(basal * (FATOR_VIDA - 1));
  return {
    basal,
    vida,
    treino,
    total: basal + vida + treino,
    minutosTreinados: treinos.reduce((n, t) => n + Math.max(0, t.durationMin), 0),
  };
}

/** Os treinos de um dia. A lista vem do diário inteira e é filtrada aqui. */
export function treinosDoDia<T extends { date: string }>(
  treinos: T[],
  data: string,
): T[] {
  return treinos.filter((t) => t.date === data);
}

/* ========================================================================== */
/* Metas                                                                      */
/* ========================================================================== */

/**
 * Quanto se tira ou se põe sobre o gasto.
 *
 * −15% para secar, e não −25%: quem treina jiu-jitsu cinco vezes por semana e
 * corta um quarto das calorias não fica seco, fica sem rola. Déficit agressivo
 * come massa magra e derruba a recuperação, e o preço aparece justamente no
 * treino difícil, que é o que faz a diferença.
 */
export const AJUSTE_DO_OBJETIVO: Record<Objetivo, number> = {
  secar: -0.15,
  manter: 0,
  ganhar: 0.1,
};

export function metaDeCalorias(
  objetivo: Objetivo,
  gastoTotal: number,
  override: number | null,
): number {
  if (override !== null && override > 0) return override;
  return Math.round(gastoTotal * (1 + AJUSTE_DO_OBJETIVO[objetivo]));
}

/**
 * Proteína por quilo de peso.
 *
 * 2,2 g/kg secando é de propósito mais alto que os 1,8 de manutenção: é em
 * déficit que a proteína protege a massa magra. Os números seguem a faixa das
 * revisões de atletas de força e combate (1,6–2,4 g/kg).
 */
export const PROTEINA_POR_KG: Record<Objetivo, number> = {
  secar: 2.2,
  manter: 1.8,
  ganhar: 2.0,
};

/** Gordura como fração das calorias. Abaixo de 20% mexe com hormônio. */
export const FRACAO_DE_GORDURA = 0.25;

/** As metas escritas na mão. `null` em qualquer uma = o app calcula aquela. */
export interface MetasManuais {
  kcal: number | null;
  proteinaG: number | null;
  carboidratoG: number | null;
  gorduraG: number | null;
}

export const SEM_METAS_MANUAIS: MetasManuais = {
  kcal: null,
  proteinaG: null,
  carboidratoG: null,
  gorduraG: null,
};

/**
 * Cada macro pode ser escrito na mão ou calculado, independentemente dos
 * outros — quem tem nutricionista costuma receber os quatro números prontos,
 * e quem não tem quer só travar a proteína.
 *
 * O carboidrato continua sendo o que sobra QUANDO ninguém o escreveu: proteína
 * e gordura têm piso fisiológico e ele não tem. Escrito na mão, ele manda — e
 * aí a soma dos três pode não bater com a meta de caloria. Isso é de propósito:
 * quem escreveu os quatro números quer os quatro números, não uma correção
 * automática que ele não pediu. Quem confere a soma é a tela, avisando.
 */
export function metasDeMacro(
  objetivo: Objetivo,
  pesoKg: number,
  metaKcal: number,
  manuais: MetasManuais = SEM_METAS_MANUAIS,
): Macros {
  const escrito = (n: number | null) => n !== null && n > 0;

  const proteinaG = escrito(manuais.proteinaG)
    ? manuais.proteinaG!
    : Math.round(PROTEINA_POR_KG[objetivo] * pesoKg);

  const gorduraG = escrito(manuais.gorduraG)
    ? manuais.gorduraG!
    : Math.round((metaKcal * FRACAO_DE_GORDURA) / 9);

  const carboidratoG = escrito(manuais.carboidratoG)
    ? manuais.carboidratoG!
    : Math.max(0, Math.round((metaKcal - proteinaG * 4 - gorduraG * 9) / 4));

  return { kcal: metaKcal, proteinaG, carboidratoG, gorduraG };
}

/** Quantas calorias os três macros somam. Serve para conferir metas escritas na mão. */
export function kcalDosMacros(m: Macros): number {
  return Math.round(m.proteinaG * 4 + m.carboidratoG * 4 + m.gorduraG * 9);
}

/* ========================================================================== */
/* Água                                                                       */
/* ========================================================================== */

/** Base de manutenção: 35 ml por quilo é a referência para adulto ativo. */
export const AGUA_POR_KG = 35;

/**
 * Reposição de treino, por hora.
 *
 * O ACSM fala em 0,4 a 0,8 L por hora de exercício, e a faixa é larga porque
 * depende de calor, roupa e de quanto a pessoa sua. Jiu-jitsu de kimono num
 * tatame sem ar-condicionado fica na parte de cima dessa faixa; 600 ml/h é o
 * meio, e a tela deixa escrever outro número.
 */
export const AGUA_POR_HORA_DE_TREINO = 600;

export function metaDeAgua(
  pesoKg: number,
  minutosTreinados: number,
  override: number | null,
): number {
  if (override !== null && override > 0) return override;
  const base = pesoKg * AGUA_POR_KG;
  const reposicao = (Math.max(0, minutosTreinados) / 60) * AGUA_POR_HORA_DE_TREINO;
  // Arredonda para 50 ml: ninguém bebe 2 697 ml, e um número desses na tela
  // finge uma precisão que a recomendação não tem.
  return Math.round((base + reposicao) / 50) * 50;
}

/** Os tamanhos que um toque adiciona. Copo, garrafinha, garrafa. */
export const GOLES_ML = [250, 500, 750] as const;

/* ========================================================================== */
/* O cardápio                                                                 */
/* ========================================================================== */

/**
 * Um item do cardápio: o que ESTÁ PLANEJADO comer naquele momento do dia.
 *
 * A diferença entre isto e `Refeicao` é a diferença entre plano e fato, e ela
 * é o motivo de as duas coisas serem tabelas separadas. O cardápio é escrito
 * uma vez e vale todos os dias; a refeição é o que aconteceu num dia. Guardar
 * as duas na mesma tabela obrigaria a copiar o cardápio inteiro para cada dia
 * do calendário — inclusive os dias que ainda não chegaram.
 */
export interface ItemDoCardapio {
  id: string;
  momento: string;
  alimento: string;
  porcao: string;
  kcal: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
  ordem: number;
}

export type NovoItemDoCardapio = Omit<ItemDoCardapio, "id">;

/**
 * Como um item do cardápio terminou o dia.
 *
 *   "aberto"     ainda não foi comido (ou não foi marcado)
 *   "comido"     comeu o que estava planejado
 *   "trocado"    comeu outra coisa no lugar — o que entrou está em `substituto`
 *
 * "Trocado" não é uma falha. É o caso normal: a marmita acabou, o restaurante
 * fechou, alguém trouxe bolo. Um app que só oferece "comi" e "não comi"
 * empurra a pessoa a mentir no primeiro dia em que a vida não seguiu o plano.
 */
export type SituacaoDoItem = "aberto" | "comido" | "trocado";

export interface ItemNoDia {
  item: ItemDoCardapio;
  situacao: SituacaoDoItem;
  /** A refeição que resolveu este item, quando houve. */
  registro: Refeicao | null;
}

/**
 * Cruza o cardápio com o que foi de fato registrado no dia.
 *
 * O vínculo vem de `Refeicao.itemDoCardapioId`: é ele que diz "esta refeição
 * é a resposta àquele item", e é o que permite trocar sem perder a conta de
 * quais momentos do dia já foram resolvidos.
 *
 * O que separa "comido" de "trocado" é o NOME. Comparar caloria não serviria
 * (dois alimentos diferentes podem ter a mesma), e comparar o id do item
 * também não — ele é o mesmo nos dois casos, já que é ele quem liga as duas
 * linhas.
 */
export function cardapioNoDia(
  cardapio: ItemDoCardapio[],
  refeicoes: Refeicao[],
): ItemNoDia[] {
  const porItem = new Map<string, Refeicao>();
  for (const r of refeicoes) {
    if (r.itemDoCardapioId) porItem.set(r.itemDoCardapioId, r);
  }

  return [...cardapio]
    .sort((a, b) => ordemDoMomento(a) - ordemDoMomento(b) || a.ordem - b.ordem)
    .map((item) => {
      const registro = porItem.get(item.id) ?? null;
      if (!registro) return { item, situacao: "aberto" as const, registro: null };
      const igual =
        registro.alimento.trim().toLowerCase() === item.alimento.trim().toLowerCase();
      return { item, situacao: igual ? ("comido" as const) : ("trocado" as const), registro };
    });
}

/** O que o cardápio inteiro somaria, se o dia saísse exatamente como planejado. */
export function somarCardapio(cardapio: ItemDoCardapio[]): Macros {
  return cardapio.reduce<Macros>(
    (soma, i) => ({
      kcal: soma.kcal + i.kcal,
      proteinaG: soma.proteinaG + i.proteinaG,
      carboidratoG: soma.carboidratoG + i.carboidratoG,
      gorduraG: soma.gorduraG + i.gorduraG,
    }),
    { kcal: 0, proteinaG: 0, carboidratoG: 0, gorduraG: 0 },
  );
}

/** As refeições que NÃO respondem a nenhum item do cardápio — o que saiu do plano. */
export function foraDoCardapio(refeicoes: Refeicao[]): Refeicao[] {
  return refeicoes.filter((r) => !r.itemDoCardapioId);
}

/** Agrupa os itens do dia por momento, na ordem do dia. */
export function cardapioPorMomento(itens: ItemNoDia[]): [string, ItemNoDia[]][] {
  const grupos = new Map<string, ItemNoDia[]>();
  for (const i of itens) {
    const chave = i.item.momento || "Sem horário";
    grupos.set(chave, [...(grupos.get(chave) ?? []), i]);
  }
  return [...grupos.entries()];
}

function ordemDoMomento(i: { momento: string }): number {
  const pos = (MOMENTOS as readonly string[]).indexOf(i.momento);
  return pos === -1 ? MOMENTOS.length : pos;
}

/* ========================================================================== */
/* O que entrou                                                               */
/* ========================================================================== */

export function somarRefeicoes(refeicoes: Refeicao[]): Macros {
  return refeicoes.reduce<Macros>(
    (soma, r) => ({
      kcal: soma.kcal + r.kcal,
      proteinaG: soma.proteinaG + r.proteinaG,
      carboidratoG: soma.carboidratoG + r.carboidratoG,
      gorduraG: soma.gorduraG + r.gorduraG,
    }),
    { kcal: 0, proteinaG: 0, carboidratoG: 0, gorduraG: 0 },
  );
}

/** Agrupa o dia por momento, na ordem de MOMENTOS e com os avulsos no fim. */
export function porMomento(refeicoes: Refeicao[]): [string, Refeicao[]][] {
  const grupos = new Map<string, Refeicao[]>();
  for (const r of refeicoes) {
    const chave = r.momento || "Sem horário";
    grupos.set(chave, [...(grupos.get(chave) ?? []), r]);
  }
  const ordem = new Map<string, number>(MOMENTOS.map((m, i) => [m, i]));
  return [...grupos.entries()].sort(
    (a, b) =>
      (ordem.get(a[0]) ?? MOMENTOS.length) - (ordem.get(b[0]) ?? MOMENTOS.length),
  );
}

/* ========================================================================== */
/* Peso                                                                       */
/* ========================================================================== */

/**
 * O peso que vale para um dia: o da própria pesagem, ou a última ANTES dela.
 *
 * Ninguém pesa todo dia, e a conta de caloria não pode parar por isso. O que
 * ela não faz é olhar para a frente: usar a pesagem de amanhã para calcular a
 * basal de hoje seria reescrever o passado toda vez que ele subisse na balança.
 */
export function pesoEm(pesagens: Pesagem[], data: string): number | null {
  const ate = pesagens
    .filter((p) => p.data <= data)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  return ate.length ? ate[0].pesoKg : null;
}

export interface Tendencia {
  mediaRecente: number;
  mediaAnterior: number;
  /** Quilos por semana. Positivo = ganhando. */
  porSemana: number;
  amostrasRecentes: number;
  amostrasAnteriores: number;
}

function diasAntes(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * A tendência, que é a única leitura honesta de uma balança.
 *
 * O peso de um dia oscila 1 a 2 kg por água, sal, intestino e hora do dia — um
 * atleta de 77 kg pode "ganhar 1,5 kg" numa noite de macarrão sem ter ganhado
 * grama nenhuma de tecido. Por isso a conta compara a MÉDIA de duas janelas,
 * nunca dois pontos: o ruído se cancela, o que sobra é direção.
 *
 * `null` quando falta amostra numa das janelas — dizer "estável" sem dado é
 * pior que não dizer nada.
 */
export function tendenciaDePeso(
  pesagens: Pesagem[],
  ate: string,
  dias = 14,
): Tendencia | null {
  const inicioRecente = diasAntes(ate, dias);
  const inicioAnterior = diasAntes(ate, dias * 2);

  const recentes = pesagens.filter((p) => p.data > inicioRecente && p.data <= ate);
  const anteriores = pesagens.filter(
    (p) => p.data > inicioAnterior && p.data <= inicioRecente,
  );
  if (!recentes.length || !anteriores.length) return null;

  const media = (lista: Pesagem[]) =>
    lista.reduce((n, p) => n + p.pesoKg, 0) / lista.length;
  const mediaRecente = media(recentes);
  const mediaAnterior = media(anteriores);

  return {
    mediaRecente,
    mediaAnterior,
    porSemana: (mediaRecente - mediaAnterior) / (dias / 7),
    amostrasRecentes: recentes.length,
    amostrasAnteriores: anteriores.length,
  };
}

/**
 * IMC, com a ressalva de sempre: ele mede peso sobre altura, não composição.
 * Um faixa-preta de 1,80 m e 88 kg com 9% de gordura dá "sobrepeso" na tabela.
 * Está aqui porque é referência conhecida, não porque decide alguma coisa.
 */
export function imc(pesoKg: number, alturaCm: number): number {
  if (alturaCm <= 0) return 0;
  const m = alturaCm / 100;
  return pesoKg / (m * m);
}

/* ========================================================================== */
/* Tabela de alimentos                                                        */
/* ========================================================================== */

export interface Alimento {
  nome: string;
  /** A porção a que os números se referem. */
  medida: string;
  kcal: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
  /**
   * Etanol em gramas, quando houver.
   *
   * Existe porque álcool não é nenhum dos três macros e mesmo assim tem 7 kcal
   * por grama — quase o dobro do carboidrato. Numa lata de cerveja, dois terços
   * das calorias não aparecem em proteína, carboidrato nem gordura, e sem este
   * campo o número simplesmente não fecharia (foi o teste que pegou isso).
   *
   * Não vai para o banco: `refeicoes` guarda os três macros e a caloria total,
   * e a caloria total já inclui o álcool. Isto aqui é para a tabela fechar
   * consigo mesma.
   */
  alcoolG?: number;
  grupo: string;
}

/**
 * O básico do prato brasileiro, para não obrigar a digitar macro de arroz toda
 * segunda-feira. Valores de referência arredondados (base TACO/USDA) — servem
 * para estimar, não para pesquisa. Marca própria sempre ganha do que está aqui:
 * é para isso que os campos continuam editáveis depois de escolher.
 */
export const ALIMENTOS: Alimento[] = [
  // --- básicos do prato ---
  { nome: "Arroz branco cozido", medida: "100 g", kcal: 128, proteinaG: 2.5, carboidratoG: 28, gorduraG: 0.2, grupo: "Básicos" },
  { nome: "Arroz integral cozido", medida: "100 g", kcal: 124, proteinaG: 2.6, carboidratoG: 26, gorduraG: 1, grupo: "Básicos" },
  { nome: "Feijão carioca cozido", medida: "100 g", kcal: 76, proteinaG: 4.8, carboidratoG: 14, gorduraG: 0.5, grupo: "Básicos" },
  { nome: "Feijão preto cozido", medida: "100 g", kcal: 77, proteinaG: 4.5, carboidratoG: 14, gorduraG: 0.5, grupo: "Básicos" },
  { nome: "Macarrão cozido", medida: "100 g", kcal: 158, proteinaG: 5.8, carboidratoG: 31, gorduraG: 0.9, grupo: "Básicos" },
  { nome: "Batata inglesa cozida", medida: "100 g", kcal: 52, proteinaG: 1.2, carboidratoG: 12, gorduraG: 0.1, grupo: "Básicos" },
  { nome: "Batata doce cozida", medida: "100 g", kcal: 77, proteinaG: 0.6, carboidratoG: 18, gorduraG: 0.1, grupo: "Básicos" },
  { nome: "Mandioca cozida", medida: "100 g", kcal: 125, proteinaG: 0.6, carboidratoG: 30, gorduraG: 0.3, grupo: "Básicos" },
  { nome: "Farofa pronta", medida: "50 g", kcal: 200, proteinaG: 1.5, carboidratoG: 30, gorduraG: 8, grupo: "Básicos" },
  { nome: "Tapioca (goma)", medida: "60 g", kcal: 210, proteinaG: 0, carboidratoG: 52, gorduraG: 0, grupo: "Básicos" },
  { nome: "Cuscuz de milho", medida: "100 g", kcal: 113, proteinaG: 2.2, carboidratoG: 25, gorduraG: 0.6, grupo: "Básicos" },

  // --- proteína animal ---
  { nome: "Peito de frango grelhado", medida: "100 g", kcal: 165, proteinaG: 31, carboidratoG: 0, gorduraG: 3.6, grupo: "Proteína" },
  { nome: "Coxa de frango assada (sem pele)", medida: "100 g", kcal: 177, proteinaG: 25, carboidratoG: 0, gorduraG: 8, grupo: "Proteína" },
  { nome: "Patinho moído refogado", medida: "100 g", kcal: 219, proteinaG: 27, carboidratoG: 0, gorduraG: 12, grupo: "Proteína" },
  { nome: "Alcatra grelhada", medida: "100 g", kcal: 205, proteinaG: 31, carboidratoG: 0, gorduraG: 8.5, grupo: "Proteína" },
  { nome: "Picanha grelhada", medida: "100 g", kcal: 290, proteinaG: 26, carboidratoG: 0, gorduraG: 20, grupo: "Proteína" },
  { nome: "Lombo de porco assado", medida: "100 g", kcal: 210, proteinaG: 28, carboidratoG: 0, gorduraG: 10, grupo: "Proteína" },
  { nome: "Tilápia grelhada", medida: "100 g", kcal: 128, proteinaG: 26, carboidratoG: 0, gorduraG: 2.7, grupo: "Proteína" },
  { nome: "Salmão grelhado", medida: "100 g", kcal: 208, proteinaG: 22, carboidratoG: 0, gorduraG: 13, grupo: "Proteína" },
  { nome: "Atum em água (lata)", medida: "1 lata (120 g)", kcal: 130, proteinaG: 29, carboidratoG: 0, gorduraG: 1, grupo: "Proteína" },
  { nome: "Ovo cozido", medida: "1 unidade (50 g)", kcal: 72, proteinaG: 6.3, carboidratoG: 0.4, gorduraG: 5, grupo: "Proteína" },
  { nome: "Ovo frito", medida: "1 unidade", kcal: 105, proteinaG: 6.3, carboidratoG: 0.4, gorduraG: 8.5, grupo: "Proteína" },
  { nome: "Clara de ovo", medida: "1 unidade (33 g)", kcal: 17, proteinaG: 3.6, carboidratoG: 0.2, gorduraG: 0, grupo: "Proteína" },

  // --- laticínio ---
  { nome: "Leite integral", medida: "200 ml", kcal: 124, proteinaG: 6.4, carboidratoG: 9.6, gorduraG: 6.4, grupo: "Laticínio" },
  { nome: "Leite desnatado", medida: "200 ml", kcal: 68, proteinaG: 6.6, carboidratoG: 9.8, gorduraG: 0.2, grupo: "Laticínio" },
  { nome: "Iogurte natural integral", medida: "170 g", kcal: 105, proteinaG: 6, carboidratoG: 8, gorduraG: 5.5, grupo: "Laticínio" },
  { nome: "Iogurte grego zero", medida: "130 g", kcal: 80, proteinaG: 13, carboidratoG: 6, gorduraG: 0, grupo: "Laticínio" },
  { nome: "Queijo minas frescal", medida: "50 g", kcal: 132, proteinaG: 8.6, carboidratoG: 1.6, gorduraG: 10, grupo: "Laticínio" },
  { nome: "Queijo mussarela", medida: "1 fatia (20 g)", kcal: 60, proteinaG: 4.5, carboidratoG: 0.5, gorduraG: 4.5, grupo: "Laticínio" },
  { nome: "Requeijão", medida: "1 colher de sopa (30 g)", kcal: 78, proteinaG: 2.5, carboidratoG: 1, gorduraG: 7, grupo: "Laticínio" },

  // --- pães e cereais ---
  { nome: "Pão francês", medida: "1 unidade (50 g)", kcal: 140, proteinaG: 4, carboidratoG: 29, gorduraG: 1, grupo: "Pães" },
  { nome: "Pão de forma integral", medida: "1 fatia (25 g)", kcal: 62, proteinaG: 2.6, carboidratoG: 11, gorduraG: 0.9, grupo: "Pães" },
  { nome: "Aveia em flocos", medida: "30 g", kcal: 117, proteinaG: 4.2, carboidratoG: 20, gorduraG: 2.3, grupo: "Pães" },
  { nome: "Granola", medida: "40 g", kcal: 170, proteinaG: 4, carboidratoG: 26, gorduraG: 5.5, grupo: "Pães" },

  // --- fruta ---
  { nome: "Banana prata", medida: "1 unidade (70 g)", kcal: 68, proteinaG: 0.9, carboidratoG: 18, gorduraG: 0.1, grupo: "Fruta" },
  { nome: "Maçã", medida: "1 unidade (130 g)", kcal: 68, proteinaG: 0.4, carboidratoG: 18, gorduraG: 0.2, grupo: "Fruta" },
  { nome: "Laranja", medida: "1 unidade (180 g)", kcal: 83, proteinaG: 1.6, carboidratoG: 21, gorduraG: 0.2, grupo: "Fruta" },
  { nome: "Mamão papaia", medida: "1/2 unidade (150 g)", kcal: 60, proteinaG: 0.8, carboidratoG: 15, gorduraG: 0.2, grupo: "Fruta" },
  { nome: "Abacate", medida: "100 g", kcal: 160, proteinaG: 2, carboidratoG: 8.5, gorduraG: 15, grupo: "Fruta" },
  { nome: "Melancia", medida: "200 g", kcal: 60, proteinaG: 1.2, carboidratoG: 15, gorduraG: 0.2, grupo: "Fruta" },

  // --- legumes e verduras ---
  { nome: "Salada de folhas", medida: "100 g", kcal: 18, proteinaG: 1.4, carboidratoG: 3, gorduraG: 0.2, grupo: "Verdura" },
  { nome: "Brócolis cozido", medida: "100 g", kcal: 35, proteinaG: 2.4, carboidratoG: 7, gorduraG: 0.4, grupo: "Verdura" },
  { nome: "Cenoura crua", medida: "100 g", kcal: 41, proteinaG: 0.9, carboidratoG: 10, gorduraG: 0.2, grupo: "Verdura" },
  { nome: "Tomate", medida: "100 g", kcal: 18, proteinaG: 0.9, carboidratoG: 3.9, gorduraG: 0.2, grupo: "Verdura" },

  // --- suplemento ---
  { nome: "Whey protein concentrado", medida: "1 scoop (30 g)", kcal: 120, proteinaG: 24, carboidratoG: 3, gorduraG: 1.5, grupo: "Suplemento" },
  { nome: "Creatina", medida: "5 g", kcal: 0, proteinaG: 0, carboidratoG: 0, gorduraG: 0, grupo: "Suplemento" },
  { nome: "Hipercalórico", medida: "1 dose (100 g)", kcal: 380, proteinaG: 15, carboidratoG: 72, gorduraG: 3, grupo: "Suplemento" },
  { nome: "Barra de proteína", medida: "1 unidade (60 g)", kcal: 220, proteinaG: 20, carboidratoG: 22, gorduraG: 6, grupo: "Suplemento" },

  // --- gordura e complemento ---
  { nome: "Azeite de oliva", medida: "1 colher de sopa (13 g)", kcal: 115, proteinaG: 0, carboidratoG: 0, gorduraG: 13, grupo: "Gordura" },
  { nome: "Pasta de amendoim", medida: "1 colher de sopa (20 g)", kcal: 120, proteinaG: 5, carboidratoG: 4, gorduraG: 10, grupo: "Gordura" },
  { nome: "Castanha-do-pará", medida: "3 unidades (15 g)", kcal: 100, proteinaG: 2.2, carboidratoG: 1.8, gorduraG: 10, grupo: "Gordura" },

  // --- fora de casa ---
  { nome: "Marmita comum (arroz, feijão, carne, salada)", medida: "1 marmita", kcal: 650, proteinaG: 38, carboidratoG: 70, gorduraG: 22, grupo: "Fora de casa" },
  { nome: "X-salada", medida: "1 unidade", kcal: 560, proteinaG: 27, carboidratoG: 45, gorduraG: 30, grupo: "Fora de casa" },
  { nome: "Pizza (fatia)", medida: "1 fatia", kcal: 280, proteinaG: 12, carboidratoG: 30, gorduraG: 12, grupo: "Fora de casa" },
  { nome: "Açaí com granola e banana", medida: "300 ml", kcal: 420, proteinaG: 6, carboidratoG: 65, gorduraG: 16, grupo: "Fora de casa" },
  { nome: "Coxinha", medida: "1 unidade (80 g)", kcal: 230, proteinaG: 7, carboidratoG: 24, gorduraG: 12, grupo: "Fora de casa" },
  { nome: "Refrigerante", medida: "350 ml", kcal: 147, proteinaG: 0, carboidratoG: 37, gorduraG: 0, grupo: "Fora de casa" },
  { nome: "Suco de laranja natural", medida: "300 ml", kcal: 135, proteinaG: 2, carboidratoG: 31, gorduraG: 0.3, grupo: "Fora de casa" },
  { nome: "Cerveja", medida: "1 lata (350 ml)", kcal: 150, proteinaG: 1.5, carboidratoG: 12, gorduraG: 0, alcoolG: 13.8, grupo: "Fora de casa" },
];

/** Os grupos, na ordem em que aparecem na tabela. */
export function gruposDeAlimento(): string[] {
  const vistos: string[] = [];
  for (const a of ALIMENTOS) if (!vistos.includes(a.grupo)) vistos.push(a.grupo);
  return vistos;
}

/** Multiplica um alimento por N porções, arredondando como gente lê. */
export function escalar(a: Alimento, porcoes: number): Macros {
  const f = Math.max(0, porcoes);
  const uma = (n: number) => Math.round(n * f * 10) / 10;
  return {
    kcal: Math.round(a.kcal * f),
    proteinaG: uma(a.proteinaG),
    carboidratoG: uma(a.carboidratoG),
    gorduraG: uma(a.gorduraG),
  };
}

/**
 * Busca sem acento e sem caixa: quem digita "feijao" no celular tem que achar
 * "Feijão", e quem digita "FRANGO" também.
 */
export function buscarAlimentos(termo: string, limite = 40): Alimento[] {
  const chave = normalizar(termo);
  if (!chave) return ALIMENTOS.slice(0, limite);
  return ALIMENTOS.filter((a) => normalizar(a.nome).includes(chave)).slice(0, limite);
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
