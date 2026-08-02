import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EIXOS, hexagonoVazio, type NotasDoHexagono } from "./hexagono";

export interface AvaliacaoDoMes {
  /** Sempre o dia 1 — a unidade é o mês. */
  mes: string;
  notas: NotasDoHexagono;
  nota: string;
}

/** O primeiro dia do mês de uma data, em ISO. A chave de tudo aqui. */
export function mesDe(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** "agosto de 2026" — como se fala, para rótulo de legenda e de tabela. */
export function nomeDoMes(mes: string): string {
  const d = new Date(`${mes}T00:00:00`);
  if (Number.isNaN(d.getTime())) return mes;
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** "ago/26" — a versão curta, para caber na legenda do gráfico no celular. */
export function mesCurto(mes: string): string {
  const d = new Date(`${mes}T00:00:00`);
  if (Number.isNaN(d.getTime())) return mes;
  return d
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
}

const paraAvaliacao = (r: Record<string, unknown>): AvaliacaoDoMes => ({
  mes: String(r.mes ?? ""),
  notas: Object.fromEntries(
    EIXOS.map((e) => [e.slug, Number(r[e.slug] ?? 0)]),
  ) as NotasDoHexagono,
  nota: String(r.nota ?? ""),
});

/**
 * As avaliações mensais, da mais nova para a mais velha.
 *
 * Uma linha por mês, garantida por CHAVE ÚNICA no banco — não por disciplina
 * da tela. É o que faz "comparar com outro mês" ser uma escolha entre meses e
 * não entre carimbos arbitrários de slider, que era o que o histórico antigo
 * guardava.
 */
export function useAvaliacoes() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["avaliacoes_do_jogo"],
    queryFn: async (): Promise<AvaliacaoDoMes[]> => {
      const { data, error } = await supabase
        .from("avaliacoes_do_jogo" as never)
        .select("*")
        .order("mes", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraAvaliacao);
    },
  });

  const avaliacoes = query.data ?? [];
  const esteMes = mesDe();
  const atual = avaliacoes.find((a) => a.mes === esteMes) ?? null;
  /** O mês anterior COM avaliação — não o mês de calendário anterior. Quem
      pulou julho compara agosto com junho, e não com um hexágono vazio. */
  const anterior = avaliacoes.find((a) => a.mes < esteMes) ?? null;

  const salvar = useMutation({
    mutationFn: async (entrada: { notas: NotasDoHexagono; nota?: string; mes?: string }) => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) throw new Error("Entre para salvar sua avaliação.");

      const linha: Record<string, unknown> = {
        user_id: eu,
        mes: entrada.mes ?? esteMes,
        nota: (entrada.nota ?? "").trim(),
      };
      for (const e of EIXOS) {
        linha[e.slug] = Math.max(0, Math.min(5, Math.round(Number(entrada.notas[e.slug] ?? 0))));
      }

      // `upsert` na chave (user_id, mes): reavaliar o mesmo mês corrige a
      // leitura em vez de criar uma segunda. Mudar de ideia no dia 3 não pode
      // virar dois pontos na série.
      const { error } = await supabase
        .from("avaliacoes_do_jogo" as never)
        .upsert(linha as never, { onConflict: "user_id,mes" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avaliacoes_do_jogo"] });
      toast.success("Avaliação do mês salva.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não deu para salvar a avaliação."),
  });

  return {
    avaliacoes,
    /** A do mês corrente, se já existir. */
    atual,
    /** A anterior mais recente, para a sobreposição. */
    anterior,
    /** Notas para abrir o formulário: as do mês, ou as do anterior como ponto
        de partida — recomeçar do zero toda vez faz a pessoa reavaliar tudo do
        nada, e a leitura fica pior, não melhor. */
    inicial: atual?.notas ?? anterior?.notas ?? hexagonoVazio(),
    esteMes,
    ready: query.isSuccess,
    salvar,
  };
}
