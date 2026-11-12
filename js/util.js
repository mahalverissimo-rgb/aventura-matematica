// Funções utilitárias puras (sem DOM) — podem ser testadas no Node.

/** Inteiro aleatório entre a e b (inclusive). */
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** Escolhe um item aleatório da lista. */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Devolve uma cópia embaralhada da lista. */
export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Repete um texto n vezes. */
export const rep = (e, n) => Array(Math.max(0, n)).fill(e).join("");
