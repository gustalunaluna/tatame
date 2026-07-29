import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, CalendarDays } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyses } from "@/lib/bjj-storage";

export const Route = createFileRoute("/_authenticated/analises")({
  head: () => ({
    meta: [
      { title: "Análises — Tatame" },
      { name: "description", content: "Análises do treinador e evolução do atleta ao longo do tempo." },
    ],
  }),
  component: AnalisesPage,
});

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function AnalisesPage() {
  const { items, ready } = useAnalyses();
  const total = items.length;
  const last = items[0]?.date;

  return (
    <PageShell
      title="Análises"
      subtitle="Leitura do treinador e evolução."
    >
      <Card className="border-primary/30 bg-card/70">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total de análises
              </p>
              <p className="text-2xl font-black leading-none">{total}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Última
            </p>
            <p className="text-sm font-semibold">
              {last ? formatDate(last) : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {ready && total === 0 && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Ainda sem análises. Quando o treinador registrar uma leitura do seu jogo, ela aparece aqui em ordem cronológica.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="border-border/60 bg-card/70">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(a.date)}
              </div>
              <h2 className="text-base font-bold leading-tight">{a.title}</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {a.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
