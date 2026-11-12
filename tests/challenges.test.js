import { test } from "node:test";
import assert from "node:assert/strict";
import { generateChallenge, numOptions } from "../js/challenges.js";
import { REGIONS, LEVELS_PER_REGION } from "../js/config.js";

const RUNS = 400;

for (let r = 0; r < REGIONS.length; r++) {
  for (let level = 1; level <= LEVELS_PER_REGION; level++) {
    test(`${REGIONS[r].nome} – nível ${level}: desafios válidos`, () => {
      for (let i = 0; i < RUNS; i++) {
        const q = generateChallenge(r, level);
        const vals = q.options.map((o) => String(o.value));
        assert.ok(q.text && q.text.length > 0, "pergunta vazia");
        assert.ok(q.hint && q.hint.length > 0, "dica vazia");
        assert.ok(q.options.length >= 2 && q.options.length <= 4, `nº de alternativas: ${q.options.length}`);
        assert.ok(vals.includes(String(q.answer)), `resposta ${q.answer} fora das alternativas ${vals} (${q.text})`);
        assert.equal(new Set(vals).size, vals.length, `alternativas repetidas: ${vals}`);
        for (const o of q.options) {
          if (typeof o.value === "number") assert.ok(o.value >= 0, `número negativo: ${vals}`);
        }
      }
    });
  }
}

test("Floresta da Soma: resultados nunca passam de 20", () => {
  for (let level = 1; level <= LEVELS_PER_REGION; level++) {
    for (let i = 0; i < RUNS; i++) {
      const q = generateChallenge(0, level);
      assert.ok(q.answer >= 0 && q.answer <= 20, `resultado ${q.answer} no nível ${level}`);
    }
  }
});

test("Floresta da Soma níveis 1–2: mostra frutas e o número grande", () => {
  for (let level = 1; level <= 2; level++) {
    for (let i = 0; i < 100; i++) {
      const q = generateChallenge(0, level);
      assert.match(q.visual, /class="bignum"/);
      assert.match(q.visual, /class="eqline"/);
    }
  }
});

test("numOptions: inclui a resposta, sem repetição e respeita o mínimo", () => {
  for (let i = 0; i < 500; i++) {
    const correct = Math.floor(Math.random() * 20);
    const opts = numOptions(correct, 4, 0);
    const vals = opts.map((o) => o.value);
    assert.ok(vals.includes(correct));
    assert.equal(new Set(vals).size, 4);
    assert.ok(vals.every((v) => v >= 0));
  }
});
