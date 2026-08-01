# 09 — Economia sem pay-to-win

**Estado: PROPOSTO.** Não há cobrança de nenhum tipo hoje.

## 9.1 O que "pay-to-win" significa aqui

Num jogo, pay-to-win é pagar por vantagem competitiva. No Ponteira não há
competição dentro do app (regra 4), então a tradução precisa ser outra.

**Pay-to-win no Ponteira seria pagar por qualquer coisa que sugira mérito não
conquistado.** Um emblema comprado, um selo comprado, um destaque comprado no
perfil de uma academia. Qualquer uma dessas coisas mata o produto, porque a única
coisa que ele vende de verdade é *acreditar no que está escrito*.

## 9.2 A linha divisória

| Pode ser vendido | Não pode ser vendido |
|---|---|
| **Capacidade** — mais histórico, mais exportação, mais armazenamento | **Mérito** — emblema, selo, título, conquista |
| **Ferramenta de gestão** — o que a academia precisa para administrar | **Visibilidade** — aparecer antes na busca, no topo de alguma lista |
| **Conteúdo curado** — planos, trilhas, material escrito | **Aparência que sugere habilidade** |
| **Conveniência** — exportar PDF, integrar com outro app | **Remoção de limite social** — mais parceiros, mais academias |

A linha é: **pagar acelera o que você já faz; nunca inventa o que você é.**

## 9.3 O modelo proposto

### Camada 1 — Gratuito, para sempre

Tudo que é o núcleo do produto:

- Registro de treino ilimitado
- Diário completo, sem corte de histórico
- Parceiros, rolas, placar, confirmação
- Nível, sequência, conquistas (todas as 1.006)
- Graduações e linhagem
- Medalhas
- Perfil público
- Entrar em academia

**Por que tão generoso.** Um diário de treino com limite de histórico é inútil —
o valor inteiro dele está em ser longo. Cortar o histórico no plano gratuito
destruiria a proposta antes de qualquer um chegar ao plano pago. E um app de
nicho precisa de densidade de usuários para que a camada social funcione: um
parceiro que não pode confirmar sua rola porque está no plano grátis quebra o
recurso para os dois.

### Camada 2 — Praticante (assinatura individual)

| Recurso | Por quê é justo cobrar |
|---|---|
| **Análises aprofundadas** | Custo computacional real, valor claro |
| **Planos e trilhas completos** | É conteúdo curado — alguém escreveu |
| **Exportação** (PDF do histórico, dados brutos) | Conveniência, não mérito |
| **Comparação temporal detalhada** | "Este semestre contra o anterior", por técnica |
| **Backup e sincronização multi-dispositivo** | Custo de infraestrutura |

**Preço-âncora proposto:** abaixo de uma aula avulsa de jiu-jitsu. É a referência
que o público tem, e é a única que importa.

### Camada 3 — Academia (assinatura institucional)

Este é o modelo que sustenta o produto, e é onde a disposição a pagar existe de
verdade — porque a academia tem receita e o problema dela custa dinheiro.

| Recurso | O problema que resolve |
|---|---|
| **Painel de turma** | "Quem sumiu?" — a pergunta mais cara de uma academia |
| **Alunos perto de graduar** | Graduação é evento de retenção; perder o momento custa aluno |
| **Frequência agregada** | Saber se a turma das 6h está esvaziando antes que esvazie |
| **Registro de aula pelo professor** | Um registro que vale para trinta alunos |
| **Mural da casa** | Medalhas, graduações, marcos — já parcialmente construído |
| **Brasão e página pública** | Já construído |

**Por que a academia paga e o aluno talvez não.** Evasão é o custo número um de
uma academia de artes marciais. Um painel que diz "estas nove pessoas não
aparecem há três semanas" se paga com um aluno retido. Nenhum recurso individual
tem esse retorno mensurável.

## 9.4 O que nunca terá

**Anúncio.** Um app aberto trinta segundos no vestiário não tem inventário
publicitário que valha o custo de credibilidade.

**Moeda virtual.** Não há economia interna, então não há o que comprar. Moeda
virtual num app de registro pessoal só serve para criar loop de gasto artificial.

**Caixa de recompensa.** Óbvio, mas vale escrever.

**Venda de dado.** O conteúdo do app é o histórico corporal e social de uma
pessoa: com quem ela treina, quando, quanto, e quem a gradua. Isso não é
vendável, e a estrutura de permissões do banco (capítulo 15) já é construída em
cima disso.

**Assinatura que apaga dado ao cancelar.** Cancelar volta para o gratuito, e o
gratuito guarda tudo. Um diário que se apaga quando você para de pagar é uma
ameaça, não um produto.

## 9.5 Ordem de implementação

O modelo acima **não deve ser construído tão cedo**, e vale registrar por quê.

Cobrar exige que o produto já entregue o que promete. Hoje há buracos que
importam mais: plano de faixa marrom e preta não existe, não há notificação, não
há painel de academia, não há verificação de vínculo de mestre. Vender assinatura
em cima disso queimaria a primeira leva de usuários — que num nicho é a única que
importa, porque é ela que traz a segunda.

**Sequência proposta:** fechar os buracos → construir o painel de academia →
cobrar da academia → só depois, talvez, do praticante.

Ver capítulo 18.
