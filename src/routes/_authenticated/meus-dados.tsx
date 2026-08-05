import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Endereço antigo. O que morava aqui — exportar os dados e excluir a conta —
 * virou parte de Configurações, junto do resto da conta.
 *
 * A rota FICA, como desvio, por um motivo concreto: `/meus-dados` é o endereço
 * de exclusão que vai no formulário do Google Play, e link publicado em loja
 * não se apaga quando a gente reorganiza tela. Vinte gramas de código para não
 * quebrar uma URL que outra pessoa guardou.
 */
export const Route = createFileRoute("/_authenticated/meus-dados")({
  beforeLoad: () => {
    throw redirect({ to: "/configuracoes", replace: true });
  },
});
