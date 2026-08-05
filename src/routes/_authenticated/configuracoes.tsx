import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { GrupoDeAjustes, LinhaDeAjuste } from "@/components/Ajuste";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icone } from "@/design/icones";
import { supabase } from "@/integrations/supabase/client";
import { usePerfil } from "@/lib/bjj-storage";
import { CORES_DISPONIVEIS, useCorEscolhida } from "@/lib/aparencia";
import { acentoDaFaixa } from "@/lib/faixa-cores";
import { baseDeRedirecionamento } from "@/lib/nativo";
import { CONTATO } from "@/lib/legal";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Ponteira" }] }),
  component: Configuracoes,
});

/** A palavra que destrava a exclusão. */
const PALAVRA = "EXCLUIR";

type Painel =
  | null
  | "nome"
  | "nascimento"
  | "email"
  | "senha"
  | "semana"
  | "cor"
  | "excluir";

function Configuracoes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { perfil, salvar } = usePerfil();
  const { escolha, escolher } = useCorEscolhida();
  const [painel, setPainel] = useState<Painel>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const fechar = () => setPainel(null);

  async function sair() {
    await supabase.auth.signOut();
    // Limpa antes de navegar: ninguém deve ver um quadro sequer com os dados
    // da conta que acabou de sair.
    qc.clear();
    navigate({ to: "/auth", replace: true });
  }

  const idade = perfil?.birthDate
    ? Math.floor(
        (Date.now() - new Date(perfil.birthDate).getTime()) / 31557600000,
      )
    : null;

  return (
    <PageShell
      title="Configurações"
      subtitle="Sua conta, o app e o que fazer com seus dados."
    >
      {/* ------------------------------------------------------------- */}
      <GrupoDeAjustes titulo="Conta">
        <LinhaDeAjuste
          rotulo="Nome"
          valor={perfil?.nickname || "—"}
          icone={<Icone.perfil className="size-4" />}
          aoTocar={() => setPainel("nome")}
        />
        <LinhaDeAjuste
          rotulo="Nascimento"
          valor={
            perfil?.birthDate
              ? `${perfil.birthDate.split("-").reverse().join("/")}${idade !== null ? ` · ${idade} anos` : ""}`
              : "—"
          }
          icone={<Icone.horario className="size-4" />}
          aoTocar={() => setPainel("nascimento")}
        />
        <LinhaDeAjuste
          rotulo="E-mail"
          valor={email || "—"}
          icone={<Icone.email className="size-4" />}
          aoTocar={() => setPainel("email")}
        />
        <LinhaDeAjuste
          rotulo="Senha"
          valor="••••••"
          icone={<Icone.privado className="size-4" />}
          aoTocar={() => setPainel("senha")}
        />
      </GrupoDeAjustes>

      {/* ------------------------------------------------------------- */}
      {/* Faixa, graus, academia, mestre, foto e @ NÃO moram aqui: são o que
          os outros veem de você no tatame, e ficam no Perfil. A divisão é
          essa — aqui é a conta e o app, lá é o atleta. */}
      <GrupoDeAjustes
        titulo="Treino"
        descricao="Faixa, academia, mestre e foto ficam no Perfil."
      >
        <LinhaDeAjuste
          rotulo="Meta por semana"
          valor={
            perfil?.treinosPorSemana
              ? `${perfil.treinosPorSemana} ${perfil.treinosPorSemana === 1 ? "treino" : "treinos"}`
              : "não definida"
          }
          icone={<Icone.meta className="size-4" />}
          aoTocar={() => setPainel("semana")}
        />
        <LinhaDeAjuste
          rotulo="Editar meu perfil de atleta"
          para="/perfil"
          icone={<Icone.graduacao className="size-4" />}
        />
      </GrupoDeAjustes>

      {/* ------------------------------------------------------------- */}
      <GrupoDeAjustes titulo="Aparência">
        <LinhaDeAjuste
          rotulo="Cor do app"
          valor={escolha ? `Faixa ${escolha.toLowerCase()}` : "A da sua faixa"}
          icone={<Icone.destaque className="size-4" />}
          aoTocar={() => setPainel("cor")}
        />
      </GrupoDeAjustes>

      {/* ------------------------------------------------------------- */}
      <GrupoDeAjustes titulo="Privacidade e dados">
        <LinhaDeAjuste
          rotulo="Baixar meus dados"
          icone={<Icone.baixar className="size-4" />}
          aoTocar={baixarMeusDados}
        />
        <LinhaDeAjuste
          rotulo="Política de Privacidade"
          para="/privacidade"
          icone={<Icone.privado className="size-4" />}
        />
        <LinhaDeAjuste
          rotulo="Termos de Uso"
          para="/termos"
          icone={<Icone.listaDeTecnicas className="size-4" />}
        />
      </GrupoDeAjustes>

      {/* ------------------------------------------------------------- */}
      <GrupoDeAjustes titulo="Sobre">
        <LinhaDeAjuste rotulo="Versão" valor={__VERSAO__} />
        <LinhaDeAjuste
          rotulo="Falar com o suporte"
          valor={CONTATO}
          icone={<Icone.email className="size-4" />}
          aoTocar={() => {
            window.location.href = `mailto:${CONTATO}`;
          }}
        />
        <LinhaDeAjuste
          rotulo="Sair da conta"
          icone={<Icone.sair className="size-4" />}
          aoTocar={sair}
        />
        <LinhaDeAjuste
          rotulo="Excluir minha conta"
          icone={<Icone.alerta className="size-4" />}
          perigo
          aoTocar={() => setPainel("excluir")}
        />
      </GrupoDeAjustes>

      {/* ============================ painéis ============================ */}

      <CampoEmPainel
        aberto={painel === "nome"}
        titulo="Seu nome"
        descricao="É como você aparece para os parceiros e na sua academia."
        rotulo="Nome"
        inicial={perfil?.nickname ?? ""}
        aoFechar={fechar}
        aoSalvar={(v) => {
          salvar({ nickname: v.trim() });
          toast.success("Nome atualizado.");
        }}
      />

      <CampoEmPainel
        aberto={painel === "nascimento"}
        titulo="Data de nascimento"
        descricao="Entra na sua categoria de competição e na referência de gás do hexágono — aos 45 segurar o ritmo vale mais que aos 20."
        rotulo="Nascimento"
        tipo="date"
        inicial={perfil?.birthDate ?? ""}
        aoFechar={fechar}
        aoSalvar={(v) => {
          salvar({ birthDate: v || null });
          toast.success("Data atualizada.");
        }}
      />

      <TrocarEmail aberto={painel === "email"} atual={email} aoFechar={fechar} />
      <TrocarSenha aberto={painel === "senha"} aoFechar={fechar} />

      <MetaSemanal
        aberto={painel === "semana"}
        atual={perfil?.treinosPorSemana ?? null}
        aoFechar={fechar}
        aoSalvar={(n) => {
          salvar({ treinosPorSemana: n });
          toast.success("Meta atualizada.");
        }}
      />

      <EscolherCor
        aberto={painel === "cor"}
        escolha={escolha}
        faixa={perfil?.belt ?? "Branca"}
        aoEscolher={escolher}
        aoFechar={fechar}
      />

      <ExcluirConta aberto={painel === "excluir"} aoFechar={fechar} />
    </PageShell>
  );
}

/* ================================================================== */

/** Monta o JSON e baixa no próprio aparelho, sem servidor no meio. */
async function baixarMeusDados() {
  try {
    const { data, error } = await supabase.rpc("meus_dados");
    if (error) throw error;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `ponteira-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo baixado.");
  } catch (err) {
    toast.error((err as Error).message ?? "Não deu para exportar.");
  }
}

/* ================================================================== */

/** Um campo só, num painel. Serve para nome e para data de nascimento. */
function CampoEmPainel({
  aberto,
  titulo,
  descricao,
  rotulo,
  tipo = "text",
  inicial,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  rotulo: string;
  tipo?: string;
  inicial: string;
  aoFechar: () => void;
  aoSalvar: (valor: string) => void;
}) {
  const [valor, setValor] = useState(inicial);
  // `key` no Dialog faz o estado nascer de novo a cada abertura — sem isto, o
  // painel reabre com o que foi digitado e descartado da vez anterior.
  useEffect(() => {
    if (aberto) setValor(inicial);
  }, [aberto, inicial]);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {descricao ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="campo">{rotulo}</Label>
          <Input
            id="campo"
            type={tipo}
            value={valor}
            autoFocus
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <Button
          className="tap mt-2 h-12 w-full font-bold"
          onClick={() => {
            aoSalvar(valor);
            aoFechar();
          }}
        >
          Salvar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

function TrocarEmail({
  aberto,
  atual,
  aoFechar,
}: {
  aberto: boolean;
  atual: string;
  aoFechar: () => void;
}) {
  const [novo, setNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) setNovo("");
  }, [aberto]);

  async function salvar() {
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: novo.trim() },
        { emailRedirectTo: baseDeRedirecionamento() },
      );
      if (error) throw error;
      toast.success("Confira sua caixa de entrada para confirmar.");
      aoFechar();
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para trocar o e-mail.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar e-mail</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Hoje é <strong className="text-foreground">{atual}</strong>. A troca
          só vale depois que você confirmar pelo link — que chega{" "}
          <strong className="text-foreground">nos dois endereços</strong>, o
          novo e o antigo. É assim de propósito: quem toma sua conta não
          consegue trocar o e-mail sem que você fique sabendo.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="novo-email">Novo e-mail</Label>
          <Input
            id="novo-email"
            type="email"
            autoComplete="email"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
          />
        </div>
        <Button
          className="tap mt-2 h-12 w-full font-bold"
          disabled={!novo.trim() || salvando}
          onClick={salvar}
        >
          {salvando ? "Enviando…" : "Enviar confirmação"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

const MINIMO = 6;

function TrocarSenha({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setSenha("");
      setConfirmacao("");
    }
  }, [aberto]);

  async function salvar() {
    if (senha !== confirmacao) {
      toast.error("As duas senhas não são iguais.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha trocada.");
      aoFechar();
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para trocar a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pelo menos {MINIMO} caracteres. Você continua logado neste aparelho.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="nova">Nova senha</Label>
          <Input
            id="nova"
            type="password"
            autoComplete="new-password"
            minLength={MINIMO}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="repete">Repita</Label>
          <Input
            id="repete"
            type="password"
            autoComplete="new-password"
            minLength={MINIMO}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </div>
        <Button
          className="tap mt-2 h-12 w-full font-bold"
          disabled={senha.length < MINIMO || salvando}
          onClick={salvar}
        >
          {salvando ? "Salvando…" : "Salvar senha"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

/** As opções do questionário de boas-vindas, para a resposta bater. */
const OPCOES_SEMANA = [1, 2, 3, 4, 5, 6];

function MetaSemanal({
  aberto,
  atual,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  atual: number | null;
  aoFechar: () => void;
  aoSalvar: (n: number) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Treinos por semana</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Quantos você pretende fazer. É a régua da sua sequência e do plano do
          mês — e vale mudar quando a vida muda.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {OPCOES_SEMANA.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                aoSalvar(n);
                aoFechar();
              }}
              className={
                n === atual
                  ? "tap rounded-xl border border-primary bg-primary/15 py-3 text-sm font-bold text-primary"
                  : "tap rounded-xl border border-border bg-card py-3 text-sm font-semibold active:scale-[0.98]"
              }
            >
              {n}×
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

function EscolherCor({
  aberto,
  escolha,
  faixa,
  aoEscolher,
  aoFechar,
}: {
  aberto: boolean;
  escolha: string | null;
  faixa: string;
  aoEscolher: (v: (typeof CORES_DISPONIVEIS)[number] | null) => void;
  aoFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cor do app</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Por padrão o app usa a cor da sua faixa, e ela muda sozinha no dia da
          graduação. Só as cores das faixas estão aqui porque são as sete
          testadas contra o fundo — cor livre daria para deixar metade das
          telas ilegível.
        </p>

        <button
          type="button"
          onClick={() => {
            aoEscolher(null);
            aoFechar();
          }}
          className={
            escolha === null
              ? "tap flex items-center gap-3 rounded-xl border border-primary bg-primary/15 px-4 py-3 text-left"
              : "tap flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left active:scale-[0.99]"
          }
        >
          <span
            className="size-5 shrink-0 rounded-full border border-border"
            style={{ background: acentoDaFaixa(faixa as never) }}
          />
          <span className="flex-1 text-sm font-semibold">A da minha faixa</span>
          {escolha === null ? (
            <Icone.confirmar className="size-4 text-primary" />
          ) : null}
        </button>

        <div className="mt-1 grid grid-cols-4 gap-2">
          {CORES_DISPONIVEIS.map((f) => (
            <button
              key={f}
              type="button"
              aria-label={`Faixa ${f.toLowerCase()}`}
              onClick={() => {
                aoEscolher(f);
                aoFechar();
              }}
              className={
                escolha === f
                  ? "tap grid place-items-center gap-1 rounded-xl border border-primary bg-primary/15 py-3"
                  : "tap grid place-items-center gap-1 rounded-xl border border-border py-3 active:scale-[0.97]"
              }
            >
              <span
                className="size-6 rounded-full border border-border"
                style={{ background: acentoDaFaixa(f) }}
              />
              <span className="text-[0.6875rem] font-semibold">{f}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */

function ExcluirConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const navigate = useNavigate();
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (aberto) setConfirmacao("");
  }, [aberto]);

  async function excluir() {
    setExcluindo(true);
    try {
      const { error } = await supabase.rpc("excluir_minha_conta");
      if (error) throw error;
      // A sessão local sobrevive à conta: o token fica no localStorage e vale
      // até expirar. Sem este signOut, a pessoa volta para um app que parece
      // logado e quebra em toda consulta.
      await supabase.auth.signOut();
      toast.success("Conta excluída. Valeu por treinar com a gente.");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error((err as Error).message ?? "Não deu para excluir.");
      setExcluindo(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir minha conta</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Apaga a conta e todo o seu conteúdo na hora, sem carência e sem cópia.{" "}
          <strong className="text-foreground">Não há como desfazer.</strong> Se
          quiser guardar o histórico, baixe seus dados antes — está três linhas
          acima.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          O que não some, porque é de outra pessoa: os treinos em que alguém
          anotou você como parceiro continuam com seu nome, as graduações que
          você deu continuam no histórico dos seus alunos, e a equipe que você
          fundou continua de pé.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="confirmacao" className="text-xs">
            Digite <strong className="text-foreground">{PALAVRA}</strong> para
            liberar
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
          variant="destructive"
          className="tap mt-1 h-12 w-full font-bold"
          disabled={confirmacao.trim().toUpperCase() !== PALAVRA || excluindo}
          onClick={excluir}
        >
          {excluindo ? "Apagando…" : "Excluir para sempre"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
