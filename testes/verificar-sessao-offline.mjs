/**
 * A guarda de sessão e o questionário, com e sem rede.
 *
 * Por que este teste não usa navegador: a primeira versão usava, e plantava
 * uma sessão no localStorage no formato interno do supabase-js. Ela passava com
 * a correção LIGADA e DESLIGADA — porque a sessão plantada nunca era aceita e
 * o caminho que interessa jamais rodava. Um teste verde que não exercita a
 * regra é pior que teste nenhum: dá confiança falsa.
 *
 * Aqui a pergunta é feita direto às funções que decidem, com clientes de
 * mentira que reproduzem os estados que existem de verdade.
 */
import { resolverUsuario } from "../src/lib/sessao.ts";
import {
  faltaResponderQuestionario,
  limparMemoriaDoQuestionario,
  marcarQueRespondeu,
} from "../src/lib/questionario.ts";

const falhas = [];
const ok = [];

function conferir(nome, condicao, detalhe = "") {
  if (condicao) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

const EU = { id: "00000000-0000-0000-0000-000000000001" };

/* ====================== a guarda de sessão =============================== */

/** Servidor responde e confirma quem eu sou. */
const comRede = {
  auth: {
    getUser: async () => ({ data: { user: EU }, error: null }),
    getSession: async () => ({ data: { session: { user: EU } } }),
  },
};

/** Sem rede, supabase-js devolve erro — e existe sessão gravada no aparelho. */
const semRedeComSessao = {
  auth: {
    getUser: async () => ({
      data: { user: null },
      error: { message: "Failed to fetch" },
    }),
    getSession: async () => ({ data: { session: { user: EU } } }),
  },
};

/** Sem rede e sem sessão: ninguém nunca entrou neste aparelho. */
const semRedeSemSessao = {
  auth: {
    getUser: async () => ({
      data: { user: null },
      error: { message: "Failed to fetch" },
    }),
    getSession: async () => ({ data: { session: null } }),
  },
};

/** getUser() JOGA em vez de devolver erro — acontece com fetch abortado. */
const queJoga = {
  auth: {
    getUser: async () => {
      throw new TypeError("Failed to fetch");
    },
    getSession: async () => ({ data: { session: { user: EU } } }),
  },
};

/** Servidor responde que o token não vale mais. Com rede, isso é definitivo. */
const tokenRevogado = {
  auth: {
    getUser: async () => ({
      data: { user: null },
      error: { message: "invalid JWT" },
    }),
    getSession: async () => ({ data: { session: null } }),
  },
};

conferir(
  "com rede, quem está logado entra",
  (await resolverUsuario(comRede))?.id === EU.id,
);

// Esta é A conferência. Sem ela, o service worker abre o app dentro da
// academia e a guarda expulsa a pessoa para uma tela de login que também não
// funciona sem sinal.
conferir(
  "sem rede, a sessão gravada no aparelho vale",
  (await resolverUsuario(semRedeComSessao))?.id === EU.id,
);

conferir(
  "sem rede e sem sessão, ninguém entra",
  (await resolverUsuario(semRedeSemSessao)) === null,
);

conferir(
  "getUser() que joga não derruba a guarda",
  (await resolverUsuario(queJoga))?.id === EU.id,
);

conferir(
  "token revogado com rede não entra",
  (await resolverUsuario(tokenRevogado)) === null,
);

/* ====================== o questionário =================================== */

const nuncaRespondeu = async () => ({ questionario_em: null });
const jaRespondeu = async () => ({ questionario_em: "2026-08-01T10:00:00Z" });
const semPerfilAinda = async () => null;
const semRede = async () => {
  throw new TypeError("Failed to fetch");
};

limparMemoriaDoQuestionario();
conferir(
  "quem nunca respondeu vai para as boas-vindas",
  (await faltaResponderQuestionario(nuncaRespondeu, EU.id)) === true,
);

limparMemoriaDoQuestionario();
conferir(
  "conta nova, sem linha de perfil, também vai",
  (await faltaResponderQuestionario(semPerfilAinda, EU.id)) === true,
);

limparMemoriaDoQuestionario();
conferir(
  "quem já respondeu não é mandado de novo",
  (await faltaResponderQuestionario(jaRespondeu, EU.id)) === false,
);

// Sem rede a consulta falha. Mandar para as boas-vindas aqui prenderia a
// pessoa numa tela cujo botão "Começar" também não consegue gravar.
limparMemoriaDoQuestionario();
conferir(
  "sem rede, ninguém fica preso nas boas-vindas",
  (await faltaResponderQuestionario(semRede, EU.id)) === false,
);

// Depois de responder, a guarda não pode continuar mandando de volta — e não
// pode consultar o banco a cada navegação.
limparMemoriaDoQuestionario();
marcarQueRespondeu();
let consultas = 0;
const contando = async () => {
  consultas++;
  return { questionario_em: null };
};
const depoisDeResponder = await faltaResponderQuestionario(contando, EU.id);
conferir(
  "quem acabou de responder não volta para as boas-vindas",
  depoisDeResponder === false,
);
conferir(
  "e a guarda não consulta o banco de novo",
  consultas === 0,
  `${consultas} consultas`,
);

// A memória é da aba, não da conta: quem sai e entra com outra conta na mesma
// aba tem que ser perguntado.
limparMemoriaDoQuestionario();
conferir(
  "depois de sair, a pergunta volta a valer",
  (await faltaResponderQuestionario(nuncaRespondeu, EU.id)) === true,
);

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
