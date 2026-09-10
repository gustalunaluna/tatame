import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Icone } from "@/design/icones";
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
import {
  buscarAlimentos,
  escalar,
  MOMENTOS,
  type Alimento,
  type NovaRefeicao,
} from "@/lib/dieta";
import { useAlimentosRecentes, type AlimentoUsado } from "@/lib/dieta-storage";
import { cn } from "@/lib/utils";

/**
 * Registrar o que comeu.
 *
 * A tela inteira é organizada em volta de um número: quantos toques custa
 * registrar o almoço de terça pela décima vez. Por isso a ordem é
 *
 *   1. o que você SEMPRE come (vem do seu próprio histórico)
 *   2. a tabela de alimentos comuns
 *   3. digitar do zero
 *
 * e não o contrário. Aplicativo de dieta não morre por falta de recurso, morre
 * na terceira semana, quando registrar vira trabalho.
 */
export function RegistrarRefeicao({
  data,
  momentoSugerido,
  gatilho,
  aoSalvar,
}: {
  data: string;
  momentoSugerido?: string;
  gatilho: React.ReactNode;
  aoSalvar: (r: NovaRefeicao) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);
  const { alimentos: usados } = useAlimentosRecentes(12);

  const [momento, setMomento] = useState(momentoSugerido ?? MOMENTOS[0]);
  const [busca, setBusca] = useState("");
  const [base, setBase] = useState<Alimento | null>(null);
  const [quantidade, setQuantidade] = useState(1);

  const [alimento, setAlimento] = useState("");
  const [porcao, setPorcao] = useState("");
  const [kcal, setKcal] = useState(0);
  const [proteinaG, setProteinaG] = useState(0);
  const [carboidratoG, setCarboidratoG] = useState(0);
  const [gorduraG, setGorduraG] = useState(0);

  const encontrados = useMemo(() => buscarAlimentos(busca, busca ? 24 : 10), [busca]);

  function limpar() {
    setMomento(momentoSugerido ?? MOMENTOS[0]);
    setBusca("");
    setBase(null);
    setQuantidade(1);
    setAlimento("");
    setPorcao("");
    setKcal(0);
    setProteinaG(0);
    setCarboidratoG(0);
    setGorduraG(0);
  }

  function aplicar(m: {
    kcal: number;
    proteinaG: number;
    carboidratoG: number;
    gorduraG: number;
  }) {
    setKcal(m.kcal);
    setProteinaG(m.proteinaG);
    setCarboidratoG(m.carboidratoG);
    setGorduraG(m.gorduraG);
  }

  function escolherDaTabela(a: Alimento) {
    setBase(a);
    setQuantidade(1);
    setAlimento(a.nome);
    setPorcao(a.medida);
    aplicar(a);
    setBusca("");
  }

  /** Um prato que ele já registrou antes volta exatamente como estava. */
  function repetir(u: AlimentoUsado) {
    setBase(null);
    setQuantidade(1);
    setAlimento(u.alimento);
    setPorcao(u.porcao);
    aplicar(u);
    setBusca("");
  }

  /**
   * A quantidade só multiplica enquanto o item veio da tabela. Mexeu num macro
   * na mão, o multiplicador some — senão o próximo toque no "+" desfaria a
   * correção que a pessoa acabou de fazer, e ela não teria como adivinhar.
   */
  function mudarQuantidade(q: number) {
    setQuantidade(q);
    if (!base) return;
    aplicar(escalar(base, q));
    setPorcao(q === 1 ? base.medida : `${formatar(q)}× ${base.medida}`);
  }

  function editouMacro(setter: (n: number) => void) {
    return (n: number) => {
      setBase(null);
      setter(n);
    };
  }

  const podeSalvar = alimento.trim().length > 0;

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
          <DialogTitle>O que você comeu</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Momento</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MOMENTOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMomento(m)}
                  aria-pressed={momento === m}
                  className={cn(
                    "tap rounded-lg border px-2.5 py-1.5 text-xs font-bold active:scale-95",
                    momento === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {usados.length > 0 && !busca && (
            <div>
              <Label>Você costuma comer</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {usados.map((u) => (
                  <button
                    key={u.alimento}
                    type="button"
                    onClick={() => repetir(u)}
                    className="tap rounded-lg border border-border/60 px-2.5 py-1.5 text-xs active:scale-95"
                  >
                    {u.alimento}
                    <span className="ml-1 tabular-nums text-muted-foreground">
                      {u.kcal} kcal
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="ref-busca">Buscar na tabela</Label>
            <Input
              id="ref-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="frango, arroz, whey, marmita…"
            />
            <ul className="mt-1.5 space-y-1">
              {encontrados.map((a) => (
                <li key={a.nome}>
                  <button
                    type="button"
                    onClick={() => escolherDaTabela(a)}
                    className="tap flex w-full items-center gap-2 rounded-lg border border-border/60 p-2 text-left active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {a.nome}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {a.medida} · P {formatar(a.proteinaG)} · C{" "}
                        {formatar(a.carboidratoG)} · G {formatar(a.gorduraG)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-primary">
                      {a.kcal}
                    </span>
                  </button>
                </li>
              ))}
              {busca && encontrados.length === 0 && (
                <li className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                  Não está na tabela. Escreva o nome no campo abaixo e preencha
                  as calorias — o app guarda, e da próxima vez ele aparece em
                  "você costuma comer".
                </li>
              )}
            </ul>
          </div>

          {base && (
            <div>
              <Label>Quantas porções de {base.medida}</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Menos meia porção"
                  onClick={() => mudarQuantidade(Math.max(0.5, quantidade - 0.5))}
                  className="tap grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/60 active:scale-90"
                >
                  <Icone.remover className="h-4 w-4" />
                </button>
                <CampoDecimal
                  valor={quantidade}
                  aoMudar={mudarQuantidade}
                  min={0.25}
                  max={20}
                  casas={2}
                  className="w-20 text-center"
                />
                <button
                  type="button"
                  aria-label="Mais meia porção"
                  onClick={() => mudarQuantidade(quantidade + 0.5)}
                  className="tap grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/60 active:scale-90"
                >
                  <Icone.adicionar className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="ref-nome">Alimento</Label>
            <Input
              id="ref-nome"
              value={alimento}
              onChange={(e) => {
                setBase(null);
                setAlimento(e.target.value);
              }}
              placeholder="Marmita da tia, shake pós-treino…"
            />
          </div>

          <div>
            <Label htmlFor="ref-porcao">Porção</Label>
            <Input
              id="ref-porcao"
              value={porcao}
              onChange={(e) => setPorcao(e.target.value)}
              placeholder="2 conchas, 150 g, 1 prato"
            />
          </div>

          <div>
            <Label htmlFor="ref-kcal">Calorias</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <CampoDecimal
                id="ref-kcal"
                valor={kcal}
                aoMudar={editouMacro(setKcal)}
                min={0}
                max={9000}
                casas={0}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">kcal</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="ref-p">Proteína</Label>
              <CampoDecimal
                id="ref-p"
                valor={proteinaG}
                aoMudar={editouMacro(setProteinaG)}
                max={999}
              />
            </div>
            <div>
              <Label htmlFor="ref-c">Carbo.</Label>
              <CampoDecimal
                id="ref-c"
                valor={carboidratoG}
                aoMudar={editouMacro(setCarboidratoG)}
                max={999}
              />
            </div>
            <div>
              <Label htmlFor="ref-g">Gordura</Label>
              <CampoDecimal
                id="ref-g"
                valor={gorduraG}
                aoMudar={editouMacro(setGorduraG)}
                max={999}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os três em gramas. Deixe em zero se não souber — a caloria sozinha
            já serve para fechar o dia.
          </p>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!podeSalvar}
            onClick={async () => {
              const salvou = await aoSalvar({
                data,
                momento,
                alimento,
                porcao,
                kcal,
                proteinaG,
                carboidratoG,
                gorduraG,
              });
              if (salvou) {
                setAberto(false);
                limpar();
                toast.success("Anotado.");
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

/** 1 vira "1", 1,5 vira "1,5" — sem o ",0" que só faz o olho tropeçar. */
function formatar(n: number): string {
  return String(Math.round(n * 10) / 10).replace(".", ",");
}
