/**
 * A chave que decide se dois nomes são a mesma técnica.
 *
 * Mora sozinha, sem importar nada, de propósito: é a gêmea em JavaScript da
 * `public.chave_da_tecnica` do banco, e o teste precisa carregá-la sem
 * arrastar o cliente do Supabase junto.
 *
 * ------------------------------------------------------------------
 * A MESMA REGRA EM DOIS LUGARES — E POR QUÊ
 * ------------------------------------------------------------------
 * O banco precisa dela para o índice único (é ele que impede a galeria de
 * virar depósito de "Armlock", "armlock" e "Triângulo" ao lado de
 * "Triangulo"). O cliente precisa dela para não OFERECER criar o que já
 * existe, antes de a viagem ao servidor acontecer.
 *
 * Duas cópias da mesma regra é dívida, e está anotada como tal: se
 * divergirem, o cliente acha que são duas técnicas e o banco acha que é uma.
 * O teste `verificar-tecnicas` roda a mesma lista de casos contra esta função
 * para prender exatamente isso.
 *
 * A do banco usa `translate()` com a tabela de acentos escrita à mão, porque
 * precisa ser IMMUTABLE para servir em índice. Esta usa `NFD` + corte dos
 * diacríticos, que cobre mais que a tabela — a diferença só apareceria em
 * letras fora do português, e nesse caso o banco é quem manda: ele deixa
 * passar como técnicas distintas, o que é o lado seguro do erro.
 */
export function chaveDaTecnica(nome: string): string {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
