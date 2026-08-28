import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  gerarExame,
  resumoDoExame,
  type FaixaAlvo,
  type Pergunta,
  type ResumoDoExame,
} from "./exame-de-faixa.ts";

/**
 * O banco dos exames gerados. A geração em si (`gerarExame`) e a conta da
 * correção (`resumoDoExame`) não estão aqui — estão em `exame-de-faixa.ts`,
 * sem import nenhum, testáveis sem navegador. Este arquivo só lê e grava o
 * que já foi gerado e respondido.
 */

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

export interface ExameDeFaixa {
  id: string;
  faixaAlvo: FaixaAlvo;
  semente: number;
  perguntas: Pergunta[];
  criadoEm: string;
}

const paraExame = (r: Record<string, unknown>): ExameDeFaixa => ({
  id: String(r.id),
  faixaAlvo: r.faixa_alvo as FaixaAlvo,
  semente: Number(r.semente),
  // Exames gerados antes do gabarito existir não têm `gabarito`/`acertou`
  // salvos — completa com o padrão em vez de quebrar a tela.
  perguntas: ((r.perguntas as unknown as Partial<Pergunta>[]) ?? []).map((p) => ({
    id: p.id ?? "",
    categoria: p.categoria ?? "posturas",
    item: p.item ?? "",
    pergunta: p.pergunta ?? "",
    gabarito: p.gabarito ?? "",
    resposta: p.resposta ?? "",
    respondida: p.respondida ?? false,
    acertou: p.acertou ?? null,
  })),
  criadoEm: String(r.created_at ?? ""),
});

/** Quantas perguntas o exame tem respondidas, para mostrar progresso na lista. */
export function progressoDoExame(exame: ExameDeFaixa): { feitas: number; total: number } {
  return {
    feitas: exame.perguntas.filter((p) => p.respondida).length,
    total: exame.perguntas.length,
  };
}

/** A correção — só reexporta `resumoDoExame` já aplicado às perguntas do exame. */
export function resultadoDoExame(exame: ExameDeFaixa): ResumoDoExame {
  return resumoDoExame(exame.perguntas);
}

export function useMeusExamesDeFaixa() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["exames_de_faixa"],
    queryFn: async (): Promise<ExameDeFaixa[]> => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) return [];

      const { data, error } = await supabase
        .from("exames_de_faixa")
        .select("*")
        .eq("user_id", eu)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(paraExame);
    },
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["exames_de_faixa"] });

  const gerarMut = useMutation({
    mutationFn: async (faixaAlvo: FaixaAlvo) => {
      const { data: sessao } = await supabase.auth.getUser();
      const eu = sessao.user?.id;
      if (!eu) throw new Error("Sem sessão");

      // A semente é o instante da geração — cada toque em "gerar" produz uma
      // semente nova, e a mesma semente nunca mais se repete por acaso.
      const semente = Date.now();
      const perguntas = gerarExame(faixaAlvo, semente);
      if (!perguntas) {
        throw new Error(`Ainda não tenho o exame de ${faixaAlvo} — só branca → azul está pronto.`);
      }

      const { error } = await supabase.from("exames_de_faixa").insert({
        user_id: eu,
        faixa_alvo: faixaAlvo,
        semente,
        perguntas: perguntas as unknown as never,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Exame gerado.");
    },
    onError: aoFalhar("gerar o exame"),
  });

  const apagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exames_de_faixa").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: aoFalhar("apagar o exame"),
  });

  /**
   * Relê o exame do banco, aplica `mudar` a uma pergunta e grava de volta.
   * Compartilhada por `responder` e `autoavaliar` — as duas são "editar um
   * campo dentro do array `perguntas`", só muda qual campo.
   *
   * Relê em vez de usar o cache pelo mesmo motivo do toggle de plan_weeks:
   * dois campos tocados em sequência rápida, partindo do cache, fariam o
   * segundo sobrescrever o primeiro.
   */
  async function atualizarPergunta(
    exameId: string,
    perguntaId: string,
    mudar: (p: Pergunta) => Pergunta,
  ) {
    const { data: atual, error: erroLeitura } = await supabase
      .from("exames_de_faixa")
      .select("perguntas")
      .eq("id", exameId)
      .maybeSingle();
    if (erroLeitura) throw erroLeitura;
    const perguntas = (atual?.perguntas as unknown as Pergunta[]) ?? [];
    if (!perguntas.length) return;

    const proximas = perguntas.map((p) => (p.id === perguntaId ? mudar(p) : p));

    const { error } = await supabase
      .from("exames_de_faixa")
      .update({
        perguntas: proximas as unknown as never,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", exameId);
    if (error) throw error;
  }

  const responderMut = useMutation({
    mutationFn: async ({
      exameId,
      perguntaId,
      resposta,
    }: {
      exameId: string;
      perguntaId: string;
      resposta: string;
    }) =>
      atualizarPergunta(exameId, perguntaId, (p) => ({
        ...p,
        resposta,
        respondida: resposta.trim().length > 0,
        // Reescreveu a resposta: o "acertei"/"não acertei" anterior era
        // sobre o texto velho. Volta a conferir.
        acertou: resposta === p.resposta ? p.acertou : null,
      })),
    onSuccess: invalidar,
    onError: aoFalhar("salvar a resposta"),
  });

  const autoavaliarMut = useMutation({
    mutationFn: async ({
      exameId,
      perguntaId,
      acertou,
    }: {
      exameId: string;
      perguntaId: string;
      acertou: boolean;
    }) => atualizarPergunta(exameId, perguntaId, (p) => ({ ...p, acertou })),
    onSuccess: invalidar,
    onError: aoFalhar("marcar a autoavaliação"),
  });

  return {
    exames: query.data ?? [],
    ready: query.isSuccess,
    gerar: (faixaAlvo: FaixaAlvo) => ok(gerarMut.mutateAsync(faixaAlvo)),
    apagar: (id: string) => ok(apagarMut.mutateAsync(id)),
    responder: (exameId: string, perguntaId: string, resposta: string) =>
      ok(responderMut.mutateAsync({ exameId, perguntaId, resposta })),
    autoavaliar: (exameId: string, perguntaId: string, acertou: boolean) =>
      ok(autoavaliarMut.mutateAsync({ exameId, perguntaId, acertou })),
  };
}
