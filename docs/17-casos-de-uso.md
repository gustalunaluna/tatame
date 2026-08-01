# 17 — Casos de uso: aluno, professor, academia

Três pessoas diferentes usam o mesmo app para coisas incompatíveis. Escrever o
que cada uma precisa é o que impede o produto de virar um app médio para todo
mundo.

---

## 17.1 O aluno

### Quem é

Faixa branca a roxa, treina duas a quatro vezes por semana, não compete ou compete
pouco. **É a maioria absoluta e é para quem o app é desenhado.**

### O que ele quer, em ordem

1. Não perder a conta do que já fez
2. Uma noção honesta de onde está
3. Lembrar de quem treinou com ele, e quando
4. Saber o que estudar agora

### A jornada

| Momento | O que faz | Estado |
|---|---|---|
| **Dia 1** | Cria conta, escolhe faixa, o app muda de cor | PARCIAL — falta o onboarding |
| **Semana 1** | Registra o primeiro treino | CONSTRUÍDO |
| **Semana 2** | Adiciona o primeiro parceiro | CONSTRUÍDO |
| **Mês 1** | Primeira conquista, primeira sequência de 4 semanas | CONSTRUÍDO |
| **Mês 3** | Vê o gráfico de evolução com dado suficiente | CONSTRUÍDO |
| **Mês 6** | Cadastra a graduação antiga e o mestre | CONSTRUÍDO |
| **Ano 1** | Graduação. O app inteiro muda de cor | CONSTRUÍDO |

### O momento decisivo: o dia da graduação

É o evento mais forte que o app tem, e o único que não se repete com frequência.

Hoje: a pessoa edita a faixa no perfil e o app muda de cor com transição de 600 ms.

**Proposta:** transformar isso em cerimônia.

- A rota de graduação da meta se completa visualmente
- As conquistas do nível novo se abrem
- Um convite a registrar quem entregou e a escrever uma crônica
- Um cartão compartilhável — a única coisa do app que faz sentido sair dele

### O que falta para o aluno

| Falta | Impacto |
|---|---|
| Onboarding | Alto — a primeira sessão não coleta nada |
| Notificação | **Alto** — ver capítulo 11 |
| Offline | **Alto** — registrar no vestiário sem sinal |
| Plano de marrom e preta | Alto para quem chega lá |
| Trilhas com dependência | Médio |

---

## 17.2 O professor

### Quem é

Faixa-preta que dá aula. Pode ser dono da academia ou não. Tem entre 20 e 200
alunos que ele conhece pelo nome.

### O que ele quer, em ordem

1. **Saber quem sumiu.** É a pergunta mais cara de uma academia
2. Saber quem está perto de graduar
3. Ver a linhagem dele crescer — quem ele graduou
4. Registrar a aula uma vez, valendo para a turma

### O que existe hoje

| Recurso | Estado |
|---|---|
| Perfil com título correto (Professor/Mestre) | CONSTRUÍDO |
| Lista de alunos da academia | CONSTRUÍDO |
| Parceiros de rola dele | CONSTRUÍDO |
| Linhagem para cima | CONSTRUÍDO |
| Aprovar entrada de aluno | CONSTRUÍDO |
| Registrar graduação que ele entregou | PARCIAL — o **aluno** registra, ele não |

### O que falta, e é muito

**1. Quem sumiu.** PROPOSTO.

```
 ┌────────────────────────────┐
 │ Turma            18 ativos │
 ├────────────────────────────┤
 │ ⚠ Sumidos (3)              │
 │   Camila     · 21 dias     │
 │   Henrique   · 28 dias     │
 │   Thiago     · 35 dias     │
 ├────────────────────────────┤
 │ 🎓 Perto de graduar (2)    │
 │   Maria    Azul→Roxa · 14m │
 │   Julio    Marrom→Preta·22m│
 └────────────────────────────┘
```

O dado para isso **já existe inteiro**: `trainings` por aluno, `team_members` para
saber quem é da casa, `graduations` para o tempo desde a última.

**Ressalva de privacidade importante:** isso expõe a frequência de um aluno ao
professor dele. É legítimo — é a relação real da academia — mas precisa ser
explícito no momento em que o aluno entra: *"Sua frequência fica visível para o
professor desta academia."*

**2. A direção descendente da linhagem.** PROPOSTO.

Hoje a linhagem sobe. O professor quer ver descer: quem ele graduou, e quem
aqueles graduaram. É a mesma consulta invertida, e é a parte mais gratificante da
linhagem para quem ensina.

**3. Registrar a graduação que ele entregou.** PROPOSTO.

Hoje o aluno registra "fui graduado por Fulano". O contrário é melhor: o professor
registra "graduei estes cinco hoje", e cada aluno confirma. É mais fiel ao que
acontece — a cerimônia é coletiva — e resolve o buraco de verificação do capítulo
06 de uma vez.

**4. Registrar a aula.** PROPOSTO.

Um registro do professor ("aula de hoje: passagem de guarda, 90 min") que os
alunos presentes confirmam com um toque, em vez de cada um digitar tudo.

---

## 17.3 A academia

### Quem é

A instituição. Pode ter uma unidade ou trinta. Tem receita, tem custo, e tem um
problema caro: **evasão**.

### O que ela quer, em ordem

1. Reter aluno
2. Mostrar a casa — medalhas, graduados, história
3. Administrar unidades e professores
4. Recrutar

### O que existe hoje

| Recurso | Estado |
|---|---|
| Perfil público com brasão | CONSTRUÍDO |
| Contagem de alunos e faixas-pretas | CONSTRUÍDO |
| Mural de medalhas com quem ganhou | CONSTRUÍDO |
| Papéis hierárquicos (6 níveis) | CONSTRUÍDO |
| Aprovação de entrada | CONSTRUÍDO |
| Selo de verificado | CONSTRUÍDO |
| Matriz e filial | PARCIAL — a coluna existe, nenhuma tela usa |
| Painel de gestão | **PROPOSTO** |
| Comunicar com alunos | **PROPOSTO** |

### O caso que valida a escala

**Academia Gracie**, nos dados de exemplo:

| | |
|---|---|
| Alunos ativos | 73 |
| Faixas-pretas | 24 |
| Instrutores | 32 |
| Vínculos de linhagem | 116 |
| Profundidade da corrente | 4 a 6 níveis |

A lista paginada carrega, o perfil abre, a linhagem sobe. A escala foi testada
com dado real, não com dez linhas.

### O que falta

**1. O painel.** É o produto que a academia pagaria por (capítulo 09).

**2. Comunicação.** Uma academia não tem como avisar nada aos alunos pelo app.
Isso hoje vive no WhatsApp e provavelmente deve continuar vivendo — mas há um
meio-termo: **um aviso fixado no perfil da academia**, sem chat, sem notificação
individual. "Não haverá aula dia 25."

**3. Filiais.** `matriz_id` existe e nenhuma tela mostra. Uma rede grande é
exatamente quem tem disposição a pagar.

**4. Gestão de professores.** Hoje o dono aprova entrada. Não há delegação: um
professor não pode aprovar aluno da turma dele.

---

## 17.4 A tabela dos três

Onde cada um está atendido:

| Necessidade | Aluno | Professor | Academia |
|---|---|---|---|
| Registrar treino | ✅ | ➖ | ➖ |
| Ver progresso próprio | ✅ | ✅ | ➖ |
| Ver parceiros | ✅ | ✅ | ➖ |
| Linhagem para cima | ✅ | ✅ | ➖ |
| Linhagem para baixo | ➖ | ❌ | ❌ |
| Quem sumiu | ➖ | ❌ | ❌ |
| Perto de graduar | ➖ | ❌ | ❌ |
| Mostrar a casa | ➖ | ➖ | ✅ |
| Comunicar | ➖ | ❌ | ❌ |
| Notificação | ❌ | ❌ | ❌ |
| Offline | ❌ | ➖ | ➖ |

✅ atendido · ❌ falta e importa · ➖ não se aplica

**A leitura:** o aluno está bem servido, o professor está mal servido, e a
academia tem vitrine mas não tem ferramenta. Como a academia é quem paga
(capítulo 09), essa é a lacuna de negócio, não só de produto.
