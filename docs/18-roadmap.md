# 18 — Roadmap

## 18.1 O critério de corte

Cada item é julgado por três perguntas, nesta ordem:

1. **Quebra alguma das sete regras?** (capítulo 01) → não entra, ponto final.
2. **Quantas pessoas isso atinge, e com que frequência?** Um recurso que 100% usa
   toda semana ganha de um que 5% usa uma vez por ano.
3. **Custa mais construir ou mais conviver sem?** Notificação é cara e a ausência
   dela custa mais.

O que **não** é critério: novidade, paridade com concorrente, e "seria legal".

---

## 18.2 Fase 1 — Fechar o que já sangra

> Nada novo. Só o que está quebrado ou faltando dentro do que já foi prometido.

| # | Item | Por quê | Esforço |
|---|---|---|---|
| 1.1 | **Emblema de pendências no Menu** | Metade do problema de notificação, sem infraestrutura de push | P |
| 1.2 | **Conteúdo do plano: marrom e preta** | Hoje cai em roxa. Um praticante experiente percebe e fecha o app | M (conteúdo) |
| 1.3 | **Completar planos de branca e azul** | 6/14, 9/14, 9/14, 8/14 itens | M (conteúdo) |
| 1.4 | **Onboarding de 4 perguntas** | A primeira sessão não coleta nada. 25 perfis com `questionario_em` nulo | M |
| 1.5 | **Verificação de vínculo de mestre** | Hoje qualquer um se declara aluno de qualquer um | M |
| 1.6 | **Trava de faixa desigual no placar** | O cenário mais provável de constrangimento | P |
| 1.7 | **Canal de denúncia** | Um app sem isso assume que nada dá errado | P |

**Por que esta fase primeiro.** É a fase menos empolgante e a mais importante.
Construir sistema novo sobre buraco conhecido é como o produto acumula dívida que
depois ninguém paga. E o item 1.2 é conteúdo, não código — pode correr em
paralelo com tudo.

---

## 18.3 Fase 2 — O laço curto

> Fazer a pessoa saber que há algo esperando por ela.

| # | Item | Por quê | Esforço |
|---|---|---|---|
| 2.1 | **Push: confirmação pendente** | O prazo de 7 dias corre sem a pessoa saber | M |
| 2.2 | **Push: conquista aberta** (agrupada) | O laço longo nunca fecha visivelmente | P |
| 2.3 | **Pausa por lesão** | Protege quem está mais vulnerável ao app | P |
| 2.4 | **Service worker: registro offline** | Registrar no vestiário sem sinal é o caso mais comum | G |
| 2.5 | **Missões semanais** (3, sem punição) | Falta a camada de prazo curto | M |
| 2.6 | **A virada de segunda** | O ritual semanal, roubado do Destiny | M |

**O item 2.4 é o maior desta fase e o mais fácil de adiar por ser chato.** Ele não
deve ser adiado: um registro perdido por falta de sinal é a regra 7 sendo violada
da forma mais literal possível.

---

## 18.4 Fase 3 — O professor

> A lacuna de negócio. Hoje o professor está mal servido, e é quem paga.

| # | Item | Por quê | Esforço |
|---|---|---|---|
| 3.1 | **Painel de turma: quem sumiu** | A pergunta mais cara de uma academia. O dado já existe inteiro | M |
| 3.2 | **Perto de graduar** | Graduação é evento de retenção | M |
| 3.3 | **Linhagem descendente** | A mesma consulta invertida. Parte mais gratificante para quem ensina | P |
| 3.4 | **Professor registra a graduação** | Mais fiel à cerimônia, e resolve 1.5 de vez | M |
| 3.5 | **Aviso fixado no perfil da academia** | Comunicação sem virar chat | P |
| 3.6 | **Registro de aula pelo professor** | Um registro que vale para trinta | G |
| 3.7 | **Consentimento explícito de visibilidade** | O 3.1 expõe frequência. Precisa ser dito na entrada | P |

**3.7 não é opcional e não vem depois.** Ele entra junto com 3.1 ou o painel não
sai.

---

## 18.5 Fase 4 — Profundidade

> O que faz alguém ficar dois anos em vez de dois meses.

| # | Item | Esforço |
|---|---|---|
| 4.1 | **Crônicas do tatame** | M |
| 4.2 | **Cartão do treino** (a peça do Strava) | M |
| 4.3 | **Coleções de conquistas** | M |
| 4.4 | **Emblemas escolhidos** (até 3, espelhando medalhas) | P |
| 4.5 | **Trilhas com grafo de dependência** | G (conteúdo) |
| 4.6 | **Sinergia como frase, não estatística** | M |
| 4.7 | **A cerimônia de graduação** | M |
| 4.8 | **Grupos** | G |

---

## 18.6 Fase 5 — Sustentar

> Só depois que o resto entrega o que promete.

| # | Item |
|---|---|
| 5.1 | Assinatura de academia (o painel da fase 3 como produto) |
| 5.2 | Filiais: matriz e rede |
| 5.3 | Delegação: professor aprova aluno da turma dele |
| 5.4 | Exportação (PDF, dados brutos) |
| 5.5 | Assinatura individual — **talvez** |

**A ordem importa.** Cobrar exige que o produto já entregue. Vender assinatura em
cima dos buracos da fase 1 queimaria a primeira leva de usuários — que num nicho é
a única que importa, porque é ela que traz a segunda.

E dentro da fase 5, a academia vem antes do praticante: ela tem receita, o
problema dela custa dinheiro, e o retorno é mensurável em aluno retido.

---

## 18.7 O que fica de fora, e por quê

| Ideia | Por quê não |
|---|---|
| Vídeo de técnica | Caro de hospedar, mais caro de moderar, mercado já resolvido |
| Chat | Exige moderação 24h e vira outro produto. O WhatsApp da academia já existe |
| Ranking global | Regra 4 |
| Feed infinito | Um app de treino que consome 20 min de rolagem rouba o tempo do tatame |
| Moeda virtual | Não há economia interna. Só serviria para criar loop de gasto artificial |
| IA que sugere graduação | Regra 1. Destruiria a confiança em um mês |
| Comparação com "usuários como você" | Regra 4 |
| Integração com wearable | Jiu-jitsu não é medido por batimento. O dado não diz nada útil aqui |

---

## 18.8 Débito técnico rastreado

| Débito | Impacto | Onde |
|---|---|---|
| Sem service worker | Alto | [16](16-arquitetura.md) |
| Sem monitoramento de erro em produção | Alto | [16](16-arquitetura.md) |
| Sem versionamento de contrato de RPC | Médio | [15](15-api.md) |
| Paginação por offset, não cursor | Baixo hoje | [15](15-api.md) |
| `master` (texto) coexiste com `master_links` | Baixo — declarado | [06](06-academia-e-linhagem.md) |
| `fixtures/` regenerado à mão | Baixo | [16](16-arquitetura.md) |

### Duas dívidas de segurança pendentes, do lado do dono

1. **Proteção contra senha vazada** não está habilitada no painel do Supabase
2. **Duas chaves secretas passaram por conversa e precisam ser rotacionadas** — a
   `service_role` e a `sb_secret_*`. Ambas ignoram RLS inteiramente. Rotacionar e
   habilitar 2FA.

Nenhuma das duas é código; as duas são bloqueantes para qualquer lançamento.

---

## 18.9 Como manter este documento

Uma regra só: **quando um sistema muda de estado, o selo muda no mesmo commit.**

Um documento que descreve como as coisas eram há três meses é pior que documento
nenhum, porque as pessoas confiam nele.
