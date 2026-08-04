# Publicar o Ponteira nas lojas

O código está pronto. O que falta são contas, chaves e formulários — coisas
que exigem cartão de crédito, documento e, no caso da Apple, um Mac.

Este arquivo é a lista completa, na ordem em que faz sentido executar.

---

## Antes de qualquer coisa: três valores para preencher

Estes três são os únicos lugares do código onde ficou um espaço reservado.
Nenhum build quebra sem eles — a submissão é que é recusada.

| Onde | O quê | Por quê |
|---|---|---|
| `src/lib/legal.ts` → `CONTATO` | um e-mail que você lê | As duas lojas testam o link, e a LGPD (art. 18, §1º) obriga a existir um canal. Publicar um e-mail pessoal numa página aberta é decisão sua, por isso ficou em branco. |
| `src/lib/legal.ts` → `DOMINIO` | o domínio final | Só aparece nos textos. Se ficar na Vercel, está certo como está. |
| `capacitor.config.ts` → `appId` | `app.ponteira.diario` | Confira **antes da primeira publicação**: depois disso é imutável. Mudar significa um app novo, sem os usuários nem as avaliações do anterior. |

---

## No painel do Supabase (10 minutos, e é obrigatório)

Sem isto, o app da loja instala, abre, e **não consegue confirmar cadastro nem
recuperar senha** — o link do e-mail não tem como voltar para dentro do app.

**Authentication › URL Configuration › Redirect URLs**, adicione as três:

```
https://ponteira.vercel.app/**
app.ponteira.diario://
app.ponteira.diario://nova-senha
```

O que não estiver nessa lista é silenciosamente trocado pela Site URL, e o
link volta para a web em vez do app. É um erro que não dá mensagem nenhuma.

**Authentication › Policies**, ligue **Leaked password protection**. É um
botão. Confere a senha contra o HaveIBeenPwned e hoje está desligado — foi o
único apontamento de segurança que sobrou no advisor.

---

## Google Play

Mais barato e mais rápido que a Apple. Comece por aqui.

1. **Conta de desenvolvedor** — US$ 25, pagamento único, em
   [play.google.com/console](https://play.google.com/console). Contas
   pessoais passam por verificação de identidade e podem levar alguns dias.

2. **Gerar o app**:
   ```bash
   npm run loja:android      # build + sync + abre o Android Studio
   ```
   No Android Studio: *Build › Generate Signed Bundle / APK › Android App
   Bundle*. Crie um keystore e **guarde-o com a sua vida** — perder o keystore
   significa nunca mais conseguir atualizar o app publicado.

3. **Ficha da loja**: nome, descrição curta (80 caracteres), descrição
   completa, ícone 512×512 (já existe em `public/icon-512.png`), uma imagem de
   destaque 1024×500 e no mínimo 2 capturas de tela de celular.

4. **Data safety** — o formulário de dados coletados. As respostas saem
   prontas da política em `/privacidade`: e-mail e nome (identificação), dados
   de saúde/atividade física (os treinos), fotos. Tudo criptografado em
   trânsito, com exclusão disponível dentro do app.

5. **URL de exclusão de conta** — o Play exige um endereço web onde dá para
   pedir exclusão sem instalar o app. Use `https://ponteira.vercel.app/meus-dados`.

6. **Política de privacidade**: `https://ponteira.vercel.app/privacidade`.

---

## App Store

Mais caro, mais lento, e **exige um Mac** com Xcode. Não há caminho oficial
sem isso.

1. **Apple Developer Program** — US$ 99 por ano, em
   [developer.apple.com](https://developer.apple.com/programs/). A verificação
   costuma levar de 24 a 48 horas.

2. **Gerar o app** (num Mac):
   ```bash
   npm run loja:ios          # build + sync + abre o Xcode
   ```
   No Xcode: escolha o Team em *Signing & Capabilities*, depois
   *Product › Archive › Distribute App*.

3. **Ficha da loja**: ícone 1024×1024, capturas de 6,7" e 6,5", subtítulo,
   palavras-chave, descrição.

4. **App Privacy** — as *nutrition labels*. Mesmas respostas do Data safety
   do Google.

5. **Exclusão de conta** — diretriz 5.1.1(v). Já está pronta em Perfil ›
   Meus dados, e o caminho é curto de propósito: a Apple reprova quando o
   botão existe mas está escondido.

6. **A diretriz que reprova apps assim**: 4.2, *minimum functionality*. Um app
   que é só um site embrulhado é recusado. O Ponteira tem defesa: funciona
   offline por completo, guarda dados localmente e se instala como app de
   verdade. Se vier recusa, responda apontando o uso offline — é o argumento
   que costuma resolver.

---

## O que já está pronto no código

Nada aqui exige ação sua. É a lista do que foi feito para as lojas aceitarem.

- **Recuperação de senha** — `/esqueci-a-senha` e `/nova-senha`, públicas.
- **Política de privacidade e termos** — `/privacidade` e `/termos`, abertas
  sem login (o revisor clica no link antes de instalar), escritas sobre o
  inventário real do banco.
- **Exclusão de conta e exportação** — `/meus-dados`, com a RPC
  `excluir_minha_conta()` e a `meus_dados()`.
- **Aceite no cadastro**, com os dois links.
- **Casca nativa** — Capacitor, `android/` e `ios/` versionados, empacotando
  o mesmo `dist/` que a Vercel publica. Não existe segunda base de código.
- **Link de volta do e-mail** — esquema `app.ponteira.diario://` registrado no
  `AndroidManifest.xml` e no `Info.plist`, com o listener em `src/lib/nativo.ts`.
- **Retrato travado no iPhone**, modo escuro declarado, `manifest.webmanifest`
  com `id`, categorias e atalhos.

---

## Manutenção

Toda vez que publicar uma versão nova para as lojas:

```bash
npm run verificar     # 31 suítes + build + tipos + orçamento
npm run loja          # build + cap sync
```

E suba a versão: `android/app/build.gradle` (`versionCode` e `versionName`) e,
no Xcode, *MARKETING_VERSION* e *CURRENT_PROJECT_VERSION*. As duas lojas
recusam um envio com número de versão repetido.
