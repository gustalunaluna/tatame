import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { acentoDaFaixa } from "@/lib/faixa-cores";
import {
  avisoDaFaixa,
  contagemDoExame,
  escoposDaFaixa,
  escopoPadrao,
  FAIXAS_ALVO,
  type FaixaAlvo,
} from "@/lib/exame-de-faixa.ts";

/**
 * O gerador: escolhe a faixa, gera o exame.
 *
 * Mora aqui, e não dentro da tela de exames, porque é usado nos dois lugares —
 * na aba Graduação, onde "fazer o simulado" é uma das coisas que se faz, e na
 * própria tela de exames, onde é a primeira. Duas cópias divergiriam na
 * primeira vez que o texto mudasse.
 *
 * `depoisDeGerar` existe para quem gera de FORA da tela de exames: gerar e
 * ficar parado na mesma tela deixaria a pessoa sem saber para onde o exame
 * foi.
 */
export function GerarExameDeFaixa({
  aoGerar,
  depoisDeGerar,
  titulo = "Gerar exame de faixa",
}: {
  aoGerar: (faixa: FaixaAlvo, escopo: string) => Promise<boolean>;
  depoisDeGerar?: () => void;
  titulo?: string;
}) {
  const [faixaAlvo, setFaixaAlvo] = useState<FaixaAlvo>("Azul");
  const [escopo, setEscopo] = useState<string>(escopoPadrao("Azul"));
  const [gerando, setGerando] = useState(false);

  const escopos = escoposDaFaixa(faixaAlvo);
  // Trocar de faixa pode invalidar o escopo escolhido — a azul não tem "3º e
  // 4º grau". Cair no padrão da faixa nova é o que impede o botão de gerar
  // com uma combinação que não existe.
  const escopoValido = escopos?.includes(escopo) ? escopo : escopoPadrao(faixaAlvo);
  const contagem = contagemDoExame(faixaAlvo, escopoValido);
  const aviso = avisoDaFaixa(faixaAlvo, escopoValido);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-bold">{titulo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cada geração varia as perguntas — mesmo syllabus, formulações diferentes.
          </p>
        </div>

        <Select
          value={faixaAlvo}
          onValueChange={(v) => {
            setFaixaAlvo(v as FaixaAlvo);
            setEscopo(escopoPadrao(v as FaixaAlvo));
          }}
        >
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
                  {f === "Azul" ? "Branca" : "Azul"} → {f}
                  {contagemDoExame(f) === null && (
                    <span className="text-muted-foreground">(em breve)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* O escopo só aparece onde há escolha a fazer. A folha da azul tem um
            só; a da roxa divide por grau. */}
        {escopos && escopos.length > 1 && (
          <Select value={escopoValido} onValueChange={setEscopo}>
            <SelectTrigger aria-label="O que o exame cobra">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {escopos.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {contagem === null ? (
          <p className="text-xs text-muted-foreground">
            Ainda não tenho o syllabus de {faixaAlvo} — só branca → azul e
            azul → roxa estão prontos.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Vai gerar {contagem} perguntas, cada uma com um gabarito para você
            conferir depois de responder.
          </p>
        )}

        {aviso && (
          <p className="rounded-lg bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
            {aviso}
          </p>
        )}

        <Button
          disabled={contagem === null || gerando}
          onClick={async () => {
            setGerando(true);
            const deuCerto = await aoGerar(faixaAlvo, escopoValido);
            setGerando(false);
            if (deuCerto) depoisDeGerar?.();
          }}
        >
          {gerando ? "Gerando…" : "Gerar exame"}
        </Button>
      </CardContent>
    </Card>
  );
}
