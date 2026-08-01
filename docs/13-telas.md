# 13 — Telas e wireframes

23 telas. Cada uma listada com o que resolve, o estado e a anatomia.

## 13.1 Mapa

```
  /auth                                  entrada
  │
  └── (autenticado)
      ├── /                              Início
      ├── /diario                        Diário
      ├── /analises                      Análises
      ├── /tecnicas                      Técnicas
      ├── /metas                         Evolução
      ├── /plano                         Plano do mês
      ├── /conquistas                    Conquistas
      ├── /parceiros                     Parceiros de rola
      ├── /equipe                        Equipe
      │
      ├── /perfil                        Meu perfil
      │   ├── /minhas-medalhas
      │   ├── /minhas-graduacoes
      │   └── /meus-mestres
      │
      ├── /atleta/$handle                Perfil de outra pessoa
      │   ├── /parceiros
      │   ├── /alunos
      │   ├── /medalhas
      │   └── /linhagem
      │
      ├── /academia/$slug                Perfil da academia
      │   ├── /atletas
      │   └── /medalhas
      │
      └── /estilo                        Guia de estilo (interno)
```

---

## 13.2 `/auth` — Entrada

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │                            │
 │      ╱▔▔▔▔▔▔▔▔▔▔▔┓         │   a faixa desenhada,
 │     ╱  tecido    ┃▮▮▮▮┃    │   inclinada 7°
 │    ╱▁▁▁▁▁▁▁▁▁▁▁▁▁┛        │
 │                            │
 │        Ponteira            │   52px, font-black
 │                            │
 │  O diário de quem vive o   │
 │  tatame. Cada treino,      │
 │  cada rola, cada grau.     │
 │                            │
 │  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬        │   escada branca→preta
 │                            │
 ├────────────────────────────┤   ← folha, sobe na entrada
 │ Pronto para subir no       │
 │ tatame?                    │
 │ Entre para registrar o     │
 │ treino de hoje.            │
 │                            │
 │  ┌──────────────────────┐  │
 │  │       Entrar         │  │
 │  └──────────────────────┘  │
 │     Criar minha conta      │
 └────────────────────────────┘
```

**O que resolve:** dizer "isto é jiu-jitsu" antes de pedir qualquer coisa.

**Anatomia:** hero centralizado numa coluna de 28rem (a mesma no tablet — o app é
de celular, não estica), folha ancorada embaixo com `rounded-t-[2rem]`. Tocar em
"Entrar" troca a folha pelo formulário, com botão de voltar.

**Movimento:** a faixa entra deslizando com a rotação embutida no keyframe (senão
ela entraria reta e giraria no fim); os graus entram um a um; a escada cresce da
esquerda; a folha sobe. Tudo sob `prefers-reduced-motion: no-preference`.

---

## 13.3 `/` — Início

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │ Olá, Gustavo               │
 │ ▬▬▬▬▬▬▬ Branca · 3 graus   │  ← a faixa vem primeiro
 │                            │
 │ ┌────────────────────────┐ │
 │ │  Nível 7               │ │  ← e o nível DEPOIS dela
 │ │  ████████░░░░  172h    │ │
 │ │  faltam 58h            │ │
 │ └────────────────────────┘ │
 │                            │
 │ ┌──────────┐ ┌───────────┐ │
 │ │ 🔥 12    │ │ Esta      │ │
 │ │ semanas  │ │ semana: 3 │ │
 │ └──────────┘ └───────────┘ │
 │                            │
 │ A confirmar (2)          › │
 │ Próximo passo            › │
 └────────────────────────────┘
```

**O que resolve:** "como eu estou hoje", em cinco segundos.

**A decisão de ordem:** faixa acima, nível abaixo, sempre. Regra 1.

---

## 13.4 `/diario` — Diário

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │ Diário          [+ Novo]   │
 │ Filtro: [Todos os meses ▾] │
 ├────────────────────────────┤
 │ 14 mar  Gi     90min  6🥋  │
 │   passagem de guarda, ...  │
 │   👤 Rafael  👤 Maria       │
 ├────────────────────────────┤
 │ 12 mar  No-Gi  60min  4🥋  │
 └────────────────────────────┘
```

**O que resolve:** registrar em trinta segundos, e reler.

---

## 13.5 `/perfil` e `/atleta/$handle` — Perfil

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │ ┌────┐ Rickson Gracie ✓    │
 │ │ RG │ Grão-Mestre         │  ← título, só quando ≠ Aluno
 │ │    │ ▬▬▬ Vermelha·9º grau│
 │ └────┘ @rickson.gracie     │
 │        Academia Gracie ✓   │
 ├────────────────────────────┤
 │ [Adicionar como parceiro]  │
 ├────────────────────────────┤
 │ 🏅 Medalhas em destaque    │  ← sobe para cá se houver
 ├────────────────────────────┤
 │ ⚔ Lutas   12 · 3 · 80%     │
 ├─────────────┬──────────────┤
 │ 🛡 Equipe   │ 🎓 Mestres  2 │
 │ Academia    │ Hélio Gracie │
 │ Gracie ✓    │ e mais 1     │
 ├─────────────┴──────────────┤
 │ 👥 Parceiros de rola     8 │
 │ 🎓 Alunos             1204 │  ← só se comanda academia
 │ 🏆 Conquistas em destaque  │
 │ 🎓 Graduações              │
 └────────────────────────────┘
```

**O que resolve:** ser o índice do app inteiro. Cada caixa leva à lista completa.

**O padrão da caixa** (`CaixaDoPerfil`): título, contagem à direita, miniatura do
conteúdo, e a caixa inteira é o link. Quando o conteúdo já tem links dentro, usa
`verTodos` no rodapé — âncora dentro de âncora é HTML inválido e o navegador
desfaz, fazendo o toque cair no lugar errado.

---

## 13.6 `/atleta/$handle/linhagem` — Linhagem

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │ ← Voltar ao perfil         │
 │ 🎓 Linhagem                │
 │ Joãozinho · 6 gerações     │
 ├────────────────────────────┤
 │ ⬤ Joãozinho                │
 │ │  ▬▬▬ Branca · 2 graus    │
 │ │                          │
 │ ⬤ Rafael ✓                 │
 │ │  ▬▬▬ Preta · 1º grau     │
 │ │                          │
 │ ⬤ Mestre Coral ✓           │
 │ │  ▬▬▬ Coral · 7º grau     │
 │ │                          │
 │ ⬤ Grão-Mestre Rui ✓        │
 │ │  ▬▬▬ Vermelha · 9º grau  │
 │ │                          │
 │ ⬤ Hélio Gracie ✓           │
 │ │  ▬▬▬ Vermelha · 10º grau │
 │ │                          │
 │ ⬤ Carlos Gracie ✓          │
 │ │  ▬▬▬ Vermelha · 10º grau │
 │ │                          │
 │ ⬤ Mitsuyo Maeda            │
 │    Fora do app             │
 ├────────────────────────────┤
 │ Outros mestres             │
 │ ┌────────────────────────┐ │
 │ │ 👤 Rolls Gracie        │ │
 │ │ Professor · 1972       │ │
 │ └────────────────────────┘ │
 └────────────────────────────┘
```

**O que resolve:** a pergunta do primeiro dia — "de quem você é aluno?".

**Anatomia:** trilha vertical à esquerda, com a linha parando no último. Quem tem
conta é link; quem não tem, não. Os vínculos fora da linha principal ficam
embaixo, separados.

---

## 13.7 `/meus-mestres` — Mestres e linhagem

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │ Meus mestres      [+ Novo] │
 │ Quem te graduou, e a       │
 │ linhagem que sai daí.      │
 ├────────────────────────────┤
 │ ┌────────────────────────┐ │
 │ │ 👤 Hélio Gracie ✓   🗑  │ │
 │ │ Mestre · Gracie · 1965 │ │
 │ │ ver perfil             │ │
 │ │ ★ Sua linhagem sobe    │ │
 │ │   por aqui             │ │
 │ └────────────────────────┘ │
 │ ┌────────────────────────┐ │
 │ │ 👤 Rolls Gracie     🗑  │ │
 │ │ Professor · 1972       │ │
 │ │ [Tornar principal]     │ │
 │ └────────────────────────┘ │
 ├────────────────────────────┤
 │ Ver minha linhagem       › │
 ├────────────────────────────┤
 │ Eu também dou aula         │
 │ Da faixa roxa em diante... │
 │ ☑ Sou instrutor            │
 └────────────────────────────┘
```

---

## 13.8 `/academia/$slug` — Academia

**Estado: CONSTRUÍDO.**

```
 ┌────────────────────────────┐
 │      🛡  Academia Gracie ✓  │
 │      Rio de Janeiro         │
 ├────────────────────────────┤
 │ 1204 alunos · 28 pretas     │
 ├────────────────────────────┤
 │ 🏅 Medalhas                 │
 │ Ouro 26× Prata 23× Bronze 19│  ← totais, não destaque
 │ [Ver tudo]                  │
 ├────────────────────────────┤
 │ 👥 Atletas             1204 │
 │ 🎓 Graduados                │
 └────────────────────────────┘
```

**A diferença com o perfil de atleta:** a academia mostra **totais por
colocação**, não três medalhas escolhidas. Ver capítulo 05.

---

## 13.9 As demais telas

| Tela | Estado | O que resolve |
|---|---|---|
| `/analises` | CONSTRUÍDO | A leitura sobre a evolução, por período |
| `/tecnicas` | CONSTRUÍDO | Biblioteca com nota de domínio por posição |
| `/metas` | CONSTRUÍDO | Metas, com a rota de graduação nas de faixa |
| `/plano` | PARCIAL | Um objetivo, quatro semanas. Falta conteúdo de marrom e preta |
| `/conquistas` | CONSTRUÍDO | 1.006 conquistas, filtráveis por nível |
| `/parceiros` | CONSTRUÍDO | Lista, convites, e "a confirmar" |
| `/equipe` | CONSTRUÍDO | Entrar, criar, gerir academia |
| `/minhas-medalhas` | CONSTRUÍDO | Cadastrar e escolher até 3 destaques |
| `/minhas-graduacoes` | CONSTRUÍDO | A escada, com quem entregou cada degrau |
| `/atleta/$handle/parceiros` | CONSTRUÍDO | Lista paginada |
| `/atleta/$handle/alunos` | CONSTRUÍDO | Alunos de quem comanda academia |
| `/atleta/$handle/medalhas` | CONSTRUÍDO | Todas as medalhas |
| `/academia/$slug/atletas` | CONSTRUÍDO | Lista paginada de 1.204 |
| `/academia/$slug/medalhas` | CONSTRUÍDO | Campeonatos e quem ganhou |
| `/estilo` | CONSTRUÍDO | Guia interno: tokens, ícones, componentes |

---

## 13.10 A tela que falta

**`/treino/$id` — o cartão do treino. PROPOSTO.**

Hoje um treino é uma linha numa lista. A proposta (capítulo 11, seção 11.4) é uma
página própria: o que foi treinado, com quem, quanto tempo, a crônica se houver, e
as conquistas que aquele treino abriu.

É o que transforma um registro em artefato — a peça mais valiosa a roubar do
Strava.
