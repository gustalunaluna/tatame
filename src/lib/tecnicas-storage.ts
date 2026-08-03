import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TechniqueCategory } from "./bjj-types";
import { chaveDaTecnica } from "./chave-da-tecnica";

export { chaveDaTecnica };

/**
 * A galeria de técnicas, agora ligada aos treinos.
 *
 * O que a ligação passou a permitir responder, e antes não dava:
 *
 *   "há quanto tempo eu não treino isso"   →  ultimaVez
 *   "quantas vezes eu já vi essa posição"  →  treinos
 *
 * São as duas perguntas que uma galeria de técnicas existe para responder, e
 * as duas ficavam sem resposta enquanto o que a pessoa aprendeu morava numa
 * string de texto livre dentro do treino.
 */
export interface TecnicaDaGaleria {
  id: string;
  name: string;
  /** Vazio é legítimo: técnica criada pelo diário não exige categoria. */
  category: TechniqueCategory | "";
  notes: string;
  videoUrl: string;
  mastery: number;
  /** Em quantos treinos ela apareceu. */
  treinos: number;
  /** A data do treino mais recente em que apareceu. */
  ultimaVez: string | null;
}

const paraTecnica = (r: Record<string, unknown>): TecnicaDaGaleria => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  category: (String(r.category ?? "") || "") as TechniqueCategory | "",
  notes: String(r.notes ?? ""),
  videoUrl: String(r.video_url ?? ""),
  mastery: Number(r.mastery ?? 0),
  treinos: Number(r.treinos ?? 0),
  ultimaVez: (r.ultima_vez as string) ?? null,
});

export function useGaleriaDeTecnicas() {
  const query = useQuery({
    queryKey: ["galeria_de_tecnicas"],
    queryFn: async (): Promise<TecnicaDaGaleria[]> => {
      const { data, error } = await supabase.rpc("galeria_de_tecnicas" as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraTecnica);
    },
  });
  return { tecnicas: query.data ?? [], ready: query.isSuccess };
}

/** "há 3 dias", "há 2 meses", "nunca em treino registrado". */
export function desdeQuando(data: string | null): string {
  if (!data) return "ainda sem treino registrado";
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "ainda sem treino registrado";
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses === 1) return "há 1 mês";
  if (meses < 12) return `há ${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? "há 1 ano" : `há ${anos} anos`;
}

/* ================================================================== */

export interface TecnicaDoTreino {
  id: string;
  name: string;
  category: string;
  nota: string;
}

/**
 * As técnicas de um treino, e como mexer nelas.
 *
 * `registrar` acha-ou-cria no banco, numa transação só. Fazer isso no cliente
 * seria ler, decidir e escrever em três viagens, e dois toques rápidos no
 * botão criariam duas técnicas com o mesmo nome.
 */
export function useTecnicasDoTreino(trainingId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["tecnicas_do_treino", trainingId],
    enabled: Boolean(trainingId),
    queryFn: async (): Promise<TecnicaDoTreino[]> => {
      const { data, error } = await supabase.rpc("tecnicas_do_treino" as never, {
        p_treino: trainingId,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        category: String(r.category ?? ""),
        nota: String(r.nota ?? ""),
      }));
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["tecnicas_do_treino"] });
    qc.invalidateQueries({ queryKey: ["galeria_de_tecnicas"] });
    // A galeria antiga (`useTechniques`) ainda alimenta a tela de Técnicas.
    qc.invalidateQueries({ queryKey: ["techniques"] });
  };

  const registrar = useMutation({
    mutationFn: async (t: { nome: string; categoria?: string; nota?: string }) => {
      if (!trainingId) throw new Error("Salve o treino antes de anotar técnica.");
      const { error } = await supabase.rpc("registrar_tecnica_do_treino" as never, {
        p_treino: trainingId,
        p_nome: t.nome,
        p_categoria: t.categoria ?? "",
        p_nota: t.nota ?? "",
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não deu para anotar a técnica."),
  });

  const desligar = useMutation({
    mutationFn: async (tecnicaId: string) => {
      if (!trainingId) return;
      const { error } = await supabase.rpc("desligar_tecnica_do_treino" as never, {
        p_treino: trainingId,
        p_tecnica: tecnicaId,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não deu para tirar a técnica."),
  });

  return { tecnicas: query.data ?? [], ready: query.isSuccess, registrar, desligar };
}

/* ================================================================== */

export interface RascunhoTecnica {
  /** Existe quando a técnica já está na galeria; ausente quando é nova. */
  id?: string;
  nome: string;
  categoria: string;
  /**
   * Como foi ESTE treino. Não é a descrição da técnica.
   *
   * Se morasse em `techniques.notes`, a anotação de hoje apagaria a de três
   * semanas atrás — e é a sequência delas que conta como a pessoa aprendeu
   * aquilo. Por isso a nota fica no vínculo.
   */
  nota: string;
}

/**
 * Grava as técnicas de um treino por DIFERENÇA.
 *
 * Mesmo desenho de `salvarParceirosDoTreino`, e pelo mesmo motivo: reescrever
 * tudo apagaria e recriaria vínculos a cada salvamento, e o `created_at` do
 * vínculo deixaria de querer dizer alguma coisa.
 *
 * O que sai daqui é o vínculo, nunca a técnica: tirar "armlock" de um treino
 * não pode apagar o armlock da galeria, com anotação e domínio junto. A
 * galeria é acervo.
 */
export async function salvarTecnicasDoTreino(
  trainingId: string,
  rascunhos: RascunhoTecnica[],
): Promise<void> {
  const { data, error: erroLeitura } = await supabase.rpc(
    "tecnicas_do_treino" as never,
    { p_treino: trainingId } as never,
  );
  if (erroLeitura) throw erroLeitura;

  const ligadas = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    chave: chaveDaTecnica(String(r.name ?? "")),
  }));

  const querendo = new Set(
    rascunhos.map((r) => chaveDaTecnica(r.nome)).filter((k) => k.length >= 2),
  );

  for (const r of rascunhos) {
    if (chaveDaTecnica(r.nome).length < 2) continue;
    const { error } = await supabase.rpc("registrar_tecnica_do_treino" as never, {
      p_treino: trainingId,
      p_nome: r.nome.trim(),
      p_categoria: r.categoria ?? "",
      p_nota: r.nota ?? "",
    } as never);
    if (error) throw error;
  }

  for (const l of ligadas) {
    if (querendo.has(l.chave)) continue;
    const { error } = await supabase.rpc("desligar_tecnica_do_treino" as never, {
      p_treino: trainingId,
      p_tecnica: l.id,
    } as never);
    if (error) throw error;
  }
}

/* ================================================================== */

export interface AnotacaoDaTecnica {
  data: string;
  nota: string;
}

/**
 * O que a pessoa escreveu sobre uma técnica, treino a treino.
 *
 * É a história de como ela aprendeu aquilo — e é exatamente o que
 * `techniques.notes` sozinho apagava, porque lá só cabe uma frase e a última
 * sempre vence.
 */
export function useAnotacoesDaTecnica(tecnicaId: string | null) {
  const query = useQuery({
    queryKey: ["anotacoes_da_tecnica", tecnicaId],
    enabled: Boolean(tecnicaId),
    queryFn: async (): Promise<AnotacaoDaTecnica[]> => {
      const { data, error } = await supabase.rpc("anotacoes_da_tecnica" as never, {
        p_tecnica: tecnicaId,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        data: String(r.data ?? ""),
        nota: String(r.nota ?? ""),
      }));
    },
  });
  return { anotacoes: query.data ?? [], ready: query.isSuccess };
}
