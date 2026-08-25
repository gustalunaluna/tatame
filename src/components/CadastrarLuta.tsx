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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoNumero } from "@/components/CampoNumero";
import {
  FAIXAS_DE_OPONENTE,
  GOLPES_COMUNS,
  METODOS,
  RESULTADOS,
  type Metodo,
  type NovaLuta,
  type Resultado,
} from "@/lib/lutas-storage";
import { cn } from "@/lib/utils";

const SEM_FAIXA = "__nenhuma__";

/** Empate não tem "como ganhou" — só como a luta parou. */
const METODOS_DE_EMPATE = new Set<Metodo>(["interrompida", "decisao"]);

const hoje = () => new Date().toISOString().slice(0, 10);

export function CadastrarLuta({
  gatilho,
  aoSalvar,
}: {
  gatilho: React.ReactNode;
  aoSalvar: (l: NovaLuta) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);

  const [data, setData] = useState(hoje());
  const [evento, setEvento] = useState("");
  const [oficial, setOficial] = useState(true);
  const [categoria, setCategoria] = useState("");
  const [oponente, setOponente] = useState("");
  const [oponenteFaixa, setOponenteFaixa] = useState(SEM_FAIXA);
  const [resultado, setResultado] = useState<Resultado>("vitoria");
  const [metodo, setMetodo] = useState<Metodo | null>("finalizacao");
  const [golpe, setGolpe] = useState("");
  const [minutos, setMinutos] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [notas, setNotas] = useState("");

  function limpar() {
    setData(hoje());
    setEvento("");
    setOficial(true);
    setCategoria("");
    setOponente("");
    setOponenteFaixa(SEM_FAIXA);
    setResultado("vitoria");
    setMetodo("finalizacao");
    setGolpe("");
    setMinutos(0);
    setSegundos(0);
    setNotas("");
  }

  // Trocar para empate esvazia um método que só faz sentido com vencedor.
  function trocarResultado(novo: Resultado) {
    setResultado(novo);
    if (novo === "empate" && metodo && !METODOS_DE_EMPATE.has(metodo)) {
      setMetodo("interrompida");
      setGolpe("");
    }
  }

  const metodosVisiveis =
    resultado === "empate"
      ? METODOS.filter((m) => METODOS_DE_EMPATE.has(m.valor))
      : METODOS;

  const tempoSeg =
    minutos === 0 && segundos === 0 ? null : minutos * 60 + segundos;

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
          <DialogTitle>Registrar luta</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Resultado</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {RESULTADOS.map((r) => (
                <button
                  key={r.valor}
                  type="button"
                  onClick={() => trocarResultado(r.valor)}
                  aria-pressed={resultado === r.valor}
                  className={cn(
                    "tap rounded-xl border p-2.5 text-sm font-bold active:scale-95",
                    resultado === r.valor
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-transparent text-muted-foreground",
                  )}
                >
                  {r.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{resultado === "empate" ? "Como parou" : "Como terminou"}</Label>
            <Select
              value={metodo ?? ""}
              onValueChange={(v) => {
                const m = v as Metodo;
                setMetodo(m);
                if (m !== "finalizacao") setGolpe("");
              }}
            >
              <SelectTrigger aria-label="Método">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {metodosVisiveis.map((m) => (
                  <SelectItem key={m.valor} value={m.valor}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {metodo === "finalizacao" && (
            <div>
              <Label htmlFor="luta-golpe">Qual golpe</Label>
              <Input
                id="luta-golpe"
                value={golpe}
                onChange={(e) => setGolpe(e.target.value)}
                placeholder="Ex: Armlock"
                list="golpes-comuns"
              />
              <datalist id="golpes-comuns">
                {GOLPES_COMUNS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GOLPES_COMUNS.slice(0, 5).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGolpe(g)}
                    className="tap rounded-lg border border-border/60 px-2 py-1 text-xs text-muted-foreground active:scale-95"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="luta-data">Data</Label>
              <Input
                id="luta-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <Label>Faixa do oponente</Label>
              <Select value={oponenteFaixa} onValueChange={setOponenteFaixa}>
                <SelectTrigger aria-label="Faixa do oponente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_FAIXA}>Não sei</SelectItem>
                  {FAIXAS_DE_OPONENTE.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="luta-evento">Evento</Label>
            <Input
              id="luta-evento"
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              placeholder="Ex: FJU Challenger"
            />
          </div>

          <div>
            <Label htmlFor="luta-categoria">Categoria</Label>
            <Input
              id="luta-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Faixa Branca Adulto até 82 kg"
            />
          </div>

          <div>
            <Label htmlFor="luta-oponente">Oponente (se souber)</Label>
            <Input
              id="luta-oponente"
              value={oponente}
              onChange={(e) => setOponente(e.target.value)}
              placeholder="Nome ou equipe"
            />
          </div>

          <div>
            <Label>Tempo de luta (opcional)</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <CampoNumero
                id="luta-min"
                valor={minutos}
                aoMudar={setMinutos}
                min={0}
                max={90}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">min</span>
              <CampoNumero
                id="luta-seg"
                valor={segundos}
                aoMudar={setSegundos}
                min={0}
                max={59}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">seg</span>
            </div>
          </div>

          <div>
            <Label htmlFor="luta-notas">O que aconteceu</Label>
            <Textarea
              id="luta-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="A sequência, o que funcionou, onde a luta virou."
              rows={3}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3">
            <input
              type="checkbox"
              checked={oficial}
              onChange={(e) => setOficial(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="text-sm">
              Luta oficial de campeonato
              <span className="block text-xs text-muted-foreground">
                Só as oficiais entram no cartel. Superluta e treino ficam de fora.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!metodo || (metodo === "finalizacao" && !golpe.trim())}
            onClick={async () => {
              const salvou = await aoSalvar({
                data,
                evento,
                oficial,
                oponente,
                oponenteFaixa: oponenteFaixa === SEM_FAIXA ? "" : oponenteFaixa,
                categoria,
                resultado,
                metodo,
                golpe,
                tempoSeg,
                notas,
              });
              if (salvou) {
                setAberto(false);
                limpar();
                toast.success("Luta registrada. O cartel já atualizou.");
              }
            }}
          >
            Salvar luta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
