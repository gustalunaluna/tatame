import type { Faixa } from "./bjj-types";

/** O que uma pessoa vê de outra. Nada além disto sai do banco. */
export interface CartaoPublico {
  userId: string;
  handle: string;
  nickname: string;
  belt: Faixa;
  degrees: number;
  gym: string;
  photoUrl: string;
  /** faixa preta confirmada por um admin do app */
  verificado: boolean;
  /** membro ativo de uma equipe aprovada — é o que sustenta o selo de aluno */
  equipeOficial: boolean;
}

export type StatusEquipe = "pendente" | "aprovada" | "recusada";
export type StatusMembro = "pendente" | "ativo" | "recusado";
/** `mestre` é o papel que a academia concede — e que dá o selo à pessoa */
export type PapelMembro = "dono" | "mestre" | "membro";

export interface Equipe {
  id: string;
  name: string;
  slug: string;
  city: string;
  master: string;
  createdBy: string;
  status: StatusEquipe;
  motivoRecusa: string;
}

export interface MembroEquipe extends Omit<CartaoPublico, "gym"> {
  role: PapelMembro;
  status: StatusMembro;
}

export type StatusParceria = "pendente" | "aceito" | "recusado";

export interface Parceria {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: StatusParceria;
  /** true quando fui eu que convidei */
  euConvidei: boolean;
  /** o outro lado da parceria */
  outroId: string;
}

export type Confirmacao =
  | "pendente"
  | "confirmado"
  | "contestado"
  | "nao_se_aplica";

/** Uma linha de "com quem rolei neste treino e como foi" */
export interface ParceiroDoTreino {
  id: string;
  trainingId: string;
  /** null quando é alguém que ainda não tem conta no app */
  partnerId: string | null;
  partnerName: string;
  rolls: number;
  /** finalizações minhas nele */
  subsFor: number;
  /** finalizações dele em mim */
  subsAgainst: number;
  confirmacao: Confirmacao;
}

/** Linha do rascunho antes de salvar o treino */
export interface RascunhoParceiro {
  partnerId: string | null;
  partnerName: string;
  rolls: number;
  subsFor: number;
  subsAgainst: number;
}

/** Placar acumulado com uma pessoa, somando os dois lados já confirmados */
export interface ResumoParceiro {
  partnerId: string | null;
  partnerName: string;
  sessoes: number;
  rolls: number;
  subsFor: number;
  subsAgainst: number;
  /** registros esperando confirmação — ainda não contam */
  pendentes: number;
  ultimoTreino: string | null;
}

/** Registro que alguém fez sobre mim e que espera minha palavra */
export interface RegistroAConfirmar {
  id: string;
  autorId: string;
  autorHandle: string;
  autorNickname: string;
  data: string;
  rolls: number;
  /** finalizações que o autor diz ter feito em mim */
  subsFor: number;
  /** finalizações que o autor diz que eu fiz nele */
  subsAgainst: number;
}

/** Regras do @: minúsculas, 3–20, letras/números/ponto/underline */
export const REGRA_HANDLE = /^[a-z0-9][a-z0-9._]{2,19}$/;

export function normalizarHandle(bruto: string): string {
  return bruto
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._]/g, "");
}

export function erroDoHandle(handle: string): string | null {
  if (!handle) return "Escolha um @ para as pessoas te acharem.";
  if (handle.length < 3) return "Precisa de pelo menos 3 caracteres.";
  if (handle.length > 20) return "No máximo 20 caracteres.";
  if (!REGRA_HANDLE.test(handle)) {
    return "Use letras, números, ponto ou underline, começando por letra ou número.";
  }
  return null;
}

/** O perfil de outra pessoa, como o banco o serve */
export interface PerfilPublico {
  userId: string;
  handle: string;
  nickname: string;
  bio: string;
  belt: Faixa;
  degrees: number;
  photoUrl: string;
  verificado: boolean;
  idade: number | null;
  gym: string;
  master: string;
  teamId: string | null;
  teamName: string;
  teamCrest: string;
  teamStatus: string;
  fightsWon: number;
  fightsLost: number;
  treinos: number;
  parceiros: number;
  conquistasTotal: number;
  conquistasFeitas: number;
  souEu: boolean;
  eMeuParceiro: boolean;
}

export interface DestaquePublico {
  id: string;
  title: string;
  tier: string;
  unlocked: boolean;
}
