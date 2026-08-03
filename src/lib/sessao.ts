/**
 * Quem está logado, e o que fazer quando não dá para perguntar ao servidor.
 *
 * Isto morava dentro do `beforeLoad` da rota autenticada. Saiu de lá por um
 * motivo prático: a regra que importa só acontece SEM rede, e testar "sem
 * rede" através do navegador exige plantar uma sessão no formato interno do
 * supabase-js. A primeira tentativa de teste fez exatamente isso, passou com a
 * correção ligada E desligada, e teria entrado no repositório como rede de
 * proteção que não protege nada.
 *
 * Aqui a decisão é uma função com uma entrada e uma saída, e o teste consegue
 * perguntar direto: "o servidor não respondeu e existe sessão local — quem é o
 * usuário?".
 */

/** Só o que a guarda precisa saber. Não é o User inteiro do supabase-js. */
export interface UsuarioDaSessao {
  id: string;
}

export interface ClienteDeAuth {
  auth: {
    getUser: () => Promise<{
      data: { user: UsuarioDaSessao | null };
      error: unknown;
    }>;
    getSession: () => Promise<{
      data: { session: { user: UsuarioDaSessao } | null };
    }>;
  };
}

/**
 * Devolve o usuário da sessão, ou null se não há sessão utilizável.
 *
 * A ordem importa:
 *
 * 1. `getUser()` confere o token CONTRA O SERVIDOR. É a checagem certa quando
 *    há rede, e é a que se quer por padrão — um token revogado morre aqui.
 *
 * 2. Sem rede a checagem acima falha por não ter com quem falar, e o app
 *    expulsava para /auth quem estava perfeitamente logado. Era o pior
 *    desfecho possível: o service worker abria o app dentro da academia e a
 *    guarda mandava a pessoa para uma tela de login que também não funciona
 *    sem sinal.
 *
 *    `getSession()` lê a sessão já gravada no aparelho, sem pedir nada à rede.
 *    A diferença de segurança é real e aceita de propósito: offline, um token
 *    revogado ainda abre a INTERFACE. Ele não abre dado nenhum — toda leitura
 *    passa por RLS no servidor, e o que aparece offline é o cache do próprio
 *    dono do aparelho. Na primeira vez que houver rede, `getUser()` volta a
 *    mandar e a sessão revogada cai.
 */
export async function resolverUsuario(
  cliente: ClienteDeAuth,
): Promise<UsuarioDaSessao | null> {
  try {
    const { data, error } = await cliente.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // getUser() joga quando não há rede, em vez de devolver { error }.
    // Os dois caminhos levam ao mesmo lugar: tentar a sessão local.
  }

  try {
    const { data } = await cliente.auth.getSession();
    return data?.session?.user ?? null;
  } catch {
    return null;
  }
}
