import { createFileRoute } from "@tanstack/react-router";
import { Award, Shield, TrendingUp } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useGoalStart, useWeakPoints, useHydrated } from "@/lib/bjj-storage";
import { DIAS_AZUL, DIAS_ROXA } from "@/lib/bjj-types";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Tatame" },
      { name: "description", content: "Metas de faixa e evolução dos pontos fracos." },
    ],
  }),
  component: MetasPage,
});

const STRENGTHS = [
  "Guarda",
  "Passagem toureando",
  "Finalização encadeada (omoplata → triângulo → armbar)",
  "Controle por cima",
];

function pct(days: number, target: number) {
  return Math.min(100, Math.max(0, Math.round((days / target) * 100)));
}

function MetasPage() {
  const hydrated = useHydrated();
  const { items, updateScore } = useWeakPoints();
  const { start, set: setStart } = useGoalStart();

  const startDate = new Date(start + "T00:00:00");
  const now = new Date();
  const days = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const azul = pct(days, DIAS_AZUL);
  const roxa = pct(days, DIAS_ROXA);

  const chartData = items.length
    ? aggregateHistory(items)
    : [];

  return (
    <PageShell title="Metas" subtitle="Faixa branca 3 graus → Azul → Roxa">
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Início da jornada
          </Label>
          <Input
            type="date"
            className="mt-1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {hydrated ? `${days} dias no tatame` : "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/20 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <p className="font-semibold">Faixa Azul em 1 ano</p>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-3xl font-black">{azul}%</p>
            <p className="text-xs text-muted-foreground">{days}/{DIAS_AZUL} dias</p>
          </div>
          <Progress className="mt-2" value={azul} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" />
            <p className="font-semibold">Faixa Roxa em 3 anos</p>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-3xl font-black">{roxa}%</p>
            <p className="text-xs text-muted-foreground">{days}/{DIAS_ROXA} dias</p>
          </div>
          <Progress className="mt-2" value={roxa} />
        </CardContent>
      </Card>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Pontos fracos — evoluir
          </h2>
        </div>
        <div className="space-y-3">
          {items.map((w) => (
            <Card key={w.id} className="border-border/60 bg-card/70">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{w.label}</p>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                    {w.score}/5
                  </span>
                </div>
                <Slider
                  className="mt-3"
                  value={[w.score]}
                  min={0}
                  max={5}
                  step={1}
                  onValueChange={([v]) => updateScore(w.id, v)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {chartData.length > 1 && (
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Evolução dos pontos fracos</p>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={20} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="média"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Pontos fortes
        </h2>
        <div className="grid gap-2">
          {STRENGTHS.map((s) => (
            <div
              key={s}
              className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              ⚡ {s}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function aggregateHistory(items: { history: { date: string; score: number }[] }[]) {
  const map = new Map<string, { total: number; n: number }>();
  for (const w of items) {
    for (const h of w.history) {
      const cur = map.get(h.date) ?? { total: 0, n: 0 };
      cur.total += h.score;
      cur.n += 1;
      map.set(h.date, cur);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date: date.slice(5),
      média: +(v.total / v.n).toFixed(2),
    }));
}
