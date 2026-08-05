import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SinalDeRola } from "./hexagono-derivado.ts";

/** A janela da leitura rolante — o padrão do painel. Meia-vida de quatro. */
export const SEMANAS_DA_JANELA = 8;

/**
 * Quanto o app traz do banco: um ano, não oito semanas.
 *
 * Parece desperdício e não é — é o contrário. O hexágono agora oferece os
 * meses anteriores para comparar ali mesmo, e a alternativa seria uma segunda
 * consulta só para eles. Uma busca de doze meses é mais barata que duas
 * buscas, e some com a chance de as duas discordarem entre si.
 *
 * A leitura rolante continua sendo de oito semanas: quem filtra é
 * `janelaRolante()`, na hora de derivar, e não o banco.
 */
export const MESES_DE_HISTORICO = 12;

function desde(hoje = new Date()): string {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() - MESES_DE_HISTORICO);
  return d.toISOString().slice(0, 10);
}

/**
 * Só as rolas das últimas oito semanas.
 *
 * O decaimento exponencial já deixaria as antigas quase sem peso (0,5^13 num
 * ano), mas "quase" não é o mesmo que "fora": o rótulo diz **8 semanas**, e um
 * gráfico que diz uma coisa e conta outra é um gráfico que mente. O corte é
 * explícito para que o rótulo continue verdadeiro.
 */
export function janelaRolante(
  sinais: SinalDeRola[],
  hoje = new Date(),
): SinalDeRola[] {
  const corte = new Date(hoje.getTime() - SEMANAS_DA_JANELA * 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  return sinais.filter((s) => s.data >= corte);
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

/**
 * As rolas do último ano, cruas. A conta é feita em `hexagono-derivado.ts`.
 *
 * Serve às duas leituras do painel: a rolante de oito semanas (depois de
 * `janelaRolante()`) e a de cada mês fechado, para a comparação. Uma consulta
 * só — ver o comentário de `MESES_DE_HISTORICO`.
 */
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
