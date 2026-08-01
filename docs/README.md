# Ponteira — Documentação de produto

> Documento vivo. Escrito para orientar quem projeta, quem programa e quem
> decide o que entra depois.

## Como ler este documento

Cada sistema aqui carrega um selo de estado. Ele não é enfeite — é o que
separa o que você pode abrir no app hoje do que ainda é aposta:

| Selo | Significa |
|---|---|
| **CONSTRUÍDO** | Está no app, com dados reais e teste automatizado. Descrito como é, não como gostaríamos. |
| **PARCIAL** | Existe, mas com buraco declarado. O buraco está escrito. |
| **PROPOSTO** | Não existe. É desenho, e pode estar errado. |

Um documento de produto que descreve tudo no presente do indicativo é um
documento em que ninguém confia depois da terceira seção. Aqui, se está escrito
CONSTRUÍDO, dá para abrir o app e ver.

## Índice

| # | Capítulo | Sobre |
|---|---|---|
| [01](01-visao-e-filosofia.md) | Visão e filosofia de design | O que o Ponteira é, para quem, e as sete regras que decidem discussão de design |
| [02](02-core-loop.md) | Core loop e sistema de sessões | O ciclo do praticante, do registro do treino ao retorno |
| [03](03-rolas-e-sinergia.md) | Rolas, parceiros e sinergia | A relação de dois, que é a unidade social real do jiu-jitsu |
| [04](04-progressao.md) | Progressão: horas, níveis, graduação | Mat time, level, faixa — e por que são três coisas diferentes |
| [05](05-conquistas-e-missoes.md) | Conquistas, coleções e missões | O que se desbloqueia, e o que se persegue |
| [06](06-academia-e-linhagem.md) | Academia, hierarquia e linhagem | Como uma academia de jiu-jitsu funciona de verdade, e como o app lê isso |
| [07](07-cronicas-e-social.md) | Crônicas do tatame, grupos e guildas | A memória compartilhada, e os grupos que a produzem |
| [08](08-titulos-e-cosmeticos.md) | Títulos, emblemas e cosméticos | O que se mostra, e o que não se compra |
| [09](09-economia.md) | Economia sem pay-to-win | O que pode ser vendido num app cuja moeda é respeito |
| [10](10-cultura-e-antitoxicidade.md) | Cultura e anti-toxicidade | As regras que impedem o app de virar ranking de ego |
| [11](11-retencao.md) | Retenção: o que roubar de Destiny, Strava, Duolingo, Pokémon GO e Steam | E, principalmente, o que não roubar |
| [12](12-fluxos-ux.md) | Fluxos completos de UX | Passo a passo das jornadas, com estados de erro e vazio |
| [13](13-telas.md) | Telas e wireframes | As 23 telas, o que cada uma resolve, e a anatomia delas |
| [14](14-dados.md) | Banco de dados (ERD) | As 21 tabelas, as decisões que as moldaram e as armadilhas |
| [15](15-api.md) | Estrutura de APIs | As 26 funções RPC, contratos e regras de acesso |
| [16](16-arquitetura.md) | Arquitetura técnica | Stack, build, orçamento de peso, testes, sistema de design |
| [17](17-casos-de-uso.md) | Casos de uso: aluno, professor, academia | Três pessoas diferentes, três apps diferentes |
| [18](18-roadmap.md) | Roadmap | Ordem de implementação, com o critério de corte |

## Estado geral, em uma tabela

| Sistema | Estado | Capítulo |
|---|---|---|
| Registro de treino e diário | CONSTRUÍDO | [02](02-core-loop.md) |
| Parceiros de rola e confirmação | CONSTRUÍDO | [03](03-rolas-e-sinergia.md) |
| Sinergia entre parceiros | PARCIAL | [03](03-rolas-e-sinergia.md) |
| Nível por horas de tatame | CONSTRUÍDO | [04](04-progressao.md) |
| Histórico de graduação | CONSTRUÍDO | [04](04-progressao.md) |
| Metas e rota de graduação | CONSTRUÍDO | [04](04-progressao.md) |
| Conquistas | CONSTRUÍDO | [05](05-conquistas-e-missoes.md) |
| Plano do mês | PARCIAL | [05](05-conquistas-e-missoes.md) |
| Missões | PROPOSTO | [05](05-conquistas-e-missoes.md) |
| Academia, papéis e hierarquia | CONSTRUÍDO | [06](06-academia-e-linhagem.md) |
| Linhagem | CONSTRUÍDO | [06](06-academia-e-linhagem.md) |
| Medalhas e campeonatos | CONSTRUÍDO | [05](05-conquistas-e-missoes.md) |
| Crônicas do tatame | PROPOSTO | [07](07-cronicas-e-social.md) |
| Grupos e guildas | PROPOSTO | [07](07-cronicas-e-social.md) |
| Títulos por faixa | CONSTRUÍDO | [08](08-titulos-e-cosmeticos.md) |
| Emblemas e cosméticos | PROPOSTO | [08](08-titulos-e-cosmeticos.md) |
| Economia | PROPOSTO | [09](09-economia.md) |
| Trilhas de aprendizado | PARCIAL | [05](05-conquistas-e-missoes.md) |
| Notificações | PROPOSTO | [11](11-retencao.md) |

Nove sistemas construídos, quatro parciais, seis propostos. Quem lê isto sabe
onde está pisando.
