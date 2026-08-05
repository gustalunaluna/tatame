import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HexagonoDoJogo, TabelaDoHexagono } from "@/components/HexagonoDoJogo";
import { Icone } from "@/design/icones";
import { EIXOS } from "@/lib/hexagono";
import {
  derivarHexagonoDoPeriodo,
  eixosComDado,
  limitesDoMes,
  mesesComRola,
  notasDe,
} from "@/lib/hexagono-derivado";
import { useSinaisDoHistorico } from "@/lib/sinais-storage";
import { usePerfil } from "@/lib/bjj-storage";
import { cn } from "@/lib/utils";

const NOMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "2026-07" → "jul/26". Curto porque cabe em botão de celular. */
function rotulo(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${NOMES[Number(m) - 1]}/${ano.slice(2)}`;
}

function idadeDe(nascimento: string | null | undefined): number | null {
  if (!nascimento) return null;
  const d = new Date(nascimento);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 31557600000);
}

/**
 * Dois meses, um por cima do outro.
 *
 * ------------------------------------------------------------------
 * POR QUE UM MODO SEPARADO, E NÃO O HEXÁGONO NORMAL COM UM FILTRO
 * ------------------------------------------------------------------
 * O hexágono do painel é uma leitura ROLANTE: janela de oito semanas com
 * meia-vida de quatro, porque a pergunta dele é "como está meu jogo hoje".
 * Duas leituras dessas, tiradas em meses seguidos, se sobrepõem quase
 * inteiras — o "julho" carregaria junho dentro, o "agosto" carregaria julho, e
 * a diferença entre os dois apareceria amassada. Comparar assim mostraria bem
 * menos movimento do que realmente houve.
 *
 * Aqui cada mês é fechado e pesa por igual do dia 1 ao dia 31. Ver
 * `derivarHexagonoDoPeriodo`.
 *
 * ------------------------------------------------------------------
 * A HONESTIDADE QUE ESTA TELA PRECISA TER
 * ------------------------------------------------------------------
 * Um mês costuma ter poucas rolas com contador preenchido. O encolhimento para
 * o meio já cuida de não deixar uma noite boa virar nota 5, mas quem lê o
 * gráfico não vê isso acontecendo — vê duas figuras e conclui. Por isso a
 * contagem de rolas de cada mês fica escrita embaixo, e o mês que não chega ao
 * mínimo nem entra no seletor.
 */
export function CompararMeses() {
  const { perfil } = usePerfil();
  const [aberto, setAberto] = useState(false);
  const { sinais, ready } = useSinaisDoHistorico(aberto);

  const meses = useMemo(() => mesesComRola(sinais), [sinais]);

  // O mais recente contra o anterior — que é a comparação que quase todo mundo
  // quer, e evita abrir a tela pedindo duas decisões antes de mostrar nada.
  const [depois, setDepois] = useState<string | null>(null);
  const [antes, setAntes] = useState<string | null>(null);
  const mesDepois = depois ?? meses[0] ?? null;
  const mesAntes = antes ?? meses[1] ?? null;

  const pessoa = {
    faixa: String(perfil?.belt ?? "Branca"),
    idade: idadeDe(perfil?.birthDate),
  };

  const hexDepois = useMemo(() => {
    if (!mesDepois) return null;
    const { de, ate } = limitesDoMes(mesDepois);
    return derivarHexagonoDoPeriodo(sinais, pessoa, de, ate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinais, mesDepois, pessoa.faixa, pessoa.idade]);

  const hexAntes = useMemo(() => {
    if (!mesAntes) return null;
    const { de, ate } = limitesDoMes(mesAntes);
    return derivarHexagonoDoPeriodo(sinais, pessoa, de, ate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinais, mesAntes, pessoa.faixa, pessoa.idade]);

  /** Quantas rolas detalhadas o mês tem — é o que sustenta a nota. */
  const rolasDo = (mes: string | null) =>
    mes === null
      ? 0
      : sinais
          .filter((s) => s.detalhado && s.data.startsWith(mes))
          .reduce((n, s) => n + Math.max(1, s.rolas), 0);

  if (!aberto) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="tap flex w-full items-center gap-3 text-left active:scale-[0.99]"
          >
            <Icone.analise className="size-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Comparar meses</span>
              <span className="block text-xs text-muted-foreground">
                Sobrepõe dois meses no mesmo hexágono
              </span>
            </span>
            <Icone.expandir className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!ready) {
    return (
      <div
        className="h-72 w-full animate-pulse rounded-2xl bg-muted/40"
        aria-hidden
      />
    );
  }

  /* --- menos de dois meses com dado: não há o que comparar --- */
  if (meses.length < 2) {
    return (
      <Card className="border-dashed border-primary/40 bg-transparent">
        <CardContent className="p-6 text-center">
          <Icone.analise className="mx-auto mb-2 size-6 text-primary" />
          <p className="text-sm font-bold">Ainda falta um mês</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {meses.length === 0
              ? "A comparação lê as rolas com os contadores preenchidos, e ainda não há nenhuma."
              : `Você tem ${rotulo(meses[0])} fechado. Quando o mês virar e você registrar rolas nele, os dois aparecem sobrepostos aqui.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const semDado = hexDepois
    ? EIXOS.filter((e) => !hexDepois[e.slug]?.temDado).map((e) => e.slug)
    : [];

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold">Comparar meses</p>
            <p className="text-xs text-muted-foreground">
              Cada mês pesa por igual do dia 1 ao último — não é a janela
              rolante do painel de cima.
            </p>
          </div>
          <button
            type="button"
            aria-label="Recolher"
            onClick={() => setAberto(false)}
            className="tap -mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <Icone.recolher className="size-4" />
          </button>
        </div>

        {/* --- os dois seletores --- */}
        <div className="mt-4 space-y-3">
          <SeletorDeMes
            titulo="Tracejado (antes)"
            meses={meses}
            escolhido={mesAntes}
            proibido={mesDepois}
            aoEscolher={setAntes}
            rolasDo={rolasDo}
          />
          <SeletorDeMes
            titulo="Cheio (depois)"
            meses={meses}
            escolhido={mesDepois}
            proibido={mesAntes}
            aoEscolher={setDepois}
            rolasDo={rolasDo}
          />
        </div>

        {hexDepois && hexAntes && mesDepois && mesAntes ? (
          <>
            <HexagonoDoJogo
              className="mt-4"
              agora={notasDe(hexDepois)}
              rotuloAgora={rotulo(mesDepois)}
              antes={notasDe(hexAntes)}
              rotuloAntes={rotulo(mesAntes)}
              semDado={semDado}
            />

            <div className="mt-4">
              <TabelaDoHexagono
                agora={notasDe(hexDepois)}
                rotuloAgora={rotulo(mesDepois)}
                antes={notasDe(hexAntes)}
                rotuloAntes={rotulo(mesAntes)}
                semDado={semDado}
              />
            </div>

            {/* A amostra, escrita. Duas figuras lado a lado convidam a concluir
                muito; saber que uma delas se apoia em quatro rolas é o que
                impede a conclusão de virar certeza. */}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {rotulo(mesAntes)} tem <strong>{rolasDo(mesAntes)}</strong>{" "}
              {rolasDo(mesAntes) === 1 ? "rola" : "rolas"} com contador
              preenchido; {rotulo(mesDepois)} tem{" "}
              <strong>{rolasDo(mesDepois)}</strong>.{" "}
              {Math.min(rolasDo(mesAntes), rolasDo(mesDepois)) < 10
                ? "Com amostra assim, as notas ficam puxadas para o meio de propósito — leia a direção, não o número."
                : "Amostra suficiente nos dois lados."}
              {eixosComDado(hexDepois) < EIXOS.length
                ? " Os eixos marcados com “?” não têm rola que os alimente no mês cheio."
                : ""}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ================================================================== */

function SeletorDeMes({
  titulo,
  meses,
  escolhido,
  proibido,
  aoEscolher,
  rolasDo,
}: {
  titulo: string;
  meses: string[];
  escolhido: string | null;
  /** O mês já usado na outra ponta — comparar um mês consigo é nada. */
  proibido: string | null;
  aoEscolher: (m: string) => void;
  rolasDo: (m: string) => number;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {meses.map((m) => {
          const bloqueado = m === proibido;
          return (
            <button
              key={m}
              type="button"
              disabled={bloqueado}
              onClick={() => aoEscolher(m)}
              className={cn(
                "tap shrink-0 rounded-xl border px-3 py-2 text-center",
                m === escolhido
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card active:scale-[0.97]",
                bloqueado && "opacity-35",
              )}
            >
              <span
                className={cn(
                  "block text-sm font-bold",
                  m === escolhido && "text-primary",
                )}
              >
                {rotulo(m)}
              </span>
              <span className="block text-[0.6875rem] text-muted-foreground">
                {rolasDo(m)} {rolasDo(m) === 1 ? "rola" : "rolas"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
