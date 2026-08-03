import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Icone } from "@/design/icones";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { CartaoAtleta } from "@/components/CartaoAtleta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Confirmar } from "@/components/Confirmar";
import { SeloVerificado } from "@/components/SeloVerificado";
import { useEquipes, useMembrosDaEquipe } from "@/lib/social-storage";
import type { Equipe } from "@/lib/social-types";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Ponteira" },
      {
        name: "description",
        content: "Sua equipe, os companheiros de academia e o cadastro de novas equipes.",
      },
    ],
  }),
  component: EquipePage,
});

/* ------------------------------------------------------------------ */

function PedirCadastro() {
  const { pedirCadastro } = useEquipes();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [mestre, setMestre] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Icone.adicionar className="h-4 w-4" /> Pedir cadastro de uma equipe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar equipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="eq-nome">Nome da equipe</Label>
            <Input
              id="eq-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Bonsai Jiu-Jitsu"
            />
          </div>
          <div>
            <Label htmlFor="eq-cidade">Cidade</Label>
            <Input
              id="eq-cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Curitiba"
            />
          </div>
          <div>
            <Label htmlFor="eq-mestre">Mestre responsável</Label>
            <Input
              id="eq-mestre"
              value={mestre}
              onChange={(e) => setMestre(e.target.value)}
              placeholder="Gui"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A equipe entra como pendente e só aparece na busca dos outros depois
            de aprovada. Você já entra como dono dela.
          </p>
          <Button
            className="w-full"
            disabled={nome.trim().length < 2 || enviando}
            onClick={async () => {
              setEnviando(true);
              const deu = await pedirCadastro(nome, cidade, mestre);
              setEnviando(false);
              if (deu) {
                toast.success("Pedido enviado. Agora é aguardar a aprovação.");
                setNome("");
                setCidade("");
                setMestre("");
                setAberto(false);
              }
            }}
          >
            {enviando ? "Enviando…" : "Enviar pedido"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function MinhaEquipe({ equipe }: { equipe: Equipe }) {
  const { souDono, sair, decidir, definirPapel } = useEquipes();
  const { ativos, pendentes, ready } = useMembrosDaEquipe(equipe.id);
  const dono = souDono(equipe.id);

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 bg-gradient-to-br from-primary/15 via-card/70 to-card/70">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Sua equipe
              </p>
              <h2 className="mt-1 flex items-center gap-1.5 text-2xl font-black">
                <span className="truncate">{equipe.name}</span>
                {equipe.status === "aprovada" && (
                  <SeloVerificado tipo="equipe" className="h-5 w-5" />
                )}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[equipe.city, equipe.master && `Mestre ${equipe.master}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Icone.equipe className="h-8 w-8 shrink-0 text-primary" />
          </div>

          {equipe.status === "pendente" && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground">
              <Icone.horario className="h-3.5 w-3.5" />
              Aguardando aprovação — só você enxerga por enquanto.
            </p>
          )}
          {equipe.status === "recusada" && (
            <p className="mt-3 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs text-destructive">
              Cadastro recusado{equipe.motivoRecusa ? `: ${equipe.motivoRecusa}` : "."}
            </p>
          )}
        </CardContent>
      </Card>

      {dono && pendentes.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-primary">
            Pedidos para entrar ({pendentes.length})
          </h3>
          {pendentes.map((m, i) => (
            <CartaoAtleta
              key={m.userId}
              i={i}
              atleta={m}
              acao={
                <div className="flex gap-1.5">
                  <Button
                    size="icon"
                    aria-label={`Aceitar ${m.nickname}`}
                    onClick={async () => {
                      if (await decidir(equipe.id, m.userId, true))
                        toast.success(`${m.nickname} entrou na equipe.`);
                    }}
                  >
                    <Icone.confirmar className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Recusar ${m.nickname}`}
                    onClick={() => decidir(equipe.id, m.userId, false)}
                  >
                    <Icone.fechar className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          No tatame ({ativos.length})
        </h3>
        {ready && ativos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda só você. Passa o nome da equipe pro pessoal.
          </p>
        )}
        {ativos.map((m, i) => (
          <CartaoAtleta
            key={m.userId}
            i={i}
            atleta={m}
            detalhe={
              m.role !== "membro" ? (
                <p className="mt-1 text-xs font-bold text-primary">
                  {m.role === "dono" ? "dono" : "mestre da academia"}
                </p>
              ) : undefined
            }
            acao={
              // Quem manda na academia diz quem é mestre dela. É o segundo
              // caminho para o selo — o primeiro é a verificação do app.
              dono && m.role !== "dono" ? (
                <Confirmar
                  gatilho={
                    <Button size="sm" variant="outline" className="shrink-0">
                      {m.role === "mestre" ? "Tirar mestre" : "Tornar mestre"}
                    </Button>
                  }
                  titulo={
                    m.role === "mestre"
                      ? `Tirar ${m.nickname} de mestre?`
                      : `Tornar ${m.nickname} mestre da academia?`
                  }
                  descricao={
                    m.role === "mestre"
                      ? `${m.nickname} deixa de constar como mestre da ${equipe.name} e perde o selo que vem daí.`
                      : `${m.nickname} passa a constar como mestre da ${equipe.name} e ganha o selo de mestre verificado. Só faça isso com quem realmente dá aula aqui.`
                  }
                  rotuloConfirmar={m.role === "mestre" ? "Tirar" : "Tornar mestre"}
                  destrutivo={m.role === "mestre"}
                  aoConfirmar={async () => {
                    const novo = m.role === "mestre" ? "membro" : "mestre";
                    if (await definirPapel(equipe.id, m.userId, novo)) {
                      toast.success(
                        novo === "mestre"
                          ? `${m.nickname} agora é mestre da academia.`
                          : `${m.nickname} voltou a ser membro.`,
                      );
                    }
                  }}
                />
              ) : undefined
            }
          />
        ))}
      </section>

      <Confirmar
        gatilho={
          <Button variant="ghost" className="w-full text-muted-foreground">
            Sair da equipe
          </Button>
        }
        titulo="Sair da equipe?"
        descricao={`Você deixa de aparecer entre os membros da ${equipe.name}. Para voltar, precisa pedir entrada de novo e o dono aceitar.`}
        rotuloConfirmar="Sair"
        destrutivo
        aoConfirmar={async () => {
          if (await sair(equipe.id)) toast("Você saiu da equipe.");
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProcurarEquipe() {
  const { aprovadas, entrar, vinculoDe, ready } = useEquipes();
  const [termo, setTermo] = useState("");

  const filtradas = termo.trim()
    ? aprovadas.filter((e) =>
        `${e.name} ${e.city} ${e.master}`
          .toLowerCase()
          .includes(termo.trim().toLowerCase()),
      )
    : aprovadas;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icone.buscar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Procurar equipe…"
          className="pl-9"
          aria-label="Procurar equipe"
        />
      </div>

      {ready && aprovadas.length === 0 && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Icone.equipe className="mx-auto mb-2 h-6 w-6 text-primary" />
            Nenhuma equipe cadastrada ainda.
            <br />
            Peça o cadastro da sua abaixo.
          </CardContent>
        </Card>
      )}

      {filtradas.map((e, i) => {
        const vinculo = vinculoDe(e.id);
        return (
          <Card
            key={e.id}
            className="rise-in list-perf border-border/50 bg-card/50"
            style={{ "--i": Math.min(i, 10) } as never}
          >
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{e.name}</span>
                  <SeloVerificado tipo="equipe" className="h-4 w-4" />
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[e.city, e.master && `Mestre ${e.master}`]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {vinculo?.status === "pendente" ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  pedido enviado
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={async () => {
                    if (await entrar(e.id))
                      toast.success("Pedido enviado ao dono da equipe.");
                  }}
                >
                  Entrar
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EquipePage() {
  const { minhaEquipe, equipes, vinculos, ready } = useEquipes();

  // Uma equipe que você pediu e ainda não foi aprovada também é "sua"
  const pendenteMinha = equipes.find(
    (e) =>
      e.status !== "aprovada" &&
      vinculos.some((v) => v.teamId === e.id && v.status === "ativo"),
  );
  const atual = minhaEquipe ?? pendenteMinha;

  return (
    <PageShell title="Equipe" subtitle="Onde você treina e com quem.">
      {!ready && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {ready && atual && <MinhaEquipe equipe={atual} />}

      {ready && !atual && (
        <>
          <ProcurarEquipe />
          <PedirCadastro />
        </>
      )}
    </PageShell>
  );
}
