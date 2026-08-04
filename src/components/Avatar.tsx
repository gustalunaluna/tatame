import {
  CORES_DE_CABELO,
  CORES_DE_OLHOS,
  KIMONOS,
  PATCHES,
  PELES,
  PIGMENTOS,
  type Avatar as DadosDoAvatar,
  type PatchId,
} from "@/design/avatar";
import { tecidoDaFaixa } from "@/lib/faixa-cores";
import { temListras } from "@/lib/graduacao";
import type { Faixa } from "@/lib/bjj-types";
import { cn } from "@/lib/utils";

/**
 * O retrato do atleta, desenhado.
 *
 * Um busto de frente: ombros, as duas lapelas do kimono cruzadas, pescoço,
 * cabeça. Tudo em `viewBox` de 100×100, então a mesma peça serve de 32px na
 * lista a 160px no perfil sem perder nada.
 *
 * A FAIXA É O ARO. Ela não é escolha do avatar — vem de `belt` e `degrees`,
 * os mesmos campos que a régua da IBJJF lê. Ver o cabeçalho de design/avatar.ts
 * para o porquê. O aro traz a cor do tecido, a ponteira preta e os graus, que
 * é como uma faixa se lê de longe.
 */

const CENTRO = 50;
const RAIO_ARO = 47;
const ESPESSURA_ARO = 5;

export function Avatar({
  dados,
  belt,
  degrees = 0,
  className,
  titulo,
}: {
  dados: DadosDoAvatar;
  /** A faixa de verdade da pessoa. Sem ela, o aro não é desenhado. */
  belt?: Faixa | null;
  degrees?: number;
  className?: string;
  /** Nome acessível. Sem ele o retrato é decorativo. */
  titulo?: string;
}) {
  const pele = PELES[dados.pele];
  const cabelo = CORES_DE_CABELO[dados.corDoCabelo];
  const olho = CORES_DE_OLHOS[dados.olhos];
  const gi = KIMONOS[dados.kimono];

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("block", className)}
      role={titulo ? "img" : "presentation"}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {/* O retrato é recortado no círculo; o aro fica por fora dele. */}
      <defs>
        <clipPath id={`recorte-${dados.pele}-${dados.cabelo}`}>
          <circle cx={CENTRO} cy={CENTRO} r={RAIO_ARO - ESPESSURA_ARO / 2} />
        </clipPath>
      </defs>

      <g clipPath={`url(#recorte-${dados.pele}-${dados.cabelo})`}>
        <circle cx={CENTRO} cy={CENTRO} r={RAIO_ARO} fill={PIGMENTOS.fundo} />

        {/* ── ombros e tronco ─────────────────────────────────────────── */}
        <path
          d="M18 100 C18 78 32 68 50 68 C68 68 82 78 82 100 Z"
          fill={gi.tecido}
        />

        {/* lapela esquerda, depois direita: a de cima é a que cruza por
            último, e no kimono é sempre a esquerda de quem veste */}
        <path d="M50 68 L34 100 L22 100 C22 84 34 72 50 68 Z" fill={gi.sombra} />
        <path d="M50 68 L66 100 L78 100 C78 84 66 72 50 68 Z" fill={gi.sombra} />
        <path d="M50 68 L62 100 L38 100 Z" fill={gi.tecido} />

        {/* gola: a faixa da lapela que sobe pelo peito */}
        <path
          d="M50 68 L36 100 L44 100 L50 76 L56 100 L64 100 Z"
          fill={gi.sombra}
          opacity={0.75}
        />

        {/* ── patches ─────────────────────────────────────────────────── */}
        {/* Encostados no recorte, os patches eram cortados pela metade: a
            circunferência do clipe passa a 44,5 do centro e o canto de um
            patch em (70, 82) chegava a 45,2. Trazidos para dentro, cabem
            inteiros — e é o desenho que a pessoa escolheu ver. */}
        <Patch id={dados.patches[0]} x={66} y={80} />
        <Patch id={dados.patches[1]} x={35} y={84} />

        {/* ── pescoço ─────────────────────────────────────────────────── */}
        <path d="M43 56 h14 v14 q-7 5 -14 0 Z" fill={pele} />
        <path d="M43 56 h14 v6 q-7 4 -14 0 Z" fill={PIGMENTOS.sombra} opacity={0.12} />

        {/* ── cabeça ──────────────────────────────────────────────────── */}
        <ellipse cx={CENTRO} cy={42} rx={19} ry={22} fill={pele} />
        {/* orelhas */}
        <ellipse cx={30} cy={44} rx={3.4} ry={4.6} fill={pele} />
        <ellipse cx={70} cy={44} rx={3.4} ry={4.6} fill={pele} />

        <Barba estilo={dados.barba} cor={cabelo} />

        {/* sobrancelhas */}
        <rect x={38} y={36} width={9} height={2.1} rx={1} fill={cabelo} />
        <rect x={53} y={36} width={9} height={2.1} rx={1} fill={cabelo} />

        {/* olhos */}
        <ellipse cx={42.5} cy={42} rx={3.1} ry={3.4} fill={PIGMENTOS.branco} />
        <ellipse cx={57.5} cy={42} rx={3.1} ry={3.4} fill={PIGMENTOS.branco} />
        <circle cx={42.5} cy={42.3} r={1.9} fill={olho} />
        <circle cx={57.5} cy={42.3} r={1.9} fill={olho} />
        <circle cx={43.1} cy={41.5} r={0.65} fill={PIGMENTOS.branco} opacity={0.9} />
        <circle cx={58.1} cy={41.5} r={0.65} fill={PIGMENTOS.branco} opacity={0.9} />

        {/* nariz e boca, discretos: num retrato de 32px o que se lê é a
            silhueta, e traço demais vira sujeira */}
        <path
          d="M50 45 v4"
          stroke={PIGMENTOS.sombra}
          strokeOpacity={0.22}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <path
          d="M45.5 53 q4.5 3 9 0"
          stroke={PIGMENTOS.sombra}
          strokeOpacity={0.38}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />

        <Cabelo estilo={dados.cabelo} cor={cabelo} />
      </g>

      {belt && <AroDaFaixa belt={belt} degrees={degrees} />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

function Cabelo({ estilo, cor }: { estilo: DadosDoAvatar["cabelo"]; cor: string }) {
  switch (estilo) {
    case "raspado":
      // Não é careca: é o corte de quem treina. Uma sombra rente ao couro.
      return (
        <path
          d="M31 40 Q31 21 50 21 Q69 21 69 40 Q69 30 50 30 Q31 30 31 40 Z"
          fill={cor}
          opacity={0.55}
        />
      );
    case "curto":
      return (
        <path d="M30 42 Q30 20 50 20 Q70 20 70 42 Q66 30 50 30 Q34 30 30 42 Z" fill={cor} />
      );
    case "ondulado":
      return (
        <path
          d="M29 43 Q28 19 50 19 Q72 19 71 43 Q68 33 62 31 Q56 36 50 31 Q44 36 38 31 Q32 33 29 43 Z"
          fill={cor}
        />
      );
    case "cacheado":
      return (
        <g fill={cor}>
          <circle cx={36} cy={28} r={7.5} />
          <circle cx={46} cy={23} r={8.5} />
          <circle cx={57} cy={24} r={8} />
          <circle cx={65} cy={31} r={7} />
          <circle cx={31} cy={37} r={6} />
          <circle cx={69} cy={39} r={6} />
        </g>
      );
    case "coque":
      return (
        <g fill={cor}>
          <circle cx={50} cy={16} r={6.5} />
          <path d="M30 42 Q30 20 50 20 Q70 20 70 42 Q66 30 50 30 Q34 30 30 42 Z" />
        </g>
      );
    case "rabo":
      return (
        <g fill={cor}>
          <path d="M30 42 Q30 20 50 20 Q70 20 70 42 Q66 30 50 30 Q34 30 30 42 Z" />
          <path d="M68 34 q10 6 8 20 q-1 6 -6 6 q4 -14 -4 -22 Z" />
        </g>
      );
  }
}

function Barba({ estilo, cor }: { estilo: DadosDoAvatar["barba"]; cor: string }) {
  if (estilo === "nenhuma") return null;
  if (estilo === "cavanhaque") {
    return (
      <path
        d="M44 54 q6 8 12 0 q0 9 -6 10 q-6 -1 -6 -10 Z"
        fill={cor}
        opacity={0.9}
      />
    );
  }
  return (
    <path
      d="M31 42 q0 22 19 22 q19 0 19 -22 q-3 12 -19 12 q-16 0 -19 -12 Z"
      fill={cor}
      opacity={0.9}
    />
  );
}

function Patch({ id, x, y }: { id: PatchId; x: number; y: number }) {
  if (id === "nenhum") return null;
  const c = PATCHES[id].cores;

  switch (id) {
    case "academia":
      return (
        <g transform={`translate(${x - 6} ${y - 6})`}>
          <rect width={12} height={12} rx={2.4} fill={c[0]} />
          <path d="M6 3 L9 9 H3 Z" fill={c[1]} />
        </g>
      );
    case "brasil":
      return (
        <g transform={`translate(${x - 7} ${y - 4.7})`}>
          <rect width={14} height={9.4} rx={1.8} fill={c[0]} />
          <path d="M7 1.6 L12.4 4.7 L7 7.8 L1.6 4.7 Z" fill={c[1]} />
          <circle cx={7} cy={4.7} r={2.1} fill={c[2]} />
        </g>
      );
    case "bandeira":
      return (
        <g transform={`translate(${x - 6} ${y - 6})`}>
          <circle cx={6} cy={6} r={6} fill={c[1]} />
          <circle cx={6} cy={6} r={3.1} fill={c[0]} />
        </g>
      );
    case "circulo":
      return (
        <g transform={`translate(${x - 6} ${y - 6})`}>
          <circle cx={6} cy={6} r={6} fill={c[0]} />
          <circle cx={6} cy={6} r={3.4} fill="none" stroke={c[1]} strokeWidth={1.7} />
        </g>
      );
    case "listras":
      return (
        <g transform={`translate(${x - 6} ${y - 4.8})`}>
          <rect width={12} height={9.6} rx={1.8} fill={c[0]} />
          <rect y={2.6} width={12} height={1.7} fill={c[1]} />
          <rect y={6} width={12} height={1.7} fill={c[1]} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * A faixa, desenhada como o aro do retrato.
 *
 * O aro inteiro tem o tecido da faixa. A ponteira é um arco preto na base —
 * onde a ponta da faixa cairia — e os graus são listras brancas dentro dela.
 *
 * Da coral em diante NÃO HÁ LISTRA: o grau já está dito pela cor do tecido, e
 * desenhar listra em cima disso inventa uma graduação que não existe. É a
 * mesma regra que o componente `Faixa` segue, e vale repetir porque é o erro
 * mais fácil de cometer aqui.
 */
function AroDaFaixa({ belt, degrees }: { belt: Faixa; degrees: number }) {
  const listras = temListras(belt) ? Math.max(0, Math.min(4, degrees)) : 0;
  const r = RAIO_ARO;

  // A ponteira ocupa 74° na base do círculo, centrada em 90° (embaixo).
  const de = 53;
  const ate = 127;
  const ponto = (grau: number) => {
    const rad = (grau * Math.PI) / 180;
    return [CENTRO + r * Math.cos(rad), CENTRO + r * Math.sin(rad)];
  };
  const [x1, y1] = ponto(de);
  const [x2, y2] = ponto(ate);

  return (
    <g fill="none" strokeWidth={ESPESSURA_ARO}>
      {/* Um aro de contraste por baixo. Sem ele a faixa PRETA desaparecia: o
          tecido dela é quase o fundo do app, e o retrato de um faixa-preta
          ficava sem aro nenhum — justamente quem mais tem o que mostrar.
          Fica embaixo, um fio mais largo, e só aparece nas faixas escuras. */}
      <circle
        cx={CENTRO}
        cy={CENTRO}
        r={r}
        stroke={PIGMENTOS.aroDeContraste}
        strokeWidth={ESPESSURA_ARO + 1.6}
      />
      <circle cx={CENTRO} cy={CENTRO} r={r} stroke={tecidoDaFaixa(belt)} />
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        stroke={PIGMENTOS.ponteira}
        strokeLinecap="butt"
      />
      {Array.from({ length: listras }, (_, i) => {
        // Distribui as listras dentro da ponteira, com folga nas pontas.
        const g = de + 12 + i * ((ate - de - 24) / 3 || 0);
        const [lx, ly] = ponto(listras === 1 ? 90 : g);
        return (
          <circle
            key={i}
            cx={lx}
            cy={ly}
            r={ESPESSURA_ARO / 2 - 0.6}
            fill={PIGMENTOS.branco}
            stroke="none"
          />
        );
      })}
    </g>
  );
}
