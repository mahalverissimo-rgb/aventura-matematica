// Junta o progresso do aparelho com o da nuvem sem perder conquistas.
// Código puro: testado em tests/sync.test.js.
import { normalizeProgress } from "./progress.js";

/**
 * Regras:
 * - estrelas: fica a MELHOR nota de cada nível (de qualquer aparelho);
 * - itens comprados: junta os dois lados;
 * - níveis concluídos e tutorial: o maior / se visto em algum lado;
 * - moedas, nome, chapéu, mascote e configurações: do lado salvo mais recentemente.
 */
export function mergeProgress(a, b) {
  const x = normalizeProgress(a), y = normalizeProgress(b);
  const newer = (x.savedAt || 0) >= (y.savedAt || 0) ? x : y;
  const out = normalizeProgress(JSON.parse(JSON.stringify(newer)));
  const stars = {};
  for (const k of new Set([...Object.keys(x.stars), ...Object.keys(y.stars)])) {
    stars[k] = Math.max(x.stars[k] || 0, y.stars[k] || 0);
  }
  out.stars = stars;
  out.owned = [...new Set([...x.owned, ...y.owned])];
  out.levelsDone = Math.max(x.levelsDone || 0, y.levelsDone || 0);
  out.tutorialSeen = !!(x.tutorialSeen || y.tutorialSeen);
  out.savedAt = Math.max(x.savedAt || 0, y.savedAt || 0);
  if (!out.owned.includes(out.hat)) out.hat = "none";
  if (!out.owned.includes(out.pet)) out.pet = "owl";
  return out;
}

/** JSON com as chaves em ordem (para comparar objetos). */
function stableJSON(v) {
  if (Array.isArray(v)) return `[${v.map(stableJSON).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableJSON(v[k])).join(",")}}`;
  return JSON.stringify(v);
}

/** true se os dois progressos guardam exatamente as mesmas informações. */
export function sameProgress(a, b) {
  return stableJSON(normalizeProgress(a)) === stableJSON(normalizeProgress(b));
}

/** O progresso tem algo que vale a pena guardar na conta? */
export function hasMeaningfulProgress(p) {
  const x = normalizeProgress(p);
  return Object.keys(x.stars).length > 0 || x.coins > 0 || x.owned.length > 2;
}
