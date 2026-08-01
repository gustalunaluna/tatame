import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icone } from "@/design/icones";
import { EscadaDeFaixas, MarcaPonteira } from "@/components/MarcaPonteira";
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

type Etapa = "convite" | "login" | "cadastro";

/**
 * A porta de entrada do app.
 *
 * Antes era um formulário solto no meio da tela: dois campos, um botão, zero
 * ideia do que havia do outro lado. Esta é a única tela que alguém vê antes de
 * decidir se o app vale a pena, e ela precisa dizer "isto é jiu-jitsu" antes de
 * pedir qualquer coisa.
 *
 * Por isso a ordem: primeiro a faixa atravessando a tela, o nome e a escada de
 * graduação; só depois, embaixo, o convite para entrar. Os campos aparecem
 * quando a pessoa pede — pedir e-mail e senha de cara é o jeito mais rápido de
 * transformar uma tela bonita num pedágio.
 */
function AuthPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("convite");
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
      if (etapa === "cadastro") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Conta criada. Bora treinar!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* Um clarão atrás da faixa, na cor do próprio tecido. Não é brilho por
          brilho: é o que separa a marca do fundo chapado sem precisar de caixa. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[65dvh]"
        style={{
          background:
            "radial-gradient(75% 55% at 50% 38%, color-mix(in oklab, var(--marca-tecido) 14%, transparent), transparent 70%)",
        }}
      />

      {/* O app é de celular. Em tela larga a composição não estica: ela vira
          uma coluna do mesmo tamanho, centralizada — o que se vê no tablet é o
          que se vê no telefone, e não uma faixa perdida num campo preto. */}
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <section className="topo-seguro relative flex flex-1 flex-col items-center justify-center px-6 py-12">
          {/* A faixa inteira, de nó a ponteira, inclinada como quando está
            largada no banco do vestiário. Não vira círculo de logo de propósito:
            faixa é uma coisa comprida, e é o comprimento que a identifica. */}
          <div className="marca-entra w-[86%] max-w-sm -rotate-[7deg]">
            <MarcaPonteira />
          </div>

          <h1 className="mt-14 text-center text-[3.25rem] font-black leading-none tracking-tight text-foreground">
            Ponteira
          </h1>
          <p className="mt-4 max-w-[30ch] text-balance text-center text-sm leading-relaxed text-muted-foreground">
            O diário de quem vive o tatame. Cada treino, cada rola, cada grau.
          </p>

          {/* Da branca à preta, sem legenda: quem treina lê na hora, e diz em uma
            linha o que o app acompanha. */}
          <EscadaDeFaixas className="mt-10 w-48" />
        </section>

        <section className="folha-sobe relative rounded-t-[2rem] border-t border-border bg-card">
          <div className="lados-seguros mx-auto w-full max-w-md px-6 pt-8 pb-[calc(2rem+var(--safe-b))]">
            {etapa === "convite" ? (
              <div>
                <h2 className="text-lg font-bold">
                  Pronto para subir no tatame?
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Entre para registrar o treino de hoje.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    type="button"
                    size="lg"
                    className="tap h-13 w-full text-base font-bold"
                    onClick={() => setEtapa("login")}
                  >
                    Entrar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="tap h-13 w-full text-base"
                    onClick={() => setEtapa("cadastro")}
                  >
                    Criar minha conta
                  </Button>
                </div>
              </div>
            ) : (
              <div className="campos-entram">
                <div className="mb-6 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Voltar"
                    onClick={() => setEtapa("convite")}
                    className="tap -ml-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Icone.voltar className="size-5" />
                  </button>
                  <h2 className="text-xl font-bold">
                    {etapa === "login"
                      ? "Bem-vindo de volta"
                      : "Sobe no tatame"}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={
                        etapa === "login" ? "current-password" : "new-password"
                      }
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="tap h-13 w-full text-base font-bold"
                    disabled={loading}
                  >
                    {loading
                      ? "Aguenta aí…"
                      : etapa === "login"
                        ? "Entrar"
                        : "Criar conta"}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() =>
                    setEtapa(etapa === "login" ? "cadastro" : "login")
                  }
                  className="tap mt-5 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  {etapa === "login" ? (
                    <>
                      Ainda não tem conta?{" "}
                      <span className="font-semibold text-primary">
                        Cadastre-se
                      </span>
                    </>
                  ) : (
                    <>
                      Já tem conta?{" "}
                      <span className="font-semibold text-primary">Entrar</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
