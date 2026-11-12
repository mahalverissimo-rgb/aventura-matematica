# Arquitetura – Aventura Matemágica

## Visão geral
Jogo web em HTML, CSS e JavaScript puro (módulos ES), **sem dependências**. O mesmo código
vai servir à versão web (GitHub Pages) e aos apps de iOS/Android (Capacitor, a partir da v1.4).

```
index.html          telas (HTML)
css/style.css       visual
js/
  main.js           ponto de entrada: liga botões e carrega o progresso
  config.js         VERSÃO, regiões, loja, valores de moedas  ← conteúdo editável
  challenges.js     geradores dos desafios de cada região       (puro, testado)
  progress.js       estado do jogador, regras, loja, salvamento (puro, testado)
  shapes.js         formas geométricas em SVG
  util.js / dom.js  utilitários
  ui.js             navegação, janelas, avisos, efeitos
  screens.js        mapa, níveis, loja, configurações, nome, tutorial
  game.js           fase em andamento
  audio.js          sons e voz
  ads.js            anúncios SIMULADOS
  account.js        Conta da família: login, perfis, sincronização e telas
  cloud.js          cliente do Supabase (login por e-mail + tabela child_profiles), só com fetch
  cloud-config.js   endereço e chave PÚBLICA do Supabase
  sync.js           junta progresso do aparelho com o da nuvem          (puro, testado)
supabase/schema.sql tabela, regras de segurança (RLS), limite de perfis, apagar conta
scripts/build.mjs   gera dist/aventura-matematica-v<versão>.html (arquivo único)
tests/              testes de lógica (node --test) e e2e/smoke.py (navegador)
```

**Regra principal:** `challenges.js` e `progress.js` não tocam na tela. Toda regra de jogo fica
neles, o que permite testá-las e, na v1.3, sincronizar o progresso com a nuvem trocando só o
armazenamento (`loadProgress(storage)` / `saveProgress(storage)`).

## Conta da família (v1.3)
- **Supabase** (projeto `aventura-matematica`, região São Paulo). Conta = adulto; até 6 perfis de criança
  na tabela `child_profiles` (`name` + `progress` em JSON). RLS: cada conta só acessa os próprios perfis.
- **Login sem senha:** `POST /auth/v1/otp` envia o e-mail; o link volta para o jogo com `#access_token`
  (lido por `useAuthHash`) ou o código é verificado em `/auth/v1/verify`.
- **Local primeiro:** cada perfil tem uma cópia no aparelho (`aventura-matemagica-v1:perfil:<id>`).
  Cada salvamento agenda o envio para a nuvem; sem internet, fica pendente e é enviado no evento `online`.
- **Mesclagem** (`sync.js`): melhor nota de cada nível, itens somados; moedas/nome/configurações do lado mais recente.
- **Apagar conta:** função `delete_my_account()` no banco apaga o usuário e, em cascata, os perfis.

### E-mail de acesso
- Enviado pelo **Resend** (integração oficial Resend ↔ Supabase), remetente
  **Aventura Matemágica <acesso@veritech.me>**, domínio `veritech.me` verificado (DKIM/SPF em
  `resend._domainkey`, `send`, `rsend`; DMARC `p=none`). DNS no Squarespace.
- Modelos "Magic link or OTP" e "Confirm sign up" em português, com **código de 6 dígitos** (`{{ .Token }}`)
  no assunto e no corpo, e botão "Entrar no jogo" (`{{ .ConfirmationURL }}`).
- Limite padrão do Supabase com SMTP próprio: 30 e-mails por hora (ajustável em *Authentication → Rate Limits*).

### Pendências
1. **Política de privacidade e termos** (v1.5).
2. Login com Apple/Google (opcional, junto com os apps na v1.4).

## Como trabalhar
| Comando | O que faz |
|---|---|
| `npm test` | roda os testes de lógica |
| `npm run build` | gera o arquivo único em `dist/` |
| `python3 tests/e2e/smoke.py` | joga no navegador (precisa de Playwright) |
| `python3 tests/e2e/account.py` | testa a Conta da família com Supabase simulado e 2 aparelhos |
| `python3 -m http.server` | serve o jogo em http://localhost:8000 |

> Abrir `index.html` com dois cliques **não funciona** (navegadores bloqueiam módulos em
> `file://`). Para jogar sem servidor, use o arquivo de `dist/`.

## Versões
- A versão fica em `js/config.js` (`VERSION`) e `package.json` (`version`) — o teste confere que batem.
- Cada pedido novo = nova versão, um PR, entrada no `CHANGELOG.md` e arquivos entregues com a versão no nome.

## Próximas etapas
- **v1.4** – apps iOS/Android com Capacitor.
- **v1.5** – materiais das lojas (privacidade, termos, prints).
- **v2.0** – publicação. Antes disso, rever a monetização: as regras da Apple para a categoria
  Kids e o ECA Digital restringem anúncios para crianças.
