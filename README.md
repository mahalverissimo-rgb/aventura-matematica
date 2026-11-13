# Aventura Matemágica 🪄

Jogo educativo de matemática e enigmas para crianças de 6 a 8 anos.

**Jogar no navegador:** https://mahalverissimo-rgb.github.io/aventura-matematica/
(no celular, use "Adicionar à Tela de Início" para instalar como app; funciona sem internet)

**Apps de celular para testar:** veja [docs/APPS.md](docs/APPS.md): `.apk` do Android e projeto do iPhone gerados a cada PR.

## O que tem
- 5 regiões × 5 níveis: soma e subtração, sequências, comparação de números, formas geométricas e lógica
- Estrelas (1–3), moedas, Loja Mágica com chapéus e mascotes
- Mascote com dicas, leitura das perguntas em voz alta, opção de letras maiores
- Área dos pais protegida; anúncios apenas **simulados** (modo teste)
- Progresso salvo no aparelho e, com a **Conta da família** (opcional), na nuvem: continua em qualquer aparelho, até 6 jogadores por conta

## Rodar localmente
- **Jogar sem instalar nada:** baixe o arquivo único da versão (gerado por `npm run build` em `dist/`, ou em *Actions → Testes → Artifacts*) e abra com dois cliques.
- **Desenvolver:** `python3 -m http.server` na pasta do projeto e abra http://localhost:8000
- **Testes:** `npm test` (lógica), `python3 tests/e2e/smoke.py`, `account.py` e `mobile.py` (navegador)

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Privacidade
[Política de Privacidade](https://mahalverissimo-rgb.github.io/aventura-matematica/privacidade.html) · [Termos de Uso](https://mahalverissimo-rgb.github.io/aventura-matematica/termos.html) · [Suporte e exclusão de conta](https://mahalverissimo-rgb.github.io/aventura-matematica/suporte.html) · Materiais das lojas: [docs/LOJAS.md](docs/LOJAS.md)

## Manual
📘 [Manual do jogo (PDF) – v1.5](docs/Manual-Aventura-Matemagica-v1.5.pdf)

## Versões
Histórico completo em [CHANGELOG.md](CHANGELOG.md).
- **1.5** – Política de Privacidade, Termos, Suporte e exclusão de conta; consentimento do responsável; "Ver meus dados"; fonte sem terceiros; materiais das lojas.
- **1.4** – app instalável e sem internet, .apk do Android e projeto do iPhone, ícone novo.
- **1.3** – Conta da família: progresso na nuvem, vários jogadores, funciona sem internet.
- **1.2** – código organizado em módulos, testes automáticos e arquivo único com a versão no nome.
- **1.1** – nome do jogador na abertura; número grande nas somas dos níveis 1 e 2; versão exibida nas Configurações; manual em PDF.
- **1.0** – primeira versão jogável.
