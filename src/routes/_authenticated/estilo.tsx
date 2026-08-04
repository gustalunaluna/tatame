import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { Icone } from "@/design/icones";
import { acentoDaFaixa } from "@/lib/faixa-cores";
import tokens from "@/design/tokens.json";
import type { Faixa } from "@/lib/bjj-types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { avatarSorteado, ESTILOS_DE_CABELO, CORES_DE_KIMONO, PATCHES, AVATAR_PADRAO, type PatchId } from "@/design/avatar";

const FAIXAS_DO_GUIA: Faixa[] = ["Branca","Azul","Roxa","Marrom","Preta","Coral","Vermelha"];

export const Route = createFileRoute("/_authenticated/estilo")({
  head: () => ({
    meta: [
      { title: "Estilo — Ponteira" },
      {
        name: "description",
        content: "O sistema de design do app: cores, ícones, movimento.",
      },
    ],
  }),
  component: EstiloPage,
});

const FAIXAS = Object.keys(tokens.cor.faixa) as Faixa[];

function Secao({ titulo, aviso, children }: {
  titulo: string;
  aviso?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {titulo}
      </h2>
      {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}
      {children}
    </section>
  );
}

/**
 * Guia de estilo vivo.
 *
 * Não é documentação: é o próprio app renderizando os próprios tokens. Se
 * alguém mudar `design/tokens.json`, esta tela muda junto — e é aqui que dá
 * para ver, de uma vez, se a mudança quebrou alguma coisa.
 *
 * A prévia de faixa troca `--faixa` só dentro do quadro, sem mexer no app.
 */
function EstiloPage() {
  const [previa, setPrevia] = useState<Faixa | null>(null);

  return (
    <PageShell
      title="Estilo"
      subtitle="O sistema por trás das telas. Muda em design/tokens.json."
    >
      {/* ===== Avatar ===== */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-bold">Avatar</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Retrato desenhado em SVG, sem imagem e sem rede. O aro é a faixa
            de verdade da pessoa — vem do perfil, não se escolhe aqui.
          </p>

          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            A faixa no aro, da branca à vermelha
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {FAIXAS_DO_GUIA.map((f, i) => (
              <div key={f} className="flex flex-col items-center gap-1">
                <Avatar
                  dados={avatarSorteado(`guia-${f}`)}
                  belt={f}
                  degrees={i % 5}
                  className="h-16 w-16"
                />
                <span className="text-xs text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold text-muted-foreground">
            Cabelos
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {ESTILOS_DE_CABELO.map((e) => (
              <div key={e.id} className="flex flex-col items-center gap-1">
                <Avatar
                  dados={{ ...AVATAR_PADRAO, cabelo: e.id }}
                  belt="Roxa"
                  degrees={2}
                  className="h-14 w-14"
                />
                <span className="text-xs text-muted-foreground">{e.nome}</span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold text-muted-foreground">
            Kimono e patches
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {CORES_DE_KIMONO.map((k) => (
              <div key={k.id} className="flex flex-col items-center gap-1">
                <Avatar
                  dados={{ ...AVATAR_PADRAO, kimono: k.id, patches: ["brasil", "academia"] }}
                  belt="Preta"
                  degrees={3}
                  className="h-14 w-14"
                />
                <span className="text-xs text-muted-foreground">{k.nome}</span>
              </div>
            ))}
            {(Object.keys(PATCHES) as PatchId[])
              .filter((id) => id !== "nenhum")
              .map((id) => (
                <div key={id} className="flex flex-col items-center gap-1">
                  <Avatar
                    dados={{ ...AVATAR_PADRAO, kimono: "preto", patches: [id, id] }}
                    belt="Marrom"
                    degrees={1}
                    className="h-14 w-14"
                  />
                  <span className="text-xs text-muted-foreground">
                    {PATCHES[id].nome}
                  </span>
                </div>
              ))}
          </div>

          <p className="mt-5 text-xs font-semibold text-muted-foreground">
            Sorteio por identificador — quem nunca abriu o editor
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => (
              <Avatar
                key={i}
                dados={avatarSorteado(`aluno-${i}`)}
                belt="Azul"
                degrees={i % 5}
                className="h-12 w-12"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- A faixa como acento ---------------- */}
      <Secao
        titulo="A cor é a faixa"
        aviso="Não existe cor de marca dentro da sessão: o acento vem da graduação de quem está logado. Toque para pré-visualizar."
      >
        <div className="grid grid-cols-4 gap-2">
          {FAIXAS.map((f) => (
            <button
              key={f}
              onClick={() => setPrevia(previa === f ? null : f)}
              aria-pressed={previa === f}
              className={cn(
                "tap flex flex-col items-center gap-1.5 rounded-xl border p-2 active:scale-95",
                previa === f ? "border-primary bg-primary/10" : "border-border/60",
              )}
            >
              <span
                className="h-8 w-8 rounded-full border border-white/15"
                style={{ background: acentoDaFaixa(f) }}
              />
              <span className="text-xs font-bold leading-none">{f}</span>
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl border border-primary/40 p-4"
          style={previa ? ({ "--faixa": acentoDaFaixa(previa) } as React.CSSProperties) : undefined}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {previa ?? "sua faixa"}
          </p>
          <p className="mt-1 text-2xl font-black text-primary">128h no tatame</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
              Botão
            </span>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              Pílula
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            {FAIXAS.slice(0, 5).map((f) => (
              <FaixaVisual key={f} belt={f} degrees={3} compacta />
            ))}
          </div>
        </div>
      </Secao>

      {/* ---------------- Superfícies ---------------- */}
      <Secao titulo="Superfícies e texto">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(tokens.cor.base).map(([nome, def]) => (
            <div
              key={nome}
              className="flex items-center gap-2 rounded-xl border border-border/60 p-2"
            >
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-white/10"
                style={{ background: `var(--${def.css})` }}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  --{def.css}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Secao>

      {/* ---------------- Pódio ---------------- */}
      <Secao
        titulo="Pódio"
        aviso="A exceção deliberada: ouro, prata e bronze não seguem a faixa, porque são as três cores que todo mundo lê sem legenda."
      >
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(tokens.cor.podio).map(([nome, def]) => (
            <div
              key={nome}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 p-3"
            >
              <Icone.medalha
                className="h-7 w-7"
                style={{ color: `var(--${def.css})` }}
              />
              <span className="text-xs font-bold capitalize">{nome}</span>
            </div>
          ))}
        </div>
      </Secao>

      {/* ---------------- Ícones ---------------- */}
      <Secao
        titulo={`Ícones (${Object.keys(Icone).length})`}
        aviso="Cada um tem o nome do que SIGNIFICA, não o nome que a biblioteca deu. Trocar o desenho de um conceito é mexer em design/icones.ts — num lugar só."
      >
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(Icone).map(([nome, Desenho]) => (
            <div
              key={nome}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card/50 p-2 text-center"
            >
              <Desenho className="h-5 w-5 text-primary" />
              <span className="w-full truncate text-xs leading-tight text-muted-foreground">
                {nome}
              </span>
            </div>
          ))}
        </div>
      </Secao>

      {/* ---------------- Raio ---------------- */}
      <Secao titulo="Raio" aviso={tokens.raio._leia}>
        <div className="flex flex-wrap gap-2">
          {Object.keys(tokens.raio.escala).map((nome) => (
            <div key={nome} className="flex flex-col items-center gap-1">
              <div
                className="h-12 w-12 border border-primary/50 bg-primary/10"
                style={{ borderRadius: `var(--radius-${nome})` }}
              />
              <span className="text-xs text-muted-foreground">{nome}</span>
            </div>
          ))}
        </div>
      </Secao>

      {/* ---------------- Movimento ---------------- */}
      <Secao titulo="Movimento" aviso={tokens.movimento._leia}>
        <Card className="border-border/60">
          <CardContent className="space-y-1.5 p-4">
            {Object.entries(tokens.movimento.duracao).map(([nome, v]) => (
              <div key={nome} className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold">{nome}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </Secao>

      {/* ---------------- Camadas ---------------- */}
      <Secao titulo="Camadas" aviso={tokens.camada._leia}>
        <Card className="border-border/60">
          <CardContent className="space-y-1.5 p-4">
            {Object.entries(tokens.camada)
              .filter(([n]) => !n.startsWith("_"))
              .map(([nome, v]) => (
                <div key={nome} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-bold">--z-{nome}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {String(v)}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </Secao>
    </PageShell>
  );
}
