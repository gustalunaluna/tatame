import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Confirmar } from "@/components/Confirmar";
import { SeloVerificado } from "@/components/SeloVerificado";
import {
  useBuscaPorHandle,
  useEquipes,
  useMeuHandle,
  useMestresDe,
  useMeusMestres,
} from "@/lib/social-storage";
import type { VinculoDeMestre } from "@/lib/social-types";
import { usePerfil } from "@/lib/bjj-storage";
import { podeSerInstrutor } from "@/lib/titulos";
import { FAIXAS, type Faixa } from "@/lib/bjj-types";
import { ajustarGrau, explicacaoDaFaixa, grausValidos } from "@/lib/graduacao";

export const Route = createFileRoute("/_authenticated/meus-mestres")({
  head: () => ({
    meta: [
      { title: "Meus mestres — Ponteira" },
      {
        name: "description",
        content: "Quem te graduou, quem te recebeu, e a linhagem que sai daí.",
      },
    ],
  }),
  component: MeusMestresPage,
});

const SEM_EQUIPE = "__nenhuma__";
// "Não sei" precisa de um valor: o Select do Radix trata string vazia como
// "nenhuma opção escolhida" e o rótulo sumiria do gatilho.
const SEM_FAIXA = "__nao_sei__";

const PAPEIS = [
  { valor: "mestre", rotulo: "Mestre", ajuda: "Quem responde por você e te gradua" },
  { valor: "professor", rotulo: "Professor", ajuda: "Faixa-preta que te dá aula" },
  { valor: "instrutor", rotulo: "Instrutor", ajuda: "Quem te instrui no dia a dia" },
] as const;

/* ------------------------------------------------------------------ */

function CadastrarMestre({ gatilho }: { gatilho: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const { adicionar } = useMeusMestres();
  const { equipes } = useEquipes();
  const aprovadas = equipes.filter((e) => e.status === "aprovada");

  // Ou alguém do app — e aí o perfil fica linkado e o selo aparece sozinho —
  // ou só um nome. A segunda opção não é consolo: metade da linhagem de
  // qualquer faixa-preta é de gente que nunca vai abrir este app.
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<{ id: string; nome: string } | null>(null);
  const [nome, setNome] = useState("");
  const { data: achado, isFetching } = useBuscaPorHandle(busca);

  const [papel, setPapel] = useState<VinculoDeMestre["papel"]>("mestre");
  const [principal, setPrincipal] = useState(false);
  const [desde, setDesde] = useState("");
  const [equipeId, setEquipeId] = useState(SEM_EQUIPE);
  const [nota, setNota] = useState("");

  // Só para quem não usa o app. Quem tem conta mantém a própria faixa, e
  // deixar outra pessoa declarar a graduação dele seria o mesmo erro que a
  // migração 021 desfez.
  const [belt, setBelt] = useState<"" | Faixa>("");
  const [graus, setGraus] = useState(0);
  const [academia, setAcademia] = useState("");

  const valido = Boolean(escolhido) || nome.trim().length >= 2;

  function limpar() {
    setBusca("");
    setEscolhido(null);
    setNome("");
    setPapel("mestre");
    setPrincipal(false);
    setDesde("");
    setEquipeId(SEM_EQUIPE);
    setNota("");
    setBelt("");
    setGraus(0);
    setAcademia("");
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) limpar();
      }}
    >
      <DialogTrigger asChild>{gatilho}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar mestre</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="mestre-busca">Quem é</Label>
            {escolhido ? (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                <span className="truncate text-sm font-bold">{escolhido.nome}</span>
                <button
                  onClick={() => {
                    setEscolhido(null);
                    setBusca("");
                  }}
                  className="tap shrink-0 text-xs font-bold text-muted-foreground"
                >
                  trocar
                </button>
              </div>
            ) : (
              <>
                <Input
                  id="mestre-busca"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setNome(e.target.value);
                  }}
                  placeholder="@ do mestre, ou só o nome dele"
                />
                {busca.trim().length >= 3 && (
                  <div className="mt-1.5">
                    {isFetching ? (
                      <p className="text-xs text-muted-foreground">Procurando…</p>
                    ) : achado ? (
                      <button
                        onClick={() =>
                          setEscolhido({
                            id: achado.userId,
                            nome: achado.nickname,
                          })
                        }
                        className="tap flex w-full items-center gap-2 rounded-xl border border-border/60 p-2.5 text-left active:scale-[0.99]"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">
                          {achado.nickname}
                        </span>
                        <span className="shrink-0 text-xs text-primary">usar este</span>
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Ninguém com esse @. Vai salvar como nome escrito — o que
                        está certo para quem não usa o app.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Faixa e academia só aparecem para mestre de fora do app. Quem tem
              conta traz isso do próprio perfil, e é ele quem mantém.

              São opcionais de propósito: ninguém é obrigado a saber a graduação
              exata do mestre, e exigir faria a pessoa inventar. Mas quem sabe
              precisava ter onde escrever — sem estes campos o mestre aparecia
              no perfil só com o nome, sem faixa e sem academia. */}
          {!escolhido && (
            <div className="space-y-3 rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">
                Ele não usa o app. O que você souber dele fica registrado aqui —
                e passa a valer se um dia ele criar conta.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Faixa dele</Label>
                  <Select
                    value={belt || SEM_FAIXA}
                    onValueChange={(v) => {
                      const nova = v === SEM_FAIXA ? "" : (v as Faixa);
                      setBelt(nova);
                      setGraus(nova ? ajustarGrau(nova, graus) : 0);
                    }}
                  >
                    <SelectTrigger aria-label="Faixa dele">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_FAIXA}>Não sei</SelectItem>
                      {FAIXAS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grau</Label>
                  <Select
                    value={String(graus)}
                    onValueChange={(v) => setGraus(Number(v))}
                    disabled={!belt}
                  >
                    <SelectTrigger aria-label="Grau">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {grausValidos(belt || "Branca").map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 0 ? "A faixa (sem grau)" : `${n}º grau`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {belt && explicacaoDaFaixa(belt, graus) && (
                <p className="text-xs text-muted-foreground">
                  {explicacaoDaFaixa(belt, graus)}
                </p>
              )}

              <div>
                <Label htmlFor="mestre-academia">Academia dele</Label>
                <Input
                  id="mestre-academia"
                  value={academia}
                  onChange={(e) => setAcademia(e.target.value)}
                  placeholder="Ex.: Team Thome"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Como era</Label>
            <Select
              value={papel}
              onValueChange={(v) => setPapel(v as VinculoDeMestre["papel"])}
            >
              <SelectTrigger aria-label="Como era">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.rotulo} — {p.ajuda}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mestre-desde">Desde</Label>
              <Input
                id="mestre-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div>
              <Label>Academia</Label>
              <Select value={equipeId} onValueChange={setEquipeId}>
                <SelectTrigger aria-label="Academia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_EQUIPE}>Nenhuma</SelectItem>
                  {aprovadas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="mestre-nota">Observação</Label>
            <Input
              id="mestre-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex.: me graduou até a roxa"
            />
          </div>

          {/* A linhagem sobe por UM mestre. Quem tem três cadastrados precisa
              dizer qual — se ninguém disser, o app usa o mais antigo, e a
              corrente pode subir pelo galho errado. */}
          <label className="tap flex items-start gap-3 rounded-xl border border-border/60 p-3">
            <input
              type="checkbox"
              checked={principal}
              onChange={(e) => setPrincipal(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold">É o meu mestre principal</span>
              <span className="block text-xs text-muted-foreground">
                É por ele que a sua linhagem sobe. Só um de cada vez.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!valido || adicionar.isPending}
            onClick={async () => {
              await adicionar.mutateAsync({
                mestreId: escolhido?.id ?? null,
                // Com conta escolhida o nome fica vazio de propósito: o perfil
                // dele é a fonte, e ele mesmo mantém aquilo atualizado.
                mestreNome: escolhido ? "" : nome.trim(),
                mestreBelt: escolhido ? "" : belt,
                mestreGraus: escolhido ? 0 : graus,
                mestreAcademia: escolhido ? "" : academia.trim(),
                teamId: equipeId === SEM_EQUIPE ? null : equipeId,
                papel,
                principal,
                desde: desde || null,
                nota,
              });
              setAberto(false);
              limpar();
            }}
          >
            {adicionar.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function LinhaDeMestre({ v }: { v: VinculoDeMestre }) {
  const { tornarPrincipal, remover } = useMeusMestres();
  const periodo = [v.desde?.slice(0, 4), v.ate?.slice(0, 4)].filter(Boolean).join(" – ");

  return (
    <div className="rounded-2xl border border-border/60 p-3">
      <div className="flex items-start gap-3">
        {v.mestreFoto ? (
          <img
            src={v.mestreFoto}
            alt=""
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
            <Icone.graduacao className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold leading-tight">
            <span className="truncate">{v.mestreNome}</span>
            {v.mestreVerificado && (
              <SeloVerificado tipo="mestre" className="h-3.5 w-3.5" />
            )}
          </p>
          <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
            {[v.papel, v.teamNome, periodo].filter(Boolean).join(" · ")}
          </p>
          {v.nota && (
            <p className="mt-1 text-xs italic text-muted-foreground">“{v.nota}”</p>
          )}
          {v.mestreHandle && (
            <Link
              to="/atleta/$handle"
              params={{ handle: v.mestreHandle }}
              className="tap mt-1 inline-block text-xs font-bold text-primary"
            >
              ver perfil
            </Link>
          )}
        </div>

        <Confirmar
          titulo="Remover este vínculo?"
          descricao={`${v.mestreNome} sai da sua lista e da sua linhagem.`}
          aoConfirmar={() => void remover.mutateAsync(v.id)}
          gatilho={
            <button
              aria-label={`Remover ${v.mestreNome}`}
              className="tap shrink-0 rounded-lg p-1.5 text-muted-foreground active:scale-95"
            >
              <Icone.apagar className="h-4 w-4" />
            </button>
          }
        />
      </div>

      {v.principal ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary">
          <Icone.destaque className="h-3.5 w-3.5" /> A sua linhagem sobe por aqui
        </p>
      ) : (
        <button
          onClick={() => void tornarPrincipal.mutateAsync(v.id)}
          className="tap mt-2 w-full rounded-lg border border-border/60 py-1.5 text-xs font-bold text-muted-foreground active:scale-[0.99]"
        >
          Tornar meu mestre principal
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Onde a pessoa monta a própria linhagem.
 *
 * O perfil tinha um campo de texto chamado "Mestre / professor" — um nome só,
 * sem data, sem academia, sem ligação com o perfil de ninguém. Quem treina há
 * dez anos tem três ou quatro mestres, e o mais importante deles quase nunca é
 * o atual. Aqui cada vínculo é uma entrada, e um deles carrega a corrente.
 */
function MeusMestresPage() {
  const { handle } = useMeuHandle();
  const { mestres, ready } = useMestresDe(handle);
  const { perfil, salvar } = usePerfil();

  const podeInstruir = podeSerInstrutor(perfil?.belt);

  return (
    <PageShell
      title="Meus mestres"
      subtitle="Quem te graduou, e a linhagem que sai daí."
      action={
        <CadastrarMestre
          gatilho={
            <Button size="sm" className="gap-1">
              <Icone.adicionar className="h-4 w-4" /> Novo
            </Button>
          }
        />
      }
    >
      {ready && mestres.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.graduacao className="mx-auto mb-2 h-5 w-5 text-primary" />
            Nenhum mestre cadastrado ainda. Comece pelo que te graduou — é a
            resposta que todo mundo pede no primeiro dia de uma academia nova.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {mestres.map((v) => (
          <LinhaDeMestre key={v.id} v={v} />
        ))}
      </div>

      {mestres.length > 0 && handle && (
        <Link
          to="/atleta/$handle/linhagem"
          params={{ handle }}
          className="tap flex items-center justify-between rounded-2xl border border-border/60 p-4 active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold">Ver minha linhagem</span>
            <span className="block text-xs text-muted-foreground">
              A corrente inteira, subindo pelo mestre principal.
            </span>
          </span>
          <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {/* --- do outro lado da relação --- */}
      <div className="rounded-2xl border border-border/60 p-4">
        <p className="text-sm font-bold">Eu também dou aula</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Da faixa roxa em diante já se instrui na maioria das academias. Marcar
          aqui só diz que você ensina — quem confirma o cargo é a academia.
        </p>

        {podeInstruir ? (
          <label className="tap mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(perfil?.instrutor)}
              onChange={(e) => void salvar({ instrutor: e.target.checked })}
              className="size-4 shrink-0 accent-[var(--primary)]"
            />
            <span className="text-sm font-semibold">Sou instrutor</span>
          </label>
        ) : (
          <p className="mt-3 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground">
            Disponível a partir da faixa roxa. A sua é {perfil?.belt ?? "Branca"}.
          </p>
        )}
      </div>
    </PageShell>
  );
}
