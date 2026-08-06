import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A foto de quem está na tela, com o que fazer quando ela não vem.
 *
 * Havia seis lugares desenhando isto à mão, com a mesma forma:
 *
 *     {perfil.photoUrl ? <img src={...} /> : <iniciais />}
 *
 * Que trata o caso "não tem foto" e ignora o caso "tem endereço de foto e ele
 * não carrega" — servidor fora, arquivo removido, aparelho sem rede. Aí quem
 * decide o que aparecer é o navegador, e o navegador desenha o texto
 * alternativo: no cartão do Início isso virava "Foto de Gustavo" em três
 * linhas, transbordando de um círculo de 64px.
 *
 * `onError` é o que faltava. Endereço quebrado passa a cair nas iniciais, que
 * é o mesmo destino de quem nunca mandou foto.
 *
 * `alt=""` de propósito: em todos os seis lugares o nome da pessoa está
 * escrito ao lado. Repeti-lo no leitor de tela não informa, atrapalha — e é
 * também o que impede o texto de vazar se um dia o `onError` não disparar.
 */

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function FotoDoAtleta({
  url,
  nome,
  className,
  classeDasIniciais,
}: {
  url?: string | null;
  nome?: string | null;
  /** Tamanho e forma vêm de quem chama: o cartão usa 2xl, a lista usa xl. */
  className?: string;
  classeDasIniciais?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const [semPersonagem, setSemPersonagem] = useState(false);
  const temFoto = Boolean(url) && !falhou;

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden bg-secondary",
        className,
      )}
    >
      {temFoto ? (
        <img
          src={url as string}
          alt=""
          loading="lazy"
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover"
        />
      ) : semPersonagem ? (
        /* Último recurso: o WebP não carregou. Letras são melhores que um
           buraco cinza, e é o mesmo desenho que existia aqui antes. */
        <span
          aria-hidden="true"
          className={cn(
            "font-black leading-none text-muted-foreground",
            classeDasIniciais ?? "text-sm",
          )}
        >
          {iniciais(nome ?? "") || "?"}
        </span>
      ) : (
        /**
         * Sem foto, entra o personagem do app — não mais as iniciais.
         *
         * A troca tem um preço, e ele é declarado: numa lista de atletas sem
         * foto todo mundo passa a ter a mesma cara, enquanto as iniciais
         * distinguiam. Foi decisão de projeto — o personagem é a identidade
         * visual do Ponteira, e quem quiser se distinguir manda a própria
         * foto, que continua vencendo o personagem sempre que existe.
         */
        <img
          src="/personagem/busto.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setSemPersonagem(true)}
          className="h-full w-full select-none object-cover"
          draggable={false}
        />
      )}
    </div>
  );
}
