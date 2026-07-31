import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Plus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CadastrarGraduacao,
  LinhaDeGraduacao,
} from "@/components/HistoricoDeGraduacao";
import { useMeuHandle } from "@/lib/social-storage";
import { useMinhasGraduacoes } from "@/lib/graduacao-storage";

export const Route = createFileRoute("/_authenticated/minhas-graduacoes")({
  head: () => ({
    meta: [
      { title: "Minhas graduações — Tatame" },
      {
        name: "description",
        content: "A escada de faixas e graus, com quem entregou cada uma.",
      },
    ],
  }),
  component: MinhasGraduacoesPage,
});

function MinhasGraduacoesPage() {
  const { handle } = useMeuHandle();
  const { graduacoes, ready, criar, apagar } = useMinhasGraduacoes(handle);

  return (
    <PageShell
      title="Graduações"
      subtitle="Sua escada, e quem entregou cada degrau."
      action={
        <CadastrarGraduacao
          aoSalvar={criar}
          gatilho={
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Nova
            </Button>
          }
        />
      }
    >
      {ready && graduacoes.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <GraduationCap className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhuma graduação registrada. Vale a pena guardar: daqui a dez anos
            você vai lembrar da faixa, mas talvez não da data nem de quem
            amarrou.
          </CardContent>
        </Card>
      )}

      <div>
        {graduacoes.map((g, i) => (
          <LinhaDeGraduacao
            key={g.id}
            g={g}
            i={i}
            ultima={i === graduacoes.length - 1}
            aoApagar={(id) => void apagar(id)}
          />
        ))}
      </div>
    </PageShell>
  );
}
