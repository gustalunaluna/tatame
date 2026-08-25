import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resumirCartel, type Luta, type Metodo, type NovaLuta } from "./cartel.ts";

/**
 * O banco das lutas. A conta em cima delas vive em `cartel.ts`, que não
 * importa nada — é o que permite testá-la sem navegador.
 */
export * from "./cartel.ts";

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

/* ------------------------------------------------------------------ */

const paraLuta = (r: Record<string, unknown>): Luta => ({
  id: String(r.id),
  data: String(r.data ?? ""),
  evento: String(r.evento ?? ""),
  oficial: Boolean(r.oficial),
  oponente: String(r.oponente ?? ""),
  oponenteFaixa: r.oponente_faixa ? String(r.oponente_faixa) : "",
  categoria: String(r.categoria ?? ""),
  resultado: (r.resultado as Luta["resultado"]) ?? "vitoria",
  metodo: (r.metodo as Metodo | null) ?? null,
  golpe: String(r.golpe ?? ""),
  tempoSeg:
    r.tempo_seg === null || r.tempo_seg === undefined
      ? null
      : Number(r.tempo_seg),
  notas: String(r.notas ?? ""),
});

/* ================================================================== */

export function useMinhasLutas() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["minhas_lutas"],
    queryFn: async (): Promise<Luta[]> => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) return [];

      const { data, error } = await supabase
        .from("lutas")
        .select("*")
        .eq("user_id", eu)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraLuta);
    },
  });

  // O perfil mostra o cartel a partir de `profiles`, que o gatilho da migração
  // 038 reescreve a cada gravação aqui. Sem esta invalidação o número velho
  // fica na tela até a próxima recarga.
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["minhas_lutas"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["perfil_atleta"] });
  };

  const criarMut = useMutation({
    mutationFn: async (l: NovaLuta) => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) throw new Error("Sem sessão");
      const { error } = await supabase.from("lutas").insert({
        user_id: eu,
        data: l.data,
        evento: l.evento.trim(),
        oficial: l.oficial,
        oponente: l.oponente.trim(),
        oponente_faixa: l.oponenteFaixa || null,
        categoria: l.categoria.trim(),
        resultado: l.resultado,
        metodo: l.metodo,
        golpe: l.metodo === "finalizacao" ? l.golpe.trim() : "",
        tempo_seg: l.tempoSeg,
        notas: l.notas.trim(),
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("registrar a luta"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lutas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar a luta"),
  });

  const lutas = query.data ?? [];

  return {
    lutas,
    cartel: resumirCartel(lutas),
    ready: query.isSuccess,
    criar: (l: NovaLuta) => ok(criarMut.mutateAsync(l)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
  };
}
