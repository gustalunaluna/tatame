import { useState } from "react";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EXPLICACAO_DO_MOTIVO,
  MOTIVOS_DE_PARADA,
  ehMotivoDeParada,
  type MotivoDeParada,
} from "@/lib/dia-parado";
import type { Training } from "@/lib/bjj-types";

export interface DadosDoDiaParado {
  date: string;
  type: MotivoDeParada;
  durationMin: 0;
  rolls: 0;
  partners: "";
  techniques: "";
  notes: string;
}

/**
 * O formulário do dia parado: data, motivo e uma linha de texto. Três campos.
 *
 * É de propósito que ele seja curto. Quem está registrando um dia parado
 * normalmente está doente, machucado ou de saco cheio — pedir duração, rolas e
 * parceiros para dizer "não treinei" é pedir para a pessoa desistir e não
 * registrar nada, que é o problema que este formulário existe para resolver.
 *
 * Os motivos são botões, não lista suspensa: são seis, cabem na tela, e um
 * toque é menos do que abrir-rolar-escolher com a mão engessada.
 */
export function DiaParadoDialog({
  registro,
  aoSalvar,
}: {
  registro?: Training;
  aoSalvar: (d: DadosDoDiaParado) => void;
}) {
  const editando = !!registro;
  const [date, setDate] = useState(
    registro?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [motivo, setMotivo] = useState<MotivoDeParada>(
    registro && ehMotivoDeParada(registro.type) ? registro.type : "Doença",
  );
  const [notes, setNotes] = useState(registro?.notes ?? "");

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {editando ? "Editar dia parado" : "Dia parado"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <p className="rounded-xl bg-secondary/60 p-3 text-xs text-secondary-foreground">
          Não entra na conta de treinos nem nas horas de tatame — e{" "}
          <b>não quebra a sua sequência</b>. O dia fica registrado com o motivo,
          que é o que faz diferença quando você olhar para trás em março.
        </p>

        <div>
          <Label htmlFor="parado-data">Data</Label>
          <Input
            id="parado-data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Motivo</Label>
          <div
            className="mt-1 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Motivo"
          >
            {MOTIVOS_DE_PARADA.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                aria-pressed={m === motivo}
                className={
                  m === motivo
                    ? "tap rounded-xl border border-primary bg-primary/15 px-3 py-2 text-sm font-bold text-primary"
                    : "tap rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground active:scale-[0.97]"
                }
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {EXPLICACAO_DO_MOTIVO[motivo]}
          </p>
        </div>

        <div>
          <Label htmlFor="parado-notas">O que aconteceu</Label>
          <Textarea
            id="parado-notas"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional. Ex: virose desde sábado, volto na quinta em intensidade reduzida."
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          className="w-full"
          onClick={() =>
            aoSalvar({
              date,
              type: motivo,
              durationMin: 0,
              rolls: 0,
              partners: "",
              techniques: "",
              notes,
            })
          }
        >
          {editando ? "Salvar alterações" : "Registrar dia parado"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
