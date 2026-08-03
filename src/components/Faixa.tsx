import { cn } from "@/lib/utils";
import type { Faixa as TipoFaixa } from "@/lib/bjj-types";
import { tecidoDaFaixa } from "@/lib/faixa-cores";
import { nomeDaGraduacao, temListras } from "@/lib/graduacao";

/**
 * A faixa desenhada: o tecido, a ponteira e os graus.
 *
 * Da branca à preta o grau é uma listra branca na ponteira. Da coral em diante
 * NÃO HÁ LISTRA: o grau já está dito pela cor do tecido, e desenhar listra em
 * cima disso inventa uma graduação que não existe. Era o que a tela fazia —
 * uma faixa vermelha 9º grau aparecia com quatro listras brancas, como se
 * fosse "vermelha 4 graus".
 *
 * `compacta` reduz para caber em cartões-resumo.
 */
export function Faixa({
  belt,
  degrees,
  compacta = false,
  comTexto = true,
  cheia = false,
  className,
}: {
  belt: TipoFaixa;
  degrees: number;
  compacta?: boolean;
  comTexto?: boolean;
  /** Ocupa a largura disponível, em vez do tamanho fixo de cartão. */
  cheia?: boolean;
  className?: string;
}) {
  const comListra = temListras(belt);
  // A ponteira só comporta quatro listras. Da preta em diante o texto ao lado
  // diz o número de verdade — ver `nomeDaGraduacao`.
  const listras = comListra ? Math.max(0, Math.min(4, degrees)) : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-sm border border-white/15",
          compacta ? "h-3.5" : "h-5",
          // 56px no compacto, não 80px. No cartão do Início sobram ~92px para
          // o desenho MAIS o rótulo depois da foto e da seta, e "Branca ·
          // 3 graus" precisa de ~110px: com 80px de faixa o rótulo quebrava em
          // duas linhas e amassava a linha da academia logo abaixo. A ponteira
          // continua com 32px, então o que encolhe é só o tecido — e o
          // desenho segue legível como faixa.
          cheia ? "w-full" : compacta ? "w-14" : "w-28",
        )}
        role="img"
        aria-label={`Faixa ${nomeDaGraduacao(belt, degrees)}`}
      >
        <div className="h-full w-full" style={{ background: tecidoDe(belt, degrees) }} />

        {/* A ponteira preta com as listras. Só existe onde o grau é listra. */}
        {comListra && (
          <div
            className={cn(
              "absolute right-0 top-0 flex h-full items-center bg-neutral-900",
              compacta ? "w-8 gap-[2px] px-[3px]" : "w-11 gap-[3px] px-1",
            )}
          >
            {Array.from({ length: listras }, (_, i) => (
              <span
                key={i}
                className={cn("h-full bg-white", compacta ? "w-[3px]" : "w-1")}
              />
            ))}
          </div>
        )}
      </div>

      {/* `whitespace-nowrap`: o rótulo é curto e identifica a graduação —
          quebrá-lo entre "3" e "graus" não economiza espaço útil, só desalinha
          a linha. Se faltar largura, quem cede é o contêiner. */}
      {comTexto && (
        <span className="whitespace-nowrap text-xs font-bold">
          {belt}
          {degrees > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {nomeDaGraduacao(belt, degrees).replace(`${belt} `, "")}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/**
 * O tecido, incluindo os dois casos que não são cor única.
 *
 * A coral não é um degradê: é uma faixa tecida em barras alternadas, vermelha
 * com preta no 7º grau e vermelha com branca no 8º. Desenhar as barras é o que
 * faz alguém reconhecer a faixa de longe — que é justamente para o que ela
 * serve dentro de uma academia.
 */
function tecidoDe(belt: TipoFaixa, degrees: number): string {
  if (belt !== "Coral") return tecidoDaFaixa(belt);

  const par = degrees === 8 ? tecidoDaFaixa("Branca") : tecidoDaFaixa("Preta");
  const vermelho = tecidoDaFaixa("Coral");
  return (
    `repeating-linear-gradient(90deg, ${vermelho} 0 8px, ${par} 8px 16px)`
  );
}
