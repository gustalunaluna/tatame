import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePlan } from "@/lib/bjj-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/plano")({
  head: () => ({
    meta: [
      { title: "Plano 8 semanas — Tatame" },
      { name: "description", content: "Plano de 8 semanas: retenção de guarda e pegar as costas." },
    ],
  }),
  component: PlanPage,
});

const PILLARS = [
  { key: "A", title: "Retenção de guarda", desc: "Quadril rápido, pernas na linha, enfrentar, inside position" },
  { key: "B", title: "De La Riva → costas", desc: "DLR como principal rota para as costas" },
  { key: "C", title: "Single-leg X → costas", desc: "SLX para raspar e girar" },
  { key: "D", title: "Grip fighting", desc: "Pegar primeiro, cruzadas, quebrar pegadas" },
];

function PlanPage() {
  const { weeks, toggle } = usePlan();
  const total = weeks.reduce((n, w) => n + w.items.length, 0);
  const done = weeks.reduce((n, w) => n + w.items.filter((i) => i.done).length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <PageShell
      title="Plano 8 semanas"
      subtitle="Retenção de guarda + pegar as costas"
    >
      <Card className="border-primary/30 bg-gradient-to-br from-primary/20 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Progresso geral</p>
              <p className="mt-1 text-3xl font-black">{pct}%</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {done}/{total} itens
            </div>
          </div>
          <Progress className="mt-3" value={pct} />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Os 4 pilares
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {PILLARS.map((p) => (
            <Card key={p.key} className="border-border/60 bg-card/60">
              <CardContent className="p-3">
                <p className="text-lg font-black text-primary">({p.key})</p>
                <p className="text-sm font-semibold leading-tight">{p.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {weeks.map((w) => {
          const wDone = w.items.filter((i) => i.done).length;
          const wPct = Math.round((wDone / w.items.length) * 100);
          return (
            <Card key={w.week} className="border-border/60 bg-card/70">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                      Semana {w.week}
                    </p>
                    <p className="font-semibold leading-tight">{w.focus}</p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{wPct}%</span>
                </div>
                <Progress className="mt-2" value={wPct} />
                <ul className="mt-3 space-y-1">
                  {w.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => toggle(w.week, item.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                          "hover:bg-secondary/60",
                        )}
                      >
                        {item.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn(item.done && "text-muted-foreground line-through")}>
                          {item.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </PageShell>
  );
}
