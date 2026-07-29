import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Dumbbell,
  Flame,
  LogOut,
  Plus,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useAchievements,
  useEnsureSeeded,
  useGoalStart,
  usePlan,
  useTrainings,
  useHydrated,
} from "@/lib/bjj-storage";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Início — Tatame" },
      { name: "description", content: "Resumo gamificado do seu treino de Jiu-Jitsu." },
    ],
  }),
  component: Home,
});

function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / ms);
}

function streak(dates: string[]) {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let count = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) count++;
    else if (i === 0) continue;
    else break;
  }
  return count;
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function Home() {
  const hydrated = useHydrated();
  useEnsureSeeded();
  const navigate = useNavigate();
  const { items: trainings } = useTrainings();
  const { weeks } = usePlan();
  const { start } = useGoalStart();
  const { items: achievements } = useAchievements();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const thisMonth = trainings.filter((t) => t.date.startsWith(monthKey)).length;
  const streakDays = streak(trainings.map((t) => t.date));
  const totalTrainings = trainings.length;
  const level = Math.max(1, Math.floor(totalTrainings / 5) + 1);
  const levelProgress = ((totalTrainings % 5) / 5) * 100;

  const totalItems = weeks.reduce((n, w) => n + w.items.length, 0);
  const doneItems = weeks.reduce(
    (n, w) => n + w.items.filter((i) => i.done).length,
    0,
  );
  const planPct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const currentWeek = weeks.find((w) => w.items.some((i) => !i.done)) ?? weeks[0];

  const startDate = new Date(start);
  const daysTraining = Math.max(0, daysBetween(startDate, now));
  const azulPct = Math.min(100, Math.round((daysTraining / 180) * 100));

  const unlockedAch = achievements.filter((a) => a.unlocked).length;
  const totalAch = achievements.length;
  const achPct = totalAch ? Math.round((unlockedAch / totalAch) * 100) : 0;

  // Weekday dots — current week (Sun..Sat)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const trainedSet = new Set(trainings.map((t) => t.date));
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const isToday = d.toDateString() === now.toDateString();
    const isPast = d <= now;
    return { key, label: WEEKDAY_LABELS[i], trained: trainedSet.has(key), isToday, isPast };
  });

  const last = trainings.slice(0, 3);

  return (
    <PageShell
      title="Oss, guerreiro."
      subtitle="Faixa branca 3 graus · ~8 meses · Gi"
      action={
        <button
          onClick={handleLogout}
          aria-label="Sair"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      }
    >
      {/* Level / profile card */}
      <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card/80 to-card/80 shadow-[0_0_40px_-12px_var(--primary)]">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]">
              <Zap className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Level {level}
              </p>
              <p className="text-2xl font-black leading-tight">
                {hydrated ? totalTrainings : "—"} treinos
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {5 - (totalTrainings % 5)} treinos para o próximo level
              </p>
            </div>
          </div>

          {/* weekday dots */}
          <div className="mt-4 flex items-center justify-between">
            {weekDots.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    d.isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {d.label}
                </span>
                <span
                  className={cn(
                    "block h-2.5 w-2.5 rounded-full",
                    d.trained
                      ? "bg-primary shadow-[0_0_8px_var(--primary)]"
                      : d.isPast
                        ? "bg-muted"
                        : "bg-muted/40 ring-1 ring-border",
                    d.isToday && !d.trained && "ring-2 ring-primary",
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Link
        to="/diario"
        className="group relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-[0_0_30px_-8px_var(--primary)] transition active:scale-[0.98]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
              Bora treinar
            </p>
            <p className="mt-1 text-2xl font-black">Registrar treino</p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-black/20 backdrop-blur">
            <Plus className="h-7 w-7" />
          </div>
        </div>
      </Link>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-primary" /> Sequência
            </div>
            <p className="mt-1 text-2xl font-black text-primary">
              {hydrated ? streakDays : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">dias</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> Mês
            </div>
            <p className="mt-1 text-2xl font-black">
              {hydrated ? thisMonth : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">treinos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5 text-primary" /> Total
            </div>
            <p className="mt-1 text-2xl font-black">
              {hydrated ? totalTrainings : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements teaser */}
      <Link
        to="/conquistas"
        className="block rounded-2xl border border-primary/30 bg-card/70 p-4 transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Rumo ao topo</p>
              <span className="text-xs font-black text-primary">{achPct}%</span>
            </div>
            <Progress value={achPct} className="mt-2 h-1.5" />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {unlockedAch}/{totalAch} conquistas
            </p>
          </div>
        </div>
      </Link>

      {/* Week focus */}
      <Card className="border-border/50 bg-card/70">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Foco da semana {currentWeek?.week ?? 1}
              </p>
              <p className="mt-1 font-bold">{currentWeek?.focus}</p>
            </div>
            <Link
              to="/plano"
              className="text-xs font-bold text-primary underline-offset-4 hover:underline"
            >
              Ver plano
            </Link>
          </div>
          <Progress value={planPct} className="mt-3 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {doneItems}/{totalItems} itens ({planPct}%)
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="font-bold">Faixa Azul em 6 meses</p>
            </div>
            <span className="text-xs font-black text-primary">{azulPct}%</span>
          </div>
          <Progress className="mt-3 h-1.5" value={azulPct} />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {daysTraining} de 180 dias
          </p>
        </CardContent>
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Últimos treinos
          </h2>
          <Link to="/diario" className="text-xs font-bold text-primary">
            Ver todos
          </Link>
        </div>
        {hydrated && last.length === 0 && (
          <Card className="border-dashed border-border/60 bg-transparent">
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              <Dumbbell className="mx-auto mb-2 h-5 w-5 text-primary" />
              Nenhum treino ainda. O primeiro round é agora.
            </CardContent>
          </Card>
        )}
        <div className="space-y-2">
          {last.map((t) => (
            <Card key={t.id} className="border-border/50 bg-card/60">
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    · {t.type} · {t.durationMin}min
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.techniques || "Sem técnicas anotadas"}
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-primary/20 px-2 py-1 text-xs font-black text-primary">
                  {t.rolls} rolos
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
