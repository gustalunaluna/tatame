import { useState } from "react";
import { Icone } from "@/design/icones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { HexagonoDoJogo, TabelaDoHexagono } from "@/components/HexagonoDoJogo";
import {
  EIXOS,
  NOTA_MAXIMA,
  prescricaoDoMes,
  minutosDirigidos,
  type NotasDoHexagono,
} from "@/lib/hexagono";
import {
  useAvaliacoes,
  mesCurto,
  nomeDoMes,
  type AvaliacaoDoMes,
} from "@/lib/hexagono-storage";
import { usePerfil } from "@/lib/bjj-storage";
import { cn } from "@/lib/utils";

/* ================================================================== */

function FormularioDaAvaliacao({
  inicial,
  notaInicial,
  jaAvaliou,
  aoSalvar,
  salvando,
}: {
  inicial: NotasDoHexagono;
  notaInicial: string;
  jaAvaliou: boolean;
  aoSalvar: (notas: NotasDoHexagono, nota: string) => Promise<void>;
  salvando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState<NotasDoHexagono>(inicial);
  const [nota, setNota] = useState(notaInicial);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        // Reabrir sempre parte do que está gravado, não do que ficou na tela
        // de uma edição abandonada.
        if (v) {
          setNotas(inicial);
          setNota(notaInicial);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Icone.evolucao className="h-4 w-4" />
          {jaAvaliou ? "Rever" : "Avaliar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seu jogo este mês</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Zero é "não existe ainda"; cinco é "é o meu melhor". Compare com quem
          treina no seu nível, não com o professor — a nota só vale se ela puder
          descer no mês que vem.
        </p>

        <div className="space-y-4">
          {EIXOS.map((e) => (
            <div key={e.slug}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold">{e.nome}</p>
                <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
                  {notas[e.slug] ?? 0}/{NOTA_MAXIMA}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{e.pergunta}</p>
              <Slider
                className="mt-2"
                value={[notas[e.slug] ?? 0]}
                min={0}
                max={NOTA_MAXIMA}
                step={1}
                aria-label={`Nota de ${e.nome}`}
                onValueChange={([v]) => setNotas((n) => ({ ...n, [e.slug]: v }))}
              />
            </div>
          ))}

          <div>
            <Label htmlFor="avaliacao-nota">Observação do mês</Label>
            <Input
              id="avaliacao-nota"
              value={nota}
              onChange={(ev) => setNota(ev.target.value)}
              placeholder="Ex.: voltei de lesão, treinei pouco"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={salvando}
            onClick={async () => {
              await aoSalvar(notas, nota);
              setAberto(false);
            }}
          >
            {salvando ? "Salvando…" : "Salvar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

function Plano({
  notas,
  faixa,
}: {
  notas: NotasDoHexagono;
  faixa: string | undefined;
}) {
  const p = prescricaoDoMes(notas, faixa);
  if (!p) return null;

  return (
    <Card className="border-primary/40 bg-card/70">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icone.tecnica className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-bold">O mês aponta para {p.eixo.nome.toLowerCase()}</p>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{p.porque}</p>

        <ol className="mt-3 space-y-2">
          {p.semanas.map((s) => (
            <li
              key={s.semana}
              className="rounded-xl border border-border/60 p-3"
            >
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  Semana {s.semana}
                </span>
                <span className="min-w-0 truncate text-xs font-bold">{s.foco}</span>
              </div>
              <p className="mt-1 text-sm">{s.restricao}</p>
            </li>
          ))}
        </ol>

        <p className="mt-3 text-xs text-muted-foreground">{p.comoSaber}</p>

        {/* Por que as semanas alternam em vez de empilhar. Sem esta linha o
            plano parece desorganizado — e é justamente o contrário. */}
        <details className="reveal mt-3">
          <summary className="cursor-pointer text-xs font-bold text-primary">
            Por que alterna entre dois temas?
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Porque treinar dois assuntos alternados rende mais que fechar um de
            cada vez, mesmo parecendo pior durante o mês. O intervalo entre a
            semana 1 e a semana 3 é o que faz o aprendizado ficar — é o mesmo
            motivo pelo qual estudar espaçado bate estudar em bloco. E cada
            semana é rola posicional com regra, não repetição no boneco: no
            jiu-jitsu a técnica aparece resolvendo um problema, não copiando um
            movimento. São {minutosDirigidos(faixa)} minutos por semana dentro
            do treino que você já faz.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

/* ================================================================== */

/**
 * O painel do jogo: hexágono, comparação e plano.
 *
 * Substitui a linha da média dos pontos fracos. A média de seis habilidades é
 * o número que mais esconde — quem melhorou a passagem e piorou a defesa
 * aparecia parado, e "parado" era a leitura errada.
 */
export function PainelDoJogo() {
  const { avaliacoes, atual, anterior, inicial, ready, salvar } = useAvaliacoes();
  const { perfil } = usePerfil();
  const [comparadoCom, setComparadoCom] = useState<string>("");

  const emFoco: AvaliacaoDoMes | null = atual ?? avaliacoes[0] ?? null;

  const candidatos = avaliacoes.filter((a) => a.mes !== emFoco?.mes);
  const escolhido =
    candidatos.find((a) => a.mes === comparadoCom) ??
    (emFoco === atual ? anterior : candidatos[0]) ??
    null;

  if (!ready) {
    return (
      <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/40" aria-hidden />
    );
  }

  /* --- ainda não avaliou nada --- */
  if (!emFoco) {
    return (
      <Card className="border-dashed border-primary/40 bg-transparent">
        <CardContent className="p-6 text-center">
          <Icone.evolucao className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-sm font-bold">Onde está o seu jogo?</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Seis notas, uma vez por mês. Não é para acertar — é para ver o
            formato mudar. Daqui a seis meses este é o gráfico que vai te dizer
            no que você virou bom sem perceber.
          </p>
          <div className="mt-4 flex justify-center">
            <FormularioDaAvaliacao
              inicial={inicial}
              notaInicial=""
              jaAvaliou={false}
              salvando={salvar.isPending}
              aoSalvar={async (notas, nota) => {
                await salvar.mutateAsync({ notas, nota });
              }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const precisaAvaliar = !atual;

  return (
    <div className="space-y-3">
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold">Seu jogo</p>
              <p className="truncate text-xs text-muted-foreground">
                {nomeDoMes(emFoco.mes)}
                {precisaAvaliar && " · ainda não avaliado este mês"}
              </p>
            </div>
            <FormularioDaAvaliacao
              inicial={inicial}
              notaInicial={atual?.nota ?? ""}
              jaAvaliou={Boolean(atual)}
              salvando={salvar.isPending}
              aoSalvar={async (notas, nota) => {
                await salvar.mutateAsync({ notas, nota });
              }}
            />
          </div>

          <HexagonoDoJogo
            className="mt-2"
            agora={emFoco.notas}
            rotuloAgora={mesCurto(emFoco.mes)}
            antes={escolhido?.notas}
            rotuloAntes={escolhido ? mesCurto(escolhido.mes) : undefined}
          />

          {candidatos.length > 0 && (
            <div className="mt-2">
              <Label htmlFor="comparar-com" className="text-xs text-muted-foreground">
                Comparar com
              </Label>
              <Select
                value={escolhido?.mes ?? ""}
                onValueChange={setComparadoCom}
              >
                <SelectTrigger id="comparar-com" aria-label="Comparar com" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((a) => (
                    <SelectItem key={a.mes} value={a.mes}>
                      {nomeDoMes(a.mes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-4">
            <TabelaDoHexagono
              agora={emFoco.notas}
              antes={escolhido?.notas}
              rotuloAgora={mesCurto(emFoco.mes)}
              rotuloAntes={escolhido ? mesCurto(escolhido.mes) : undefined}
            />
          </div>

          {emFoco.nota && (
            <p className={cn("mt-3 text-xs italic text-muted-foreground")}>
              “{emFoco.nota}”
            </p>
          )}
        </CardContent>
      </Card>

      <Plano notas={emFoco.notas} faixa={perfil?.belt} />
    </div>
  );
}
