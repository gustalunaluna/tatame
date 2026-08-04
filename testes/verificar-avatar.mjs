/**
 * O avatar do atleta.
 *
 * O que este teste prende, e por quê:
 *
 *   1. `lerAvatar` nunca devolve lixo. A coluna é jsonb sem validação no
 *      banco, então quem valida é a leitura. Um estilo de cabelo aposentado,
 *      um índice fora da faixa ou um valor de outro tipo têm que virar o
 *      padrão — nunca quebrar a tela de quem tinha o antigo.
 *
 *   2. o sorteio é ESTÁVEL. Quem nunca abriu o editor recebe um retrato
 *      derivado do próprio identificador; se ele mudasse a cada carregamento,
 *      a mesma pessoa apareceria diferente em duas telas do mesmo app.
 *
 *   3. o sorteio VARIA entre pessoas. Uma lista de sessenta alunos com
 *      sessenta bonecos idênticos não ajuda ninguém a reconhecer ninguém — é
 *      exatamente o problema que o avatar existe para resolver.
 *
 *   4. a FAIXA NÃO ESTÁ no avatar. É a regra que sustenta o resto do produto:
 *      o app não gradua ninguém, e um seletor de faixa no retrato seria o
 *      único lugar onde a graduação vira escolha. Se alguém acrescentar o
 *      campo um dia, este teste reprova.
 */
import {
  AVATAR_PADRAO,
  avatarSorteado,
  lerAvatar,
  ESTILOS_DE_CABELO,
  PELES,
} from "../src/design/avatar.ts";

const falhas = [];
const ok = [];
const conferir = (nome, cond, detalhe = "") => {
  if (cond) ok.push(nome);
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

/* --- 1. leitura defensiva ------------------------------------------------ */

conferir("nulo vira o padrão", lerAvatar(null).cabelo === AVATAR_PADRAO.cabelo);
conferir("objeto vazio vira o padrão", lerAvatar({}).pele === AVATAR_PADRAO.pele);

conferir(
  "estilo de cabelo que não existe mais cai no padrão",
  lerAvatar({ cabelo: "moicano-de-2019" }).cabelo === AVATAR_PADRAO.cabelo,
);
conferir(
  "índice de pele fora da faixa cai no padrão",
  lerAvatar({ pele: 99 }).pele === AVATAR_PADRAO.pele &&
    lerAvatar({ pele: -1 }).pele === AVATAR_PADRAO.pele,
);
conferir(
  "índice de pele quebrado cai no padrão",
  lerAvatar({ pele: 1.5 }).pele === AVATAR_PADRAO.pele &&
    lerAvatar({ pele: "2" }).pele === AVATAR_PADRAO.pele,
);
conferir(
  "valor válido é preservado",
  lerAvatar({ pele: 4, cabelo: "coque", kimono: "preto" }).pele === 4 &&
    lerAvatar({ cabelo: "coque" }).cabelo === "coque" &&
    lerAvatar({ kimono: "preto" }).kimono === "preto",
);
conferir(
  "patches sempre vêm em dois, mesmo se o banco mandar outra coisa",
  lerAvatar({ patches: "nada" }).patches.length === 2 &&
    lerAvatar({ patches: ["brasil"] }).patches.length === 2 &&
    lerAvatar({ patches: ["brasil", "inexistente", "sobra"] }).patches[1] === "nenhum",
);
conferir(
  "kimono fora das três cores da IBJJF cai no padrão",
  lerAvatar({ kimono: "rosa" }).kimono === AVATAR_PADRAO.kimono,
);

/* --- 2 e 3. o sorteio ---------------------------------------------------- */

const a1 = avatarSorteado("gustavo");
const a2 = avatarSorteado("gustavo");
conferir(
  "o mesmo identificador dá sempre o mesmo retrato",
  JSON.stringify(a1) === JSON.stringify(a2),
);

const pessoas = Array.from({ length: 60 }, (_, i) => avatarSorteado(`aluno${i}`));
const distintos = new Set(pessoas.map((p) => JSON.stringify(p))).size;
conferir(
  "sessenta pessoas não viram sessenta bonecos iguais",
  distintos > 20,
  `${distintos} retratos distintos em 60`,
);

// Todo sorteio precisa passar pela validação sem cair no padrão por acidente.
const todosValidos = pessoas.every(
  (p) =>
    p.pele >= 0 &&
    p.pele < PELES.length &&
    ESTILOS_DE_CABELO.some((e) => e.id === p.cabelo),
);
conferir("todo retrato sorteado é válido", todosValidos);

const comBarba = pessoas.filter((p) => p.barba !== "nenhuma").length;
conferir(
  "barba é minoria, como numa academia de verdade",
  comBarba > 0 && comBarba < pessoas.length / 2,
  `${comBarba} de 60`,
);

/* --- 4. a faixa não é escolha do avatar ---------------------------------- */

const campos = Object.keys(lerAvatar({}));
conferir(
  "o avatar não guarda faixa",
  !campos.some((c) => /faixa|belt|grau|degree/i.test(c)),
  campos.join(", "),
);
conferir(
  "e não aceita faixa nem se o banco mandar",
  !("belt" in lerAvatar({ belt: "Preta" })) &&
    !("faixa" in lerAvatar({ faixa: "Preta" })),
);

console.log(ok.map((o) => `  ok   ${o}`).join("\n"));
if (falhas.length) {
  console.error("\n" + falhas.map((f) => `  FALHOU  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\n${ok.length} conferências, todas passaram.`);
