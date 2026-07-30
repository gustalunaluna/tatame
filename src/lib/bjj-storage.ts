import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  Achievement,
  Faixa,
  Perfil,
  AchievementTier,
  Analysis,
  PlanItem,
  PlanWeek,
  Technique,
  TechniqueCategory,
  Training,
  WeakPoint,
} from "./bjj-types";
import { ACHIEVEMENT_TIERS } from "./bjj-types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

/** Vira `true` só se a gravação foi confirmada; o aviso de erro sai no onError. */
const ok = (p: Promise<unknown>) => p.then(() => true).catch(() => false);

/** O erro do Supabase é um objeto simples `{message, code}`, não um Error. */
function mensagemDoErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === "object" && "message" in erro) {
    return String((erro as { message: unknown }).message);
  }
  return String(erro);
}

/**
 * Toda gravação passa por aqui quando falha. Sem isto, um erro de rede ou de
 * permissão sumia em silêncio: a tela não atualizava e ninguém era avisado.
 */
function aoFalhar(oque: string) {
  return (erro: unknown) => {
    const msg = mensagemDoErro(erro);
    console.error(`[Tatame] Falha ao ${oque}:`, erro);
    toast.error(`Não deu para ${oque}: ${msg}`);
  };
}

const SEED_TECHNIQUES: Omit<Technique, "id">[] = [
  { name: "Guarda Aranha", category: "Guarda", notes: "Pegadas na manga + pés no bíceps. Base de controle e ataques.", videoUrl: "", mastery: 2 },
  { name: "Guarda De La Riva (DLR)", category: "Guarda", notes: "Gancho por fora, pegada no tornozelo/gola. Rota principal para as costas.", videoUrl: "", mastery: 2 },
  { name: "Single-leg X (SLX)", category: "Guarda", notes: "Controle da perna do oponente. Raspagens e transições para as costas.", videoUrl: "", mastery: 1 },
  { name: "Meia-guarda com joelho-shield", category: "Guarda", notes: "Joelho no peito do oponente, quadril fora da linha.", videoUrl: "", mastery: 2 },
  { name: "Omoplata", category: "Finalização", notes: "Encadeia com triângulo e armbar. Também raspa.", videoUrl: "", mastery: 3 },
  { name: "Triângulo", category: "Finalização", notes: "Ângulo é rei. Puxa cabeça, aperta.", videoUrl: "", mastery: 3 },
  { name: "Armbar", category: "Finalização", notes: "Controle do braço + polegar pra cima.", videoUrl: "", mastery: 3 },
  { name: "Kimura", category: "Finalização", notes: "Do fundo, meia-guarda e cima.", videoUrl: "", mastery: 2 },
  { name: "Americana", category: "Finalização", notes: "Da montada e 100kg. Cotovelo colado no chão.", videoUrl: "", mastery: 2 },
  { name: "Mata-leão", category: "Finalização", notes: "Costas — encaixe do braço e aperto.", videoUrl: "", mastery: 2 },
  { name: "Katagatame", category: "Finalização", notes: "Braço-cabeça, ângulo lateral.", videoUrl: "", mastery: 2 },
  { name: "Tesourinha", category: "Raspagem", notes: "Raspagem clássica da guarda fechada.", videoUrl: "", mastery: 2 },
  { name: "Double leg", category: "Queda", notes: "Entrada de duas pernas — usar base de boxe.", videoUrl: "", mastery: 1 },
  { name: "Guilhotina", category: "Defesa", notes: "Defesa contra double leg e cabeça baixa.", videoUrl: "", mastery: 2 },
];

const SEED_PLAN: { week: number; focus: string; items: string[] }[] = [
  { week: 1, focus: "Fundamentos de retenção — quadril rápido", items: ["Drill de quadril (shrimp) — 5 min", "Manter pernas na linha vs. passador", "Enfrentar o passador (nunca dar as costas)", "3 rolos focando só em não passar"] },
  { week: 2, focus: "Inside position + grip fighting inicial", items: ["Buscar inside position em toda troca", "Pegar primeiro — 2-on-1 na manga", "Estudar 1 vídeo de quebra de pegada", "Rolo focado em vencer o grip fighting"] },
  { week: 3, focus: "De La Riva — entrada e controle", items: ["Drill entrada DLR — 20 reps por lado", "Pegada tornozelo + gola/manga", "Berimbolo básico — treinar rotação", "2 rolos abrindo com DLR"] },
  { week: 4, focus: "DLR → costas (back take)", items: ["Transição DLR → SLX", "Rotação para pegar costas com gancho", "Encaixar 2º gancho + controle do braço", "Finalizar 1x com mata-leão no rolo"] },
  { week: 5, focus: "Single-leg X — controle e raspagem", items: ["Entrada SLX pela DLR", "Raspagem SLX para top", "Ashi garami básico — controle da linha", "2 rolos abrindo com SLX"] },
  { week: 6, focus: "SLX → costas", items: ["Rotação SLX pra trás pegando costas", "Transição SLX ↔ DLR", "Encadear back take com finalização", "Rolo focado só em pegar costas"] },
  { week: 7, focus: "Grip fighting avançado — pegadas cruzadas", items: ["Cross-grip (manga cruzada)", "Quebrar pegada dele antes de agir", "Pegar primeiro em toda troca em pé", "3 rolos ganhando o grip"] },
  { week: 8, focus: "Integração — retenção + costas encadeadas", items: ["Rolo teste: 5 min sem ser passado", "Pegar costas 3x na semana", "Registrar aprendizados no diário", "Revisar plano — próximo ciclo"] },
];

const SEED_WEAK: { label: string }[] = [
  { label: "Jogo em pé / quedas" },
  { label: "Defesa de costas" },
  { label: "Forçar pegadas" },
];

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function ensureSeeded(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, seeded")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.seeded) return;

  // Cada passo confere o erro. Antes nenhum conferia: se um insert falhava,
  // a marca `seeded` era gravada mesmo assim e a conta ficava permanentemente
  // sem aquelas linhas — ou, se a marca também falhasse, o seed rodava de novo
  // a cada abertura do app, duplicando técnicas sem parar.
  if (!profile) {
    const { error } = await supabase.from("profiles").insert({ user_id: userId });
    if (error) throw error;
  }

  const { error: erroTecnicas } = await supabase.from("techniques").insert(
    SEED_TECHNIQUES.map((t) => ({
      user_id: userId,
      name: t.name,
      category: t.category,
      notes: t.notes,
      video_url: t.videoUrl,
      mastery: t.mastery,
    })),
  );
  if (erroTecnicas) throw erroTecnicas;

  const { error: erroPlano } = await supabase.from("plan_weeks").insert(
    SEED_PLAN.map((w) => ({
      user_id: userId,
      week: w.week,
      focus: w.focus,
      items: w.items.map((label) => ({ id: uid(), label, done: false })),
    })),
  );
  if (erroPlano) throw erroPlano;

  const { error: erroPontos } = await supabase.from("weak_points").insert(
    SEED_WEAK.map((w) => ({ user_id: userId, label: w.label, score: 2, history: [] })),
  );
  if (erroPontos) throw erroPontos;

  const { error: erroMarca } = await supabase
    .from("profiles")
    .update({ seeded: true })
    .eq("user_id", userId);
  if (erroMarca) throw erroMarca;
}

export function useEnsureSeeded() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getUserId();
        // Sem sessão não há o que semear — mas `ready` precisa virar true do
        // mesmo jeito, senão quem espera por ele fica travado para sempre.
        if (id) await ensureSeeded(id);
      } catch (erro) {
        console.error("[Tatame] Falha ao preparar os dados iniciais:", erro);
        toast.error(
          "Não deu para preparar seus dados iniciais. Recarregue a página.",
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

// ---------------- Trainings ----------------
export function useTrainings() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["trainings"],
    queryFn: async (): Promise<Training[]> => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        type: r.type as Training["type"],
        durationMin: r.duration_min,
        rolls: r.rolls,
        partners: r.partners,
        techniques: r.techniques,
        notes: r.notes,
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trainings"] });

  const addMut = useMutation({
    mutationFn: async (t: Omit<Training, "id">) => {
      const uid_ = await getUserId();
      if (!uid_) throw new Error("Sem sessão");
      const { error } = await supabase.from("trainings").insert({
        user_id: uid_,
        date: t.date,
        type: t.type,
        duration_min: t.durationMin,
        rolls: t.rolls,
        partners: t.partners,
        techniques: t.techniques,
        notes: t.notes,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("registrar o treino"),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("remover o treino"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Training> }) => {
      const dbPatch = {
        ...(patch.date !== undefined && { date: patch.date }),
        ...(patch.type !== undefined && { type: patch.type }),
        ...(patch.durationMin !== undefined && { duration_min: patch.durationMin }),
        ...(patch.rolls !== undefined && { rolls: patch.rolls }),
        ...(patch.partners !== undefined && { partners: patch.partners }),
        ...(patch.techniques !== undefined && { techniques: patch.techniques }),
        ...(patch.notes !== undefined && { notes: patch.notes }),
      };
      const { error } = await supabase.from("trainings").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("salvar o treino"),
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    // Devolvem `true` só quando o banco confirmou. O erro já vira aviso na
    // tela via onError, então a promessa nunca rejeita — a tela só precisa
    // saber se pode comemorar.
    add: (t: Omit<Training, "id">) => ok(addMut.mutateAsync(t)),
    remove: (id: string) => ok(removeMut.mutateAsync(id)),
    update: (id: string, patch: Partial<Training>) =>
      ok(updateMut.mutateAsync({ id, patch })),
  };
}

// ---------------- Techniques ----------------
export function useTechniques() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["techniques"],
    queryFn: async (): Promise<Technique[]> => {
      const { data, error } = await supabase
        .from("techniques")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category as TechniqueCategory,
        notes: r.notes,
        videoUrl: r.video_url,
        mastery: r.mastery,
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["techniques"] });

  const addMut = useMutation({
    mutationFn: async (t: Omit<Technique, "id">) => {
      const uid_ = await getUserId();
      if (!uid_) throw new Error("Sem sessão");
      const { error } = await supabase.from("techniques").insert({
        user_id: uid_,
        name: t.name,
        category: t.category,
        notes: t.notes,
        video_url: t.videoUrl,
        mastery: t.mastery,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("adicionar a técnica"),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("techniques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("remover a técnica"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Technique> }) => {
      const dbPatch = {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.category !== undefined && { category: patch.category }),
        ...(patch.notes !== undefined && { notes: patch.notes }),
        ...(patch.videoUrl !== undefined && { video_url: patch.videoUrl }),
        ...(patch.mastery !== undefined && { mastery: patch.mastery }),
      };
      const { error } = await supabase.from("techniques").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("salvar a técnica"),
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    add: (t: Omit<Technique, "id">) => ok(addMut.mutateAsync(t)),
    remove: (id: string) => ok(removeMut.mutateAsync(id)),
    update: (id: string, patch: Partial<Technique>) =>
      ok(updateMut.mutateAsync({ id, patch })),
  };
}

// ---------------- Plan ----------------
export function usePlan() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["plan_weeks"],
    queryFn: async (): Promise<PlanWeek[]> => {
      const { data, error } = await supabase
        .from("plan_weeks")
        .select("*")
        .order("week", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        week: r.week,
        focus: r.focus,
        items: (r.items as unknown as PlanItem[]) ?? [],
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["plan_weeks"] });

  const toggleMut = useMutation({
    mutationFn: async ({ week, itemId }: { week: number; itemId: string }) => {
      // Relê a semana do banco antes de gravar. Usar o cache aqui fazia dois
      // toques rápidos em itens diferentes partirem da mesma lista — o segundo
      // sobrescrevia o primeiro e o check sumia.
      const { data: atual, error: erroLeitura } = await supabase
        .from("plan_weeks")
        .select("items")
        .eq("week", week)
        .maybeSingle();
      if (erroLeitura) throw erroLeitura;
      const itens = (atual?.items as unknown as PlanItem[]) ?? [];
      if (!itens.length) return;
      const nextItems = itens.map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i,
      );
      const { error } = await supabase
        .from("plan_weeks")
        .update({ items: nextItems as unknown as Json })
        .eq("week", week);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("marcar o item do plano"),
  });

  return {
    weeks: query.data ?? [],
    ready: query.isSuccess,
    toggle: (week: number, itemId: string) => toggleMut.mutate({ week, itemId }),
  };
}

// ---------------- Weak points ----------------
export function useWeakPoints() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["weak_points"],
    queryFn: async (): Promise<WeakPoint[]> => {
      const { data, error } = await supabase
        .from("weak_points")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        score: r.score,
        history: (r.history as unknown as WeakPoint["history"]) ?? [],
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["weak_points"] });

  const updateScoreMut = useMutation({
    mutationFn: async ({ id, score }: { id: string; score: number }) => {
      // Mesmo motivo do plano: o histórico é reescrito inteiro, então precisa
      // partir do que está gravado, não do cache.
      const { data: atual, error: erroLeitura } = await supabase
        .from("weak_points")
        .select("history")
        .eq("id", id)
        .maybeSingle();
      if (erroLeitura) throw erroLeitura;
      const history = [
        ...((atual?.history as unknown as WeakPoint["history"]) ?? []),
        { date: new Date().toISOString().slice(0, 10), score },
      ].slice(-30);
      const { error } = await supabase
        .from("weak_points")
        .update({ score, history })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("salvar a nota"),
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    updateScore: (id: string, score: number) => updateScoreMut.mutate({ id, score }),
  };
}

// ---------------- Goal start ----------------
export function useGoalStart() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<string> => {
      const uid_ = await getUserId();
      if (!uid_) return new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("profiles")
        .select("goal_start")
        .eq("user_id", uid_)
        .maybeSingle();
      return data?.goal_start ?? new Date().toISOString().slice(0, 10);
    },
  });

  const setMut = useMutation({
    mutationFn: async (value: string) => {
      const uid_ = await getUserId();
      if (!uid_) throw new Error("Sem sessão");
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: uid_, goal_start: value }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      // A mesma linha da tabela alimenta a tela de Perfil; sem isto ela ficava
      // mostrando a data antiga por até 5 minutos.
      qc.invalidateQueries({ queryKey: ["perfil"] });
    },
    onError: aoFalhar("salvar a data de início"),
  });

  return {
    start: query.data ?? new Date().toISOString().slice(0, 10),
    set: (v: string) => setMut.mutate(v),
    ready: query.isSuccess,
  };
}

// ---------------- Analyses ----------------
export function useAnalyses() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["analyses"],
    queryFn: async (): Promise<Analysis[]> => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        title: r.title,
        content: r.content,
        createdAt: r.created_at,
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["analyses"] });

  const addMut = useMutation({
    mutationFn: async (a: Omit<Analysis, "id" | "createdAt">) => {
      const uid_ = await getUserId();
      if (!uid_) throw new Error("Sem sessão");
      const { error } = await supabase.from("analyses").insert({
        user_id: uid_,
        date: a.date,
        title: a.title,
        content: a.content,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("salvar a análise"),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("remover a análise"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<Analysis, "id" | "createdAt">> }) => {
      const dbPatch = {
        ...(patch.date !== undefined && { date: patch.date }),
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.content !== undefined && { content: patch.content }),
      };
      const { error } = await supabase.from("analyses").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: aoFalhar("atualizar a análise"),
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    add: (a: Omit<Analysis, "id" | "createdAt">) => addMut.mutate(a),
    remove: (id: string) => removeMut.mutate(id),
    update: (id: string, patch: Partial<Omit<Analysis, "id" | "createdAt">>) =>
      updateMut.mutate({ id, patch }),
  };
}

// ---------------- Achievements ----------------
const TIER_ORDER: Record<AchievementTier, number> = {
  Branca: 0,
  Azul: 1,
  Roxa: 2,
  Marrom: 3,
  Preta: 4,
  Coral: 5,
  Vermelha: 6,
};

export function useAchievements() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["achievements"],
    queryFn: async (): Promise<Achievement[]> => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*");
      if (error) throw error;
      const mapped: Achievement[] = (data ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        description: r.description,
        tier: r.tier as AchievementTier,
        category: r.category,
        sortOrder: r.sort_order,
        unlocked: r.unlocked,
        unlockedDate: r.unlocked_date,
        target: r.target,
        progress: r.progress,
      }));
      mapped.sort((a, b) => {
        const t = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
        if (t !== 0) return t;
        return a.sortOrder - b.sortOrder;
      });
      return mapped;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["achievements"] });

  const setUnlockedMut = useMutation({
    mutationFn: async ({ id, unlocked }: { id: string; unlocked: boolean }) => {
      const { error } = await supabase
        .from("achievements")
        .update({
          unlocked,
          unlocked_date: unlocked ? new Date().toISOString().slice(0, 10) : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    tiers: ACHIEVEMENT_TIERS,
    onError: aoFalhar("atualizar a conquista"),
    setUnlocked: (id: string, unlocked: boolean) =>
      setUnlockedMut.mutate({ id, unlocked }),
  };
}

// ---------------- Perfil ----------------
export function usePerfil() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["perfil"],
    queryFn: async (): Promise<Perfil> => {
      const uid_ = await getUserId();
      if (!uid_) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid_)
        .maybeSingle();
      if (error) throw error;
      return {
        nickname: data?.nickname ?? "",
        birthDate: data?.birth_date ?? null,
        photoUrl: data?.photo_url ?? "",
        belt: (data?.belt as Faixa) ?? "Branca",
        degrees: data?.degrees ?? 0,
        master: data?.master ?? "",
        gym: data?.gym ?? "",
        fightsWon: data?.fights_won ?? 0,
        fightsLost: data?.fights_lost ?? 0,
        goalStart: data?.goal_start ?? new Date().toISOString().slice(0, 10),
      };
    },
  });

  const salvarMut = useMutation({
    mutationFn: async (patch: Partial<Perfil>) => {
      const uid_ = await getUserId();
      if (!uid_) throw new Error("Sem sessão");
      const dbPatch = {
        ...(patch.nickname !== undefined && { nickname: patch.nickname }),
        ...(patch.birthDate !== undefined && { birth_date: patch.birthDate }),
        ...(patch.photoUrl !== undefined && { photo_url: patch.photoUrl }),
        ...(patch.belt !== undefined && { belt: patch.belt }),
        ...(patch.degrees !== undefined && { degrees: patch.degrees }),
        ...(patch.master !== undefined && { master: patch.master }),
        ...(patch.gym !== undefined && { gym: patch.gym }),
        ...(patch.fightsWon !== undefined && { fights_won: patch.fightsWon }),
        ...(patch.fightsLost !== undefined && { fights_lost: patch.fightsLost }),
        ...(patch.goalStart !== undefined && { goal_start: patch.goalStart }),
      };
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: uid_, ...dbPatch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfil"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: aoFalhar("salvar o perfil"),
  });

  /** Envia a foto para o bucket `avatars` e devolve a URL pública */
  async function enviarFoto(file: File) {
    const uid_ = await getUserId();
    if (!uid_) throw new Error("Sem sessão");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const caminho = `${uid_}/perfil-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(caminho, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    await salvarMut.mutateAsync({ photoUrl: data.publicUrl });
    return data.publicUrl;
  }

  return {
    perfil: query.data,
    ready: query.isSuccess,
    salvar: (patch: Partial<Perfil>) => salvarMut.mutate(patch),
    salvando: salvarMut.isPending,
    enviarFoto,
  };
}

/** Conquistas marcadas para aparecer no perfil */
export function useDestaques() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["achievements_featured"],
    queryFn: async (): Promise<Achievement[]> => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("featured", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        description: r.description,
        tier: r.tier as AchievementTier,
        category: r.category,
        sortOrder: r.sort_order,
        unlocked: r.unlocked,
        unlockedDate: r.unlocked_date,
        target: r.target,
        progress: r.progress,
      }));
    },
  });

  const marcarMut = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("achievements")
        .update({ featured })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievements_featured"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: aoFalhar("destacar a conquista"),
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    marcar: (id: string, featured: boolean) => marcarMut.mutate({ id, featured }),
  };
}

/**
 * Só os números — a tela inicial não precisa das ~1000 linhas de conquista
 * para mostrar uma porcentagem. Duas contagens no banco, payload mínimo.
 */
export function useAchievementStats() {
  const query = useQuery({
    queryKey: ["achievements_stats"],
    queryFn: async (): Promise<{ total: number; unlocked: number }> => {
      // Função no banco: devolve uma linha com os dois números, em vez de
      // trazer as ~1000 conquistas só para contá-las.
      const { data, error } = await supabase.rpc("achievement_stats").single();
      if (error) throw error;
      return { total: Number(data?.total ?? 0), unlocked: Number(data?.unlocked ?? 0) };
    },
  });
  return { ...(query.data ?? { total: 0, unlocked: 0 }), ready: query.isSuccess };
}

export { ACHIEVEMENT_TIERS } from "./bjj-types";
export type { AchievementTier };
export { TECHNIQUE_CATEGORIES } from "./bjj-types";
export type { TechniqueCategory };
