import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { useTrainings, useHydrated } from "@/lib/bjj-storage";
import { salvarParceirosDoTreino } from "@/lib/social-storage";
import { ParceirosDoTreino } from "@/components/ParceirosDoTreino";
import type { RascunhoParceiro } from "@/lib/social-types";
import type { TrainingType } from "@/lib/bjj-types";

export const Route = createFileRoute("/_authenticated/diario")({
  head: () => ({
    meta: [
      { title: "Diário — Tatame" },
      { name: "description", content: "Registre cada treino: Gi/No-Gi, rolos, técnicas e sensações." },
    ],
  }),
  component: DiaryPage,
});

function DiaryPage() {
  const hydrated = useHydrated();
  const { items, add, remove } = useTrainings();
  const [open, setOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const months = Array.from(new Set(items.map((t) => t.date.slice(0, 7)))).sort().reverse();
  const filtered =
    monthFilter === "all"
      ? items
      : items.filter((t) => t.date.startsWith(monthFilter));

  return (
    <PageShell
      title="Diário"
      subtitle="Cada rolo conta uma história."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          <NewTrainingDialog
            onAdd={async ({ parceiros, ...t }) => {
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
                console.error("[Tatame] Falha ao salvar os parceiros:", erro);
                toast.error("Treino salvo, mas os parceiros não. Edite depois.");
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
        </Dialog>
      }
    >
      {/* As análises nascem destes treinos — por isso ficam aqui. */}
      <Link to="/analises" className="block">
        <div className="tap flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 active:scale-[0.99]">
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Análises do treinador</p>
            <p className="text-xs text-muted-foreground">
              A leitura do que estes treinos mostram
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                      {t.type}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {t.durationMin} min
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {t.rolls} rolos
                    </span>
                  </div>
                </div>
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
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
              {t.notes && (
                <p className="mt-2 rounded-md border border-border/50 bg-background/40 p-2 text-xs italic text-muted-foreground">
                  “{t.notes}”
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

function NewTrainingDialog({
  onAdd,
}: {
  onAdd: (t: {
    date: string;
    type: TrainingType;
    durationMin: number;
    rolls: number;
    partners: string;
    techniques: string;
    notes: string;
    parceiros: RascunhoParceiro[];
  }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<TrainingType>("Gi");
  const [durationMin, setDuration] = useState(60);
  const [rolls, setRolls] = useState(4);
  const [techniques, setTechniques] = useState("");
  const [notes, setNotes] = useState("");
  const [parceiros, setParceiros] = useState<RascunhoParceiro[]>([]);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo treino</DialogTitle>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Label>Rolos</Label>
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
        <div>
          <Label>Técnicas trabalhadas</Label>
          <Textarea rows={2} value={techniques} onChange={(e) => setTechniques(e.target.value)} placeholder="Ex: DLR → costas, tesourinha" />
        </div>
        <div>
          <Label>Como me senti / observações</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sensações, o que travou, o que fluiu…" />
        </div>
      </div>
      <DialogFooter>
        <Button
          className="w-full"
          onClick={() =>
            onAdd({
              date,
              type,
              durationMin,
              rolls,
              // mantido para os treinos antigos continuarem exibindo nomes
              partners: parceiros
                .map((p) => p.partnerName)
                .filter(Boolean)
                .join(", "),
              techniques,
              notes,
              parceiros,
            })
          }
        >
          Salvar treino
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
