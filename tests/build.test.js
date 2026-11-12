import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build, bundle, moduleOrder } from "../scripts/build.mjs";
import { VERSION } from "../js/config.js";

test("build gera arquivo único com a versão no nome", () => {
  const r = build();
  assert.ok(r.out.endsWith(`aventura-matematica-v${VERSION}.html`));
  const html = readFileSync(r.out, "utf8");
  assert.ok(!html.includes('src="js/'), "não pode depender de arquivos externos");
  assert.ok(!/^\s*(import|export)\s/m.test(bundle()), "sobrou sintaxe de módulo");
  assert.ok(html.includes("<style>"));
});

test("main.js é o último módulo e todos os módulos entram no pacote", () => {
  const order = moduleOrder("js/main.js");
  assert.equal(order.at(-1), "js/main.js");
  for (const m of ["util", "config", "shapes", "challenges", "progress", "audio", "ui", "screens", "game", "ads", "account", "cloud", "sync", "cloud-config"]) {
    assert.ok(order.includes(`js/${m}.js`), `faltou js/${m}.js`);
  }
});

test("versão igual em package.json e config.js", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.version.startsWith(VERSION + "."), `${pkg.version} x ${VERSION}`);
});
