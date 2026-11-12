// Uma fase em andamento: perguntas, respostas, corações, dicas, vitória e derrota.
import { $, $$ } from "./dom.js";
import { pick, rep } from "./util.js";
import { REGIONS, QUESTIONS_PER_LEVEL, MAX_LIVES } from "./config.js";
import { generateChallenge } from "./challenges.js";
import { P, saveProgress, recordLevelWin, currentPet, playerName } from "./progress.js";
import { sfx, speak } from "./audio.js";
import { nav, go, showScreen, overlay, closeOverlay, confetti, burst } from "./ui.js";
import { maybeInterstitial } from "./ads.js";

/** Estado da fase atual (null fora do jogo). */
export const play = { G: null, hintTimer: null };

export function startLevel(r, l) {
  play.G = { r, l, q: 0, lives: MAX_LIVES, mistakes: 0, current: null, locked: false };
  go("game");
  $("#g-label").textContent = `${REGIONS[r].ico} Nível ${l + 1}`;
  nextQuestion();
}

function livesText(lives) {
  const n = Math.max(0, lives);
  return rep("❤️", n) + rep("🤍", MAX_LIVES - n);
}

function say(t) { $("#g-bubble").textContent = t; }

/** Texto da pergunta + parte visual, pronto para ser lido em voz alta. */
export function questionSpeech(q) {
  const d = document.createElement("div");
  d.innerHTML = q.visual;
  const visual = q.speech || d.textContent.replace(/❓/g, "qual número").replace(/−/g, "-");
  return q.text + ". " + visual;
}

function nextQuestion() {
  const G = play.G;
  clearTimeout(play.hintTimer);
  if (G.q >= QUESTIONS_PER_LEVEL) return winLevel();
  const q = generateChallenge(G.r, G.l + 1);
  G.current = q; G.locked = false;
  $("#g-prog").style.width = (G.q / QUESTIONS_PER_LEVEL) * 100 + "%";
  $("#g-lives").textContent = livesText(G.lives);
  $("#g-text").textContent = q.text;
  const v = $("#g-visual");
  v.innerHTML = q.visual;
  v.className = "qvisual" + (q.eq ? " eq" : "");
  const o = $("#g-options");
  o.innerHTML = "";
  o.style.gridTemplateColumns = q.options.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr";
  q.options.forEach((op) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = op.label;
    b.dataset.v = op.value;
    b.onclick = () => answer(b, op.value);
    o.appendChild(b);
  });
  $("#g-mascot").textContent = currentPet().e;
  const nm = playerName();
  say(pick([`Você consegue, ${nm}! ✨`, "Pense com calma…", `Vamos lá, ${nm}!`, "Use sua magia matemática!"]));
  play.hintTimer = setTimeout(() => say("Precisa de ajuda? Toque em mim! 💡"), 12000);
  if (P.settings.voice) speak(questionSpeech(q));
}

function answer(btn, val) {
  const G = play.G;
  if (G.locked) return;
  const q = G.current;
  if (String(val) === String(q.answer)) {
    G.locked = true;
    btn.classList.add("right"); sfx.ok(); burst(btn, 6);
    const nm = playerName();
    say(pick(["Isso! Feitiço perfeito! 🌟", `Uau, ${nm}, mandou bem! 🎉`, "Magia certeira! ✨", `Excelente, ${nm}! 🧙`]));
    G.q++;
    setTimeout(nextQuestion, 900);
  } else {
    btn.classList.add("wrong"); sfx.bad();
    G.mistakes++; G.lives--;
    setTimeout(() => { btn.classList.remove("wrong"); btn.classList.add("gone"); }, 380);
    $("#g-lives").textContent = livesText(G.lives);
    if (G.lives <= 0) { G.locked = true; setTimeout(loseLevel, 600); return; }
    say("Quase! 💡 " + q.hint);
  }
}

/** Dica do mascote: mostra a dica e some com uma alternativa errada. */
export function giveHint() {
  const G = play.G;
  if (!G || nav.current !== "game" || G.locked) return;
  sfx.tap();
  say("💡 " + G.current.hint);
  const wrong = $$("#g-options .opt:not(.gone)").filter((b) => String(b.dataset.v) !== String(G.current.answer));
  if (wrong.length > 1) pick(wrong).classList.add("gone");
  if (P.settings.voice) speak(G.current.hint);
}

export function speakCurrentQuestion() {
  if (play.G && play.G.current) speak(questionSpeech(play.G.current));
}

function winLevel() {
  const G = play.G;
  clearTimeout(play.hintTimer);
  $("#g-prog").style.width = "100%";
  const res = recordLevelWin(G.r, G.l, G.mistakes);
  saveProgress();
  sfx.win(); confetti();
  const nm = playerName();
  const nextRegion = res.regionUnlocked !== null ? REGIONS[res.regionUnlocked] : null;
  overlay(`
    <h2>${res.gameCompleted ? `🏆 ${nm}, você salvou o reino!` : `Muito bem, ${nm}!`}</h2><p style="margin:0">Nível concluído!</p>
    <div class="bigstars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
    <p><b>+${res.coins} 🪙</b>${res.firstTime ? " (inclui bônus de primeira vez!)" : ""}</p>
    ${nextRegion ? `<p>🎉 Nova região desbloqueada: <b>${nextRegion.ico} ${nextRegion.nome}</b>!</p>` : ""}
    ${res.gameCompleted ? `<p>O Bagunço foi derrotado e o Reino Mágico voltou a ficar em ordem. Você é um verdadeiro Mago da Matemática! 🧙‍♂️✨</p>` : ""}
    <p style="font-size:16px">${res.stars < 3 ? "Dica: jogue de novo sem errar para ganhar 3 estrelas!" : "Perfeito, nenhum erro!"}</p>
    <div class="btncol">
      ${res.hasNext ? `<button class="btn" id="ov-next">Próximo ▶</button>` : ""}
      <div class="row"><button class="btn ghost" id="ov-retry" style="flex:1">🔁 Repetir</button><button class="btn ghost" id="ov-map" style="flex:1">🗺️ Mapa</button></div>
    </div>`);
  $$("#ov .bigstars span").forEach((s, i) =>
    setTimeout(() => { if (i < res.stars) { s.classList.add("on"); sfx.coin(); } }, 350 + i * 350));
  const after = (fn) => () => { closeOverlay(); maybeInterstitial(fn); };
  if (res.hasNext) $("#ov-next").onclick = after(() => { nav.region = res.next.r; startLevel(res.next.r, res.next.l); });
  $("#ov-retry").onclick = after(() => startLevel(G.r, G.l));
  $("#ov-map").onclick = after(() => go("map"));
}

function loseLevel() {
  const G = play.G;
  overlay(`<h2>Ops! Acabaram os corações 💔</h2>
    <p style="font-size:48px">${currentPet().e}</p>
    <p>Tudo bem errar, é assim que a gente aprende! Vamos tentar de novo?</p>
    <div class="btncol"><button class="btn" id="ov-retry">🔁 Tentar de novo</button><button class="btn ghost" id="ov-map">🗺️ Mapa</button></div>`);
  $("#ov-retry").onclick = () => { closeOverlay(); startLevel(G.r, G.l); };
  $("#ov-map").onclick = () => { closeOverlay(); go("levels"); };
}

export function pauseGame() {
  const G = play.G;
  clearTimeout(play.hintTimer);
  overlay(`<h2>⏸ Pausa</h2><p>${pick(["Sabia? Somar é juntar, subtrair é tirar!", "Um triângulo sempre tem 3 lados.", "Números pares terminam em 0, 2, 4, 6 ou 8.", "Contar nos dedos é um ótimo truque!"])}</p>
    <div class="btncol"><button class="btn" id="ov-cont">▶ Continuar</button><button class="btn ghost" id="ov-retry">🔁 Reiniciar nível</button>
    <button class="btn ghost" id="ov-quit">🚪 Sair do nível</button><button class="btn ghost" id="ov-set">⚙️ Configurações</button></div>`);
  $("#ov-cont").onclick = () => closeOverlay();
  $("#ov-retry").onclick = () => { closeOverlay(); startLevel(G.r, G.l); };
  $("#ov-quit").onclick = () => { closeOverlay(); go("levels"); };
  $("#ov-set").onclick = () => { closeOverlay(); nav.previous = "game"; showScreen("settings"); };
}
