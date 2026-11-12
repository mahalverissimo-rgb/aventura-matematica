// Gera um único arquivo HTML (CSS + JS embutidos), que abre com dois cliques,
// sem servidor e sem internet: dist/aventura-matematica-v<versão>.html
// Não usa nenhuma dependência externa.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const IMPORT_RE = /^import\s*\{[^}]*\}\s*from\s*["'](\.\/[^"']+)["'];?\s*$/gm;

/** Ordena os módulos: dependências antes de quem as usa. */
export function moduleOrder(entry) {
  const order = [], seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = read(file);
    for (const m of src.matchAll(IMPORT_RE)) visit(join(dirname(file), m[1]));
    order.push(file);
  };
  visit(entry);
  return order;
}

/** Nomes declarados no topo de um módulo (para detectar conflitos). */
export function topLevelNames(src) {
  const names = [];
  for (const line of src.split("\n")) {
    const m = line.match(/^(?:export\s+)?(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/);
    if (m) names.push(m[1]);
  }
  return names;
}

export function bundle(entry = "js/main.js") {
  const files = moduleOrder(entry);
  const owner = new Map();
  const parts = [];
  for (const f of files) {
    const src = read(f);
    for (const n of topLevelNames(src)) {
      if (owner.has(n)) throw new Error(`Nome "${n}" declarado em ${owner.get(n)} e em ${f}. Renomeie um deles.`);
      owner.set(n, f);
    }
    const body = src.replace(IMPORT_RE, "").replace(/^export\s+/gm, "");
    if (/^\s*(import|export)\b/m.test(body)) throw new Error(`Sintaxe de módulo não suportada em ${f} (use "import { ... } from './x.js';").`);
    parts.push(`// ===== ${f} =====\n${body.trim()}\n`);
  }
  return `(function(){\n"use strict";\n${parts.join("\n")}})();`;
}

export function build() {
  const version = (read("js/config.js").match(/VERSION\s*=\s*"([^"]+)"/) || [])[1];
  if (!version) throw new Error("VERSION não encontrada em js/config.js");
  let html = read("index.html");
  const css = read("css/style.css");
  html = html.replace(/<link rel="stylesheet" href="css\/style\.css">/, () => `<style>\n${css}</style>`);
  html = html.replace(/<script type="module" src="js\/main\.js"><\/script>/, () => `<script>\n${bundle()}\n</script>`);
  if (html.includes('src="js/') || html.includes('href="css/')) throw new Error("index.html ainda referencia arquivos externos");
  mkdirSync(join(ROOT, "dist"), { recursive: true });
  const out = join(ROOT, "dist", `aventura-matematica-v${version}.html`);
  writeFileSync(out, html);
  return { out, version, bytes: Buffer.byteLength(html) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = build();
  console.log(`✔ Gerado ${r.out} (${(r.bytes / 1024).toFixed(1)} KB, versão ${r.version})`);
}
