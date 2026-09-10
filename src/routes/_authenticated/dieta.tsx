import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bar } from "@/components/ui/bar";
import { Confirmar } from "@/components/Confirmar";
import { RegistrarRefeicao } from "@/components/RegistrarRefeicao";
import { RegistrarPeso } from "@/components/RegistrarPeso";
import {
  MET_ROLA,
  MET_TECNICA,
  porMomento,
  type Macros,
} from "@/lib/dieta";
import {
  useContaDaDieta,
  usePesagens,
  useRefeicoes,
  type Pendencia,
} from "@/lib/dieta-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta")({
  head: () => ({
    meta: [
      { title: "Dieta — Ponteira" },
      {
        name: "description",
        content:
          "O que entrou, o que o treino gastou e o que sobra do dia. A caloria do treino sai do seu próprio diário.",
      },
    ],
  }),
  component: DietaPage,
});

const hoje = () => new Date().toISOString().slice(0, 10);

/** Anda N dias a partir de uma data ISO, sem cair no fuso local. */
function somarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dataPorExtenso = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

/**
 * O momento provável pelo relógio.
 *
 * Ninguém abre a tela às 13h para anotar o café da manhã. Acertar o palpite na
 * maioria das vezes economiza um toque em cada registro, e errar não custa
 * nada: os botões estão logo ali.
 */
function momentoDaHora(): string {
  const h = new Date().getHours();
  if (h < 10) return "Café da manhã";
  if (h < 12) return "Lanche da manhã";
  if (h < 15) return "Almoço";
  if (h < 18) return "Lanche da tarde";
  if (h < 22) return "Jantar";
  return "Ceia";
}

const g = (n: number) => `${Math.round(n)} g`;

const FALTA: Record<Pendencia, { texto: string; onde: "ajustes" | "peso" | "perfil" }> = {
  altura: { texto: "sua altura", onde: "ajustes" },
  sexo: { texto: "sexo biológico (a fórmula da basal muda)", onde: "ajustes" },
  nascimento: { texto: "sua data de nascimento", onde: "perfil" },
  peso: { texto: "uma pesagem", onde: "peso" },
};

function DietaPage() {
  // A tela precisa saber ontem. Metade do jantar é anotado na manhã seguinte, e
  // um app que só sabe "hoje" obriga a pessoa a mentir a data ou a desistir.
  const [dia, setDia] = useState(hoje);
  const ehHoje = dia === hoje();

  const conta = useContaDaDieta(dia);
  const { criar, apagar } = useRefeicoes(dia);
  const { salvar: salvarPeso } = usePesagens();

  const grupos = porMomento(conta.refeicoes);

  return (
    <PageShell
      title="Dieta"
      subtitle="O que entrou, e o que o treino gastou."
      action={
        <RegistrarRefeicao
          data={dia}
          momentoSugerido={ehHoje ? momentoDaHora() : undefined}
          aoSalvar={criar}
          gatilho={
            <Button size="sm" className="gap-1">
              <Icone.adicionar className="h-4 w-4" /> Comi
            </Button>
          }
        />
      }
    >
      {/* ---- que dia estamos olhando ---- */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDia(somarDias(dia, -1))}
          aria-label="Dia anterior"
          className="tap grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 active:scale-90"
        >
          <Icone.voltar className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold first-letter:uppercase">
          {dataPorExtenso(dia)}
        </p>
        <button
          onClick={() => setDia(somarDias(dia, 1))}
          // Não existe o que comer amanhã. Sem isto, dá para navegar para um
          // futuro vazio e achar que o app perdeu os registros.
          disabled={ehHoje}
          aria-label="Dia seguinte"
          className="tap grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 active:scale-90 disabled:opacity-30"
        >
          <Icone.avancar className="h-4 w-4" />
        </button>
      </div>

      {/* ---- o que ainda falta para a conta existir ---- */}
      {conta.ready && !conta.pronta && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-bold">
              <Icone.dieta className="mr-1.5 inline h-4 w-4 text-primary" />
              Falta pouco para o app fechar sua conta
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {conta.pendencias.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{FALTA[p].texto}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {conta.pendencias.some((p) => FALTA[p].onde === "ajustes") && (
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/dieta/ajustes">Preencher metas</Link>
                </Button>
              )}
              {conta.pendencias.includes("peso") && (
                <RegistrarPeso
                  pesoAnterior={conta.pesoKg}
                  aoSalvar={salvarPeso}
                  gatilho={
                    <Button size="sm" variant="secondary">
                      Registrar peso
                    </Button>
                  }
                />
              )}
              {conta.pendencias.includes("nascimento") && (
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/perfil">Abrir perfil</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- o saldo do dia ---- */}
      {conta.pronta && conta.meta && (
        <SaldoDoDia
          consumido={conta.consumido}
          meta={conta.meta}
          saldo={conta.saldo}
        />
      )}

      {/* ---- de onde vem o gasto ---- */}
      {conta.pronta && conta.gasto && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Gasto estimado do dia
            </p>
            <div className="mt-2 space-y-1.5 text-sm">
              <Linha rotulo="Metabolismo basal" valor={conta.gasto.basal} />
              <Linha rotulo="Vida fora do treino" valor={conta.gasto.vida} />
              <Linha
                rotulo={
                  conta.gasto.minutosTreinados > 0
                    ? `Treino (${conta.gasto.minutosTreinados} min)`
                    : "Treino"
                }
                valor={conta.gasto.treino}
                destaque
              />
              <div className="flex items-baseline justify-between border-t border-border/60 pt-1.5 font-black">
                <span>Total</span>
                <span className="tabular-nums">{conta.gasto.total} kcal</span>
              </div>
            </div>

            {conta.gasto.treino === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Sem treino lançado neste dia. O gasto de treino vem do{" "}
                <Link to="/diario" className="underline">
                  Diário
                </Link>{" "}
                — da duração e do número de rolas. Se você treinou e não anotou,
                a conta aqui está baixa.
              </p>
            )}

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <Icone.alerta className="mr-1 inline h-3 w-3" />
              Isto é estimativa, não medição. A basal é Mifflin-St Jeor; o treino
              usa MET {String(MET_TECNICA).replace(".", ",")} para técnica e{" "}
              {String(MET_ROLA).replace(".", ",")} para rola. Dois atletas do mesmo
              peso na mesma aula gastam diferente. Quem decide se a conta está
              certa para o SEU corpo é a balança, não a fórmula — veja a{" "}
              <Link to="/dieta/peso" className="underline">
                tendência de peso
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---- o que comeu ---- */}
      {conta.ready && conta.refeicoes.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.refeicao className="mx-auto mb-2 h-5 w-5 text-primary" />
            {ehHoje ? "Nada anotado hoje." : "Nada anotado neste dia."} Registrar
            por três semanas seguidas ensina mais sobre a sua dieta do que
            qualquer tabela pronta — porque é a sua.
          </CardContent>
        </Card>
      )}

      {grupos.map(([momento, itens]) => (
        <section key={momento}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">{momento}</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {itens.reduce((n, r) => n + r.kcal, 0)} kcal
            </span>
          </div>
          <div className="mt-1.5 space-y-1.5">
            {itens.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.alimento}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        r.porcao,
                        `P ${g(r.proteinaG)}`,
                        `C ${g(r.carboidratoG)}`,
                        `G ${g(r.gorduraG)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums text-primary">
                    {r.kcal}
                  </span>
                  <Confirmar
                    gatilho={
                      <button
                        aria-label={`Apagar ${r.alimento}`}
                        className="tap shrink-0 rounded-lg p-2 text-muted-foreground hover:text-destructive active:scale-90"
                      >
                        <Icone.apagar className="h-4 w-4" />
                      </button>
                    }
                    titulo="Apagar este item?"
                    descricao="Ele sai do total do dia."
                    aoConfirmar={() => void apagar(r.id)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* ---- peso ---- */}
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <Icone.peso className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {conta.pesoKg !== null
                ? `${String(conta.pesoKg).replace(".", ",")} kg`
                : "Sem pesagem"}
            </p>
            <p className="text-xs text-muted-foreground">
              {conta.tendencia
                ? `${sinal(conta.tendencia.porSemana)} kg por semana nas últimas 4 semanas`
                : "Duas semanas de pesagens e o app começa a mostrar tendência."}
            </p>
          </div>
          <RegistrarPeso
            pesoAnterior={conta.pesoKg}
            aoSalvar={salvarPeso}
            gatilho={
              <Button size="sm" variant="secondary">
                Pesar
              </Button>
            }
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{rotulo}</span>
      <span
        className={cn("tabular-nums", destaque && valor > 0 && "font-bold text-primary")}
      >
        {valor} kcal
      </span>
    </div>
  );
}

function SaldoDoDia({
  consumido,
  meta,
  saldo,
}: {
  consumido: Macros;
  meta: Macros;
  saldo: number;
}) {
  const passou = saldo < 0;
  const pct = meta.kcal > 0 ? (consumido.kcal / meta.kcal) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <p
          className={cn(
            "text-center font-mono text-4xl font-black tabular-nums",
            passou ? "text-destructive" : "text-primary",
          )}
        >
          {Math.abs(saldo)}
        </p>
        <p className="text-center text-xs text-muted-foreground">
          {passou ? "kcal acima da meta" : "kcal ainda cabem hoje"}
        </p>

        <div className="mt-3">
          <Bar
            value={pct}
            className="h-2"
            fillClassName={passou ? "bg-destructive" : undefined}
            label={`${consumido.kcal} de ${meta.kcal} kcal`}
          />
          <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{consumido.kcal} kcal comidas</span>
            <span>meta {meta.kcal}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Macro nome="Proteína" atual={consumido.proteinaG} alvo={meta.proteinaG} />
          <Macro
            nome="Carboidrato"
            atual={consumido.carboidratoG}
            alvo={meta.carboidratoG}
          />
          <Macro nome="Gordura" atual={consumido.gorduraG} alvo={meta.gorduraG} />
        </div>
      </CardContent>
    </Card>
  );
}

function Macro({
  nome,
  atual,
  alvo,
}: {
  nome: string;
  atual: number;
  alvo: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{nome}</span>
        <span className="tabular-nums text-muted-foreground">
          {g(atual)} / {g(alvo)}
        </span>
      </div>
      <Bar
        value={alvo > 0 ? (atual / alvo) * 100 : 0}
        className="mt-1"
        label={`${nome}: ${g(atual)} de ${g(alvo)}`}
      />
    </div>
  );
}

/** "+0,3" / "−0,4" — o sinal precisa aparecer, é ele que diz a direção. */
function sinal(n: number): string {
  const arredondado = Math.round(n * 100) / 100;
  const texto = String(Math.abs(arredondado)).replace(".", ",");
  if (arredondado > 0) return `+${texto}`;
  if (arredondado < 0) return `−${texto}`;
  return "0";
}
