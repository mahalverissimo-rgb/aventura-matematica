# Aventura Matemágica 🪄

Jogo educativo de matemática e enigmas para crianças de 6 a 8 anos.

**Jogar no navegador:** https://mahalverissimo-rgb.github.io/aventura-matematica/

## O que tem
- 5 regiões × 5 níveis: soma e subtração, sequências, comparação de números, formas geométricas e lógica
- Estrelas (1–3), moedas, Loja Mágica com chapéus e mascotes
- Mascote com dicas, leitura das perguntas em voz alta, opção de letras maiores
- Área dos pais protegida; anúncios apenas **simulados** (modo teste)
- Progresso salvo no próprio aparelho (localStorage)

## Rodar localmente
- **Jogar sem instalar nada:** baixe o arquivo único da versão (gerado por `npm run build` em `dist/`, ou em *Actions → Testes → Artifacts*) e abra com dois cliques.
- **Desenvolver:** `python3 -m http.server` na pasta do projeto e abra http://localhost:8000
- **Testes:** `npm test` (lógica) e `python3 tests/e2e/smoke.py` (navegador)

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Manual
📘 [Manual do jogo (PDF) – v1.1](docs/Manual-Aventura-Matemagica-v1.1.pdf)

## Versões
Histórico completo em [CHANGELOG.md](CHANGELOG.md).
- **1.2** – código organizado em módulos, testes automáticos e arquivo único com a versão no nome.
- **1.1** – nome do jogador na abertura; número grande nas somas dos níveis 1 e 2; versão exibida nas Configurações; manual em PDF.
- **1.0** – primeira versão jogável.
