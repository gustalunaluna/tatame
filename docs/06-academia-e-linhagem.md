# 06 — Academia, hierarquia e linhagem

## 6.1 Como uma academia de jiu-jitsu funciona de verdade

O app tratava academia como clube: dono e membro. Uma academia de jiu-jitsu não
é isso. Ela tem uma cadeia de responsabilidade que todo praticante reconhece, e
o app precisava saber lê-la para não inventar nomenclatura.

### Os papéis

| Papel | Quem é | O que faz |
|---|---|---|
| **Mestre** | Faixa-preta veterano, 4º grau em diante | Responde pela casa, gradua |
| **Professor** | Faixa-preta que dá aula | Dá aula, gradua |
| **Instrutor** | Roxa em diante | Instrui, sob supervisão. **Não gradua** |
| **Monitor** | Geralmente azul/roxa | Ajuda na aula, normalmente com iniciantes |
| **Aluno** | Todo mundo, inclusive quem instrui | Treina |

**A distinção que mais importa: quem gradua é faixa-preta.** Marrom e roxa
instruem, não entregam faixa. É a regra que o seed de exemplo respeita e que a
primeira versão dele errou (capítulo 06.5).

**A distinção que mais constrange quando errada:** chamar um preta 1º grau de
"mestre". Dentro do tatame isso soa errado de um jeito que quem treina percebe na
hora. Mestre é tratamento de veterano.

### Matriz e filial

Uma academia pode ser filiada a outra — Gracie Barra X é filial da Gracie Barra.
`teams.matriz_id` guarda isso.

**O vínculo institucional não muda quem graduou quem.** Uma pessoa pode treinar
numa filial e ter sido graduada por alguém de outra casa. Filiação e linhagem são
eixos independentes, e fundi-los seria o erro conceitual mais grave possível
aqui.

## 6.2 Títulos: a escada de nomenclatura

**Estado: CONSTRUÍDO.** `src/lib/titulos.ts`.

| Faixa | Título padrão |
|---|---|
| Branca a Azul | Aluno |
| Roxa | Aluno — pode instruir |
| Marrom | Aluno — Instrutor, se dá aula |
| Preta 1º a 3º | **Professor** |
| Preta 4º a 6º | **Mestre** |
| Coral (7º/8º) | **Mestre** |
| Vermelha (9º/10º) | **Grão-Mestre** |

### As duas regras que valem sobre a faixa

**1. O papel dado pela academia ganha da faixa.** Se a academia registrou alguém
como professor, ele é professor ali, mesmo que a faixa sozinha dissesse instrutor.
Quem conhece o aluno é a casa, não a tabela.

**2. Ninguém sobe além do que a faixa permite.** A academia não transforma um
faixa-azul em mestre. Dono de academia faixa-azul continua sendo aluno de
faixa-azul, e o app escreve isso. A trava existe em dois lugares: no banco
(`instrutor_exige_faixa`) e na leitura (`tetoDaFaixa`), porque uma regra que só
existe no formulário morre na primeira chamada direta à API.

### "Aluno" não aparece

Escrever "Aluno · Branca" em todo perfil de iniciante transforma o título em
ruído. Quando o título é Aluno, o app mostra só a faixa — que já diz isso.

## 6.3 Instrutor: a declaração própria

**Estado: CONSTRUÍDO.** `profiles.instrutor`.

A partir da roxa a pessoa pode se declarar instrutora. A academia pode confirmar
dando o papel `instrutor` no `team_members`.

São duas coisas diferentes de propósito: *eu dou aula* é um fato sobre a pessoa;
*esta academia me reconhece como instrutor* é um fato sobre a relação. Uma pessoa
pode dar aula em três lugares e ser reconhecida formalmente em um.

O gatilho `instrutor_exige_faixa` faz duas coisas:

- recusa `instrutor = true` abaixo da roxa, com mensagem explícita
- **rebaixa automaticamente** se a faixa cair (correção de cadastro), em vez de
  deixar um faixa-branca instrutor porque um dia foi roxa

## 6.4 Múltiplos mestres

**Estado: CONSTRUÍDO.** Tabela `master_links`.

O perfil tinha um campo de texto chamado "Mestre / professor" — um nome só, sem
data, sem academia, sem ligação com perfil nenhum.

Quem treina há dez anos tem três ou quatro mestres, e **o mais importante quase
nunca é o atual**: é quem o iniciou, ou quem o graduou preta. Um campo de texto
apagava tudo isso.

### O que um vínculo guarda

| Campo | Para quê |
|---|---|
| `mestre_id` | Quando o mestre usa o app — o perfil dele vira a fonte |
| `mestre_nome` | Quando não usa. **Nulo em `mestre_id` é normal**: Mitsuyo Maeda não vai criar conta |
| `team_id` | Em qual academia foi |
| `papel` | mestre, professor ou instrutor |
| `principal` | Se a linhagem sobe por ele |
| `desde` / `ate` | O período |
| `nota` | "me graduou até a roxa" |

### O mestre principal

Um gatilho (`um_mestre_principal`) garante que só um vínculo por pessoa é
principal. Marcar um novo desmarca o anterior.

**Por que a linhagem precisa de um só:** com três mestres cadastrados, seguir
todos transformaria a linhagem numa árvore que se ramifica exponencialmente. O
que identifica um praticante é a **linha**, não a ramificação. Os outros vínculos
aparecem no perfil, separados, sem sumir.

## 6.5 Linhagem

**Estado: CONSTRUÍDO.** `linhagem_de(handle)`.

A corrente para trás, um por nível, seguindo sempre o mestre principal.

```
   Joãozinho          Branca 2 graus
        │
        ▼
   Rafael             Preta 1º grau
        │
        ▼
   Mestre Coral       Coral 7º grau
        │
        ▼
   Grão-Mestre Rui    Vermelha 9º grau
        │
        ▼
   Hélio Gracie       Vermelha 10º grau
        │
        ▼
   Carlos Gracie      Vermelha 10º grau
        │
        ▼
   Mitsuyo Maeda      (fora do app)
```

Sete níveis, a partir de um faixa-branca de uma academia de dezoito pessoas.

### Como a consulta funciona

CTE recursiva com duas travas, ambas necessárias:

```sql
join lateral (
  select * from public.master_links ml
  where ml.aluno_id = c.user_id
  order by ml.principal desc, ml.desde nulls last, ml.created_at
  limit 1                      -- um mestre por nível
) v on true
...
where c.nivel < 20
  and (v.mestre_id is null or not (v.mestre_id = any(c.visitados)))
```

- **`visitados`** corta ciclo. A é mestre de B que é mestre de A é um cadastro
  errado plenamente possível, e sem essa trava ele trava o banco.
- **`nivel < 20`** corta o resto. Uma linhagem real de jiu-jitsu tem cinco ou seis
  níveis até o Maeda.

### Quem não usa o app

O nível 0 é a própria pessoa — é o que permite desenhar a corrente inteira sem a
tela ter que costurar o topo na mão. E quem não tem conta aparece com o nome
escrito e **não vira link**. A tela diz "fora do app — cadastrado pelo aluno" em
vez de inventar uma faixa branca para um Maeda.

### A navegação

Cada elo com conta leva ao perfil daquela pessoa. O perfil tem a caixa "Mestres",
que leva à linhagem *dela*. Você desce a corrente de qualquer ponto, indo e
voltando, o quanto quiser.

## 6.6 O exemplo: Academia Gracie

**Estado: CONSTRUÍDO.** `supabase/testes/005_linhagem_de_exemplo.sql`.

Dados de exemplo com escala real:

| | |
|---|---|
| Alunos ativos | **1.204** |
| Faixas-pretas | 24 |
| Instrutores (roxa/marrom) | 32 |
| Vínculos de mestre | 1.207 |
| Profundidade típica | 4 a 6 níveis |

O seed respeita as duas regras do esporte, e o primeiro rascunho errou as duas:

**Erro 1 — o instrutor não gradua.** A primeira passada apontava alunos para
instrutores roxa e marrom. Corrigido: todo aluno abaixo da preta aponta para um
preta, e o instrutor do dia a dia entra como vínculo separado com
`principal = false` — aparece no perfil, fica fora da corrente. *Quem dá a sua
aula de terça não é necessariamente quem assina a sua faixa.*

**Erro 2 — o fundador não gradua faixa-branca.** A primeira passada pendurou
faixas-brancas direto no Carlos Gracie, o que encurtava a linhagem para três
níveis e não acontece em academia nenhuma.

## 6.7 Buracos conhecidos

| Buraco | Impacto | Esforço |
|---|---|---|
| Não há a direção descendente: "quem eu graduei" | Médio — metade da linhagem está invisível | RPC + tela |
| `matriz_id` existe mas nenhuma tela mostra filiação | Baixo | Tela |
| Não há convite de mestre por link | Médio | Fluxo |
| Não há verificação: qualquer um se declara aluno de qualquer um | **Alto** | Fluxo de aceite, espelhando parceria |
| `master` (texto) coexiste com `master_links` | Baixo — declarado e tratado | Decisão de migração |

O buraco de verificação é o mais sério. Hoje eu posso cadastrar Rickson Gracie
como meu mestre e a linhagem inteira aparece no meu perfil sem ele saber. A
correção natural é a mesma da parceria: quando o mestre tem conta, o vínculo
nasce pendente e ele confirma. Quando não tem conta, fica como declarado — e a
tela precisa dizer "declarado" em vez de exibir com selo.
