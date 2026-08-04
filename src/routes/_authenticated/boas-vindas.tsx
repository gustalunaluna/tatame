import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { ajustarGrau, grausValidos, nomeDaGraduacao } from "@/lib/graduacao";
import { FAIXAS, type Faixa } from "@/lib/bjj-types";
import { cn } from "@/lib/utils";

/**
 * As três perguntas do primeiro minuto.
 *
 * Por que três, e não as dez que o app gostaria de saber: este formulário fica
 * entre a pessoa e o app que ela acabou de instalar. Cada pergunta a mais é
 * uma chance de fechar a aba. As três aqui foram escolhidas porque, sem elas,
 * duas peças caras do produto não têm como funcionar:
 *
 *   · faixa e grau  → o hexágono pesa cada rola pela faixa do parceiro, e o
 *                     plano do mês escolhe conteúdo por faixa E grau
 *                     (`nivel_do_usuario`). Sem resposta, todo mundo é tratado
 *                     como branca 0 grau.
 *   · desde quando  → é a origem da régua da IBJJF: tempo de faixa, próxima
 *                     graduação, tempo de tatame.
 *   · por semana    → calibra meta e ritmo do plano. Quatro itens por semana
 *                     para quem treina 1x é um plano que já nasce falso.
 *
 * Tudo o mais que o app quer saber — apelido, academia, mestre, nascimento —
 * ficou no Perfil, que é onde faz sentido perguntar depois.
 *
 * Nada aqui é irreversível: as três respostas são campos comuns do perfil e
 * podem ser trocadas a qualquer momento em /perfil.
 */
export const Route = createFileRoute("/_authenticated/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Boas-vindas — Ponteira" },
      {
        name: "description",
        content: "Três perguntas rápidas para o app conhecer o seu jiu-jitsu.",
      },
    ],
  }),
  component: BoasVindasPage,
});

/** As opções de frequência. O valor é o número que vai para o banco. */
const FREQUENCIAS = [
  { valor: 1, rotulo: "1x" },
  { valor: 2, rotulo: "2x" },
  { valor: 3, rotulo: "3x" },
  { valor: 4, rotulo: "4x" },
  { valor: 5, rotulo: "5x" },
  { valor: 6, rotulo: "6x ou mais" },
] as const;

/**
 * "Desde quando", em meses atrás.
 *
 * Pedir a data exata é pior do que parece: quase ninguém lembra o dia em que
 * pisou no tatame pela primeira vez, e seletor de data é o campo mais lento de
 * preencher no celular. Faixas aproximadas respondem em um toque, e a data
 * exata continua editável no Perfil para quem faz questão.
 */
const INICIOS = [
  { meses: 3, rotulo: "Este ano" },
  { meses: 18, rotulo: "1 a 2 anos" },
  { meses: 42, rotulo: "3 a 5 anos" },
  { meses: 84, rotulo: "6 a 10 anos" },
  { meses: 180, rotulo: "Mais de 10 anos" },
] as const;

function dataDeMesesAtras(meses: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}

/** Estilo comum dos botões de escolha — selecionado e não selecionado. */
function escolha(selecionado: boolean) {
  return cn(
    "rounded-xl border text-sm font-semibold transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    selecionado
      ? "border-primary bg-primary/10 text-foreground"
      : "border-border text-muted-foreground hover:border-foreground/30",
  );
}

function BoasVindasPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [faixa, setFaixa] = useState<Faixa>("Branca");
  const [graus, setGraus] = useState(0);
  const [meses, setMeses] = useState<number | null>(null);
  const [porSemana, setPorSemana] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const grausDaFaixa = grausValidos(faixa);

  function trocarFaixa(nova: Faixa) {
    setFaixa(nova);
    // A coral não tem 4 graus, a branca não tem 5. Trocar de faixa sem
    // reajustar o grau deixaria um par impossível na tela — e no banco.
    setGraus((g) => ajustarGrau(nova, g));
  }

  async function salvar() {
    if (meses === null || porSemana === null) return;
    setSalvando(true);

    const { data: sessao } = await supabase.auth.getSession();
    const uid = sessao.session?.user.id;
    if (!uid) {
      setSalvando(false);
      toast.error("Sua sessão expirou. Entre de novo para continuar.");
      navigate({ to: "/auth" });
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: uid,
        belt: faixa,
        degrees: graus,
        goal_start: dataDeMesesAtras(meses),
        treinos_por_semana: porSemana,
        questionario_em: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setSalvando(false);

    if (error) {
      // Sem `questionario_em` gravado a guarda devolve para cá, então não
      // adianta seguir em frente fingindo que deu certo.
      toast.error("Não deu para salvar suas respostas. Tente de novo.");
      return;
    }

    // A guarda lê o carimbo do cache de `usePerfil`. Sem invalidar, quem
    // acabou de responder seria mandado de volta para cá até a entrada expirar.
    await qc.invalidateQueries({ queryKey: ["perfil"] });
    toast.success("Pronto. Bom treino.");
    navigate({ to: "/" });
  }

  const completo = meses !== null && porSemana !== null;

  return (
    // `<main>` pelo mesmo motivo do PageShell: esta tela não passa por ele.
    <main className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 pb-16">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Antes de começar
        </p>
        <h1 className="mt-1 text-balance text-3xl font-black tracking-tight">
          Três perguntas e o app é seu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          É o que o Ponteira precisa para calcular o seu jogo e montar o plano
          do mês. Dá para mudar tudo depois, no Perfil.
        </p>
      </header>

      {/* --- 1. faixa e grau ---------------------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="p1">
        <h2 id="p1" className="text-base font-bold">
          1. Qual é a sua faixa?
        </h2>

        <div className="grid grid-cols-2 gap-2">
          {FAIXAS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => trocarFaixa(f)}
              aria-pressed={faixa === f}
              className={cn(escolha(faixa === f), "px-3 py-2.5 text-left")}
            >
              {f}
            </button>
          ))}
        </div>

        {grausDaFaixa.length > 1 && (
          <div className="flex flex-col gap-2">
            <span id="graus" className="text-sm text-muted-foreground">
              Quantos graus?
            </span>
            <div className="flex flex-wrap gap-2" aria-labelledby="graus">
              {grausDaFaixa.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGraus(g)}
                  aria-pressed={graus === g}
                  aria-label={`${g} ${g === 1 ? "grau" : "graus"}`}
                  className={cn(
                    escolha(graus === g),
                    "min-w-11 px-3 py-2 tabular-nums",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* A faixa desenhada confirma a escolha sem obrigar a ler texto. */}
        <div className="rounded-xl border border-border p-3">
          <FaixaVisual belt={faixa} degrees={graus} cheia />
          <p className="mt-2 text-xs text-muted-foreground">
            {nomeDaGraduacao(faixa, graus)}
          </p>
        </div>
      </section>

      {/* --- 2. desde quando ---------------------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="p2">
        <h2 id="p2" className="text-base font-bold">
          2. Treina desde quando?
        </h2>
        <div className="flex flex-col gap-2">
          {INICIOS.map((i) => (
            <button
              key={i.meses}
              type="button"
              onClick={() => setMeses(i.meses)}
              aria-pressed={meses === i.meses}
              className={cn(escolha(meses === i.meses), "px-3 py-3 text-left")}
            >
              {i.rotulo}
            </button>
          ))}
        </div>
      </section>

      {/* --- 3. frequência ------------------------------------------------ */}
      <section className="flex flex-col gap-3" aria-labelledby="p3">
        <h2 id="p3" className="text-base font-bold">
          3. Quantas vezes por semana você treina?
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {FREQUENCIAS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setPorSemana(f.valor)}
              aria-pressed={porSemana === f.valor}
              className={cn(escolha(porSemana === f.valor), "px-2 py-3")}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          disabled={!completo || salvando}
          onClick={salvar}
          className="w-full"
        >
          {salvando ? "Salvando…" : "Começar"}
        </Button>
        {!completo && (
          <p className="text-center text-xs text-muted-foreground">
            Faltam as perguntas 2 e 3.
          </p>
        )}
      </div>
    </main>
  );
}
