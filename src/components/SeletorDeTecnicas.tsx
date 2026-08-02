import { useMemo, useState } from "react";
import { Icone } from "@/design/icones";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TECHNIQUE_CATEGORIES } from "@/lib/bjj-types";
import {
  useGaleriaDeTecnicas,
  chaveDaTecnica,
  desdeQuando,
  type RascunhoTecnica,
} from "@/lib/tecnicas-storage";
import { cn } from "@/lib/utils";

/**
 * O que você aprendeu hoje — e que vai para a galeria.
 *
 * Antes isto era um campo de texto livre: "DLR → costas, tesourinha". A frase
 * fica bonita no diário e não serve para mais nada — nenhuma tela consegue
 * responder "há quanto tempo eu não treino armlock" lendo prosa.
 *
 * Duas decisões que evitam que a galeria vire depósito:
 *
 * **1. Sugere antes de criar.** Digitar três letras mostra o que já existe na
 * galeria, com a última vez que apareceu num treino. Quem já tem "Armlock"
 * toca no que existe em vez de criar "armlock" de novo. E mesmo se criar, o
 * banco dedupe por nome normalizado — maiúscula, espaço e acento.
 *
 * **2. Categoria é opcional.** Obrigar a escolher entre sete categorias para
 * anotar uma técnica no fim do treino é atrito que faz a pessoa não anotar. E
 * técnica sem categoria é um buraco pequeno; técnica não registrada é um
 * buraco grande. A galeria mostra quais estão sem e deixa arrumar lá.
 */
export function SeletorDeTecnicas({
  valor,
  aoMudar,
}: {
  valor: RascunhoTecnica[];
  aoMudar: (t: RascunhoTecnica[]) => void;
}) {
  const { tecnicas } = useGaleriaDeTecnicas();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");

  const jaEscolhidas = useMemo(
    () => new Set(valor.map((t) => chaveDaTecnica(t.nome))),
    [valor],
  );

  const termo = chaveDaTecnica(busca);
  const sugestoes = useMemo(() => {
    if (termo.length < 2) return [];
    return tecnicas
      .filter(
        (t) =>
          chaveDaTecnica(t.name).includes(termo) &&
          !jaEscolhidas.has(chaveDaTecnica(t.name)),
      )
      .slice(0, 5);
  }, [tecnicas, termo, jaEscolhidas]);

  // Já existe alguma com exatamente este nome? Se sim, não oferecemos "criar".
  const existeIgual = tecnicas.some((t) => chaveDaTecnica(t.name) === termo);
  const podeCriar = termo.length >= 2 && !existeIgual && !jaEscolhidas.has(termo);

  function adicionar(nome: string, cat: string) {
    const chave = chaveDaTecnica(nome);
    if (chave.length < 2 || jaEscolhidas.has(chave)) return;
    aoMudar([...valor, { nome: nome.trim(), categoria: cat }]);
    setBusca("");
    setCategoria("");
  }

  function tirar(nome: string) {
    aoMudar(valor.filter((t) => chaveDaTecnica(t.nome) !== chaveDaTecnica(nome)));
  }

  return (
    <div>
      <Label htmlFor="tecnica-busca">Técnicas do dia</Label>
      <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
        Vão para a sua galeria. Se já estiver lá, o app liga na que existe em vez
        de criar outra.
      </p>

      {valor.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {valor.map((t) => (
            <li key={chaveDaTecnica(t.nome)}>
              <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-1 text-xs font-bold text-primary">
                {t.nome}
                <button
                  type="button"
                  onClick={() => tirar(t.nome)}
                  aria-label={`Tirar ${t.nome} deste treino`}
                  className="tap grid h-6 w-6 place-items-center rounded-full hover:bg-primary/20 active:scale-90"
                >
                  <Icone.fechar className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Input
        id="tecnica-busca"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          // Enter num formulário submeteria o diálogo inteiro. Aqui ele
          // adiciona a técnica, que é o que a pessoa está tentando fazer.
          e.preventDefault();
          const existente = tecnicas.find((t) => chaveDaTecnica(t.name) === termo);
          if (existente) adicionar(existente.name, existente.category);
          else if (podeCriar) adicionar(busca, categoria);
        }}
        placeholder="Ex.: armlock da guarda fechada"
        autoComplete="off"
      />

      {termo.length >= 2 && (
        <div className="mt-1.5 space-y-1">
          {sugestoes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => adicionar(s.name, s.category)}
              className="tap flex w-full items-center gap-2 rounded-xl border border-border/60 p-2.5 text-left active:scale-[0.99]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[s.category || "sem categoria", desdeQuando(s.ultimaVez)].join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-primary">já tenho</span>
            </button>
          ))}

          {podeCriar && (
            <>
              <button
                type="button"
                onClick={() => adicionar(busca, categoria)}
                className="tap flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/50 p-2.5 text-left active:scale-[0.99]"
              >
                <Icone.adicionar className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  Criar <strong>{busca.trim()}</strong> na galeria
                </span>
              </button>

              {/* Opcional, e por isso vem depois do botão e não antes: quem
                  quiser categorizar toca; quem não quiser, ignora. */}
              <div className="flex flex-wrap gap-1">
                {TECHNIQUE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(categoria === c ? "" : c)}
                    className={cn(
                      "tap rounded-full border px-2.5 py-1 text-[11px] font-bold active:scale-95",
                      categoria === c
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

          {!sugestoes.length && !podeCriar && existeIgual && (
            <p className="text-xs text-muted-foreground">
              Essa já está neste treino.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
