import { Minus, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParcerias } from "@/lib/social-storage";
import type { RascunhoParceiro } from "@/lib/social-types";
import { cn } from "@/lib/utils";

const NAO_CADASTRADO = "__livre__";

/** Contador de +/- com alvo de toque grande — é usado com o dedo suado. */
function Contador({
  rotulo,
  valor,
  aoMudar,
  destaque,
}: {
  rotulo: string;
  valor: number;
  aoMudar: (v: number) => void;
  destaque?: "bom" | "ruim";
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          aria-label={`Menos um em ${rotulo}`}
          onClick={() => aoMudar(Math.max(0, valor - 1))}
          className="tap grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground active:scale-90"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          aria-live="polite"
          className={cn(
            "w-7 text-center text-lg font-black tabular-nums",
            destaque === "bom" && valor > 0 && "text-primary",
            destaque === "ruim" && valor > 0 && "text-destructive",
          )}
        >
          {valor}
        </span>
        <button
          type="button"
          aria-label={`Mais um em ${rotulo}`}
          onClick={() => aoMudar(Math.min(100, valor + 1))}
          className="tap grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground active:scale-90"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Bloco de "com quem eu rolei" dentro do formulário de treino.
 * Parceiro cadastrado vira registro espelhado (ele confirma depois);
 * nome solto fica só como sua anotação.
 */
export function ParceirosDoTreino({
  linhas,
  aoMudar,
}: {
  linhas: RascunhoParceiro[];
  aoMudar: (l: RascunhoParceiro[]) => void;
}) {
  const { aceitos, ready } = useParcerias();

  const usados = new Set(linhas.map((l) => l.partnerId).filter(Boolean));
  const disponiveis = aceitos.filter(
    (a) => a.cartao && !usados.has(a.parceria.outroId),
  );

  const atualizar = (i: number, patch: Partial<RascunhoParceiro>) =>
    aoMudar(linhas.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const remover = (i: number) => aoMudar(linhas.filter((_, j) => j !== i));

  const adicionar = () =>
    aoMudar([
      ...linhas,
      { partnerId: null, partnerName: "", rolls: 1, subsFor: 0, subsAgainst: 0 },
    ]);

  return (
    <div className="space-y-2">
      <Label>Com quem você rolou</Label>

      {linhas.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Opcional. Se marcar um parceiro cadastrado, ele confirma depois e o
          placar de vocês soma para os dois.
        </p>
      )}

      {linhas.map((l, i) => {
        const cartao = aceitos.find(
          (a) => a.parceria.outroId === l.partnerId,
        )?.cartao;
        return (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-3"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {ready && aceitos.length > 0 ? (
                  <Select
                    value={l.partnerId ?? NAO_CADASTRADO}
                    onValueChange={(v) =>
                      atualizar(i, {
                        partnerId: v === NAO_CADASTRADO ? null : v,
                        partnerName: v === NAO_CADASTRADO ? l.partnerName : "",
                      })
                    }
                  >
                    <SelectTrigger aria-label={`Parceiro ${i + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NAO_CADASTRADO}>
                        Escrever o nome
                      </SelectItem>
                      {aceitos
                        .filter(
                          (a) =>
                            a.cartao &&
                            (a.parceria.outroId === l.partnerId ||
                              !usados.has(a.parceria.outroId)),
                        )
                        .map((a) => (
                          <SelectItem
                            key={a.parceria.outroId}
                            value={a.parceria.outroId}
                          >
                            {a.cartao!.nickname} · @{a.cartao!.handle}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {!l.partnerId && (
                  <Input
                    value={l.partnerName}
                    onChange={(e) =>
                      atualizar(i, { partnerName: e.target.value })
                    }
                    placeholder="Nome do parceiro"
                    className={cn(ready && aceitos.length > 0 && "mt-2")}
                    aria-label={`Nome do parceiro ${i + 1}`}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => remover(i)}
                aria-label="Tirar este parceiro"
                className="tap grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <Contador
                rotulo="rolas"
                valor={l.rolls}
                aoMudar={(v) => atualizar(i, { rolls: v })}
              />
              <Contador
                rotulo="finalizei"
                valor={l.subsFor}
                destaque="bom"
                aoMudar={(v) => atualizar(i, { subsFor: v })}
              />
              <Contador
                rotulo="me pegou"
                valor={l.subsAgainst}
                destaque="ruim"
                aoMudar={(v) => atualizar(i, { subsAgainst: v })}
              />
            </div>

            {cartao && (
              <p className="text-[11px] text-muted-foreground">
                @{cartao.handle} vai receber para confirmar.
              </p>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={adicionar}
      >
        <UserPlus className="h-4 w-4" />
        {linhas.length ? "Mais um parceiro" : "Adicionar parceiro"}
      </Button>

      {ready && aceitos.length === 0 && linhas.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Você ainda não tem parceiros cadastrados. Vá em Parceiros para
          adicionar pelo @ e o placar passa a valer para os dois.
        </p>
      )}

      {disponiveis.length === 0 && aceitos.length > 0 && linhas.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Todos os seus parceiros já estão neste treino.
        </p>
      )}
    </div>
  );
}
