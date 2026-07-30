import type { CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  LogOut,
  Plus,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Faixa } from "@/components/Faixa";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar } from "@/components/ui/bar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useAchievementStats,
  useEnsureSeeded,
  useGoalStart,
  usePerfil,
  usePlan,
  useTrainings,
  useHydrated,
} from "@/lib/bjj-storage";
import { DIAS_AZUL } from "@/lib/bjj-types";
import { useCountUp } from "@/lib/motion";

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
  const queryClient = useQueryClient();
  const { items: trainings } = useTrainings();
  const { weeks } = usePlan();
  const { start } = useGoalStart();
  const { perfil } = usePerfil();
  const conquistas = useAchievementStats();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Limpa na hora, sem esperar o ouvinte de sessão: ninguém deve ver um
    // frame sequer com os dados da conta que acabou de sair.
    queryClient.clear();
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
  const azulPct = Math.min(100, Math.round((daysTraining / DIAS_AZUL) * 100));

  const unlockedAch = conquistas.unlocked;
  const totalAch = conquistas.total;
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

  // Só os números de destaque contam — em tudo viraria ruído
  const totalAnimado = useCountUp(totalTrainings);
  const streakAnimado = useCountUp(streakDays, 600);
  const mesAnimado = useCountUp(thisMonth, 600);

  return (
    <PageShell
      title="Oss, guerreiro."
      subtitle={new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })}
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
      {/* Cartão do atleta: quem você é + o level */}
      <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card/80 to-card/80 shadow-[0_0_40px_-12px_var(--primary)]">
        <CardContent className="p-5">
          <Link to="/perfil" className="tap flex items-center gap-4 active:scale-[0.99]">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary ring-2 ring-primary/40">
              {perfil?.photoUrl ? (
                <img
                  src={perfil.photoUrl}
                  alt={`Foto de ${perfil.nickname || "perfil"}`}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-black leading-tight">
                {perfil?.nickname || "Oss, guerreiro"}
              </p>
              <div className="mt-1.5">
                <Faixa
                  belt={perfil?.belt ?? "Branca"}
                  degrees={perfil?.degrees ?? 0}
                  compacta
                />
              </div>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {[
                  perfil?.gym || null,
                  `${Math.max(0, Math.floor(daysTraining / 30.44))} meses`,
                  perfil?.master ? `Mestre ${perfil.master}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>

          {/* Level */}
          <div className="mt-4 border-t border-border/50 pt-3">
            <div className="flex items-end justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Level {level}
              </p>
              <p className="text-sm font-black tabular-nums">
                {hydrated ? totalAnimado : "—"}{" "}
                <span className="text-[10px] font-semibold text-muted-foreground">
                  treinos
                </span>
              </p>
            </div>
            <Bar
              value={levelProgress}
              className="mt-2 h-1.5"
              label={`Progresso para o level ${level + 1}`}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {5 - (totalTrainings % 5)} treinos para o próximo level
            </p>
          </div>

          {/* Dias da semana */}
          <div className="mt-4 flex items-center justify-between">
            {weekDots.map((d, i) => (
              <div
                key={d.key}
                className="rise-in flex flex-col items-center gap-1"
                style={{ "--i": i } as CSSProperties}
              >
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
                    "block h-2.5 w-2.5 rounded-full transition-[background-color,box-shadow] duration-300 ease-[var(--ease-out-expo)]",
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

      {/* Registrar treino — presente, mas sem gritar */}
      <Link
        to="/diario"
        className="tap flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/15 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Registrar treino
      </Link>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-primary" /> Sequência
            </div>
            <p className="mt-1 text-2xl font-black text-primary tabular-nums">
              {hydrated ? streakAnimado : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">dias</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> Mês
            </div>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {hydrated ? mesAnimado : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">treinos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5 text-primary" /> Total
            </div>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {hydrated ? totalAnimado : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements teaser */}
      <Link
        to="/conquistas"
        className="tap block rounded-2xl border border-primary/30 bg-card/70 p-4 hover:border-primary/60 active:scale-[0.98]"
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
              <p className="font-bold">Faixa Azul em 1 ano</p>
            </div>
            <span className="text-xs font-black text-primary">{azulPct}%</span>
          </div>
          <Progress className="mt-3 h-1.5" value={azulPct} />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {daysTraining} de {DIAS_AZUL} dias
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
          {last.map((t, i) => (
            <Card
              key={t.id}
              className="rise-in border-border/50 bg-card/60"
              style={{ "--i": i } as CSSProperties}
            >
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
