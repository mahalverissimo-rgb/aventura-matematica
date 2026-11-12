import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  P, SAVE_KEY, loadProgress, saveProgress, resetProgress, isUnlocked, regionUnlocked,
  starsFor, coinsFor, recordLevelWin, buyOrEquip, cleanName, totalStars, rank, playerName
} from "../js/progress.js";

/** Armazenamento falso, igual ao localStorage. */
const fakeStorage = (data = {}) => ({
  data,
  getItem: (k) => (k in data ? data[k] : null),
  setItem: (k, v) => { data[k] = String(v); }
});

beforeEach(() => loadProgress(fakeStorage()));

test("progresso novo começa zerado", () => {
  assert.equal(P.coins, 0);
  assert.deepEqual(P.stars, {});
  assert.equal(P.name, "");
  assert.equal(playerName(), "mago");
});

test("só o primeiro nível começa aberto", () => {
  assert.equal(isUnlocked(0, 0), true);
  assert.equal(isUnlocked(0, 1), false);
  assert.equal(regionUnlocked(1), false);
});

test("terminar um nível abre o próximo; terminar a região abre a seguinte", () => {
  recordLevelWin(0, 0, 0);
  assert.equal(isUnlocked(0, 1), true);
  for (let l = 1; l < 5; l++) recordLevelWin(0, l, 0);
  assert.equal(regionUnlocked(1), true);
  assert.equal(regionUnlocked(2), false);
});

test("estrelas por erros", () => {
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(1), 2);
  assert.equal(starsFor(2), 1);
  assert.equal(starsFor(5), 1);
});

test("moedas: base + estrelas + bônus de primeira vez", () => {
  assert.equal(coinsFor(3, true), 35);
  assert.equal(coinsFor(3, false), 25);
  assert.equal(coinsFor(1, false), 15);
  const r1 = recordLevelWin(0, 0, 2);
  assert.equal(r1.firstTime, true);
  assert.equal(r1.coins, 25);
  const r2 = recordLevelWin(0, 0, 0);
  assert.equal(r2.firstTime, false);
  assert.equal(r2.coins, 25);
  assert.equal(P.coins, 50);
});

test("repetir nível guarda sempre a melhor nota", () => {
  recordLevelWin(0, 0, 0);
  recordLevelWin(0, 0, 3);
  assert.equal(P.stars[0], 3);
  assert.equal(totalStars(), 3);
});

test("último nível do jogo: sem próximo e com reino salvo", () => {
  for (let r = 0; r < 5; r++) for (let l = 0; l < 5; l++) {
    const res = recordLevelWin(r, l, 0);
    if (r === 4 && l === 4) {
      assert.equal(res.hasNext, false);
      assert.equal(res.gameCompleted, true);
    } else assert.equal(res.hasNext, true);
    if (l === 4 && r < 4) assert.equal(res.regionUnlocked, r + 1);
  }
  assert.equal(totalStars(), 75);
  assert.equal(rank(), "Grande Arquimago");
});

test("loja: não compra sem moedas, compra e equipa com moedas", () => {
  let res = buyOrEquip("crown");
  assert.deepEqual(res, { ok: false, bought: false, missing: 60 });
  P.coins = 100;
  res = buyOrEquip("crown");
  assert.equal(res.ok, true);
  assert.equal(res.bought, true);
  assert.equal(P.coins, 40);
  assert.equal(P.hat, "crown");
  res = buyOrEquip("none");
  assert.equal(res.bought, false);
  res = buyOrEquip("crown");
  assert.equal(res.bought, false, "não cobra de novo item já comprado");
  assert.equal(P.coins, 40);
});

test("salvar e carregar preserva o progresso", () => {
  const st = fakeStorage();
  P.name = "Sofia"; P.coins = 42; P.stars[0] = 2; P.settings.voice = true;
  saveProgress(st);
  loadProgress(fakeStorage());
  assert.equal(P.coins, 0);
  loadProgress(st);
  assert.equal(P.name, "Sofia");
  assert.equal(P.coins, 42);
  assert.equal(P.stars[0], 2);
  assert.equal(P.settings.voice, true);
});

test("save antigo (v1.0, sem nome) continua funcionando", () => {
  const old = { coins: 15, stars: { 0: 3 }, owned: ["none", "owl"], hat: "none", pet: "owl", levelsDone: 1, tutorialSeen: true, settings: { sound: false } };
  loadProgress(fakeStorage({ [SAVE_KEY]: JSON.stringify(old) }));
  assert.equal(P.coins, 15);
  assert.equal(P.name, "");
  assert.equal(P.settings.sound, false);
  assert.equal(P.settings.ads, true, "configuração nova recebe o padrão");
});

test("save corrompido não quebra o jogo", () => {
  loadProgress(fakeStorage({ [SAVE_KEY]: "{isso não é json" }));
  assert.equal(P.coins, 0);
  loadProgress({ getItem: () => { throw new Error("bloqueado"); } });
  assert.equal(P.coins, 0);
});

test("apagar progresso mantém as configurações", () => {
  P.coins = 99; P.name = "Teo"; P.settings.sound = false;
  resetProgress();
  assert.equal(P.coins, 0);
  assert.equal(P.name, "");
  assert.equal(P.settings.sound, false);
  assert.equal(P.tutorialSeen, true);
});

test("nome: limpa, limita e coloca maiúscula", () => {
  assert.equal(cleanName("  sofia "), "Sofia");
  assert.equal(cleanName("<b>ana</b>"), "Bana/b");
  assert.equal(cleanName(""), "");
  assert.equal(cleanName("a".repeat(30)).length, 14);
});
