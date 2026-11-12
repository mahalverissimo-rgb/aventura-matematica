// Progresso do jogador: estado, regras de desbloqueio, estrelas, moedas,
// loja e salvamento. Código puro (sem DOM): testado em tests/progress.test.js.
import {
  REGIONS, LEVELS_PER_REGION, RANKS, STARS_PER_RANK, SHOP,
  COINS_BASE, COINS_PER_STAR, COINS_FIRST_TIME
} from "./config.js";

export const SAVE_KEY = "aventura-matemagica-v1";

export const defaultProgress = () => ({
  coins: 0,
  stars: {},              // índice global do nível -> melhor nº de estrelas
  owned: ["none", "owl"],
  hat: "none",
  pet: "owl",
  levelsDone: 0,
  tutorialSeen: false,
  name: "",
  settings: { sound: true, voice: false, bigText: false, ads: true }
});

/** Estado único do progresso (o objeto é sempre o mesmo; só o conteúdo muda). */
export const P = defaultProgress();

function replaceProgress(data) {
  for (const k of Object.keys(P)) delete P[k];
  Object.assign(P, data);
}

/** Armazenamento padrão do navegador, protegido contra erros (modo anônimo etc.). */
function defaultStorage() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}

/** Carrega o progresso salvo. Dados ausentes ou corrompidos viram o padrão. */
export function loadProgress(storage = defaultStorage()) {
  const base = defaultProgress();
  try {
    const raw = storage && storage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === "object") {
        replaceProgress(Object.assign(base, d, { settings: Object.assign(base.settings, d.settings || {}) }));
        return P;
      }
    }
  } catch (e) { /* save corrompido: começa do zero */ }
  replaceProgress(base);
  return P;
}

export function saveProgress(storage = defaultStorage()) {
  try { if (storage) storage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) { /* sem espaço / bloqueado */ }
}

/** Apaga o progresso, mantendo as configurações e pulando o tutorial. */
export function resetProgress() {
  const settings = P.settings;
  replaceProgress(Object.assign(defaultProgress(), { settings, tutorialSeen: true }));
}

/* ---------- níveis e estrelas ---------- */

/** Índice global do nível (região r, nível l começando em 0). */
export const lid = (r, l) => r * LEVELS_PER_REGION + l;
export const starsOf = (r, l) => P.stars[lid(r, l)] || 0;

/** Um nível abre quando o anterior (mesmo que em outra região) tem ao menos 1 estrela. */
export const isUnlocked = (r, l) => {
  if (lid(r, l) === 0) return true;
  const prev = l > 0 ? [r, l - 1] : [r - 1, LEVELS_PER_REGION - 1];
  return starsOf(prev[0], prev[1]) > 0;
};
export const regionUnlocked = (r) => isUnlocked(r, 0);
export const totalStars = () => Object.values(P.stars).reduce((a, b) => a + b, 0);
export const regionStars = (r) => {
  let s = 0;
  for (let l = 0; l < LEVELS_PER_REGION; l++) s += starsOf(r, l);
  return s;
};
export const rank = () => RANKS[Math.min(RANKS.length - 1, Math.floor(totalStars() / STARS_PER_RANK))];

/** Estrelas pelo número de erros: 0 → 3, 1 → 2, 2+ → 1. */
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);
export const coinsFor = (stars, firstTime) => COINS_BASE + stars * COINS_PER_STAR + (firstTime ? COINS_FIRST_TIME : 0);

/**
 * Registra um nível concluído: guarda a melhor nota, soma moedas e conta níveis.
 * Devolve informações para a tela de vitória.
 */
export function recordLevelWin(r, l, mistakes) {
  const stars = starsFor(mistakes);
  const id = lid(r, l);
  const old = P.stars[id] || 0;
  const firstTime = old === 0;
  const coins = coinsFor(stars, firstTime);
  P.stars[id] = Math.max(old, stars);
  P.coins += coins;
  P.levelsDone++;
  const lastLevel = l === LEVELS_PER_REGION - 1;
  const lastRegion = r === REGIONS.length - 1;
  return {
    stars, coins, firstTime,
    hasNext: !(lastLevel && lastRegion),
    next: lastLevel ? { r: r + 1, l: 0 } : { r, l: l + 1 },
    gameCompleted: lastLevel && lastRegion && firstTime,
    regionUnlocked: lastLevel && !lastRegion && firstTime ? r + 1 : null
  };
}

/* ---------- loja ---------- */

export const shopItem = (id) => SHOP.find((i) => i.id === id);
export const currentPet = () => shopItem(P.pet) || shopItem("owl");

/**
 * Compra (se preciso) e equipa um item.
 * Devolve { ok, bought, missing } — missing = moedas que faltam.
 */
export function buyOrEquip(id) {
  const it = shopItem(id);
  if (!it) return { ok: false, bought: false, missing: 0 };
  let bought = false;
  if (!P.owned.includes(id)) {
    if (P.coins < it.p) return { ok: false, bought: false, missing: it.p - P.coins };
    P.coins -= it.p;
    P.owned.push(id);
    bought = true;
  }
  if (it.tipo === "hat") P.hat = id; else P.pet = id;
  return { ok: true, bought, missing: 0 };
}

/* ---------- nome ---------- */

/** Limpa o nome digitado: sem espaços nas pontas, sem caracteres de HTML, 1ª letra maiúscula. */
export function cleanName(v) {
  const s = String(v || "").trim().replace(/[<>&"]/g, "").slice(0, 14);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
export const playerName = () => P.name || "mago";
