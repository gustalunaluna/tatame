# 12 — Fluxos completos de UX

Cada fluxo aqui traz o caminho feliz, os estados de erro e o estado vazio. O
estado vazio é a parte mais negligenciada e a mais importante: é o que a pessoa
vê no primeiro dia, quando ainda não decidiu se fica.

---

## 12.1 Primeira sessão

**Estado: PARCIAL.** A entrada existe; o onboarding não.

### Caminho atual

```
  /auth  ─── "Entrar" ──▶ e-mail + senha ──▶  /  (Início)
     │
     └───── "Criar minha conta" ──▶ e-mail + senha ──▶  /  (Início)
```

A tela de entrada abre com a marca — a faixa desenhada, o nome, a escada da
branca à preta — e só depois o convite. Os campos aparecem quando a pessoa pede.
Pedir e-mail e senha de cara é o jeito mais rápido de transformar uma tela bonita
num pedágio.

### O buraco

Quem cria conta cai no Início com faixa Branca, zero treinos, zero tudo. Não há
pergunta nenhuma. 25 perfis no banco têm `questionario_em` nulo.

### Onboarding proposto

Quatro perguntas, todas puláveis, cada uma em uma tela:

```
  1. Qual sua faixa?          [escada visual de faixas + graus]
  2. Há quanto tempo treina?  [< 1 ano | 1-3 | 3-5 | 5+]
  3. Quantas vezes por semana? [1 | 2 | 3 | 4 | 5+]
  4. Sua academia?             [busca, ou pular]
```

**Por que essas quatro.** Cada uma destrava algo imediatamente:

| Pergunta | Destrava |
|---|---|
| Faixa | A cor do app inteiro (regra 3) — o momento mais forte da primeira sessão |
| Tempo de treino | Estimativa inicial de nível, para o app não começar em zero absoluto |
| Frequência | O alvo das missões (capítulo 05) e o horário do lembrete |
| Academia | O social inteiro |

**Regra:** pular tudo tem que produzir um app funcional. Quem pula vê exatamente
o que vê hoje.

### Estados de erro

| Erro | Mensagem |
|---|---|
| E-mail já cadastrado | "Esse e-mail já tem conta. Quer entrar?" com o botão pronto |
| Senha curta | Validação em linha, antes de enviar (`minLength={6}`) |
| Sem rede | "Sem conexão. Seu treino fica guardado e sobe quando voltar." |

---

## 12.2 Registrar um treino

**Estado: CONSTRUÍDO.**

```
   Diário
     │
     ├─ [Novo treino] ──▶ Dialog
     │                      │
     │                      ├─ Data      (hoje, pré-preenchida)
     │                      ├─ Tipo      (Gi | No-Gi, Gi padrão)
     │                      ├─ Duração   (obrigatória)
     │                      │
     │                      ├─ ▼ opcional
     │                      │   ├─ Rolas
     │                      │   ├─ Técnicas
     │                      │   ├─ Observações
     │                      │   └─ Parceiros ──▶ busca @ ──▶ placar
     │                      │
     │                      └─ [Salvar] ──▶ toast + volta ao Diário
     │
     └─ lista, filtrável por mês
```

### O que acontece depois do Salvar

```
  trainings.insert
        │
        ├──▶ training_partners.insert (se houver)  ──▶ pendente para o parceiro
        │
        ├──▶ recalcular_conquistas()  ──▶ conquista abre? toast
        │
        ├──▶ nível recalculado (minutos totais)
        │
        └──▶ sequência atualizada
```

### Estados vazios

| Tela | Vazio |
|---|---|
| Diário sem treinos | "Nenhum treino ainda. O primeiro leva trinta segundos." + botão |
| Diário com filtro sem resultado | "Nenhum treino em março." + limpar filtro |

### Estados de erro

| Erro | Comportamento |
|---|---|
| Falha ao gravar | Toast de erro **com o texto do banco**, e o formulário não fecha. Tem teste próprio (`verificar-falha-gravacao`) |
| Parceiro não encontrado | "Ninguém com esse @." — e permite salvar o treino sem ele |
| Duração zero | Bloqueado na validação |

---

## 12.3 Adicionar parceiro e confirmar rola

**Estado: CONSTRUÍDO.**

### Lado de quem convida

```
  Parceiros ──▶ [buscar @] ──▶ perfil encontrado
                                     │
                                     ├─ já é parceiro?  ──▶ "Vocês são parceiros"
                                     ├─ convite aberto? ──▶ "Convite em aberto"
                                     └─ nenhum          ──▶ [Adicionar como parceiro]
                                                                    │
                                                                    ▼
                                                          toast: "Convite enviado"
```

### Lado de quem recebe

```
  Parceiros ──▶ "Convites" ──▶ [Aceitar] | [Recusar]
                                   │            │
                                   │            └──▶ some. Sem notificação para o outro.
                                   ▼
                          parceria ativa, placar passa a existir
```

### Confirmação de rola

```
  Início / Parceiros ──▶ "A confirmar (2)"
                              │
                              ├─ "Rafael marcou: 3 rolas, 1×2 · faltam 5 dias"
                              │        │
                              │        ├─ [Confirmar]  ──▶ conta no placar dos dois
                              │        └─ [Contestar]  ──▶ não conta para ninguém
                              │
                              └─ sem ação ──▶ 7 dias ──▶ conta
```

### Estado vazio

> "Nenhum parceiro ainda. Adicione pelo @ da pessoa."

Note que a frase **diz como**. Um estado vazio que só constata é uma oportunidade
perdida.

---

## 12.4 Cadastrar mestre e ver linhagem

**Estado: CONSTRUÍDO.**

```
  Perfil ──▶ "Mestres e linhagem"  ──▶  /meus-mestres
                                              │
                                              ├─ [Novo] ──▶ Dialog
                                              │              ├─ Quem é (busca @ ou nome escrito)
                                              │              ├─ Como era (mestre|professor|instrutor)
                                              │              ├─ Desde | Academia
                                              │              ├─ Observação
                                              │              └─ ☐ É o meu mestre principal
                                              │
                                              ├─ lista de vínculos
                                              │     ├─ [Tornar principal]
                                              │     └─ [Remover] (com confirmação)
                                              │
                                              ├─ [Ver minha linhagem] ──▶ /atleta/@/linhagem
                                              │
                                              └─ ☐ Sou instrutor  (só da roxa em diante)
```

### A navegação da linhagem

```
  /atleta/joaozinho/linhagem
        │
        ├─ Joãozinho          (nível 0, você)
        ├─ Rafael          ───────▶ toque ──▶ /atleta/rafael.teste
        ├─ Mestre Coral    ───────▶            │
        ├─ Grão-Mestre Rui ───────▶            └─ caixa "Mestres" ──▶ linhagem DELE
        ├─ Hélio Gracie    ───────▶
        ├─ Carlos Gracie   ───────▶
        └─ Mitsuyo Maeda      (sem conta — não é link)
        │
        └─ "Outros mestres": os vínculos fora da linha principal
```

O ciclo perfil → linhagem → perfil → linhagem se repete indefinidamente. É o
fluxo que o pedido original descrevia: *"quando clica pode ver quem foi que
graduou e quem graduou eles e assim por diante."*

### Estados vazios

| Situação | Texto |
|---|---|
| Sem vínculo, é você | "Nenhum mestre cadastrado ainda. Comece pelo que te graduou — é a resposta que todo mundo pede no primeiro dia de uma academia nova." |
| Sem vínculo, é outro | "Esta pessoa ainda não cadastrou um mestre." |
| Faixa abaixo de roxa, no bloco de instrutor | "Disponível a partir da faixa roxa. A sua é Azul." |

---

## 12.5 Registrar medalha

**Estado: CONSTRUÍDO.**

```
  Perfil ──▶ "Medalhas" ──▶ /minhas-medalhas
                                  │
                                  ├─ [Nova] ──▶ Dialog
                                  │              ├─ Colocação (ouro|prata|bronze)
                                  │              ├─ Campeonato
                                  │              ├─ Categoria
                                  │              ├─ Data
                                  │              ├─ Federação
                                  │              └─ Academia representada  ◀── liga à academia
                                  │
                                  └─ lista com ☆ para destacar (máx. 3)
                                                    │
                                                    └─ 4ª tentativa: bloqueada pelo gatilho,
                                                       com mensagem clara
```

O campo "academia representada" é o que faz a medalha aparecer **também** no
perfil da academia, com o nome de quem ganhou.

---

## 12.6 Entrar numa academia

**Estado: CONSTRUÍDO.**

```
  Equipe ──▶ busca ou lista
                │
                ├─ academia aprovada ──▶ [Pedir para entrar] ──▶ pendente
                │                                                    │
                │                                    dono aprova ────┤
                │                                                    ▼
                │                                            membro ativo,
                │                                        aparece no perfil
                │
                └─ não existe ──▶ [Criar academia] ──▶ pendente de aprovação do app
```

### Os três estados de vínculo com academia

| Estado | O que o perfil mostra |
|---|---|
| Sem academia, mas com `gym` escrito | O nome, com "declarada" |
| Membro pendente | Nada ainda |
| Membro ativo de academia aprovada | Nome + selo de equipe, com link |

A distinção entre **declarada** e **oficial** aparece na tela. É o que impede
alguém de se apresentar como aluno de uma academia famosa sem que ela saiba.

---

## 12.7 Navegação global

**Estado: CONSTRUÍDO.**

```
  ┌────────────────────────────────────────────────────┐
  │                    CONTEÚDO                        │
  │                                                    │
  └────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────┐
  │  Início   Diário   Técnicas   Evolução   Perfil  ☰ │
  └────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
                                        ┌──────────────────────┐
                                        │  Menu (painel)       │
                                        │  ─────────────────   │
                                        │  Início              │
                                        │  Diário              │
                                        │  Análises            │
                                        │  Técnicas            │
                                        │  Evolução            │
                                        │  Plano do mês        │
                                        │  Perfil              │
                                        │  Parceiros de rola   │
                                        │  Equipe              │
                                        │  Mestres e linhagem  │
                                        │  Conquistas          │
                                        └──────────────────────┘
```

Cinco atalhos na barra, onze no menu. O menu tem descrição de uma linha por item,
porque "Evolução" e "Plano do mês" não se distinguem sozinhos.

### O bug do menu, e o que ele ensinou

O último item do menu ficava escondido atrás da barra inferior e não recebia
toque. A causa: os tokens de camada tinham sido renomeados para português e o
`BottomNav` continuava pedindo `--z-overlay`. **CSS não reclama de variável
inexistente — o valor vira `auto`.** A barra passou a pintar por cima do painel.

Duas correções, e a segunda é a que importa:

1. A variável certa, mais `min-h-0` no `<nav>` e recuo de área segura
2. Uma **quinta conferência no guarda de design**: `var(--token)` apontando para
   nome que não existe quebra o build

O teste que eu escrevi primeiro para isso aceitava "qualquer href" e **passava
com o bug ativo**. Foi apertado para exigir o href do próprio item.

### A barra não aparece fora da sessão

Em `/auth` a barra some. Ela cobria o "Criar minha conta" e oferecia seis telas
que devolviam a pessoa para o login.

---

## 12.8 Padrões transversais

### Estados vazios

Toda tela vazia segue o mesmo formato: **ícone, constatação, e o que fazer.**

```
       🎓
  Nenhuma graduação registrada. Vale a pena guardar: daqui a
  dez anos você vai lembrar da faixa, mas talvez não da data
  nem de quem amarrou.
```

A segunda frase é o que separa um estado vazio útil de um aviso.

### Confirmação de ação destrutiva

Toda remoção passa por `<Confirmar>`, com o nome do que será removido no texto:

> "Remover este vínculo? Hélio Gracie sai da sua lista e da sua linhagem."

### Carregamento

Listas paginadas usam `placeholderData: (anterior) => anterior` — a lista antiga
fica na tela enquanto a nova carrega, em vez de piscar para vazio.

### Toque

Todo elemento interativo tem a classe `tap`: transição de 90 ms no toque, e
`active:scale-95`. É a diferença entre um app que responde e um que parece
travado em rede ruim.
