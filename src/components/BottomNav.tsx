import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardList,
  Home,
  Target,
  Dumbbell,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/diario", label: "Diário", icon: Dumbbell },
  { to: "/tecnicas", label: "Técnicas", icon: BookOpen },
  { to: "/analises", label: "Análises", icon: TrendingUp },
  { to: "/plano", label: "Plano", icon: ClipboardList },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/conquistas", label: "Conquistas", icon: Trophy },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-black/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1 py-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1 min-w-0">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    active && "drop-shadow-[0_0_8px_var(--primary)]",
                  )}
                />
                <span className="truncate max-w-full">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
