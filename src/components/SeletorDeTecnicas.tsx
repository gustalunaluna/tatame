import { useMemo, useState } from "react";
import { Icone } from "@/design/icones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TECHNIQUE_CATEGORIES } from "@/lib/bjj-types";
import { chaveDaTecnica } from "@/lib/chave-da-tecnica";
import {
  useGaleriaDeTecnicas,
  desdeQuando,
  type RascunhoTecnica,
} from "@/lib/tecnicas-storage";
import { cn } from "@/lib/utils";

/* ==================================================================
   O DIÁLOGO — uma técnica por vez, com espaço para descrever
   ================================================================== */

function AnotarTecnica({
  jaEscolhidas,
  inicial,
  aoFechar,
  aoSalvar,
}: {
  jaEscolhidas: Set<string>;
  /** Preenchido quando se está editando uma que já foi anotada. */
  inicial?: RascunhoTecnica;
  aoFechar: () => void;
  aoSalvar: (t: RascunhoTecnica) => void;
}) {
  const { tecnicas } = useGaleriaDeTecnicas();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [categoria, setCategoria] = useState(inicial?.categoria ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");

  const chave = chaveDaTecnica(nome);
  const editando = Boolean(inicial);

  // Sugere a partir da segunda letra. Quem já tem "Armlock" toca no que existe
  // em vez de criar "armlock" — e mesmo se criar, o banco dedupe por nome
  // normalizado. A sugestão é para a pessoa não ter o trabalho, não para o
  // banco não ter o problema.
  const sugestoes = useMemo(() => {
    if (chave.length < 2) return [];
    return tecnicas
      .filter(
        (t) =>
          chaveDaTecnica(t.name).includes(chave) &&
          chaveDaTecnica(t.name) !== chave &&
          (editando || !jaEscolhidas.has(chaveDaTecnica(t.name))),
      )
      .slice(0, 4);
  }, [tecnicas, chave, jaEscolhidas, editando]);

  const naGaleria = tecnicas.find((t) => chaveDaTecnica(t.name) === chave);
  const repetida = !editando && chave.length >= 2 && jaEscolhidas.has(chave);
  const podeSalvar = chave.length >= 2 && !repetida;

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar técnica" : "Técnica do dia"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="tecnica-nome">Nome</Label>
            <Input
              id="tecnica-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: armlock da guarda fechada"
              autoComplete="off"
            />

            {naGaleria && (
              <p className="mt-1.5 text-xs text-primary">
                Já está na sua galeria · {desdeQuando(naGaleria.ultimaVez)}
              </p>
            )}
            {repetida && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Essa já está neste treino.
              </p>
            )}

            {sugestoes.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {sugestoes.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setNome(s.name);
                        if (!categoria) setCategoria(s.category);
                      }}
                      className="tap flex w-full items-center gap-2 rounded-xl border border-border/60 p-2.5 text-left active:scale-[0.99]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{s.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[s.category || "sem categoria", desdeQuando(s.ultimaVez)].join(
                            " · ",
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-primary">
                        já tenho
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label htmlFor="tecnica-nota">Como foi</Label>
            <Textarea
              id="tecnica-nota"
              rows={4}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="O detalhe que fez funcionar, o que travou, de onde entrou…"
            />
            {/* Por que a nota é do dia e não da técnica: se fosse da técnica, a
                anotação de hoje apagaria a de três semanas atrás — e é a
                sequência delas que conta como você aprendeu aquilo. */}
            <p className="mt-1 text-xs text-muted-foreground">
              Fica guardado neste treino. A galeria junta o que você escreveu em
              cada um, na ordem.
            </p>
          </div>

          <div>
            <Label>Categoria</Label>
            <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
              Opcional — dá para escolher depois, na galeria.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TECHNIQUE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(categoria === c ? "" : c)}
                  className={cn(
                    "tap rounded-full border px-3 py-1.5 text-xs font-bold active:scale-95",
                    categoria === c
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!podeSalvar}
            onClick={() => {
              aoSalvar({
                id: inicial?.id,
                nome: nome.trim(),
                categoria,
                nota: nota.trim(),
              });
              aoFechar();
            }}
          >
            {editando ? "Salvar alterações" : "Adicionar ao treino"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ==================================================================
   O BOTÃO E A LISTA
   ================================================================== */

/**
 * As técnicas do dia — um botão, e a lista do que foi anotado.
 *
 * A primeira versão disto era um campo de busca solto no meio do formulário de
 * treino, com sugestões aparecendo enquanto se digita. Duas coisas erradas:
 *
 * **Mexia no formulário que já funcionava.** Registrar treino é a tarefa mais
 * repetida do app e estava resolvida. Campo novo com comportamento novo no
 * meio do caminho é atrito onde não havia.
 *
 * **Não deixava descrever nada.** Dava para dizer o NOME e mais nada — e o que
 * vale guardar de um treino não é que você viu armlock, é o detalhe que fez o
 * armlock sair naquele dia.
 *
 * Agora é um botão. Quem não quer anotar técnica não vê nada além dele; quem
 * quer abre um diálogo com espaço de verdade para escrever.
 */
export function SeletorDeTecnicas({
  valor,
  aoMudar,
}: {
  valor: RascunhoTecnica[];
  aoMudar: (t: RascunhoTecnica[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<RascunhoTecnica | null>(null);

  const jaEscolhidas = useMemo(
    () => new Set(valor.map((t) => chaveDaTecnica(t.nome))),
    [valor],
  );

  function salvar(t: RascunhoTecnica) {
    // Editando: troca no lugar, e a chave de comparação é a ANTIGA — a pessoa
    // pode ter corrigido o nome, e procurar pela nova não acharia a linha.
    if (editando) {
      const anterior = chaveDaTecnica(editando.nome);
      aoMudar(valor.map((x) => (chaveDaTecnica(x.nome) === anterior ? t : x)));
      return;
    }
    if (jaEscolhidas.has(chaveDaTecnica(t.nome))) return;
    aoMudar([...valor, t]);
  }

  function tirar(nome: string) {
    aoMudar(valor.filter((t) => chaveDaTecnica(t.nome) !== chaveDaTecnica(nome)));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>Técnicas do dia</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => {
            setEditando(null);
            setAberto(true);
          }}
        >
          <Icone.adicionar className="h-4 w-4" /> Adicionar técnica
        </Button>
      </div>

      {valor.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          O que você aprendeu hoje vai para a sua galeria de técnicas.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {valor.map((t) => (
            <li
              key={chaveDaTecnica(t.nome)}
              className="flex items-start gap-2 rounded-xl border border-border/60 p-2.5"
            >
              <button
                type="button"
                onClick={() => {
                  setEditando(t);
                  setAberto(true);
                }}
                className="tap min-w-0 flex-1 text-left active:scale-[0.99]"
              >
                <span className="block truncate text-sm font-bold">{t.nome}</span>
                {t.categoria && (
                  <span className="block text-xs uppercase tracking-wider text-primary">
                    {t.categoria}
                  </span>
                )}
                {t.nota && (
                  <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                    {t.nota}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => tirar(t.nome)}
                aria-label={`Tirar ${t.nome} deste treino`}
                className="tap grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive active:scale-90"
              >
                <Icone.fechar className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <AnotarTecnica
          jaEscolhidas={jaEscolhidas}
          inicial={editando ?? undefined}
          aoFechar={() => {
            setAberto(false);
            setEditando(null);
          }}
          aoSalvar={salvar}
        />
      )}
    </div>
  );
}
