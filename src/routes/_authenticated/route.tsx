import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CorDaFaixa } from "@/components/CorDaFaixa";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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
