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

/**
 * Manda o hexágono reler o banco.
 *
 * Existe porque gravar um treino são TRÊS passos — treino, parceiros,
 * técnicas — e quem alimenta os seis eixos é o segundo. O `useTrainings()`
 * invalida ao gravar o treino, o que é cedo demais: naquele instante os
 * parceiros ainda não existem, o hexágono recarrega sem eles e fica idêntico.
 *
 * Por isso o diário chama isto de novo no fim, com tudo já dentro. Duas
 * invalidações para o mesmo salvamento parece desperdício e não é: a primeira
 * pega o que já está no banco, a segunda pega o que chegou depois dela.
 */
export function useRecalcularJogo() {
  const qc = useQueryClient();
  return () => {
    // `refetchType: "all"` não é detalhe — é a correção inteira.
    //
    // O app roda com `refetchOnMount: false` (ver router.tsx), que é o que
    // torna a troca de abas instantânea. E o `invalidateQueries` padrão só
    // REFAZ o que está montado na tela; o resto ele apenas marca como velho.
    //
    // Some as duas coisas e o hexágono nunca atualizava: quando o treino é
    // salvo, a pessoa está no Diário e o painel do jogo está desmontado — a
    // invalidação o marcava como velho, e ao voltar para o Início o
    // `refetchOnMount: false` decidia não buscar de novo. Marcado como velho,
    // servido como novo, por cinco minutos.
    //
    // `"all"` força a releitura também do que está fora de tela, que é
    // exatamente o caso aqui.
    qc.invalidateQueries({ queryKey: ["sinais_do_jogo"], refetchType: "all" });
    qc.invalidateQueries({
      queryKey: ["pendencias_da_semana"],
      refetchType: "all",
    });
  };
}

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

/**
 * Quanto tempo para trás a comparação enxerga.
 *
 * Doze meses porque a pergunta que ela responde — "como eu estava antes do
 * campeonato", "julho contra agosto" — é de temporada, não de semana. É
 * consulta pesada demais para a tela inicial, e por isso mora numa chave
 * própria: quem só abre o Início nunca paga por ela.
 */
export const MESES_DO_HISTORICO = 12;

/** As rolas do último ano, para o comparador de meses. */
export function useSinaisDoHistorico(ativo = true) {
  const query = useQuery({
    // A chave começa com "sinais_do_jogo" de propósito: o `useRecalcularJogo`
    // invalida por prefixo, então registrar um treino derruba as duas de uma
    // vez sem precisar lembrar desta aqui.
    queryKey: ["sinais_do_jogo", "historico"],
    enabled: ativo,
    queryFn: async (): Promise<SinalDeRola[]> => {
      const d = new Date();
      d.setMonth(d.getMonth() - MESES_DO_HISTORICO);
      const { data, error } = await supabase.rpc("sinais_do_jogo" as never, {
        p_desde: d.toISOString().slice(0, 10),
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
