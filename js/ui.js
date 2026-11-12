// Navegação entre telas, janelas (overlay), avisos e efeitos visuais.
import { $, $$ } from "./dom.js";
import { pick, rnd } from "./util.js";
import { VERSION, HAT_E } from "./config.js";
import { P, totalStars, rank, currentPet } from "./progress.js";
import { renderMap, renderLevels, renderShop, renderSettings } from "./screens.js";
import { renderAccountBits } from "./account.js";

/** Estado da navegação. */
export const nav = { current: "home", previous: "home", region: 0 };

/** Mostra uma tela sem mexer no histórico de "voltar". */
export function showScreen(name) {
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "s-" + name));
  nav.current = name;
  refresh();
}

/** Vai para uma tela; "back" volta para a anterior. */
export function go(name) {
  if (name === "back") name = nav.previous;
  if (name !== nav.current && ["home", "map", "levels"].includes(nav.current)) nav.previous = nav.current;
  showScreen(name);
}

export function avatarHTML() {
  const pet = `<span style="font-size:.6em">${currentPet().e}</span>`;
  if (P.hat === "wizard") return `🧙${pet}`;
  const h = HAT_E[P.hat] || "";
  return `${h ? `<span class="hat">${h}</span>` : ""}🧒${pet}`;
}

/** Atualiza tudo o que depende do progresso na tela atual. */
export function refresh() {
  $$("[data-coins]").forEach((e) => (e.textContent = "🪙 " + P.coins));
  $$("[data-starsum]").forEach((e) => (e.textContent = "⭐ " + totalStars()));
  $("#home-coins").textContent = "🪙 " + P.coins;
  $$("[data-banner]").forEach((e) => e.classList.toggle("hidden", !P.settings.ads));
  ["#home-avatar", "#map-avatar", "#shop-avatar"].forEach((s) => ($(s).innerHTML = avatarHTML()));
  $("#home-rank").textContent = rank();
  $("#home-hello").textContent = P.name ? `Olá, ${P.name}! 👋` : "";
  $("#set-name").textContent = P.name || "definir";
  $("#app-version").textContent = VERSION;
  renderAccountBits();
  document.body.style.fontSize = P.settings.bigText ? "112%" : "";
  $$(".qtext").forEach((e) => (e.style.fontSize = P.settings.bigText ? "30px" : ""));
  if (nav.current === "map") renderMap();
  if (nav.current === "levels") renderLevels();
  if (nav.current === "shop") renderShop();
  if (nav.current === "settings") renderSettings();
}

/* ---------- janelas e avisos ---------- */

export function overlay(html) {
  $("#ov-panel").innerHTML = html;
  $("#ov").classList.add("active");
}
export function closeOverlay() {
  $("#ov").classList.remove("active");
}

let toastTimer;
export function toast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.style.opacity = 0), 2200);
}

/* ---------- efeitos ---------- */

export function confetti(n = 40) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.textContent = pick(["✨", "⭐", "🌟", "🎉", "💫", "🪙"]);
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    c.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3800);
  }
}

export function burst(el, n) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div");
    c.className = "spark";
    c.textContent = "✨";
    c.style.left = r.left + r.width / 2 + "px";
    c.style.top = r.top + r.height / 2 + "px";
    document.body.appendChild(c);
    requestAnimationFrame(() => {
      c.style.transform = `translate(${rnd(-80, 80)}px,${rnd(-90, 10)}px)`;
      c.style.opacity = 0;
    });
    setTimeout(() => c.remove(), 800);
  }
}

/** Fundo com estrelas piscando. */
export function drawStarsBackground() {
  const bg = $("#stars-bg");
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.animationDelay = Math.random() * 3 + "s";
    bg.appendChild(s);
  }
}
