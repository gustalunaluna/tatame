import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icone } from "@/design/icones";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/meus-dados")({
  head: () => ({
    meta: [{ title: "Meus dados — Ponteira" }],
  }),
  component: MeusDados,
});

/** O que a pessoa precisa digitar para a exclusão liberar. */
const PALAVRA = "EXCLUIR";

function MeusDados() {
  const navigate = useNavigate();
  const [baixando, setBaixando] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const { data, error } = await supabase.rpc("meus_dados");
      if (error) throw error;

      // O arquivo é montado e baixado no próprio aparelho: os dados não passam
      // por nenhum servidor intermediário no caminho.
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `ponteira-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Arquivo baixado.");
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para exportar.");
    } finally {
      setBaixando(false);
    }
  }

  async function excluir() {
    setExcluindo(true);
    try {
      const { error } = await supabase.rpc("excluir_minha_conta");
      if (error) throw error;

      // A sessão local sobrevive à conta: o token continua no localStorage e
      // valendo até expirar. Sem este signOut, a pessoa volta para um app que
      // parece logado e quebra em toda consulta.
      await supabase.auth.signOut();
      toast.success("Conta excluída. Valeu por treinar com a gente.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para excluir.");
      setExcluindo(false);
    }
  }

  return (
    <PageShell
      title="Meus dados"
      subtitle="Levar embora ou apagar de vez. Os dois são seus por direito."
    >
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center gap-2">
          <Icone.baixar className="size-4 text-primary" />
          <h2 className="text-sm font-bold">Baixar meus dados</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Um arquivo JSON com tudo que é seu: perfil, treinos, técnicas,
          parceiros, graduações, medalhas, metas, planos, conquistas e análises.
          Abre em qualquer editor de texto.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="tap mt-4 h-12 w-full font-bold"
          onClick={baixar}
          disabled={baixando}
        >
          {baixando ? "Juntando tudo…" : "Baixar meus dados"}
        </Button>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* A exclusão fica embaixo, separada por borda destrutiva e atrás de
          uma palavra digitada. Não é burocracia: é o único botão do app que
          não tem volta, e ele precisa custar mais que um toque distraído. */}
      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <Icone.alerta className="size-4 text-destructive" />
          <h2 className="text-sm font-bold">Excluir minha conta</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Apaga a conta e todo o seu conteúdo na hora, sem carência e sem cópia.{" "}
          <strong className="text-foreground">Não há como desfazer.</strong> Se
          quiser guardar o histórico, baixe o arquivo acima antes.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O que não some, porque é de outra pessoa: os treinos em que alguém
          anotou você como parceiro continuam com o seu nome escrito, as
          graduações que você deu continuam no histórico dos seus alunos, e a
          equipe que você fundou continua de pé.
        </p>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="confirmacao" className="text-xs">
            Digite <strong className="text-foreground">{PALAVRA}</strong> para
            liberar o botão
          </Label>
          <Input
            id="confirmacao"
            value={confirmacao}
            autoComplete="off"
            autoCapitalize="characters"
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          className="tap mt-3 h-12 w-full font-bold"
          disabled={confirmacao.trim().toUpperCase() !== PALAVRA || excluindo}
          onClick={excluir}
        >
          {excluindo ? "Apagando…" : "Excluir minha conta para sempre"}
        </Button>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/privacidade" className="underline hover:text-foreground">
          Política de Privacidade
        </Link>{" "}
        ·{" "}
        <Link to="/termos" className="underline hover:text-foreground">
          Termos de Uso
        </Link>
      </p>
    </PageShell>
  );
}
