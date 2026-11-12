// Integração com o aparelho: app de iPhone/Android (Capacitor) e app instalado pelo navegador (PWA).
import { $ } from "./dom.js";
import { nav, go, closeOverlay, showScreen } from "./ui.js";

/** true quando roda dentro do app de iPhone ou Android. */
export function isNativeApp() {
  try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch (e) { return false; }
}

/** Para onde o botão "voltar" do Android leva, a partir de cada tela. */
const BACK_TARGET = { map: "home", levels: "map", shop: "back", settings: "back" };

/**
 * Botão "voltar" do Android:
 * janela aberta → fecha; jogo → volta aos níveis; outras telas → tela anterior; tela inicial → sai do app.
 * Devolve o que fez (usado nos testes).
 */
export function handleBackButton() {
  const ov = $("#ov");
  if (ov && ov.classList.contains("active")) {
    // Janelas com contagem (anúncio simulado) ou de escolha obrigatória não fecham pelo voltar.
    if (!$("#cd")) { closeOverlay(); return "overlay"; }
    return "ignored";
  }
  if (nav.current === "game") { go("levels"); return "levels"; }
  if (nav.current === "settings" && nav.previous === "game") { nav.previous = "levels"; showScreen("game"); return "game"; }
  const target = BACK_TARGET[nav.current];
  if (target) { go(target); return target; }
  try { window.Capacitor.Plugins.App.exitApp(); } catch (e) { /* fora do app */ }
  return "exit";
}

export function initNative() {
  if (isNativeApp()) {
    document.documentElement.classList.add("native-app");
    try {
      window.Capacitor.Plugins.App.addListener("backButton", handleBackButton);
    } catch (e) { /* plugin indisponível */ }
    return;
  }
  // Navegador: registra o service worker para funcionar sem internet (só em http/https).
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* sem modo offline */ });
    });
  }
}
