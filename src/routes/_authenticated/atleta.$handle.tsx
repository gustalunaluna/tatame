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
  useMestresDe,
} from "@/lib/social-storage";
import type { PerfilPublico } from "@/lib/social-types";
import { tituloDe } from "@/lib/titulos";
import {
  useMedalhasDoAtleta,
  useResumoMedalhasDoAtleta,
} from "@/lib/medalhas-storage";
import { useHistoricoDeGraduacao } from "@/lib/graduacao-storage";
import { LinhaDeGraduacao } from "@/components/HistoricoDeGraduacao";
import { cn } from "@/lib/utils";
import { FotoDoAtleta } from "@/components/FotoDoAtleta";

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
 * Os mestres da pessoa.
 *
 * Era um campo de texto com um nome só, e por isso a história inteira de quem
 * treina há dez anos cabia numa linha: sumia quem iniciou, sumia quem graduou
 * preta. Agora a caixa mostra o mestre principal — o que a linhagem segue — e
 * diz quantos mais existem; a caixa inteira abre a linhagem.
 *
 * O texto antigo (`master`) continua sendo lido quando não há vínculo nenhum
 * cadastrado. É dado de gente de verdade que não pode sumir só porque o modelo
 * melhorou.
 */
function MestresDoPerfil({
  perfil,
  i,
}: {
  perfil: PerfilPublico;
  i: number;
}) {
  const { mestres } = useMestresDe(perfil.handle);
  const principal = mestres[0];
  const legado = !mestres.length && (perfil.masterNickname || perfil.master);

  return (
    <CaixaDoPerfil
      titulo={mestres.length > 1 ? "Mestres" : "Mestre"}
      icone={<Icone.graduacao className="h-4 w-4" />}
      // A caixa leva à linhagem, não ao perfil do mestre: é a corrente
      // inteira que responde "de quem você é aluno?", e o mestre em si está
      // a um toque de lá.
      para={mestres.length ? `/atleta/${perfil.handle}/linhagem` : undefined}
      i={i}
      contagem={mestres.length > 1 ? String(mestres.length) : undefined}
      vazio="Não informou."
    >
      {principal ? (
        <div className="flex flex-col items-center gap-2 text-center">
          {principal.mestreFoto ? (
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
            <span className="line-clamp-2">{principal.mestreNome}</span>
            {principal.mestreVerificado && (
              <SeloVerificado tipo="mestre" className="h-3.5 w-3.5" />
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {mestres.length > 1
              ? `e mais ${mestres.length - 1}`
              : principal.mestreHandle
                ? "no app"
                : "declarado"}
          </p>
        </div>
      ) : legado ? (
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
          <p className="text-xs text-muted-foreground">
            {perfil.masterHandle ? "da academia" : "declarado"}
          </p>
        </div>
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
              <FotoDoAtleta
                url={perfil.photoUrl}
                nome={perfil.nickname}
                className="h-24 w-24 rounded-2xl ring-2 ring-primary/50"
                classeDasIniciais="text-2xl"
              />

              <div className="min-w-0 flex-1 pt-1">
                <h1 className="flex items-center gap-1.5 text-2xl font-black leading-tight">
                  <span className="truncate">{perfil.nickname}</span>
                  <SeloDaPessoa
                    verificado={perfil.verificado}
                    equipeOficial={perfil.teamStatus === "aprovada"}
                    className="h-5 w-5"
                  />
                </h1>
                {/* O título vem da faixa, do cargo na academia e da
                    declaração de instrutor — nessa ordem, com a faixa como
                    teto. "Aluno" fica de fora: a faixa logo abaixo já diz
                    isso, e escrever em todo perfil vira ruído. */}
                {(() => {
                  const titulo = tituloDe({
                    belt: perfil.belt,
                    degrees: perfil.degrees,
                    papel: perfil.papel,
                    instrutor: perfil.instrutor,
                  });
                  return titulo === "Aluno" ? null : (
                    <p className="mt-0.5 text-sm font-bold text-primary">{titulo}</p>
                  );
                })()}
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
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      rolas
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 py-2">
                    <p className="text-lg font-black leading-none text-primary">
                      {placar.subsFor}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      você finalizou
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 py-2">
                    <p className="text-lg font-black leading-none text-destructive">
                      {placar.subsAgainst}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ele finalizou
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground">Vitórias</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-2xl font-black tabular-nums">
                    {perfil.fightsLost}
                  </p>
                  <p className="text-xs text-muted-foreground">Derrotas</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-2xl font-black tabular-nums">
                    {aproveitamento === null ? "—" : `${aproveitamento}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">Aproveit.</p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">declarada</p>
                  )}
                </div>
              ) : null}
            </CaixaDoPerfil>

            <MestresDoPerfil perfil={perfil} i={podioNoTopo ? 2 : 1} />
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
                    <p className="mt-0.5 text-xs uppercase tracking-wider text-primary">
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
