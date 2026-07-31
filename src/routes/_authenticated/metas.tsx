import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { Award, ChevronRight, ClipboardList, Plus, Target, Trash2, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGoalStart, useWeakPoints, useTrainings, useHydrated } from "@/lib/bjj-storage";
import { useMetas, useCicloAtual, diasAte, type Meta, type TipoMeta } from "@/lib/plano-storage";
import { FAIXAS, type Faixa } from "@/lib/bjj-types";
import { Confirmar } from "@/components/Confirmar";
import { cn } from "@/lib/utils";

const GraficoEvolucao = lazy(() => import("@/components/GraficoEvolucao"));

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Ponteira" },
      {
        name: "description",
        content: "Suas metas de longo prazo: graduação, competição e volume de treino.",
      },
    ],
  }),
  component: MetasPage,
});

const ROTULO: Record<TipoMeta, string> = {
  graduacao: "Graduação",
  competicao: "Competição",
  volume: "Volume de treino",
  livre: "Livre",
};

/* ------------------------------------------------------------------ */

function NovaMeta() {
  const { criar } = useMetas();
  const [aberto, setAberto] = useState(false);
  const [kind, setKind] = useState<TipoMeta>("graduacao");
  const [title, setTitle] = useState("");
  const [belt, setBelt] = useState<Faixa>("Azul");
  const [evento, setEvento] = useState("");
  const [numero, setNumero] = useState(100);
  const [data, setData] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tituloAuto =
    kind === "graduacao"
      ? `Faixa ${belt}`
      : kind === "competicao"
        ? evento || "Competição"
        : kind === "volume"
          ? `${numero} treinos`
          : title;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" /> Nova meta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova meta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as TipoMeta)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="graduacao">Graduação — chegar numa faixa</SelectItem>
                <SelectItem value="competicao">Competição — um campeonato</SelectItem>
                <SelectItem value="volume">Volume — número de treinos</SelectItem>
                <SelectItem value="livre">Livre — o que você quiser</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "graduacao" && (
            <div>
              <Label>Qual faixa</Label>
              <Select value={belt} onValueChange={(v) => setBelt(v as Faixa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAIXAS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "competicao" && (
            <div>
              <Label htmlFor="evento">Campeonato</Label>
              <Input
                id="evento"
                value={evento}
                onChange={(e) => setEvento(e.target.value)}
                placeholder="Paranaense 2027"
              />
            </div>
          )}

          {kind === "volume" && (
            <div>
              <Label htmlFor="numero">Quantos treinos</Label>
              <Input
                id="numero"
                type="number"
                inputMode="numeric"
                min={1}
                value={numero}
                onChange={(e) => setNumero(+e.target.value)}
              />
            </div>
          )}

          {kind === "livre" && (
            <div>
              <Label htmlFor="titulo">O que você quer</Label>
              <Input
                id="titulo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dar minha primeira aula"
              />
            </div>
          )}

          <div>
            <Label htmlFor="data">Até quando</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A data é sua. O app não opina sobre o prazo.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={enviando || tituloAuto.trim().length < 2}
            onClick={async () => {
              setEnviando(true);
              const deu = await criar({
                kind,
                title: tituloAuto,
                targetBelt: kind === "graduacao" ? belt : null,
                targetDegrees: kind === "graduacao" ? 0 : null,
                eventName: kind === "competicao" ? evento : "",
                targetNumber: kind === "volume" ? numero : null,
                targetDate: data || null,
              });
              setEnviando(false);
              if (deu) {
                toast.success("Meta criada.");
                setAberto(false);
                setTitle("");
                setEvento("");
                setData("");
              }
            }}
          >
            {enviando ? "Salvando…" : "Criar meta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function CartaoMeta({
  meta,
  diasDeTatame,
  treinosNoPeriodo,
}: {
  meta: Meta;
  diasDeTatame: number;
  treinosNoPeriodo: number;
}) {
  const { salvar, apagar } = useMetas();
  const restam = diasAte(meta.targetDate);

  // Graduação: quanto do caminho já andou. Volume: treinos contados.
  let pct: number | null = null;
  let detalhe = "";
  if (meta.kind === "graduacao" && meta.targetDate && restam != null) {
    const total = diasDeTatame + Math.max(0, restam);
    pct = total ? Math.min(100, Math.round((diasDeTatame / total) * 100)) : 0;
    detalhe = `${diasDeTatame} dias no tatame`;
  } else if (meta.kind === "volume" && meta.targetNumber) {
    pct = Math.min(100, Math.round((treinosNoPeriodo / meta.targetNumber) * 100));
    detalhe = `${treinosNoPeriodo}/${meta.targetNumber} treinos`;
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/15 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {ROTULO[meta.kind]}
            </p>
            <p className="mt-0.5 truncate text-lg font-black">{meta.title}</p>
            {meta.targetDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(meta.targetDate + "T00:00:00").toLocaleDateString("pt-BR")}
                {restam != null &&
                  (restam >= 0 ? ` · faltam ${restam} dias` : " · prazo passou")}
              </p>
            )}
          </div>
          {meta.kind === "graduacao" ? (
            <Award className="h-6 w-6 shrink-0 text-primary" />
          ) : meta.kind === "competicao" ? (
            <Trophy className="h-6 w-6 shrink-0 text-primary" />
          ) : (
            <Target className="h-6 w-6 shrink-0 text-primary" />
          )}
        </div>

        {pct != null && (
          <div className="mt-3">
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black">{pct}%</p>
              <p className="text-xs text-muted-foreground">{detalhe}</p>
            </div>
            <Progress className="mt-1.5" value={pct} />
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Confirmar
            gatilho={
              <Button size="sm" variant="outline" className="flex-1">
                Conquistei
              </Button>
            }
            titulo="Conquistou essa meta?"
            descricao={`"${meta.title}" sai das metas ativas e vai para as conquistadas. Dá para recriar depois, mas o progresso atual não volta.`}
            rotuloConfirmar="Sim, conquistei"
            aoConfirmar={async () => {
              if (
                await salvar(meta.id, {
                  status: "concluida",
                  outcome: "conquistada",
                })
              ) {
                toast.success("Meta conquistada. Oss!");
              }
            }}
          />
          <Confirmar
            gatilho={
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Apagar meta ${meta.title}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            }
            titulo="Apagar esta meta?"
            descricao={`"${meta.title}" some de vez, junto com o histórico dela. Não dá para desfazer.`}
            rotuloConfirmar="Apagar"
            destrutivo
            aoConfirmar={() => apagar(meta.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function Pontos({ kind }: { kind: "fraco" | "forte" }) {
  const { items, updateScore } = useWeakPoints();
  const doTipo = items.filter((w) => w.kind === kind);

  if (!doTipo.length) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {kind === "fraco" ? "Pontos a evoluir" : "Pontos fortes"}
      </h2>
      <div className="space-y-3">
        {doTipo.map((w) => (
          <Card key={w.id} className="border-border/60 bg-card/70">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-semibold">{w.label}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                    kind === "fraco"
                      ? "bg-primary/15 text-primary"
                      : "bg-ouro/15 text-ouro",
                  )}
                >
                  {w.score}/5
                </span>
              </div>
              <Slider
                className="mt-3"
                value={[w.score]}
                min={0}
                max={5}
                step={1}
                aria-label={`Nota de ${w.label}`}
                onValueChange={([v]) => updateScore(w.id, v)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function MetasPage() {
  const hydrated = useHydrated();
  const { ativas, concluidas, ready } = useMetas();
  const { items } = useWeakPoints();
  const { items: treinos } = useTrainings();
  const { start, set: setStart } = useGoalStart();
  const { ciclo, execucao } = useCicloAtual();

  const inicio = new Date(start + "T00:00:00");
  const dias = Math.max(
    0,
    Math.floor((Date.now() - inicio.getTime()) / 86400000),
  );

  const chartData = items.length ? aggregateHistory(items) : [];

  return (
    <PageShell title="Metas" subtitle="Onde você quer chegar.">
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <Label htmlFor="inicio" className="text-xs uppercase tracking-widest text-muted-foreground">
            Início da jornada
          </Label>
          <Input
            id="inicio"
            type="date"
            className="mt-1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {hydrated ? `${dias} dias no tatame` : "—"}
          </p>
        </CardContent>
      </Card>

      {ready && ativas.length === 0 && (
        <Card className="border-dashed border-primary/40 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Award className="mx-auto mb-2 h-6 w-6 text-primary" />
            Nenhuma meta ainda. Comece pela graduação — a data é sua.
          </CardContent>
        </Card>
      )}

      {ativas.map((m) => (
        <CartaoMeta
          key={m.id}
          meta={m}
          diasDeTatame={dias}
          treinosNoPeriodo={treinos.length}
        />
      ))}

      <NovaMeta />

      {/* O plano é como você chega nas metas acima — por isso mora aqui. */}
      <Link to="/plano" className="block">
        <Card className="tap border-primary/40 bg-card/60 active:scale-[0.99]">
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {ciclo ? ciclo.titulo : "Plano do mês"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {ciclo
                  ? `${execucao}% cumprido neste mês`
                  : "Escolha o que melhorar e monte as 4 semanas"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Pontos kind="fraco" />

      {chartData.length > 1 && (
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Evolução dos pontos</p>
            </div>
            <div className="h-40">
              <Suspense
                fallback={
                  <div
                    className="h-full w-full animate-pulse rounded-xl bg-muted/40"
                    aria-hidden="true"
                  />
                }
              >
                <GraficoEvolucao dados={chartData} />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      )}

      <Pontos kind="forte" />

      {concluidas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Conquistadas
          </h2>
          {concluidas.map((m) => (
            <Card key={m.id} className="border-primary/40 bg-primary/5">
              <CardContent className="flex items-center gap-2 p-3">
                <Trophy className="h-4 w-4 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{m.title}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
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
