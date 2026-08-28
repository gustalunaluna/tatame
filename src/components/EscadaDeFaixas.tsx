import { Icone } from "@/design/icones";
import { Faixa as DesenhoDaFaixa } from "@/components/Faixa";
import { nomeDaGraduacao, explicacaoDaFaixa } from "@/lib/graduacao";
import {
  ESCADA_COMPLETA,
  ESCADA_INFANTIL,
  emPortugues,
  mesesAcumuladosAte,
  tempoMinimoEmTexto,
} from "@/lib/tempos-ibjjf";
import { cn } from "@/lib/utils";
import type { Faixa } from "@/lib/bjj-types";

/**
 * A escada inteira, da branca à vermelha, com o tempo mínimo de cada degrau.
 *
 * Três decisões que separam isto de uma tabela copiada de blog:
 *
 * **1. "Sem prazo" aparece escrito.** A branca e a vermelha 10º grau não têm
 * tempo mínimo, e isso é informação — não uma célula vazia. A branca tem
 * IDADE (16 anos), e a tela diz idade onde é idade.
 *
 * **2. O acumulado vem junto.** "5 anos no 5º grau" não responde a pergunta que
 * a pessoa está de fato fazendo, que é "quanto tempo de preta isso dá?".
 * Somar 3+3+3+5+5+5 de cabeça no meio de uma lista é trabalho que a tela
 * consegue fazer. Só aparece da preta em diante, onde a soma surpreende.
 *
 * **3. Marca onde você está.** Uma escada sem o seu degrau destacado é um
 * cartaz; com ele é um mapa.
 */
export function EscadaDeFaixas({
  belt,
  degrees = 0,
}: {
  /** A graduação de quem está lendo, para destacar o degrau. */
  belt?: Faixa;
  degrees?: number;
}) {
  return (
    <div>
      <ol className="space-y-2">
        {ESCADA_COMPLETA.map((d) => {
          const aqui = d.faixa === belt && d.grau === degrees;
          const acumulado = mesesAcumuladosAte(d.faixa, d.grau);
          // Só vale dizer o acumulado quando ele difere do degrau — antes da
          // preta os dois são quase a mesma frase, e repetir vira ruído.
          const mostrarAcumulado =
            acumulado !== null &&
            d.mesesMinimos !== null &&
            acumulado > d.mesesMinimos &&
            (d.faixa === "Preta" || d.faixa === "Coral" || d.faixa === "Vermelha");

          return (
            <li
              key={`${d.faixa}-${d.grau}`}
              className={cn(
                "rounded-xl border p-3",
                aqui
                  ? "border-primary/70 bg-primary/10"
                  : "border-border/60 bg-card/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <DesenhoDaFaixa
                    belt={d.faixa}
                    degrees={d.grau}
                    comTexto={false}
                    cheia
                    compacta
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-bold",
                      aqui && "text-primary",
                    )}
                  >
                    {nomeDaGraduacao(d.faixa, d.grau)}
                    {aqui && (
                      <span className="ml-2 align-middle text-[0.65rem] font-black uppercase tracking-widest">
                        você
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {tempoMinimoEmTexto(d)}
                    {mostrarAcumulado && (
                      <> · {emPortugues(acumulado)} de preta ao todo</>
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">{d.regra}</p>

              {explicacaoDaFaixa(d.faixa, d.grau) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {explicacaoDaFaixa(d.faixa, d.grau)}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-muted-foreground">
        São os mínimos da IBJJF, não uma previsão. Cumprir o tempo é condição
        necessária e não suficiente: quem gradua é o seu professor, e a maior
        parte das academias leva mais tempo que o mínimo.
      </p>

      {/* --- a escada de 4 a 15 anos --- */}
      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          Faixas de 4 a 15 anos
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          É uma escada paralela, não um pedaço da adulta. Ela não converte: um
          faixa-verde que faz 16 anos vai para a azul, não para "meio caminho da
          azul". O que manda aqui é idade, não tempo de treino.
        </p>

        <ul className="mt-3 divide-y divide-border/50 rounded-xl border border-border/60">
          {ESCADA_INFANTIL.map((f) => (
            <li key={f.nome} className="flex items-center gap-3 px-3 py-2">
              <Icone.graduacao className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{f.nome}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {f.de} a {f.ate} anos
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
