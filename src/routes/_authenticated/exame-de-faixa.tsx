import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Confirmar } from "@/components/Confirmar";
import { GerarExameDeFaixa } from "@/components/GerarExameDeFaixa";
import {
  avisoDaFaixa,
  ESCOPO_FAIXA,
  NOME_DA_CATEGORIA,
  type Categoria,
  type Pergunta,
  type ResumoDoExame,
  type VereditoDoExame,
} from "@/lib/exame-de-faixa.ts";
import {
  progressoDoExame,
  resultadoDoExame,
  useMeusExamesDeFaixa,
  vereditoDo,
  type ExameDeFaixa,
} from "@/lib/exame-de-faixa-storage.ts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/exame-de-faixa")({
  head: () => ({
    meta: [
      { title: "Exame de faixa — Ponteira" },
      {
        name: "description",
        content: "Gere um exame a partir do syllabus da sua academia e responda no seu ritmo.",
      },
    ],
  }),
  component: ExameDeFaixaPage,
});

const CATEGORIAS_EM_ORDEM: Categoria[] = [
  "defesas",
  "cambalhotas",
  "posturas",
  "projecoes",
  "quedas",
  "posicoes",
  "drills",
];

/** "Branca → Azul" / "Azul → Roxa · 1º e 2º grau" */
function tituloDoExame(exame: ExameDeFaixa): string {
  const de = exame.faixaAlvo === "Azul" ? "Branca" : "Azul";
  const rota = `${de} → ${exame.faixaAlvo}`;
  return exame.escopo === ESCOPO_FAIXA ? rota : `${rota} · ${exame.escopo}`;
}

function agruparPorCategoria(perguntas: Pergunta[]): [Categoria, Pergunta[]][] {
  return CATEGORIAS_EM_ORDEM.map(
    (categoria): [Categoria, Pergunta[]] => [
      categoria,
      perguntas.filter((p) => p.categoria === categoria),
    ],
  ).filter(([, itens]) => itens.length > 0);
}

/* ------------------------------------------------------------------ */

/**
 * A nota de corte da folha, quando a folha tem uma.
 *
 * Enquanto sobrar pergunta em branco ou por conferir, isto mostra quanto
 * FALTA — nunca um veredito. Dizer "reprovado" para quem respondeu metade
 * seria dizer uma coisa falsa, e dizer "aprovado" antes do fim é pior.
 */
function Veredito({ v, resumo }: { v: VereditoDoExame; resumo: ResumoDoExame }) {
  const pct = Math.round((resumo.aproveitamento ?? 0) * 100);
  const minimo = Math.round(v.minimo * 100);

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        v.aprovado === true && "border-primary/60 bg-primary/10",
        v.aprovado === false && "border-destructive/40 bg-destructive/5",
        v.aprovado === null && "border-border/60 bg-muted/30",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={cn(
            "text-sm font-black",
            v.aprovado === true && "text-primary",
            v.aprovado === false && "text-destructive",
          )}
        >
          {v.aprovado === true
            ? `Passou — ${pct}%`
            : v.aprovado === false
              ? `Não passou — ${pct}%`
              : `${pct}% até agora`}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          mínimo {minimo}%
        </p>
      </div>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {v.aprovado === null ? (
          <>
            Ainda faltam {resumo.emBranco + resumo.porConferir} de {resumo.total}.
            {v.faltamParaPassar > 0 && (
              <> Você precisa de mais {v.faltamParaPassar} certas para bater os {minimo}%.</>
            )}
          </>
        ) : v.aprovado ? (
          "Pelo seu próprio julgamento contra o gabarito. Quem avalia de verdade é o professor."
        ) : (
          `Faltaram ${v.faltamParaPassar} certas. A lista de revisão está logo abaixo.`
        )}
      </p>
    </div>
  );
}

/**
 * O placar: certas, erradas, por conferir, em branco — numa linha, sempre
 * visível quando há pelo menos uma resposta no exame. É o "como fui" que foi
 * pedido, atualizando sozinho conforme o atleta marca cada pergunta.
 */
function Placar({ resumo }: { resumo: ResumoDoExame }) {
  const avaliadas = resumo.certas + resumo.erradas;
  if (avaliadas === 0 && resumo.porConferir === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-1.5 text-center">
      <div className="rounded-lg bg-primary/10 p-2">
        <span className="block text-base font-black tabular-nums text-primary">
          {resumo.certas}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">certas</span>
      </div>
      <div className="rounded-lg bg-destructive/10 p-2">
        <span className="block text-base font-black tabular-nums text-destructive">
          {resumo.erradas}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">erradas</span>
      </div>
      <div className="rounded-lg bg-muted/50 p-2">
        <span className="block text-base font-black tabular-nums">{resumo.porConferir}</span>
        <span className="text-[0.65rem] text-muted-foreground">por conferir</span>
      </div>
      <div className="rounded-lg bg-muted/50 p-2">
        <span className="block text-base font-black tabular-nums text-muted-foreground">
          {resumo.emBranco}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">em branco</span>
      </div>
    </div>
  );
}

/** Os itens marcados "não acertei" — a lista de revisão, com o gabarito ao lado. */
function ParaRever({ itens }: { itens: ResumoDoExame["paraRever"] }) {
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-destructive">
        Para rever
      </p>
      {itens.map((it) => (
        <div key={it.item} className="text-xs leading-relaxed">
          <span className="font-semibold">{it.item}</span>
          <span className="text-muted-foreground"> — {it.gabarito}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CampoDeResposta({
  pergunta,
  aoSalvar,
  aoAutoavaliar,
}: {
  pergunta: Pergunta;
  aoSalvar: (resposta: string) => void;
  aoAutoavaliar: (acertou: boolean) => void;
}) {
  const [texto, setTexto] = useState(pergunta.resposta);

  // O gabarito só aparece depois de responder — ver antes vira cola, não
  // autoavaliação. `pergunta.respondida` é a fonte da verdade (vem do
  // banco); `texto` é o rascunho local ainda não salvo.
  const podeVerGabarito = pergunta.respondida && texto === pergunta.resposta;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border-l-2 pl-2.5",
        pergunta.acertou === true && "border-l-primary",
        pergunta.acertou === false && "border-l-destructive",
        pergunta.acertou === null && "border-l-transparent",
      )}
    >
      {/* O item é etiqueta, a pergunta é a pergunta.
          Emendados numa linha só ("01 — Reposição dos 100 kg para guarda
          fechada (para fora), meia emborcada — Ele te achatou nos 100 kg...")
          o olho não achava onde a etiqueta terminava e o enunciado começava.
          Separados, o item vira o que ele é: o número da folha, para achar a
          posição no papel da academia. */}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {pergunta.item}
      </p>
      <p className="text-sm leading-snug">{pergunta.pergunta}</p>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          if (texto !== pergunta.resposta) aoSalvar(texto);
        }}
        placeholder="Escreva sua resposta…"
        rows={2}
      />

      {podeVerGabarito && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Gabarito — </span>
            {pergunta.gabarito}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => aoAutoavaliar(true)}
              aria-pressed={pergunta.acertou === true}
              className={cn(
                "tap flex-1 rounded-lg border py-1.5 text-xs font-bold active:scale-95",
                pergunta.acertou === true
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              Acertei
            </button>
            <button
              onClick={() => aoAutoavaliar(false)}
              aria-pressed={pergunta.acertou === false}
              className={cn(
                "tap flex-1 rounded-lg border py-1.5 text-xs font-bold active:scale-95",
                pergunta.acertou === false
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              Não acertei
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartaoDeExame({
  exame,
  aoResponder,
  aoAutoavaliar,
  aoApagar,
}: {
  exame: ExameDeFaixa;
  aoResponder: (perguntaId: string, resposta: string) => void;
  aoAutoavaliar: (perguntaId: string, acertou: boolean) => void;
  aoApagar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const { feitas, total } = progressoDoExame(exame);
  const resumo = resultadoDoExame(exame);
  const grupos = agruparPorCategoria(exame.perguntas);
  const avaliadas = resumo.certas + resumo.erradas;
  const veredito = vereditoDo(exame);
  const aviso = avisoDaFaixa(exame.faixaAlvo, exame.escopo);

  return (
    <Card>
      <CardContent className="p-4">
        <button
          className="tap flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold">{tituloDoExame(exame)}</p>
            <p className="text-xs text-muted-foreground">
              {exame.criadoEm.slice(0, 10).split("-").reverse().join("/")}
              {" · "}
              {avaliadas > 0
                ? `${resumo.certas} certas, ${resumo.erradas} erradas`
                : `${feitas} de ${total} respondidas`}
            </p>
          </div>
          {aberto ? (
            <Icone.recolher className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Icone.expandir className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {aberto && (
          <div className="mt-4 flex flex-col gap-5">
            {veredito && <Veredito v={veredito} resumo={resumo} />}
            <Placar resumo={resumo} />
            <ParaRever itens={resumo.paraRever} />

            {aviso && (
              <p className="rounded-lg bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
                {aviso}
              </p>
            )}

            {grupos.map(([categoria, perguntas]) => (
              <div key={categoria} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {NOME_DA_CATEGORIA[categoria]}
                </p>
                {perguntas.map((p) => (
                  <CampoDeResposta
                    key={p.id}
                    pergunta={p}
                    aoSalvar={(resposta) => aoResponder(p.id, resposta)}
                    aoAutoavaliar={(acertou) => aoAutoavaliar(p.id, acertou)}
                  />
                ))}
              </div>
            ))}

            <Confirmar
              gatilho={
                <button className="tap self-start text-xs font-semibold text-muted-foreground hover:text-destructive">
                  Apagar este exame
                </button>
              }
              titulo="Apagar este exame?"
              descricao="As respostas escritas somem junto. Não dá para desfazer."
              destrutivo
              aoConfirmar={aoApagar}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function ExameDeFaixaPage() {
  const { exames, ready, gerar, apagar, responder, autoavaliar } = useMeusExamesDeFaixa();

  return (
    <PageShell
      title="Exame de faixa"
      subtitle="Do syllabus da sua academia — cada geração varia as perguntas."
    >
      <GerarExameDeFaixa aoGerar={gerar} />

      {ready && exames.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.listaDeTecnicas className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhum exame gerado ainda. Escolha a faixa acima e gere o primeiro.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {exames.map((exame) => (
          <CartaoDeExame
            key={exame.id}
            exame={exame}
            aoResponder={(perguntaId, resposta) => void responder(exame.id, perguntaId, resposta)}
            aoAutoavaliar={(perguntaId, acertou) =>
              void autoavaliar(exame.id, perguntaId, acertou)
            }
            aoApagar={() => void apagar(exame.id)}
          />
        ))}
      </div>
    </PageShell>
  );
}
