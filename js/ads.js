// Anúncios SIMULADOS (modo teste). Nada real é carregado.
// Ver docs/ARQUITETURA.md: para a versão de lojas, a monetização deve ser revista.
import { $ } from "./dom.js";
import { INTERSTITIAL_EVERY, COINS_REWARDED_AD } from "./config.js";
import { P, saveProgress } from "./progress.js";
import { sfx } from "./audio.js";
import { overlay, closeOverlay, toast, refresh } from "./ui.js";

function countdownOverlay(html, skipLabel, onEnd, onSkip) {
  let t = 5;
  overlay(`${html}<div class="countdown" id="cd">${t}</div><button class="btn ghost" id="ov-skip">${skipLabel}</button>`);
  const iv = setInterval(() => {
    t--;
    const c = $("#cd");
    if (c) c.textContent = t;
    if (t <= 0) { clearInterval(iv); closeOverlay(); onEnd(); }
  }, 1000);
  $("#ov-skip").onclick = () => { clearInterval(iv); closeOverlay(); onSkip(); };
}

/** Vídeo entre fases a cada INTERSTITIAL_EVERY níveis concluídos. */
export function maybeInterstitial(then) {
  if (!P.settings.ads || P.levelsDone % INTERSTITIAL_EVERY !== 0) { then(); return; }
  countdownOverlay(`<p style="font-size:15px;opacity:.7">ANÚNCIO DE TESTE · entre fases</p>
    <div class="fakead">📺<br>Aqui apareceria um vídeo curto<br>apropriado para crianças.</div>`, "Pular ⏭", then, then);
}

/** Vídeo recompensado opcional (Loja). */
export function rewardedAd() {
  if (!P.settings.ads) { toast("Os anúncios estão desligados na área dos pais."); return; }
  countdownOverlay(`<p style="font-size:15px;opacity:.7">VÍDEO RECOMPENSADO DE TESTE</p>
    <div class="fakead">🎬<br>Assista até o fim para ganhar moedas!</div>`, "Desistir",
    () => { P.coins += COINS_REWARDED_AD; saveProgress(); sfx.coin(); toast(`+${COINS_REWARDED_AD} 🪙 ganhas!`); refresh(); },
    () => {});
}
