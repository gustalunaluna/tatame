import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AtSign,
  Check,
  Search,
  Swords,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { CartaoAtleta } from "@/components/CartaoAtleta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Confirmar } from "@/components/Confirmar";
import { cn } from "@/lib/utils";
import {
  useBuscaPorHandle,
  useMeuHandle,
  useParcerias,
  useRegistrosAConfirmar,
  useResumoParceiros,
} from "@/lib/social-storage";
import { erroDoHandle, normalizarHandle } from "@/lib/social-types";

export const Route = createFileRoute("/_authenticated/parceiros")({
  head: () => ({
    meta: [
      { title: "Parceiros — Tatame" },
      {
        name: "description",
        content: "Seus parceiros de treino, o placar entre vocês e os convites.",
      },
    ],
  }),
  component: ParceirosPage,
});

/* ------------------------------------------------------------------ */

function MeuArroba() {
  const { handle, ready, salvar, salvando } = useMeuHandle();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");

  if (!ready) return null;

  if (handle && !editando) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Seu @
            </p>
            <p className="truncate text-lg font-black">@{handle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              É assim que te acham. Passa pro pessoal do tatame.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setValor(handle);
              setEditando(true);
            }}
          >
            Trocar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const limpo = normalizarHandle(valor);
  const erro = valor ? erroDoHandle(limpo) : null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-bold">Escolha seu @</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sem ele ninguém consegue te adicionar como parceiro.
          </p>
        </div>
        <div>
          <Label htmlFor="handle" className="sr-only">
            Seu @
          </Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="handle"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="gustavo.bonsai"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="pl-9"
              aria-invalid={!!erro}
              aria-describedby={erro ? "handle-erro" : undefined}
            />
          </div>
          {erro && (
            <p id="handle-erro" className="mt-1.5 text-xs text-destructive">
              {erro}
            </p>
          )}
          {!erro && limpo && limpo !== valor.trim().replace(/^@+/, "") && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Vai ficar: <span className="font-bold">@{limpo}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!!erro || !limpo || salvando}
            onClick={async () => {
              if (await salvar(limpo)) {
                toast.success(`Pronto. Você é @${limpo}.`);
                setEditando(false);
                setValor("");
              }
            }}
          >
            {salvando ? "Salvando…" : "Salvar @"}
          </Button>
          {handle && (
            <Button variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function Buscar() {
  const [termo, setTermo] = useState("");
  const busca = useBuscaPorHandle(termo);
  const { convidar, todas } = useParcerias();
  const limpo = normalizarHandle(termo);

  const achado = busca.data;
  const jaTem = achado && todas.some((p) => p.parceria.outroId === achado.userId);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Adicionar parceiro
      </h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Digite o @ da pessoa"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="pl-9"
          aria-label="Buscar pessoa pelo @"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        A busca é pelo @ exato — de propósito. Assim ninguém sai vasculhando a
        lista de quem usa o app.
      </p>

      {limpo.length >= 3 && busca.isFetching && (
        <p className="text-xs text-muted-foreground">Procurando…</p>
      )}

      {limpo.length >= 3 && !busca.isFetching && !achado && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Ninguém com @{limpo}. Confere a escrita com a pessoa.
          </CardContent>
        </Card>
      )}

      {achado && (
        <CartaoAtleta
          atleta={achado}
          acao={
            jaTem ? (
              <span className="text-xs font-semibold text-muted-foreground">
                Já na lista
              </span>
            ) : (
              <Button
                size="sm"
                className="gap-1"
                onClick={async () => {
                  if (await convidar(achado.userId)) {
                    toast.success(`Convite enviado para @${achado.handle}.`);
                    setTermo("");
                  }
                }}
              >
                <UserPlus className="h-4 w-4" /> Convidar
              </Button>
            )
          }
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Confirmacoes() {
  const { itens, responder } = useRegistrosAConfirmar();
  if (!itens.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
        <Swords className="h-4 w-4" />
        Esperando você ({itens.length})
      </h2>
      <p className="text-xs text-muted-foreground">
        Só entra no placar de vocês depois que você confirmar.
      </p>

      {itens.map((r, i) => (
        <Card key={r.id} className="rise-in border-primary/40 bg-primary/5" style={{ "--i": i } as never}>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm">
              <span className="font-bold">{r.autorNickname}</span> anotou que
              vocês rolaram <span className="font-bold">{r.rolls}x</span> em{" "}
              {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}.
            </p>
            <div className="flex gap-3 text-xs">
              <span className="rounded-lg bg-secondary px-2 py-1">
                Ele finalizou você <b>{r.subsFor}x</b>
              </span>
              <span className="rounded-lg bg-secondary px-2 py-1">
                Você finalizou ele <b>{r.subsAgainst}x</b>
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1"
                onClick={async () => {
                  if (await responder(r.id, true)) toast.success("Confirmado.");
                }}
              >
                <Check className="h-4 w-4" /> Confere
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={async () => {
                  if (await responder(r.id, false))
                    toast("Marcado como contestado. Não entra no placar.");
                }}
              >
                <X className="h-4 w-4" /> Não foi assim
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Convites() {
  const { recebidos, enviados, responder } = useParcerias();
  if (!recebidos.length && !enviados.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Convites
      </h2>

      {recebidos.map(({ parceria, cartao }, i) => (
        <CartaoAtleta
          key={parceria.id}
          i={i}
          atleta={
            cartao ?? {
              nickname: "Atleta",
              handle: "",
              belt: "Branca",
              degrees: 0,
            }
          }
          detalhe={
            <p className="mt-1 text-[11px] text-primary">
              quer treinar com você
            </p>
          }
          acao={
            <div className="flex gap-1.5">
              <Button
                size="icon"
                aria-label="Aceitar"
                onClick={async () => {
                  if (await responder(parceria.id, true))
                    toast.success("Parceria firmada.");
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Recusar"
                onClick={() => responder(parceria.id, false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          }
        />
      ))}

      {enviados.map(({ parceria, cartao }, i) => (
        <CartaoAtleta
          key={parceria.id}
          i={i}
          className="opacity-70"
          atleta={
            cartao ?? {
              nickname: "Atleta",
              handle: "",
              belt: "Branca",
              degrees: 0,
            }
          }
          detalhe={
            <p className="mt-1 text-[11px] text-muted-foreground">
              aguardando resposta
            </p>
          }
        />
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Placar() {
  const { itens, ready } = useResumoParceiros();
  const { aceitos, ready: prontoParcerias, desfazer } = useParcerias();

  // A lista é de PARCEIROS, não de placares. Quem foi aceito aparece aqui
  // mesmo sem nunca ter treinado junto — antes sumia até o primeiro registro,
  // que era como se o convite não tivesse valido de nada.
  const comRegistro = new Set(itens.map((i) => i.partnerId).filter(Boolean));
  const semRegistro = aceitos
    .filter((a) => !comRegistro.has(a.parceria.outroId))
    .map((a) => ({
      partnerId: a.parceria.outroId,
      partnerName: a.cartao?.nickname ?? "Atleta",
      sessoes: 0,
      rolls: 0,
      subsFor: 0,
      subsAgainst: 0,
      pendentes: 0,
      ultimoTreino: null as string | null,
    }));
  const lista = [...itens, ...semRegistro];

  if (prontoParcerias && ready && !lista.length) {
    return (
      <Card className="border-dashed border-border/60 bg-transparent">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-6 w-6 text-primary" />
          Nenhum parceiro ainda.
          <br />
          Busque pelo @ da pessoa e mande o convite.
        </CardContent>
      </Card>
    );
  }

  // quem finalizou mais vezes: o maior saldo a favor
  const carrasco = [...itens]
    .filter((p) => p.subsAgainst > 0)
    .sort((a, b) => b.subsAgainst - a.subsAgainst)[0];
  const freguês = [...itens]
    .filter((p) => p.subsFor > 0)
    .sort((a, b) => b.subsFor - a.subsFor)[0];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Seus parceiros ({lista.length})
      </h2>

      {(carrasco || freguês) && (
        <div className="grid grid-cols-2 gap-2">
          {carrasco && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">
                  Te pega mais
                </p>
                <p className="mt-1 truncate text-sm font-black">
                  {carrasco.partnerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {carrasco.subsAgainst}x em você
                </p>
              </CardContent>
            </Card>
          )}
          {freguês && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Você pega mais
                </p>
                <p className="mt-1 truncate text-sm font-black">
                  {freguês.partnerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {freguês.subsFor}x nele
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {lista.map((p, i) => {
        const cartao = aceitos.find(
          (a) => a.parceria.outroId === p.partnerId,
        )?.cartao;
        const saldo = p.subsFor - p.subsAgainst;
        return (
          <Card
            key={p.partnerId ?? p.partnerName}
            className="rise-in list-perf border-border/50 bg-card/50"
            style={{ "--i": Math.min(i, 10) } as never}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {cartao ? (
                    <Link
                      to="/atleta/$handle"
                      params={{ handle: cartao.handle }}
                      className="tap block active:scale-[0.98]"
                    >
                      <p className="truncate font-bold">{p.partnerName}</p>
                    </Link>
                  ) : (
                    <p className="truncate font-bold">{p.partnerName}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {cartao ? `@${cartao.handle}` : "não usa o app"}
                    {p.ultimoTreino
                      ? ` · último ${new Date(
                          p.ultimoTreino + "T00:00:00",
                        ).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}`
                      : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-black",
                    saldo > 0
                      ? "bg-primary text-primary-foreground"
                      : saldo < 0
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {saldo > 0 ? `+${saldo}` : saldo}
                </span>
              </div>

              {p.sessoes === 0 && p.pendentes === 0 ? (
                <p className="mt-3 rounded-xl bg-secondary/40 px-3 py-2 text-center text-xs text-muted-foreground">
                  Ainda não treinaram juntos. Adicione ele ao registrar um treino.
                </p>
              ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-secondary/60 py-2">
                  <p className="text-lg font-black leading-none">{p.rolls}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    rolas
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/60 py-2">
                  <p className="text-lg font-black leading-none text-primary">
                    {p.subsFor}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    você finalizou
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/60 py-2">
                  <p className="text-lg font-black leading-none text-destructive">
                    {p.subsAgainst}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    ele finalizou
                  </p>
                </div>
              </div>
              )}

              {p.sessoes > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {p.sessoes} {p.sessoes === 1 ? "treino juntos" : "treinos juntos"}
                {p.pendentes > 0 && (
                  <span className="text-primary">
                    {" "}
                    · {p.pendentes} esperando confirmação
                  </span>
                )}
              </p>
              )}

              {p.partnerId && (
                <Confirmar
                  gatilho={
                    <button
                      type="button"
                      className="tap mt-2 text-[11px] text-muted-foreground underline underline-offset-2"
                    >
                      Desfazer parceria
                    </button>
                  }
                  titulo="Desfazer a parceria?"
                  descricao={`${p.partnerName} sai da sua lista. Os treinos que vocês já registraram continuam no histórico.`}
                  rotuloConfirmar="Desfazer"
                  destrutivo
                  aoConfirmar={() => {
                    const par = aceitos.find(
                      (a) => a.parceria.outroId === p.partnerId,
                    );
                    if (par) return desfazer(par.parceria.id);
                  }}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ParceirosPage() {
  const { handle, ready } = useMeuHandle();

  return (
    <PageShell
      title="Parceiros"
      subtitle="Com quem você roda e como está o placar."
    >
      <MeuArroba />
      {ready && handle && (
        <>
          <Confirmacoes />
          <Convites />
          <Buscar />
          <Placar />
        </>
      )}
    </PageShell>
  );
}
