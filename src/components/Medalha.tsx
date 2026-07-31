import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Colocacao, Medalha, MedalhaDaEquipe } from "@/lib/medalhas-storage";

/**
 * Ouro, prata e bronze são as três cores que o pódio já ensinou a todo mundo.
 * Usar o verde-limão do app aqui apagaria a única informação que a cor carrega
 * de graça — por isso esta é a exceção deliberada à paleta.
 */
const CORES: Record<Colocacao, { anel: string; texto: string; fundo: string; nome: string }> = {
  ouro: {
    anel: "ring-amber-400/50",
    texto: "text-amber-300",
    fundo: "bg-amber-400/10",
    nome: "Ouro",
  },
  prata: {
    anel: "ring-slate-300/50",
    texto: "text-slate-200",
    fundo: "bg-slate-300/10",
    nome: "Prata",
  },
  bronze: {
    anel: "ring-orange-600/50",
    texto: "text-orange-400",
    fundo: "bg-orange-600/10",
    nome: "Bronze",
  },
};

export function CorDaMedalha(colocacao: Colocacao) {
  return CORES[colocacao];
}

function dataCurta(iso: string) {
  const [a, m] = iso.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m) - 1] ?? ""}/${a}`;
}

/** O selo redondo — o mesmo em toda parte, para a cor virar linguagem. */
export function SeloDeMedalha({
  colocacao,
  className,
}: {
  colocacao: Colocacao;
  className?: string;
}) {
  const c = CORES[colocacao];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full ring-2",
        c.fundo,
        c.anel,
        c.texto,
        className ?? "h-10 w-10",
      )}
    >
      <Medal className="h-1/2 w-1/2" aria-hidden="true" />
      <span className="sr-only">{c.nome}</span>
    </span>
  );
}

/** Cartão de destaque: o formato usado nas até-três do perfil. */
export function MedalhaEmDestaque({ m, i = 0 }: { m: Medalha; i?: number }) {
  const c = CORES[m.colocacao];
  return (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className={cn(
        "rise-in flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl border border-border/50 p-3 text-center",
        c.fundo,
      )}
    >
      <SeloDeMedalha colocacao={m.colocacao} className="h-9 w-9" />
      <p className={cn("text-[11px] font-black uppercase tracking-wide", c.texto)}>
        {c.nome}
        {m.absoluto && " · abs"}
      </p>
      <p className="line-clamp-2 text-[11px] font-semibold leading-tight">
        {m.evento}
      </p>
      <p className="text-[10px] text-muted-foreground">{dataCurta(m.data)}</p>
    </div>
  );
}

/** Linha completa: usada nas listas "ver todas". */
export function LinhaDeMedalha({
  m,
  i = 0,
  acao,
}: {
  m: Medalha | MedalhaDaEquipe;
  i?: number;
  acao?: React.ReactNode;
}) {
  const c = CORES[m.colocacao];
  const daEquipe = "atletaHandle" in m;

  return (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className="rise-in list-perf flex items-start gap-3 rounded-2xl border border-border/50 bg-card/50 p-3"
    >
      <SeloDeMedalha colocacao={m.colocacao} />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn("text-xs font-black uppercase", c.texto)}>
            {c.nome}
          </span>
          {m.absoluto && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
              absoluto
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {m.modalidade}
          </span>
        </p>
        <p className="mt-0.5 text-sm font-bold leading-tight">{m.evento}</p>
        {m.categoria && (
          <p className="text-xs text-muted-foreground">{m.categoria}</p>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR")}
          {m.federacao && ` · ${m.federacao}`}
        </p>

        {daEquipe ? (
          <Link
            to="/atleta/$handle"
            params={{ handle: m.atletaHandle }}
            className="tap mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary"
          >
            {m.atletaFoto && (
              <img
                src={m.atletaFoto}
                alt=""
                loading="lazy"
                className="h-4 w-4 rounded-full object-cover"
              />
            )}
            {m.atletaNome}
          </Link>
        ) : (
          m.teamNome && (
            <Link
              to="/academia/$slug"
              params={{ slug: m.teamSlug }}
              className="tap mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary"
            >
              {m.teamCrest && (
                <img
                  src={m.teamCrest}
                  alt=""
                  loading="lazy"
                  className="h-4 w-4 rounded object-contain"
                />
              )}
              {m.teamNome}
            </Link>
          )
        )}
      </div>

      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

/**
 * O placar da academia. Aqui não faz sentido escolher três: numa academia com
 * quarenta alunos a pergunta é "quanto esta academia ganha", e a resposta é o
 * total por colocação.
 */
export function PlacarDeMedalhas({
  ouro,
  prata,
  bronze,
}: {
  ouro: number;
  prata: number;
  bronze: number;
}) {
  const linhas: { colocacao: Colocacao; n: number }[] = [
    { colocacao: "ouro", n: ouro },
    { colocacao: "prata", n: prata },
    { colocacao: "bronze", n: bronze },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {linhas.map(({ colocacao, n }) => {
        const c = CORES[colocacao];
        return (
          <div
            key={colocacao}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border border-border/50 p-3",
              c.fundo,
            )}
          >
            <SeloDeMedalha colocacao={colocacao} className="h-8 w-8" />
            <p className={cn("text-2xl font-black tabular-nums", c.texto)}>{n}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {c.nome}
            </p>
          </div>
        );
      })}
    </div>
  );
}
