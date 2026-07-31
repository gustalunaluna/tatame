import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipoSelo = "mestre" | "aluno" | "equipe";

/**
 * O que cada selo quer dizer — e quem o concedeu. São coisas diferentes e o
 * texto de acessibilidade precisa deixar isso claro, senão o símbolo vira
 * enfeite sem significado.
 */
const SELOS: Record<TipoSelo, { rotulo: string; cor: string }> = {
  mestre: { rotulo: "Faixa preta verificada", cor: "text-primary" },
  aluno: { rotulo: "Aluno confirmado pela equipe", cor: "text-sky-400" },
  equipe: { rotulo: "Equipe oficial", cor: "text-primary" },
};

export function SeloVerificado({
  tipo,
  className,
}: {
  tipo: TipoSelo;
  className?: string;
}) {
  const { rotulo, cor } = SELOS[tipo];
  const Icone = tipo === "equipe" ? ShieldCheck : BadgeCheck;
  return (
    <span title={rotulo} className={cn("inline-flex shrink-0", cor, className)}>
      <Icone className="h-full w-full" aria-hidden="true" />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/**
 * O selo certo para uma pessoa: mestre ganha o dele; quem não é mestre mas
 * tem equipe oficial ganha o de aluno; o resto não ganha nada.
 */
export function SeloDaPessoa({
  verificado,
  equipeOficial,
  className,
}: {
  verificado?: boolean;
  equipeOficial?: boolean;
  className?: string;
}) {
  if (verificado) return <SeloVerificado tipo="mestre" className={className} />;
  if (equipeOficial) return <SeloVerificado tipo="aluno" className={className} />;
  return null;
}
