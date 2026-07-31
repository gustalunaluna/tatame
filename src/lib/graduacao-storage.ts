import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Faixa } from "./bjj-types";

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

export interface Graduacao {
  id: string;
  belt: Faixa;
  /** 0 = a faixa em si; 1..4 = os graus dela */
  degrees: number;
  data: string;
  nota: string;
  mestreNome: string;
  mestreHandle: string;
  mestreVerificado: boolean;
  teamSlug: string;
  teamNome: string;
  teamCrest: string;
  souDono: boolean;
}

export interface NovaGraduacao {
  belt: Faixa;
  degrees: number;
  data: string;
  nota: string;
  /** quem entregou: um perfil do app, se tiver conta */
  mestreId: string | null;
  /** ou só o nome escrito, quando não tem */
  mestreNome: string;
  teamId: string | null;
}

/** "Faixa Azul" para a faixa em si, "3º grau na Branca" para os graus. */
export function nomeDaGraduacao(g: { belt: string; degrees: number }): string {
  return g.degrees === 0
    ? `Faixa ${g.belt}`
    : `${g.degrees}º grau na ${g.belt}`;
}

export function useHistoricoDeGraduacao(handle: string | null) {
  const query = useQuery({
    queryKey: ["graduacoes", handle],
    enabled: !!handle,
    queryFn: async (): Promise<Graduacao[]> => {
      const { data, error } = await supabase.rpc(
        "historico_de_graduacao" as never,
        { p_handle: handle } as never,
      );
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        belt: r.belt as Faixa,
        degrees: Number(r.degrees ?? 0),
        data: r.data as string,
        nota: (r.nota as string) ?? "",
        mestreNome: (r.mestre_nome as string) ?? "",
        mestreHandle: (r.mestre_handle as string) ?? "",
        mestreVerificado: Boolean(r.mestre_verificado),
        teamSlug: (r.team_slug as string) ?? "",
        teamNome: (r.team_nome as string) ?? "",
        teamCrest: (r.team_crest as string) ?? "",
        souDono: Boolean(r.sou_dono),
      }));
    },
  });
  return { graduacoes: query.data ?? [], ready: query.isSuccess };
}

export function useMinhasGraduacoes(meuHandle: string | null) {
  const qc = useQueryClient();
  const { graduacoes, ready } = useHistoricoDeGraduacao(meuHandle);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["graduacoes"] });

  const criarMut = useMutation({
    mutationFn: async (g: NovaGraduacao) => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) throw new Error("Sem sessão");
      const { error } = await supabase.from("graduations").insert({
        user_id: eu,
        belt: g.belt,
        degrees: g.degrees,
        data: g.data,
        nota: g.nota.trim(),
        mestre_id: g.mestreId,
        // Quando o mestre tem conta, o nome sai do perfil dele — guardar uma
        // cópia aqui só criaria duas verdades sobre a mesma pessoa.
        mestre_nome: g.mestreId ? "" : g.mestreNome.trim(),
        team_id: g.teamId,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("registrar a graduação"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("graduations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar a graduação"),
  });

  return {
    graduacoes,
    ready,
    criar: (g: NovaGraduacao) => ok(criarMut.mutateAsync(g)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
  };
}
