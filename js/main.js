// Ponto de entrada: carrega o progresso, liga os botões e mostra a tela inicial.
import { $, $$ } from "./dom.js";
import { GEN } from "./challenges.js";
import { REGIONS, VERSION } from "./config.js";
import { P, loadProgress } from "./progress.js";
import { sfx } from "./audio.js";
import { nav, go, showScreen, refresh, drawStarsBackground } from "./ui.js";
import { askName, tutorial, bindSettings } from "./screens.js";
import { play, startLevel, giveHint, pauseGame, speakCurrentQuestion } from "./game.js";
import { rewardedAd } from "./ads.js";
import { initAccount, afterStart, openAccount, chooserPanel, account } from "./account.js";

function startPlaying() {
  if (!P.tutorialSeen) tutorial(); else go("map");
}

function bindEvents() {
  $("#btn-play").onclick = () => { sfx.tap(); if (!P.name) askName(startPlaying); else startPlaying(); };
  $("#btn-name").onclick = () => { sfx.tap(); askName(() => {}); };
  $("#btn-shop-home").onclick = () => { sfx.tap(); go("shop"); };
  $("#btn-settings-home").onclick = () => { sfx.tap(); go("settings"); };
  $("#btn-help").onclick = () => { sfx.tap(); tutorial(); };
  $("#btn-pause").onclick = () => { sfx.tap(); pauseGame(); };
  $("#btn-speak").onclick = speakCurrentQuestion;
  $("#g-mascot").onclick = giveHint;
  $("#btn-reward").onclick = () => { sfx.tap(); rewardedAd(); };
  $("#btn-account").onclick = () => { sfx.tap(); openAccount(); };
  $("#btn-switch").onclick = () => { sfx.tap(); chooserPanel(); };
  $$("[data-go]").forEach((b) => (b.onclick = () => {
    sfx.tap();
    const t = b.dataset.go;
    // Configurações abertas pela pausa: "Voltar" retorna ao jogo.
    if (t === "back" && nav.previous === "game") { nav.previous = "levels"; showScreen("game"); return; }
    go(t);
  }));
  bindSettings();
}

drawStarsBackground();
bindEvents();
const start = initAccount();
loadProgress();
refresh();
afterStart(start);

// Acesso para os testes automatizados (tests/e2e).
window.__AM = { VERSION, GEN, REGIONS, P: () => P, G: () => play.G, startLevel, account };
