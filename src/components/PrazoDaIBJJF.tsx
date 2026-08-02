import { Icone } from "@/design/icones";
import { Card, CardContent } from "@/components/ui/card";
import { Faixa as DesenhoDaFaixa } from "@/components/Faixa";
import { nomeDaGraduacao } from "@/lib/graduacao";
import { previsao, emPortugues } from "@/lib/tempos-ibjjf";
import { useMinhasGraduacoes } from "@/lib/graduacao-storage";
import { usePerfil } from "@/lib/bjj-storage";
import { useMeuHandle } from "@/lib/social-storage";
import type { Faixa } from "@/lib/bjj-types";

/**
 * O prazo mínimo da IBJJF para o próximo degrau.
 *
 * Três cuidados que separam isto de um contador motivacional:
 *
 * **1. Não promete graduação.** Cumprir o tempo é condição necessária e não
 * suficiente — quem gradua é o professor, e o app não gradua ninguém (regra 1
 * do capítulo 01). A tela diz "libera o mínimo", nunca "você vai receber".
 *
 * **2. Diz quando NÃO existe prazo.** A IBJJF não fixa tempo de faixa-branca:
 * fixa idade, 16 anos. Um app que mostra "faltam 8 meses para a azul" para um
 * faixa-branca inventou uma regra. Aqui esse caso tem texto próprio.
 *
 * **3. Não calcula sem a data.** Sem a graduação registrada não há de onde
 * contar, e "não sei" é uma resposta melhor que zero. A tela pede o registro
 * em vez de fingir que tem o dado.
 */
export function PrazoDaIBJJF() {
  const { perfil } = usePerfil();
  const { handle } = useMeuHandle();
  const { graduacoes } = useMinhasGraduacoes(handle);

  if (!perfil) return null;

  const belt = perfil.belt as Faixa;
  const graus = Number(perfil.degrees ?? 0);

  // A data da graduação ATUAL — a última registrada que bate com a faixa e o
  // grau do perfil. Não serve a mais recente de todas: quem registrou uma
  // graduação antiga por último quebraria a conta.
  const daAtual = graduacoes
    .filter((g) => g.belt === belt && Number(g.degrees) === graus)
    .map((g) => g.data)
    .sort()
    .at(-1);

  const p = previsao(belt, graus, daAtual ?? null);
  if (!p) return null;

  const alvo = nomeDaGraduacao(p.degrau.faixa, p.degrau.grau);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icone.graduacao className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-bold">Próximo degrau: {alvo}</p>
        </div>

        <div className="mt-3">
          <DesenhoDaFaixa belt={p.degrau.faixa} degrees={p.degrau.grau} />
        </div>

        {/* --- não há prazo a cumprir --- */}
        {p.degrau.mesesMinimos === null ? (
          <p className="mt-3 text-sm text-muted-foreground">{p.degrau.regra}</p>
        ) : !daAtual ? (
          /* --- há prazo, mas falta a data --- */
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {p.degrau.regra}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Registre a data da sua {nomeDaGraduacao(belt, graus).toLowerCase()} em
              Graduações e esta conta passa a andar sozinha.
            </p>
          </>
        ) : (
          /* --- dá para contar --- */
          <>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={p.degrau.mesesMinimos}
              aria-valuenow={p.mesesFeitos ?? 0}
              aria-label={`Tempo mínimo cumprido para ${alvo}`}
            >
              <div
                className="bar-fill h-full rounded-full bg-primary"
                style={{
                  // translate em vez de width: não toca no layout, e a barra
                  // anima sem forçar recálculo de página.
                  width: "100%",
                  transform: `translateX(-${(1 - (p.fracao ?? 0)) * 100}%)`,
                }}
              />
            </div>

            <p className="mt-2 text-sm">
              {p.liberado ? (
                <>
                  Você já cumpriu o mínimo:{" "}
                  <strong>{emPortugues(p.mesesFeitos ?? 0)}</strong> na graduação
                  atual.
                </>
              ) : (
                <>
                  <strong>{emPortugues(p.mesesFaltando ?? 0)}</strong> para completar
                  o mínimo. Você tem {emPortugues(p.mesesFeitos ?? 0)}.
                </>
              )}
            </p>

            <p className="mt-1.5 text-xs text-muted-foreground">
              {p.degrau.regra}
            </p>

            {/* A ressalva não é letra miúda: é o ponto. */}
            <p className="mt-2 text-xs text-muted-foreground">
              {p.liberado
                ? "Tempo cumprido não é graduação. Quem gradua é o seu professor — isto aqui só diz que o prazo da federação não é mais o que segura."
                : "É o prazo mínimo da federação, não uma previsão. Quem gradua é o seu professor."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
