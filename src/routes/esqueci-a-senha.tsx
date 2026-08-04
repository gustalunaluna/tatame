import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortaDeEntrada } from "@/components/PortaDeEntrada";
import { supabase } from "@/integrations/supabase/client";
import { baseDeRedirecionamento } from "@/lib/nativo";

export const Route = createFileRoute("/esqueci-a-senha")({
  head: () => ({
    meta: [
      { title: "Esqueci minha senha — Ponteira" },
      {
        name: "description",
        content: "Receba um link por e-mail para criar uma senha nova.",
      },
    ],
  }),
  component: EsqueciASenha,
});

function EsqueciASenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Web: /nova-senha no site. App da loja: o esquema próprio, que o
        // sistema entrega de volta ao app. Ver lib/nativo.ts.
        redirectTo: `${baseDeRedirecionamento()}nova-senha`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para enviar. Tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  /**
   * A confirmação NÃO diz se o e-mail existe.
   *
   * "Não encontramos essa conta" é gentil com quem errou de letra e é um
   * verificador de contas para quem está sondando: dá para descobrir quem tem
   * cadastro digitando e-mails. O texto é o mesmo nos dois casos, e o
   * `resetPasswordForEmail` do Supabase já responde igual dos dois lados.
   */
  if (enviado) {
    return (
      <PortaDeEntrada
        titulo="Olha o e-mail"
        descricao={`Se existe uma conta em ${email}, o link para criar uma senha nova acabou de sair. Ele vale por uma hora.`}
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Não chegou? Confere a caixa de spam. O remetente é o Supabase, em
            nome do Ponteira.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="tap mt-4 h-13 w-full text-base"
          onClick={() => setEnviado(false)}
        >
          Enviar de novo
        </Button>
      </PortaDeEntrada>
    );
  }

  return (
    <PortaDeEntrada
      titulo="Esqueci minha senha"
      descricao="Digite o e-mail da sua conta. Mandamos um link para você criar uma senha nova."
    >
      <form onSubmit={enviar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="tap h-13 w-full text-base font-bold"
          disabled={enviando}
        >
          {enviando ? "Enviando…" : "Enviar o link"}
        </Button>
      </form>
    </PortaDeEntrada>
  );
}
