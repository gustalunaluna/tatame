import { createFileRoute } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confirmar } from "@/components/Confirmar";
import { LinhaDeMedalha, PlacarDeMedalhas } from "@/components/Medalha";
import { CadastrarMedalha } from "@/components/CadastrarMedalha";
import { useMeuHandle } from "@/lib/social-storage";
import {
  useMinhasMedalhas,
  useResumoMedalhasDoAtleta,
} from "@/lib/medalhas-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/minhas-medalhas")({
  head: () => ({
    meta: [
      { title: "Minhas medalhas — Ponteira" },
      {
        name: "description",
        content: "Campeonatos, colocações e as três que aparecem no seu perfil.",
      },
    ],
  }),
  component: MinhasMedalhasPage,
});

function MinhasMedalhasPage() {
  const { handle } = useMeuHandle();
  const { resumo } = useResumoMedalhasDoAtleta(handle);
  const {
    medalhas,
    ready,
    temMais,
    carregarMais,
    emDestaque,
    criar,
    apagar,
    destacar,
  } = useMinhasMedalhas(handle);

  return (
    <PageShell
      title="Minhas medalhas"
      subtitle="Toque na estrela para escolher as três do perfil."
      action={
        <CadastrarMedalha
          aoSalvar={criar}
          gatilho={
            <Button size="sm" className="gap-1">
              <Icone.adicionar className="h-4 w-4" /> Nova
            </Button>
          }
        />
      }
    >
      {resumo.total > 0 && (
        <>
          <PlacarDeMedalhas
            ouro={resumo.ouro}
            prata={resumo.prata}
            bronze={resumo.bronze}
          />
          <p className="text-center text-xs text-muted-foreground">
            {emDestaque} de 3 em destaque no perfil
          </p>
        </>
      )}

      {ready && medalhas.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.medalha className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhuma medalha ainda. Quando subir no pódio, registre aqui — e
            escolha a academia que você estava representando.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {medalhas.map((m, i) => (
          <LinhaDeMedalha
            key={m.id}
            m={m}
            i={i}
            acao={
              <div className="flex flex-col gap-1">
                <button
                  onClick={async () => {
                    if (!m.destaque && emDestaque >= 3) {
                      toast.error(
                        "Já são três em destaque. Tire uma antes de pôr outra.",
                      );
                      return;
                    }
                    await destacar(m.id, !m.destaque);
                  }}
                  aria-pressed={m.destaque}
                  aria-label={
                    m.destaque
                      ? `Tirar ${m.evento} do destaque do perfil`
                      : `Pôr ${m.evento} em destaque no perfil`
                  }
                  className={cn(
                    "tap rounded-lg p-2 active:scale-90",
                    m.destaque
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icone.destaque
                    className={cn("h-4 w-4", m.destaque && "fill-current")}
                  />
                </button>

                <Confirmar
                  gatilho={
                    <button
                      aria-label={`Apagar a medalha de ${m.evento}`}
                      className="tap rounded-lg p-2 text-muted-foreground hover:text-destructive active:scale-90"
                    >
                      <Icone.apagar className="h-4 w-4" />
                    </button>
                  }
                  titulo="Apagar esta medalha?"
                  descricao={`"${m.evento}" sai do seu perfil e do perfil da academia. Não dá para desfazer.`}
                  aoConfirmar={() => void apagar(m.id)}
                />
              </div>
            }
          />
        ))}
      </div>

      {temMais && (
        <button
          onClick={carregarMais}
          className="tap w-full rounded-2xl border border-primary/40 bg-primary/5 py-3 text-sm font-bold text-primary active:scale-[0.99]"
        >
          Carregar mais
        </button>
      )}
    </PageShell>
  );
}
