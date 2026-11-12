import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProgress, sameProgress, hasMeaningfulProgress } from "../js/sync.js";
import { defaultProgress } from "../js/progress.js";

const prog = (o) => Object.assign(defaultProgress(), o);

test("estrelas: fica a melhor nota de cada lado", () => {
  const a = prog({ stars: { 0: 3, 1: 1 }, savedAt: 10 });
  const b = prog({ stars: { 1: 2, 2: 1 }, savedAt: 5 });
  assert.deepEqual(mergeProgress(a, b).stars, { 0: 3, 1: 2, 2: 1 });
});

test("moedas, nome e chapéu vêm do lado mais recente", () => {
  const velho = prog({ coins: 100, name: "Sofi", savedAt: 1 });
  const novo = prog({ coins: 20, name: "Sofia", savedAt: 2 });
  const m = mergeProgress(velho, novo);
  assert.equal(m.coins, 20);
  assert.equal(m.name, "Sofia");
  assert.equal(m.savedAt, 2);
  assert.equal(mergeProgress(novo, velho).coins, 20, "ordem dos argumentos não importa");
});

test("itens comprados são somados e o equipado precisa existir", () => {
  const a = prog({ owned: ["none", "owl", "crown"], hat: "crown", savedAt: 1 });
  const b = prog({ owned: ["none", "owl", "cat"], pet: "cat", savedAt: 2 });
  const m = mergeProgress(a, b);
  assert.deepEqual(m.owned.sort(), ["cat", "crown", "none", "owl"]);
  assert.equal(m.pet, "cat");
  const bad = mergeProgress(prog({ hat: "dragon", savedAt: 9 }), prog({}));
  assert.equal(bad.hat, "none");
});

test("tutorial e níveis concluídos nunca voltam para trás", () => {
  const m = mergeProgress(prog({ tutorialSeen: true, levelsDone: 2, savedAt: 1 }), prog({ levelsDone: 5, savedAt: 2 }));
  assert.equal(m.tutorialSeen, true);
  assert.equal(m.levelsDone, 5);
});

test("progresso vazio da nuvem não apaga o do aparelho", () => {
  const local = prog({ stars: { 0: 3 }, coins: 40, name: "Teo", savedAt: 50 });
  const m = mergeProgress(local, {});
  assert.equal(m.coins, 40);
  assert.deepEqual(m.stars, { 0: 3 });
});

test("sameProgress e hasMeaningfulProgress", () => {
  assert.equal(sameProgress(prog({ stars: { 0: 1, 1: 2 } }), prog({ stars: { 1: 2, 0: 1 } })), true);
  assert.equal(sameProgress(prog({ coins: 1 }), prog({ coins: 2 })), false);
  assert.equal(hasMeaningfulProgress(defaultProgress()), false);
  assert.equal(hasMeaningfulProgress(prog({ stars: { 0: 1 } })), true);
});
