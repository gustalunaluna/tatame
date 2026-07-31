import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

/* ------------------------------------------------------------------ */

export type Colocacao = "ouro" | "prata" | "bronze";
export type Modalidade = "Gi" | "No-Gi";

export const COLOCACOES: { valor: Colocacao; nome: string }[] = [
  { valor: "ouro", nome: "Ouro" },
  { valor: "prata", nome: "Prata" },
  { valor: "bronze", nome: "Bronze" },
];

export interface Medalha {
  id: string;
  colocacao: Colocacao;
  evento: string;
  categoria: string;
  federacao: string;
  modalidade: Modalidade;
  data: string;
  absoluto: boolean;
  destaque: boolean;
  teamSlug: string;
  teamNome: string;
  teamCrest: string;
  souDono: boolean;
}

export interface NovaMedalha {
  colocacao: Colocacao;
  evento: string;
  categoria: string;
  federacao: string;
  modalidade: Modalidade;
  data: string;
  absoluto: boolean;
  teamId: string | null;
}

export interface ResumoMedalhas {
  ouro: number;
  prata: number;
  bronze: number;
  total: number;
}

const paraMedalha = (r: Record<string, unknown>): Medalha => ({
  id: r.id as string,
  colocacao: r.colocacao as Colocacao,
  evento: r.evento as string,
  categoria: (r.categoria as string) ?? "",
  federacao: (r.federacao as string) ?? "",
  modalidade: (r.modalidade as Modalidade) ?? "Gi",
  data: r.data as string,
  absoluto: Boolean(r.absoluto),
  destaque: Boolean(r.destaque),
  teamSlug: (r.team_slug as string) ?? "",
  teamNome: (r.team_nome as string) ?? "",
  teamCrest: (r.team_crest as string) ?? "",
  souDono: Boolean(r.sou_dono),
});

/* ================================================================== */
/* Medalhas de uma pessoa                                             */
/* ================================================================== */

const PAGINA = 20;

/**
 * As medalhas de um atleta. `soDestaque` traz só as três que ele escolheu
 * para o perfil; sem ele, a lista inteira, paginada.
 */
export function useMedalhasDoAtleta(
  handle: string | null,
  soDestaque = false,
) {
  const [limite, setLimite] = useState(soDestaque ? 3 : PAGINA);
  useEffect(() => setLimite(soDestaque ? 3 : PAGINA), [handle, soDestaque]);

  const query = useQuery({
    queryKey: ["medalhas_atleta", handle, soDestaque, limite],
    enabled: !!handle,
    placeholderData: (anterior) => anterior,
    queryFn: async (): Promise<Medalha[]> => {
      const { data, error } = await supabase.rpc(
        "medalhas_do_atleta" as never,
        {
          p_handle: handle,
          p_so_destaque: soDestaque,
          p_limite: limite,
          p_offset: 0,
        } as never,
      );
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(
        paraMedalha,
      );
    },
  });

  const itens = query.data ?? [];
  return {
    medalhas: itens,
    ready: query.isSuccess,
    temMais: !soDestaque && itens.length >= limite,
    carregarMais: () => setLimite((n) => n + PAGINA),
  };
}

export function useResumoMedalhasDoAtleta(handle: string | null) {
  const query = useQuery({
    queryKey: ["resumo_medalhas_atleta", handle],
    enabled: !!handle,
    queryFn: async (): Promise<ResumoMedalhas> => {
      const { data, error } = await supabase
        .rpc("resumo_medalhas_do_atleta" as never, { p_handle: handle } as never)
        .single();
      if (error) throw error;
      const r = (data ?? {}) as Record<string, unknown>;
      return {
        ouro: Number(r.ouro ?? 0),
        prata: Number(r.prata ?? 0),
        bronze: Number(r.bronze ?? 0),
        total: Number(r.total ?? 0),
      };
    },
  });
  return {
    resumo: query.data ?? { ouro: 0, prata: 0, bronze: 0, total: 0 },
    ready: query.isSuccess,
  };
}

/* ================================================================== */
/* Escrita — só do dono                                               */
/* ================================================================== */

export function useMinhasMedalhas(meuHandle: string | null) {
  const qc = useQueryClient();

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["medalhas_atleta"] });
    qc.invalidateQueries({ queryKey: ["resumo_medalhas_atleta"] });
    qc.invalidateQueries({ queryKey: ["medalhas_equipe"] });
    qc.invalidateQueries({ queryKey: ["resumo_medalhas_equipe"] });
    qc.invalidateQueries({ queryKey: ["perfil_equipe"] });
  };

  const criarMut = useMutation({
    mutationFn: async (m: NovaMedalha) => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) throw new Error("Sem sessão");
      const { error } = await supabase.from("medals").insert({
        user_id: eu,
        team_id: m.teamId,
        colocacao: m.colocacao,
        evento: m.evento.trim(),
        categoria: m.categoria.trim(),
        federacao: m.federacao.trim(),
        modalidade: m.modalidade,
        data: m.data,
        absoluto: m.absoluto,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("registrar a medalha"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar a medalha"),
  });

  // O limite de três é do banco, não daqui: um gatilho recusa a quarta. A
  // mensagem que o usuário vê é a que o banco escreveu.
  const destacarMut = useMutation({
    mutationFn: async ({ id, destaque }: { id: string; destaque: boolean }) => {
      const { error } = await supabase
        .from("medals")
        .update({ destaque } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("mudar o destaque"),
  });

  const { medalhas, ready, temMais, carregarMais } =
    useMedalhasDoAtleta(meuHandle);

  return {
    medalhas,
    ready,
    temMais,
    carregarMais,
    emDestaque: medalhas.filter((m) => m.destaque).length,
    criar: (m: NovaMedalha) => ok(criarMut.mutateAsync(m)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
    destacar: (id: string, destaque: boolean) =>
      ok(destacarMut.mutateAsync({ id, destaque })),
  };
}

/* ================================================================== */
/* Medalhas de uma academia                                           */
/* ================================================================== */

export interface MedalhaDaEquipe {
  id: string;
  colocacao: Colocacao;
  evento: string;
  categoria: string;
  federacao: string;
  modalidade: Modalidade;
  data: string;
  absoluto: boolean;
  atletaHandle: string;
  atletaNome: string;
  atletaFoto: string;
  atletaFaixa: string;
  atletaGraus: number;
  possoOcultar: boolean;
}

export interface ResumoDaEquipe extends ResumoMedalhas {
  atletas: number;
  eventos: number;
}

export function useResumoMedalhasDaEquipe(slug: string | null) {
  const query = useQuery({
    queryKey: ["resumo_medalhas_equipe", slug],
    enabled: !!slug,
    queryFn: async (): Promise<ResumoDaEquipe> => {
      const { data, error } = await supabase
        .rpc("resumo_medalhas_da_equipe" as never, { p_slug: slug } as never)
        .single();
      if (error) throw error;
      const r = (data ?? {}) as Record<string, unknown>;
      return {
        ouro: Number(r.ouro ?? 0),
        prata: Number(r.prata ?? 0),
        bronze: Number(r.bronze ?? 0),
        total: Number(r.total ?? 0),
        atletas: Number(r.atletas ?? 0),
        eventos: Number(r.eventos ?? 0),
      };
    },
  });
  return {
    resumo:
      query.data ??
      { ouro: 0, prata: 0, bronze: 0, total: 0, atletas: 0, eventos: 0 },
    ready: query.isSuccess,
  };
}

export function useMedalhasDaEquipe(slug: string | null, porPagina = PAGINA) {
  const qc = useQueryClient();
  const [limite, setLimite] = useState(porPagina);
  useEffect(() => setLimite(porPagina), [slug, porPagina]);

  const query = useQuery({
    queryKey: ["medalhas_equipe", slug, limite],
    enabled: !!slug,
    placeholderData: (anterior) => anterior,
    queryFn: async (): Promise<MedalhaDaEquipe[]> => {
      const { data, error } = await supabase.rpc(
        "medalhas_da_equipe" as never,
        { p_slug: slug, p_limite: limite, p_offset: 0 } as never,
      );
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        colocacao: r.colocacao as Colocacao,
        evento: r.evento as string,
        categoria: (r.categoria as string) ?? "",
        federacao: (r.federacao as string) ?? "",
        modalidade: (r.modalidade as Modalidade) ?? "Gi",
        data: r.data as string,
        absoluto: Boolean(r.absoluto),
        atletaHandle: (r.atleta_handle as string) ?? "",
        atletaNome: (r.atleta_nome as string) ?? "",
        atletaFoto: (r.atleta_foto as string) ?? "",
        atletaFaixa: (r.atleta_faixa as string) ?? "Branca",
        atletaGraus: Number(r.atleta_graus ?? 0),
        possoOcultar: Boolean(r.posso_ocultar),
      }));
    },
  });

  const ocultarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc(
        "ocultar_medalha_da_equipe" as never,
        { p_medalha: id, p_ocultar: true } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medalhas_equipe"] });
      qc.invalidateQueries({ queryKey: ["resumo_medalhas_equipe"] });
      qc.invalidateQueries({ queryKey: ["perfil_equipe"] });
      toast.success("Tirada do perfil da academia. O atleta continua com ela.");
    },
    onError: aoFalhar("tirar a medalha do perfil da academia"),
  });

  const itens = query.data ?? [];
  return {
    medalhas: itens,
    ready: query.isSuccess,
    temMais: itens.length >= limite,
    carregarMais: () => setLimite((n) => n + PAGINA),
    ocultar: (id: string) => ok(ocultarMut.mutateAsync(id)),
  };
}
