import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import {
  CORES_DE_CABELO,
  CORES_DE_KIMONO,
  CORES_DE_OLHOS,
  ESTILOS_DE_BARBA,
  ESTILOS_DE_CABELO,
  KIMONOS,
  PATCHES,
  PELES,
  type Avatar as DadosDoAvatar,
  type PatchId,
} from "@/design/avatar";
import type { Faixa } from "@/lib/bjj-types";
import { cn } from "@/lib/utils";

/**
 * O editor do retrato.
 *
 * O avatar fica grande e FIXO no topo enquanto se escolhe: cada toque muda
 * alguma coisa nele, e um editor onde o resultado sai da tela ao rolar obriga
 * a subir e descer para conferir cada escolha.
 *
 * As mudanças são aplicadas na hora, em memória, e só vão para o banco quando
 * a pessoa confirma — dá para experimentar sem gravar seis versões.
 */

const ID_DE_PATCH = Object.keys(PATCHES) as PatchId[];

export function EditorDeAvatar({
  inicial,
  belt,
  degrees,
  aoSalvar,
  salvando,
}: {
  inicial: DadosDoAvatar;
  belt?: Faixa | null;
  degrees?: number;
  aoSalvar: (a: DadosDoAvatar) => void;
  salvando?: boolean;
}) {
  const [a, setA] = useState<DadosDoAvatar>(inicial);
  const muda = <K extends keyof DadosDoAvatar>(k: K, v: DadosDoAvatar[K]) =>
    setA((atual) => ({ ...atual, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      {/* Fica grudado no topo do diálogo: cada toque muda o retrato, e um
          editor onde o resultado sai da tela ao rolar obriga a subir e descer
          para conferir cada escolha. `--z-grudado` é o degrau mais baixo da
          escala — só precisa passar por cima dos irmãos, não do app. */}
      <div
        className="sticky top-0 -mx-1 flex flex-col items-center gap-2 bg-popover/95 px-1 pb-3 pt-1 backdrop-blur"
        style={{ zIndex: "var(--z-grudado)" }}
      >
        <Avatar
          dados={a}
          belt={belt}
          degrees={degrees}
          className="h-32 w-32"
          titulo="Prévia do seu avatar"
        />
        {belt && (
          <p className="text-center text-xs text-muted-foreground">
            O aro é a sua faixa: {belt}
            {degrees ? ` · ${degrees}º grau` : ""}. Ela vem do seu perfil, não
            se escolhe aqui.
          </p>
        )}
      </div>

      <Grupo titulo="Pele">
        <Cores
          cores={PELES}
          escolhido={a.pele}
          aoEscolher={(i) => muda("pele", i)}
          rotulo={(i) => `Tom de pele ${i + 1}`}
        />
      </Grupo>

      <Grupo titulo="Cabelo">
        <Pilulas
          opcoes={ESTILOS_DE_CABELO}
          escolhido={a.cabelo}
          aoEscolher={(id) => muda("cabelo", id)}
        />
        <Cores
          cores={CORES_DE_CABELO}
          escolhido={a.corDoCabelo}
          aoEscolher={(i) => muda("corDoCabelo", i)}
          rotulo={(i) => `Cor de cabelo ${i + 1}`}
          className="mt-2"
        />
      </Grupo>

      <Grupo titulo="Barba">
        <Pilulas
          opcoes={ESTILOS_DE_BARBA}
          escolhido={a.barba}
          aoEscolher={(id) => muda("barba", id)}
        />
      </Grupo>

      <Grupo titulo="Olhos">
        <Cores
          cores={CORES_DE_OLHOS}
          escolhido={a.olhos}
          aoEscolher={(i) => muda("olhos", i)}
          rotulo={(i) => `Cor dos olhos ${i + 1}`}
        />
      </Grupo>

      <Grupo titulo="Kimono">
        <Pilulas
          opcoes={CORES_DE_KIMONO}
          escolhido={a.kimono}
          aoEscolher={(id) => muda("kimono", id)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Branco, azul e preto — as três cores que a IBJJF aceita em competição.
        </p>
      </Grupo>

      <Grupo titulo="Patches">
        <p className="mb-2 text-xs text-muted-foreground">
          Um no ombro, um no peito.
        </p>
        <EscolhaDePatch
          rotulo="Ombro"
          escolhido={a.patches[0]}
          aoEscolher={(id) => muda("patches", [id, a.patches[1]])}
        />
        <EscolhaDePatch
          rotulo="Peito"
          escolhido={a.patches[1]}
          aoEscolher={(id) => muda("patches", [a.patches[0], id])}
          className="mt-3"
        />
      </Grupo>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={salvando}
        onClick={() => aoSalvar(a)}
      >
        {salvando ? "Salvando…" : "Usar este avatar"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`grupo-${titulo}`}>
      <h3 id={`grupo-${titulo}`} className="mb-2 text-sm font-bold">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Cores({
  cores,
  escolhido,
  aoEscolher,
  rotulo,
  className,
}: {
  cores: readonly string[];
  escolhido: number;
  aoEscolher: (i: number) => void;
  rotulo: (i: number) => string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {cores.map((cor, i) => (
        <button
          key={cor}
          type="button"
          onClick={() => aoEscolher(i)}
          aria-pressed={escolhido === i}
          aria-label={rotulo(i)}
          // 44px de alvo, como o resto do app. O quadrado colorido é menor
          // que o botão — o toque não precisa acertar a cor, só a área.
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl border-2 transition",
            escolhido === i ? "border-primary" : "border-transparent",
          )}
        >
          <span
            className="block h-7 w-7 rounded-lg ring-1 ring-black/20"
            style={{ background: cor }}
          />
        </button>
      ))}
    </div>
  );
}

function Pilulas<T extends string>({
  opcoes,
  escolhido,
  aoEscolher,
}: {
  opcoes: { id: T; nome: string }[];
  escolhido: T;
  aoEscolher: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => aoEscolher(o.id)}
          aria-pressed={escolhido === o.id}
          className={cn(
            "min-h-11 rounded-xl border px-3 text-sm font-semibold transition",
            escolhido === o.id
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:border-foreground/30",
          )}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

function EscolhaDePatch({
  rotulo,
  escolhido,
  aoEscolher,
  className,
}: {
  rotulo: string;
  escolhido: PatchId;
  aoEscolher: (id: PatchId) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs text-muted-foreground">{rotulo}</span>
      <div className="flex flex-wrap gap-2">
        {ID_DE_PATCH.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => aoEscolher(id)}
            aria-pressed={escolhido === id}
            className={cn(
              "min-h-11 rounded-xl border px-3 text-xs font-semibold transition",
              escolhido === id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30",
            )}
          >
            {PATCHES[id].nome}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Cores do kimono, exportadas para quem quiser mostrar a amostra. */
export { KIMONOS };
