import {
  createFileRoute,
  Navigate,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CorDaFaixa } from "@/components/CorDaFaixa";
import { resolverUsuario } from "@/lib/sessao";
import { precisaResponderQuestionario } from "@/lib/questionario";
import { usePerfil } from "@/lib/bjj-storage";

/** A própria tela de boas-vindas não pode ser desviada para si mesma. */
const BOAS_VINDAS = "/boas-vindas";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // A regra inteira — inclusive o que fazer sem rede — vive em lib/sessao.ts,
    // onde dá para testá-la sem depender do formato interno de sessão do
    // supabase-js. Ver o comentário de resolverUsuario().
    const user = await resolverUsuario(supabase);
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: Autenticado,
});

function Autenticado() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  /**
   * O mesmo `usePerfil` que pinta a cor da faixa. Não é consulta nova: o
   * react-query serve as duas leituras da mesma entrada de cache.
   *
   * A checagem mora aqui, e não no `beforeLoad`, porque lá ela virava uma ida
   * ao servidor antes de CADA pintura — ver o comentário em lib/questionario.ts.
   */
  const { perfil } = usePerfil();

  if (
    pathname !== BOAS_VINDAS &&
    precisaResponderQuestionario(perfil?.questionarioEm)
  ) {
    return <Navigate to={BOAS_VINDAS} replace />;
  }

  return (
    <>
      {/* Pinta o app com a faixa da pessoa. Só existe dentro do autenticado:
          fora dele não há faixa para ler. */}
      <CorDaFaixa />
      <Outlet />
    </>
  );
}
