// Efeitos sonoros (Web Audio) e leitura em voz alta (Speech Synthesis).
import { P } from "./progress.js";

let audioCtx = null;

function tone(freqs, dur = 0.12, type = "sine", gap = 0.09) {
  if (!P.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.value = f;
      const t = audioCtx.currentTime + i * gap;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    });
  } catch (e) { /* áudio indisponível */ }
}

export const sfx = {
  tap: () => tone([660], 0.06, "triangle"),
  ok: () => tone([523, 659, 784], 0.16, "triangle"),
  bad: () => tone([220, 180], 0.18, "sawtooth", 0.12),
  win: () => tone([523, 659, 784, 1047, 1319], 0.2, "triangle", 0.11),
  coin: () => tone([988, 1319], 0.1, "square", 0.07)
};

/** Transforma símbolos matemáticos em palavras para a voz. */
export function toSpeech(text) {
  return String(text)
    .replace(/[^\p{L}\p{N}\s?.,!+\-−=]/gu, " ")
    .replace(/\+/g, " mais ").replace(/[-−]/g, " menos ")
    .replace(/=/g, " é igual a ").replace(/\?/g, " quanto? ");
}

export function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(toSpeech(text));
    u.lang = "pt-BR"; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* voz indisponível */ }
}
