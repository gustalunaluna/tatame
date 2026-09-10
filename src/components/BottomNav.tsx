import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Icone, type LucideIcon } from "@/design/icones";
import { cn } from "@/lib/utils";

/**
 * A barra de baixo, depois que o app virou dois.
 *
 * Ela é FIXA nas duas áreas, e isso é uma decisão, não uma economia. A versão
 * anterior trocava os cinco atalhos ao entrar em /dieta — o que dava a
 * sensação certa de "dois apps", mas cobrava caro: quem estava anotando o
 * almoço e lembrava de um detalhe do treino perdia o caminho de volta, e a
 * barra mudava de significado embaixo do dedo. Barra que muda sozinha é barra
 * em que não se confia.
 *
 * Agora as duas áreas ficam lado a lado, sempre visíveis. Trocar de app é um
 * toque, de qualquer tela, e nenhum dos dois some da vista — que é o que
 * impede o app menos usado de ser esquecido.
 *
 * Início não é o jiu-jitsu: é o dia inteiro, dos dois lados. O painel do
 * tatame mora em /jiu-jitsu.
 */
const ATALHOS = [
  { to: "/", label: "Início", icon: Icone.inicio, exato: true },
  { to: "/jiu-jitsu", label: "Jiu-jitsu", icon: Icone.rola, exato: false },
  { to: "/dieta", label: "Dieta", icon: Icone.dieta, exato: false },
  { to: "/perfil", label: "Perfil", icon: Icone.perfil, exato: false },
] as const;

/**
 * Tudo que existe, em três gavetas que abrem e fecham.
 *
 * Os grupos existiam antes, mas todos abertos ao mesmo tempo: dezenove itens
 * empilhados numa tela de celular, com o fim da lista a três rolagens de
 * distância. Um título de grupo que não fecha nada é uma legenda, não uma
 * estrutura — ele organiza a leitura e não diminui o trabalho.
 *
 * Fechando, o menu inteiro cabe em três linhas, e a pessoa escolhe o assunto
 * antes de escolher a tela. E são três porque são três mesmo: as duas áreas do
 * app, e o que não é de nenhuma das duas — perfil, gente, ajustes.
 *
 * Início fica de fora dos grupos de propósito: ele não é de uma área, é a porta.
 */
const MENU = [
  {
    grupo: "Jiu-jitsu",
    icone: Icone.rola,
    itens: [
      { to: "/jiu-jitsu", label: "Painel do tatame", icon: Icone.rola },
      { to: "/diario", label: "Diário", icon: Icone.treino },
      { to: "/tecnicas", label: "Técnicas", icon: Icone.tecnica },
      { to: "/analises", label: "Análises", icon: Icone.analise },
      { to: "/metas", label: "Evolução", icon: Icone.evolucao },
      { to: "/plano", label: "Plano do mês", icon: Icone.listaDeTecnicas },
      { to: "/graduacao", label: "Graduação", icon: Icone.graduacao },
      { to: "/minhas-lutas", label: "Minhas lutas", icon: Icone.rola },
      { to: "/minhas-medalhas", label: "Medalhas", icon: Icone.medalha },
      { to: "/conquistas", label: "Conquistas", icon: Icone.conquista },
    ],
  },
  {
    grupo: "Dieta",
    icone: Icone.dieta,
    itens: [
      { to: "/dieta", label: "Hoje", icon: Icone.dieta },
      { to: "/dieta/peso", label: "Peso", icon: Icone.peso },
      { to: "/dieta/ajustes", label: "Metas da dieta", icon: Icone.meta },
    ],
  },
  {
    grupo: "Pessoal",
    icone: Icone.perfil,
    itens: [
      { to: "/perfil", label: "Perfil", icon: Icone.perfil },
      { to: "/parceiros", label: "Parceiros de rola", icon: Icone.parceiro },
      { to: "/equipe", label: "Equipe", icon: Icone.equipe },
      { to: "/meus-mestres", label: "Mestres e linhagem", icon: Icone.graduacao },
      { to: "/configuracoes", label: "Configurações", icon: Icone.ajustes },
    ],
  },
] as const;

/**
 * Qual gaveta abre sozinha: a da tela em que a pessoa está.
 *
 * Abrir todas anula a gaveta; abrir nenhuma obriga um toque a mais em quem já
 * sabe onde está. Abrir a do lugar de onde se veio acerta na maioria das
 * vezes, e é reversível num toque quando erra.
 *
 * Ganha o caminho MAIS LONGO que casa, e não o primeiro: /dieta/peso casa
 * tanto com "/dieta" quanto consigo mesmo, e sem desempatar por tamanho a
 * gaveta certa passaria a depender da ordem em que os grupos foram escritos —
 * que é o tipo de acoplamento que ninguém lembra ao reordenar uma lista.
 *
 * "/" não está em MENU (o Início fica fora das gavetas), então nenhuma gaveta
 * abre na tela inicial. É o certo: lá a pessoa ainda não escolheu um assunto.
 */
function grupoDaRota(pathname: string): string | null {
  let melhor: { grupo: string; tamanho: number } | null = null;
  for (const { grupo, itens } of MENU) {
    for (const { to } of itens) {
      if (pathname.startsWith(to) && (!melhor || to.length > melhor.tamanho)) {
        melhor = { grupo, tamanho: to.length };
      }
    }
  }
  return melhor?.grupo ?? null;
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);

  // `exato` existe por causa de /dieta e de /: sem ele, "Hoje" e "Peso"
  // acendiam juntos em /dieta/peso, porque um é prefixo do outro.
  const ativo = (to: string, exato = false) =>
    exato || to === "/" ? pathname === to : pathname.startsWith(to);

  /**
   * Quais gavetas do menu estão abertas.
   *
   * Um conjunto, e não uma gaveta só. A primeira versão era acordeão
   * exclusivo — abrir Dieta fechava Jiu-jitsu — e o teste do menu pegou o
   * defeito de cara: quem abre um grupo para comparar com o outro vê o
   * primeiro sumir embaixo do dedo. Fechar coisa que a pessoa não mandou
   * fechar é o oposto do que a gaveta serve para fazer.
   */
  const [gavetas, setGavetas] = useState<Set<string>>(() => new Set());

  const alternar = (grupo: string) =>
    setGavetas((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(grupo)) novo.add(grupo);
      return novo;
    });

  // Fora da sessão não há para onde navegar. A barra aparecia na tela de
  // entrada, cobrindo o botão de criar conta e oferecendo seis telas que
  // devolviam a pessoa para cá.
  //
  // O mesmo vale para as boas-vindas: a guarda devolve para lá quem ainda não
  // respondeu, então cada atalho da barra viraria um caminho que não leva a
  // lugar nenhum — e o botão "Começar" fica logo embaixo dela.
  //
  // As demais são as telas que existem SEM sessão: a recuperação de senha e as
  // páginas legais, que as lojas abrem sem instalar o app.
  const foraDaSessao = [
    "/auth",
    "/boas-vindas",
    "/esqueci-a-senha",
    "/nova-senha",
    "/privacidade",
    "/termos",
  ].some((rota) => pathname.startsWith(rota));

  // Fecha ao trocar de tela
  useEffect(() => setAberto(false), [pathname]);

  // Ao ABRIR, a gaveta do lugar onde a pessoa está já vem aberta.
  //
  // O efeito depende de `aberto` e não de `pathname` de propósito: assim quem
  // fechou a gaveta na mão e navegou dentro dela não a vê reabrir sozinha —
  // o palpite acontece uma vez por abertura do menu, não a cada clique.
  useEffect(() => {
    if (!aberto) return;
    const daRota = grupoDaRota(pathname);
    setGavetas(daRota ? new Set([daRota]) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Fecha com Esc, trava o scroll do fundo e devolve o foco ao botão
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", onKey);

    // `overflow: hidden` sozinho não segura o scroll no Safari do iPhone — a
    // página continuava rolando atrás do menu e voltava para o topo ao fechar.
    // Prender o body com `position: fixed` segura de verdade; guardamos a
    // posição para devolver exatamente onde estava.
    const posicao = window.scrollY;
    const body = document.body;
    const anterior = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${posicao}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    painel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.position = anterior.position;
      body.style.top = anterior.top;
      body.style.width = anterior.width;
      body.style.overflow = anterior.overflow;
      window.scrollTo(0, posicao);
      botaoMenu.current?.focus();
    };
  }, [aberto]);

  if (foraDaSessao) return null;

  return (
    <>
      {/* ===== Menu lateral ===== */}
      {aberto && (
        <div className="fixed inset-0 h-dvh" style={{ zIndex: "var(--z-sobreposicao)" }}>
          <button
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="overlay-in absolute inset-0 h-full w-full bg-black/70"
          />
          <aside
            ref={painel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            style={{ zIndex: "var(--z-painel)" }}
            // Sem `border-l`: numa gaveta escura sobre fundo escurecido, a
            // borda clara não separa nada — lê como uma listra solta grudada na
            // lateral. A sombra já faz a separação, e sozinha faz melhor.
            className="panel-in absolute bottom-0 right-0 top-0 flex w-[82%] min-w-[16rem] max-w-xs flex-col overflow-hidden bg-card shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.85)]"
          >
            <div
              className="flex items-center justify-between px-4 pb-3"
              style={{ paddingTop: "max(1rem, calc(var(--safe-t) + 1.25rem))" }}
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                  Ponteira
                </p>
                <p className="text-sm font-bold">Menu</p>
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="tap grid h-11 w-11 place-items-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground active:scale-95"
              >
                <Icone.fechar className="h-4 w-4" />
              </button>
            </div>

            {/* `min-h-0` é o que permite o <nav> encolher dentro do flex e
                virar área rolável de verdade; sem ele o conteúdo empurra o
                painel e o último item fica fora do alcance. A folga extra
                embaixo garante que ele não termine colado na borda. */}
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,var(--safe-b))]">
              {/* Início não mora em gaveta: ele é a porta, não um assunto. */}
              <ItemDoMenu
                to="/"
                label="Início"
                Icon={Icone.inicio}
                on={pathname === "/"}
                aoTocar={() => setAberto(false)}
              />

              {MENU.map(({ grupo, icone: IconeDoGrupo, itens }) => {
                const abertaEsta = gavetas.has(grupo);
                const id = `gaveta-${grupo.toLowerCase().replace(/[^a-z]/g, "")}`;
                return (
                  <section key={grupo} className="mt-3">
                    <h2>
                      <button
                        type="button"
                        onClick={() => alternar(grupo)}
                        aria-expanded={abertaEsta}
                        aria-controls={id}
                        className="tap flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:scale-[0.98] hover:bg-secondary/50"
                      >
                        <IconeDoGrupo
                          className={cn(
                            "h-5 w-5 shrink-0",
                            abertaEsta ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-bold",
                            abertaEsta && "text-primary",
                          )}
                        >
                          {grupo}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {itens.length}
                        </span>
                        {/* Uma seta só, girando: duas setas diferentes para o
                            mesmo botão fazem o olho reprocessar o ícone a cada
                            toque em vez de ler o movimento. */}
                        <Icone.expandir
                          aria-hidden
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            abertaEsta && "-rotate-180",
                          )}
                        />
                      </button>
                    </h2>

                    {/* `hidden`, e não desmontar: o conteúdo continua no
                        documento, então a busca do navegador acha, o leitor de
                        tela sabe que existe, e `aria-controls` aponta para algo
                        de verdade. */}
                    <ul id={id} hidden={!abertaEsta} className="pl-3">
                      {itens.map(({ to, label, icon: Icon }, i) => (
                        <li
                          key={to}
                          className="rise-in"
                          style={{ "--i": Math.min(i, 10) } as CSSProperties}
                        >
                          <ItemDoMenu
                            to={to}
                            label={label}
                            Icon={Icon}
                            on={ativo(to, to === "/dieta")}
                            aoTocar={() => setAberto(false)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ===== Barra inferior ===== */}
      <nav
        style={{ zIndex: "var(--z-nav)" }}
        className="fixed bottom-0 left-0 right-0 border-t border-border/60 bg-black/85 backdrop-blur-xl pb-[var(--safe-b)]"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-1 py-1">
          {ATALHOS.map(({ to, label, icon: Icon, exato }) => {
            const on = ativo(to, exato);
            return (
              <li key={to} className="min-w-0 flex-1">
                <Link
                  to={to}
                  className={cn(
                    "tap relative flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-xs font-semibold active:scale-95",
                    on ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      on && "drop-shadow-[0_0_10px_var(--primary)]",
                    )}
                  />
                  <span className="max-w-full truncate">{label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -top-px h-0.5 rounded-full bg-primary transition-[width,opacity] duration-300 ease-[var(--ease-out-expo)]",
                      on ? "w-8 opacity-100 shadow-[0_0_8px_var(--primary)]" : "w-0 opacity-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              ref={botaoMenu}
              onClick={() => setAberto(true)}
              aria-label="Abrir menu"
              aria-expanded={aberto}
              className={cn(
                "tap flex w-full flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-xs font-semibold active:scale-95",
                aberto ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icone.menu className={cn("h-5 w-5", aberto && "drop-shadow-[0_0_8px_var(--primary)]")} />
              <span>Menu</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

/**
 * Uma linha do menu. Sem moldura, sem brilho, sem crachá redondo em volta do
 * ícone — dezenove círculos empilhados eram metade do peso visual do painel e
 * não diziam nada que o ícone sozinho já não dissesse.
 */
function ItemDoMenu({
  to,
  label,
  Icon,
  on,
  aoTocar,
}: {
  to: string;
  label: string;
  Icon: LucideIcon;
  on: boolean;
  aoTocar: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={aoTocar}
      className={cn(
        "tap flex items-center gap-3 rounded-xl px-3 py-2.5 active:scale-[0.98]",
        on ? "bg-primary/10" : "hover:bg-secondary/50",
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", on ? "text-primary" : "text-muted-foreground")}
      />
      <span
        className={cn(
          "min-w-0 truncate text-sm",
          on ? "font-bold text-primary" : "text-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
