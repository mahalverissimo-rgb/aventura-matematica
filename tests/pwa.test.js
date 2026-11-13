import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { VERSION } from "../js/config.js";
import { buildWww, WWW_FILES } from "../scripts/build-www.mjs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("service worker: mesma versão do jogo", () => {
  const sw = read("sw.js");
  assert.equal(sw.match(/const VERSION = "([^"]+)"/)[1], VERSION);
});

test("service worker guarda todos os arquivos do jogo", () => {
  const sw = read("sw.js");
  const jsFiles = readdirSync(new URL("../js/", import.meta.url)).filter((f) => f.endsWith(".js"));
  for (const f of jsFiles) assert.ok(sw.includes(`"js/${f}"`), `sw.js não guarda js/${f}`);
  for (const f of ["index.html", "css/style.css", "manifest.webmanifest"]) assert.ok(sw.includes(`"${f}"`), f);
  for (const m of sw.match(/"((?:fonts|css)\/[^"]+|[a-z]+\.html)"/g)) assert.ok(existsSync(new URL("../" + m.slice(1, -1), import.meta.url)), `falta ${m}`);
  for (const m of sw.match(/"(icons\/[^"]+)"/g)) assert.ok(existsSync(new URL("../" + m.slice(1, -1), import.meta.url)), `falta ${m}`);
});

test("manifesto do app instalável é válido e os ícones existem", () => {
  const m = JSON.parse(read("manifest.webmanifest"));
  assert.equal(m.display, "standalone");
  assert.equal(m.lang, "pt-BR");
  assert.ok(m.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  for (const i of m.icons) assert.ok(existsSync(new URL("../" + i.src, import.meta.url)), `falta ${i.src}`);
  const html = read("index.html");
  assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-touch-icon/);
});

test("pasta dos apps (www) tem tudo e não depende de fontes da internet", () => {
  // (a partir da v1.5 a fonte vem junto do jogo)
  const out = buildWww(mkdtempSync(join(tmpdir(), "www-")));
  for (const f of WWW_FILES) assert.ok(existsSync(join(out, f)), f);
  const html = readFileSync(join(out, "index.html"), "utf8");
  assert.ok(!html.includes("fonts.googleapis.com"));
  assert.ok(html.includes('src="js/main.js"'));
});

test("configuração do Capacitor", () => {
  const c = JSON.parse(read("capacitor.config.json"));
  assert.equal(c.webDir, "www");
  assert.match(c.appId, /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/);
  assert.equal(c.appName, "Aventura Matemágica");
});

test("imagens para ícones e tela de abertura dos apps", () => {
  for (const f of ["icon-only.png", "icon-foreground.png", "icon-background.png", "splash.png", "splash-dark.png"]) {
    assert.ok(existsSync(new URL("../assets/" + f, import.meta.url)), `falta assets/${f}`);
  }
});
