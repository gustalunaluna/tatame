import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Icone } from "@/design/icones";
import { cn } from "@/lib/utils";

/**
 * Cinco abas, agrupadas por assunto em vez de uma por funcionalidade.
 * Conquistas, Parceiros e Equipe deixaram de ser abas: viram caixas no
 * Perfil que abrem ao toque. Plano virou parte de Evolução, e Análises
 * ficam no Diário, junto dos treinos que as originaram.
 */
const ATALHOS = [
  { to: "/", label: "Início", icon: Icone.inicio },
  { to: "/diario", label: "Diário", icon: Icone.treino },
  { to: "/tecnicas", label: "Técnicas", icon: Icone.tecnica },
  { to: "/metas", label: "Evolução", icon: Icone.evolucao },
  { to: "/perfil", label: "Perfil", icon: Icone.perfil },
] as const;

/**
 * Tudo que existe, agrupado por assunto.
 *
 * Antes era uma lista plana de onze itens, cada um com título em negrito e uma
 * frase de apoio embaixo. Na largura de um celular a frase não cabia: oito dos
 * onze terminavam em reticências, virando meia-frase — espaço gasto sem
 * informar nada. E onze linhas seguidas sem hierarquia nenhuma dão o mesmo
 * trabalho de leitura que uma lista de compras.
 *
 * O título do grupo faz o serviço que a frase tentava fazer, e faz melhor:
 * "Evolução" e "Plano do mês" não se distinguiam sozinhos, mas debaixo de
 * PROGRESSO os dois se explicam.
 */
const MENU = [
  {
    grupo: "Treino",
    itens: [
      { to: "/", label: "Início", icon: Icone.inicio },
      { to: "/diario", label: "Diário", icon: Icone.treino },
      { to: "/tecnicas", label: "Técnicas", icon: Icone.tecnica },
      { to: "/analises", label: "Análises", icon: Icone.analise },
    ],
  },
  {
    grupo: "Progresso",
    itens: [
      { to: "/metas", label: "Evolução", icon: Icone.evolucao },
      { to: "/plano", label: "Plano do mês", icon: Icone.listaDeTecnicas },
      { to: "/conquistas", label: "Conquistas", icon: Icone.conquista },
    ],
  },
  {
    grupo: "Pessoas",
    itens: [
      { to: "/perfil", label: "Perfil", icon: Icone.perfil },
      { to: "/parceiros", label: "Parceiros de rola", icon: Icone.parceiro },
      { to: "/equipe", label: "Equipe", icon: Icone.equipe },
      { to: "/meus-mestres", label: "Mestres e linhagem", icon: Icone.graduacao },
    ],
  },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);

  const ativo = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  // Fora da sessão não há para onde navegar. A barra aparecia na tela de
  // entrada, cobrindo o botão de criar conta e oferecendo seis telas que
  // devolviam a pessoa para cá.
  //
  // O mesmo vale para as boas-vindas: a guarda devolve para lá quem ainda não
  // respondeu, então cada atalho da barra viraria um caminho que não leva a
  // lugar nenhum — e o botão "Começar" fica logo embaixo dela.
  const foraDaSessao =
    pathname.startsWith("/auth") || pathname.startsWith("/boas-vindas");

  // Fecha ao trocar de tela
  useEffect(() => setAberto(false), [pathname]);

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
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
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
              {MENU.map(({ grupo, itens }, g) => (
                <section key={grupo} className={g > 0 ? "mt-5" : ""}>
                  <h2 className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {grupo}
                  </h2>
                  <ul>
                    {itens.map(({ to, label, icon: Icon }, i) => {
                      const on = ativo(to);
                      return (
                        <li
                          key={to}
                          className="rise-in"
                          style={{ "--i": Math.min(g * 4 + i, 10) } as CSSProperties}
                        >
                          <Link
                            to={to}
                            onClick={() => setAberto(false)}
                            className={cn(
                              // Sem moldura, sem brilho, sem crachá redondo em
                              // volta do ícone. Onze círculos empilhados eram
                              // metade do peso visual do menu, e não diziam nada
                              // que o ícone sozinho já não dissesse.
                              "tap flex items-center gap-3 rounded-xl px-3 py-2.5 active:scale-[0.98]",
                              on ? "bg-primary/10" : "hover:bg-secondary/50",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5 shrink-0",
                                on ? "text-primary" : "text-muted-foreground",
                              )}
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
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
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
          {ATALHOS.map(({ to, label, icon: Icon }) => {
            const on = ativo(to);
            return (
              <li key={to} className="min-w-0 flex-1">
                <Link
                  to={to}
                  className={cn(
                    "tap relative flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-semibold active:scale-95",
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
                "tap flex w-full flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-semibold active:scale-95",
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
