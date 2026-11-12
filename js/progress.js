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
  savedAt: 0,             // quando foi salvo pela última vez (para sincronizar)
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

/* ---------- onde salvar ---------- */

// Sem conta: SAVE_KEY. Com conta: uma chave por perfil de criança (cópia local para jogar sem internet).
let activeKey = SAVE_KEY;
export const profileSaveKey = (profileId) => `${SAVE_KEY}:perfil:${profileId}`;
export function setActiveSaveKey(key) { activeKey = key || SAVE_KEY; }
export const activeSaveKey = () => activeKey;

const saveListeners = [];
/** Avisa quem precisa saber (ex.: sincronização com a nuvem) a cada salvamento. */
export function onProgressSaved(fn) { saveListeners.push(fn); }

/** Completa dados vindos de um save antigo ou da nuvem com os valores padrão. */
export function normalizeProgress(d) {
  const base = defaultProgress();
  if (!d || typeof d !== "object") return base;
  return Object.assign(base, d, {
    stars: Object.assign({}, d.stars || {}),
    owned: Array.isArray(d.owned) ? d.owned.slice() : base.owned,
    settings: Object.assign(base.settings, d.settings || {})
  });
}

/** Troca todo o progresso atual por outro (já normalizado). */
export function applyProgress(d) {
  replaceProgress(normalizeProgress(d));
  return P;
}

/** Lê um progresso salvo sem aplicá-lo. Devolve null se não existir ou estiver corrompido. */
export function readSaved(storage = defaultStorage(), key = activeKey) {
  try {
    const raw = storage && storage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === "object" ? normalizeProgress(d) : null;
  } catch (e) { return null; }
}

/** Carrega o progresso salvo. Dados ausentes ou corrompidos viram o padrão. */
export function loadProgress(storage = defaultStorage(), key = activeKey) {
  replaceProgress(readSaved(storage, key) || defaultProgress());
  return P;
}

/**
 * Salva o progresso. Por padrão marca a hora e avisa a sincronização;
 * { silent: true } só grava (usado quando o dado veio da nuvem).
 */
export function saveProgress(storage = defaultStorage(), opts = {}) {
  if (!opts.silent) P.savedAt = Date.now();
  try { if (storage) storage.setItem(activeKey, JSON.stringify(P)); } catch (e) { /* sem espaço / bloqueado */ }
  if (!opts.silent) saveListeners.forEach((fn) => { try { fn(P); } catch (e) { /* não derruba o jogo */ } });
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
