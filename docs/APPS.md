# Apps de celular – como testar (v1.4)

O jogo usa **o mesmo código** na web, no Android e no iPhone. Os apps são montados com o
[Capacitor](https://capacitorjs.com) automaticamente pelo GitHub a cada PR (aba **Actions → "Apps (Android e iPhone)"**).

## 1. App instalável pelo navegador (iPhone e Android, sem loja)
- **iPhone (Safari):** abra o jogo → botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Android (Chrome):** abra o jogo → menu **⋮** → **Instalar app** (ou "Adicionar à tela inicial").
- O jogo ganha ícone próprio, abre em tela cheia e funciona **sem internet** depois da primeira visita.

## 2. App Android (.apk) – sem conta no Google Play
1. No PR (ou em *Actions → Apps (Android e iPhone)* → última execução), baixe o artefato
   **android-apk-v1.4** e descompacte: dentro está `aventura-matematica-v1.4.apk`.
2. Envie o arquivo para o celular Android (Google Drive, e-mail, cabo…) e toque nele.
3. O Android pede para permitir "instalar apps desta fonte": permita só para esse app (Drive/Arquivos).
4. Pronto: o app **Aventura Matemágica** aparece na tela inicial.

> É uma versão de teste ("debug"). Para a Google Play será gerada a versão assinada (v2.0).

## 3. App iPhone – com o seu Mac e um Apple ID gratuito
Sem a conta paga da Apple, dá para instalar no **seu próprio iPhone** pelo Xcode (o app vale por 7 dias; depois é só instalar de novo).
1. Instale o **Xcode** pela App Store do Mac (gratuito, ~10 GB).
2. No PR, baixe o artefato **projeto-iphone-v1.4**, descompacte e abra `ios/App/App.xcworkspace`
   (ou `App.xcodeproj`, se o primeiro não existir).
3. Xcode → *Settings → Accounts* → entre com seu Apple ID.
4. Clique no projeto **App** → aba **Signing & Capabilities** → em *Team* escolha "(Seu nome) (Personal Team)".
   Se reclamar do *Bundle Identifier*, acrescente algo ao final (ex.: `me.veritech.aventuramatematica.teste`).
5. Ligue o iPhone no Mac pelo cabo, escolha-o no topo do Xcode e clique em ▶.
6. Na primeira vez, no iPhone: *Ajustes → Geral → VPN e Gerenciamento de Dispositivos* → confie no seu Apple ID.
   Em iPhones recentes também é preciso ativar o **Modo de Desenvolvedor** (*Ajustes → Privacidade e Segurança*).

## O que muda dentro do app
- Abre sem internet (os arquivos vão dentro do app; as fontes usadas são as do próprio celular).
- **Botão voltar do Android:** fecha janelas, volta de tela e, na tela inicial, sai do app.
- **Conta da família:** o app pede o **código de 6 números** do e-mail (o link do e-mail abriria o navegador).

## Para desenvolvedores
```bash
npm install            # instala o Capacitor (precisa de internet)
npm run android        # gera www/, sincroniza e abre o Android Studio
npm run ios            # gera www/, sincroniza e abre o Xcode (Mac)
```
`www/`, `android/` e `ios/` são gerados e não vão para o Git. Ícones e tela de abertura saem de `assets/`
(`npx capacitor-assets generate`). Identificador do app: `me.veritech.aventuramatematica`.

## Depois, com as contas das lojas (v2.0)
- Apple Developer (US$ 99/ano): TestFlight e App Store, ícone/assinatura de distribuição.
- Google Play (US$ 25, uma vez): teste interno e publicação (app assinado em formato .aab).
