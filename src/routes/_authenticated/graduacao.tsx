import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { EscadaDeFaixas } from "@/components/EscadaDeFaixas";
import { GerarExameDeFaixa } from "@/components/GerarExameDeFaixa";
import { PrazoDaIBJJF } from "@/components/PrazoDaIBJJF";
import { useMeusExamesDeFaixa } from "@/lib/exame-de-faixa-storage.ts";
import { usePerfil } from "@/lib/bjj-storage";
import type { Faixa } from "@/lib/bjj-types";

/**
 * Graduação: onde você está, a escada inteira, e o simulado de exame.
 *
 * A ordem das três seções não é arbitrária. Primeiro o próximo degrau, que é a
 * pergunta que traz a pessoa aqui; depois o simulado, que é a única coisa
 * nesta tela que ela pode FAZER hoje; e por último a escada inteira, que é
 * consulta — importante, mas longa, e ninguém quer rolar trinta linhas de
 * tabela toda vez que abre a aba para ver quanto falta.
 */

export const Route = createFileRoute("/_authenticated/graduacao")({
  head: () => ({
    meta: [
      { title: "Graduação — Ponteira" },
      {
        name: "description",
        content:
          "Todas as faixas do jiu-jitsu com o tempo mínimo de cada uma, e o simulado de exame de faixa.",
      },
    ],
  }),
  component: GraduacaoPage,
});

function GraduacaoPage() {
  const { perfil } = usePerfil();
  const { exames, gerar } = useMeusExamesDeFaixa();
  const navegar = useNavigate();

  return (
    <PageShell
      title="Graduação"
      subtitle="A escada inteira, o tempo mínimo de cada faixa e o simulado de exame."
    >
      {/* --- 1. onde você está --- */}
      <PrazoDaIBJJF />

      {/* --- 2. o simulado --- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          Simulado de exame de faixa
        </h2>
        <p className="text-xs text-muted-foreground">
          Escolha a faixa que quer graduar e o app monta o exame a partir do
          syllabus da academia. Você escreve as respostas, confere contra o
          gabarito e o app guarda tudo — inclusive o que errou, para rever.
        </p>

        <GerarExameDeFaixa
          aoGerar={gerar}
          titulo="Fazer simulado de exame de faixa"
          depoisDeGerar={() => void navegar({ to: "/exame-de-faixa" })}
        />

        {exames.length > 0 && (
          <Link
            to="/exame-de-faixa"
            className="tap flex items-center gap-3 rounded-xl border border-border/60 p-3"
          >
            <Icone.listaDeTecnicas className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                {exames.length === 1
                  ? "1 exame já feito"
                  : `${exames.length} exames já feitos`}
              </span>
              <span className="block text-xs text-muted-foreground">
                Responder, conferir o gabarito e ver como foi.
              </span>
            </span>
            <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* --- 3. a escada inteira --- */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
            Todas as faixas
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Com o tempo mínimo que a IBJJF exige em cada degrau.
          </p>
        </div>

        <EscadaDeFaixas
          belt={perfil?.belt as Faixa | undefined}
          degrees={Number(perfil?.degrees ?? 0)}
        />
      </section>

      {/* --- o histórico pessoal, que é outra tela --- */}
      <Card className="border-dashed border-border/60 bg-transparent">
        <CardContent className="p-0">
          <Link
            to="/minhas-graduacoes"
            className="tap flex items-center gap-3 p-3"
          >
            <Icone.graduacao className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Minhas graduações</span>
              <span className="block text-xs text-muted-foreground">
                As datas das suas, e quem amarrou cada uma.
              </span>
            </span>
            <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  );
}
