import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Icone } from "@/design/icones";
import { Card, CardContent } from "@/components/ui/card";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { PlacarDeMedalhas } from "@/components/Medalha";
import { SeloDaPessoa, SeloVerificado } from "@/components/SeloVerificado";
import { usePerfilEquipe } from "@/lib/social-storage";
import { useResumoMedalhasDaEquipe } from "@/lib/medalhas-storage";
import { cn } from "@/lib/utils";
import { FotoDoAtleta } from "@/components/FotoDoAtleta";

export const Route = createFileRoute("/_authenticated/academia/$slug")({
  component: AcademiaPage,
});

function Numero({
  valor,
  rotulo,
  destaque,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3 text-center">
      <p
        className={cn(
          "text-2xl font-black tabular-nums",
          destaque && "text-primary",
        )}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
        {rotulo}
      </p>
    </div>
  );
}

function Atleta({
  a,
  i,
  papel,
}: {
  a: {
    userId: string;
    handle: string;
    nickname: string;
    belt: string;
    degrees: number;
    photoUrl: string;
    verificado?: boolean;
  };
  i: number;
  papel?: string;
}) {
  return (
    <Link
      to="/atleta/$handle"
      params={{ handle: a.handle }}
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className="rise-in list-perf tap flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3 active:scale-[0.99]"
    >
      <FotoDoAtleta
        url={a.photoUrl}
        nome={a.nickname}
        className="h-11 w-11 rounded-xl border border-border/60"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-bold">
          <span className="truncate">{a.nickname}</span>
          <SeloDaPessoa
            verificado={a.verificado}
            equipeOficial
            className="h-3.5 w-3.5"
          />
        </p>
        <p className="truncate text-xs text-muted-foreground">
          @{a.handle}
          {papel && papel !== "membro" && (
            <span className="text-primary">
              {" · "}
              {papel === "dono" ? "responsável" : "mestre"}
            </span>
          )}
        </p>
        <FaixaVisual
          belt={a.belt as never}
          degrees={a.degrees}
          compacta
          comTexto={false}
          className="mt-1.5"
        />
      </div>
    </Link>
  );
}

function AcademiaPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { equipe, graduados, atletas, naoExiste, ready } = usePerfilEquipe(slug);
  const { resumo: medalhas } = useResumoMedalhasDaEquipe(slug);

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5">
      <button
        onClick={() => navigate({ to: "/perfil" })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <Icone.voltar className="h-4 w-4" /> Voltar
      </button>

      {ready && naoExiste && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Academia não encontrada, ou o cadastro dela ainda não foi aprovado.
          </CardContent>
        </Card>
      )}

      {equipe && (
        <>
          {/* ===== Cabeçalho institucional: brasão centrado, não foto à esquerda ===== */}
          <Card className="border-primary/40 bg-gradient-to-b from-primary/15 via-card/80 to-card/80">
            <CardContent className="p-6 text-center">
              {equipe.crestUrl ? (
                <img
                  src={equipe.crestUrl}
                  alt={`Brasão da ${equipe.name}`}
                  className="mx-auto h-24 w-24 rounded-2xl border border-border/60 bg-black/20 object-contain"
                />
              ) : (
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-2xl bg-secondary">
                  <Icone.equipe className="h-10 w-10 text-muted-foreground" />
                </div>
              )}

              <h1 className="mt-4 flex items-center justify-center gap-2 text-2xl font-black leading-tight">
                <span>{equipe.name}</span>
                <SeloVerificado tipo="equipe" className="h-5 w-5" />
              </h1>

              {equipe.city && (
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Icone.local className="h-3.5 w-3.5" /> {equipe.city}
                </p>
              )}

              {equipe.master && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Mestre responsável:{" "}
                  <span className="font-bold text-foreground">
                    {equipe.master}
                  </span>
                </p>
              )}

              {equipe.souMembro && (
                <p className="mt-3 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                  Você treina aqui
                </p>
              )}
            </CardContent>
          </Card>

          {/* ===== O quadro de medalhas ===== */}
          {/* Aqui não se escolhem três, como no perfil de uma pessoa: numa
              academia com dezenas de alunos a pergunta é quanto ela ganha, e a
              resposta é o total por colocação. */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <Icone.medalha className="h-4 w-4 text-primary" />
              Quadro de medalhas
            </h2>
            <PlacarDeMedalhas
              ouro={medalhas.ouro}
              prata={medalhas.prata}
              bronze={medalhas.bronze}
            />
            {medalhas.total > 0 ? (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {medalhas.total}{" "}
                  {medalhas.total === 1 ? "medalha" : "medalhas"} de{" "}
                  {medalhas.atletas}{" "}
                  {medalhas.atletas === 1 ? "atleta" : "atletas"} em{" "}
                  {medalhas.eventos}{" "}
                  {medalhas.eventos === 1 ? "campeonato" : "campeonatos"}.
                </p>
                <Link
                  to="/academia/$slug/medalhas"
                  params={{ slug: equipe.slug }}
                  className="tap mt-2 block rounded-2xl border border-primary/40 bg-primary/5 py-3 text-center text-sm font-bold text-primary active:scale-[0.99]"
                >
                  Ver todos os pódios e quem ganhou
                </Link>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Nenhuma medalha ainda. Elas aparecem aqui quando um atleta
                registra o pódio e aponta esta academia.
              </p>
            )}
          </section>

          {/* ===== Os números da academia ===== */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              A academia em números
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <Numero valor={equipe.alunos} rotulo="alunos" destaque />
              <Numero valor={equipe.faixasPretas} rotulo="faixas pretas" />
              <Numero valor={equipe.competidores} rotulo="competidores" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Competidor é quem tem medalha registrada aqui. O app não confirma
              resultado de competição — quem responde por cada medalha é o
              atleta cujo nome está nela.
            </p>
          </section>

          {/* ===== Faixas pretas e mestres ===== */}
          {graduados.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <Icone.conquista className="h-4 w-4 text-primary" />
                Mestres e faixas pretas ({graduados.length})
              </h2>
              {graduados.map((g, i) => (
                <Atleta key={g.userId} a={g} i={i} papel={g.role} />
              ))}
            </section>
          )}

          {/* ===== O elenco ===== */}
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <Icone.parceiro className="h-4 w-4 text-primary" />
              No tatame ({equipe.alunos})
            </h2>
            {atletas.length === 0 && ready && (
              <p className="text-sm text-muted-foreground">
                Ninguém com perfil público nesta academia ainda.
              </p>
            )}
            {atletas.map((a, i) => (
              <Atleta key={a.userId} a={a} i={i} />
            ))}
            {equipe.alunos > atletas.length && (
              <Link
                to="/academia/$slug/atletas"
                params={{ slug: equipe.slug }}
                className="tap block rounded-2xl border border-primary/40 bg-primary/5 py-3 text-center text-sm font-bold text-primary active:scale-[0.99]"
              >
                Ver todos os {equipe.alunos} atletas
              </Link>
            )}
          </section>
        </>
      )}
    </div>
  );
}
