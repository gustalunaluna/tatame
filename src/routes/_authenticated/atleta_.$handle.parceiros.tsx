import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinhaDeAtleta } from "@/components/ListaDeAtletas";
import { usePerfilPublico, useListaDeParceiros } from "@/lib/social-storage";

export const Route = createFileRoute("/_authenticated/atleta_/$handle/parceiros")({
  component: ParceirosDoAtletaPage,
});

function ParceirosDoAtletaPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { perfil } = usePerfilPublico(handle);
  const { itens, temMais, carregarMais, carregando } = useListaDeParceiros(
    perfil?.userId,
  );

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4">
      <button
        onClick={() => navigate({ to: "/atleta/$handle", params: { handle } })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <Icone.voltar className="h-4 w-4" /> Voltar ao perfil
      </button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Icone.parceiro className="h-6 w-6 text-primary" />
          Parceiros de rola
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {perfil ? `${perfil.nickname} · ${perfil.parceiros}` : "—"}
        </p>
      </div>

      {itens.map((a, i) => (
        <LinhaDeAtleta key={a.userId} a={a} i={i} />
      ))}

      {!itens.length && perfil && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum parceiro com perfil público.
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
