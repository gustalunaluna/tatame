# 🥋 Ponteira — seu jiu-jitsu, registrado

**Ponteira** é a barra preta da faixa, onde os graus são colados. É onde o
jiu-jitsu registra progresso — daí o nome.

Diário de treino, parceiros de rola, medalhas de campeonato, histórico de
graduação (com quem entregou cada grau), plano mensal por faixa e grau, metas
de longo prazo e +1.000 conquistas — da branca à vermelha.

**A cor do app é a sua faixa.** Um faixa branca abre um app cor de palha; um
roxa abre um app roxo; um preta, o vermelho da ponteira. A cor muda no dia da
graduação. É a única paleta que o jiu-jitsu já traz pronta e que ninguém
precisa aprender — e é conquistada, não escolhida. O pódio (ouro, prata,
bronze) é a exceção deliberada: essas três cores todo mundo lê sem legenda.

A paleta mora em `src/lib/cores.json` e é conferida por script:
`node verificar-contraste.mjs` reprova qualquer cor abaixo de 4,5:1 como texto,
ou perto demais de outra para se distinguir.

Vite + React + TanStack Router + Tailwind v4 + Supabase, pronto para a Vercel.
PWA mobile-first, instalável na tela inicial.

---

## 🎨 Sistema de design

Tudo que é visual mora em **`src/design/`** e nada é escrito duas vezes.

| Arquivo | O que é |
|---|---|
| `design/tokens.json` | **A fonte única.** Cor, raio, movimento, camadas. |
| `design/tokens.css` | Gerado a partir do JSON. Não edite. |
| `design/icones.ts` | Registro de ícones **pelo significado**, não pelo nome da biblioteca. |
| `/estilo` (rota no app) | Guia vivo: todos os tokens e ícones numa tela só. |

```bash
npm run tokens             # regenera o CSS a partir do JSON
npm run verificar:design   # reprova quem furar o sistema
```

**Trocar uma cor:** edite `tokens.json`, rode `npm run tokens`. O `prebuild`
roda sozinho, então é impossível publicar um CSS desatualizado.

**Trocar um ícone:** edite `design/icones.ts`. Como cada ícone é referenciado
pelo que significa (`Icone.medalha`, `Icone.graduacao`), mudar o desenho de um
conceito é mexer em uma linha — e o app inteiro acompanha.

`verificar:design` falha o build se alguém: editar o CSS gerado à mão, importar
`lucide-react` fora do registro, escrever cor crua num componente, ou usar
`z-index` solto em vez da escala semântica. Um sistema só continua sendo
sistema enquanto ninguém contorna ele — e contornar é sempre mais rápido no dia
em que se está com pressa.

---

## 🚀 Passo a passo para colocar no ar

### 1. Criar o banco (Supabase — grátis)
1. Crie uma conta/projeto em [supabase.com](https://supabase.com) (região `sa-east-1` p/ Brasil).
2. No painel: **SQL Editor** → cole e rode, nesta ordem:
   - `supabase/migrations/001_schema.sql` (cria todas as tabelas + segurança RLS)
3. Em **Authentication → Providers → Email**: deixe **Email** habilitado e
   **desative "Confirm email"** (para o cadastro ser instantâneo).
4. Em **Project Settings → API**, copie:
   - `Project URL`
   - `Publishable key` (ou `anon key`)

### 2. Rodar localmente (opcional)
```bash
cd tatame
cp .env.example .env    # preencha com URL e chave do passo 1
npm install
npm run dev
```

### 3. Deploy na Vercel
1. Importe este repositório na [Vercel](https://vercel.com/new).
2. **Root Directory**: `tatame` · Framework: **Vite** (detecta sozinho).
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Publishable/anon key
4. Deploy. ✅

### 4. Primeiro acesso + dados
1. Abra o app publicado → **Cadastre-se** (e-mail + senha).
   O app cria automaticamente as técnicas-base, o plano de 8 semanas e os pontos fracos.
2. Volte ao **SQL Editor** do Supabase e rode:
   - `supabase/seed/002_conquistas.sql` → cadastra as **~1.000 conquistas** (com metas de progresso)
   - `supabase/seed/003_meus_dados.sql` → migra os treinos, análises, posições ⭐ e conquistas já desbloqueadas
3. No celular: abra o site → menu do navegador → **"Adicionar à tela inicial"**. 📲

---

## 🗂 Estrutura
- `src/routes/` — telas (Início, Diário, Técnicas, Análises, Plano, Metas, Conquistas)
- `src/lib/bjj-storage.ts` — hooks de dados (React Query + Supabase)
- `supabase/migrations/` — schema do banco
- `supabase/seed/` — conquistas + dados pessoais

## 🔐 Variáveis de ambiente
| Nome | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (publishable/anon) |
