# 16 — Arquitetura técnica

## 16.1 A pilha

| Camada | Escolha | Por quê |
|---|---|---|
| Build | Vite 6 | Alvo `es2022` — PWA instalado não precisa transpilar para navegador velho |
| UI | React 19 | |
| Rotas | TanStack Router, baseado em arquivo | `autoCodeSplitting`: cada rota vira um pedaço próprio |
| Dados | TanStack Query v5 | Cache, invalidação, `placeholderData` |
| Estilo | Tailwind CSS v4 | `@theme inline`, `@utility`, OKLCH |
| Backend | Supabase | Postgres 17, Auth, Storage, RLS, RPC |
| Testes | Playwright | Navegador real, Chromium |

Não há servidor de aplicação, e isso é decisão: toda regra que não pode ser
burlada mora no banco (capítulo 15). Um servidor intermediário adicionaria um
lugar onde a regra pode divergir.

## 16.2 O sistema de design

### A fonte única

```
  src/design/tokens.json          ← a fonte. Cores, raios, movimento, camadas.
          │
          │  scripts/gerar-tokens.mjs
          ▼
  src/design/tokens.css           ← GERADO. Não se edita à mão.
          │
          ▼
  src/styles.css                  ← importa. Zero cor escrita à mão.
```

`npm run tokens` regenera. `npm run tokens -- --conferir` falha se estiver fora de
sincronia — e o guarda de design roda isso em toda verificação.

### Os grupos de token

| Grupo | Conteúdo |
|---|---|
| `cor.base` | Fundo, superfície, texto, borda |
| `cor.estado` | Destrutivo |
| `cor.faixa` | 7 faixas, cada uma com `acento`, `tecido` e `rotulo` |
| `cor.podio` | Ouro, prata, bronze — fora do sistema da faixa, de propósito |
| `cor.marca` | Tecido, ponteira, grau, costura, contorno — fixa, não segue a faixa |
| `raio` | Tudo deriva de `base`. Mexer nele arredonda o app inteiro |
| `movimento` | Curvas e durações |
| `camada` | A escala de z-index semântica |

### A faixa como acento

```css
:root {
  --faixa: oklch(0.88 0.075 92);        /* branca, o padrão */
  --faixa-contraste: oklch(0.13 0.006 250);
  --primary: var(--faixa);
  --primary-foreground: var(--faixa-contraste);
}

@property --faixa { syntax: "<color>"; inherits: true; ... }

@media (prefers-reduced-motion: no-preference) {
  :root { transition: --faixa var(--t-faixa) var(--ease-out-expo); }
}
```

`@property` é o que permite **animar a troca de cor**: no dia da graduação, o app
inteiro muda de cor em 600 ms em vez de piscar.

`CorDaFaixa.tsx` escreve as variáveis no `documentElement` e limpa ao desmontar.
Existe só dentro do autenticado — fora da sessão não há faixa para ler.

### A armadilha da substituição

```css
:root { --primary: var(--faixa); }   /* resolve AQUI */
```

`--primary` é resolvido no `:root`, e o que desce para os filhos é o **valor já
calculado**. Trocar `--faixa` num descendente **não recalcula** `--primary`.

Isso produziu um bug real: o cartão de uma meta de faixa azul tinha a variável
certa e a cor errada. A correção é `estiloDaFaixa()`, que escreve as duas:

```ts
export function estiloDaFaixa(faixa) {
  const acento = acentoDaFaixa(faixa);
  return {
    "--faixa": acento,
    "--faixa-contraste": textoSobreAcento(faixa),
    "--primary": acento,                  // ◀── sem esta linha, o bug volta
    "--primary-foreground": textoSobreAcento(faixa),
    "--ring": acento,
  };
}
```

**E o teste que eu escrevi primeiro só lia a variável — e passava com o bug
ativo.** Foi trocado por ler a `color` computada do rótulo.

### O registro de ícones

`src/design/icones.ts` — 44 ícones nomeados pelo **que significam**, não pelo nome
da biblioteca:

```ts
export const Icone = {
  treino: Dumbbell,
  rola: Swords,
  graduacao: GraduationCap,
  medalha: Medal,
  ...
} as const satisfies Record<string, LucideIcon>;
```

Dois ganhos: trocar de ideia num lugar só, e ver quando dois conceitos diferentes
estão usando o mesmo desenho — que é como um app começa a ficar confuso sem
ninguém saber explicar por quê.

## 16.3 O guarda de design

`verificar-design.mjs` quebra o build em cinco casos:

| # | Conferência | Nasceu de |
|---|---|---|
| 1 | `tokens.css` em dia com `tokens.json` | Alguém editar o gerado à mão |
| 2 | Nenhum import direto de `lucide-react` fora do registro | Cinco arquivos importando `Medal` direto |
| 3 | Nenhuma cor crua (hex, rgb, oklch) em componente | Cor em componente não segue a faixa |
| 4 | Nenhum z-index solto | `z-[999]` |
| 5 | **Nenhuma `var(--token)` apontando para nome inexistente** | O bug do menu |

A quinta é a mais valiosa e a mais recente. CSS não reclama de variável
inexistente — o valor vira `auto`. O último item do menu ficou inalcançável e só
apareceu no celular.

`verificar-contraste.mjs` converte OKLCH para sRGB e checa WCAG: piso 4.5:1 para
texto, e distinção mínima de 0,06 ΔOKLab entre faixas vizinhas.

## 16.4 Orçamento de peso

```
  npm run orcamento

  crítico: 202.9 kB gzip  ·  sob demanda: 215.4 kB  ·  teto: 220 kB
  ok     dentro do orçamento.
```

O caminho crítico é o que baixa antes de pintar a primeira tela. O teto é 220 kB
gzip e o script falha acima disso.

### A lição do `manualChunks`

Três tentativas, com números medidos:

| Estratégia | Caminho crítico |
|---|---|
| Sem regra (Rollup decide) | 195 kB |
| Todo `node_modules` → `vendor` | **235 kB** |
| Quatro pedaços por categoria | **235 kB** |
| Cirúrgico (só o que é eager) | **202 kB** |

Forçar todo `node_modules` num pedaço **arrasta para o pedaço eager** dependências
que o Rollup tinha colocado, com razão, dentro das rotas preguiçosas.

A regra final separa só o que já é necessário antes da primeira pintura — React,
roteador, Supabase — e deixa o resto sem regra:

```js
manualChunks(id) {
  if (!id.includes("node_modules")) return;
  const noCaminhoCritico =
    id.includes("/react/") || id.includes("/react-dom/") ||
    id.includes("/scheduler/") || id.includes("@tanstack") ||
    id.includes("@supabase");
  if (noCaminhoCritico) return "deps";
  // sem retorno: o Rollup decide, e normalmente decide certo
}
```

O ganho não é no primeiro acesso — é do segundo em diante. Publicar uma correção
de tela rebaixa só o pedaço do app.

## 16.5 Testes

21 suítes, Playwright com Chromium real.

```
  npm test              tudo
  npm test -- medalhas  só os que casam
```

`testes/rodar.mjs` constrói, sobe o servidor, espera responder, roda tudo, derruba.

### Dois defeitos do próprio runner, corrigidos

**1. O cano que não fechava.** O servidor era iniciado com `stdio: "pipe"` e
herdava o stdout do processo. `npm test | tail` ficava pendurado **depois** do
último teste: o relatório estava pronto e nada aparecia, porque o cano continuava
aberto do outro lado. Custou uma hora achando que a suíte tinha travado.

**2. O servidor órfão — este é grave.** `npx` não é o servidor: ele abre um `sh`,
que abre o node do vite. Matar o filho direto deixava os netos vivos, segurando a
porta. E aí a rodada seguinte passava o teste de saúde **contra o servidor
velho** — suíte verde contra o build anterior. É o pior desfecho possível para uma
rede de proteção.

Correção: `detached: true` e matar o **grupo** (`process.kill(-pid)`), mais uma
recusa explícita de rodar se a porta já responde.

### Como os testes veem dados reais

O ambiente bloqueia `supabase.co`. A saída é servir os payloads que o próprio
banco devolveu — puxados via MCP, guardados em `fixtures/` — para a interface
real:

```js
await page.route(`https://${REF}.supabase.co/**`, (rota) => {
  if (url.includes("/rpc/linhagem_de")) return json(F.linhagem);
  ...
});
```

O código de tela, as contas e os números são os de produção; só o transporte é
interceptado.

## 16.6 CI

`.github/workflows/verificar.yml`:

```
  verificar:design  →  build  →  tsc --noEmit  →  orcamento  →  playwright  →  test
```

**A ordem importa e já quebrou.** `src/routeTree.gen.ts` é gerado pelo plugin do
roteador **durante o build** e está no `.gitignore`. Rodar `tsc` antes do build
produzia 23 erros de "Cannot find module './routeTree.gen'".

## 16.7 PWA e mobile

| Aspecto | Tratamento |
|---|---|
| Áreas seguras | `--safe-t`, `--safe-b` de `env(safe-area-inset-*)`, com utilitários `topo-seguro`, `rodape-seguro`, `lados-seguros` |
| Alvo de toque | Mínimo 44px |
| Scroll travado | Menu aberto usa `position: fixed` no body — `overflow: hidden` sozinho não segura no Safari do iPhone |
| Listas longas | `content-visibility: auto` (`list-perf`) |
| Movimento | Tudo sob `prefers-reduced-motion` |

## 16.8 Buracos conhecidos

| Buraco | Impacto |
|---|---|
| Sem service worker de verdade — não funciona offline | **Alto** — registrar treino sem sinal é o caso mais comum no vestiário |
| Sem monitoramento de erro em produção | Alto |
| Sem versionamento de contrato de RPC | Médio |
| `fixtures/` precisa ser regerado à mão quando o schema muda | Baixo |
