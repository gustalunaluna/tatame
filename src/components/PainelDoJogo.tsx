import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { HexagonoDoJogo, TabelaDoHexagono } from "@/components/HexagonoDoJogo";
import { EIXOS, prescricaoDoMes, minutosDirigidos } from "@/lib/hexagono";
import {
  derivarHexagono,
  notasDe,
  eixosComDado,
  type HexagonoDerivado,
} from "@/lib/hexagono-derivado";
import {
  useSinaisDoJogo,
  usePendenciasDaSemana,
  SEMANAS_DA_JANELA,
  type TreinoSemDetalhe,
} from "@/lib/sinais-storage";
import { usePerfil } from "@/lib/bjj-storage";
import { cn } from "@/lib/utils";

/* ================================================================== */

/** Contador de 0 a 99 com dois botões — o teclado do celular nunca abre. */
function Contador({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  aoMudar: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0 flex-1 text-sm">{rotulo}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => aoMudar(Math.max(0, valor - 1))}
          aria-label={`Menos um em ${rotulo}`}
          disabled={valor === 0}
          className="tap grid h-9 w-9 place-items-center rounded-full border border-border/60 text-lg font-bold disabled:opacity-30 active:scale-95"
        >
          −
        </button>
        <span className="w-7 text-center text-sm font-bold tabular-nums">{valor}</span>
        <button
          type="button"
          onClick={() => aoMudar(Math.min(99, valor + 1))}
          aria-label={`Mais um em ${rotulo}`}
          className="tap grid h-9 w-9 place-items-center rounded-full border border-border/60 text-lg font-bold active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */

interface RespostaDoParceiro {
  id: string;
  passesFor: number;
  passesAgainst: number;
  sweepsFor: number;
  subsFor: number;
  subsAgainst: number;
}

/**
 * O fechamento do treino — o que substituiu a auto-avaliação.
 *
 * A diferença que faz tudo: aqui não se pergunta "quanto vale a sua guarda".
 * Pergunta-se o que ACONTECEU. Contagem o parceiro pode conferir; nota não.
 */
function FecharTreino({
  treino,
  aoFechar,
  aoSalvar,
  salvando,
}: {
  treino: TreinoSemDetalhe;
  aoFechar: () => void;
  aoSalvar: (r: {
    ritmoCaiuNa: number | null;
    parceiros: RespostaDoParceiro[];
  }) => Promise<void>;
  salvando: boolean;
}) {
  const [respostas, setRespostas] = useState<Record<string, RespostaDoParceiro>>(() =>
    Object.fromEntries(
      treino.parceiros.map((p) => [
        p.id,
        {
          id: p.id,
          passesFor: 0,
          passesAgainst: 0,
          sweepsFor: 0,
          subsFor: 0,
          subsAgainst: 0,
        },
      ]),
    ),
  );
  const [caiu, setCaiu] = useState<number | null>(null);
  const [naoCaiu, setNaoCaiu] = useState(true);

  const mexer = (id: string, campo: keyof RespostaDoParceiro, n: number) =>
    setRespostas((r) => ({ ...r, [id]: { ...r[id], [campo]: n } }));

  const dataBonita = new Date(`${treino.data}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{dataBonita}</DialogTitle>
        </DialogHeader>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Não é para acertar de cabeça — é o que você lembra. O app conta
          eventos, não opinião, e por isso a conta aguenta um número torto: o
          que manda é a tendência de várias semanas.
        </p>

        <div className="space-y-4">
          {treino.parceiros.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-bold">
                {p.nome}
                {p.faixa && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {p.faixa}
                  </span>
                )}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  · {p.rolas} {p.rolas === 1 ? "rola" : "rolas"}
                </span>
              </p>
              <div className="mt-1 divide-y divide-border/40">
                <Contador
                  rotulo="Você passou a guarda dele"
                  valor={respostas[p.id]?.passesFor ?? 0}
                  aoMudar={(n) => mexer(p.id, "passesFor", n)}
                />
                <Contador
                  rotulo="Ele passou a sua"
                  valor={respostas[p.id]?.passesAgainst ?? 0}
                  aoMudar={(n) => mexer(p.id, "passesAgainst", n)}
                />
                <Contador
                  rotulo="Você raspou"
                  valor={respostas[p.id]?.sweepsFor ?? 0}
                  aoMudar={(n) => mexer(p.id, "sweepsFor", n)}
                />
                <Contador
                  rotulo="Você finalizou"
                  valor={respostas[p.id]?.subsFor ?? 0}
                  aoMudar={(n) => mexer(p.id, "subsFor", n)}
                />
                <Contador
                  rotulo="Ele te finalizou"
                  valor={respostas[p.id]?.subsAgainst ?? 0}
                  aoMudar={(n) => mexer(p.id, "subsAgainst", n)}
                />
              </div>
            </div>
          ))}

          {!treino.ritmoRespondido && (
            <div className="rounded-xl border border-border/60 p-3">
              <Label className="text-sm font-bold">Em que rola o ritmo caiu?</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Foram {treino.rolas} {treino.rolas === 1 ? "rola" : "rolas"} no total.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNaoCaiu(true);
                    setCaiu(null);
                  }}
                  className={cn(
                    "tap rounded-full border px-3 py-1.5 text-xs font-bold active:scale-95",
                    naoCaiu
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  Não caiu
                </button>
                {Array.from({ length: Math.max(1, treino.rolas) }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setNaoCaiu(false);
                        setCaiu(n);
                      }}
                      className={cn(
                        "tap min-w-9 rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums active:scale-95",
                        !naoCaiu && caiu === n
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {n}ª
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={salvando}
            onClick={async () => {
              await aoSalvar({
                ritmoCaiuNa: naoCaiu ? null : caiu,
                parceiros: Object.values(respostas),
              });
              aoFechar();
            }}
          >
            {salvando ? "Salvando…" : "Fechar o treino"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

/** O que a semana deixou aberto. É daqui que o hexágono se alimenta. */
export function FechamentoDaSemana() {
  const { pendencias, ready, responder } = usePendenciasDaSemana();
  const [abertoId, setAbertoId] = useState<string | null>(null);

  if (!ready || pendencias.length === 0) return null;

  const emAberto = pendencias.find((p) => p.trainingId === abertoId) ?? null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icone.treino className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-bold">
            {pendencias.length === 1
              ? "1 treino desta semana para fechar"
              : `${pendencias.length} treinos desta semana para fechar`}
          </p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Um minuto cada. É o que faz o seu hexágono se mexer — sem isso ele
          fica calado, que é melhor do que ele chutar.
        </p>

      {/* Lista com filetes, e não uma pilha de caixas.
          Cada pendência era um retângulo com borda e fundo próprios, dentro
          de um cartão que já tem borda e fundo — moldura dentro de moldura,
          que separa o que deveria se ler como um conjunto. O filete faz a
          divisão com um traço em vez de quatro. */}
        <ul className="mt-3 divide-y divide-border/50">
          {pendencias.map((p) => (
            <li key={p.trainingId}>
              <button
                onClick={() => setAbertoId(p.trainingId)}
                className="tap flex w-full items-center gap-2 rounded-lg py-3 text-left active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold capitalize">
                    {new Date(`${p.data}T00:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {p.parceiros.length > 0
                      ? `${p.parceiros.length} ${p.parceiros.length === 1 ? "parceiro" : "parceiros"} sem números`
                      : "falta só o ritmo"}
                  </span>
                </span>
                <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>

      {emAberto && (
        <FecharTreino
          key={emAberto.trainingId}
          treino={emAberto}
          aoFechar={() => setAbertoId(null)}
          salvando={responder.isPending}
          aoSalvar={async (r) => {
            await responder.mutateAsync({ trainingId: emAberto.trainingId, ...r });
          }}
        />
      )}
    </Card>
  );
}

/* ================================================================== */

function Plano({ h, faixa }: { h: HexagonoDerivado; faixa: string | undefined }) {
  // O plano só aponta para eixo que TEM dado. Mandar alguém treinar defesa
  // porque o app não sabe nada sobre a defesa dela seria pior que não mandar.
  const comDado = Object.fromEntries(
    EIXOS.filter((e) => h[e.slug]?.temDado).map((e) => [e.slug, h[e.slug].nota]),
  );
  if (Object.keys(comDado).length < 2) return null;

  const p = prescricaoDoMes(comDado, faixa);
  if (!p) return null;

  return (
    <Card className="border-primary/40 bg-card/70">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icone.tecnica className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-bold">
            O mês aponta para {p.eixo.nome.toLowerCase()}
          </p>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{p.porque}</p>

        <ol className="mt-3 space-y-2">
          {p.semanas.map((s) => (
            <li key={s.semana} className="py-3">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  Semana {s.semana}
                </span>
                <span className="min-w-0 truncate text-xs font-bold">{s.foco}</span>
              </div>
              <p className="mt-1 text-sm">{s.restricao}</p>
            </li>
          ))}
        </ol>

        <p className="mt-3 text-xs text-muted-foreground">{p.comoSaber}</p>

        <details className="reveal mt-3">
          <summary className="cursor-pointer text-xs font-bold text-primary">
            Por que alterna entre dois temas?
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Porque treinar dois assuntos alternados rende mais que fechar um de
            cada vez, mesmo parecendo pior durante o mês. O intervalo entre a
            semana 1 e a semana 3 é o que faz o aprendizado ficar. E cada semana
            é rola posicional com regra, não repetição no boneco: no jiu-jitsu a
            técnica aparece resolvendo um problema, não copiando um movimento.
            São {minutosDirigidos(faixa)} minutos por semana dentro do treino que
            você já faz.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

/* ================================================================== */

function idadeDe(nascimento: string | null | undefined): number | null {
  if (!nascimento) return null;
  const d = new Date(`${nascimento}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}

/**
 * O hexágono calculado.
 *
 * `compacto` é a versão do Início: o desenho, sem a tabela e sem o plano —
 * quem quer o detalhe toca e vai para Evolução.
 */
export function PainelDoJogo({ compacto = false }: { compacto?: boolean }) {
  const { sinais, ready } = useSinaisDoJogo();
  const { perfil } = usePerfil();

  const h = useMemo(
    () =>
      derivarHexagono(sinais, {
        faixa: String(perfil?.belt ?? "Branca"),
        idade: idadeDe(perfil?.birthDate),
      }),
    [sinais, perfil?.belt, perfil?.birthDate],
  );

  const semDado = EIXOS.filter((e) => !h[e.slug]?.temDado).map((e) => e.slug);
  const quantos = eixosComDado(h);

  if (!ready) {
    return <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/40" aria-hidden />;
  }

  /* --- nada ainda --- */
  if (quantos === 0) {
    if (compacto) return null;
    return (
      <Card className="border-dashed border-primary/40 bg-transparent">
        <CardContent className="p-6 text-center">
          <Icone.evolucao className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-sm font-bold">Seu hexágono ainda está calado</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Ele não pergunta o quanto você acha que é bom — ele conta o que
            aconteceu nas suas rolas. Registre um treino com parceiros e feche os
            números; em três rolas ele começa a falar.
          </p>
          <Button asChild size="sm" className="mt-4 gap-1">
            <Link to="/diario">
              <Icone.adicionar className="h-4 w-4" /> Registrar treino
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grafico = (
    <HexagonoDoJogo
      className="mt-2"
      agora={notasDe(h)}
      rotuloAgora={`${SEMANAS_DA_JANELA} semanas`}
      semDado={semDado}
    />
  );

  if (compacto) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <Link to="/metas" className="tap block active:scale-[0.99]">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">Seu jogo</p>
                <p className="truncate text-xs text-muted-foreground">
                  Das últimas {SEMANAS_DA_JANELA} semanas de rola
                </p>
              </div>
              <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            {grafico}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <p className="text-sm font-bold">Seu jogo</p>
          <p className="text-xs text-muted-foreground">
            Calculado das suas rolas das últimas {SEMANAS_DA_JANELA} semanas.
          </p>

          {grafico}

          <div className="mt-4">
            <TabelaDoHexagono agora={notasDe(h)} rotuloAgora="Nota" semDado={semDado} />
          </div>

          {/* A régua, escrita. Um número que ninguém consegue explicar é um
              número que ninguém deveria usar. */}
          <details className="reveal mt-4">
            <summary className="cursor-pointer text-xs font-bold text-primary">
              Como esta nota é calculada?
            </summary>
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              <p>
                Ela não vem de auto-avaliação. Vem do que você registrou:
                passagens, raspadas, finalizações, e em que rola o ritmo caiu.
                Três coisas a tornam comparável:
              </p>
              <p>
                <strong className="text-foreground">A faixa do parceiro.</strong> Ser
                finalizado por um preta quando você é branca é o esperado, e quase
                não conta contra. Ser finalizado por quem está abaixo pesa o dobro.
                Vale até dois degraus de diferença.
              </p>
              <p>
                <strong className="text-foreground">O tamanho da amostra.</strong> Com
                poucas rolas a nota fica perto do meio da escala e vai se afastando
                conforme você registra. Uma noite boa não faz um 5 — e é por isso
                que ela merece confiança.
              </p>
              <p>
                <strong className="text-foreground">O tempo.</strong> As últimas
                semanas pesam mais; o que tem quatro semanas pesa metade. Quem para
                de passar guarda vê a passagem cair sozinha.
              </p>
              <p>
                A idade entra só no gás — segurar o ritmo aos 45 vale mais que aos
                20.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>

      <Plano h={h} faixa={perfil?.belt} />
    </div>
  );
}
