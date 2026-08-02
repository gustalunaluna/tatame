import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SinalDeRola } from "./hexagono-derivado.ts";

/** A janela do hexágono. Oito semanas, com meia-vida de quatro. */
export const SEMANAS_DA_JANELA = 8;

function desde(hoje = new Date()): string {
  const d = new Date(hoje.getTime() - SEMANAS_DA_JANELA * 7 * 86400000);
  return d.toISOString().slice(0, 10);
}

const paraSinal = (r: Record<string, unknown>): SinalDeRola => ({
  data: String(r.data ?? ""),
  parceiroFaixa: String(r.parceiro_faixa ?? ""),
  rolas: Number(r.rolas ?? 1),
  finAFavor: Number(r.fin_a_favor ?? 0),
  finSofridas: Number(r.fin_sofridas ?? 0),
  passAFavor: Number(r.pass_a_favor ?? 0),
  passSofridas: Number(r.pass_sofridas ?? 0),
  raspAFavor: Number(r.rasp_a_favor ?? 0),
  raspSofridas: Number(r.rasp_sofridas ?? 0),
  confirmado: Boolean(r.confirmado),
  detalhado: Boolean(r.detalhado),
  ritmoCaiuNa: r.ritmo_caiu_na === null || r.ritmo_caiu_na === undefined
    ? null
    : Number(r.ritmo_caiu_na),
  ritmoRespondido: Boolean(r.ritmo_respondido),
  rolasDaSessao: Number(r.rolas_da_sessao ?? 1),
});

/** As rolas da janela, cruas. A conta é feita em `hexagono-derivado.ts`. */
export function useSinaisDoJogo() {
  const query = useQuery({
    queryKey: ["sinais_do_jogo"],
    queryFn: async (): Promise<SinalDeRola[]> => {
      const { data, error } = await supabase.rpc("sinais_do_jogo" as never, {
        p_desde: desde(),
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraSinal);
    },
  });
  return { sinais: query.data ?? [], ready: query.isSuccess };
}

/* ================================================================== */

export interface TreinoSemDetalhe {
  trainingId: string;
  data: string;
  rolas: number;
  /** Parceiros daquele treino que ainda não têm os contadores preenchidos. */
  parceiros: { id: string; nome: string; faixa: string; rolas: number }[];
  ritmoRespondido: boolean;
}

/**
 * O que a semana deixou em aberto.
 *
 * É isto que faz o hexágono se atualizar sozinho sem virar formulário: em vez
 * de pedir uma nota, o app pergunta o que faltou do que já aconteceu. Quem
 * treinou e registrou parceiro só precisa dizer quantas passagens saíram.
 */
export function usePendenciasDaSemana() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pendencias_da_semana"],
    queryFn: async (): Promise<TreinoSemDetalhe[]> => {
      const seteDiasAtras = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .slice(0, 10);

      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) return [];

      const { data, error } = await supabase
        .from("trainings")
        .select(
          "id, date, rolls, ritmo_respondido, training_partners(id, partner_name, partner_belt, rolls, detalhado)",
        )
        .eq("user_id", eu)
        .gte("date", seteDiasAtras)
        .order("date", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as unknown as Record<string, unknown>[])
        .map((t) => {
          const parceiros = (
            (t.training_partners as Record<string, unknown>[] | null) ?? []
          )
            .filter((p) => !p.detalhado)
            .map((p) => ({
              id: String(p.id),
              nome: String(p.partner_name ?? "Parceiro"),
              faixa: String(p.partner_belt ?? ""),
              rolas: Number(p.rolls ?? 1),
            }));
          return {
            trainingId: String(t.id),
            data: String(t.date),
            rolas: Number(t.rolls ?? 0),
            parceiros,
            ritmoRespondido: Boolean(t.ritmo_respondido),
          };
        })
        // Só sobra o que realmente falta responder.
        .filter((t) => t.parceiros.length > 0 || !t.ritmoRespondido);
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["pendencias_da_semana"] });
    qc.invalidateQueries({ queryKey: ["sinais_do_jogo"] });
  };

  const responder = useMutation({
    mutationFn: async (entrada: {
      trainingId: string;
      ritmoCaiuNa: number | null;
      parceiros: {
        id: string;
        passesFor: number;
        passesAgainst: number;
        sweepsFor: number;
        subsFor: number;
        subsAgainst: number;
      }[];
    }) => {
      for (const p of entrada.parceiros) {
        const { error } = await supabase
          .from("training_partners")
          .update({
            passes_for: p.passesFor,
            passes_against: p.passesAgainst,
            sweeps_for: p.sweepsFor,
            subs_for: p.subsFor,
            subs_against: p.subsAgainst,
            // A bandeira é o que separa "respondi zero" de "não respondi".
            detalhado: true,
          } as never)
          .eq("id", p.id);
        if (error) throw error;
      }

      const { error } = await supabase
        .from("trainings")
        .update({
          ritmo_caiu_na: entrada.ritmoCaiuNa,
          ritmo_respondido: true,
        } as never)
        .eq("id", entrada.trainingId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Treino fechado. O hexágono já contou.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não deu para salvar."),
  });

  return { pendencias: query.data ?? [], ready: query.isSuccess, responder };
}
