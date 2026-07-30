import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Lock, Search, Trophy } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar } from "@/components/ui/bar";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENT_TIERS,
  useAchievements,
  type AchievementTier,
} from "@/lib/bjj-storage";
import type { Achievement } from "@/lib/bjj-types";

export const Route = createFileRoute("/_authenticated/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas — Tatame" },
      {
        name: "description",
        content: "Sua jornada da faixa branca à vermelha: conquistas por faixa.",
      },
    ],
  }),
  component: ConquistasPage,
});

const TIER_STYLE: Record<AchievementTier, { chip: string }> = {
  Branca: { chip: "bg-white/90 text-black" },
  Azul: { chip: "bg-blue-500 text-white" },
  Roxa: { chip: "bg-purple-500 text-white" },
  Marrom: { chip: "bg-amber-800 text-white" },
  Preta: { chip: "bg-black text-white border border-white/30" },
  Coral: { chip: "bg-gradient-to-r from-red-600 to-black text-white" },
  Vermelha: { chip: "bg-red-600 text-white" },
};

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AchievementRow({ a, i = 0 }: { a: Achievement; i?: number }) {
  const hasTarget = a.target != null && a.target > 0;
  const progressPct = hasTarget
    ? Math.min(100, Math.round(((a.unlocked ? a.target! : a.progress) / a.target!) * 100))
    : 0;

  return (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className={cn(
        "tap rise-in list-perf flex items-start gap-3 rounded-2xl border p-3",
        a.unlocked
          ? "border-primary/50 bg-primary/10 shadow-[0_0_18px_-6px_var(--primary)]"
          : "border-border/50 bg-card/40 opacity-70 hover:opacity-100",
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          a.unlocked
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {a.unlocked ? <Trophy className="pop-in h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate font-bold",
              a.unlocked ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {a.title}
          </p>
          {a.unlocked && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Check className="h-3 w-3" />
              {formatDate(a.unlockedDate)}
            </span>
          )}
        </div>
        {a.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
        )}
        {hasTarget && (
          <div className="mt-2">
            <Bar
              value={progressPct}
              fillClassName={a.unlocked ? "bg-primary" : "bg-primary/70"}
            />
            <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
              {a.unlocked ? a.target : a.progress}/{a.target} · {progressPct}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type Filter = "all" | "unlocked" | "in_progress";

function ConquistasPage() {
  const { items, ready } = useAchievements();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // O campo responde à digitação na hora; a lista de ~1000 itens recalcula
  // logo atrás, sem travar a letra que está sendo digitada.
  const busca = useDeferredValue(q);

  const { total, unlocked, pct } = useMemo(() => {
    const t = items.length;
    const u = items.reduce((n, a) => n + (a.unlocked ? 1 : 0), 0);
    return { total: t, unlocked: u, pct: t ? Math.round((u / t) * 100) : 0 };
  }, [items]);

  const filtered = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return items
      .filter((a) =>
        filter === "all"
          ? true
          : filter === "unlocked"
            ? a.unlocked
            : !a.unlocked && a.progress > 0,
      )
      .filter(
        (a) =>
          !termo ||
          a.title.toLowerCase().includes(termo) ||
          a.description.toLowerCase().includes(termo),
      );
  }, [items, busca, filter]);

  const byTier = useMemo(
    () =>
      ACHIEVEMENT_TIERS.map((tier) => {
        const all = items.filter((a) => a.tier === tier);
        const group = filtered.filter((a) => a.tier === tier);
        const done = all.filter((a) => a.unlocked).length;
        return {
          tier,
          group,
          totalTier: all.length,
          done,
          pct: all.length ? Math.round((done / all.length) * 100) : 0,
        };
      }),
    [items, filtered],
  );

  const firstIncomplete = byTier.find((t) => t.totalTier > 0 && t.done < t.totalTier)?.tier;

  // Quais faixas estão abertas. Importa porque as linhas só entram no DOM
  // quando a faixa abre: com tudo aberto seriam ~1000 cartões de uma vez.
  const [abertas, setAbertas] = useState<Partial<Record<AchievementTier, boolean>>>({});
  const filtrando = busca.trim() !== "" || filter !== "all";
  const estaAberta = (tier: AchievementTier) =>
    abertas[tier] ?? (filtrando || tier === firstIncomplete);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "unlocked", label: "Desbloqueadas" },
    { key: "in_progress", label: "Em progresso" },
  ];

  return (
    <PageShell title="Conquistas" subtitle="Da branca à vermelha. Rumo ao topo.">
      <Card className="border-primary/40 bg-gradient-to-br from-primary/20 via-card/70 to-card/70 shadow-[0_0_30px_-10px_var(--primary)]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Rumo ao topo
              </p>
              <p className="mt-1 text-4xl font-black leading-none">
                {pct}
                <span className="text-2xl text-muted-foreground">%</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unlocked}/{total} conquistas
              </p>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]">
              <Trophy className="h-8 w-8" />
            </div>
          </div>
          <Progress value={pct} className="mt-4 h-2" />
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Buscar conquista…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold active:scale-95",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card/50 text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {ready && total === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Trophy className="mx-auto mb-2 h-6 w-6 text-primary" />
            Nenhuma conquista cadastrada ainda.
            <br />
            Rode o seed do banco — o caminho até a vermelha começa aqui.
          </CardContent>
        </Card>
      )}

      {byTier.map(
        ({ tier, group, totalTier, done, pct: tierPct }) =>
          totalTier > 0 && (
            <details
              key={tier}
              className="reveal group"
              open={estaAberta(tier)}
              onToggle={(e) => {
                // Lê o `open` agora: dentro do updater o currentTarget já é null.
                const aberta = (e.currentTarget as HTMLDetailsElement).open;
                setAbertas((s) => ({ ...s, [tier]: aberta }));
              }}
            >
              <summary className="tap cursor-pointer select-none list-none space-y-2 rounded-xl py-1 active:opacity-70 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest",
                        TIER_STYLE[tier].chip,
                      )}
                    >
                      Faixa {tier}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {done}/{totalTier}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-primary">
                    {tierPct}%
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </div>
                <Bar value={tierPct} label={`Faixa ${tier}: ${tierPct}% concluída`} />
              </summary>
              <div className="space-y-2 pt-2">
                {!estaAberta(tier) ? null : group.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">
                    Nada nesse filtro/busca dentro desta faixa.
                  </p>
                ) : (
                  group.map((a, idx) => <AchievementRow key={a.id} a={a} i={idx} />)
                )}
              </div>
            </details>
          ),
      )}
    </PageShell>
  );
}
