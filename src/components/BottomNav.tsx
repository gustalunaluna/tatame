import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardList,
  Home,
  Menu,
  Dumbbell,
  FileText,
  TrendingUp,
  Trophy,
  User,
  Users,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cinco abas, agrupadas por assunto em vez de uma por funcionalidade.
 * Conquistas, Parceiros e Equipe deixaram de ser abas: viram caixas no
 * Perfil que abrem ao toque. Plano virou parte de Evolução, e Análises
 * ficam no Diário, junto dos treinos que as originaram.
 */
const ATALHOS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/diario", label: "Diário", icon: Dumbbell },
  { to: "/tecnicas", label: "Técnicas", icon: BookOpen },
  { to: "/metas", label: "Evolução", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

/** Tudo que existe, com o que cada tela realmente faz */
const MENU = [
  { to: "/", label: "Início", icon: Home,
    desc: "Como você está hoje: sequência, semana e o próximo passo" },
  { to: "/diario", label: "Diário", icon: Dumbbell,
    desc: "Registrar o treino de hoje e reler os anteriores" },
  { to: "/analises", label: "Análises", icon: FileText,
    desc: "A leitura do treinador sobre a sua evolução" },
  { to: "/tecnicas", label: "Técnicas", icon: BookOpen,
    desc: "Sua biblioteca de posições, com a nota de domínio de cada uma" },
  { to: "/metas", label: "Evolução", icon: TrendingUp,
    desc: "Aonde você quer chegar e como está o caminho" },
  { to: "/plano", label: "Plano do mês", icon: ClipboardList,
    desc: "Um objetivo, quatro semanas, para a sua faixa" },
  { to: "/perfil", label: "Perfil", icon: User,
    desc: "Seu cartão: faixa, equipe, mestre, parceiros e conquistas" },
  { to: "/parceiros", label: "Parceiros de rola", icon: Users,
    desc: "Quem treina com você e há quanto tempo" },
  { to: "/equipe", label: "Equipe", icon: Shield,
    desc: "Sua academia e quem treina nela" },
  { to: "/conquistas", label: "Conquistas", icon: Trophy,
    desc: "Da faixa branca à vermelha, o que você já desbloqueou" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);

  const ativo = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

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

  return (
    <>
      {/* ===== Menu lateral ===== */}
      {aberto && (
        <div className="fixed inset-0 h-dvh" style={{ zIndex: "var(--z-overlay)" }}>
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
            style={{ zIndex: "var(--z-panel)", paddingBottom: "var(--safe-b)" }}
            className="panel-in absolute bottom-0 right-0 top-0 flex w-[82%] min-w-[16rem] max-w-xs flex-col overflow-hidden border-l border-border/60 bg-card shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.8)]"
          >
            <div
              className="flex items-center justify-between border-b border-border/60 px-4 pb-4"
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
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain p-3">
              <ul className="space-y-1">
                {MENU.map(({ to, label, icon: Icon, desc }, i) => {
                  const on = ativo(to);
                  return (
                    <li key={to} className="rise-in" style={{ "--i": i } as CSSProperties}>
                      <Link
                        to={to}
                        onClick={() => setAberto(false)}
                        className={cn(
                          "tap flex items-center gap-3 rounded-2xl px-3 py-2.5 active:scale-[0.98]",
                          on
                            ? "border border-primary/50 bg-primary/10 shadow-[0_0_18px_-8px_var(--primary)]"
                            : "border border-transparent hover:bg-secondary/60",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                            on
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-bold",
                              on ? "text-primary" : "text-foreground",
                            )}
                          >
                            {label}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {desc}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
              <Menu className={cn("h-5 w-5", aberto && "drop-shadow-[0_0_8px_var(--primary)]")} />
              <span>Menu</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
