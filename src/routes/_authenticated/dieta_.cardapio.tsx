import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confirmar } from "@/components/Confirmar";
import { RegistrarRefeicao } from "@/components/RegistrarRefeicao";
import { MOMENTOS, type ItemDoCardapio, type NovaRefeicao } from "@/lib/dieta";
import { useCardapio, useContaDaDieta } from "@/lib/dieta-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta_/cardapio")({
  head: () => ({
    meta: [
      { title: "Cardápio — Ponteira" },
      {
        name: "description",
        content:
          "O plano de refeições: escreve uma vez, e todo dia é só confirmar o que comeu.",
      },
    ],
  }),
  component: CardapioPage,
});

const hoje = () => new Date().toISOString().slice(0, 10);
const g = (n: number) => `${Math.round(n)} g`;

function CardapioPage() {
  const { cardapio, ready, total, criar, apagar } = useCardapio();
  const conta = useContaDaDieta(hoje());
  const [momentoAberto, setMomentoAberto] = useState<string | null>(null);

  /**
   * O diálogo de refeição é reaproveitado para escrever o cardápio, e não uma
   * segunda tela de cadastro. É o mesmo trabalho — escolher um alimento, dizer
   * a porção, conferir os macros — e ter duas telas para o mesmo trabalho é
   * como as duas ficam diferentes com o tempo.
   *
   * `data` e `itemDoCardapioId` são ignorados aqui: o que vira item do
   * cardápio é o resto.
   */
  const adicionar = (momento: string) => async (r: NovaRefeicao) => {
    const irmaos = cardapio.filter((i) => i.momento === momento).length;
    return criar({
      momento,
      alimento: r.alimento,
      porcao: r.porcao,
      kcal: r.kcal,
      proteinaG: r.proteinaG,
      carboidratoG: r.carboidratoG,
      gorduraG: r.gorduraG,
      ordem: irmaos,
    });
  };

  const metaKcal = conta.meta?.kcal ?? null;
  const diferenca = metaKcal !== null ? total.kcal - metaKcal : null;

  return (
    <PageShell
      title="Cardápio"
      subtitle="Escreve uma vez. Depois é só confirmar."
    >
      {ready && cardapio.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.listaDeTecnicas className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhum cardápio ainda. Monte o dia padrão aqui — o que você come numa
            terça normal — e na tela de hoje vai bastar marcar o que comeu, ou
            trocar o que mudou.
          </CardContent>
        </Card>
      )}

      {cardapio.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              O dia inteiro, se sair como planejado
            </p>
            <p className="mt-1 font-mono text-3xl font-black tabular-nums text-primary">
              {total.kcal}
              <span className="ml-1 text-sm font-bold text-muted-foreground">
                kcal
              </span>
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              P {g(total.proteinaG)} · C {g(total.carboidratoG)} · G{" "}
              {g(total.gorduraG)}
            </p>

            {diferenca !== null && (
              <p
                className={cn(
                  "mt-3 rounded-lg p-2.5 text-xs leading-relaxed",
                  Math.abs(diferenca) <= 150
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground",
                )}
              >
                {Math.abs(diferenca) <= 150 ? (
                  <>
                    Bate com a meta de hoje ({metaKcal} kcal). Um cardápio dentro
                    da meta é o que faz o resto virar rotina em vez de conta.
                  </>
                ) : (
                  <>
                    A meta de hoje é {metaKcal} kcal — o cardápio está{" "}
                    {diferenca > 0 ? "acima" : "abaixo"} dela em{" "}
                    {Math.abs(diferenca)}.{" "}
                    {diferenca > 0
                      ? "Cardápio acima da meta todo dia vira ganho de peso, mesmo seguido à risca."
                      : "Em dia de treino a meta sobe: um cardápio abaixo dela cobra na recuperação, não na balança."}
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {MOMENTOS.map((momento) => {
        const itens = cardapio.filter((i) => i.momento === momento);
        const kcal = itens.reduce((n, i) => n + i.kcal, 0);
        const aberto = momentoAberto === momento || itens.length > 0;

        return (
          <section key={momento}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">{momento}</h2>
              {itens.length > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {kcal} kcal
                </span>
              )}
            </div>

            <div className="mt-1.5 space-y-1.5">
              {itens.map((i) => (
                <LinhaDoItem key={i.id} item={i} aoApagar={() => void apagar(i.id)} />
              ))}

              <RegistrarRefeicao
                data={hoje()}
                momentoSugerido={momento}
                aoSalvar={adicionar(momento)}
                gatilho={
                  <button
                    onClick={() => setMomentoAberto(momento)}
                    className={cn(
                      "tap flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-3 text-xs font-bold text-muted-foreground active:scale-[0.99]",
                      aberto ? "py-2.5" : "py-2",
                    )}
                  >
                    <Icone.adicionar className="h-3.5 w-3.5" />
                    Adicionar em {momento.toLowerCase()}
                  </button>
                }
              />
            </div>
          </section>
        );
      })}

      <p className="text-xs leading-relaxed text-muted-foreground">
        <Icone.alerta className="mr-1 inline h-3 w-3" />
        O cardápio é um plano, não um contrato. Ele existe para tirar a decisão
        do dia a dia, não para você se sentir devendo quando a vida não colaborar
        — na tela de hoje, trocar um item custa o mesmo toque que confirmá-lo.
      </p>
    </PageShell>
  );
}

function LinhaDoItem({
  item,
  aoApagar,
}: {
  item: ItemDoCardapio;
  aoApagar: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.alimento}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[item.porcao, `P ${g(item.proteinaG)}`, `C ${g(item.carboidratoG)}`, `G ${g(item.gorduraG)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="shrink-0 text-sm font-black tabular-nums text-primary">
          {item.kcal}
        </span>
        <Confirmar
          gatilho={
            <button
              aria-label={`Tirar ${item.alimento} do cardápio`}
              className="tap shrink-0 rounded-lg p-2 text-muted-foreground hover:text-destructive active:scale-90"
            >
              <Icone.apagar className="h-4 w-4" />
            </button>
          }
          titulo="Tirar do cardápio?"
          descricao="O plano muda daqui para a frente. Os dias que você já registrou continuam como estão."
          aoConfirmar={() => {
            aoApagar();
            toast.success("Fora do cardápio.");
          }}
        />
      </CardContent>
    </Card>
  );
}
