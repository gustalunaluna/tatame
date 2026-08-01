import { useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Link } from "@tanstack/react-router";
import { CaixaDoPerfil } from "@/components/CaixaDoPerfil";
import { AmostraDeAtletas } from "@/components/ListaDeAtletas";
import { SeloVerificado } from "@/components/SeloVerificado";
import {
  useEquipes,
  useMeuHandle,
  useMestresDe,
  useParcerias,
} from "@/lib/social-storage";
import { MedalhaEmDestaque } from "@/components/Medalha";
import { CadastrarMedalha } from "@/components/CadastrarMedalha";
import {
  BotaoNovaGraduacao,
  LinhaDeGraduacao,
} from "@/components/HistoricoDeGraduacao";
import { useMinhasGraduacoes } from "@/lib/graduacao-storage";
import {
  useMedalhasDoAtleta,
  useMinhasMedalhas,
  useResumoMedalhasDoAtleta,
} from "@/lib/medalhas-storage";
import { useAchievementStats } from "@/lib/bjj-storage";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import {
  ajustarGrau,
  explicacaoDaFaixa,
  grausValidos,
} from "@/lib/graduacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAchievements,
  useDestaques,
  usePerfil,
  useTrainings,
} from "@/lib/bjj-storage";
import { FAIXAS, type Faixa, type Perfil } from "@/lib/bjj-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Ponteira" },
      { name: "description", content: "Seu perfil de atleta: faixa, mestre, lutas e conquistas em destaque." },
    ],
  }),
  component: PerfilPage,
});

const MAX_DESTAQUES = 6;


function idade(nascimento: string | null) {
  if (!nascimento) return null;
  const n = new Date(nascimento + "T00:00:00");
  const hoje = new Date();
  let a = hoje.getFullYear() - n.getFullYear();
  const m = hoje.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

function PerfilPage() {
  const { perfil, salvar, enviarFoto } = usePerfil();
  const { handle } = useMeuHandle();
  const { items: destaques, marcar } = useDestaques();
  const { items: treinos } = useTrainings();
  const inputFoto = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const anos = idade(perfil?.birthDate ?? null);
  const totalLutas = (perfil?.fightsWon ?? 0) + (perfil?.fightsLost ?? 0);
  const aproveitamento = totalLutas
    ? Math.round(((perfil?.fightsWon ?? 0) / totalLutas) * 100)
    : null;

  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Escolha uma até 5 MB.");
      return;
    }
    setEnviando(true);
    try {
      await enviarFoto(file);
      toast.success("Foto atualizada.");
    } catch (err) {
      toast.error(`Não deu para enviar: ${(err as Error).message}`);
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <PageShell title="Perfil" subtitle="Quem você é no tatame.">
      {/* ===== Cabeçalho: foto à esquerda, identidade à direita ===== */}
      <div>
        <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl bg-secondary ring-2 ring-primary/50">
                {perfil?.photoUrl ? (
                  <img
                    src={perfil.photoUrl}
                    alt={`Foto de ${perfil.nickname || "perfil"}`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icone.perfil className="h-9 w-9 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => inputFoto.current?.click()}
                disabled={enviando}
                aria-label="Trocar foto de perfil"
                className="tap absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_16px_-4px_var(--primary)] active:scale-90 disabled:opacity-60"
              >
                <Icone.foto className="h-4 w-4" />
              </button>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={escolherFoto}
              />
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h2 className="truncate text-2xl font-black leading-tight">
                {perfil?.nickname || "Sem apelido"}
              </h2>
              {anos != null && (
                <p className="text-sm text-muted-foreground">{anos} anos</p>
              )}
              <FaixaVisual
                belt={perfil?.belt ?? "Branca"}
                degrees={perfil?.degrees ?? 0}
                className="mt-2"
              />
              {handle && (
                <p className="mt-1.5 text-sm font-semibold text-primary">@{handle}</p>
              )}
              <MinhaAcademia />
            </div>
          </div>

          {/* Bio livre — "3x campeão mundial", o que a pessoa quiser dizer */}
          {perfil?.bio && (
            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
              {perfil.bio}
            </p>
          )}

          {/* Faixa cheia, como no modelo */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="mt-4 w-full gap-2">
                <Icone.editar className="h-4 w-4" /> Editar perfil
              </Button>
            </DialogTrigger>
            {perfil && <EditarPerfil perfil={perfil} onSalvar={salvar} />}
          </Dialog>

      </div>

      {/* ===== Lutas ===== */}
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icone.rola className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Lutas</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-2xl font-black tabular-nums text-primary">
                {perfil?.fightsWon ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground">Vitórias</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-2xl font-black tabular-nums">
                {perfil?.fightsLost ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground">Derrotas</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-2xl font-black tabular-nums">
                {aproveitamento === null ? "—" : `${aproveitamento}%`}
              </p>
              <p className="text-[11px] text-muted-foreground">Aproveit.</p>
            </div>
          </div>
          {totalLutas === 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Ainda sem lutas oficiais. A estreia é a próxima conquista.
            </p>
          )}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {treinos.length} treinos registrados
          </p>
        </CardContent>
      </Card>

      {/* ===== Caixas: equipe, mestre, parceiros e conquistas ===== */}
      <CaixasDoPerfil />

      {/* ===== Conquistas em destaque ===== */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icone.conquista className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Conquistas em destaque</h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="gap-1">
                <Icone.destaque className="h-3.5 w-3.5" /> Escolher
              </Button>
            </DialogTrigger>
            <EscolherDestaques
              selecionadas={destaques.map((d) => d.id)}
              onMarcar={marcar}
            />
          </Dialog>
        </div>

        {destaques.length === 0 ? (
          <Card className="border-dashed bg-transparent">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma em destaque ainda. Toque em <b>Escolher</b> e fixe até{" "}
              {MAX_DESTAQUES} conquistas aqui.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {destaques.slice(0, MAX_DESTAQUES).map((d, i) => (
              <div
                key={d.id}
                style={{ "--i": i } as CSSProperties}
                className="rise-in rounded-2xl border border-primary/40 bg-primary/10 p-3 shadow-[0_0_18px_-8px_var(--primary)]"
              >
                <Icone.conquista className="h-4 w-4 text-primary" />
                <p className="mt-2 text-xs font-bold leading-tight">{d.title}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-primary">
                  Faixa {d.tier}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

/* ============================ Editar perfil ============================ */

/**
 * As quatro ligações do atleta, cada uma abrindo a tela cheia ao toque.
 * Antes cada uma dessas era uma aba própria na barra de baixo.
 */
/** A academia logo abaixo do @, com o selo e levando ao perfil dela. */
function MinhaAcademia() {
  const { minhaEquipe } = useEquipes();
  const { perfil } = usePerfil();
  if (minhaEquipe?.status === "aprovada") {
    return (
      <Link
        to="/academia/$slug"
        params={{ slug: minhaEquipe.slug }}
        className="tap mt-1 flex items-center gap-1 text-sm text-muted-foreground active:scale-[0.98]"
      >
        <span className="truncate">{minhaEquipe.name}</span>
        <SeloVerificado tipo="equipe" className="h-3.5 w-3.5" />
      </Link>
    );
  }
  return perfil?.gym ? (
    <p className="mt-1 truncate text-sm text-muted-foreground">{perfil.gym}</p>
  ) : null;
}

/**
 * A caixa de mestres do próprio perfil.
 *
 * Mostra o principal — o que a linhagem segue — e diz quantos mais existem. O
 * texto antigo do campo "Mestre / professor" continua aparecendo enquanto não
 * houver nenhum vínculo cadastrado: é dado que a pessoa digitou e que não pode
 * sumir só porque o modelo melhorou.
 */
function MeusMestresNoPerfil({ i, legado }: { i: number; legado: string }) {
  const { handle } = useMeuHandle();
  const { mestres } = useMestresDe(handle);
  const principal = mestres[0];

  return (
    <CaixaDoPerfil
      titulo={mestres.length > 1 ? "Mestres" : "Mestre"}
      icone={<Icone.graduacao className="h-4 w-4" />}
      para="/meus-mestres"
      i={i}
      contagem={mestres.length > 1 ? String(mestres.length) : undefined}
      vazio="Toque para cadastrar."
    >
      {principal || legado ? (
        <div className="flex flex-col items-center gap-2 text-center">
          {principal?.mestreFoto ? (
            <img
              src={principal.mestreFoto}
              alt=""
              loading="lazy"
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
              <Icone.graduacao className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <p className="flex items-center justify-center gap-1 text-xs font-bold leading-tight">
            <span className="line-clamp-2">
              {principal ? principal.mestreNome : legado}
            </span>
            {principal?.mestreVerificado && (
              <SeloVerificado tipo="mestre" className="h-3.5 w-3.5" />
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {mestres.length > 1
              ? `e mais ${mestres.length - 1}`
              : principal
                ? "ver linhagem"
                : "declarado"}
          </p>
        </div>
      ) : null}
    </CaixaDoPerfil>
  );
}

/**
 * As medalhas em destaque do próprio perfil. Até três, escolhidas por quem
 * ganhou — quem tem mais que isso vê a lista completa em outra tela.
 *
 * `posicao` existe porque esta caixa troca de lugar: quem tem medalha em
 * destaque a vê no topo, antes de equipe e mestre, porque foi o que a pessoa
 * escolheu mostrar primeiro. Quem não tem deixa o pódio no fim, onde ele vira
 * convite em vez de espaço vazio na abertura do perfil.
 */
function MinhasMedalhas({ posicao }: { posicao: number }) {
  const { handle } = useMeuHandle();
  const { criar } = useMinhasMedalhas(handle);
  const { resumo } = useResumoMedalhasDoAtleta(handle);
  const { medalhas } = useMedalhasDoAtleta(handle, true);

  return (
    <CaixaDoPerfil
      titulo="Medalhas"
      icone={<Icone.medalha className="h-4 w-4" />}
      i={posicao}
      contagem={resumo.total ? String(resumo.total) : undefined}
      verTodos={
        resumo.total
          ? { para: "/minhas-medalhas", rotulo: "Ver todas e escolher destaques" }
          : undefined
      }
      vazio="Nenhuma medalha registrada."
    >
      {medalhas.length ? (
        <div className="flex gap-2">
          {medalhas.map((m, i) => (
            <MedalhaEmDestaque key={m.id} m={m} i={i} />
          ))}
        </div>
      ) : resumo.total ? (
        <p className="text-center text-xs text-muted-foreground">
          Você tem {resumo.total}{" "}
          {resumo.total === 1 ? "medalha" : "medalhas"}, mas nenhuma em
          destaque. Escolha até três para aparecerem aqui.
        </p>
      ) : (
        <CadastrarMedalha
          aoSalvar={criar}
          gatilho={
            <Button variant="outline" size="sm" className="w-full gap-1">
              <Icone.adicionar className="h-4 w-4" /> Registrar medalha
            </Button>
          }
        />
      )}
    </CaixaDoPerfil>
  );
}

/**
 * A escada de faixas e graus, com quem entregou cada uma. É o histórico que o
 * app não tinha: a faixa atual do perfil diz onde a pessoa está, e isto conta
 * como ela chegou.
 */
function MinhaGraduacao() {
  const { handle } = useMeuHandle();
  const { graduacoes, criar, apagar } = useMinhasGraduacoes(handle);
  const recentes = graduacoes.slice(0, 3);

  return (
    <CaixaDoPerfil
      titulo="Graduações"
      icone={<Icone.graduacao className="h-4 w-4" />}
      i={5}
      contagem={graduacoes.length ? String(graduacoes.length) : undefined}
      verTodos={
        graduacoes.length > 3
          ? { para: "/minhas-graduacoes", rotulo: "Ver o histórico inteiro" }
          : undefined
      }
      vazio="Nenhuma graduação registrada. Guarde quem te deu cada grau."
    >
      {recentes.length ? (
        <div className="space-y-0">
          {recentes.map((g, i) => (
            <LinhaDeGraduacao
              key={g.id}
              g={g}
              i={i}
              ultima={i === recentes.length - 1}
              aoApagar={(id) => void apagar(id)}
            />
          ))}
          <BotaoNovaGraduacao aoSalvar={criar} rotulo="Adicionar outra" />
        </div>
      ) : (
        <BotaoNovaGraduacao aoSalvar={criar} />
      )}
    </CaixaDoPerfil>
  );
}

function CaixasDoPerfil() {
  const { handle: meuHandle } = useMeuHandle();
  // Decide a ordem das caixas: com medalha em destaque, o pódio abre o perfil.
  const { medalhas: emDestaque } = useMedalhasDoAtleta(meuHandle, true);
  const podioNoTopo = emDestaque.length > 0;

  const { perfil } = usePerfil();
  const { minhaEquipe, equipes, vinculos } = useEquipes();
  const { aceitos } = useParcerias();
  const { total, unlocked } = useAchievementStats();

  const equipePendente = equipes.find(
    (e) => e.status !== "aprovada" && vinculos.some((v) => v.teamId === e.id),
  );
  const equipe = minhaEquipe ?? equipePendente;

  const brasao = (equipe as { crestUrl?: string } | undefined)?.crestUrl ?? "";

  return (
    <div className="space-y-3">
      {/* O pódio vem primeiro quando há medalha em destaque: foi a pessoa que
          escolheu aquelas três, e escolha de vitrine merece o topo. */}
      {podioNoTopo && <MinhasMedalhas posicao={0} />}

      {/* Equipe e Mestre lado a lado, como no modelo */}
      <div className="grid grid-cols-2 gap-3">
        <CaixaDoPerfil
          titulo="Equipe"
          icone={<Icone.equipe className="h-4 w-4" />}
          para={
            equipe?.status === "aprovada" ? `/academia/${equipe.slug}` : "/equipe"
          }
          i={podioNoTopo ? 1 : 0}
          contagem={equipe?.status === "aprovada" ? "oficial" : undefined}
          vazio="Toque para escolher."
        >
          {equipe || perfil?.gym ? (
            <div className="flex flex-col items-center gap-2 text-center">
              {brasao ? (
                <img
                  src={brasao}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 rounded-xl object-contain"
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                  <Icone.equipe className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <p className="flex items-center justify-center gap-1 text-xs font-bold leading-tight">
                <span className="line-clamp-2">{equipe?.name ?? perfil?.gym}</span>
                {equipe?.status === "aprovada" && (
                  <SeloVerificado tipo="equipe" className="h-3.5 w-3.5" />
                )}
              </p>
              {!equipe && (
                <p className="text-[10px] text-muted-foreground">declarada</p>
              )}
            </div>
          ) : null}
        </CaixaDoPerfil>

        <MeusMestresNoPerfil
          i={podioNoTopo ? 2 : 1}
          legado={perfil?.master ?? ""}
        />
      </div>

      <CaixaDoPerfil
        titulo="Parceiros de rola"
        icone={<Icone.parceiro className="h-4 w-4" />}
        verTodos={{ para: "/parceiros", rotulo: "Ver todos" }}
        i={podioNoTopo ? 3 : 2}
        contagem={aceitos.length ? String(aceitos.length) : undefined}
        vazio="Nenhum parceiro ainda. Adicione pelo @ da pessoa."
      >
        {aceitos.length ? (
          <AmostraDeAtletas
            atletas={aceitos
              .filter((a) => a.cartao)
              .map((a) => ({ ...a.cartao!, role: undefined }))}
            total={aceitos.length}
            limite={8}
          />
        ) : null}
      </CaixaDoPerfil>

      {/* Sem medalha em destaque, o pódio fica aqui embaixo — como convite. */}
      {!podioNoTopo && <MinhasMedalhas posicao={4} />}

      <MinhaGraduacao />

      <CaixaDoPerfil
        titulo="Conquistas"
        icone={<Icone.conquista className="h-4 w-4" />}
        para="/conquistas"
        i={6}
        contagem={total ? `${unlocked}/${total}` : undefined}
      >
        {total ? (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((unlocked / total) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {Math.round((unlocked / total) * 100)}% do caminho até a vermelha
            </p>
          </div>
        ) : null}
      </CaixaDoPerfil>
    </div>
  );
}

function EditarPerfil({
  perfil,
  onSalvar,
}: {
  perfil: Perfil;
  onSalvar: (p: Partial<Perfil>) => void;
}) {
  const [f, setF] = useState<Perfil>(perfil);
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) =>
    setF((a) => ({ ...a, [k]: v }));

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar perfil</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="apelido">Apelido</Label>
          <Input
            id="apelido"
            name="nickname"
            autoComplete="nickname"
            value={f.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            placeholder="Como te chamam no tatame"
          />
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={3}
            maxLength={300}
            value={f.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="3x campeão paranaense · começou em 2025 · guardeiro"
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {f.bio.length}/300
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="nascimento">Nascimento</Label>
            <Input
              id="nascimento"
              type="date"
              value={f.birthDate ?? ""}
              onChange={(e) => set("birthDate", e.target.value || null)}
            />
          </div>
          <div>
            <Label htmlFor="academia">Academia</Label>
            <Input
              id="academia"
              value={f.gym}
              onChange={(e) => set("gym", e.target.value)}
              placeholder="Sua equipe"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Faixa</Label>
            <Select
              value={f.belt}
              onValueChange={(v) => {
                const nova = v as Faixa;
                set("belt", nova);
                // Trocar a faixa reencaixa o grau. Quem estava em "Preta 3º" e
                // escolhe Vermelha não pode ficar com 3: vermelha 3º grau não
                // existe — a vermelha É o 9º grau de preta.
                set("degrees", ajustarGrau(nova, f.degrees));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAIXAS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Graus</Label>
            <Select
              value={String(f.degrees)}
              onValueChange={(v) => set("degrees", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grausValidos(f.belt).map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {g === 0 ? "Sem grau" : `${g}º grau`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {explicacaoDaFaixa(f.belt, f.degrees) && (
          <p className="-mt-1 text-xs text-muted-foreground">
            {explicacaoDaFaixa(f.belt, f.degrees)}
          </p>
        )}

        {/* O campo de texto virou tela própria. Um nome só não guardava quem
            iniciou a pessoa nem quem a graduou preta, e não ligava em perfil
            nenhum. Quem já preencheu o antigo continua vendo o valor aqui até
            cadastrar o primeiro vínculo de verdade. */}
        <Link
          to="/meus-mestres"
          className="tap flex items-center justify-between rounded-xl border border-border/60 p-3 active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold">Mestres e linhagem</span>
            <span className="block truncate text-xs text-muted-foreground">
              {f.master
                ? `Cadastrado à mão: ${f.master}`
                : "Quem te graduou, com data e academia"}
            </span>
          </span>
          <Icone.avancar className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vitorias">Vitórias</Label>
            <Input
              id="vitorias"
              type="number"
              inputMode="numeric"
              min={0}
              value={f.fightsWon}
              onChange={(e) => set("fightsWon", Math.max(0, +e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="derrotas">Derrotas</Label>
            <Input
              id="derrotas"
              type="number"
              inputMode="numeric"
              min={0}
              value={f.fightsLost}
              onChange={(e) => set("fightsLost", Math.max(0, +e.target.value))}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          className="w-full"
          onClick={() => {
            onSalvar(f);
            toast.success("Perfil salvo.");
          }}
        >
          Salvar Perfil
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ========================= Escolher destaques ========================= */

function EscolherDestaques({
  selecionadas,
  onMarcar,
}: {
  selecionadas: string[];
  onMarcar: (id: string, featured: boolean) => void;
}) {
  const { items } = useAchievements();
  const [busca, setBusca] = useState("");

  const desbloqueadas = useMemo(
    () =>
      items
        .filter((a) => a.unlocked)
        .filter((a) => a.title.toLowerCase().includes(busca.toLowerCase())),
    [items, busca],
  );

  const cheio = selecionadas.length >= MAX_DESTAQUES;

  return (
    <DialogContent className="max-h-[85vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle>Conquistas em destaque</DialogTitle>
      </DialogHeader>
      <p className="text-xs text-muted-foreground">
        Escolha até {MAX_DESTAQUES} para aparecerem no seu perfil.{" "}
        <span className="font-bold text-primary">
          {selecionadas.length}/{MAX_DESTAQUES}
        </span>
      </p>
      <Input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar entre as desbloqueadas…"
      />
      <div className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
        {desbloqueadas.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nada encontrado.
          </p>
        )}
        {desbloqueadas.map((a) => {
          const on = selecionadas.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => {
                if (!on && cheio) {
                  toast.error(`Máximo de ${MAX_DESTAQUES}. Tire uma para incluir outra.`);
                  return;
                }
                onMarcar(a.id, !on);
              }}
              className={cn(
                "tap flex w-full items-center gap-3 rounded-xl border p-2.5 text-left active:scale-[0.99]",
                on
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/50 bg-card/50 hover:bg-secondary/50",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                  on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {on ? <Icone.confirmar className="h-4 w-4" /> : <Icone.conquista className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{a.title}</span>
                <span className="block text-[10px] uppercase tracking-wider text-primary">
                  Faixa {a.tier}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </DialogContent>
  );
}
