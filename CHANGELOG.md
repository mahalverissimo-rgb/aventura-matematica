# Histórico de versões

## 1.4 — 12/11/2026
**Apps de celular (para testar, ainda fora das lojas).**
- **App instalável pelo navegador:** ícone próprio, tela cheia e funciona **sem internet** depois da primeira visita (iPhone e Android).
- **App Android:** o GitHub gera um `.apk` a cada PR, para instalar direto no celular, sem Google Play.
- **App iPhone:** projeto pronto para abrir no Xcode e instalar no próprio iPhone com Apple ID gratuito; o GitHub confere se compila.
- Ícone novo em vetor e tela de abertura.
- Tela respeita o entalhe e a barra inferior dos celulares; botão **voltar** do Android.
- No app, a Conta da família entra pelo **código de 6 números** do e-mail.
- Técnico: Capacitor 7 (`capacitor.config.json`, `scripts/build-www.mjs`), service worker (`sw.js`), workflow `apps.yml`; 64 testes de lógica e novo teste de ponta a ponta `mobile.py`. Guia em `docs/APPS.md`.

## 1.3 — 12/11/2026
**Conta da família:** o progresso pode ficar salvo na nuvem e continuar em qualquer aparelho.
- Conta do **adulto responsável**, sem senha: entra pelo link enviado por e-mail (ou por código, quando o e-mail trouxer um).
- Até **6 jogadores** por conta, cada um com seu nome, estrelas, moedas e itens.
- Quem já jogava sem conta pode **guardar o progresso** na conta ao entrar.
- Botão **👥 Trocar jogador** na tela inicial quando a conta tem mais de um jogador.
- **Funciona sem internet:** o progresso fica no aparelho e sincroniza quando a conexão volta. Se jogar em dois aparelhos, fica sempre a melhor nota de cada nível.
- **Apagar conta e todos os dados** e remover jogadores, dentro da Área dos Pais.
- Sem conta, o jogo continua funcionando como antes.
- E-mail de acesso em português, com código de 6 dígitos e botão, enviado por **Aventura Matemágica <acesso@veritech.me>** (Resend).
- Técnico: banco no Supabase (`supabase/schema.sql`) com regras de segurança por conta (RLS); cliente próprio sem dependências (`js/cloud.js`); 58 testes de lógica e teste de ponta a ponta com dois aparelhos simulados.

## 1.2 — 12/11/2026
Reorganização interna para o jogo poder crescer (contas, apps de iOS e Android). **Para a criança, o jogo continua igual.**
- Código dividido em módulos (`js/`) e estilos em `css/style.css`.
- Regras do jogo (estrelas, moedas, desbloqueio, loja, salvamento) separadas da tela, prontas para sincronizar com uma conta na nuvem.
- 44 testes automáticos de lógica + teste de ponta a ponta jogando no navegador, rodando a cada PR no GitHub.
- `npm run build` gera um arquivo único com a versão no nome (`dist/aventura-matematica-v1.2.html`), que abre com dois cliques e sem internet.
- Correção: repetir o tutorial pelo botão ❓ não dá mais +5 moedas a cada vez (só na primeira).
- Leitura em voz alta agora fala "menos" também para o sinal − das contas.

## 1.1 — 12/11/2026
- Pergunta o nome do jogador na abertura e usa o nome no jogo.
- Número grande e conta escrita nas somas dos níveis 1 e 2.
- Versão exibida nas Configurações; manual do jogo em PDF.

## 1.0 — 12/11/2026
- Primeira versão jogável: 5 regiões × 5 níveis, estrelas, moedas, Loja Mágica, dicas do mascote, leitura em voz alta, Área dos Pais e anúncios simulados.
