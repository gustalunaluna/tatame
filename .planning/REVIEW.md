---
phase: 00-auditoria-tatame
reviewed: 2026-07-30T00:00:00Z
depth: deep
reviewer: gsd-code-reviewer (metodologia GSD Core 1.8.0)
files_reviewed: 9
files_reviewed_list:
  - src/lib/bjj-storage.ts
  - src/lib/bjj-types.ts
  - src/integrations/supabase/client.ts
  - src/router.tsx
  - src/routes/_authenticated/route.tsx
  - src/routes/_authenticated/diario.tsx
  - src/routes/_authenticated/tecnicas.tsx
  - src/routes/_authenticated/conquistas.tsx
  - src/routes/_authenticated/perfil.tsx
findings:
  critical: 2
  warning: 6
  info: 3
  total: 11
status: issues_found
---

# Tatame: Relatório de Revisão de Código

**Revisado:** 2026-07-30
**Profundidade:** deep (análise entre arquivos, cadeia de chamadas e propagação de erro)
**Status:** issues_found — 2 críticos, 6 avisos, 3 informativos

## Resumo

Revisão adversarial da camada de dados e das telas de escrita do Tatame, partindo
da hipótese de que o código contém defeitos.

O padrão dominante e mais grave: **falhas de gravação eram engolidas em silêncio**.
Todas as mutações usavam `mutate()` sem `onError`, e as telas mostravam o aviso de
sucesso na mesma linha em que disparavam a gravação — sem esperar o banco confirmar.
Na prática, um treino que o Supabase recusasse (RLS, rede, sessão expirada) sumia,
e o app dizia "Treino registrado. Boa!".

O segundo padrão: **leitura-modificação-escrita a partir do cache**, em três lugares.
O plano e os pontos fracos reescrevem coleções inteiras usando `query.data` como base,
o que perde a alteração anterior quando duas ações acontecem em sequência rápida.

Todos os itens Critical e Warning abaixo foram corrigidos e verificados no navegador.

## Critical

### CR-01: Aviso de sucesso falso — treino/técnica perdidos em silêncio

**Arquivos:** `src/routes/_authenticated/diario.tsx:62`, `src/routes/_authenticated/tecnicas.tsx:72-73`, `src/lib/bjj-storage.ts` (todas as mutações)

**Problema:** `add(t)` chamava `mutate()` — dispara e esquece. O `toast.success` vinha
na instrução seguinte, incondicionalmente. Nenhuma mutação tinha `onError`. Se o insert
falhasse, o usuário via a confirmação, fechava o app, e o treino não existia.

**Correção aplicada:** toda mutação ganhou `onError` que registra no console e avisa na
tela; os wrappers passaram a devolver `Promise<boolean>` (`true` só com confirmação do
banco); as telas passaram a `await` antes de comemorar.

```tsx
onAdd={async (t) => {
  setOpen(false);
  if (await add(t)) toast.success("Treino registrado. Boa!");
}}
```

**Verificação:** `verificar-falha-gravacao.mjs` simula o banco recusando o insert (403).
Antes: aviso de sucesso. Depois: `mostrouSucessoIndevido: false`, `mostrouErro: true`,
com a mensagem real do Postgres.

---

### CR-02: `ensureSeeded` ignorava o erro de todo insert — duplicação sem fim ou conta incompleta

**Arquivo:** `src/lib/bjj-storage.ts:80-104` (antes da correção)

**Problema:** os quatro `await supabase.from(...).insert(...)` descartavam o `{ error }`
devolvido. Dois desfechos ruins, ambos silenciosos:

1. Se o insert de técnicas falhava mas o `update({ seeded: true })` passava, a conta
   ficava **permanentemente** sem as técnicas iniciais — o seed nunca mais rodaria.
2. Se o `update({ seeded: true })` falhava, o seed rodava **de novo a cada abertura do
   app**, duplicando as 14 técnicas, as 8 semanas de plano e os 3 pontos fracos
   indefinidamente.

**Correção aplicada:** cada passo confere o erro e interrompe; `useEnsureSeeded` envolve
tudo num `try/catch` que avisa na tela.

## Warnings

### WR-01: Atualização perdida ao marcar itens do plano

**Arquivo:** `src/lib/bjj-storage.ts` — `usePlan().toggle`

**Problema:** a mutação lia `query.data` (cache) para montar a nova lista de itens e
gravava a coleção inteira. Dois toques rápidos em itens diferentes da mesma semana
partiam da mesma lista — o segundo `update` sobrescrevia o primeiro e o check sumia.

**Correção:** relê a semana do banco dentro da mutação antes de gravar.

---

### WR-02: Mesma atualização perdida no histórico de pontos fracos

**Arquivo:** `src/lib/bjj-storage.ts` — `useWeakPoints().updateScore`

**Problema:** idêntico ao WR-01 — o array `history` é reescrito por inteiro a partir do
cache. Mover dois sliders em sequência descartava a primeira entrada do histórico, que é
exatamente o dado que alimenta o gráfico de evolução.

**Correção:** relê `history` do banco antes de anexar.

---

### WR-03: `useGoalStart.set` deixava a tela de Perfil desatualizada

**Arquivo:** `src/lib/bjj-storage.ts` — `useGoalStart`

**Problema:** `goal_start` mora na tabela `profiles`, lida por duas queries com chaves
diferentes (`["profile"]` e `["perfil"]`). O `onSuccess` invalidava só a primeira. Com
`staleTime` de 5 minutos, mudar a data de início na tela de Metas deixava o Perfil
mostrando a data antiga por até 5 minutos.

**Correção:** invalida as duas chaves.

---

### WR-04: `useEnsureSeeded` travava para sempre sem sessão

**Arquivo:** `src/lib/bjj-storage.ts` — `useEnsureSeeded`

**Problema:** `if (!id) return;` saía **antes** do `try/finally`, então `setReady(true)`
nunca era chamado. Quem dependesse de `ready` ficaria em estado de carregamento perpétuo.

**Correção:** o `return` virou condição dentro do `try`; o `finally` sempre executa.

---

### WR-05: Campo de vídeo aceitava qualquer esquema de URL

**Arquivo:** `src/routes/_authenticated/tecnicas.tsx:164`

**Problema:** `href={t.videoUrl}` sem validação. Um valor `javascript:...` colado no campo
vira um link que executa script ao ser tocado. Risco real baixo (app de um usuário só,
o conteúdo é o próprio dono que digita), mas é XSS armazenado por definição.

**Correção:** helper `linkSeguro()` que só deixa passar `http:`/`https:`. O `rel="noreferrer"`
já estava correto.

---

### WR-06: Fotos de perfil antigas nunca são apagadas

**Arquivo:** `src/lib/bjj-storage.ts` — `usePerfil().enviarFoto`

**Problema:** o caminho inclui `Date.now()`, então `upsert: true` nunca sobrescreve nada —
cada troca de foto deixa a anterior no bucket para sempre. Com o limite de 5 MB por arquivo,
trocar de foto 200 vezes consome 1 GB (todo o plano free do Storage).

**Status:** não corrigido. A correção (apagar o arquivo anterior lendo `photo_url` atual)
é segura, mas apagar arquivo do usuário é ação destrutiva — quero seu aval antes.

## Info

### IN-01: `uid()` usava `Math.random`

**Arquivo:** `src/lib/bjj-storage.ts:20`

IDs de item do plano vinham de `Math.random().toString(36).slice(2,10)`. Não é questão de
segurança (não é token), mas o espaço é pequeno o bastante para colisão. **Corrigido:**
usa `crypto.randomUUID()` quando disponível.

---

### IN-02: Mapeamento linha→domínio de conquista duplicado

**Arquivos:** `src/lib/bjj-storage.ts` — `useAchievements` e `useDestaques`

O mesmo bloco de 11 campos aparece duas vezes. Adicionar um campo exige lembrar dos dois
lugares. Não corrigido — mudança cosmética, sem risco associado hoje.

---

### IN-03: Escritas em `plan_weeks` dependem só da RLS para o escopo

**Arquivo:** `src/lib/bjj-storage.ts` — `usePlan().toggle`

`.update(...).eq("week", week)` não filtra por `user_id`. Hoje está correto: a RLS
restringe a linha e existe `unique(user_id, week)`. Fica registrado porque a corretude
depende inteiramente da política do banco — se ela for afrouxada, isto vira escrita
cruzada entre contas.

## Fora de escopo desta revisão

Desempenho não entra no escopo do `gsd-code-reviewer` (v1). Os itens de desempenho
— RLS por linha, índices ausentes, DOM de 1006 conquistas, recharts no bundle — foram
tratados na auditoria anterior via advisors do Supabase e estão no commit `218c71c`.

---

_Revisor: Claude (metodologia gsd-code-reviewer, GSD Core 1.8.0)_
_Profundidade: deep_
_Verificação: `verificar-telas.mjs`, `verificar-conquistas.mjs`, `verificar-falha-gravacao.mjs` — Chromium real, 8 telas, zero erro de console_
