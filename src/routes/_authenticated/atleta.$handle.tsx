import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Icone } from "@/design/icones";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Faixa as FaixaVisual } from "@/components/Faixa";
import { CaixaDoPerfil } from "@/components/CaixaDoPerfil";
import { AmostraDeAtletas } from "@/components/ListaDeAtletas";
import { MedalhaEmDestaque } from "@/components/Medalha";
import { SeloDaPessoa, SeloVerificado } from "@/components/SeloVerificado";
import {
  usePerfilPublico,
  useParcerias,
  useResumoParceiros,
  useAlunosDoMestre,
  useResumoDeMestre,
} from "@/lib/social-storage";
import {
  useMedalhasDoAtleta,
  useResumoMedalhasDoAtleta,
} from "@/lib/medalhas-storage";
import { useHistoricoDeGraduacao } from "@/lib/graduacao-storage";
import { LinhaDeGraduacao } from "@/components/HistoricoDeGraduacao";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/atleta/$handle")({
  component: AtletaPage,
});

/**
 * A escada de graduações dela. Mostra as três últimas — o resto fica na caixa
 * aberta, sem link para outra tela: histórico de faixa é curto por natureza.
 */
function GraduacaoDoPerfil({ handle }: { handle: string }) {
  const { graduacoes } = useHistoricoDeGraduacao(handle);
  if (!graduacoes.length) return null;

  return (
    <CaixaDoPerfil
      titulo="Graduações"
      icone={<Icone.graduacao className="h-4 w-4" />}
      i={4}
      contagem={String(graduacoes.length)}
    >
      <div>
        {graduacoes.map((g, i) => (
          <LinhaDeGraduacao
            key={g.id}
            g={g}
            i={i}
            ultima={i === graduacoes.length - 1}
          />
        ))}
      </div>
    </CaixaDoPerfil>
  );
}

/**
 * Os alunos, quando a pessoa comanda uma academia.
 *
 * Fica ao lado de "Parceiros de rola" de propósito: são duas relações
 * diferentes e um mestre tem as duas. Parceiro é com quem ele rola; aluno é
 * quem ele gradua. Juntar as duas numa lista só apagaria a diferença que mais
 * importa no perfil de um professor.
 */
function AlunosDoPerfil({ handle, nome }: { handle: string; nome: string }) {
  const { eMestre, alunos } = useResumoDeMestre(handle);
  const { itens } = useAlunosDoMestre(eMestre ? handle : undefined);

  if (!eMestre) return null;

  return (
    <CaixaDoPerfil
      titulo="Alunos"
      icone={<Icone.graduacao className="h-4 w-4" />}
      i={3}
      contagem={alunos ? String(alunos) : undefined}
      verTodos={
        alunos > 8
          ? { para: `/atleta/${handle}/alunos`, rotulo: `Ver todos os ${alunos}` }
          : undefined
      }
      vazio={`${nome} ainda não tem alunos na academia.`}
    >
      {itens.length ? (
        <AmostraDeAtletas atletas={itens} total={alunos} limite={8} />
      ) : null}
    </CaixaDoPerfil>
  );
}

/**
 * As até-três medalhas que a pessoa escolheu mostrar. Acima disso, o link leva
 * à lista inteira — o perfil é vitrine, não arquivo.
 */
function MedalhasDoPerfil({
  handle,
  nome,
  posicao,
}: {
  handle: string;
  nome: string;
  posicao: number;
}) {
  const { resumo } = useResumoMedalhasDoAtleta(handle);
  const { medalhas } = useMedalhasDoAtleta(handle, true);

  if (!resumo.total) return null;

  return (
    <CaixaDoPerfil
      titulo="Medalhas"
      icone={<Icone.medalha className="h-4 w-4" />}
      i={posicao}
      contagem={`${resumo.ouro}🥇 ${resumo.prata}🥈 ${resumo.bronze}🥉`}
      verTodos={
        resumo.total > medalhas.length
          ? {
              para: `/atleta/${handle}/medalhas`,
              rotulo: `Ver todas as ${resumo.total}`,
            }
          : undefined
      }
      vazio={`${nome} tem ${resumo.total} ${resumo.total === 1 ? "medalha" : "medalhas"}, mas não fixou nenhuma aqui.`}
    >
      {medalhas.length ? (
        <div className="flex gap-2">
          {medalhas.map((m, i) => (
            <MedalhaEmDestaque key={m.id} m={m} i={i} />
          ))}
        </div>
      ) : null}
    </CaixaDoPerfil>
  );
}

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

  // A ordem das caixas segue a escolha da pessoa: fixou medalha, o pódio abre
  // o perfil, antes de equipe e mestre.
  const { medalhas: emDestaque } = useMedalhasDoAtleta(handle, true);
  const podioNoTopo = emDestaque.length > 0;

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
        <Icone.voltar className="h-4 w-4" /> Voltar
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
                    {iniciais(perfil.nickname) || <Icone.perfil className="h-9 w-9" />}
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
                  <Icone.parceiro className="h-4 w-4" /> Vocês são parceiros de rola
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
                  <Icone.adicionarParceiro className="h-4 w-4" /> Adicionar como parceiro
                </Button>
              ))}
          </div>

          {/* ===== Entre vocês dois ===== */}
          {placar && placar.sessoes > 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Icone.rola className="h-4 w-4 text-primary" />
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
                <Icone.rola className="h-4 w-4 text-primary" />
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

          {/* ===== O pódio abre o perfil, quando a pessoa escolheu um ===== */}
          {podioNoTopo && (
            <MedalhasDoPerfil
              handle={perfil.handle}
              nome={perfil.nickname}
              posicao={0}
            />
          )}

          {/* ===== Equipe e mestre, lado a lado ===== */}
          <div className="grid grid-cols-2 gap-3">
            <CaixaDoPerfil
              titulo="Equipe"
              icone={<Icone.equipe className="h-4 w-4" />}
              para={perfil.teamSlug ? `/academia/${perfil.teamSlug}` : undefined}
              i={podioNoTopo ? 1 : 0}
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
                      <Icone.equipe className="h-6 w-6 text-muted-foreground" />
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
              icone={<Icone.graduacao className="h-4 w-4" />}
              para={
                perfil.masterHandle ? `/atleta/${perfil.masterHandle}` : undefined
              }
              i={podioNoTopo ? 2 : 1}
              vazio="Não informou."
            >
              {perfil.masterNickname || perfil.master ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                    <Icone.graduacao className="h-6 w-6 text-muted-foreground" />
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
            icone={<Icone.parceiro className="h-4 w-4" />}
            verTodos={
              perfil.parceiros > 8
                ? {
                    para: `/atleta/${perfil.handle}/parceiros`,
                    rotulo: `Ver todos os ${perfil.parceiros}`,
                  }
                : undefined
            }
            i={podioNoTopo ? 3 : 2}
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

          {/* ===== Alunos, se ela comanda uma academia ===== */}
          <AlunosDoPerfil handle={perfil.handle} nome={perfil.nickname} />

          {/* ===== Medalhas: aqui embaixo só quando não abriram o perfil ===== */}
          {!podioNoTopo && (
            <MedalhasDoPerfil
              handle={perfil.handle}
              nome={perfil.nickname}
              posicao={4}
            />
          )}

          {/* ===== Como ele chegou na faixa que tem ===== */}
          <GraduacaoDoPerfil handle={perfil.handle} />

          {/* ===== Conquistas em destaque ===== */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icone.conquista className="h-4 w-4 text-primary" />
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
                    <Icone.conquista
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
