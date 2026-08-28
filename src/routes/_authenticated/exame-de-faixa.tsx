import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Confirmar } from "@/components/Confirmar";
import { acentoDaFaixa } from "@/lib/faixa-cores";
import {
  contagemDoExame,
  NOME_DA_CATEGORIA,
  FAIXAS_ALVO,
  type Categoria,
  type FaixaAlvo,
  type Pergunta,
  type ResumoDoExame,
} from "@/lib/exame-de-faixa.ts";
import {
  progressoDoExame,
  resultadoDoExame,
  useMeusExamesDeFaixa,
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
];

function agruparPorCategoria(perguntas: Pergunta[]): [Categoria, Pergunta[]][] {
  return CATEGORIAS_EM_ORDEM.map(
    (categoria): [Categoria, Pergunta[]] => [
      categoria,
      perguntas.filter((p) => p.categoria === categoria),
    ],
  ).filter(([, itens]) => itens.length > 0);
}

/* ------------------------------------------------------------------ */

function GerarExame({ aoGerar }: { aoGerar: (faixa: FaixaAlvo) => Promise<boolean> }) {
  const [faixaAlvo, setFaixaAlvo] = useState<FaixaAlvo>("Azul");
  const [gerando, setGerando] = useState(false);
  const contagem = contagemDoExame(faixaAlvo);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-bold">Gerar exame de faixa</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cada geração varia as perguntas — mesmo syllabus, formulações diferentes.
          </p>
        </div>

        <Select value={faixaAlvo} onValueChange={(v) => setFaixaAlvo(v as FaixaAlvo)}>
          <SelectTrigger aria-label="Faixa que quero graduar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAIXAS_ALVO.map((f) => (
              <SelectItem key={f} value={f}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: acentoDaFaixa(f) }}
                  />
                  Branca → {f}
                  {contagemDoExame(f) === null && (
                    <span className="text-muted-foreground">(em breve)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {contagem === null ? (
          <p className="text-xs text-muted-foreground">
            Ainda não tenho o syllabus de {faixaAlvo} — só branca → azul está pronto.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Vai gerar {contagem} perguntas, cobrindo defesas, cambalhotas, postura,
            as dezenove projeções e as quatro quedas — cada uma com um gabarito
            para você conferir depois de responder.
          </p>
        )}

        <Button
          disabled={contagem === null || gerando}
          onClick={async () => {
            setGerando(true);
            await aoGerar(faixaAlvo);
            setGerando(false);
          }}
        >
          {gerando ? "Gerando…" : "Gerar exame"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

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
      <p className="text-sm leading-snug">
        <span className="font-semibold">{pergunta.item}</span>
        {" — "}
        <span className="text-muted-foreground">{pergunta.pergunta}</span>
      </p>
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

  return (
    <Card>
      <CardContent className="p-4">
        <button
          className="tap flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold">Branca → {exame.faixaAlvo}</p>
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
            <Placar resumo={resumo} />
            <ParaRever itens={resumo.paraRever} />

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
      <GerarExame aoGerar={gerar} />

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
