import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Faixa } from "./bjj-types";
import type {
  AtletaDaEquipe,
  CartaoPublico,
  DestaquePublico,
  EloDaLinhagem,
  VinculoDeMestre,
  PerfilEquipe,
  PerfilPublico,
  Equipe,
  MembroEquipe,
  PapelMembro,
  Parceria,
  PedidoDeAluno,
  RascunhoParceiro,
  RegistroAConfirmar,
  ResumoParceiro,
  StatusEquipe,
  StatusMembro,
} from "./social-types";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
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

/* eslint-disable @typescript-eslint/no-explicit-any */
type LinhaCartao = {
  user_id: string;
  handle: string | null;
  nickname: string | null;
  belt: string | null;
  degrees: number | null;
  gym?: string | null;
  photo_url: string | null;
  verificado?: boolean | null;
  equipe_oficial?: boolean | null;
};

function paraCartao(r: LinhaCartao): CartaoPublico {
  return {
    userId: r.user_id,
    handle: r.handle ?? "",
    nickname: r.nickname || r.handle || "Atleta",
    belt: (r.belt as Faixa) ?? "Branca",
    degrees: r.degrees ?? 0,
    gym: r.gym ?? "",
    photoUrl: r.photo_url ?? "",
    verificado: Boolean(r.verificado),
    equipeOficial: Boolean(r.equipe_oficial),
  };
}

/* ------------------------------------------------------------------ */
/* Meu @                                                               */
/* ------------------------------------------------------------------ */

export function useMeuHandle() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["meu_handle"],
    queryFn: async (): Promise<string> => {
      const id = await meuId();
      const { data, error } = await supabase
        .from("profiles")
        .select("handle")
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as { handle: string | null } | null)?.handle ?? "";
    },
  });

  const salvarMut = useMutation({
    mutationFn: async (handle: string) => {
      const id = await meuId();
      const { error } = await supabase
        .from("profiles")
        .update({ handle } as never)
        .eq("user_id", id);
      // 23505 = já existe alguém com esse @
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Esse @ já é de outra pessoa. Escolhe outro."
            : error.message,
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meu_handle"] });
      qc.invalidateQueries({ queryKey: ["perfil"] });
    },
    onError: aoFalhar("salvar o @"),
  });

  return {
    handle: query.data ?? "",
    ready: query.isSuccess,
    salvar: (h: string) => ok(salvarMut.mutateAsync(h)),
    salvando: salvarMut.isPending,
  };
}

/* ------------------------------------------------------------------ */
/* Parceiros                                                           */
/* ------------------------------------------------------------------ */

/** Busca por @ exato. Não existe busca parcial: ninguém varre a base. */
export function useBuscaPorHandle(termo: string) {
  const limpo = termo.trim().toLowerCase().replace(/^@+/, "");
  return useQuery({
    queryKey: ["busca_handle", limpo],
    enabled: limpo.length >= 3,
    queryFn: async (): Promise<CartaoPublico | null> => {
      const { data, error } = await supabase.rpc("buscar_por_handle" as never, {
        termo: limpo,
      } as never);
      if (error) throw error;
      const linhas = (data ?? []) as unknown as LinhaCartao[];
      return linhas.length ? paraCartao(linhas[0]) : null;
    },
  });
}

export interface ParceiroComCartao {
  parceria: Parceria;
  cartao: CartaoPublico | null;
}

/** Parcerias em todos os estados + o cartão público de cada pessoa. */
export function useParcerias() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["parcerias"],
    queryFn: async (): Promise<ParceiroComCartao[]> => {
      const eu = await meuId();
      const { data, error } = await supabase
        .from("partnerships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const linhas = (data ?? []) as unknown as {
        id: string;
        requester_id: string;
        addressee_id: string;
        status: Parceria["status"];
      }[];

      const parcerias: Parceria[] = linhas.map((r) => ({
        id: r.id,
        requesterId: r.requester_id,
        addresseeId: r.addressee_id,
        status: r.status,
        euConvidei: r.requester_id === eu,
        outroId: r.requester_id === eu ? r.addressee_id : r.requester_id,
      }));

      const ids = [...new Set(parcerias.map((p) => p.outroId))];
      const cartoes = new Map<string, CartaoPublico>();
      if (ids.length) {
        const { data: cs, error: e2 } = await supabase.rpc(
          "cartao_publico" as never,
          { ids } as never,
        );
        if (e2) throw e2;
        for (const c of (cs ?? []) as unknown as LinhaCartao[]) {
          cartoes.set(c.user_id, paraCartao(c));
        }
      }

      return parcerias.map((p) => ({
        parceria: p,
        cartao: cartoes.get(p.outroId) ?? null,
      }));
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["parcerias"] });
    qc.invalidateQueries({ queryKey: ["resumo_parceiros"] });
  };

  const convidarMut = useMutation({
    mutationFn: async (outroId: string) => {
      const eu = await meuId();
      const { error } = await supabase.from("partnerships").insert({
        requester_id: eu,
        addressee_id: outroId,
      } as never);
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Vocês já têm uma parceria (ou um convite em aberto)."
            : error.message,
        );
      }
    },
    onSuccess: invalidar,
    onError: aoFalhar("enviar o convite"),
  });

  const responderMut = useMutation({
    mutationFn: async ({ id, aceita }: { id: string; aceita: boolean }) => {
      const { error } = await supabase.rpc("responder_parceria" as never, {
        parceria: id,
        aceita,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("responder o convite"),
  });

  const desfazerMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partnerships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("desfazer a parceria"),
  });

  const todas = query.data ?? [];
  return {
    todas,
    aceitos: todas.filter((p) => p.parceria.status === "aceito"),
    recebidos: todas.filter(
      (p) => p.parceria.status === "pendente" && !p.parceria.euConvidei,
    ),
    enviados: todas.filter(
      (p) => p.parceria.status === "pendente" && p.parceria.euConvidei,
    ),
    ready: query.isSuccess,
    convidar: (outroId: string) => ok(convidarMut.mutateAsync(outroId)),
    responder: (id: string, aceita: boolean) =>
      ok(responderMut.mutateAsync({ id, aceita })),
    desfazer: (id: string) => ok(desfazerMut.mutateAsync(id)),
  };
}

/** Placar acumulado por parceiro, já somando os dois lados confirmados. */
export function useResumoParceiros() {
  const query = useQuery({
    queryKey: ["resumo_parceiros"],
    queryFn: async (): Promise<ResumoParceiro[]> => {
      const { data, error } = await supabase.rpc("resumo_parceiros" as never);
      if (error) throw error;
      const linhas = (data ?? []) as unknown as {
        partner_id: string | null;
        partner_name: string;
        sessoes: number;
        rolls: number;
        subs_for: number;
        subs_against: number;
        pendentes: number;
        ultimo_treino: string | null;
      }[];

      const ids = linhas.map((l) => l.partner_id).filter(Boolean) as string[];
      const cartoes = new Map<string, CartaoPublico>();
      if (ids.length) {
        const { data: cs } = await supabase.rpc("cartao_publico" as never, {
          ids,
        } as never);
        for (const c of (cs ?? []) as unknown as LinhaCartao[]) {
          cartoes.set(c.user_id, paraCartao(c));
        }
      }

      return linhas.map((l) => ({
        partnerId: l.partner_id,
        partnerName:
          (l.partner_id && cartoes.get(l.partner_id)?.nickname) ||
          l.partner_name ||
          "Parceiro",
        sessoes: Number(l.sessoes),
        rolls: Number(l.rolls),
        subsFor: Number(l.subs_for),
        subsAgainst: Number(l.subs_against),
        pendentes: Number(l.pendentes),
        ultimoTreino: l.ultimo_treino,
      }));
    },
  });
  return { itens: query.data ?? [], ready: query.isSuccess };
}

/** Registros que alguém fez sobre mim e que esperam minha palavra. */
export function useRegistrosAConfirmar() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["registros_a_confirmar"],
    queryFn: async (): Promise<RegistroAConfirmar[]> => {
      const { data, error } = await supabase.rpc(
        "registros_a_confirmar" as never,
      );
      if (error) throw error;
      return ((data ?? []) as unknown as {
        id: string;
        autor_id: string;
        autor_handle: string | null;
        autor_nickname: string | null;
        data: string;
        rolls: number;
        subs_for: number;
        subs_against: number;
        dias_restantes: number | null;
      }[]).map((r) => ({
        id: r.id,
        autorId: r.autor_id,
        autorHandle: r.autor_handle ?? "",
        autorNickname: r.autor_nickname || r.autor_handle || "Alguém",
        data: r.data,
        rolls: r.rolls,
        subsFor: r.subs_for,
        subsAgainst: r.subs_against,
        diasRestantes: r.dias_restantes ?? 0,
      }));
    },
  });

  const responderMut = useMutation({
    mutationFn: async ({ id, concorda }: { id: string; concorda: boolean }) => {
      const { error } = await supabase.rpc("responder_registro" as never, {
        registro: id,
        concorda,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registros_a_confirmar"] });
      qc.invalidateQueries({ queryKey: ["resumo_parceiros"] });
    },
    onError: aoFalhar("responder o registro"),
  });

  return {
    itens: query.data ?? [],
    ready: query.isSuccess,
    responder: (id: string, concorda: boolean) =>
      ok(responderMut.mutateAsync({ id, concorda })),
  };
}

/**
 * Grava a lista de parceiros de um treino — na criação e na edição.
 *
 * Quem manda é o banco: `salvar_parceiros_do_treino` grava por diferença, para
 * que uma linha que não mudou não perca a confirmação que já tinha. Linha com
 * `id` é uma que já existe; sem `id`, é nova.
 */
export async function salvarParceirosDoTreino(
  trainingId: string,
  linhas: RascunhoParceiro[],
) {
  const { error } = await supabase.rpc("salvar_parceiros_do_treino" as never, {
    p_training: trainingId,
    p_linhas: linhas.map((l) => ({
      id: l.id ?? null,
      partner_id: l.partnerId,
      partner_name: l.partnerId ? "" : l.partnerName.trim(),
      // Só mandamos a faixa do parceiro sem conta: para quem tem conta, um
      // gatilho no banco copia a faixa real do perfil dele.
      partner_belt: l.partnerId ? null : l.partnerBelt,
      rolls: l.rolls,
      subs_for: l.subsFor,
      subs_against: l.subsAgainst,
    })),
  } as never);
  if (error) throw error;
}

/** As linhas de parceiro já gravadas num treino, para abrir a edição. */
export function useParceirosDoTreino(trainingId: string | null) {
  const query = useQuery({
    queryKey: ["parceiros_do_treino", trainingId],
    enabled: !!trainingId,
    queryFn: async (): Promise<RascunhoParceiro[]> => {
      const { data, error } = await supabase.rpc(
        "parceiros_do_treino" as never,
        { p_training: trainingId } as never,
      );
      if (error) throw error;
      return ((data ?? []) as unknown as {
        id: string;
        partner_id: string | null;
        partner_name: string;
        partner_belt: string | null;
        rolls: number;
        subs_for: number;
        subs_against: number;
        confirmacao: string;
      }[]).map((r) => ({
        id: r.id,
        partnerId: r.partner_id,
        partnerName: r.partner_name,
        partnerBelt: (r.partner_belt as RascunhoParceiro["partnerBelt"]) ?? null,
        rolls: r.rolls,
        subsFor: r.subs_for,
        subsAgainst: r.subs_against,
        confirmacao: r.confirmacao,
      }));
    },
  });
  return { linhas: query.data ?? [], ready: query.isSuccess };
}

/* ------------------------------------------------------------------ */
/* Equipes                                                             */
/* ------------------------------------------------------------------ */

type LinhaEquipe = {
  id: string;
  name: string;
  slug: string;
  city: string;
  master: string;
  created_by: string;
  status: StatusEquipe;
  motivo_recusa: string;
};

const paraEquipe = (r: LinhaEquipe): Equipe => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  city: r.city,
  master: r.master,
  createdBy: r.created_by,
  status: r.status,
  motivoRecusa: r.motivo_recusa,
});

export function useEquipes() {
  const qc = useQueryClient();

  const listaQuery = useQuery({
    queryKey: ["equipes"],
    queryFn: async (): Promise<Equipe[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return ((data ?? []) as unknown as LinhaEquipe[]).map(paraEquipe);
    },
  });

  const minhasQuery = useQuery({
    queryKey: ["meus_vinculos"],
    queryFn: async () => {
      const eu = await meuId();
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", eu);
      if (error) throw error;
      return ((data ?? []) as unknown as {
        team_id: string;
        role: PapelMembro;
        status: StatusMembro;
      }[]).map((r) => ({
        teamId: r.team_id,
        role: r.role,
        status: r.status,
      }));
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["equipes"] });
    qc.invalidateQueries({ queryKey: ["meus_vinculos"] });
    qc.invalidateQueries({ queryKey: ["membros_equipe"] });
  };

  const pedirMut = useMutation({
    mutationFn: async (dados: { nome: string; cidade: string; mestre: string }) => {
      const { error } = await supabase.rpc("pedir_equipe" as never, {
        nome: dados.nome,
        cidade: dados.cidade,
        mestre: dados.mestre,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("pedir o cadastro da equipe"),
  });

  const entrarMut = useMutation({
    mutationFn: async (teamId: string) => {
      const eu = await meuId();
      const { error } = await supabase
        .from("team_members")
        .insert({ team_id: teamId, user_id: eu } as never);
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Você já pediu para entrar nessa equipe."
            : error.message,
        );
      }
    },
    onSuccess: invalidar,
    onError: aoFalhar("pedir entrada na equipe"),
  });

  const sairMut = useMutation({
    mutationFn: async (teamId: string) => {
      const eu = await meuId();
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", eu);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("sair da equipe"),
  });

  const decidirMut = useMutation({
    mutationFn: async (dados: {
      teamId: string;
      userId: string;
      aceita: boolean;
    }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ status: dados.aceita ? "ativo" : "recusado" } as never)
        .eq("team_id", dados.teamId)
        .eq("user_id", dados.userId);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("responder o pedido"),
  });

  const papelMut = useMutation({
    mutationFn: async (d: { teamId: string; userId: string; role: PapelMembro }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role: d.role } as never)
        .eq("team_id", d.teamId)
        .eq("user_id", d.userId);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("mudar o papel do membro"),
  });

  const vinculos = minhasQuery.data ?? [];
  const equipes = listaQuery.data ?? [];

  return {
    equipes,
    aprovadas: equipes.filter((e) => e.status === "aprovada"),
    vinculos,
    minhaEquipe: equipes.find((e) =>
      vinculos.some((v) => v.teamId === e.id && v.status === "ativo"),
    ),
    souDono: (teamId: string) =>
      vinculos.some(
        (v) => v.teamId === teamId && v.role === "dono" && v.status === "ativo",
      ),
    vinculoDe: (teamId: string) => vinculos.find((v) => v.teamId === teamId),
    ready: listaQuery.isSuccess && minhasQuery.isSuccess,
    pedirCadastro: (nome: string, cidade: string, mestre: string) =>
      ok(pedirMut.mutateAsync({ nome, cidade, mestre })),
    entrar: (teamId: string) => ok(entrarMut.mutateAsync(teamId)),
    sair: (teamId: string) => ok(sairMut.mutateAsync(teamId)),
    decidir: (teamId: string, userId: string, aceita: boolean) =>
      ok(decidirMut.mutateAsync({ teamId, userId, aceita })),
    definirPapel: (teamId: string, userId: string, role: PapelMembro) =>
      ok(papelMut.mutateAsync({ teamId, userId, role })),
  };
}

export function useMembrosDaEquipe(teamId: string | undefined) {
  const query = useQuery({
    queryKey: ["membros_equipe", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<MembroEquipe[]> => {
      const { data, error } = await supabase.rpc("membros_da_equipe" as never, {
        equipe: teamId,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as (LinhaCartao & {
        role: PapelMembro;
        status: StatusMembro;
      })[]).map((r) => ({
        ...paraCartao(r),
        role: r.role,
        status: r.status,
      }));
    },
  });
  const itens = query.data ?? [];
  return {
    itens,
    ativos: itens.filter((m) => m.status === "ativo"),
    pendentes: itens.filter((m) => m.status === "pendente"),
    ready: query.isSuccess,
  };
}


/* ------------------------------------------------------------------ */
/* Perfil de outra pessoa                                              */
/* ------------------------------------------------------------------ */

/**
 * O mesmo perfil, visto de fora. Quem decide o que sai é o banco: diário,
 * metas, plano, pontos fracos e a data de nascimento exata ficam de fora —
 * só a idade sai.
 */
export function usePerfilPublico(handle: string | undefined) {
  const limpo = (handle ?? "").trim().toLowerCase().replace(/^@+/, "");

  const perfil = useQuery({
    queryKey: ["perfil_publico", limpo],
    enabled: limpo.length >= 3,
    queryFn: async (): Promise<PerfilPublico | null> => {
      const { data, error } = await supabase.rpc("perfil_publico" as never, {
        p_handle: limpo,
      } as never);
      if (error) throw error;
      const linhas = (data ?? []) as unknown as Record<string, unknown>[];
      if (!linhas.length) return null;
      const r = linhas[0];
      return {
        userId: r.user_id as string,
        handle: (r.handle as string) ?? "",
        nickname: (r.nickname as string) || (r.handle as string) || "Atleta",
        bio: (r.bio as string) ?? "",
        belt: ((r.belt as string) ?? "Branca") as PerfilPublico["belt"],
        degrees: (r.degrees as number) ?? 0,
        photoUrl: (r.photo_url as string) ?? "",
        verificado: Boolean(r.verificado),
        idade: (r.idade as number) ?? null,
        gym: (r.gym as string) ?? "",
        master: (r.master as string) ?? "",
        teamId: (r.team_id as string) ?? null,
        teamName: (r.team_name as string) ?? "",
        teamCrest: (r.team_crest as string) ?? "",
        teamStatus: (r.team_status as string) ?? "",
        teamSlug: (r.team_slug as string) ?? "",
        masterHandle: (r.master_handle as string) ?? "",
        masterNickname: (r.master_nickname as string) ?? "",
        fightsWon: (r.fights_won as number) ?? 0,
        fightsLost: (r.fights_lost as number) ?? 0,
        treinos: Number(r.treinos ?? 0),
        parceiros: Number(r.parceiros ?? 0),
        conquistasTotal: Number(r.conquistas_total ?? 0),
        conquistasFeitas: Number(r.conquistas_feitas ?? 0),
        souEu: Boolean(r.sou_eu),
        eMeuParceiro: Boolean(r.e_meu_parceiro),
        papel: (r.papel as string) ?? "",
        instrutor: Boolean(r.instrutor),
        mestres: Number(r.mestres ?? 0),
      };
    },
  });

  const uid = perfil.data?.userId;

  const destaques = useQuery({
    queryKey: ["destaques_publicos", uid],
    enabled: !!uid,
    queryFn: async (): Promise<DestaquePublico[]> => {
      const { data, error } = await supabase.rpc("destaques_publicos" as never, {
        p_user: uid,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        title: r.title as string,
        tier: r.tier as string,
        unlocked: Boolean(r.unlocked),
      }));
    },
  });

  const parceiros = useQuery({
    queryKey: ["parceiros_publicos", uid],
    enabled: !!uid,
    queryFn: async (): Promise<CartaoPublico[]> => {
      const { data, error } = await supabase.rpc("parceiros_publicos" as never, {
        p_user: uid,
        p_limite: 8,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as LinhaCartao[]).map(paraCartao);
    },
  });

  return {
    perfil: perfil.data ?? null,
    naoExiste: perfil.isSuccess && !perfil.data,
    destaques: destaques.data ?? [],
    parceiros: parceiros.data ?? [],
    ready: perfil.isSuccess,
  };
}


/* ------------------------------------------------------------------ */
/* Perfil da academia                                                  */
/* ------------------------------------------------------------------ */

const paraAtleta = (r: Record<string, unknown>): AtletaDaEquipe => ({
  userId: r.user_id as string,
  handle: (r.handle as string) ?? "",
  nickname: (r.nickname as string) || (r.handle as string) || "Atleta",
  belt: ((r.belt as string) ?? "Branca") as AtletaDaEquipe["belt"],
  degrees: (r.degrees as number) ?? 0,
  photoUrl: (r.photo_url as string) ?? "",
  role: (r.role as string) ?? undefined,
  verificado: Boolean(r.verificado),
  equipeOficial: r.equipe_oficial === undefined ? undefined : Boolean(r.equipe_oficial),
  teamNome: (r.team_nome as string) ?? undefined,
});

/** A vitrine da academia — institucional, aberta a qualquer pessoa logada. */
export function usePerfilEquipe(slug: string | undefined) {
  const limpo = (slug ?? "").trim().toLowerCase();

  const equipe = useQuery({
    queryKey: ["perfil_equipe", limpo],
    enabled: limpo.length >= 2,
    queryFn: async (): Promise<PerfilEquipe | null> => {
      const { data, error } = await supabase.rpc("perfil_equipe" as never, {
        p_slug: limpo,
      } as never);
      if (error) throw error;
      const linhas = (data ?? []) as unknown as Record<string, unknown>[];
      if (!linhas.length) return null;
      const r = linhas[0];
      return {
        id: r.id as string,
        name: r.name as string,
        slug: r.slug as string,
        city: (r.city as string) ?? "",
        master: (r.master as string) ?? "",
        crestUrl: (r.crest_url as string) ?? "",
        criadaEm: (r.criada_em as string) ?? null,
        alunos: Number(r.alunos ?? 0),
        faixasPretas: Number(r.faixas_pretas ?? 0),
        competidores: Number(r.competidores ?? 0),
        titulos: Number(r.titulos ?? 0),
        vitorias: Number(r.vitorias ?? 0),
        derrotas: Number(r.derrotas ?? 0),
        souMembro: Boolean(r.sou_membro),
        souDono: Boolean(r.sou_dono),
        meuStatus: (r.meu_status as string) ?? "",
      };
    },
  });

  const id = equipe.data?.id;

  const graduados = useQuery({
    queryKey: ["graduados_equipe", id],
    enabled: !!id,
    queryFn: async (): Promise<AtletaDaEquipe[]> => {
      const { data, error } = await supabase.rpc("graduados_da_equipe" as never, {
        p_team: id,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraAtleta);
    },
  });

  const atletas = useQuery({
    queryKey: ["atletas_equipe", id],
    enabled: !!id,
    queryFn: async (): Promise<AtletaDaEquipe[]> => {
      const { data, error } = await supabase.rpc("atletas_da_equipe" as never, {
        p_team: id,
        p_limite: 8,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraAtleta);
    },
  });

  return {
    equipe: equipe.data ?? null,
    naoExiste: equipe.isSuccess && !equipe.data,
    graduados: graduados.data ?? [],
    atletas: atletas.data ?? [],
    ready: equipe.isSuccess,
  };
}


/* ------------------------------------------------------------------ */
/* Listas completas, carregadas por página                             */
/* ------------------------------------------------------------------ */

const PAGINA = 30;

/**
 * Lista paginada. Em vez de acumular páginas em estado — que dá problema de
 * ordem entre efeitos — a consulta é uma só, com o limite crescendo. O React
 * Query guarda cada tamanho em cache, então "Ver mais" reaproveita o que já
 * veio e só busca o excedente.
 */
function useListaPaginada(
  chave: string,
  rpc: string,
  argumento: Record<string, unknown> | null,
) {
  const [limite, setLimite] = useState(PAGINA);
  const alvo = JSON.stringify(argumento);

  // Trocou de pessoa ou de academia: volta para a primeira página
  useEffect(() => setLimite(PAGINA), [alvo]);

  const query = useQuery({
    queryKey: [chave, alvo, limite],
    enabled: argumento !== null,
    placeholderData: (anterior) => anterior,
    queryFn: async (): Promise<AtletaDaEquipe[]> => {
      const { data, error } = await supabase.rpc(rpc as never, {
        ...argumento,
        p_limite: limite,
        p_offset: 0,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraAtleta);
    },
  });

  const itens = query.data ?? [];
  return {
    itens,
    temMais: itens.length >= limite,
    carregando: query.isFetching,
    carregarMais: () => setLimite((n) => n + PAGINA),
  };
}

export function useListaDeParceiros(userId: string | undefined) {
  return useListaPaginada(
    "lista_parceiros",
    "parceiros_publicos",
    userId ? { p_user: userId } : null,
  );
}

export function useListaDeAtletas(teamId: string | undefined) {
  return useListaPaginada(
    "lista_atletas",
    "atletas_da_equipe",
    teamId ? { p_team: teamId } : null,
  );
}

/**
 * Os alunos de um mestre.
 *
 * "Aluno" aqui não é campo digitado: é membro ativo de uma equipe que a pessoa
 * comanda. É a mesma relação que o app já usa no sentido contrário — o mestre
 * de alguém é o dono da equipe dela — só que lida de trás para frente.
 */
export function useAlunosDoMestre(handle: string | undefined) {
  return useListaPaginada(
    "alunos_do_mestre",
    "alunos_do_mestre",
    handle ? { p_handle: handle } : null,
  );
}

/** Se a pessoa comanda alguma equipe, e quantos alunos tem. */
export function useResumoDeMestre(handle: string | null | undefined) {
  const query = useQuery({
    queryKey: ["resumo_de_mestre", handle],
    enabled: !!handle,
    queryFn: async (): Promise<{ eMestre: boolean; alunos: number; equipes: number }> => {
      const { data, error } = await supabase
        .rpc("resumo_de_mestre" as never, { p_handle: handle } as never)
        .single();
      if (error) throw error;
      const r = (data ?? {}) as Record<string, unknown>;
      return {
        eMestre: Boolean(r.e_mestre),
        alunos: Number(r.alunos ?? 0),
        equipes: Number(r.equipes ?? 0),
      };
    },
  });
  return {
    ...(query.data ?? { eMestre: false, alunos: 0, equipes: 0 }),
    ready: query.isSuccess,
  };
}

/* ------------------------------------------------------------------ */
/* Mestres e linhagem                                                  */
/* ------------------------------------------------------------------ */

const paraVinculo = (r: Record<string, unknown>): VinculoDeMestre => ({
  id: r.id as string,
  papel: (r.papel as VinculoDeMestre["papel"]) ?? "mestre",
  principal: Boolean(r.principal),
  desde: (r.desde as string) ?? null,
  ate: (r.ate as string) ?? null,
  nota: (r.nota as string) ?? "",
  mestreHandle: (r.mestre_handle as string) ?? "",
  mestreNome: (r.mestre_nome as string) ?? "",
  mestreBelt: ((r.mestre_belt as string) ?? "") as VinculoDeMestre["mestreBelt"],
  mestreGraus: Number(r.mestre_graus ?? 0),
  mestreFoto: (r.mestre_foto as string) ?? "",
  mestreVerificado: Boolean(r.mestre_verificado),
  teamSlug: (r.team_slug as string) ?? "",
  teamNome: (r.team_nome as string) ?? "",
  souDono: Boolean(r.sou_dono),
  situacao: ((r.situacao as string) ?? "aceito") as VinculoDeMestre["situacao"],
});

/**
 * Os mestres de alguém — todos, não um.
 *
 * O campo de texto `master` do perfil guardava um nome só, e por isso a
 * história inteira de quem treina há dez anos cabia numa linha: sumia quem
 * iniciou a pessoa, sumia quem a graduou preta. São vínculos separados, cada
 * um com período e academia.
 */
export function useMestresDe(handle: string | undefined) {
  const limpo = (handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  const query = useQuery({
    queryKey: ["mestres_de", limpo],
    enabled: limpo.length >= 3,
    queryFn: async (): Promise<VinculoDeMestre[]> => {
      const { data, error } = await supabase.rpc("mestres_de" as never, {
        p_handle: limpo,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraVinculo);
    },
  });
  return {
    mestres: query.data ?? [],
    ready: query.isSuccess,
  };
}

/**
 * A linhagem: a corrente para trás, seguindo sempre o mestre principal.
 *
 * O elemento 0 é a própria pessoa — é o que permite desenhar a corrente
 * inteira sem a tela ter que costurar o topo na mão.
 */
export function useLinhagemDe(handle: string | undefined) {
  const limpo = (handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  const query = useQuery({
    queryKey: ["linhagem_de", limpo],
    enabled: limpo.length >= 3,
    queryFn: async (): Promise<EloDaLinhagem[]> => {
      const { data, error } = await supabase.rpc("linhagem_de" as never, {
        p_handle: limpo,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        nivel: Number(r.nivel ?? 0),
        handle: (r.handle as string) ?? "",
        nome: (r.nome as string) ?? "?",
        belt: ((r.belt as string) ?? "") as EloDaLinhagem["belt"],
        graus: Number(r.graus ?? 0),
        foto: (r.foto as string) ?? "",
        verificado: Boolean(r.verificado),
        temConta: Boolean(r.tem_conta),
      }));
    },
  });
  return {
    linhagem: query.data ?? [],
    /** Só os de cima — sem a própria pessoa. */
    acima: (query.data ?? []).filter((e) => e.nivel > 0),
    ready: query.isSuccess,
  };
}

/** Cadastrar, editar e apagar os próprios vínculos de mestre. */
export function useMeusMestres() {
  const qc = useQueryClient();
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["mestres_de"] });
    qc.invalidateQueries({ queryKey: ["linhagem_de"] });
  };

  const adicionar = useMutation({
    mutationFn: async (novo: {
      mestreId?: string | null;
      mestreNome?: string;
      /** Só para mestre de fora do app — quem tem conta mantém o próprio perfil. */
      mestreBelt?: string;
      mestreGraus?: number;
      mestreAcademia?: string;
      teamId?: string | null;
      papel?: VinculoDeMestre["papel"];
      principal?: boolean;
      desde?: string | null;
      nota?: string;
    }) => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) throw new Error("Entre para cadastrar seu mestre.");

      const nome = (novo.mestreNome ?? "").trim();
      const academia = (novo.mestreAcademia ?? "").trim();
      const belt = (novo.mestreBelt ?? "").trim();

      // Mestre de fora do app com faixa ou academia declarada ganha ficha
      // própria em `linhagem_externa`. O `mestre_nome` avulso guarda só um
      // nome — e era por isso que a Emy aparecia sem faixa e sem academia no
      // perfil, mesmo o dono do vínculo sabendo as duas coisas.
      //
      // Sem faixa nem academia não vale criar ficha: seria uma linha vazia com
      // a mesma informação que o texto já carrega.
      let externoId: string | null = null;
      if (!novo.mestreId && nome && (belt || academia)) {
        const { data, error } = await supabase
          .from("linhagem_externa" as never)
          .insert({
            nome,
            academia,
            belt: belt || null,
            degrees: belt ? (novo.mestreGraus ?? 0) : null,
            criado_por: eu,
          } as never)
          .select("id")
          .single();
        if (error) throw error;
        externoId = (data as unknown as { id: string }).id;
      }

      const { error } = await supabase.from("master_links" as never).insert({
        aluno_id: eu,
        mestre_id: novo.mestreId ?? null,
        mestre_externo_id: externoId,
        // O nome fica mesmo com a ficha externa criada: é o que sobra se a
        // ficha for apagada (`on delete set null`), e o CHECK da tabela exige
        // que reste ao menos uma das três origens.
        mestre_nome: novo.mestreId ? "" : nome,
        team_id: novo.teamId ?? null,
        papel: novo.papel ?? "mestre",
        principal: novo.principal ?? false,
        desde: novo.desde ?? null,
        nota: (novo.nota ?? "").trim(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Mestre cadastrado.");
    },
    onError: (e) => toast.error(mensagemDoErro(e)),
  });

  /** Marca um vínculo como principal — é por ele que a linhagem sobe. */
  const tornarPrincipal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("master_links" as never)
        .update({ principal: true } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Linhagem atualizada.");
    },
    onError: (e) => toast.error(mensagemDoErro(e)),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("master_links" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Vínculo removido.");
    },
    onError: (e) => toast.error(mensagemDoErro(e)),
  });

  return { adicionar, tornarPrincipal, remover };
}

/**
 * Os pedidos que chegaram para mim, como mestre.
 *
 * Existe porque o vínculo de mestre passou a nascer pendente (migração 032):
 * antes, quem se declarasse seu aluno entrava na sua lista e na sua linhagem
 * sem você saber. Agora a declaração vira um pedido, e o pedido precisa de
 * um lugar onde ser visto — é este.
 *
 * A consulta não é cara e a lista é curta por natureza: são pessoas apontando
 * para você, não o seu histórico inteiro.
 */
export function usePedidosDeAluno() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pedidos_de_aluno"],
    queryFn: async (): Promise<PedidoDeAluno[]> => {
      const { data, error } = await supabase.rpc("pedidos_de_aluno" as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        alunoHandle: (r.aluno_handle as string) ?? "",
        alunoNome: (r.aluno_nome as string) ?? "",
        alunoBelt: ((r.aluno_belt as string) ?? "") as PedidoDeAluno["alunoBelt"],
        alunoGraus: Number(r.aluno_graus ?? 0),
        alunoFoto: (r.aluno_foto as string) ?? "",
        papel: (r.papel as string) ?? "mestre",
        desde: (r.desde as string) ?? null,
        pedidoEm: (r.pedido_em as string) ?? "",
      }));
    },
  });

  const responder = useMutation({
    mutationFn: async ({ id, aceitar }: { id: string; aceitar: boolean }) => {
      const { error } = await supabase.rpc("responder_pedido_de_aluno" as never, {
        p_id: id,
        p_aceitar: aceitar,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_de_aluno"] });
      // A resposta muda o que aparece em três telas: a lista de mestres do
      // aluno, a corrente da linhagem e a lista de alunos deste mestre.
      qc.invalidateQueries({ queryKey: ["mestres_de"] });
      qc.invalidateQueries({ queryKey: ["linhagem_de"] });
      qc.invalidateQueries({ queryKey: ["alunos_de"] });
    },
    onError: aoFalhar("responder ao pedido"),
  });

  return {
    pedidos: query.data ?? [],
    ready: query.isSuccess,
    responder: (id: string, aceitar: boolean) => responder.mutate({ id, aceitar }),
    respondendo: responder.isPending,
  };
}
