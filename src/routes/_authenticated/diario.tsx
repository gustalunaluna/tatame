import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icone } from "@/design/icones";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { SeletorDeTecnicas } from "@/components/SeletorDeTecnicas";
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
import { Textarea } from "@/components/ui/textarea";
import { useTrainings, useHydrated } from "@/lib/bjj-storage";
import {
  salvarParceirosDoTreino,
  useParceirosDoTreino,
} from "@/lib/social-storage";
import {
  salvarTecnicasDoTreino,
  useTecnicasDoTreino,
  type RascunhoTecnica,
} from "@/lib/tecnicas-storage";
import { ParceirosDoTreino } from "@/components/ParceirosDoTreino";
import { RelatoDoTreino } from "@/components/RelatoDoTreino";
import type { RascunhoParceiro } from "@/lib/social-types";
import type { Training, TrainingType } from "@/lib/bjj-types";

export const Route = createFileRoute("/_authenticated/diario")({
  head: () => ({
    meta: [
      { title: "Diário — Ponteira" },
      { name: "description", content: "Registre cada treino: Gi/No-Gi, rolas, técnicas e sensações." },
    ],
  }),
  component: DiaryPage,
});

function DiaryPage() {
  const hydrated = useHydrated();
  const { items, add, remove, update } = useTrainings();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Training | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const months = Array.from(new Set(items.map((t) => t.date.slice(0, 7)))).sort().reverse();
  const filtered =
    monthFilter === "all"
      ? items
      : items.filter((t) => t.date.startsWith(monthFilter));

  return (
    <PageShell
      title="Diário"
      subtitle="Cada rola conta uma história."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Icone.adicionar className="h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          {open && (
            <TrainingDialog
              onSalvar={async ({ parceiros, tecnicasDoDia, ...t }) => {
                setOpen(false);
                // Só comemora depois que o banco confirmou. Antes o "Boa!"
                // aparecia mesmo quando a gravação falhava e o treino se perdia.
                const id = await add(t);
                if (!id) return;
                try {
                  await salvarParceirosDoTreino(id, parceiros);
                } catch (erro) {
                  // O treino já está salvo; só os parceiros falharam. Dizer isso
                  // é mais útil do que um sucesso genérico ou um erro genérico.
                  console.error("[Ponteira] Falha ao salvar os parceiros:", erro);
                  toast.error("Treino salvo, mas os parceiros não. Edite depois.");
                  return;
                }
                try {
                  await salvarTecnicasDoTreino(id, tecnicasDoDia);
                } catch (erro) {
                  // Mesma regra dos parceiros: o treino já está no banco, e
                  // dizer exatamente o que faltou é mais útil que um erro
                  // genérico que faz a pessoa achar que perdeu tudo.
                  console.error("[Ponteira] Falha ao salvar as técnicas:", erro);
                  toast.error("Treino salvo, mas as técnicas não. Edite depois.");
                  return;
                }
                const comConta = parceiros.filter((p) => p.partnerId).length;
                toast.success(
                  comConta
                    ? `Treino registrado. ${comConta} ${comConta === 1 ? "parceiro vai confirmar" : "parceiros vão confirmar"}.`
                    : "Treino registrado. Boa!",
                );
              }}
            />
          )}
        </Dialog>
      }
    >
      {/* As análises nascem destes treinos — por isso ficam aqui. */}
      <Link to="/analises" className="block">
        <div className="tap flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 active:scale-[0.99]">
          <Icone.analise className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Análises do treinador</p>
            <p className="text-xs text-muted-foreground">
              A leitura do que estes treinos mostram
            </p>
          </div>
          <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>

      {months.length > 0 && (
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {new Date(m + "-01T00:00:00").toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hydrated && filtered.length === 0 && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum treino registrado ainda. Toca em <b>Novo</b> e bora.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((t) => (
          <Card key={t.id} className="border-border/60 bg-card/70">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black">
                    {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                      {t.type}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {t.durationMin} min
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {t.rolls} {t.rolls === 1 ? "rola" : "rolas"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                <button
                  onClick={() => setEditando(t)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  aria-label={`Editar treino de ${new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                >
                  <Icone.editar className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const backup = t;
                    void remove(t.id);
                    toast("Treino removido.", {
                      action: {
                        label: "Desfazer",
                        onClick: () =>
                          add({
                            date: backup.date,
                            type: backup.type,
                            durationMin: backup.durationMin,
                            rolls: backup.rolls,
                            partners: backup.partners,
                            techniques: backup.techniques,
                            notes: backup.notes,
                          }),
                      },
                    });
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remover treino de ${new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                >
                  <Icone.apagar className="h-4 w-4" />
                </button>
                </div>
              </div>
              {t.partners && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <b className="text-foreground">Parceiros:</b> {t.partners}
                </p>
              )}
              {t.techniques && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <b className="text-foreground">Técnicas:</b> {t.techniques}
                </p>
              )}
              {t.notes && <RelatoDoTreino texto={t.notes} />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edição: o diálogo só é montado quando há treino escolhido, para o
          formulário nascer já com os valores certos em vez de sincronizar
          depois. */}
      <Dialog
        open={!!editando}
        onOpenChange={(aberto) => !aberto && setEditando(null)}
      >
        {editando && (
          <TrainingDialog
            key={editando.id}
            treino={editando}
            onSalvar={async ({ parceiros, tecnicasDoDia, ...t }) => {
              const alvo = editando;
              setEditando(null);
              const salvou = await update(alvo.id, t);
              if (!salvou) return;
              try {
                await salvarParceirosDoTreino(alvo.id, parceiros);
              } catch (erro) {
                console.error("[Ponteira] Falha ao salvar os parceiros:", erro);
                toast.error("Treino salvo, mas os parceiros não.");
                return;
              }
              try {
                await salvarTecnicasDoTreino(alvo.id, tecnicasDoDia);
              } catch (erro) {
                console.error("[Ponteira] Falha ao salvar as técnicas:", erro);
                toast.error("Treino salvo, mas as técnicas não.");
                return;
              }
              toast.success("Treino atualizado.");
            }}
          />
        )}
      </Dialog>
    </PageShell>
  );
}

export interface DadosDoTreino {
  date: string;
  type: TrainingType;
  durationMin: number;
  rolls: number;
  partners: string;
  techniques: string;
  notes: string;
  parceiros: RascunhoParceiro[];
  tecnicasDoDia: RascunhoTecnica[];
}

/**
 * O mesmo formulário serve para criar e para editar. Sem `treino`, é um treino
 * novo; com `treino`, os campos já vêm preenchidos e os parceiros são buscados
 * no banco (é de lá que vem o `id` de cada linha, que é o que permite gravar
 * por diferença sem zerar confirmações).
 */
function TrainingDialog({
  treino,
  onSalvar,
}: {
  treino?: Training;
  onSalvar: (t: DadosDoTreino) => void;
}) {
  const editando = !!treino;
  const [date, setDate] = useState(
    treino?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [type, setType] = useState<TrainingType>(treino?.type ?? "Gi");
  const [durationMin, setDuration] = useState(treino?.durationMin ?? 60);
  const [rolls, setRolls] = useState(treino?.rolls ?? 4);
  const [techniques, setTechniques] = useState(treino?.techniques ?? "");
  const [notes, setNotes] = useState(treino?.notes ?? "");
  const [parceiros, setParceiros] = useState<RascunhoParceiro[]>([]);
  const [tecnicasDoDia, setTecnicasDoDia] = useState<RascunhoTecnica[]>([]);

  // No modo edição as técnicas já ligadas chegam do banco depois da primeira
  // pintura — mesma dança dos parceiros, e pelo mesmo motivo: só copiamos
  // quando chegam, e daí em diante quem manda é o que a pessoa está mexendo.
  const { tecnicas: tecnicasSalvas, ready: tecnicasProntas } = useTecnicasDoTreino(
    treino?.id ?? null,
  );

  const { linhas, ready: parceirosProntos } = useParceirosDoTreino(
    treino?.id ?? null,
  );

  // As linhas gravadas chegam depois da primeira pintura. Só copiamos para o
  // rascunho quando elas chegam — daí em diante quem manda é o que a pessoa
  // está digitando, e por isso a dependência é o `ready`, não a lista.
  useEffect(() => {
    if (parceirosProntos) setParceiros(linhas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceirosProntos, treino?.id]);

  useEffect(() => {
    if (tecnicasProntas)
      setTecnicasDoDia(
        tecnicasSalvas.map((t) => ({
          id: t.id,
          nome: t.name,
          categoria: t.category,
          nota: t.nota,
        })),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tecnicasProntas, treino?.id]);

  const vaiVoltarParaFila =
    editando &&
    parceiros.some((p) => {
      if (!p.partnerId || !p.id) return false;
      const antes = linhas.find((l) => l.id === p.id);
      if (!antes || antes.confirmacao !== "confirmado") return false;
      return (
        antes.rolls !== p.rolls ||
        antes.subsFor !== p.subsFor ||
        antes.subsAgainst !== p.subsAgainst
      );
    });

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar treino" : "Novo treino"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TrainingType)}>
              <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gi">Gi (Kimono)</SelectItem>
                <SelectItem value="No-Gi">No-Gi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={durationMin}
              onChange={(e) => setDuration(+e.target.value)}
            />
          </div>
          <div>
            <Label>Rolas</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={rolls}
              onChange={(e) => setRolls(+e.target.value)}
            />
          </div>
        </div>
        <ParceirosDoTreino linhas={parceiros} aoMudar={setParceiros} />
        {/* O campo de texto livre volta a ser o que sempre foi: a anotação
            rápida do treino. Ele não some porque não estava quebrado — quem
            só quer escrever "DLR → costas" continua escrevendo. */}
        {/* Os DOIS campos de técnica continuam aqui, e é de propósito.
            "Técnicas trabalhadas" é o caminho rápido: uma linha, sem abrir
            diálogo, para quem está de pé no vestiário. "Técnicas do dia" é o
            caminho que alimenta a galeria.

            Cheguei a esconder o primeiro em treino novo, achando que dois
            campos para o mesmo assunto confundem. Confundem mesmo — mas a
            confusão se resolve dizendo para que serve cada um, e escondê-lo
            custava o caminho rápido, que é o que se usa com a mão suada.
            A suíte de técnicas prende isso desde que o estruturado nasceu. */}
        <div>
          <Label htmlFor="treino-tecnicas">Técnicas trabalhadas</Label>
          <Textarea
            id="treino-tecnicas"
            rows={2}
            value={techniques}
            onChange={(e) => setTechniques(e.target.value)}
            placeholder="Ex: DLR → costas, tesourinha"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Anotação rápida, em texto. Para a técnica entrar na sua galeria,
            use “Técnicas do dia” logo abaixo.
          </p>
        </div>

        <SeletorDeTecnicas valor={tecnicasDoDia} aoMudar={setTecnicasDoDia} />
        <div>
          <Label htmlFor="treino-notas">Como me senti / observações</Label>
          <Textarea id="treino-notas" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sensações, o que travou, o que fluiu…" />
        </div>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-col">
        {vaiVoltarParaFila && (
          <p className="w-full text-xs text-muted-foreground">
            Você mudou o placar de alguém que já tinha confirmado. Esse registro
            volta para a fila e a pessoa vai poder ver o número novo.
          </p>
        )}
        <Button
          className="w-full"
          onClick={() =>
            onSalvar({
              date,
              type,
              durationMin,
              rolls,
              // mantido para os treinos antigos continuarem exibindo nomes
              partners: parceiros
                .map((p) => p.partnerName)
                .filter(Boolean)
                .join(", "),
              // O texto livre continua indo: os treinos antigos ainda o
              // exibem, e apagá-lo agora perderia o que está escrito lá.
              techniques,
              notes,
              parceiros,
              tecnicasDoDia,
            })
          }
        >
          {editando ? "Salvar alterações" : "Salvar treino"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
