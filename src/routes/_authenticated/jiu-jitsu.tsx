import { createFileRoute, Link } from "@tanstack/react-router";
import { Icone, type LucideIcon } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { useAchievementStats, useTrainings } from "@/lib/bjj-storage";
import { useMinhasLutas } from "@/lib/lutas-storage";
import { horasEmTexto } from "@/lib/nivel";

export const Route = createFileRoute("/_authenticated/jiu-jitsu")({
  head: () => ({
    meta: [
      { title: "Jiu-jitsu — Ponteira" },
      {
        name: "description",
        content: "Todas as telas do tatame, num lugar só.",
      },
    ],
  }),
  component: AreaDoJiuJitsu,
});

/**
 * O índice da área do jiu-jitsu.
 *
 * O que ele NÃO é: o painel. O painel — sequência, hexágono, meta, últimos
 * treinos — é o Início, e continua sendo, porque este app é sobre jiu-jitsu e
 * a tela de abertura tem que dizer isso. Esta aqui é o mapa: as onze telas do
 * tatame, alcançáveis sem abrir o menu.
 *
 * Cada porta carrega um número de verdade em vez de uma frase de apoio. "Veja
 * suas técnicas" não informa nada que o título já não diga; "38 técnicas" é o
 * motivo de tocar, ou de não tocar.
 */
function AreaDoJiuJitsu() {
  const { items: treinos } = useTrainings();
  const conquistas = useAchievementStats();
  const { cartel } = useMinhasLutas();

  const minutos = treinos.reduce((n, t) => n + (t.durationMin || 0), 0);
  const rolas = treinos.reduce((n, t) => n + (t.rolls || 0), 0);

  return (
    <PageShell title="Jiu-jitsu" subtitle="Todas as telas do tatame.">
      {/* O painel é o Início, e o caminho de volta para ele fica em primeiro
          lugar — não escondido no fim de uma lista. */}
      <Link
        to="/"
        className="tap flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3 active:scale-[0.98]"
      >
        <Icone.inicio className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-primary">
            Painel do treino
          </span>
          <span className="block text-xs text-muted-foreground">
            Sequência, hexágono do jogo, meta e os últimos treinos.
          </span>
        </span>
        <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      <Grupo titulo="Treino">
        <Porta
          para="/diario"
          icone={Icone.treino}
          nome="Diário"
          detalhe={`${treinos.length} ${treinos.length === 1 ? "treino" : "treinos"} · ${horasEmTexto(minutos)}`}
        />
        <Porta
          para="/tecnicas"
          icone={Icone.tecnica}
          nome="Técnicas"
          detalhe="O que você estuda"
        />
        <Porta
          para="/analises"
          icone={Icone.analise}
          nome="Análises"
          detalhe="O que os treinos mostraram"
        />
      </Grupo>

      <Grupo titulo="Progresso">
        <Porta
          para="/metas"
          icone={Icone.evolucao}
          nome="Evolução"
          detalhe={`${rolas} ${rolas === 1 ? "rola" : "rolas"} no total`}
        />
        <Porta
          para="/plano"
          icone={Icone.listaDeTecnicas}
          nome="Plano do mês"
          detalhe="O ciclo em curso"
        />
        <Porta
          para="/graduacao"
          icone={Icone.graduacao}
          nome="Graduação"
          detalhe="Faixas, tempos e o simulado"
        />
        <Porta
          para="/conquistas"
          icone={Icone.conquista}
          nome="Conquistas"
          detalhe={`${conquistas.unlocked} de ${conquistas.total}`}
        />
      </Grupo>

      <Grupo titulo="Competição">
        <Porta
          para="/minhas-lutas"
          icone={Icone.rola}
          nome="Minhas lutas"
          detalhe={
            cartel.total > 0
              ? `${cartel.vitorias}V-${cartel.derrotas}D em ${cartel.total}`
              : "Nenhuma luta registrada"
          }
        />
        <Porta
          para="/minhas-medalhas"
          icone={Icone.medalha}
          nome="Medalhas"
          detalhe="O pódio, quando vem"
        />
      </Grupo>

      <Grupo titulo="Gente do tatame">
        <Porta
          para="/parceiros"
          icone={Icone.parceiro}
          nome="Parceiros de rola"
          detalhe="Quem te faz melhorar"
        />
        <Porta
          para="/equipe"
          icone={Icone.equipe}
          nome="Equipe"
          detalhe="A academia"
        />
        <Porta
          para="/meus-mestres"
          icone={Icone.graduacao}
          nome="Mestres e linhagem"
          detalhe="De quem você vem"
        />
      </Grupo>
    </PageShell>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {titulo}
      </h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Porta({
  para,
  icone: Icon,
  nome,
  detalhe,
}: {
  para:
    | "/diario"
    | "/tecnicas"
    | "/analises"
    | "/metas"
    | "/plano"
    | "/graduacao"
    | "/conquistas"
    | "/minhas-lutas"
    | "/minhas-medalhas"
    | "/parceiros"
    | "/equipe"
    | "/meus-mestres";
  icone: LucideIcon;
  nome: string;
  detalhe: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Link
          to={para}
          className="tap flex items-center gap-3 p-3 active:scale-[0.99]"
        >
          <Icon className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{nome}</span>
            <span className="block truncate text-xs tabular-nums text-muted-foreground">
              {detalhe}
            </span>
          </span>
          <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </CardContent>
    </Card>
  );
}
