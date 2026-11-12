// Configurações e conteúdo fixo do jogo.

export const VERSION = "1.2";

export const LEVELS_PER_REGION = 5;
export const QUESTIONS_PER_LEVEL = 5;
export const MAX_LIVES = 3;
/** Vídeo (simulado) entre fases a cada N níveis concluídos. */
export const INTERSTITIAL_EVERY = 3;

export const REGIONS = [
  { nome: "Floresta da Soma", ico: "🌳", cor: "#9be58a", sub: "Somar e subtrair",
    story: "O vilão Bagunço embaralhou as frutas mágicas! Use soma e subtração para devolver tudo ao lugar." },
  { nome: "Torre das Sequências", ico: "🗼", cor: "#8fd3ff", sub: "Padrões e sequências",
    story: "Os portais da torre só abrem quando você completa os padrões mágicos." },
  { nome: "Lago dos Números", ico: "🌊", cor: "#7fe6e0", sub: "Comparar e contar",
    story: "Os peixinhos do lago perderam a conta! Ajude a descobrir números maiores, menores e escondidos." },
  { nome: "Vale das Formas", ico: "🔷", cor: "#ffd27a", sub: "Formas geométricas",
    story: "Para construir a ponte mágica precisamos encontrar as formas certas." },
  { nome: "Castelo dos Enigmas", ico: "🏰", cor: "#f5a3d0", sub: "Lógica e enigmas",
    story: "O Bagunço se escondeu no castelo! Resolva os enigmas para derrotá-lo e salvar o reino." }
];

export const RANKS = ["Aprendiz", "Mago Iniciante", "Mago Aventureiro", "Mago Sábio", "Grande Arquimago"];
/** Estrelas necessárias para subir cada título. */
export const STARS_PER_RANK = 15;

export const SHOP = [
  { id: "none", tipo: "hat", e: "🧒", n: "Sem chapéu", p: 0 },
  { id: "wizard", tipo: "hat", e: "🧙", n: "Chapéu de Mago", p: 30 },
  { id: "crown", tipo: "hat", e: "👑", n: "Coroa", p: 60 },
  { id: "tophat", tipo: "hat", e: "🎩", n: "Cartola", p: 45 },
  { id: "bow", tipo: "hat", e: "🎀", n: "Laço Mágico", p: 25 },
  { id: "owl", tipo: "pet", e: "🦉", n: "Corujito", p: 0 },
  { id: "cat", tipo: "pet", e: "🐱", n: "Gato Estelar", p: 40 },
  { id: "dragon", tipo: "pet", e: "🐲", n: "Dragãozinho", p: 90 },
  { id: "unicorn", tipo: "pet", e: "🦄", n: "Unicórnio", p: 120 },
  { id: "fox", tipo: "pet", e: "🦊", n: "Raposa Sabida", p: 70 }
];

/** Emoji do chapéu mostrado sobre o avatar. */
export const HAT_E = { none: "", wizard: "🧙‍♂️", crown: "👑", tophat: "🎩", bow: "🎀" };

/** Moedas: base por nível + por estrela + bônus na primeira conclusão. */
export const COINS_BASE = 10;
export const COINS_PER_STAR = 5;
export const COINS_FIRST_TIME = 10;
export const COINS_TUTORIAL = 5;
export const COINS_REWARDED_AD = 20;
