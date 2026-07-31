import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Faixa } from "./bjj-types";

/* ------------------------------------------------------------------ */

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

/* ================================================================== */
/* METAS — o destino, longo prazo                                     */
/* ================================================================== */

export type TipoMeta = "graduacao" | "competicao" | "volume" | "livre";

export interface Meta {
  id: string;
  kind: TipoMeta;
  title: string;
  targetBelt: Faixa | null;
  targetDegrees: number | null;
  eventName: string;
  targetNumber: number | null;
  targetDate: string | null;
  status: "ativa" | "concluida" | "arquivada";
  outcome: string;
}

const paraMeta = (r: Record<string, unknown>): Meta => ({
  id: r.id as string,
  kind: r.kind as TipoMeta,
  title: r.title as string,
  targetBelt: (r.target_belt as Faixa) ?? null,
  targetDegrees: (r.target_degrees as number) ?? null,
  eventName: (r.event_name as string) ?? "",
  targetNumber: (r.target_number as number) ?? null,
  targetDate: (r.target_date as string) ?? null,
  status: r.status as Meta["status"],
  outcome: (r.outcome as string) ?? "",
});

export function useMetas() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["metas"],
    queryFn: async (): Promise<Meta[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("target_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraMeta);
    },
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["metas"] });

  const criarMut = useMutation({
    mutationFn: async (m: Omit<Meta, "id" | "status" | "outcome">) => {
      const eu = await meuId();
      const { error } = await supabase.from("goals").insert({
        user_id: eu,
        kind: m.kind,
        title: m.title.trim(),
        target_belt: m.targetBelt,
        target_degrees: m.targetDegrees,
        event_name: m.eventName,
        target_number: m.targetNumber,
        target_date: m.targetDate,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("criar a meta"),
  });

  const salvarMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Meta> }) => {
      const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.title !== undefined) dbPatch.title = patch.title.trim();
      if (patch.targetBelt !== undefined) dbPatch.target_belt = patch.targetBelt;
      if (patch.targetDegrees !== undefined) dbPatch.target_degrees = patch.targetDegrees;
      if (patch.eventName !== undefined) dbPatch.event_name = patch.eventName;
      if (patch.targetNumber !== undefined) dbPatch.target_number = patch.targetNumber;
      if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.outcome !== undefined) dbPatch.outcome = patch.outcome;
      const { error } = await supabase
        .from("goals")
        .update(dbPatch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("salvar a meta"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar a meta"),
  });

  const todas = query.data ?? [];
  return {
    todas,
    ativas: todas.filter((m) => m.status === "ativa"),
    concluidas: todas.filter((m) => m.status === "concluida"),
    ready: query.isSuccess,
    criar: (m: Omit<Meta, "id" | "status" | "outcome">) => ok(criarMut.mutateAsync(m)),
    salvar: (id: string, patch: Partial<Meta>) => ok(salvarMut.mutateAsync({ id, patch })),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
  };
}

/* ================================================================== */
/* PLANO — o caminho, um mês por vez                                  */
/* ================================================================== */

export interface Objetivo {
  slug: string;
  nome: string;
  descricao: string;
  temConteudo: boolean;
  nivelUsado: string;
}

export function useObjetivos() {
  const query = useQuery({
    queryKey: ["objetivos"],
    queryFn: async (): Promise<Objetivo[]> => {
      const { data, error } = await supabase.rpc("objetivos_disponiveis" as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        slug: r.slug as string,
        nome: r.nome as string,
        descricao: r.descricao as string,
        temConteudo: Boolean(r.tem_conteudo),
        nivelUsado: (r.nivel_usado as string) ?? "",
      }));
    },
  });
  const itens = query.data ?? [];
  return {
    todos: itens,
    disponiveis: itens.filter((o) => o.temConteudo),
    ready: query.isSuccess,
  };
}

export interface ItemDoPlano {
  id: string;
  semana: number;
  foco: string;
  texto: string;
  /** 0 = check simples; >0 = contador ("3 rolas" vira 0/3) */
  alvo: number;
  feito: number;
  nota: string;
  ordem: number;
}

export interface Ciclo {
  id: string;
  objectiveSlug: string | null;
  nivel: string;
  titulo: string;
  inicio: string;
  fim: string;
  notaInicial: number | null;
  notaFinal: number | null;
  status: "ativo" | "encerrado";
}

const paraCiclo = (r: Record<string, unknown>): Ciclo => ({
  id: r.id as string,
  objectiveSlug: (r.objective_slug as string) ?? null,
  nivel: (r.nivel as string) ?? "",
  titulo: r.titulo as string,
  inicio: r.inicio as string,
  fim: r.fim as string,
  notaInicial: (r.nota_inicial as number) ?? null,
  notaFinal: (r.nota_final as number) ?? null,
  status: r.status as Ciclo["status"],
});

export function useCicloAtual() {
  const qc = useQueryClient();

  const ciclos = useQuery({
    queryKey: ["ciclos"],
    queryFn: async (): Promise<Ciclo[]> => {
      const { data, error } = await supabase
        .from("plan_cycles")
        .select("*")
        .order("inicio", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraCiclo);
    },
  });

  const atual = (ciclos.data ?? []).find((c) => c.status === "ativo") ?? null;

  const itens = useQuery({
    queryKey: ["ciclo_itens", atual?.id],
    enabled: !!atual,
    queryFn: async (): Promise<ItemDoPlano[]> => {
      const { data, error } = await supabase
        .from("plan_cycle_items")
        .select("*")
        .eq("cycle_id", atual!.id)
        .order("semana", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        semana: r.semana as number,
        foco: (r.foco as string) ?? "",
        texto: r.texto as string,
        alvo: (r.alvo as number) ?? 0,
        feito: (r.feito as number) ?? 0,
        nota: (r.nota as string) ?? "",
        ordem: (r.ordem as number) ?? 0,
      }));
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["ciclos"] });
    qc.invalidateQueries({ queryKey: ["ciclo_itens"] });
    qc.invalidateQueries({ queryKey: ["weak_points"] });
  };

  const iniciarMut = useMutation({
    mutationFn: async ({ objetivo, variante }: { objetivo: string; variante: string }) => {
      const { error } = await supabase.rpc("iniciar_ciclo" as never, {
        p_objetivo: objetivo,
        p_variante: variante,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("montar o plano do mês"),
  });

  const encerrarMut = useMutation({
    mutationFn: async ({ id, nota }: { id: string; nota: number }) => {
      const { error } = await supabase.rpc("encerrar_ciclo" as never, {
        p_ciclo: id,
        p_nota: nota,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("fechar o mês"),
  });

  // O check: item simples alterna 0/1; item com alvo soma 1 até o alvo.
  const marcarMut = useMutation({
    mutationFn: async ({ item, delta }: { item: ItemDoPlano; delta: number }) => {
      const novo =
        item.alvo === 0
          ? item.feito > 0
            ? 0
            : 1
          : Math.max(0, Math.min(item.alvo, item.feito + delta));
      const { error } = await supabase
        .from("plan_cycle_items")
        .update({ feito: novo } as never)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ciclo_itens"] }),
    onError: aoFalhar("marcar o item"),
  });

  const notaMut = useMutation({
    mutationFn: async ({ id, nota }: { id: string; nota: string }) => {
      const { error } = await supabase
        .from("plan_cycle_items")
        .update({ nota } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ciclo_itens"] }),
    onError: aoFalhar("salvar a anotação"),
  });

  const lista = itens.data ?? [];
  const total = lista.reduce((n, i) => n + (i.alvo || 1), 0);
  const feito = lista.reduce((n, i) => n + Math.min(i.feito, i.alvo || 1), 0);

  return {
    ciclo: atual,
    historico: (ciclos.data ?? []).filter((c) => c.status === "encerrado"),
    itens: lista,
    semanas: [...new Set(lista.map((i) => i.semana))].sort((a, b) => a - b),
    execucao: total ? Math.round((feito / total) * 100) : 0,
    ready: ciclos.isSuccess && (!atual || itens.isSuccess),
    iniciar: (objetivo: string, variante = "") =>
      ok(iniciarMut.mutateAsync({ objetivo, variante })),
    encerrar: (id: string, nota: number) => ok(encerrarMut.mutateAsync({ id, nota })),
    marcar: (item: ItemDoPlano, delta = 1) => ok(marcarMut.mutateAsync({ item, delta })),
    anotar: (id: string, nota: string) => ok(notaMut.mutateAsync({ id, nota })),
  };
}

/** Dias restantes até uma data, ou null. */
export function diasAte(data: string | null): number | null {
  if (!data) return null;
  const alvo = new Date(data + "T00:00:00").getTime();
  const hoje = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return Math.round((alvo - hoje) / 86400000);
}
