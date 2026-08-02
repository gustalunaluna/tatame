import { useState } from "react";
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
import { SeloDeMedalha } from "@/components/Medalha";
import { useEquipes } from "@/lib/social-storage";
import { COLOCACOES, type Colocacao, type Modalidade, type NovaMedalha } from "@/lib/medalhas-storage";
import { cn } from "@/lib/utils";

const SEM_EQUIPE = "__nenhuma__";

export function CadastrarMedalha({
  gatilho,
  aoSalvar,
}: {
  gatilho: React.ReactNode;
  aoSalvar: (m: NovaMedalha) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);
  const { equipes } = useEquipes();
  const aprovadas = equipes.filter((e) => e.status === "aprovada");

  const [colocacao, setColocacao] = useState<Colocacao>("ouro");
  const [evento, setEvento] = useState("");
  const [categoria, setCategoria] = useState("");
  const [federacao, setFederacao] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("Gi");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [absoluto, setAbsoluto] = useState(false);
  const [equipeId, setEquipeId] = useState<string>(SEM_EQUIPE);

  function limpar() {
    setColocacao("ouro");
    setEvento("");
    setCategoria("");
    setFederacao("");
    setModalidade("Gi");
    setData(new Date().toISOString().slice(0, 10));
    setAbsoluto(false);
    setEquipeId(SEM_EQUIPE);
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
          <DialogTitle>Registrar medalha</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Colocação</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {COLOCACOES.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  onClick={() => setColocacao(c.valor)}
                  aria-pressed={colocacao === c.valor}
                  className={cn(
                    "tap flex flex-col items-center gap-1.5 rounded-xl border p-2.5 active:scale-95",
                    colocacao === c.valor
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-transparent",
                  )}
                >
                  <SeloDeMedalha colocacao={c.valor} className="h-8 w-8" />
                  <span className="text-xs font-bold">{c.nome}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="medalha-evento">Campeonato</Label>
            <Input
              id="medalha-evento"
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              placeholder="Ex: Campeonato Paranaense 2026"
            />
          </div>

          <div>
            <Label htmlFor="medalha-categoria">Categoria</Label>
            <Input
              id="medalha-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Adulto Azul Médio"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="medalha-data">Data</Label>
              <Input
                id="medalha-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select
                value={modalidade}
                onValueChange={(v) => setModalidade(v as Modalidade)}
              >
                <SelectTrigger aria-label="Modalidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gi">Gi (Kimono)</SelectItem>
                  <SelectItem value="No-Gi">No-Gi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="medalha-federacao">Federação (se houver)</Label>
            <Input
              id="medalha-federacao"
              value={federacao}
              onChange={(e) => setFederacao(e.target.value)}
              placeholder="Ex: CBJJ, IBJJF, FPJJ"
            />
          </div>

          <div>
            <Label>Representando</Label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger aria-label="Representando">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_EQUIPE}>Nenhuma academia</SelectItem>
                {aprovadas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              A medalha também aparece no perfil da academia, com o seu nome do
              lado.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3">
            <input
              type="checkbox"
              checked={absoluto}
              onChange={(e) => setAbsoluto(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="text-sm">Foi no absoluto</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!evento.trim()}
            onClick={async () => {
              const salvou = await aoSalvar({
                colocacao,
                evento,
                categoria,
                federacao,
                modalidade,
                data,
                absoluto,
                teamId: equipeId === SEM_EQUIPE ? null : equipeId,
              });
              if (salvou) {
                setAberto(false);
                limpar();
                toast.success("Medalha registrada. Parabéns!");
              }
            }}
          >
            Salvar medalha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
