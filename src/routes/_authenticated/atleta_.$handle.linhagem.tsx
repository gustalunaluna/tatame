import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Icone } from "@/design/icones";
import { Card, CardContent } from "@/components/ui/card";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { SeloVerificado } from "@/components/SeloVerificado";
import { usePerfilPublico, useLinhagemDe, useMestresDe } from "@/lib/social-storage";
import type { EloDaLinhagem, VinculoDeMestre } from "@/lib/social-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/atleta_/$handle/linhagem")({
  component: LinhagemPage,
});

const ANO = (d: string | null) => (d ? d.slice(0, 4) : "");

/** Um degrau da corrente. */
function Elo({ elo, ultimo, i }: { elo: EloDaLinhagem; ultimo: boolean; i: number }) {
  const conteudo = (
    <div className="flex items-start gap-3">
      {/* A linha vertical é a corrente. Ela para no último — quem não tem
          mestre cadastrado é onde a memória do app acaba, e desenhar linha
          depois dele sugeriria que há mais. */}
      <div className="flex flex-col items-center self-stretch">
        {elo.foto ? (
          <img
            src={elo.foto}
            alt=""
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
            <Icone.graduacao className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        {!ultimo && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <p className="flex items-center gap-1.5 text-sm font-bold leading-tight">
          <span className="truncate">{elo.nome}</span>
          {elo.verificado && <SeloVerificado tipo="mestre" className="h-3.5 w-3.5" />}
        </p>
        {elo.belt ? (
          <FaixaVisual belt={elo.belt} degrees={elo.graus} compacta className="mt-1.5" />
        ) : (
          // Sem conta e sem faixa cadastrada: dizemos isso em vez de inventar
          // uma faixa branca, que seria errado para um Maeda da vida.
          <p className="mt-1 text-xs text-muted-foreground">
            Fora do app — cadastrado pelo aluno.
          </p>
        )}
      </div>
    </div>
  );

  const classe = "rise-in block";
  const estilo = { "--i": Math.min(i, 10) } as CSSProperties;

  return elo.temConta && elo.handle ? (
    <Link
      to="/atleta/$handle"
      params={{ handle: elo.handle }}
      className={cn(classe, "tap active:scale-[0.99]")}
      style={estilo}
    >
      {conteudo}
    </Link>
  ) : (
    <div className={classe} style={estilo}>
      {conteudo}
    </div>
  );
}

/** Os outros vínculos, os que a corrente não segue. */
function OutroMestre({ v }: { v: VinculoDeMestre }) {
  const periodo = [ANO(v.desde), ANO(v.ate)].filter(Boolean).join(" – ");
  const conteudo = (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
      {v.mestreFoto ? (
        <img
          src={v.mestreFoto}
          alt=""
          loading="lazy"
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
          <Icone.graduacao className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold leading-tight">
          <span className="truncate">{v.mestreNome}</span>
          {v.mestreVerificado && <SeloVerificado tipo="mestre" className="h-3.5 w-3.5" />}
        </p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {[v.papel === "mestre" ? "" : v.papel, v.teamNome, periodo]
            .filter(Boolean)
            .join(" · ") || "vínculo cadastrado"}
        </p>
      </div>
      {v.mestreHandle && (
        <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );

  return v.mestreHandle ? (
    <Link
      to="/atleta/$handle"
      params={{ handle: v.mestreHandle }}
      className="tap block active:scale-[0.99]"
    >
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

/**
 * A linhagem: de quem a pessoa é aluna, e de quem essa pessoa foi aluna.
 *
 * É a pergunta que se faz no primeiro dia de qualquer academia, e a resposta é
 * uma corrente, não um nome. O app segue sempre o mestre PRINCIPAL para subir
 * — com vários mestres, seguir todos viraria uma árvore, e o que identifica o
 * praticante é a linha, não a ramificação. Os outros vínculos aparecem
 * separados, embaixo, sem sumir.
 */
function LinhagemPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { perfil } = usePerfilPublico(handle);
  const { linhagem, acima, ready } = useLinhagemDe(handle);
  const { mestres } = useMestresDe(handle);

  // Quem já está na corrente não precisa aparecer de novo embaixo.
  const naCorrente = new Set(acima.map((e) => e.nome));
  const outros = mestres.filter((m) => !naCorrente.has(m.mestreNome));

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5">
      <button
        onClick={() => navigate({ to: "/atleta/$handle", params: { handle } })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <Icone.voltar className="h-4 w-4" /> Voltar ao perfil
      </button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Icone.graduacao className="h-6 w-6 text-primary" />
          Linhagem
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {perfil?.nickname ? `${perfil.nickname} · ` : ""}
          {acima.length
            ? `${acima.length} ${acima.length === 1 ? "geração" : "gerações"} acima`
            : "sem mestre cadastrado"}
        </p>
      </div>

      {linhagem.length > 0 && (
        <div className="list-perf">
          {linhagem.map((elo, i) => (
            <Elo
              key={`${elo.nivel}-${elo.nome}`}
              elo={elo}
              ultimo={i === linhagem.length - 1}
              i={i}
            />
          ))}
        </div>
      )}

      {outros.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold">Outros mestres</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Quem também graduou ou recebeu {perfil?.nickname ?? "a pessoa"}, fora
            da linha principal.
          </p>
          <div className="space-y-2">
            {outros.map((v) => (
              <OutroMestre key={v.id} v={v} />
            ))}
          </div>
        </div>
      )}

      {ready && acima.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {perfil?.souEu
              ? "Você ainda não cadastrou nenhum mestre. Cadastre em Perfil para montar sua linhagem."
              : "Esta pessoa ainda não cadastrou um mestre."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
