import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, EyeOff, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confirmar } from "@/components/Confirmar";
import { LinhaDeMedalha, PlacarDeMedalhas } from "@/components/Medalha";
import { usePerfilEquipe } from "@/lib/social-storage";
import {
  useMedalhasDaEquipe,
  useResumoMedalhasDaEquipe,
} from "@/lib/medalhas-storage";

export const Route = createFileRoute("/_authenticated/academia_/$slug/medalhas")({
  component: MedalhasDaAcademiaPage,
});

function MedalhasDaAcademiaPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { equipe } = usePerfilEquipe(slug);
  const { resumo } = useResumoMedalhasDaEquipe(slug);
  const { medalhas, ready, temMais, carregarMais, ocultar } =
    useMedalhasDaEquipe(slug);

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4">
      <button
        onClick={() => navigate({ to: "/academia/$slug", params: { slug } })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à academia
      </button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Medal className="h-6 w-6 text-primary" />
          Pódios
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {equipe?.name ? `${equipe.name} · ` : ""}
          {resumo.total} {resumo.total === 1 ? "medalha" : "medalhas"} de{" "}
          {resumo.atletas} {resumo.atletas === 1 ? "atleta" : "atletas"} em{" "}
          {resumo.eventos} {resumo.eventos === 1 ? "campeonato" : "campeonatos"}
        </p>
      </div>

      {resumo.total > 0 && (
        <PlacarDeMedalhas
          ouro={resumo.ouro}
          prata={resumo.prata}
          bronze={resumo.bronze}
        />
      )}

      <div className="space-y-2">
        {medalhas.map((m, i) => (
          <LinhaDeMedalha
            key={m.id}
            m={m}
            i={i}
            acao={
              // Só o responsável e os mestres veem este botão. Ele não apaga a
              // medalha — tira do perfil da academia, e o atleta continua com
              // ela no dele. É o freio contra alguém pendurar medalha
              // inventada no nome de uma academia.
              m.possoOcultar ? (
                <Confirmar
                  gatilho={
                    <button
                      aria-label={`Tirar a medalha de ${m.atletaNome} do perfil da academia`}
                      className="tap rounded-lg p-2 text-muted-foreground hover:text-destructive active:scale-90"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  }
                  titulo="Tirar do perfil da academia?"
                  descricao={`A medalha de ${m.atletaNome} em "${m.evento}" deixa de contar aqui. Ela continua no perfil dele.`}
                  aoConfirmar={() => void ocultar(m.id)}
                />
              ) : undefined
            }
          />
        ))}
      </div>

      {ready && medalhas.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma medalha registrada por atletas desta academia ainda. Quem
            competir e apontar a academia no cadastro aparece aqui.
          </CardContent>
        </Card>
      )}

      {temMais && (
        <Button variant="outline" onClick={carregarMais}>
          Ver mais
        </Button>
      )}
    </div>
  );
}
