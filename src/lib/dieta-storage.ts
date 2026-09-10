import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePerfil, useTrainings } from "./bjj-storage";
import {
  cardapioNoDia,
  gastoDoDia,
  idadeEm,
  metaDeAgua,
  metaDeCalorias,
  metasDeMacro,
  pesoEm,
  somarRefeicoes,
  taxaBasal,
  tendenciaDePeso,
  somarCardapio,
  treinosDoDia,
  type GastoDoDia,
  type ItemNoDia,
  type Macros,
  type Tendencia,
} from "./dieta";
import type {
  ItemDoCardapio,
  NovaPesagem,
  NovaRefeicao,
  NovoItemDoCardapio,
  PerfilDaDieta,
  Pesagem,
  Refeicao,
  Sexo,
  Objetivo,
} from "./dieta";

/**
 * O banco da área de dieta. A CONTA não está aqui — está em `dieta.ts`, que
 * não importa nada e por isso roda no teste sem navegador. Aqui só entra e sai
 * linha.
 */

function mensagemDoErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === "object" && "message" in erro) {
    return String((erro as { message: unknown }).message);
  }
  return String(erro);
}

function aoFalhar(oque: string) {
  return (erro: unknown) => {
    console.error(`[Ponteira] Falha ao ${oque}:`, erro);
    toast.error(`Não deu para ${oque}: ${mensagemDoErro(erro)}`);
  };
}

const ok = (p: Promise<unknown>) => p.then(() => true).catch(() => false);

async function meuId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sem sessão");
  return id;
}

/** O que vale enquanto a pessoa não abriu os ajustes da dieta. */
export const PERFIL_PADRAO: PerfilDaDieta = {
  alturaCm: 0,
  sexo: null,
  objetivo: "manter",
  metaKcal: null,
  metaProteinaG: null,
  metaCarboidratoG: null,
  metaGorduraG: null,
  metaAguaMl: null,
};

/* ========================================================================== */
/* Perfil                                                                     */
/* ========================================================================== */

export function usePerfilDaDieta() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["perfil_da_dieta"],
    queryFn: async (): Promise<PerfilDaDieta> => {
      const { data, error } = await supabase
        .from("perfil_da_dieta")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return PERFIL_PADRAO;
      return {
        alturaCm: data.altura_cm ?? 0,
        sexo: (data.sexo as Sexo | null) ?? null,
        objetivo: (data.objetivo as Objetivo) ?? "manter",
        metaKcal: data.meta_kcal,
        metaProteinaG: data.meta_proteina_g,
        metaCarboidratoG: data.meta_carboidrato_g,
        metaGorduraG: data.meta_gordura_g,
        metaAguaMl: data.meta_agua_ml,
      };
    },
  });

  const salvarMut = useMutation({
    mutationFn: async (p: Partial<PerfilDaDieta>) => {
      const atual = query.data ?? PERFIL_PADRAO;
      const novo = { ...atual, ...p };
      const { error } = await supabase.from("perfil_da_dieta").upsert(
        {
          user_id: await meuId(),
          // 0 é "não respondeu", e o banco prefere NULL para isso: assim a
          // coluna não finge que existe alguém de zero centímetro.
          altura_cm: novo.alturaCm > 0 ? novo.alturaCm : null,
          sexo: novo.sexo,
          objetivo: novo.objetivo,
          meta_kcal: novo.metaKcal,
          meta_proteina_g: novo.metaProteinaG,
          meta_carboidrato_g: novo.metaCarboidratoG,
          meta_gordura_g: novo.metaGorduraG,
          meta_agua_ml: novo.metaAguaMl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perfil_da_dieta"] }),
    onError: aoFalhar("salvar os ajustes da dieta"),
  });

  return {
    perfil: query.data ?? PERFIL_PADRAO,
    ready: query.isSuccess,
    salvar: (p: Partial<PerfilDaDieta>) => ok(salvarMut.mutateAsync(p)),
  };
}

/* ========================================================================== */
/* Pesagens                                                                   */
/* ========================================================================== */

export function usePesagens() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pesagens"],
    queryFn: async (): Promise<Pesagem[]> => {
      const { data, error } = await supabase
        .from("pesagens")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        data: r.data,
        pesoKg: Number(r.peso_kg),
        gorduraPct: r.gordura_pct === null ? null : Number(r.gordura_pct),
        nota: r.nota ?? "",
      }));
    },
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["pesagens"] });

  const salvarMut = useMutation({
    mutationFn: async (p: NovaPesagem) => {
      // `upsert` e não `insert`: a tabela tem um peso por dia. Pesar de novo no
      // mesmo dia corrige o número, em vez de dar erro de chave duplicada numa
      // tela onde a pessoa não tem como saber que já tinha pesado.
      const { error } = await supabase.from("pesagens").upsert(
        {
          user_id: await meuId(),
          data: p.data,
          peso_kg: p.pesoKg,
          gordura_pct: p.gorduraPct,
          nota: p.nota.trim(),
        },
        { onConflict: "user_id,data" },
      );
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("registrar a pesagem"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pesagens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar a pesagem"),
  });

  return {
    pesagens: query.data ?? [],
    ready: query.isSuccess,
    salvar: (p: NovaPesagem) => ok(salvarMut.mutateAsync(p)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
  };
}

/* ========================================================================== */
/* Refeições                                                                  */
/* ========================================================================== */

/**
 * As refeições de UM dia.
 *
 * Por dia, e não o histórico inteiro: quem registra três meses de comida tem
 * mil e poucas linhas, e a tela de hoje precisa de doze delas. Baixar o resto
 * seria pagar por dado que ninguém vai olhar.
 */
export function useRefeicoes(data: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["refeicoes", data],
    queryFn: async (): Promise<Refeicao[]> => {
      const { data: linhas, error } = await supabase
        .from("refeicoes")
        .select("*")
        .eq("data", data)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (linhas ?? []).map((r) => ({
        id: r.id,
        data: r.data,
        momento: r.momento ?? "",
        alimento: r.alimento,
        porcao: r.porcao ?? "",
        kcal: r.kcal,
        proteinaG: Number(r.proteina_g),
        carboidratoG: Number(r.carboidrato_g),
        gorduraG: Number(r.gordura_g),
        itemDoCardapioId: r.cardapio_item_id,
      }));
    },
  });

  // Mexeu numa refeição, mexeu na lista de "o que eu costumo comer" — ela sai
  // das mesmas linhas.
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["refeicoes"] });
    qc.invalidateQueries({ queryKey: ["alimentos_recentes"], refetchType: "all" });
  };

  const criarMut = useMutation({
    mutationFn: async (r: NovaRefeicao) => {
      const { error } = await supabase.from("refeicoes").insert({
        user_id: await meuId(),
        data: r.data,
        momento: r.momento,
        alimento: r.alimento.trim(),
        porcao: r.porcao.trim(),
        kcal: Math.max(0, Math.round(r.kcal)),
        proteina_g: Math.max(0, r.proteinaG),
        carboidrato_g: Math.max(0, r.carboidratoG),
        gordura_g: Math.max(0, r.gorduraG),
        cardapio_item_id: r.itemDoCardapioId,
      });
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("registrar a refeição"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("refeicoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar a refeição"),
  });

  return {
    refeicoes: query.data ?? [],
    ready: query.isSuccess,
    criar: (r: NovaRefeicao) => ok(criarMut.mutateAsync(r)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
  };
}

/* ========================================================================== */
/* O que ele costuma comer                                                    */
/* ========================================================================== */

export interface AlimentoUsado {
  alimento: string;
  porcao: string;
  kcal: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
  usos: number;
}

/* ========================================================================== */
/* O cardápio                                                                 */
/* ========================================================================== */

export function useCardapio() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cardapio"],
    queryFn: async (): Promise<ItemDoCardapio[]> => {
      const { data, error } = await supabase
        .from("cardapio_itens")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        momento: r.momento ?? "",
        alimento: r.alimento,
        porcao: r.porcao ?? "",
        kcal: r.kcal,
        proteinaG: Number(r.proteina_g),
        carboidratoG: Number(r.carboidrato_g),
        gorduraG: Number(r.gordura_g),
        ordem: r.ordem,
      }));
    },
  });

  // Mexeu no cardápio, mexeu no dia: a tela de hoje é o cruzamento dos dois.
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["cardapio"] });
    qc.invalidateQueries({ queryKey: ["refeicoes"], refetchType: "all" });
  };

  const criarMut = useMutation({
    mutationFn: async (i: NovoItemDoCardapio) => {
      const { error } = await supabase.from("cardapio_itens").insert({
        user_id: await meuId(),
        momento: i.momento,
        alimento: i.alimento.trim(),
        porcao: i.porcao.trim(),
        kcal: Math.max(0, Math.round(i.kcal)),
        proteina_g: Math.max(0, i.proteinaG),
        carboidrato_g: Math.max(0, i.carboidratoG),
        gordura_g: Math.max(0, i.gorduraG),
        ordem: i.ordem,
      });
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("adicionar o item ao cardápio"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cardapio_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("remover o item do cardápio"),
  });

  return {
    cardapio: query.data ?? [],
    ready: query.isSuccess,
    total: somarCardapio(query.data ?? []),
    criar: (i: NovoItemDoCardapio) => ok(criarMut.mutateAsync(i)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
  };
}

/* ========================================================================== */
/* Água                                                                       */
/* ========================================================================== */

export function useAgua(data: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["agua", data],
    queryFn: async (): Promise<number> => {
      const { data: linha, error } = await supabase
        .from("consumo_de_agua")
        .select("ml")
        .eq("data", data)
        .maybeSingle();
      if (error) throw error;
      return linha?.ml ?? 0;
    },
  });

  const salvarMut = useMutation({
    mutationFn: async (ml: number) => {
      const { error } = await supabase.from("consumo_de_agua").upsert(
        {
          user_id: await meuId(),
          data,
          ml: Math.max(0, Math.min(20000, Math.round(ml))),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,data" },
      );
      if (error) throw error;
    },
    // A tela de água é feita de toques rápidos — três copos em três segundos.
    // Sem o valor otimista, cada toque esperaria a ida e volta do banco e a
    // barra andaria depois do dedo.
    onMutate: async (ml: number) => {
      await qc.cancelQueries({ queryKey: ["agua", data] });
      const antes = qc.getQueryData<number>(["agua", data]);
      qc.setQueryData(["agua", data], Math.max(0, ml));
      return { antes };
    },
    onError: (erro, _ml, contexto) => {
      if (contexto?.antes !== undefined) {
        qc.setQueryData(["agua", data], contexto.antes);
      }
      aoFalhar("registrar a água")(erro);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["agua", data] }),
  });

  const ml = query.data ?? 0;
  return {
    ml,
    ready: query.isSuccess,
    definir: (novo: number) => ok(salvarMut.mutateAsync(novo)),
    somar: (delta: number) => ok(salvarMut.mutateAsync(Math.max(0, ml + delta))),
  };
}

/* ========================================================================== */
/* A conta do dia inteira                                                     */
/* ========================================================================== */

/** O que ainda falta para a conta poder ser feita. Vazio = dá para calcular. */
export type Pendencia = "altura" | "sexo" | "nascimento" | "peso";

export interface ContaDaDieta {
  pronta: boolean;
  pendencias: Pendencia[];
  pesoKg: number | null;
  idade: number | null;
  gasto: GastoDoDia | null;
  meta: Macros | null;
  consumido: Macros;
  /** Positivo = ainda cabe comida no dia. */
  saldo: number;
  tendencia: Tendencia | null;
  perfil: PerfilDaDieta;
  refeicoes: Refeicao[];
  pesagens: Pesagem[];
  /** O cardápio cruzado com o dia: o que já foi comido, trocado, ou está aberto. */
  cardapioDoDia: ItemNoDia[];
  /** Quanto o cardápio somaria se o dia saísse exatamente como planejado. */
  planejado: Macros;
  aguaMl: number;
  metaAguaMl: number;
  ready: boolean;
}

/**
 * Junta tudo e devolve o dia fechado.
 *
 * A fonte que faz as duas áreas do app valerem a pena estar no mesmo lugar é
 * `trainings`: o gasto de treino sai da duração e do número de rolas que ele
 * já anotou no Diário. Não existe formulário de exercício aqui, e é de
 * propósito — dado digitado duas vezes é dado que diverge.
 *
 * O cardápio entra pelo mesmo princípio: ele não é uma segunda lista de
 * refeições, é o PLANO cruzado com as refeições que já existiam. Marcar "comi"
 * cria uma refeição de verdade; a tela só sabe dizer o que ainda está aberto
 * porque as duas coisas se conhecem.
 */
export function useContaDaDieta(data: string): ContaDaDieta {
  const { perfil: perfilAtleta } = usePerfil();
  const { perfil, ready: perfilPronto } = usePerfilDaDieta();
  const { pesagens, ready: pesagensProntas } = usePesagens();
  const { refeicoes, ready: refeicoesProntas } = useRefeicoes(data);
  const { items: treinos, ready: treinosProntos } = useTrainings();
  const { cardapio, ready: cardapioPronto } = useCardapio();
  const { ml: aguaMl, ready: aguaPronta } = useAgua(data);

  const ready =
    perfilPronto &&
    pesagensProntas &&
    refeicoesProntas &&
    treinosProntos &&
    cardapioPronto &&
    aguaPronta;

  const pesoKg = pesoEm(pesagens, data);
  const idade = idadeEm(perfilAtleta?.birthDate ?? null, data);

  const pendencias: Pendencia[] = [];
  if (!perfil.alturaCm) pendencias.push("altura");
  if (!perfil.sexo) pendencias.push("sexo");
  if (idade === null) pendencias.push("nascimento");
  if (pesoKg === null) pendencias.push("peso");

  const consumido = somarRefeicoes(refeicoes);
  const cardapioDoDia = cardapioNoDia(cardapio, refeicoes);
  const planejado = somarCardapio(cardapio);
  const minutosTreinados = treinosDoDia(treinos, data).reduce(
    (n, t) => n + Math.max(0, t.durationMin),
    0,
  );

  const comum = {
    pendencias,
    pesoKg,
    idade,
    consumido,
    tendencia: tendenciaDePeso(pesagens, data),
    perfil,
    refeicoes,
    pesagens,
    cardapioDoDia,
    planejado,
    aguaMl,
    ready,
  };

  if (pendencias.length || pesoKg === null || idade === null || !perfil.sexo) {
    return {
      ...comum,
      pronta: false,
      gasto: null,
      meta: null,
      saldo: 0,
      // Sem peso não dá para calcular a base de 35 ml/kg, mas uma meta escrita
      // na mão não depende de peso nenhum — e a barra de água é a única parte
      // da tela que funciona sem a conta toda estar de pé.
      metaAguaMl: perfil.metaAguaMl ?? 0,
    };
  }

  const basal = taxaBasal(perfil.sexo, pesoKg, perfil.alturaCm, idade);
  const gasto = gastoDoDia(treinosDoDia(treinos, data), pesoKg, basal);
  const metaKcal = metaDeCalorias(perfil.objetivo, gasto.total, perfil.metaKcal);
  const meta = metasDeMacro(perfil.objetivo, pesoKg, metaKcal, {
    kcal: perfil.metaKcal,
    proteinaG: perfil.metaProteinaG,
    carboidratoG: perfil.metaCarboidratoG,
    gorduraG: perfil.metaGorduraG,
  });

  return {
    ...comum,
    pronta: true,
    gasto,
    meta,
    saldo: meta.kcal - consumido.kcal,
    metaAguaMl: metaDeAgua(pesoKg, minutosTreinados, perfil.metaAguaMl),
  };
}

export function useAlimentosRecentes(limite = 24) {
  const query = useQuery({
    queryKey: ["alimentos_recentes", limite],
    queryFn: async (): Promise<AlimentoUsado[]> => {
      const { data, error } = await supabase.rpc("alimentos_recentes", {
        p_limite: limite,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        alimento: r.alimento,
        porcao: r.porcao ?? "",
        kcal: Number(r.kcal),
        proteinaG: Number(r.proteina_g),
        carboidratoG: Number(r.carboidrato_g),
        gorduraG: Number(r.gordura_g),
        usos: Number(r.usos),
      }));
    },
  });
  return { alimentos: query.data ?? [], ready: query.isSuccess };
}
