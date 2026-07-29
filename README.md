# 🥋 Tatame — Diário de BJJ

App pessoal de Jiu-Jitsu: diário de treino, biblioteca de técnicas, análises do treinador,
plano de 8 semanas, metas e **+1.000 conquistas** gamificadas (da faixa branca à vermelha),
com barras de progresso.

Versão independente (migrada do Lovable): **Vite + React + TanStack Router + Tailwind v4 +
Supabase**, pronta para deploy na **Vercel**. PWA mobile-first (instalável na tela inicial).

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
