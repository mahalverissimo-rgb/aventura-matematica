import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const PAGES = ["privacidade.html", "termos.html", "suporte.html"];

test("páginas legais existem, têm contato e se ligam entre si", () => {
  for (const p of PAGES) {
    const h = read(p);
    assert.match(h, /suporte@veritech\.me/, `${p} sem e-mail de contato`);
    assert.match(h, /Veritech/, `${p} sem responsável`);
    assert.match(h, /href="\.\/"/, `${p} sem link de volta ao jogo`);
    for (const q of PAGES) assert.ok(h.includes(`href="${q}`), `${p} não liga para ${q}`);
    assert.match(h, /<html lang="pt-BR">/);
  }
});

test("página de exclusão de conta acessível pela web (exigência do Google Play)", () => {
  const h = read("suporte.html");
  assert.match(h, /id="excluir-conta"/);
  assert.match(h, /Apagar conta e todos os dados/);
  assert.match(h, /mailto:suporte@veritech\.me\?subject=Excluir/);
});

test("política descreve exatamente os dados usados", () => {
  const h = read("privacidade.html");
  for (const t of ["E-mail", "Apelido", "Progresso no jogo", "Supabase", "Resend", "GitHub", "art. 14", "ANPD", "15 dias", "30 dias", "perfilamento"]) {
    assert.ok(h.includes(t), `política não menciona: ${t}`);
  }
});

test("nada é carregado de terceiros (fontes, scripts)", () => {
  const files = ["index.html", "css/style.css", "css/paginas.css", ...PAGES, ...readdirSync(new URL("../js/", import.meta.url)).map((f) => "js/" + f)];
  for (const f of files) {
    const s = read(f);
    assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(s), `${f} usa fontes do Google`);
    assert.ok(!/<script[^>]+src="https?:/.test(s), `${f} carrega script externo`);
  }
});

test("jogo liga para as páginas e o consentimento é obrigatório", () => {
  assert.match(read("index.html"), /href="privacidade.html"/);
  const acc = read("js/account.js");
  assert.match(acc, /id="acc-consent"/);
  assert.match(acc, /consent_version/);
});

test("app de celular e modo sem internet incluem as páginas e a fonte", () => {
  const sw = read("sw.js");
  for (const f of [...PAGES, "css/paginas.css", "fonts/baloo2.woff"]) assert.ok(sw.includes(`"${f}"`), `sw.js sem ${f}`);
  const www = read("scripts/build-www.mjs");
  for (const f of [...PAGES, "fonts"]) assert.ok(www.includes(`"${f}"`), `build-www sem ${f}`);
});
