# 02 — Core loop e sistema de sessões

## 2.1 O ciclo, em uma volta

```
          ┌─────────────────────────────────────────────┐
          │                                             │
          ▼                                             │
   ┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
   │  TREINA     │─────▶│  REGISTRA    │─────▶│  VÊ O EFEITO    │
   │  (tatame)   │      │  (30 s no    │      │  (horas, nível, │
   │             │      │   vestiário) │      │   sequência)    │
   └─────────────┘      └──────┬───────┘      └────────┬────────┘
                               │                       │
                               ▼                       ▼
                      ┌──────────────────┐   ┌────────────────────┐
                      │ MARCA PARCEIROS  │   │ RECEBE CONFIRMAÇÃO │
                      │ (quem rolou)     │──▶│ ou CONTESTAÇÃO     │
                      └──────────────────┘   └────────────────────┘
                                                       │
                                                       ▼
                                              ┌────────────────────┐
                                              │ CONQUISTA ABRE     │
                                              │ META ANDA          │
                                              └────────────────────┘
```

**Estado: CONSTRUÍDO.** Todo o ciclo acima funciona hoje.

O laço fecha em três tempos diferentes, e é isso que o mantém vivo:

| Tempo | O que acontece | Onde aparece |
|---|---|---|
| **Imediato** (segundos) | O treino entra no diário, as horas sobem, a sequência continua | Início |
| **Curto** (horas a dias) | O parceiro confirma a rola, o placar consolida | Parceiros |
| **Longo** (semanas a meses) | Conquista abre, meta se aproxima, plano do mês fecha | Conquistas, Evolução |

Um app que só fecha no imediato vira contador. Um que só fecha no longo vira
planilha. Os três juntos é o que faz alguém voltar.

## 2.2 A sessão

**Estado: CONSTRUÍDO.** Tabela `trainings`.

Uma sessão de treino é o átomo do app. Tudo — nível, sequência, conquista,
análise, estatística de parceiro — é derivado dela.

### Campos

| Campo | Tipo | Obrigatório | Por quê |
|---|---|---|---|
| `date` | data | sim | Registro retroativo é permitido: ninguém abre o app no tatame |
| `type` | `Gi` \| `No-Gi` | sim | São dois jogos diferentes; misturar apaga a informação |
| `duration_min` | inteiro | sim | É o que vira mat time, que vira nível |
| `rolls` | inteiro | não | Quantidade de rolas na sessão |
| `techniques` | texto | não | O que foi treinado |
| `partners` | texto | não | Campo livre, legado — a relação real está em `training_partners` |
| `notes` | texto | não | Como foi |

### A decisão de projeto: registro rápido, detalhe opcional

O formulário abre com data (hoje), tipo e duração — os três obrigatórios. Tudo o
mais é opcional e fica abaixo.

Isso é deliberado e vai contra o instinto de coletar o máximo. A alternativa
testada mentalmente: pedir técnicas e sensações como obrigatórios produziria
registros mais ricos nos primeiros dez treinos e nenhum registro a partir do
décimo primeiro. Um diário vazio e completo perde para um diário cheio e raso.

### Edição

**Estado: CONSTRUÍDO.** Um treino pode ser editado depois. Editar a lista de
parceiros dispara `tp_reabre_confirmacao`: se você mudou o que aconteceu, quem
já tinha confirmado precisa confirmar de novo. Sem isso, dava para confirmar um
registro inofensivo e depois trocá-lo por outro.

## 2.3 Sequência (streak)

**Estado: CONSTRUÍDO.**

A sequência conta **semanas consecutivas com pelo menos um treino**, não dias.

Isto é uma escolha contra a corrente. Duolingo conta dias e é o exemplo mais
citado de streak que funciona. Mas jiu-jitsu não é idioma: treinar todo dia é
lesão, e um app que premiasse frequência diária estaria empurrando a pessoa para
o que o esporte inteiro desaconselha.

Semana é a unidade que a modalidade usa de fato — "treino três vezes por semana"
é como todo praticante descreve a própria rotina.

**Consequência:** a sequência é mais difícil de quebrar e, por isso, mais difícil
de reconstruir a vontade de manter. É o preço, e é aceito. Ver capítulo 11 para
o mecanismo de proteção proposto.

## 2.4 O momento crítico: os primeiros trinta segundos

O app vive ou morre no vestiário. É lá que o registro acontece ou não acontece.

Fluxo medido, em toques:

```
abrir app → Diário (1 toque na barra) → "Novo treino" (1) →
  data já preenchida, tipo padrão Gi (0) → duração (2 toques no seletor) →
  Salvar (1)
                                                    = 5 toques, ~15 segundos
```

Com parceiros:

```
... → "Parceiros" → busca por @ (digitação) → escolher (1) →
  placar opcional (0–4) → Salvar
                                                    = ~12 toques, ~45 segundos
```

**Regra derivada:** nenhuma mudança pode aumentar a contagem de toques do caminho
mínimo. Se um campo novo for essencial, outro sai.

## 2.5 O retorno

O que traz a pessoa de volta, em ordem de força observada no desenho:

1. **A sequência em risco.** O mecanismo mais forte, e o mais perigoso — ver
   capítulo 10 sobre o limite ético dele.
2. **Confirmação pendente.** Alguém marcou você numa rola. É social, é
   específico, e tem prazo.
3. **A meta perto.** "Faltam 8 horas para o próximo nível" é concreto.
4. **A conquista quase aberta.** Ver capítulo 05.

O que **não** traz de volta, e por isso não existe: notificação genérica de
"sentimos sua falta", conteúdo novo para consumir, recompensa diária por abrir o
app sem treinar.

## 2.6 Buracos conhecidos

| Buraco | Impacto | Capítulo |
|---|---|---|
| Não há notificação. Confirmação pendente só é vista abrindo o app | Alto — o laço curto depende de saber que há algo pendente | [11](11-retencao.md) |
| Não há onboarding. 25 perfis com `questionario_em` nulo | Médio — a primeira sessão não coleta contexto | [12](12-fluxos-ux.md) |
| Registro só é feito pela própria pessoa. Professor não registra a aula | Médio — academia não vira fonte de dado | [17](17-casos-de-uso.md) |
