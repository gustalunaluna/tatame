import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinhaDeAtleta } from "@/components/ListaDeAtletas";
import { usePerfilEquipe, useListaDeAtletas } from "@/lib/social-storage";

export const Route = createFileRoute("/_authenticated/academia_/$slug/atletas")({
  component: AtletasDaAcademiaPage,
});

function AtletasDaAcademiaPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { equipe } = usePerfilEquipe(slug);
  const { itens, temMais, carregarMais, carregando } = useListaDeAtletas(
    equipe?.id,
  );

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4">
      <button
        onClick={() => navigate({ to: "/academia/$slug", params: { slug } })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <Icone.voltar className="h-4 w-4" /> Voltar à academia
      </button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Icone.parceiro className="h-6 w-6 text-primary" />
          No tatame
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {equipe ? `${equipe.name} · ${equipe.alunos} alunos` : "—"}
        </p>
      </div>

      {itens.map((a, i) => (
        <LinhaDeAtleta key={a.userId} a={a} i={i} />
      ))}

      {!itens.length && equipe && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Ninguém com perfil público nesta academia ainda.
          </CardContent>
        </Card>
      )}

      {temMais && (
        <Button variant="outline" onClick={carregarMais} disabled={carregando}>
          {carregando ? "Carregando…" : "Ver mais"}
        </Button>
      )}
    </div>
  );
}
