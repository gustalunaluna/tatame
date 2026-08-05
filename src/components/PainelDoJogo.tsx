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
  derivarHexagonoDoPeriodo,
  limitesDoMes,
  mesesComRola,
  notasDe,
  eixosComDado,
  type HexagonoDerivado,
  type SinalDeRola,
} from "@/lib/hexagono-derivado";
import {
  useSinaisDoJogo,
  usePendenciasDaSemana,
  janelaRolante,
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

const NOMES_DE_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "2026-07" → "jul/26". Curto porque precisa caber numa fita de celular. */
function rotuloDoMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${NOMES_DE_MES[Number(m) - 1]}/${ano.slice(2)}`;
}

/** Quantas rolas com contador preenchido um mês tem. É o que sustenta a nota. */
function rolasDoMes(sinais: SinalDeRola[], mes: string): number {
  return sinais
    .filter((s) => s.detalhado && s.data.startsWith(mes))
    .reduce((n, s) => n + Math.max(1, s.rolas), 0);
}

/**
 * O hexágono calculado.
 *
 * `compacto` é a versão do Início: o desenho e a fita de meses, sem a tabela e
 * sem o plano — quem quer o detalhe toca e vai para Evolução.
 *
 * ------------------------------------------------------------------
 * A FITA DE MESES
 * ------------------------------------------------------------------
 * A comparação não é um segundo gráfico: acontece NESTE. Tocar um mês troca a
 * figura cheia; tocar um segundo sobrepõe o mais antigo em tracejado. Tocar
 * "8 semanas" volta ao padrão.
 *
 * Um gráfico separado só para comparar teria dois defeitos. O primeiro é de
 * leitura: obrigaria a pessoa a comparar duas figuras distantes na tela, que é
 * exatamente o que a sobreposição existe para evitar. O segundo é de verdade —
 * dois gráficos são duas contas, e duas contas divergem com o tempo.
 *
 * ------------------------------------------------------------------
 * DUAS CONTAS DIFERENTES, DE PROPÓSITO
 * ------------------------------------------------------------------
 * O padrão ("8 semanas") é uma leitura ROLANTE, com meia-vida de quatro
 * semanas: responde "como está meu jogo hoje", e o que aconteceu ontem pesa
 * mais que o de dois meses atrás.
 *
 * O mês escolhido é FECHADO e sem decaimento interno: dia 1 pesa igual a dia
 * 31. Se decaísse, "julho" viraria "o fim de julho" — e, pior, o mês mais
 * recente sempre pareceria mais forte só por ser mais recente, o que
 * destruiria a comparação. Ver `derivarHexagonoDoPeriodo`.
 */
export function PainelDoJogo({ compacto = false }: { compacto?: boolean }) {
  const { sinais, ready } = useSinaisDoJogo();
  const { perfil } = usePerfil();

  /** Vazio = leitura rolante. 1 mês = aquele mês. 2 = sobreposição. */
  const [selecao, setSelecao] = useState<string[]>([]);

  const meses = useMemo(() => mesesComRola(sinais), [sinais]);
  const pessoa = {
    faixa: String(perfil?.belt ?? "Branca"),
    idade: idadeDe(perfil?.birthDate),
  };

  function alternar(mes: string) {
    setSelecao((atual) => {
      if (atual.includes(mes)) return atual.filter((m) => m !== mes);
      // Dois é o teto: um terceiro polígono no mesmo hexágono vira rabisco.
      // O mais antigo sai para dar lugar ao que acabou de ser tocado.
      const proximo = [...atual, mes].sort().reverse();
      return proximo.slice(0, 2);
    });
  }

  // Mais novo em cima (cheio), mais antigo embaixo (tracejado) — sempre nessa
  // ordem, independente de qual foi tocado primeiro. "Antes" e "depois" são
  // uma propriedade das datas, não da ordem dos dedos.
  const [mesCheio, mesTracejado] = [...selecao].sort().reverse();

  const h = useMemo(
    () =>
      mesCheio
        ? derivarHexagonoDoPeriodo(
            sinais,
            pessoa,
            limitesDoMes(mesCheio).de,
            limitesDoMes(mesCheio).ate,
          )
        : derivarHexagono(janelaRolante(sinais), pessoa),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sinais, mesCheio, pessoa.faixa, pessoa.idade],
  );

  const hAntes = useMemo(
    () =>
      mesTracejado
        ? derivarHexagonoDoPeriodo(
            sinais,
            pessoa,
            limitesDoMes(mesTracejado).de,
            limitesDoMes(mesTracejado).ate,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sinais, mesTracejado, pessoa.faixa, pessoa.idade],
  );

  const semDado = EIXOS.filter((e) => !h[e.slug]?.temDado).map((e) => e.slug);
  const quantos = eixosComDado(h);
  const rotuloCheio = mesCheio
    ? rotuloDoMes(mesCheio)
    : `${SEMANAS_DA_JANELA} semanas`;

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

  const fita =
    meses.length > 0 ? (
      <FitaDeMeses
        meses={meses}
        selecao={selecao}
        aoAlternar={alternar}
        aoLimpar={() => setSelecao([])}
        rolasDo={(m) => rolasDoMes(sinais, m)}
      />
    ) : null;

  const grafico = (
    <HexagonoDoJogo
      className="mt-2"
      agora={notasDe(h)}
      rotuloAgora={rotuloCheio}
      antes={hAntes ? notasDe(hAntes) : null}
      rotuloAntes={mesTracejado ? rotuloDoMes(mesTracejado) : undefined}
      semDado={semDado}
    />
  );

  /** A frase que explica o que está desenhado agora. */
  const legenda = mesTracejado
    ? `${rotuloDoMes(mesTracejado)} por baixo, ${rotuloCheio} por cima.`
    : mesCheio
      ? `Só ${rotuloCheio}. Toque outro mês para sobrepor.`
      : `Das últimas ${SEMANAS_DA_JANELA} semanas de rola.`;

  if (compacto) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          {/* O link cobre só o cabeçalho. Antes ele envolvia o cartão inteiro,
              e com a fita de meses dentro isso viraria botão dentro de âncora:
              HTML inválido, e cada toque num mês navegaria para Evolução. */}
          <Link
            to="/metas"
            className="tap flex items-center justify-between gap-2 active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold">Seu jogo</p>
              <p className="truncate text-xs text-muted-foreground">{legenda}</p>
            </div>
            <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          {fita}
          {grafico}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <p className="text-sm font-bold">Seu jogo</p>
          <p className="text-xs text-muted-foreground">{legenda}</p>

          {fita}
          {grafico}

          {/* A amostra, escrita. Duas figuras sobrepostas convidam a concluir
              muito; saber que uma delas se apoia em quatro rolas é o que
              impede a conclusão de virar certeza. */}
          {mesCheio ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {rotuloCheio} tem <strong>{rolasDoMes(sinais, mesCheio)}</strong>{" "}
              {rolasDoMes(sinais, mesCheio) === 1 ? "rola" : "rolas"} com
              contador preenchido
              {mesTracejado
                ? `; ${rotuloDoMes(mesTracejado)} tem ${rolasDoMes(sinais, mesTracejado)}`
                : ""}
              .{" "}
              {Math.min(
                rolasDoMes(sinais, mesCheio),
                mesTracejado ? rolasDoMes(sinais, mesTracejado) : Infinity,
              ) < 10
                ? "Com amostra assim as notas ficam puxadas para o meio de propósito — leia a direção, não o número."
                : ""}
            </p>
          ) : null}

          <div className="mt-4">
            <TabelaDoHexagono
              agora={notasDe(h)}
              rotuloAgora={mesCheio ? rotuloCheio : "Nota"}
              antes={hAntes ? notasDe(hAntes) : null}
              rotuloAntes={mesTracejado ? rotuloDoMes(mesTracejado) : undefined}
              semDado={semDado}
            />
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

/* ================================================================== */

/**
 * A fita de meses acima do hexágono.
 *
 * Rola na horizontal porque um ano não cabe na largura de um celular, e o
 * primeiro item é sempre o padrão ("8 semanas") — quem tocou um mês por
 * curiosidade precisa de um caminho óbvio de volta, e "desmarcar tocando de
 * novo" não é óbvio para todo mundo.
 *
 * A contagem de rolas fica embaixo de cada mês, e não escondida: é ela que
 * diz se a figura que vai aparecer merece confiança. Um mês de quatro rolas e
 * um de trinta desenham com a mesma tinta, e só este número os separa.
 */
function FitaDeMeses({
  meses,
  selecao,
  aoAlternar,
  aoLimpar,
  rolasDo,
}: {
  meses: string[];
  selecao: string[];
  aoAlternar: (mes: string) => void;
  aoLimpar: () => void;
  rolasDo: (mes: string) => number;
}) {
  const rolante = selecao.length === 0;

  return (
    <div
      className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
      role="group"
      aria-label="Período do hexágono"
    >
      <button
        type="button"
        onClick={aoLimpar}
        aria-pressed={rolante}
        className={cn(
          "tap shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold",
          rolante
            ? "border-primary bg-primary/15 text-primary"
            : "border-border bg-card text-muted-foreground active:scale-[0.97]",
        )}
      >
        8 semanas
      </button>

      {meses.map((m) => {
        const marcado = selecao.includes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => aoAlternar(m)}
            aria-pressed={marcado}
            className={cn(
              "tap shrink-0 rounded-xl border px-3 py-1 text-center",
              marcado
                ? "border-primary bg-primary/15"
                : "border-border bg-card active:scale-[0.97]",
            )}
          >
            <span
              className={cn(
                "block text-xs font-bold",
                marcado ? "text-primary" : "text-muted-foreground",
              )}
            >
              {rotuloDoMes(m)}
            </span>
            <span className="block text-[0.625rem] leading-tight text-muted-foreground">
              {rolasDo(m)} {rolasDo(m) === 1 ? "rola" : "rolas"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
