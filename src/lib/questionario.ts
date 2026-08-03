/**
 * Quem ainda precisa responder o questionário de boas-vindas.
 *
 * A primeira versão disto consultava o banco dentro do `beforeLoad` da rota
 * autenticada. Funcionava, e estava errada por dois motivos: era uma consulta
 * a CADA navegação, e era uma ida ao servidor ANTES da primeira pintura — o
 * app passou a mostrar "Carregando…" em toda troca de tela, e treze suítes que
 * esperavam a tela pintar começaram a estourar o tempo.
 *
 * O perfil já é lido em toda página autenticada, por `usePerfil`, para pintar
 * o app com a cor da faixa. A resposta que interessa está nessa mesma linha:
 * perguntar de novo era pagar duas vezes pela mesma informação.
 *
 * O que sobrou aqui é a regra, e só ela — que é o que vale a pena testar.
 */

/**
 * Decide pela presença do carimbo, e trata os três estados como coisas
 * diferentes de propósito:
 *
 * `undefined` — ainda não há linha de perfil. Acontece no intervalo entre
 *               criar a conta e `ensureSeeded` inserir a linha. Não é "nunca
 *               respondeu", é "ainda não dá para saber" — e mandar para as
 *               boas-vindas aqui seria decidir sem informação. A linha aparece
 *               logo em seguida, e aí a pergunta é feita.
 * `null`      — a linha existe e o carimbo está vazio: nunca respondeu.
 * `string`    — respondeu, e esta é a data.
 */
export function precisaResponderQuestionario(
  questionarioEm: string | null | undefined,
): boolean {
  return questionarioEm === null;
}
