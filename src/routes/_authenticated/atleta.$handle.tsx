import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  GraduationCap,
  Shield,
  Swords,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { CaixaDoPerfil } from "@/components/CaixaDoPerfil";
import { AmostraDeAtletas } from "@/components/ListaDeAtletas";
import { SeloDaPessoa, SeloVerificado } from "@/components/SeloVerificado";
import {
  usePerfilPublico,
  useParcerias,
  useResumoParceiros,
} from "@/lib/social-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/atleta/$handle")({
  component: AtletaPage,
});

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function AtletaPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { perfil, destaques, parceiros, naoExiste, ready } =
    usePerfilPublico(handle);
  const { convidar, todas } = useParcerias();
  const { itens: resumo } = useResumoParceiros();
  // O placar só faz sentido — e só é mostrado — entre quem já é parceiro.
  const placar = perfil?.eMeuParceiro
    ? resumo.find((r) => r.partnerId === perfil.userId)
    : undefined;

  const jaTemVinculo =
    perfil && todas.some((p) => p.parceria.outroId === perfil.userId);

  const totalLutas = (perfil?.fightsWon ?? 0) + (perfil?.fightsLost ?? 0);
  const aproveitamento = totalLutas
    ? Math.round(((perfil?.fightsWon ?? 0) / totalLutas) * 100)
    : null;

  return (
    <div className="topo-seguro rodape-seguro lados-seguros mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5">
      <button
        onClick={() => navigate({ to: "/parceiros" })}
        className="tap -ml-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {ready && naoExiste && (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Ninguém com @{handle}. Confere a escrita com a pessoa.
          </CardContent>
        </Card>
      )}

      {perfil && (
        <>
          {/* ===== Cabeçalho, igual ao seu ===== */}
          <div>
            <div className="flex items-start gap-4">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary ring-2 ring-primary/50">
                {perfil.photoUrl ? (
                  <img
                    src={perfil.photoUrl}
                    alt={`Foto de ${perfil.nickname}`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-muted-foreground">
                    {iniciais(perfil.nickname) || <User className="h-9 w-9" />}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <h1 className="flex items-center gap-1.5 text-2xl font-black leading-tight">
                  <span className="truncate">{perfil.nickname}</span>
                  <SeloDaPessoa
                    verificado={perfil.verificado}
                    equipeOficial={perfil.teamStatus === "aprovada"}
                    className="h-5 w-5"
                  />
                </h1>
                {perfil.idade != null && (
                  <p className="text-sm text-muted-foreground">
                    {perfil.idade} anos
                  </p>
                )}
                <FaixaVisual
                  belt={perfil.belt}
                  degrees={perfil.degrees}
                  className="mt-2"
                />
                <p className="mt-1.5 text-sm font-semibold text-primary">
                  @{perfil.handle}
                </p>
                {perfil.teamSlug ? (
                  <Link
                    to="/academia/$slug"
                    params={{ slug: perfil.teamSlug }}
                    className="tap mt-1 flex items-center gap-1 text-sm text-muted-foreground active:scale-[0.98]"
                  >
                    <span className="truncate">{perfil.teamName}</span>
                    <SeloVerificado tipo="equipe" className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  perfil.gym && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {perfil.gym}
                    </p>
                  )
                )}
              </div>
            </div>

            {perfil.bio && (
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                {perfil.bio}
              </p>
            )}

            {!perfil.souEu &&
              (perfil.eMeuParceiro ? (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-sm font-semibold text-primary">
                  <Users className="h-4 w-4" /> Vocês são parceiros de rola
                </div>
              ) : jaTemVinculo ? (
                <div className="mt-4 rounded-xl border border-border/60 py-2.5 text-center text-sm text-muted-foreground">
                  Convite em aberto
                </div>
              ) : (
                <Button
                  className="mt-4 w-full gap-2"
                  onClick={async () => {
                    if (await convidar(perfil.userId))
                      toast.success(`Convite enviado para @${perfil.handle}.`);
                  }}
                >
                  <UserPlus className="h-4 w-4" /> Adicionar como parceiro
                </Button>
              ))}
          </div>

          {/* ===== Entre vocês dois ===== */}
          {placar && placar.sessoes > 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold">Entre vocês</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/60 py-2">
                    <p className="text-lg font-black leading-none">
                      {placar.rolls}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      rolas
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 py-2">
                    <p className="text-lg font-black leading-none text-primary">
                      {placar.subsFor}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      você finalizou
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 py-2">
                    <p className="text-lg font-black leading-none text-destructive">
                      {placar.subsAgainst}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      ele finalizou
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {placar.sessoes}{" "}
                  {placar.sessoes === 1 ? "treino juntos" : "treinos juntos"}
                  {placar.pendentes > 0 &&
                    ` · ${placar.pendentes} esperando confirmação`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ===== Lutas ===== */}
          <Card className="border-border/60 bg-card/70">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Lutas</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-2xl font-black tabular-nums text-primary">
                    {perfil.fightsWon}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Vitórias</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-2xl font-black tabular-nums">
                    {perfil.fightsLost}
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
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                {perfil.treinos} treinos registrados
              </p>
            </CardContent>
          </Card>

          {/* ===== Equipe e mestre, lado a lado ===== */}
          <div className="grid grid-cols-2 gap-3">
            <CaixaDoPerfil
              titulo="Equipe"
              icone={<Shield className="h-4 w-4" />}
              para={perfil.teamSlug ? `/academia/${perfil.teamSlug}` : undefined}
              i={0}
              contagem={perfil.teamStatus === "aprovada" ? "oficial" : undefined}
              vazio="Não informou."
            >
              {perfil.teamName || perfil.gym ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  {perfil.teamCrest ? (
                    <img
                      src={perfil.teamCrest}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                      <Shield className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <p className="flex items-center justify-center gap-1 text-xs font-bold leading-tight">
                    <span className="line-clamp-2">
                      {perfil.teamName || perfil.gym}
                    </span>
                    {perfil.teamStatus === "aprovada" && (
                      <SeloVerificado tipo="equipe" className="h-3.5 w-3.5" />
                    )}
                  </p>
                  {!perfil.teamName && (
                    <p className="text-[10px] text-muted-foreground">declarada</p>
                  )}
                </div>
              ) : null}
            </CaixaDoPerfil>

            <CaixaDoPerfil
              titulo="Mestre"
              icone={<GraduationCap className="h-4 w-4" />}
              para={
                perfil.masterHandle ? `/atleta/${perfil.masterHandle}` : undefined
              }
              i={1}
              vazio="Não informou."
            >
              {perfil.masterNickname || perfil.master ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                    <GraduationCap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="flex items-center justify-center gap-1 text-xs font-bold leading-tight">
                    <span className="line-clamp-2">
                      {perfil.masterNickname || perfil.master}
                    </span>
                    {perfil.masterHandle && (
                      <SeloVerificado tipo="mestre" className="h-3.5 w-3.5" />
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {perfil.masterHandle ? "da academia" : "declarado"}
                  </p>
                </div>
              ) : null}
            </CaixaDoPerfil>
          </div>

          {/* ===== Parceiros de rola dele ===== */}
          <CaixaDoPerfil
            titulo="Parceiros de rola"
            icone={<Users className="h-4 w-4" />}
            verTodos={
              perfil.parceiros > 8
                ? {
                    para: `/atleta/${perfil.handle}/parceiros`,
                    rotulo: `Ver todos os ${perfil.parceiros}`,
                  }
                : undefined
            }
            i={2}
            contagem={perfil.parceiros ? String(perfil.parceiros) : undefined}
            vazio="Ainda não tem parceiros."
          >
            {parceiros.length ? (
              <AmostraDeAtletas
                atletas={parceiros}
                total={perfil.parceiros}
                limite={8}
              />
            ) : null}
          </CaixaDoPerfil>

          {/* ===== Conquistas em destaque ===== */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Conquistas em destaque</h2>
              </div>
              {perfil.conquistasTotal > 0 && (
                <span className="text-xs text-muted-foreground">
                  {perfil.conquistasFeitas}/{perfil.conquistasTotal}
                </span>
              )}
            </div>

            {destaques.length === 0 ? (
              <Card className="border-dashed bg-transparent">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  {perfil.nickname} ainda não fixou nenhuma conquista aqui.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {destaques.map((d, i) => (
                  <div
                    key={d.id}
                    style={{ "--i": i } as CSSProperties}
                    className={cn(
                      "rise-in rounded-2xl border p-3",
                      d.unlocked
                        ? "border-primary/40 bg-primary/10 shadow-[0_0_18px_-8px_var(--primary)]"
                        : "border-border/50 bg-card/40 opacity-70",
                    )}
                  >
                    <Trophy
                      className={cn(
                        "h-4 w-4",
                        d.unlocked ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <p className="mt-2 text-xs font-bold leading-tight">
                      {d.title}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-primary">
                      Faixa {d.tier}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
