import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Faixa } from "@/components/Faixa";
import { Card, CardContent } from "@/components/ui/card";
import { Bar } from "@/components/ui/bar";
import { FotoDoAtleta } from "@/components/FotoDoAtleta";
import { supabase } from "@/integrations/supabase/client";
import { useEnsureSeeded, usePerfil, useTrainings } from "@/lib/bjj-storage";
import { useContaDaDieta } from "@/lib/dieta-storage";
import { sequenciaDeDias } from "@/lib/sequencia";
import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Início — Ponteira" },
      {
        name: "description",
        content: "O dia inteiro numa tela: o treino e a comida.",
      },
    ],
  }),
  component: Inicio,
});

const hoje = () => new Date().toISOString().slice(0, 10);

/**
 * O Início, depois que o app virou dois.
 *
 * Esta tela era o painel do jiu-jitsu inteiro — hexágono, meta, plano do mês,
 * últimos treinos. Ela continua existindo, em /jiu-jitsu, e não perdeu nada.
 *
 * O que mudou é que "início" deixou de poder significar "tatame". Com uma
 * segunda área no app, uma tela de abertura que só fala de uma delas empurra a
 * outra para o segundo plano todo dia — e a que fica em segundo plano é a que
 * se abandona. Então o Início virou o que o nome diz: as DUAS áreas, no estado
 * de hoje, e nada além disso.
 *
 * Nada aqui é dado novo: sequência e treino saem do Diário, o saldo sai da
 * Dieta. Esta tela não calcula nada por conta própria — ela só junta.
 */
function Inicio() {
  useEnsureSeeded();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { perfil } = usePerfil();
  const { items: treinos } = useTrainings();
  const dia = hoje();
  const conta = useContaDaDieta(dia);

  const sequencia = sequenciaDeDias(
    treinos.map((t) => t.date),
    dia,
  );
  const sequenciaAnimada = useCountUp(sequencia, 600);
  const treinosDeHoje = treinos.filter((t) => t.date === dia);
  const minutosHoje = treinosDeHoje.reduce((n, t) => n + t.durationMin, 0);
  const rolasHoje = treinosDeHoje.reduce((n, t) => n + t.rolls, 0);

  async function sair() {
    await supabase.auth.signOut();
    // Limpa na hora, sem esperar o ouvinte de sessão: ninguém deve ver um
    // frame sequer com os dados da conta que acabou de sair.
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

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
          onClick={sair}
          aria-label="Sair"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition hover:text-foreground"
        >
          <Icone.sair className="h-4 w-4" />
        </button>
      }
    >
      {/* ---- quem é, e há quantos dias não para ---- */}
      <Card className="overflow-hidden">
        <CardContent className="flex items-center gap-4 p-4">
          <FotoDoAtleta
            url={perfil?.photoUrl}
            nome={perfil?.nickname}
            className="h-14 w-14 shrink-0 rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black">
              {perfil?.nickname || "Atleta"}
            </p>
            {perfil && (
              <Faixa
                className="mt-1"
                belt={perfil.belt}
                degrees={perfil.degrees}
              />
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-black tabular-nums text-primary">
              {sequenciaAnimada}
            </p>
            <p className="text-xs text-muted-foreground">
              <Icone.sequencia className="mr-0.5 inline h-3 w-3 text-primary" />
              {sequencia === 1 ? "dia" : "dias"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---- o dia, dos dois lados ---- */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Hoje
        </h2>

        <div className="space-y-2">
          {/* tatame */}
          {treinosDeHoje.length > 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <Icone.treino className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {treinosDeHoje.length === 1
                      ? "Treino registrado"
                      : `${treinosDeHoje.length} treinos registrados`}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {minutosHoje} min · {rolasHoje}{" "}
                    {rolasHoje === 1 ? "rola" : "rolas"}
                  </p>
                </div>
                <Link
                  to="/diario"
                  className="tap shrink-0 text-xs font-bold text-primary"
                >
                  Ver
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Link
              to="/diario"
              className="tap flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/15 active:scale-[0.98]"
            >
              <Icone.adicionar className="h-4 w-4" />
              Registrar treino
            </Link>
          )}

          {/* comida */}
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <Icone.dieta className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                {conta.pronta && conta.meta ? (
                  <>
                    <p className="text-sm font-bold">
                      <span
                        className={cn(
                          "tabular-nums",
                          conta.saldo < 0 ? "text-destructive" : "text-primary",
                        )}
                      >
                        {Math.abs(conta.saldo)} kcal
                      </span>{" "}
                      {conta.saldo < 0 ? "acima da meta" : "ainda cabem"}
                    </p>
                    <Bar
                      className="mt-1.5"
                      value={
                        conta.meta.kcal > 0
                          ? (conta.consumido.kcal / conta.meta.kcal) * 100
                          : 0
                      }
                      fillClassName={
                        conta.saldo < 0 ? "bg-destructive" : undefined
                      }
                      label={`${conta.consumido.kcal} de ${conta.meta.kcal} kcal`}
                    />
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold">Dieta</p>
                    <p className="text-xs text-muted-foreground">
                      {conta.pendencias.includes("peso")
                        ? "Falta uma pesagem para a conta fechar."
                        : "Nada anotado ainda hoje."}
                    </p>
                  </>
                )}
              </div>
              <Link
                to="/dieta"
                className="tap shrink-0 text-xs font-bold text-primary"
              >
                Abrir
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---- as duas portas ---- */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          As duas áreas
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Porta
            para="/jiu-jitsu"
            icone={<Icone.rola className="h-5 w-5 text-primary" />}
            nome="Jiu-jitsu"
            detalhe={`${treinos.length} ${treinos.length === 1 ? "treino" : "treinos"}`}
          />
          <Porta
            para="/dieta"
            icone={<Icone.dieta className="h-5 w-5 text-primary" />}
            nome="Dieta"
            detalhe={
              conta.pesoKg !== null
                ? `${String(conta.pesoKg).replace(".", ",")} kg`
                : "sem pesagem"
            }
          />
        </div>
      </section>
    </PageShell>
  );
}

function Porta({
  para,
  icone,
  nome,
  detalhe,
}: {
  para: "/jiu-jitsu" | "/dieta";
  icone: React.ReactNode;
  nome: string;
  detalhe: string;
}) {
  return (
    <Link
      to={para}
      className="tap flex flex-col gap-1 rounded-xl border border-border/60 p-3 active:scale-[0.98]"
    >
      {icone}
      <span className="text-sm font-bold">{nome}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{detalhe}</span>
    </Link>
  );
}
