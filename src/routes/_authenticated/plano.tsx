import { createFileRoute } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { Check, ChevronRight, Minus, Plus, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bar } from "@/components/ui/bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useCicloAtual,
  useObjetivos,
  diasAte,
  type Ciclo,
  type ItemDoPlano,
} from "@/lib/plano-storage";

export const Route = createFileRoute("/_authenticated/plano")({
  head: () => ({
    meta: [
      { title: "Plano do mês — Tatame" },
      {
        name: "description",
        content: "Seu plano de evolução do mês: um objetivo, quatro semanas.",
      },
    ],
  }),
  component: PlanoPage,
});

/* ------------------------------------------------------------------ */

/**
 * Item com alvo vira contador ("3 rolas" = 0/3); sem alvo é check simples.
 * Boa parte do conteúdo é repetição — marcar uma vez só não representaria.
 */
function Item({
  item,
  i,
  aoMarcar,
}: {
  item: ItemDoPlano;
  i: number;
  aoMarcar: (item: ItemDoPlano, delta: number) => void;
}) {
  const contador = item.alvo > 0;
  const completo = contador ? item.feito >= item.alvo : item.feito > 0;

  return (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className={cn(
        "rise-in list-perf flex items-center gap-3 rounded-2xl border p-3",
        completo ? "border-primary/50 bg-primary/10" : "border-border/50 bg-card/40",
      )}
    >
      {contador ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Menos um em ${item.texto}`}
            onClick={() => aoMarcar(item, -1)}
            className="tap grid h-9 w-9 place-items-center rounded-lg border border-border/60 text-muted-foreground active:scale-90"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span
            aria-live="polite"
            className={cn(
              "w-10 text-center text-sm font-black tabular-nums",
              completo && "text-primary",
            )}
          >
            {item.feito}/{item.alvo}
          </span>
          <button
            type="button"
            aria-label={`Mais um em ${item.texto}`}
            onClick={() => aoMarcar(item, 1)}
            className="tap grid h-9 w-9 place-items-center rounded-lg border border-border/60 text-muted-foreground active:scale-90"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          role="checkbox"
          aria-checked={completo}
          aria-label={item.texto}
          onClick={() => aoMarcar(item, 1)}
          className={cn(
            "tap grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 active:scale-90",
            completo
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60",
          )}
        >
          {completo && <Check className="pop-in h-4 w-4" />}
        </button>
      )}

      <p
        className={cn(
          "min-w-0 flex-1 text-sm",
          completo ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {item.texto}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EscolherObjetivo({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { disponiveis, ready } = useObjetivos();
  const { iniciar } = useCicloAtual();
  const [enviando, setEnviando] = useState("");

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>O que melhorar este mês?</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Um objetivo por mês. O plano é montado para a sua faixa e seus graus.
        </p>
        <div className="space-y-2">
          {!ready && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {disponiveis.map((o) => (
            <button
              key={o.slug}
              type="button"
              disabled={!!enviando}
              onClick={async () => {
                setEnviando(o.slug);
                const deu = await iniciar(o.slug);
                setEnviando("");
                if (deu) {
                  toast.success(`Plano de ${o.nome.toLowerCase()} montado.`);
                  aoFechar();
                }
              }}
              className="tap flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 text-left active:scale-[0.98] disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{o.nome}</p>
                <p className="text-[11px] text-muted-foreground">{o.descricao}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function FecharMes({
  aberto,
  aoFechar,
  ciclo,
  execucao,
}: {
  aberto: boolean;
  aoFechar: () => void;
  ciclo: Ciclo;
  execucao: number;
}) {
  const { encerrar } = useCicloAtual();
  const [nota, setNota] = useState(ciclo.notaInicial ?? 3);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar o mês</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Você cumpriu <span className="font-bold text-foreground">{execucao}%</span> do
          plano. Agora se avalie no objetivo, de 0 a 5.
        </p>
        {ciclo.notaInicial != null && (
          <p className="text-xs text-muted-foreground">
            No começo do mês você se deu <b>{ciclo.notaInicial}</b>.
          </p>
        )}
        <div className="flex justify-between gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              className={cn(
                "tap h-12 flex-1 rounded-xl border text-base font-black active:scale-95",
                nota === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <Button
          className="w-full"
          onClick={async () => {
            if (await encerrar(ciclo.id, nota)) {
              toast.success("Mês fechado. Agora escolha o próximo objetivo.");
              aoFechar();
            }
          }}
        >
          Fechar e escolher o próximo
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function Historico({ itens }: { itens: Ciclo[] }) {
  if (!itens.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        <Trophy className="h-4 w-4" /> Meses anteriores
      </h2>
      {itens.map((c) => (
        <Card key={c.id} className="border-border/50 bg-card/40">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{c.titulo}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(c.inicio + "T00:00:00").toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            {c.notaInicial != null && c.notaFinal != null && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-black",
                  c.notaFinal > c.notaInicial
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {c.notaInicial} → {c.notaFinal}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function PlanoPage() {
  const { ciclo, itens, semanas, execucao, historico, ready, marcar } = useCicloAtual();
  const [escolhendo, setEscolhendo] = useState(false);
  const [fechando, setFechando] = useState(false);

  const restam = ciclo ? diasAte(ciclo.fim) : null;

  if (ready && !ciclo) {
    return (
      <PageShell title="Plano do mês" subtitle="Um objetivo por vez.">
        <Card className="border-dashed border-primary/40 bg-transparent">
          <CardContent className="p-6 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="font-bold">Nenhum plano ativo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o que você quer melhorar e o app monta as 4 semanas para a
              sua faixa e seus graus.
            </p>
            <Button className="mt-4 w-full" onClick={() => setEscolhendo(true)}>
              Escolher objetivo
            </Button>
          </CardContent>
        </Card>
        <Historico itens={historico} />
        <EscolherObjetivo aberto={escolhendo} aoFechar={() => setEscolhendo(false)} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Plano do mês"
      subtitle={ciclo?.titulo ?? "Carregando…"}
      action={
        ciclo ? (
          <Button size="sm" variant="outline" onClick={() => setFechando(true)}>
            Fechar mês
          </Button>
        ) : undefined
      }
    >
      {ciclo && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/15 via-card/70 to-card/70">
          <CardContent className="p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Execução do mês
                </p>
                <p className="mt-1 text-4xl font-black leading-none">
                  {execucao}
                  <span className="text-2xl text-muted-foreground">%</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {restam != null && restam >= 0
                  ? `faltam ${restam} dias`
                  : "prazo encerrado"}
              </p>
            </div>
            <Bar
              value={execucao}
              label={`Plano do mês: ${execucao}% cumprido`}
              className="mt-3"
            />
          </CardContent>
        </Card>
      )}

      {semanas.map((s) => {
        const daSemana = itens.filter((i) => i.semana === s);
        const foco = daSemana[0]?.foco ?? "";
        const feitos = daSemana.filter((i) =>
          i.alvo > 0 ? i.feito >= i.alvo : i.feito > 0,
        ).length;
        return (
          <section key={s} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="min-w-0 text-sm font-bold">
                <span className="text-primary">Semana {s}</span>
                {foco && <span className="text-muted-foreground"> · {foco}</span>}
              </h2>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {feitos}/{daSemana.length}
              </span>
            </div>
            {daSemana.map((item, i) => (
              <Item key={item.id} item={item} i={i} aoMarcar={marcar} />
            ))}
          </section>
        );
      })}

      <Historico itens={historico} />

      <EscolherObjetivo aberto={escolhendo} aoFechar={() => setEscolhendo(false)} />
      {ciclo && (
        <FecharMes
          aberto={fechando}
          aoFechar={() => {
            setFechando(false);
            setEscolhendo(true);
          }}
          ciclo={ciclo}
          execucao={execucao}
        />
      )}
    </PageShell>
  );
}
