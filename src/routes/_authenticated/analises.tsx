import type { CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, CalendarDays, ChevronDown } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyses } from "@/lib/bjj-storage";
import type { Analysis } from "@/lib/bjj-types";

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

/** Primeira frase, pra dar uma ideia do conteúdo com o card fechado */
function resumo(texto: string) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > 90 ? limpo.slice(0, 90) + "…" : limpo;
}

function AnaliseCard({ a, aberta, i }: { a: Analysis; aberta: boolean; i: number }) {
  return (
    <Card
      className="rise-in overflow-hidden border-border/60 bg-card/70"
      style={{ "--i": i } as CSSProperties}
    >
      <details open={aberta} className="reveal group">
        <summary className="tap cursor-pointer list-none p-4 hover:bg-secondary/40 active:bg-secondary/60 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {formatDate(a.date)}
              </p>
              <h2 className="truncate text-sm font-bold leading-tight">{a.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground group-open:hidden">
                {resumo(a.content)}
              </p>
              <p className="mt-1 hidden text-[11px] font-semibold text-primary group-open:block">
                Toque para fechar
              </p>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <CardContent className="border-t border-border/50 p-4 pt-3">
          <p className="fade-in whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {a.content}
          </p>
        </CardContent>
      </details>
    </Card>
  );
}

function AnalisesPage() {
  const { items, ready } = useAnalyses();
  const total = items.length;
  const last = items[0]?.date;

  return (
    <PageShell title="Análises" subtitle="Toque numa análise para ler.">
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
            <p className="text-sm font-semibold">{last ? formatDate(last) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      {ready && total === 0 && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Ainda sem análises. Quando o treinador registrar uma leitura do seu jogo, ela aparece
            aqui em ordem cronológica.
          </CardContent>
        </Card>
      )}

      {/* A mais recente já vem aberta; as outras ficam recolhidas */}
      <div className="space-y-2">
        {items.map((a, i) => (
          <AnaliseCard key={a.id} a={a} aberta={i === 0} i={i} />
        ))}
      </div>
    </PageShell>
  );
}
