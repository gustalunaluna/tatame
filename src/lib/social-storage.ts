import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Faixa } from "./bjj-types";
import type {
  CartaoPublico,
  Equipe,
  MembroEquipe,
  PapelMembro,
  Parceria,
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
    console.error(`[Tatame] Falha ao ${oque}:`, erro);
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
      }[]).map((r) => ({
        id: r.id,
        autorId: r.autor_id,
        autorHandle: r.autor_handle ?? "",
        autorNickname: r.autor_nickname || r.autor_handle || "Alguém",
        data: r.data,
        rolls: r.rolls,
        subsFor: r.subs_for,
        subsAgainst: r.subs_against,
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

/** Grava as linhas de parceiro de um treino recém-salvo. */
export async function salvarParceirosDoTreino(
  trainingId: string,
  linhas: RascunhoParceiro[],
) {
  const uteis = linhas.filter(
    (l) => l.partnerId || l.partnerName.trim().length > 0,
  );
  if (!uteis.length) return;
  const eu = await meuId();
  const { error } = await supabase.from("training_partners").insert(
    uteis.map((l) => ({
      training_id: trainingId,
      owner_id: eu,
      partner_id: l.partnerId,
      partner_name: l.partnerId ? "" : l.partnerName.trim(),
      rolls: l.rolls,
      subs_for: l.subsFor,
      subs_against: l.subsAgainst,
    })) as never,
  );
  if (error) throw error;
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
