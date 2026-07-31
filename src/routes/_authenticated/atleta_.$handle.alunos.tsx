import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinhaDeAtleta } from "@/components/ListaDeAtletas";
import {
  usePerfilPublico,
  useAlunosDoMestre,
  useResumoDeMestre,
} from "@/lib/social-storage";

export const Route = createFileRoute("/_authenticated/atleta_/$handle/alunos")({
  component: AlunosDoMestrePage,
});

function AlunosDoMestrePage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { perfil } = usePerfilPublico(handle);
  const { alunos, eMestre, ready } = useResumoDeMestre(handle);
  const { itens, temMais, carregarMais, carregando } = useAlunosDoMestre(handle);

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
          <Icone.graduacao className="h-6 w-6 text-primary" />
          Alunos
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {perfil?.nickname ? `${perfil.nickname} · ` : ""}
          {alunos} {alunos === 1 ? "aluno" : "alunos"}
          {itens[0]?.teamNome ? ` · ${itens[0].teamNome}` : ""}
        </p>
      </div>

      {itens.map((a, i) => (
        <LinhaDeAtleta key={a.userId} a={a} i={i} />
      ))}

      {ready && !eMestre && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Esta pessoa não comanda nenhuma academia — por isso não tem alunos
            aqui. Alunos aparecem para quem é responsável ou mestre de uma
            equipe aprovada.
          </CardContent>
        </Card>
      )}

      {ready && eMestre && itens.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum aluno com perfil público na academia ainda.
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
