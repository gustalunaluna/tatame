import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Pergunta antes de fazer algo que não dá para desfazer.
 * O botão de confirmar nunca é o primeiro do teclado nem fica onde estava o
 * botão que abriu — evita o toque em sequência que confirma sem ler.
 */
export function Confirmar({
  gatilho,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  destrutivo = false,
  aoConfirmar,
}: {
  gatilho: ReactNode;
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  destrutivo?: boolean;
  aoConfirmar: () => void | Promise<unknown>;
}) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{gatilho}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            variant={destrutivo ? "destructive" : "default"}
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              try {
                await aoConfirmar();
              } finally {
                setOcupado(false);
                setAberto(false);
              }
            }}
          >
            {ocupado ? "Um instante…" : rotuloConfirmar}
          </Button>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
