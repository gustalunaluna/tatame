import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Achievement,
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

const uid = () => Math.random().toString(36).slice(2, 10);

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

  if (!profile) {
    await supabase.from("profiles").insert({ user_id: userId });
  }

  await supabase.from("techniques").insert(
    SEED_TECHNIQUES.map((t) => ({
      user_id: userId,
      name: t.name,
      category: t.category,
      notes: t.notes,
      video_url: t.videoUrl,
      mastery: t.mastery,
    })),
  );

  await supabase.from("plan_weeks").insert(
    SEED_PLAN.map((w) => ({
      user_id: userId,
      week: w.week,
      focus: w.focus,
      items: w.items.map((label) => ({ id: uid(), label, done: false })),
    })),
  );

  await supabase.from("weak_points").insert(
    SEED_WEAK.map((w) => ({ user_id: userId, label: w.label, score: 2, history: [] })),
  );

  await supabase.from("profiles").update({ seeded: true }).eq("user_id", userId);
}

export function useEnsureSeeded() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getUserId();
      if (!id) return;
      try {
        await ensureSeeded(id);
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
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    add: (t: Omit<Training, "id">) => addMut.mutate(t),
    remove: (id: string) => removeMut.mutate(id),
    update: (id: string, patch: Partial<Training>) => updateMut.mutate({ id, patch }),
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
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("techniques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
  });

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    add: (t: Omit<Technique, "id">) => addMut.mutate(t),
    remove: (id: string) => removeMut.mutate(id),
    update: (id: string, patch: Partial<Technique>) => updateMut.mutate({ id, patch }),
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
      const current = query.data?.find((w) => w.week === week);
      if (!current) return;
      const nextItems = current.items.map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i,
      );
      const { error } = await supabase
        .from("plan_weeks")
        .update({ items: nextItems as unknown as Json })
        .eq("week", week);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
      const current = query.data?.find((w) => w.id === id);
      const history = [
        ...(current?.history ?? []),
        { date: new Date().toISOString().slice(0, 10), score },
      ].slice(-30);
      const { error } = await supabase
        .from("weak_points")
        .update({ score, history })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
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
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
    setUnlocked: (id: string, unlocked: boolean) =>
      setUnlockedMut.mutate({ id, unlocked }),
  };
}

export { ACHIEVEMENT_TIERS } from "./bjj-types";
export type { AchievementTier };
export { TECHNIQUE_CATEGORIES } from "./bjj-types";
export type { TechniqueCategory };
