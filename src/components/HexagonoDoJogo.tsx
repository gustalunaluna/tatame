import { useId } from "react";
import { EIXOS, NOTA_MAXIMA, emOrdem, type NotasDoHexagono } from "@/lib/hexagono";
import { cn } from "@/lib/utils";

/* ==================================================================
   GEOMETRIA
   ==================================================================
   Seis eixos, começando no topo e girando no sentido do relógio. A ordem
   vem de `EIXOS` e nunca muda — é o que torna o formato de um mês
   comparável com o de outro. Reordenar por nota destruiria a comparação
   inteira, e é o erro clássico de gráfico de radar.
   ================================================================== */

const CX = 180;
const CY = 150;
const R = 98;
const R_ROTULO = R + 24;

/** O ângulo do eixo `i`, em radianos. -90° põe o primeiro eixo no topo. */
const angulo = (i: number) => ((-90 + i * (360 / EIXOS.length)) * Math.PI) / 180;

function ponto(i: number, raio: number): [number, number] {
  const a = angulo(i);
  return [CX + raio * Math.cos(a), CY + raio * Math.sin(a)];
}

/** O polígono de um conjunto de notas, em coordenadas de tela. */
function poligono(notas: number[]): string {
  return notas
    .map((n, i) => ponto(i, (R * n) / NOTA_MAXIMA).map((v) => v.toFixed(1)).join(","))
    .join(" ");
}

/** O anel de valor `v` — um hexágono, não um círculo. */
function anel(v: number): string {
  return EIXOS.map((_, i) => ponto(i, (R * v) / NOTA_MAXIMA).map((x) => x.toFixed(1)).join(","))
    .join(" ");
}

function ancoraDoRotulo(i: number): "start" | "middle" | "end" {
  const x = Math.cos(angulo(i));
  if (Math.abs(x) < 0.2) return "middle";
  return x > 0 ? "start" : "end";
}

/* ==================================================================
   O COMPONENTE
   ================================================================== */

export interface HexagonoProps {
  /** O mês que está em foco. Desenhado cheio, com marcadores. */
  agora: NotasDoHexagono;
  rotuloAgora: string;
  /** O mês de comparação, quando houver. Desenhado em contorno tracejado. */
  antes?: NotasDoHexagono | null;
  rotuloAntes?: string;
  className?: string;
}

/**
 * O hexágono do jogo — e a razão de ele existir.
 *
 * O app mostrava a MÉDIA das notas ao longo do tempo, numa linha. A média de
 * seis habilidades é o número que mais esconde: quem melhorou muito a passagem
 * e piorou a defesa aparece parado, e "parado" é a leitura errada. O hexágono
 * guarda as seis leituras separadas e mostra o FORMATO — que é o que um
 * professor enxerga em três rolas: não "o quanto", mas "de que lado".
 *
 * ------------------------------------------------------------------
 * AS DUAS SÉRIES SÃO A MESMA COR, DE PROPÓSITO
 * ------------------------------------------------------------------
 * A tentação era dar uma cor para "agora" e outra para "antes". Está errado
 * duas vezes.
 *
 * Errado no significado: duas cores dizem "duas coisas diferentes", e aqui é
 * UMA pessoa em dois momentos. A cor da faixa é a identidade dela; o mês
 * passado não é outra identidade.
 *
 * E errado na prática, com número: testei o acento de cada faixa contra um
 * cinza de série, e sob protanopia o vermelho da faixa vermelha colapsa no
 * cinza (ΔE 1.6 num piso de 8) — o do acento da preta chega a 9.1, raspando.
 * Duas cores exigiriam escolher um cinza que funcionasse contra sete acentos
 * diferentes, porque a cor da série 1 muda com a faixa de quem abriu o app.
 *
 * A separação aqui não é por matiz, e por isso não depende de enxergar matiz:
 *
 *   agora   traço cheio  ·  marcadores  ·  preenchimento  ·  opacidade 100%
 *   antes   tracejado    ·  sem marcador ·  sem preenchimento ·  mesclado ao fundo
 *
 * Quatro canais redundantes, nenhum deles cromático. Mais a tabela embaixo,
 * que é a leitura sem ilusão nenhuma.
 *
 * ------------------------------------------------------------------
 * A ARMADILHA DO RADAR, E O QUE FOI FEITO CONTRA ELA
 * ------------------------------------------------------------------
 * A área da figura cresce com o QUADRADO dos valores. Quem lê a mancha em vez
 * do raio superestima qualquer melhora — subir 1 ponto em tudo quase dobra a
 * área. Três defesas:
 *   1. os anéis de 1 a 5 ficam desenhados, e o 5 é rotulado
 *   2. o preenchimento é fraco (14%): a mancha não compete com a linha
 *   3. a tabela repete os números com a diferença calculada
 */
export function HexagonoDoJogo({
  agora,
  rotuloAgora,
  antes,
  rotuloAntes,
  className,
}: HexagonoProps) {
  const id = useId();
  const notasAgora = emOrdem(agora);
  const notasAntes = antes ? emOrdem(antes) : null;
  const temComparacao = notasAntes !== null;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox="0 0 360 300"
        className="w-full"
        role="img"
        aria-labelledby={`${id}-titulo`}
      >
        <title id={`${id}-titulo`}>
          {temComparacao
            ? `Hexágono do jogo, ${rotuloAgora} comparado com ${rotuloAntes}. Os números estão na tabela abaixo.`
            : `Hexágono do jogo em ${rotuloAgora}. Os números estão na tabela abaixo.`}
        </title>

        {/* --- anéis: hairline, recessivos, nunca tracejados ---
            Recessivos, mas não invisíveis: são eles que permitem ler a figura
            pelo RAIO. Some com os anéis e o que sobra é uma mancha, e mancha
            de radar cresce com o quadrado do valor — a leitura fica errada
            justamente na direção que agrada. */}
        <g fill="none" stroke="var(--border)" strokeWidth="1">
          {[1, 2, 3, 4, 5].map((v) => (
            <polygon key={v} points={anel(v)} opacity={v === NOTA_MAXIMA ? 1 : 0.75} />
          ))}
        </g>

        {/* --- raios --- */}
        <g stroke="var(--border)" strokeWidth="1" opacity="0.55">
          {EIXOS.map((e, i) => {
            const [x, y] = ponto(i, R);
            return <line key={e.slug} x1={CX} y1={CY} x2={x} y2={y} />;
          })}
        </g>

        {/* O 5 rotulado: sem ele o leitor não sabe onde termina a escala, e
            aí só lhe resta comparar manchas — que é justamente o erro. */}
        <text
          x={CX + 4}
          y={CY - R + 11}
          fontSize="9"
          fill="var(--muted-foreground)"
          className="font-semibold"
        >
          {NOTA_MAXIMA}
        </text>

        {/* --- antes: contorno tracejado, sem marcador, sem preenchimento --- */}
        {notasAntes && (
          <polygon
            points={poligono(notasAntes)}
            fill="none"
            stroke="color-mix(in oklab, var(--primary) 55%, var(--card))"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        )}

        {/* --- agora: preenchido, traço cheio, com marcadores --- */}
        <polygon
          points={poligono(notasAgora)}
          fill="var(--primary)"
          fillOpacity="0.14"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {notasAgora.map((n, i) => {
          const [x, y] = ponto(i, (R * n) / NOTA_MAXIMA);
          return (
            <circle
              key={EIXOS[i].slug}
              cx={x}
              cy={y}
              r="4"
              fill="var(--primary)"
              /* O anel da cor da superfície separa o marcador da linha que
                 passa por baixo dele — sem isso os dois viram um borrão nos
                 eixos em que os dois meses quase se encostam. */
              stroke="var(--card)"
              strokeWidth="2"
            />
          );
        })}

        {/* --- rótulos dos eixos --- */}
        {EIXOS.map((e, i) => {
          const [x, y] = ponto(i, R_ROTULO);
          return (
            <text
              key={e.slug}
              x={x}
              y={y}
              textAnchor={ancoraDoRotulo(i)}
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--muted-foreground)"
              className="font-semibold"
            >
              {e.nome}
            </text>
          );
        })}
      </svg>

      {/* --- legenda: obrigatória a partir de duas séries --- */}
      {temComparacao && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <svg width="22" height="8" aria-hidden>
              <line
                x1="1"
                y1="4"
                x2="21"
                y2="4"
                stroke="var(--primary)"
                strokeWidth="2"
              />
              <circle cx="11" cy="4" r="3.5" fill="var(--primary)" />
            </svg>
            {rotuloAgora}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <svg width="22" height="8" aria-hidden>
              <line
                x1="1"
                y1="4"
                x2="21"
                y2="4"
                stroke="color-mix(in oklab, var(--primary) 55%, var(--card))"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            </svg>
            {rotuloAntes}
          </span>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */

/**
 * A tabela — e ela não é um extra de acessibilidade.
 *
 * É a leitura sem a distorção de área do radar. Quem quer saber "quanto
 * melhorou" lê aqui; o hexágono responde "de que lado", que é outra pergunta.
 */
export function TabelaDoHexagono({
  agora,
  antes,
  rotuloAgora,
  rotuloAntes,
}: {
  agora: NotasDoHexagono;
  antes?: NotasDoHexagono | null;
  rotuloAgora: string;
  rotuloAntes?: string;
}) {
  const a = emOrdem(agora);
  const b = antes ? emOrdem(antes) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="pb-2 font-semibold">
              Área
            </th>
            {b && (
              <th scope="col" className="pb-2 text-right font-semibold">
                {rotuloAntes}
              </th>
            )}
            <th scope="col" className="pb-2 text-right font-semibold">
              {rotuloAgora}
            </th>
            {b && (
              <th scope="col" className="pb-2 text-right font-semibold">
                Dif.
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {EIXOS.map((e, i) => {
            const dif = b ? a[i] - b[i] : 0;
            return (
              <tr key={e.slug} className="border-t border-border/50">
                <th scope="row" className="py-2 text-left font-medium">
                  {e.nome}
                </th>
                {b && (
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {b[i]}
                  </td>
                )}
                <td className="py-2 text-right font-bold tabular-nums">{a[i]}</td>
                {b && (
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums",
                      dif > 0 && "font-bold text-primary",
                      dif < 0 && "text-muted-foreground",
                      dif === 0 && "text-muted-foreground",
                    )}
                  >
                    {/* O sinal fica escrito: "+1" e "1" se confundem numa
                        coluna de números, e aqui a direção é a informação. */}
                    {dif > 0 ? `+${dif}` : dif < 0 ? String(dif) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
