import { useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { SeloVerificado } from "@/components/SeloVerificado";
import { useBuscaPorHandle, useEquipes } from "@/lib/social-storage";
import {
  nomeDaGraduacao,
  type Graduacao,
  type NovaGraduacao,
} from "@/lib/graduacao-storage";
import { FAIXAS, type Faixa } from "@/lib/bjj-types";

const SEM_EQUIPE = "__nenhuma__";

/**
 * Uma linha da escada. A data à esquerda e o traço vertical fazem a lista
 * ler como linha do tempo — que é o que ela é — em vez de mais uma pilha de
 * cartões iguais.
 */
export function LinhaDeGraduacao({
  g,
  i = 0,
  ultima,
  aoApagar,
}: {
  g: Graduacao;
  i?: number;
  ultima?: boolean;
  aoApagar?: (id: string) => void;
}) {
  return (
    <div
      style={{ "--i": Math.min(i, 10) } as CSSProperties}
      className="rise-in flex gap-3"
    >
      {/* trilho da linha do tempo */}
      <div className="flex w-16 shrink-0 flex-col items-end pt-0.5">
        <p className="text-xs font-black tabular-nums">
          {g.data.slice(0, 4)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(g.data + "T00:00:00").toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </p>
      </div>

      <div className="relative flex flex-col items-center">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
        {!ultima && <span className="w-px flex-1 bg-border" />}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">
              {nomeDaGraduacao(g)}
            </p>
            <FaixaVisual
              belt={g.belt}
              degrees={g.degrees}
              compacta
              comTexto={false}
              className="mt-1.5"
            />
          </div>

          {aoApagar && (
            <Confirmar
              gatilho={
                <button
                  aria-label={`Apagar ${nomeDaGraduacao(g)}`}
                  className="tap shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive active:scale-90"
                >
                  <Icone.apagar className="h-4 w-4" />
                </button>
              }
              titulo="Apagar esta graduação?"
              descricao={`"${nomeDaGraduacao(g)}" sai do seu histórico. Não dá para desfazer.`}
              aoConfirmar={() => aoApagar(g.id)}
            />
          )}
        </div>

        {g.mestreNome && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span>Entregue por</span>
            {g.mestreHandle ? (
              <Link
                to="/atleta/$handle"
                params={{ handle: g.mestreHandle }}
                className="tap inline-flex items-center gap-1 font-bold text-primary"
              >
                {g.mestreNome}
                {g.mestreVerificado && (
                  <SeloVerificado tipo="mestre" className="h-3 w-3" />
                )}
              </Link>
            ) : (
              <span className="font-bold text-foreground">{g.mestreNome}</span>
            )}
          </p>
        )}

        {g.teamNome && (
          <Link
            to="/academia/$slug"
            params={{ slug: g.teamSlug }}
            className="tap mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary"
          >
            {g.teamCrest && (
              <img
                src={g.teamCrest}
                alt=""
                loading="lazy"
                className="h-4 w-4 rounded object-contain"
              />
            )}
            {g.teamNome}
          </Link>
        )}

        {g.nota && (
          <p className="mt-1.5 rounded-lg border border-border/50 bg-background/40 p-2 text-xs italic text-muted-foreground">
            “{g.nota}”
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CadastrarGraduacao({
  gatilho,
  aoSalvar,
}: {
  gatilho: React.ReactNode;
  aoSalvar: (g: NovaGraduacao) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);
  const { equipes } = useEquipes();
  const aprovadas = equipes.filter((e) => e.status === "aprovada");

  const [belt, setBelt] = useState<Faixa>("Branca");
  const [degrees, setDegrees] = useState(0);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [equipeId, setEquipeId] = useState(SEM_EQUIPE);

  // O mestre pode ser alguém do app (aí o perfil dele fica linkado e o selo
  // de verificado aparece sozinho) ou só um nome escrito.
  const [buscaMestre, setBuscaMestre] = useState("");
  const [mestreEscolhido, setMestreEscolhido] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const { data: achado, isFetching } = useBuscaPorHandle(buscaMestre);

  function limpar() {
    setBelt("Branca");
    setDegrees(0);
    setData(new Date().toISOString().slice(0, 10));
    setNota("");
    setEquipeId(SEM_EQUIPE);
    setBuscaMestre("");
    setMestreEscolhido(null);
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
          <DialogTitle>Registrar graduação</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faixa</Label>
              <Select value={belt} onValueChange={(v) => setBelt(v as Faixa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                value={String(degrees)}
                onValueChange={(v) => setDegrees(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">A faixa (sem grau)</SelectItem>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}º grau
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="grad-data">Data</Label>
            <Input
              id="grad-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="grad-mestre">Quem entregou</Label>
            {mestreEscolhido ? (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                <span className="truncate text-sm font-bold">
                  {mestreEscolhido.nome}
                </span>
                <button
                  onClick={() => {
                    setMestreEscolhido(null);
                    setBuscaMestre("");
                  }}
                  className="tap shrink-0 text-xs font-bold text-muted-foreground"
                >
                  trocar
                </button>
              </div>
            ) : (
              <>
                <Input
                  id="grad-mestre"
                  value={buscaMestre}
                  onChange={(e) => setBuscaMestre(e.target.value)}
                  placeholder="@ do mestre, ou só o nome dele"
                />
                {buscaMestre.trim().length >= 3 && (
                  <div className="mt-1.5">
                    {isFetching ? (
                      <p className="text-xs text-muted-foreground">
                        Procurando…
                      </p>
                    ) : achado ? (
                      <button
                        onClick={() =>
                          setMestreEscolhido({
                            id: achado.userId,
                            nome: achado.nickname,
                          })
                        }
                        className="tap flex w-full items-center gap-2 rounded-xl border border-border/60 p-2.5 text-left active:scale-[0.99]"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">
                          {achado.nickname}
                        </span>
                        <span className="shrink-0 text-[11px] text-primary">
                          vincular perfil
                        </span>
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhum perfil com esse @. O nome fica salvo como texto.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label>Academia na época</Label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger>
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

          <div>
            <Label htmlFor="grad-nota">Observação</Label>
            <Input
              id="grad-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: na cerimônia de fim de ano"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={async () => {
              const salvou = await aoSalvar({
                belt,
                degrees,
                data,
                nota,
                mestreId: mestreEscolhido?.id ?? null,
                mestreNome: mestreEscolhido ? "" : buscaMestre,
                teamId: equipeId === SEM_EQUIPE ? null : equipeId,
              });
              if (salvou) {
                setAberto(false);
                limpar();
                toast.success("Graduação registrada.");
              }
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** O botão de abrir o cadastro, para reuso no perfil e na tela cheia. */
export function BotaoNovaGraduacao({
  aoSalvar,
  rotulo = "Registrar graduação",
}: {
  aoSalvar: (g: NovaGraduacao) => Promise<boolean>;
  rotulo?: string;
}) {
  return (
    <CadastrarGraduacao
      aoSalvar={aoSalvar}
      gatilho={
        <Button variant="outline" size="sm" className="w-full gap-1">
          <Icone.adicionar className="h-4 w-4" /> {rotulo}
        </Button>
      }
    />
  );
}
