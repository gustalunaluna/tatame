import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icone } from "@/design/icones";
import { Card, CardContent } from "@/components/ui/card";
import { RegistrarRefeicao } from "@/components/RegistrarRefeicao";
import {
  cardapioPorMomento,
  type ItemNoDia,
  type NovaRefeicao,
} from "@/lib/dieta";
import { cn } from "@/lib/utils";

/**
 * O cardápio do dia — a tela que faz o app ser usado às sete da manhã.
 *
 * A diferença entre isto e a lista de refeições que já existia é o número de
 * decisões. Registrar do zero pede seis: qual momento, qual alimento, qual
 * porção, quantas calorias, quanta proteína, salvar. Confirmar pede UMA, e é
 * a mesma toda manhã.
 *
 * Cada item tem três destinos, e nenhum deles é "não comi e agora me sinto
 * mal":
 *
 *   ✓ Comi      — nasce uma refeição igual ao plano
 *   ↔ Troquei   — nasce uma refeição diferente, ligada ao mesmo item
 *   (nada)      — o item fica aberto, e aberto não é dívida
 *
 * "Troquei" tem o mesmo peso visual que "comi" de propósito. Um app que trata
 * a troca como exceção ensina a pessoa a mentir no primeiro dia em que o
 * restaurante fechou.
 */
export function CardapioDoDia({
  data,
  itens,
  aoRegistrar,
  aoApagar,
}: {
  data: string;
  itens: ItemNoDia[];
  aoRegistrar: (r: NovaRefeicao) => Promise<boolean>;
  aoApagar: (id: string) => void;
}) {
  if (itens.length === 0) return null;

  const resolvidos = itens.filter((i) => i.situacao !== "aberto").length;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Cardápio de hoje
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {resolvidos}/{itens.length}
        </span>
      </div>

      <div className="space-y-3">
        {cardapioPorMomento(itens).map(([momento, doMomento]) => (
          <div key={momento}>
            <h3 className="pb-1 text-xs font-bold text-muted-foreground">
              {momento}
            </h3>
            <div className="space-y-1.5">
              {doMomento.map((i) => (
                <Linha
                  key={i.item.id}
                  data={data}
                  noDia={i}
                  aoRegistrar={aoRegistrar}
                  aoApagar={aoApagar}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Linha({
  data,
  noDia,
  aoRegistrar,
  aoApagar,
}: {
  data: string;
  noDia: ItemNoDia;
  aoRegistrar: (r: NovaRefeicao) => Promise<boolean>;
  aoApagar: (id: string) => void;
}) {
  const { item, situacao, registro } = noDia;
  const feito = situacao !== "aberto";

  async function confirmar() {
    const salvou = await aoRegistrar({
      data,
      momento: item.momento,
      alimento: item.alimento,
      porcao: item.porcao,
      kcal: item.kcal,
      proteinaG: item.proteinaG,
      carboidratoG: item.carboidratoG,
      gorduraG: item.gorduraG,
      itemDoCardapioId: item.id,
    });
    if (salvou) toast.success("Anotado.");
  }

  return (
    <Card className={cn(feito && "border-primary/30 bg-primary/5")}>
      <CardContent className="flex items-center gap-3 p-3">
        {/* O check é o alvo principal do dedo: 44px, que é o mínimo que a
            Apple e o Google pedem para um toque confortável. */}
        <button
          onClick={feito ? () => registro && aoApagar(registro.id) : confirmar}
          aria-pressed={feito}
          aria-label={
            feito
              ? `Desmarcar ${item.alimento}`
              : `Marcar que comeu ${item.alimento}`
          }
          className={cn(
            "tap grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 active:scale-90",
            feito
              ? "border-primary bg-primary/15 text-primary"
              : "border-border/60 text-muted-foreground",
          )}
        >
          {feito ? (
            <Icone.confirmar className="h-5 w-5" />
          ) : (
            <span aria-hidden className="h-5 w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {/* Duas linhas, e não `truncate`.
              "Arroz, feijão, patinho e salada" virava "Arroz, feijão, pati…"
              ao lado do botão — e o nome do item É a informação da linha. */}
          <p
            className={cn(
              "line-clamp-2 text-sm font-semibold leading-tight",
              situacao === "trocado" && "text-muted-foreground line-through",
            )}
          >
            {item.alimento}
          </p>

          {situacao === "trocado" && registro ? (
            <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-tight text-primary">
              <Icone.editar className="mr-1 inline h-3 w-3" />
              {registro.alimento} · {registro.kcal} kcal
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
              {[item.porcao, `${item.kcal} kcal`].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {!feito && (
          <RegistrarRefeicao
            data={data}
            substituindo={{
              id: item.id,
              momento: item.momento,
              alimento: item.alimento,
            }}
            aoSalvar={aoRegistrar}
            gatilho={
              // Só o ícone, com rótulo para leitor de tela. A palavra "Troquei"
              // custava metade da largura do nome do prato, e o lápis já diz o
              // que faz — a linha inteira é sobre aquele item.
              <button
                aria-label={`Troquei ${item.alimento} por outra coisa`}
                className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground active:scale-90"
              >
                <Icone.editar className="h-4 w-4" />
              </button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

/** O convite para montar o cardápio, para quem ainda não tem um. */
export function ConviteDoCardapio() {
  return (
    <Link
      to="/dieta/cardapio"
      className="tap flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 active:scale-[0.99]"
    >
      <Icone.listaDeTecnicas className="h-5 w-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-primary">
          Montar um cardápio
        </span>
        <span className="block text-xs text-muted-foreground">
          Escreve o dia padrão uma vez, e depois é só marcar o que comeu — ou
          trocar o que mudou.
        </span>
      </span>
      <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
