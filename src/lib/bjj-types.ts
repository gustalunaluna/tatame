// Metas de graduação (em dias desde o início da jornada)
export const DIAS_AZUL = 365; // Faixa Azul em 1 ano
export const DIAS_ROXA = 1095; // Faixa Roxa em 3 anos

export const FAIXAS = [
  "Branca",
  "Azul",
  "Roxa",
  "Marrom",
  "Preta",
  "Coral",
  "Vermelha",
] as const;
export type Faixa = (typeof FAIXAS)[number];

export interface Perfil {
  nickname: string;
  /** Texto livre do atleta: "3x campeão mundial", o que ele quiser dizer */
  bio: string;
  birthDate: string | null;
  photoUrl: string;
  belt: Faixa;
  degrees: number;
  master: string;
  gym: string;
  fightsWon: number;
  fightsLost: number;
  goalStart: string;
}

export type TrainingType = "Gi" | "No-Gi";

export interface Training {
  id: string;
  date: string; // ISO yyyy-mm-dd
  type: TrainingType;
  durationMin: number;
  rolls: number;
  partners: string;
  techniques: string;
  notes: string;
}

export type TechniqueCategory =
  | "Guarda"
  | "Passagem"
  | "Raspagem"
  | "Finalização"
  | "Queda"
  | "Escape"
  | "Defesa";

export const TECHNIQUE_CATEGORIES: TechniqueCategory[] = [
  "Guarda",
  "Passagem",
  "Raspagem",
  "Finalização",
  "Queda",
  "Escape",
  "Defesa",
];

export interface Technique {
  id: string;
  name: string;
  category: TechniqueCategory;
  notes: string;
  videoUrl: string;
  mastery: number; // 0-5
}

export interface PlanItem {
  id: string;
  label: string;
  done: boolean;
}

export interface PlanWeek {
  week: number;
  focus: string;
  items: PlanItem[];
}

export interface WeakPoint {
  id: string;
  label: string;
  score: number; // 0-5
  /** "fraco" é o que evoluir; "forte" é o que já funciona */
  kind: "fraco" | "forte";
  /** liga o ponto a um objetivo de plano, quando houver */
  objectiveSlug: string | null;
  history: { date: string; score: number }[];
}

export interface Analysis {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  content: string;
  createdAt: string;
}

export type AchievementTier =
  | "Branca"
  | "Azul"
  | "Roxa"
  | "Marrom"
  | "Preta"
  | "Coral"
  | "Vermelha";

export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  "Branca",
  "Azul",
  "Roxa",
  "Marrom",
  "Preta",
  "Coral",
  "Vermelha",
];

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  tier: AchievementTier;
  category: string;
  sortOrder: number;
  unlocked: boolean;
  unlockedDate: string | null;
  target: number | null;
  progress: number;
}
