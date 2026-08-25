import { createFileRoute } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confirmar } from "@/components/Confirmar";
import { CadastrarLuta } from "@/components/CadastrarLuta";
import { acentoDaFaixa } from "@/lib/faixa-cores";
import type { Faixa } from "@/lib/bjj-types";
import {
  cartelEmTexto,
  METODOS,
  useMinhasLutas,
  type Luta,
} from "@/lib/lutas-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/minhas-lutas")({
  head: () => ({
    meta: [
      { title: "Minhas lutas — Ponteira" },
      {
        name: "description",
        content:
          "Seu cartel luta a luta: resultado, método e como cada uma terminou.",
      },
    ],
  }),
  component: MinhasLutasPage,
});

const nomeDoMetodo = (v: string | null) =>
  METODOS.find((m) => m.valor === v)?.nome ?? "";

function tempo(seg: number | null): string {
  if (seg === null) return "";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function LinhaDeLuta({ l, acao }: { l: Luta; acao: React.ReactNode }) {
  const venceu = l.resultado === "vitoria";
  const empatou = l.resultado === "empate";

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg text-sm font-black",
            venceu && "bg-primary/15 text-primary",
            !venceu && !empatou && "bg-destructive/15 text-destructive",
            empatou && "bg-muted text-muted-foreground",
          )}
        >
          {venceu ? "V" : empatou ? "E" : "D"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">
            {nomeDoMetodo(l.metodo)}
            {l.golpe && (
              <span className="font-medium text-muted-foreground">
                {" · "}
                {l.golpe}
              </span>
            )}
            {l.tempoSeg !== null && (
              <span className="font-medium tabular-nums text-muted-foreground">
                {" · "}
                {tempo(l.tempoSeg)}
              </span>
            )}
          </p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {[l.evento, l.categoria].filter(Boolean).join(" · ") || "Sem evento"}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {l.data.split("-").reverse().join("/")}
            </span>
            {l.oponenteFaixa && (
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: acentoDaFaixa(l.oponenteFaixa as Faixa) }}
                />
                {l.oponente || l.oponenteFaixa}
              </span>
            )}
            {!l.oficial && (
              <span className="rounded border border-border/60 px-1.5 py-0.5">
                não oficial
              </span>
            )}
          </div>

          {l.notas && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {l.notas}
            </p>
          )}
        </div>

        {acao}
      </CardContent>
    </Card>
  );
}

function MinhasLutasPage() {
  const { lutas, cartel, ready, criar, apagar } = useMinhasLutas();

  return (
    <PageShell
      title="Minhas lutas"
      subtitle="O cartel do seu perfil vem daqui."
      action={
        <CadastrarLuta
          aoSalvar={criar}
          gatilho={
            <Button size="sm" className="gap-1">
              <Icone.adicionar className="h-4 w-4" /> Nova
            </Button>
          }
        />
      }
    >
      {cartel.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-center font-mono text-3xl font-black tabular-nums text-primary">
              {cartelEmTexto(cartel)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/50 p-2">
                <span className="block text-base font-black tabular-nums">
                  {cartel.porFinalizacao}
                </span>
                <span className="text-muted-foreground">
                  vitórias por finalização
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <span className="block text-base font-black tabular-nums">
                  {cartel.finalizacoesSofridas}
                </span>
                <span className="text-muted-foreground">
                  derrotas por finalização
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ready && lutas.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.medalha className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhuma luta registrada ainda. Uma luta de campeonato vale mais que
            dez rolas de treino como informação — vale registrar cada uma.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {lutas.map((l) => (
          <LinhaDeLuta
            key={l.id}
            l={l}
            acao={
              <Confirmar
                gatilho={
                  <button
                    aria-label={`Apagar a luta de ${l.data.split("-").reverse().join("/")}`}
                    className="tap rounded-lg p-2 text-muted-foreground hover:text-destructive active:scale-90"
                  >
                    <Icone.apagar className="h-4 w-4" />
                  </button>
                }
                titulo="Apagar esta luta?"
                descricao="Ela sai do cartel e o número do seu perfil recalcula. Não dá para desfazer."
                aoConfirmar={() => void apagar(l.id)}
              />
            }
          />
        ))}
      </div>
    </PageShell>
  );
}
