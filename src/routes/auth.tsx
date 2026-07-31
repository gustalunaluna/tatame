import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Ponteira" },
      { name: "description", content: "Entre no seu diário de Jiu-Jitsu." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Conta criada. Bora treinar!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Boa! Você tá dentro.");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message ?? "Não rolou. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="topo-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center pb-[calc(2.5rem+var(--safe-b))]">
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Ponteira</p>
        <h1 className="mt-2 text-3xl font-black">Oss, guerreiro.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login" ? "Entra pra continuar sua jornada." : "Cria sua conta e sobe no tatame."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aguenta aí…" : mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "login" ? (
          <>Ainda não tem conta? <span className="font-semibold text-primary">Cadastre-se</span></>
        ) : (
          <>Já tem conta? <span className="font-semibold text-primary">Entrar</span></>
        )}
      </button>
    </div>
  );
}
