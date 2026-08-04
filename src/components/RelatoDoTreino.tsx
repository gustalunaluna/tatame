import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * O relato do treino — o que a pessoa escreveu sobre o próprio dia.
 *
 * É o texto mais valioso do app e estava desenhado como nota de rodapé:
 * `text-xs italic text-muted-foreground`, ou seja, 12px, itálico e cor fraca.
 * Itálico corrido é o pior caso de legibilidade que existe, e 12px já era o
 * piso do app. Um relato de quinze linhas — que existe, e é o tipo de coisa
 * que faz um diário valer a pena — virava um bloco cinza que ninguém relê.
 *
 * Pior: sem `whitespace-pre-wrap` as quebras de linha que a pessoa digitou
 * eram achatadas. Quem escrevia em parágrafos recebia um muro.
 *
 * Aqui o relato ganha o tamanho do corpo do texto (14px), fica em pé, mantém
 * as quebras — e, quando é longo, começa recolhido. Um cartão de treino que
 * ocupa a tela inteira torna impossível varrer 130 treinos com o polegar.
 */

/** Acima disto o relato começa recolhido. Em ~14px dá umas seis linhas. */
const ALTURA_RECOLHIDO = 132;

export function RelatoDoTreino({
  texto,
  className,
}: {
  texto: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [transborda, setTransborda] = useState(false);
  const corpo = useRef<HTMLParagraphElement>(null);

  // Mede depois do desenho: só sabe se transborda quem já foi para a tela.
  // `useLayoutEffect` evita o pisca-pisca de aparecer o botão num segundo
  // quadro.
  useLayoutEffect(() => {
    const el = corpo.current;
    if (!el) return;
    setTransborda(el.scrollHeight > ALTURA_RECOLHIDO + 8);
  }, [texto]);

  if (!texto) return null;

  return (
    <div className={cn("mt-2", className)}>
      <p
        ref={corpo}
        // `whitespace-pre-wrap` é o que devolve os parágrafos de quem escreve
        // em parágrafos. Sem ele, tudo vira uma linha só.
        className={cn(
          "overflow-hidden whitespace-pre-wrap rounded-md border border-border/50 bg-background/40 p-3 text-sm leading-relaxed text-foreground/90",
          !aberto && transborda && "[mask-image:linear-gradient(to_bottom,black_60%,transparent)]",
        )}
        style={!aberto && transborda ? { maxHeight: ALTURA_RECOLHIDO } : undefined}
      >
        {texto}
      </p>

      {transborda && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="mt-1 rounded px-1 py-1 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {aberto ? "ver menos" : "ver mais"}
        </button>
      )}
    </div>
  );
}
