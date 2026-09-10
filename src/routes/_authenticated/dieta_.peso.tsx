import { createFileRoute } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confirmar } from "@/components/Confirmar";
import { RegistrarPeso } from "@/components/RegistrarPeso";
import { imc, tendenciaDePeso, type Pesagem } from "@/lib/dieta";
import { usePerfilDaDieta, usePesagens } from "@/lib/dieta-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta_/peso")({
  head: () => ({
    meta: [
      { title: "Peso — Ponteira" },
      {
        name: "description",
        content:
          "O histórico da balança e a tendência de 14 dias, que é a única leitura honesta dela.",
      },
    ],
  }),
  component: PesoPage,
});

const hoje = () => new Date().toISOString().slice(0, 10);
const kg = (n: number) => `${(Math.round(n * 10) / 10).toString().replace(".", ",")} kg`;
const dia = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

function PesoPage() {
  const { pesagens, ready, salvar, apagar } = usePesagens();
  const { perfil } = usePerfilDaDieta();

  const ultima = pesagens[0] ?? null;
  const tendencia = tendenciaDePeso(pesagens, hoje());
  const indice =
    ultima && perfil.alturaCm > 0 ? imc(ultima.pesoKg, perfil.alturaCm) : null;

  return (
    <PageShell
      title="Peso"
      subtitle="A balança oscila todo dia. O que vale é a direção."
      action={
        <RegistrarPeso
          pesoAnterior={ultima?.pesoKg ?? null}
          aoSalvar={salvar}
          gatilho={
            <Button size="sm" className="gap-1">
              <Icone.adicionar className="h-4 w-4" /> Pesar
            </Button>
          }
        />
      }
    >
      {ultima && (
        <Card>
          <CardContent className="p-4">
            <p className="text-center font-mono text-4xl font-black tabular-nums text-primary">
              {kg(ultima.pesoKg)}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              pesado em {dia(ultima.data)}
              {ultima.gorduraPct !== null &&
                ` · ${String(ultima.gorduraPct).replace(".", ",")}% de gordura`}
            </p>

            {tendencia ? (
              <div className="mt-4 rounded-xl bg-muted/50 p-3 text-center">
                <p
                  className={cn(
                    "font-mono text-xl font-black tabular-nums",
                    Math.abs(tendencia.porSemana) < 0.1
                      ? "text-muted-foreground"
                      : "text-primary",
                  )}
                >
                  {sinal(tendencia.porSemana)} kg/semana
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Média das últimas 2 semanas ({kg(tendencia.mediaRecente)}) contra
                  as 2 anteriores ({kg(tendencia.mediaAnterior)}).{" "}
                  {tendencia.amostrasRecentes + tendencia.amostrasAnteriores}{" "}
                  pesagens.
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                A tendência precisa de pesagem nas duas janelas de 14 dias. Pese
                duas ou três vezes por semana, sempre no mesmo horário, e ela
                aparece sozinha.
              </p>
            )}

            {indice !== null && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                IMC {indice.toFixed(1).replace(".", ",")} — e a ressalva de
                sempre: ele divide peso por altura e não sabe o que é músculo.
                Atleta de luta com pouca gordura cai em "sobrepeso" na tabela sem
                ter um grama sobrando.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {ready && pesagens.length >= 2 && <Grafico pesagens={pesagens} />}

      {ready && pesagens.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.peso className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhuma pesagem ainda. Sem peso o app não calcula caloria nenhuma —
            a basal e o gasto do treino dependem dele.
          </CardContent>
        </Card>
      )}

      <div className="space-y-1.5">
        {pesagens.map((p, i) => {
          const anterior = pesagens[i + 1];
          const delta = anterior ? p.pesoKg - anterior.pesoKg : null;
          return (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {dia(p.data)}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {kg(p.pesoKg)}
                </span>
                {delta !== null && Math.abs(delta) >= 0.05 && (
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      delta > 0 ? "text-muted-foreground" : "text-primary",
                    )}
                  >
                    {sinal(delta)}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {p.nota}
                </span>
                <Confirmar
                  gatilho={
                    <button
                      aria-label={`Apagar a pesagem de ${dia(p.data)}`}
                      className="tap shrink-0 rounded-lg p-2 text-muted-foreground hover:text-destructive active:scale-90"
                    >
                      <Icone.apagar className="h-4 w-4" />
                    </button>
                  }
                  titulo="Apagar esta pesagem?"
                  descricao="A tendência recalcula sem ela."
                  aoConfirmar={() => void apagar(p.id)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

/**
 * O gráfico é SVG escrito à mão, sem biblioteca.
 *
 * Uma biblioteca de gráfico custa de 40 a 90 kB gzip — mais de um terço do
 * orçamento inteiro do caminho crítico do app — para desenhar uma linha com
 * trinta pontos. A escala vertical é apertada de propósito: começa no mínimo e
 * termina no máximo do período, e não em zero, porque um eixo de 0 a 80 kg
 * achataria justamente a variação de dois quilos que a tela existe para mostrar.
 */
function Grafico({ pesagens }: { pesagens: Pesagem[] }) {
  const pontos = [...pesagens].reverse().slice(-60);
  const pesos = pontos.map((p) => p.pesoKg);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const amplitude = max - min || 1;

  const L = 300;
  const A = 90;
  const coord = (i: number, peso: number) => {
    const x = pontos.length === 1 ? L / 2 : (i / (pontos.length - 1)) * L;
    const y = A - ((peso - min) / amplitude) * A;
    return [x, y] as const;
  };

  const linha = pontos
    .map((p, i) => {
      const [x, y] = coord(i, p.pesoKg);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Últimas {pontos.length} pesagens
        </p>
        <svg
          viewBox={`0 -6 ${L} ${A + 12}`}
          className="mt-2 h-24 w-full"
          role="img"
          aria-label={`Peso de ${kg(pontos[0].pesoKg)} em ${dia(pontos[0].data)} a ${kg(
            pontos[pontos.length - 1].pesoKg,
          )} em ${dia(pontos[pontos.length - 1].data)}.`}
        >
          <path
            d={linha}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pontos.map((p, i) => {
            const [x, y] = coord(i, p.pesoKg);
            return (
              <circle key={p.id} cx={x} cy={y} r={2} fill="var(--primary)" />
            );
          })}
        </svg>
        <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{kg(min)}</span>
          <span>{kg(max)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function sinal(n: number): string {
  const r = Math.round(n * 100) / 100;
  const t = String(Math.abs(r)).replace(".", ",");
  if (r > 0) return `+${t}`;
  if (r < 0) return `−${t}`;
  return "0";
}
