import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CorDaFaixa } from "@/components/CorDaFaixa";
import { resolverUsuario } from "@/lib/sessao";
import { faltaResponderQuestionario } from "@/lib/questionario";

/** A própria tela de boas-vindas não pode ser desviada para si mesma. */
const BOAS_VINDAS = "/boas-vindas";

/**
 * O acesso ao banco fica aqui, e a REGRA fica em lib/questionario.ts. É essa
 * separação que deixa a regra ser testada em node, sem cliente de verdade.
 *
 * `maybeSingle()` devolve `{ data, error }` em vez de jogar; o `throw` traduz
 * a falha de rede para a forma que a regra espera.
 */
const buscarQuestionario = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("questionario_em")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // A regra inteira — inclusive o que fazer sem rede — vive em lib/sessao.ts,
    // onde dá para testá-la sem depender do formato interno de sessão do
    // supabase-js. Ver o comentário de resolverUsuario().
    const user = await resolverUsuario(supabase);
    if (!user) throw redirect({ to: "/auth" });

    /**
     * Quem nunca respondeu o questionário vai para ele antes de qualquer outra
     * tela. Vale para qualquer rota, não só para o Início: sem isto, um link
     * direto para /diario pularia a pergunta e a pessoa seguiria sendo tratada
     * como branca 0 grau pelo hexágono e pelo plano.
     *
     * A consulta é memorizada por aba — ver lib/questionario.ts.
     */
    if (
      location.pathname !== BOAS_VINDAS &&
      (await faltaResponderQuestionario(buscarQuestionario, user.id))
    ) {
      throw redirect({ to: BOAS_VINDAS });
    }

    return { user };
  },
  component: () => (
    <>
      {/* Pinta o app com a faixa da pessoa. Só existe dentro do autenticado:
          fora dele não há faixa para ler. */}
      <CorDaFaixa />
      <Outlet />
    </>
  ),
});
