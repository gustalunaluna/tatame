/**
 * Quem ainda não respondeu o questionário de boas-vindas.
 *
 * A verificação acontece na guarda de `_authenticated`, que roda a CADA
 * navegação dentro do app. Perguntar ao banco toda vez que a pessoa troca de
 * tela seria uma consulta por toque — por isso a resposta fica guardada em
 * memória depois da primeira vez.
 *
 * O cache é de módulo, ou seja, morre junto com a aba. Isso é de propósito:
 * ele não precisa sobreviver a um recarregamento, só evitar a consulta
 * repetida dentro da mesma sessão de uso.
 *
 * O cliente do Supabase entra por parâmetro em vez de ser importado aqui. Não
 * é cerimônia: é o que deixa esta regra ser testada em node, sem navegador e
 * sem subir um cliente de verdade — do mesmo jeito que lib/sessao.ts.
 */

/**
 * Como esta regra fala com o banco.
 *
 * É uma função, e não o cliente do Supabase, de propósito. Imitar a cadeia
 * `from().select().eq().maybeSingle()` num tipo estrutural obriga a reproduzir
 * o PostgrestBuilder inteiro — que é thenable, não Promise, e cuja genérica é
 * funda o bastante para o TypeScript desistir com "type instantiation is
 * excessively deep". Uma função com uma entrada e uma saída não tem esse
 * problema, e diz melhor o que a regra precisa: o carimbo de quando a pessoa
 * respondeu.
 */
export type BuscarQuestionario = (
  userId: string,
) => Promise<{ questionario_em: string | null } | null>;

/**
 * `true`  — já respondeu, não precisa perguntar de novo
 * `null`  — ainda não sabemos
 *
 * Só o "já respondeu" é memorizado. O contrário não pode ser: a pessoa
 * responde justamente durante a sessão, e guardar "não respondeu" a prenderia
 * na tela de boas-vindas até recarregar a página.
 */
let jaRespondeu: true | null = null;

/** Chamado pela tela de boas-vindas assim que as respostas são gravadas. */
export function marcarQueRespondeu() {
  jaRespondeu = true;
}

/** Chamado na saída: a próxima pessoa a entrar nesta aba é outra. */
export function limparMemoriaDoQuestionario() {
  jaRespondeu = null;
}

export async function faltaResponderQuestionario(
  buscar: BuscarQuestionario,
  userId: string,
): Promise<boolean> {
  if (jaRespondeu) return false;

  let perfil: { questionario_em: string | null } | null;

  try {
    perfil = await buscar(userId);
  } catch {
    /**
     * Sem rede a consulta falha, e aqui a resposta certa é "não falta".
     *
     * O contrário prenderia a pessoa offline: ela abre o app no vestiário, a
     * consulta não chega ao banco, e cai numa tela de boas-vindas cujo botão
     * "Começar" também não consegue gravar. Melhor deixar entrar — na próxima
     * vez que houver rede, a pergunta aparece.
     */
    return false;
  }

  // Perfil ainda não existe (conta recém-criada): é exatamente quem precisa
  // responder.
  if (!perfil) return true;

  if (perfil.questionario_em) {
    jaRespondeu = true;
    return false;
  }
  return true;
}
