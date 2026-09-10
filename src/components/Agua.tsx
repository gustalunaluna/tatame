import { Icone } from "@/design/icones";
import { Card, CardContent } from "@/components/ui/card";
import { Bar } from "@/components/ui/bar";
import { GOLES_ML } from "@/lib/dieta";
import { cn } from "@/lib/utils";

const litros = (ml: number) =>
  `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace(".", ",")} L`;

/**
 * A água do dia.
 *
 * Três botões e uma barra, e nada mais. Água é o único registro da dieta que
 * acontece seis a dez vezes por dia — se custar mais que um toque, ninguém
 * anota depois da segunda semana.
 *
 * Por isso também não existe "que horas você bebeu": o histórico de horários de
 * gole não responde nenhuma pergunta que alguém vá fazer, e guardá-lo custaria
 * dez linhas por dia para sempre.
 */
export function Agua({
  ml,
  meta,
  aoSomar,
  aoZerar,
}: {
  ml: number;
  /** 0 = ainda não dá para calcular (falta peso) nem foi escrita na mão. */
  meta: number;
  aoSomar: (delta: number) => void;
  aoZerar: () => void;
}) {
  const bateu = meta > 0 && ml >= meta;
  const pct = meta > 0 ? (ml / meta) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Água
          </p>
          <p className="text-sm font-black tabular-nums">
            <span className={cn(bateu && "text-primary")}>{litros(ml)}</span>
            {meta > 0 && (
              <span className="font-bold text-muted-foreground">
                {" / "}
                {litros(meta)}
              </span>
            )}
          </p>
        </div>

        {meta > 0 ? (
          <Bar
            className="mt-2 h-2"
            value={pct}
            label={`${litros(ml)} de ${litros(meta)}`}
          />
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            A meta sai de 35 ml por quilo mais a reposição do treino — ela
            aparece quando houver uma pesagem. Dá para escrever uma na mão em
            Metas.
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          {GOLES_ML.map((gole) => (
            <button
              key={gole}
              onClick={() => aoSomar(gole)}
              className="tap flex-1 rounded-xl border border-border/60 py-2.5 text-sm font-bold tabular-nums active:scale-95"
            >
              +{gole}
              <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                ml
              </span>
            </button>
          ))}
          <button
            onClick={() => (ml > 0 ? aoSomar(-GOLES_ML[0]) : aoZerar())}
            disabled={ml === 0}
            aria-label="Tirar um copo"
            className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground active:scale-90 disabled:opacity-30"
          >
            <Icone.remover className="h-4 w-4" />
          </button>
        </div>

        {bateu && (
          <p className="mt-2 text-xs text-primary">
            <Icone.confirmar className="mr-1 inline h-3 w-3" />
            Meta do dia batida.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
