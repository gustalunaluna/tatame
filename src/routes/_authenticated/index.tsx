import type { CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Faixa } from "@/components/Faixa";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar } from "@/components/ui/bar";
import { FotoDoAtleta } from "@/components/FotoDoAtleta";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useAchievementStats,
  useEnsureSeeded,
  useGoalStart,
  usePerfil,
  useTrainings,
  useHydrated,
} from "@/lib/bjj-storage";
import { useCicloAtual, useMetas, diasAte } from "@/lib/plano-storage";
import { nivelPorHoras, horasEmTexto } from "@/lib/nivel";
import { RotaDeGraduacao } from "@/components/RotaDeGraduacao";
import { PainelDoJogo, FechamentoDaSemana } from "@/components/PainelDoJogo";
import { estiloDaFaixa } from "@/lib/faixa-cores";
import { useCountUp } from "@/lib/motion";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Início — Ponteira" },
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
  const { ciclo, itens: itensDoCiclo, execucao, ready: cicloPronto } = useCicloAtual();
  const { ativas: metasAtivas } = useMetas();
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

  // O level vem das horas de tatame, não da contagem de aberturas do app.
  const minutosTotais = trainings.reduce((n, t) => n + (t.durationMin || 0), 0);
  const nivel = nivelPorHoras(minutosTotais);

  // O plano do mês: a semana em curso é a primeira que ainda tem item aberto.
  const semanaAtual =
    itensDoCiclo.find((i) => i.feito < (i.alvo || 1))?.semana ??
    itensDoCiclo[0]?.semana ??
    1;
  const focoDaSemana =
    itensDoCiclo.find((i) => i.semana === semanaAtual && i.foco)?.foco ?? "";
  const itensDaSemana = itensDoCiclo.filter((i) => i.semana === semanaAtual);
  const feitosDaSemana = itensDaSemana.filter(
    (i) => i.feito >= (i.alvo || 1),
  ).length;

  const startDate = new Date(start);
  const daysTraining = Math.max(0, daysBetween(startDate, now));

  // A meta em destaque é a graduação com prazo mais próximo; sem ela, a
  // primeira meta ativa qualquer. Nada de faixa azul cravada no código.
  const metaDestaque =
    metasAtivas.find((m) => m.kind === "graduacao" && m.targetDate) ??
    metasAtivas[0] ??
    null;
  const diasRestantesMeta = diasAte(metaDestaque?.targetDate ?? null);
  const metaPct =
    metaDestaque?.kind === "graduacao" && diasRestantesMeta != null
      ? Math.min(
          100,
          Math.round(
            (daysTraining / (daysTraining + Math.max(0, diasRestantesMeta))) * 100,
          ),
        )
      : metaDestaque?.kind === "volume" && metaDestaque.targetNumber
        ? Math.min(
            100,
            Math.round((totalTrainings / metaDestaque.targetNumber) * 100),
          )
        : null;

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
          <Icone.sair className="h-4 w-4" />
        </button>
      }
    >
      {/* Cartão do atleta: quem você é + o level */}
      <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card/80 to-card/80 shadow-[0_0_40px_-12px_var(--primary)]">
        <CardContent className="p-5">
          <Link to="/perfil" className="tap flex items-center gap-4 active:scale-[0.99]">
            <FotoDoAtleta
              url={perfil?.photoUrl}
              nome={perfil?.nickname}
              className="h-16 w-16 rounded-2xl ring-2 ring-primary/40"
              classeDasIniciais="text-lg"
              avatar={perfil?.avatar}
              belt={perfil?.belt}
              degrees={perfil?.degrees}
            />

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
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {[
                  perfil?.gym || null,
                  `${Math.max(0, Math.floor(daysTraining / 30.44))} meses`,
                  perfil?.master ? `Mestre ${perfil.master}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <Icone.avancar className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>

          {/* Nível — horas de tatame, que é como o jiu-jitsu mede de verdade.
              Era "LEVEL", em inglês, num app inteiramente em português e cuja
              própria biblioteca se chama `nivel.ts`. E em versalete espaçado,
              que é o mesmo maneirismo que saiu da faixa de estatísticas. */}
          <div className="mt-4 border-t border-border/50 pt-3">
            <div className="flex items-end justify-between">
              <p className="text-sm font-black text-primary">
                Nível {nivel.level}
              </p>
              <p className="text-sm font-black tabular-nums">
                {hydrated ? horasEmTexto(nivel.horas) : "—"}{" "}
                <span className="text-xs font-semibold text-muted-foreground">
                  no tatame
                </span>
              </p>
            </div>
            <Bar
              value={nivel.progresso}
              className="mt-2 h-1.5"
              label={`Progresso para o nível ${nivel.level + 1}`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {nivel.faltam}h para o nível {nivel.level + 1}
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
                    "text-xs font-bold",
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
        <Icone.adicionar className="h-4 w-4" />
        Registrar treino
      </Link>

      {/**
        * Os três números do mesmo assunto, numa faixa só.
        *
        * Eram três cartões idênticos lado a lado, cada um com rótulo em
        * versalete espaçado, número grande e unidade embaixo — a grade de
        * cartões iguais é o desenho mais previsível que existe, e três
        * molduras para três números que se leem juntos criam separação onde
        * não há diferença. Agora é uma superfície com dois filetes: o olho
        * varre os três de uma vez.
        *
        * Os rótulos saíram do versalete e viraram frase: "em sequência" diz
        * o que "SEQUÊNCIA" só sugeria, e num tamanho que se lê.
        */}
      <Card className="border-border/50 bg-card/60">
        <CardContent className="grid grid-cols-3 divide-x divide-border/60 p-0">
          {[
            {
              valor: hydrated ? streakAnimado : "—",
              unidade: "dias",
              rotulo: "em sequência",
              destaque: true,
            },
            {
              valor: hydrated ? mesAnimado : "—",
              unidade: "treinos",
              rotulo: "neste mês",
            },
            {
              valor: hydrated ? totalAnimado : "—",
              unidade: "dias",
              rotulo: "no total",
            },
          ].map((e) => (
            <div key={e.rotulo} className="px-3 py-3.5 text-center">
              <p
                className={cn(
                  "text-2xl font-black leading-none tabular-nums",
                  e.destaque && "text-primary",
                )}
              >
                {e.valor}
                <span className="ml-1 text-sm font-bold text-muted-foreground">
                  {e.unidade}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{e.rotulo}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* O que a semana deixou aberto. Vem cedo de propósito: é ação
          pendente, e ação pendente enterrada no rodapé não é vista. */}
      <FechamentoDaSemana />

      {/* O hexágono, na versão de leitura — toque leva para Evolução, onde
          estão a tabela e o plano. */}
      <PainelDoJogo compacto />

      {/* Achievements teaser */}
      <Link
        to="/conquistas"
        className="tap block rounded-2xl border border-primary/30 bg-card/70 p-4 hover:border-primary/60 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Icone.conquista className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Rumo ao topo</p>
              <span className="text-xs font-black text-primary">{achPct}%</span>
            </div>
            <Progress value={achPct} className="mt-2 h-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">
              {unlockedAch}/{totalAch} conquistas
            </p>
          </div>
        </div>
      </Link>

      {/* O plano do mês — o de verdade, o mesmo que a tela Plano mostra */}
      {ciclo ? (
        <Card className="border-border/50 bg-card/70">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Semana {semanaAtual} · {ciclo.titulo}
                </p>
                <p className="mt-1 truncate font-bold">
                  {focoDaSemana || "Plano do mês em andamento"}
                </p>
              </div>
              <Link
                to="/plano"
                className="shrink-0 text-xs font-bold text-primary underline-offset-4 hover:underline"
              >
                Ver plano
              </Link>
            </div>
            <Progress value={execucao} className="mt-3 h-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">
              {feitosDaSemana}/{itensDaSemana.length} desta semana · {execucao}% do mês
            </p>
          </CardContent>
        </Card>
      ) : (
        cicloPronto && (
          <Link
            to="/plano"
            className="tap block rounded-2xl border border-dashed border-primary/40 bg-transparent p-4 active:scale-[0.99]"
          >
            <p className="text-sm font-bold text-primary">Montar o plano do mês</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Escolha o que quer melhorar e o app monta as quatro semanas.
            </p>
          </Link>
        )
      )}

      {/* A meta que a pessoa escolheu — não uma cravada no código. Quando é de
          graduação, o cartão veste a cor da faixa-alvo. */}
      {metaDestaque ? (
        <Card
          style={
            metaDestaque.kind === "graduacao" && metaDestaque.targetBelt
              ? estiloDaFaixa(metaDestaque.targetBelt)
              : undefined
          }
          className="border-border/50 bg-card/70"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Icone.meta className="h-4 w-4 shrink-0 text-primary" />
                <p className="truncate font-bold">{metaDestaque.title}</p>
              </div>
              {metaPct != null && (
                <span className="shrink-0 text-xs font-black text-primary">
                  {metaPct}%
                </span>
              )}
            </div>
            {metaDestaque.kind === "graduacao" &&
              metaDestaque.targetBelt &&
              perfil && (
                <RotaDeGraduacao
                  className="mt-3"
                  compacta
                  comTitulo={false}
                  de={{ belt: perfil.belt, degrees: perfil.degrees }}
                  para={{
                    belt: metaDestaque.targetBelt,
                    degrees: metaDestaque.targetDegrees ?? 0,
                  }}
                />
              )}
            {metaPct != null && <Progress className="mt-3 h-1.5" value={metaPct} />}
            <p className="mt-1 text-xs text-muted-foreground">
              {diasRestantesMeta != null
                ? diasRestantesMeta >= 0
                  ? `${daysTraining} dias no tatame · faltam ${diasRestantesMeta}`
                  : `${daysTraining} dias no tatame · o prazo passou`
                : `${daysTraining} dias no tatame`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Link
          to="/metas"
          className="tap block rounded-2xl border border-dashed border-primary/40 bg-transparent p-4 active:scale-[0.99]"
        >
          <p className="text-sm font-bold text-primary">Definir uma meta</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Faixa azul, pódio num campeonato, um número de treinos no ano.
          </p>
        </Link>
      )}

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
              <Icone.treino className="mx-auto mb-2 h-5 w-5 text-primary" />
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
                  {t.rolls} {t.rolls === 1 ? "rola" : "rolas"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
