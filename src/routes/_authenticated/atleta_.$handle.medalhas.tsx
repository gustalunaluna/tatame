import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinhaDeMedalha, PlacarDeMedalhas } from "@/components/Medalha";
import { usePerfilPublico } from "@/lib/social-storage";
import {
  useMedalhasDoAtleta,
  useResumoMedalhasDoAtleta,
} from "@/lib/medalhas-storage";

export const Route = createFileRoute("/_authenticated/atleta_/$handle/medalhas")({
  component: MedalhasDoAtletaPage,
});

function MedalhasDoAtletaPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { perfil } = usePerfilPublico(handle);
  const { resumo } = useResumoMedalhasDoAtleta(handle);
  const { medalhas, ready, temMais, carregarMais } = useMedalhasDoAtleta(handle);

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4">
      <button
        onClick={() => navigate({ to: "/atleta/$handle", params: { handle } })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
      </button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Medal className="h-6 w-6 text-primary" />
          Medalhas
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {perfil?.nickname ? `${perfil.nickname} · ` : ""}
          {resumo.total} no total
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
          <LinhaDeMedalha key={m.id} m={m} i={i} />
        ))}
      </div>

      {ready && medalhas.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma medalha registrada por esta pessoa.
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
