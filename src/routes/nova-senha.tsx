import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortaDeEntrada } from "@/components/PortaDeEntrada";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/nova-senha")({
  head: () => ({
    meta: [
      { title: "Nova senha — Ponteira" },
      { name: "description", content: "Escolha uma senha nova para sua conta." },
    ],
  }),
  component: NovaSenha,
});

/** Menor senha aceita. O mesmo piso do cadastro, para não frustrar na volta. */
const MINIMO = 6;

type Estado = "verificando" | "pronto" | "invalido";

function NovaSenha() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  /**
   * O link do e-mail chega com o token no fragmento (#) da URL. O supabase-js
   * lê esse fragmento sozinho e abre uma sessão de recuperação — mas isso é
   * assíncrono, e a tela monta antes de terminar. Por isso esperamos os dois
   * caminhos: o evento, para quando a troca acontece depois da montagem, e o
   * getSession(), para quando já aconteceu antes.
   *
   * Link vencido ou já usado não gera sessão nenhuma: o Supabase devolve o erro
   * no próprio fragmento, e é o que checamos primeiro.
   */
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error")) {
      setEstado("invalido");
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "PASSWORD_RECOVERY" || sessao) setEstado("pronto");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setEstado((atual) => {
        if (atual !== "verificando") return atual;
        return session ? "pronto" : "invalido";
      });
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) {
      toast.error("As duas senhas não são iguais.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha trocada. Você já está dentro.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para trocar. Tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (estado === "verificando") {
    return (
      <PortaDeEntrada titulo="Conferindo o link…">
        <p className="text-sm text-muted-foreground">Um instante.</p>
      </PortaDeEntrada>
    );
  }

  if (estado === "invalido") {
    return (
      <PortaDeEntrada
        titulo="Esse link não vale mais"
        descricao="Links de recuperação vencem em uma hora e só funcionam uma vez. Peça um novo — leva dez segundos."
      >
        <Button
          type="button"
          size="lg"
          className="tap h-13 w-full text-base font-bold"
          onClick={() => navigate({ to: "/esqueci-a-senha" })}
        >
          Pedir um link novo
        </Button>
      </PortaDeEntrada>
    );
  }

  return (
    <PortaDeEntrada
      titulo="Sua senha nova"
      descricao={`Pelo menos ${MINIMO} caracteres. Depois de salvar, você entra direto.`}
    >
      <form onSubmit={salvar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="senha">Nova senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            minLength={MINIMO}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmacao">Repita a senha</Label>
          <Input
            id="confirmacao"
            type="password"
            autoComplete="new-password"
            required
            minLength={MINIMO}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="tap h-13 w-full text-base font-bold"
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar e entrar"}
        </Button>
      </form>
    </PortaDeEntrada>
  );
}
