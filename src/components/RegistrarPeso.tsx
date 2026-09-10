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
import { CampoDecimal } from "@/components/CampoDecimal";
import type { NovaPesagem } from "@/lib/dieta";

const hoje = () => new Date().toISOString().slice(0, 10);

export function RegistrarPeso({
  pesoAnterior,
  gatilho,
  aoSalvar,
}: {
  /** Vem preenchido com o último peso: quase sempre a mudança é de algumas centenas de gramas. */
  pesoAnterior: number | null;
  gatilho: React.ReactNode;
  aoSalvar: (p: NovaPesagem) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hoje());
  const [pesoKg, setPesoKg] = useState(pesoAnterior ?? 0);
  const [gorduraPct, setGorduraPct] = useState(0);
  const [nota, setNota] = useState("");

  function limpar() {
    setData(hoje());
    setPesoKg(pesoAnterior ?? 0);
    setGorduraPct(0);
    setNota("");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pesagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="peso-data">Dia</Label>
            <Input
              id="peso-data"
              type="date"
              value={data}
              max={hoje()}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="peso-kg">Peso</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <CampoDecimal
                id="peso-kg"
                valor={pesoKg}
                aoMudar={setPesoKg}
                min={20}
                max={399}
                casas={1}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sempre no mesmo horário, de preferência em jejum e depois do
              banheiro. Pesar de manhã num dia e à noite no outro inventa uma
              variação de mais de um quilo que não existe.
            </p>
          </div>

          <div>
            <Label htmlFor="peso-gordura">Gordura corporal (opcional)</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <CampoDecimal
                id="peso-gordura"
                valor={gorduraPct}
                aoMudar={setGorduraPct}
                min={0}
                max={70}
                casas={1}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="peso-nota">Observação</Label>
            <Input
              id="peso-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Véspera de competição, depois de feriado…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={pesoKg <= 20}
            onClick={async () => {
              const salvou = await aoSalvar({
                data,
                pesoKg,
                // Zero não é uma medição de gordura, é o campo em branco.
                gorduraPct: gorduraPct > 0 ? gorduraPct : null,
                nota,
              });
              if (salvou) {
                setAberto(false);
                limpar();
                toast.success("Pesagem registrada.");
              }
            }}
          >
            Salvar pesagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
