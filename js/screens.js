// Telas de menu: mapa, níveis, loja, configurações, nome do jogador e tutorial.
import { $, $$ } from "./dom.js";
import { rnd } from "./util.js";
import { REGIONS, LEVELS_PER_REGION, SHOP, HAT_E, COINS_TUTORIAL } from "./config.js";
import {
  P, saveProgress, resetProgress, isUnlocked, regionUnlocked, regionStars, starsOf,
  buyOrEquip, cleanName, playerName
} from "./progress.js";
import { sfx, speak } from "./audio.js";
import { nav, go, refresh, overlay, closeOverlay, toast, confetti } from "./ui.js";
import { startLevel } from "./game.js";

/* ---------- mapa e níveis ---------- */

export function renderMap() {
  const m = $("#map");
  m.innerHTML = "";
  REGIONS.forEach((R, r) => {
    const un = regionUnlocked(r);
    const b = document.createElement("button");
    b.className = "region" + (un ? "" : " locked");
    b.style.background = R.cor;
    b.innerHTML = `<span class="ico">${un ? R.ico : "🔒"}</span><span><div class="name">${R.nome}</div><div class="sub">${R.sub}</div></span><span class="prog">⭐ ${regionStars(r)}/${LEVELS_PER_REGION * 3}</span>`;
    b.onclick = () => {
      sfx.tap();
      if (!un) { toast("🔒 Termine a região anterior para abrir esta!"); return; }
      nav.region = r;
      go("levels");
    };
    m.appendChild(b);
  });
}

export function renderLevels() {
  const r = nav.region, R = REGIONS[r];
  $("#lv-title").textContent = R.ico + " " + R.nome;
  $("#lv-story").textContent = R.story;
  const g = $("#levels");
  g.innerHTML = "";
  for (let l = 0; l < LEVELS_PER_REGION; l++) {
    const un = isUnlocked(r, l), s = starsOf(r, l);
    const b = document.createElement("button");
    b.className = "lvl" + (un ? "" : " locked");
    b.innerHTML = `<span>${un ? "📜 " + (l + 1) : "🔒"}</span><span class="st">${"★".repeat(s)}${"☆".repeat(3 - s)}</span>`;
    b.onclick = () => {
      sfx.tap();
      if (!un) { toast("Complete o nível anterior primeiro!"); return; }
      startLevel(r, l);
    };
    g.appendChild(b);
  }
}

/* ---------- loja ---------- */

export function renderShop() {
  const g = $("#shop");
  g.innerHTML = "";
  SHOP.forEach((it) => {
    const own = P.owned.includes(it.id), eq = (it.tipo === "hat" ? P.hat : P.pet) === it.id;
    const d = document.createElement("div");
    d.className = "item" + (eq ? " eq" : "");
    d.innerHTML = `<div class="e">${it.tipo === "hat" && it.id !== "none" ? HAT_E[it.id] || it.e : it.e}</div><div class="n">${it.n}</div>
      <div style="font-size:13px;opacity:.7">${it.tipo === "hat" ? "Visual" : "Mascote ajudante"}</div>`;
    const b = document.createElement("button");
    b.className = "btn small" + (own ? " ghost" : "");
    b.textContent = eq ? "✔ Usando" : own ? "Usar" : `🪙 ${it.p}`;
    b.disabled = eq;
    b.onclick = () => {
      const res = buyOrEquip(it.id);
      if (!res.ok) { sfx.bad(); toast(`Faltam ${res.missing} 🪙. Jogue mais níveis!`); return; }
      if (res.bought) { sfx.coin(); confetti(12); toast("Novo item! 🎉"); } else sfx.tap();
      saveProgress();
      refresh();
    };
    d.appendChild(b);
    g.appendChild(d);
  });
}

/* ---------- configurações e área dos pais ---------- */

export function renderSettings() {
  $$("[data-set]").forEach((t) => t.classList.toggle("on", !!P.settings[t.dataset.set]));
}

/** Pede a um adulto para resolver uma multiplicação antes de continuar. */
export function parentGate(then) {
  const a = rnd(11, 19), b = rnd(11, 19);
  overlay(`<h2>👨‍👩‍👧 Área dos pais</h2><p>Para continuar, um adulto deve responder:</p><p style="font-size:30px;font-weight:800">${a} × ${b} = ?</p>
    <input id="pg" inputmode="numeric" class="pg-input">
    <div class="btncol"><button class="btn" id="pg-ok">Confirmar</button><button class="btn ghost" id="pg-no">Cancelar</button></div>`);
  $("#pg-ok").onclick = () => {
    if (parseInt($("#pg").value, 10) === a * b) { closeOverlay(); then(); }
    else { sfx.bad(); toast("Resposta incorreta."); }
  };
  $("#pg-no").onclick = closeOverlay;
}

export function bindSettings() {
  $$("[data-set]").forEach((t) => (t.onclick = () => {
    const k = t.dataset.set;
    const apply = () => { P.settings[k] = !P.settings[k]; saveProgress(); sfx.tap(); refresh(); };
    if (t.dataset.parent) parentGate(apply); else apply();
  }));
  $("#btn-reset").onclick = () => parentGate(() => {
    resetProgress(); saveProgress(); toast("Progresso apagado."); refresh();
  });
}

/* ---------- nome do jogador ---------- */

export function askName(then) {
  overlay(`<p style="font-size:64px;margin:0">🧙‍♂️</p><h2>Qual é o seu nome?</h2>
    <p>O Mago Sábio quer saber quem vai salvar o reino!</p>
    <input class="name-input" id="nm-in" maxlength="14" placeholder="Digite seu nome" autocomplete="off" value="${(P.name || "").replace(/"/g, "")}">
    <div class="btncol"><button class="btn" id="nm-ok">Pronto! ✨</button></div>`);
  const inp = $("#nm-in");
  setTimeout(() => { try { inp.focus(); } catch (e) { /* ok */ } }, 100);
  const ok = () => {
    const v = cleanName(inp.value);
    if (!v) { sfx.bad(); toast("Escreva seu nome 🙂"); return; }
    P.name = v; saveProgress(); sfx.ok(); closeOverlay(); refresh(); then();
  };
  $("#nm-ok").onclick = ok;
  inp.onkeydown = (e) => { if (e.key === "Enter") ok(); };
}

/* ---------- tutorial ---------- */

export function tutorial() {
  const steps = [
    ["🧙‍♂️", `Olá, ${playerName()}! Eu sou o Mago Sábio e você é meu novo aprendiz.`],
    ["😈", "O vilão Bagunço espalhou confusão e enigmas por todo o Reino Mágico!"],
    ["🦉", "Eu sou o Corujito! Vou te dar dicas quando você precisar. É só tocar em mim."],
    ["⭐", "Acerte os desafios para ganhar estrelas e moedas. Sem erros = 3 estrelas!"],
    ["🪄", "Pronto para salvar o reino? Vamos começar pela Floresta da Soma!"]
  ];
  let i = 0;
  const show = () => {
    const [e, t] = steps[i];
    overlay(`<p style="font-size:72px;margin:0">${e}</p><p style="font-size:21px">${t}</p>
      <div class="btncol"><button class="btn" id="tut-n">${i < steps.length - 1 ? "Continuar ▶" : "Vamos lá! 🚀"}</button></div>`);
    if (P.settings.voice) speak(t);
    $("#tut-n").onclick = () => {
      sfx.tap();
      i++;
      if (i < steps.length) { show(); return; }
      closeOverlay();
      const firstTime = !P.tutorialSeen;
      P.tutorialSeen = true;
      if (firstTime) { P.coins += COINS_TUTORIAL; toast(`+${COINS_TUTORIAL} 🪙 por completar o tutorial!`); }
      saveProgress();
      nav.region = 0;
      go("levels");
    };
  };
  show();
}
