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
} from "@/lib/exame-de-faixa.ts";
import {
  progressoDoExame,
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
            as dezenove projeções e as quatro quedas.
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

function CampoDeResposta({
  pergunta,
  aoSalvar,
}: {
  pergunta: Pergunta;
  aoSalvar: (resposta: string) => void;
}) {
  const [texto, setTexto] = useState(pergunta.resposta);

  return (
    <div className="flex flex-col gap-1.5">
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
        className={cn(pergunta.respondida && "border-primary/40")}
      />
    </div>
  );
}

function CartaoDeExame({
  exame,
  aoResponder,
  aoApagar,
}: {
  exame: ExameDeFaixa;
  aoResponder: (perguntaId: string, resposta: string) => void;
  aoApagar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const { feitas, total } = progressoDoExame(exame);
  const grupos = agruparPorCategoria(exame.perguntas);

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
              {feitas} de {total} respondidas
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
  const { exames, ready, gerar, apagar, responder } = useMeusExamesDeFaixa();

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
            aoApagar={() => void apagar(exame.id)}
          />
        ))}
      </div>
    </PageShell>
  );
}
