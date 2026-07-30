import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
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
import { useTechniques, useHydrated } from "@/lib/bjj-storage";
import {
  TECHNIQUE_CATEGORIES,
  type Technique,
  type TechniqueCategory,
} from "@/lib/bjj-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tecnicas")({
  head: () => ({
    meta: [
      { title: "Técnicas — Tatame" },
      { name: "description", content: "Biblioteca de técnicas de Jiu-Jitsu com nota de domínio." },
    ],
  }),
  component: TechniquesPage,
});

function TechniquesPage() {
  const hydrated = useHydrated();
  const { items, add, remove, update } = useTechniques();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Technique | null>(null);

  const filtered = useMemo(() => {
    return items
      .filter((t) => (cat === "all" ? true : t.category === cat))
      .filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  }, [items, q, cat]);

  return (
    <PageShell
      title="Técnicas"
      subtitle="Sua biblioteca. Domine, marque, revise."
      action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </DialogTrigger>
          <TechniqueDialog
            initial={editing}
            onSave={(t) => {
              if (editing) { update(editing.id, t); toast.success("Técnica atualizada."); }
              else { add(t); toast.success("Técnica adicionada."); }
              setOpen(false); setEditing(null);
            }}
          />
        </Dialog>
      }
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar técnica…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...TECHNIQUE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold active:scale-95",
              cat === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card/50 text-muted-foreground",
            )}
          >
            {c === "all" ? "Todas" : c}
          </button>
        ))}
      </div>

      {hydrated && filtered.length === 0 && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nada por aqui. Adicione uma técnica.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((t) => (
          <Card key={t.id} className="border-border/60 bg-card/70">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="text-[11px] uppercase tracking-wider text-primary">
                    {t.category}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => { setEditing(t); setOpen(true); }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      const backup = t;
                      remove(t.id);
                      toast("Técnica removida.", {
                        action: {
                          label: "Desfazer",
                          onClick: () =>
                            add({
                              name: backup.name,
                              category: backup.category,
                              notes: backup.notes,
                              videoUrl: backup.videoUrl,
                              mastery: backup.mastery,
                            }),
                        },
                      });
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {t.notes && (
                <p className="mt-2 text-xs text-muted-foreground">{t.notes}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <MasteryStars
                  value={t.mastery}
                  onChange={(v) => update(t.id, { mastery: v })}
                />
                {t.videoUrl && (
                  <a
                    href={t.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    Vídeo <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

function MasteryStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n === value ? n - 1 : n)}
          aria-label={`Domínio ${n}`}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-4 w-4 transition-[fill,stroke,transform] duration-200 ease-[var(--ease-out-quart)]",
              n <= value ? "fill-gold stroke-gold" : "stroke-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function TechniqueDialog({
  initial,
  onSave,
}: {
  initial: Technique | null;
  onSave: (t: Omit<Technique, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<TechniqueCategory>(initial?.category ?? "Guarda");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [mastery, setMastery] = useState(initial?.mastery ?? 0);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar técnica" : "Nova técnica"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TechniqueCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TECHNIQUE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Anotações</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <Label>Link do vídeo (YouTube)</Label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/…" />
        </div>
        <div>
          <Label>Domínio</Label>
          <div className="mt-1">
            <MasteryStars value={mastery} onChange={setMastery} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), category, notes, videoUrl, mastery })}
        >
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
