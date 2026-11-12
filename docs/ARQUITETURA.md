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
scripts/build.mjs   gera dist/aventura-matematica-v<versão>.html (arquivo único)
tests/              testes de lógica (node --test) e e2e/smoke.py (navegador)
```

**Regra principal:** `challenges.js` e `progress.js` não tocam na tela. Toda regra de jogo fica
neles, o que permite testá-las e, na v1.3, sincronizar o progresso com a nuvem trocando só o
armazenamento (`loadProgress(storage)` / `saveProgress(storage)`).

## Como trabalhar
| Comando | O que faz |
|---|---|
| `npm test` | roda os testes de lógica |
| `npm run build` | gera o arquivo único em `dist/` |
| `python3 tests/e2e/smoke.py` | joga no navegador (precisa de Playwright) |
| `python3 -m http.server` | serve o jogo em http://localhost:8000 |

> Abrir `index.html` com dois cliques **não funciona** (navegadores bloqueiam módulos em
> `file://`). Para jogar sem servidor, use o arquivo de `dist/`.

## Versões
- A versão fica em `js/config.js` (`VERSION`) e `package.json` (`version`) — o teste confere que batem.
- Cada pedido novo = nova versão, um PR, entrada no `CHANGELOG.md` e arquivos entregues com a versão no nome.

## Próximas etapas
- **v1.3** – conta do responsável + perfis das crianças + progresso na nuvem (Supabase).
- **v1.4** – apps iOS/Android com Capacitor.
- **v1.5** – materiais das lojas (privacidade, termos, prints).
- **v2.0** – publicação. Antes disso, rever a monetização: as regras da Apple para a categoria
  Kids e o ECA Digital restringem anúncios para crianças.
