// Prepara a pasta www/ que vai dentro dos apps de iPhone e Android (Capacitor).
// Copia só o que o jogo usa; sem dependências externas.
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WWW_FILES = ["index.html", "manifest.webmanifest", "css", "js", "icons", "fonts", "privacidade.html", "termos.html", "suporte.html"];

export function buildWww(out = join(ROOT, "www")) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of WWW_FILES) {
    const src = join(ROOT, f);
    if (!existsSync(src)) throw new Error(`Falta ${f}`);
    cpSync(src, join(out, f), { recursive: true });
  }
  // Dentro do app não usamos as fontes da internet: o app precisa abrir sem conexão.
  const idx = join(out, "index.html");
  const html = readFileSync(idx, "utf8")
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, "")
    .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, "");
  writeFileSync(idx, html);
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`✔ Pasta dos apps pronta: ${buildWww()}`);
}
