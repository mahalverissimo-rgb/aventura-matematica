// Conta da família: login do responsável, perfis das crianças e sincronização com a nuvem.
// Sem conta, o jogo funciona como antes (progresso só no aparelho).
import { $, $$ } from "./dom.js";
import { CLOUD_URL, CLOUD_KEY, CLOUD_REDIRECT } from "./cloud-config.js";
import { createCloud } from "./cloud.js";
import { mergeProgress, sameProgress, hasMeaningfulProgress } from "./sync.js";
import {
  P, SAVE_KEY, defaultProgress, loadProgress, saveProgress, readSaved, applyProgress,
  normalizeProgress, setActiveSaveKey, profileSaveKey, onProgressSaved, cleanName
} from "./progress.js";
import { sfx } from "./audio.js";
import { go, refresh, overlay, closeOverlay, toast } from "./ui.js";
import { parentGate } from "./screens.js";

const ACTIVE_PROFILE_KEY = "aventura-matemagica-perfil-ativo";
const GUEST_IMPORTED_KEY = "aventura-matemagica-convidado-importado";
const MAX_PROFILES = 6;
const PUSH_DELAY_MS = 1200;

/** Estado da conta (null/vazio = sem conta). */
export const account = { cloud: null, profiles: [], activeId: null, status: "", pending: false, pushTimer: null };

const STATUS_TEXT = {
  synced: "✓ Progresso salvo na nuvem",
  saving: "☁️ Salvando na nuvem…",
  offline: "📴 Sem internet: o progresso fica no aparelho e sincroniza depois",
  relogin: "🔑 Entre de novo na conta para continuar sincronizando",
  error: "⚠️ Não foi possível sincronizar agora"
};

function localStore() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}
function getLocal(k) { try { return localStore().getItem(k); } catch (e) { return null; } }
function setLocal(k, v) { try { if (v === null) localStore().removeItem(k); else localStore().setItem(k, v); } catch (e) { /* ok */ } }

/** Escapa texto para colocar dentro do HTML das janelas. */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const signedIn = () => !!(account.cloud && account.cloud.signedIn);
const activeProfile = () => account.profiles.find((p) => p.id === account.activeId) || null;
const profileStars = (p) => Object.values(normalizeProgress(p.progress).stars).reduce((a, b) => a + b, 0);

function setStatus(s) {
  account.status = s;
  renderAccountBits();
}

/* ---------- início ---------- */

/**
 * Prepara a conta antes de carregar o progresso.
 * Devolve { justLoggedIn } — true quando o jogo abriu pelo link do e-mail.
 */
export function initAccount(options = {}) {
  account.cloud = createCloud(Object.assign({ url: CLOUD_URL, key: CLOUD_KEY }, options));
  let justLoggedIn = false;
  const hash = (typeof location !== "undefined" && location.hash) || "";
  if (/access_token=|error_description=/.test(hash)) {
    try { justLoggedIn = account.cloud.useAuthHash(hash); }
    catch (e) { setTimeout(() => toast("O link de acesso expirou. Peça um novo e-mail."), 300); }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ok */ }
  }
  if (signedIn()) {
    account.activeId = getLocal(ACTIVE_PROFILE_KEY);
    if (account.activeId) setActiveSaveKey(profileSaveKey(account.activeId));
  }
  onProgressSaved(schedulePush);
  if (typeof window !== "undefined") window.addEventListener("online", () => { if (account.pending) pushNow(); });
  return { justLoggedIn };
}

/** Depois que o jogo carregou: sincroniza ou abre a escolha de jogador. */
export async function afterStart({ justLoggedIn }) {
  if (justLoggedIn) { await afterLogin(); return; }
  if (signedIn()) await syncNow();
}

/* ---------- sincronização ---------- */

function schedulePush() {
  if (!signedIn() || !account.activeId) return;
  account.pending = true;
  setStatus("saving");
  clearTimeout(account.pushTimer);
  account.pushTimer = setTimeout(pushNow, PUSH_DELAY_MS);
}

/** Envia agora o progresso do perfil ativo para a nuvem. */
export async function pushNow() {
  clearTimeout(account.pushTimer);
  if (!account.pending || !signedIn() || !account.activeId) return;
  account.pending = false;
  const prof = activeProfile();
  const snapshot = JSON.parse(JSON.stringify(P));
  try {
    const row = await account.cloud.updateProfile(account.activeId, { name: P.name || (prof && prof.name) || "Jogador", progress: snapshot });
    if (prof) Object.assign(prof, row);
    if (!account.pending) setStatus("synced");
  } catch (e) {
    account.pending = true;
    handleSyncError(e);
  }
}

function handleSyncError(e) {
  if (e.code === "offline") setStatus("offline");
  else if (e.status === 401) setStatus("relogin");
  else if (e.status === 404) {
    // o perfil foi apagado em outro aparelho
    account.pending = false;
    detachToGuest();
    toast("Este jogador foi removido da conta em outro aparelho.");
  } else setStatus("error");
}

async function loadProfiles() {
  account.profiles = (await account.cloud.listProfiles()) || [];
  return account.profiles;
}

/** Busca a nuvem, junta com o aparelho e envia de volta o que for novo. */
export async function syncNow() {
  if (!signedIn()) return;
  try {
    await loadProfiles();
    renderAccountBits();
    if (!account.activeId) return;
    const remote = activeProfile();
    if (!remote) { detachToGuest(); toast("Este jogador não está mais na conta."); return; }
    const merged = mergeProgress(P, remote.progress);
    if (!merged.name) merged.name = remote.name;
    if (!sameProgress(merged, P)) {
      applyProgress(merged);
      saveProgress(undefined, { silent: true });
      refresh();
    }
    if (!sameProgress(merged, remote.progress)) { account.pending = true; await pushNow(); }
    else setStatus("synced");
  } catch (e) {
    handleSyncError(e);
  }
}

/* ---------- perfis ---------- */

/** Passa a jogar com um perfil da conta. */
export async function selectProfile(profile) {
  await pushNow();
  account.activeId = profile.id;
  setLocal(ACTIVE_PROFILE_KEY, profile.id);
  setActiveSaveKey(profileSaveKey(profile.id));
  const local = readSaved();
  const merged = local ? mergeProgress(local, profile.progress) : normalizeProgress(profile.progress);
  if (!merged.name) merged.name = profile.name;
  applyProgress(merged);
  saveProgress(undefined, { silent: true });
  refresh();
  if (!sameProgress(merged, profile.progress)) { account.pending = true; await pushNow(); }
  else setStatus("synced");
}

async function createProfile(name, progress) {
  const prog = normalizeProgress(progress);
  prog.name = name;
  prog.savedAt = prog.savedAt || Date.now();
  const row = await account.cloud.createProfile(name, prog);
  account.profiles.push(row);
  return row;
}

/** Guarda na conta o progresso que já existia no aparelho (sem conta). */
export async function importGuest() {
  const guest = readSaved(localStore(), SAVE_KEY) || defaultProgress();
  const row = await createProfile(guest.name || "Jogador", guest);
  setLocal(GUEST_IMPORTED_KEY, "1");
  await selectProfile(row);
  return row;
}

/** Cria um jogador novo (começa do zero, com tutorial). */
export async function newProfile(name) {
  const base = defaultProgress();
  base.settings = Object.assign({}, P.settings);
  const row = await createProfile(name, base);
  await selectProfile(row);
  return row;
}

/** Volta a jogar sem conta (progresso do aparelho). */
function detachToGuest() {
  account.activeId = null;
  setLocal(ACTIVE_PROFILE_KEY, null);
  setActiveSaveKey(null);
  loadProgress();
  setStatus("");
  refresh();
}

export async function signOutAccount() {
  await pushNow();
  await account.cloud.signOut();
  account.profiles = [];
  detachToGuest();
}

function clearProfileCaches() {
  const st = localStore();
  if (!st) return;
  try {
    const prefix = profileSaveKey("");
    for (let i = st.length - 1; i >= 0; i--) {
      const k = st.key(i);
      if (k && k.startsWith(prefix)) st.removeItem(k);
    }
  } catch (e) { /* ok */ }
}

export async function deleteAccountAndData() {
  await account.cloud.deleteAccount();
  clearProfileCaches();
  setLocal(GUEST_IMPORTED_KEY, null);
  account.profiles = [];
  detachToGuest();
}

async function removeProfile(p) {
  await account.cloud.deleteProfile(p.id);
  account.profiles = account.profiles.filter((x) => x.id !== p.id);
  setLocal(profileSaveKey(p.id), null);
  if (p.id === account.activeId) detachToGuest();
}

/* ---------- telas ---------- */

/** Atualiza botões e textos ligados à conta (chamado por refresh()). */
export function renderAccountBits() {
  const lbl = $("#acc-label");
  if (!lbl) return;
  lbl.textContent = signedIn() ? "Gerenciar" : "Entrar";
  $("#sync-status").textContent = signedIn() ? (STATUS_TEXT[account.status] || (account.activeId ? "" : "Escolha um jogador da conta")) : "";
  const sw = $("#btn-switch");
  if (sw) sw.hidden = !(signedIn() && account.profiles.length > 1);
  const cloud = $("#home-cloud");
  if (cloud) cloud.textContent = signedIn() && account.activeId ? (account.status === "offline" ? "📴" : "☁️") : "";
}

function friendlyError(e) {
  if (e.code === "offline") return "Sem internet. Tente de novo quando estiver conectado.";
  if (e.status === 429 || /rate limit/i.test(e.message)) return "Muitos e-mails em pouco tempo. Espere alguns minutos e tente de novo.";
  if (/not authorized/i.test(e.message)) return "Este e-mail ainda não pode receber o acesso: o envio de e-mails do jogo está em modo de teste.";
  if (/expired|invalid/i.test(e.message)) return "Código inválido ou vencido. Peça um novo e-mail.";
  if (/Limite de 6/.test(e.message)) return "A conta já tem 6 jogadores.";
  return "Algo deu errado: " + e.message;
}

/** Botão "Conta da família" nas Configurações (protegido pela Área dos Pais). */
export function openAccount() {
  parentGate(() => (signedIn() ? managePanel() : loginPanel()));
}

function redirectUrl() {
  return /^https?:$/.test(location.protocol) ? location.origin + location.pathname : CLOUD_REDIRECT;
}

function loginPanel() {
  overlay(`<p style="font-size:56px;margin:0">☁️</p><h2>Conta da família</h2>
    <p>Com uma conta, o progresso das crianças fica salvo na nuvem e continua em qualquer aparelho.</p>
    <p class="acc-note">A conta é do adulto responsável. Das crianças guardamos só o apelido e o progresso no jogo. Sem senha: você entra pelo link que chega no e-mail.</p>
    <input class="name-input" id="acc-email" type="email" inputmode="email" autocomplete="email" placeholder="seu e-mail">
    <div class="btncol"><button class="btn" id="acc-send">📧 Enviar e-mail de acesso</button><button class="btn ghost" id="acc-cancel">Cancelar</button></div>`);
  const inp = $("#acc-email");
  $("#acc-cancel").onclick = closeOverlay;
  $("#acc-send").onclick = async () => {
    const email = inp.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { sfx.bad(); toast("Digite um e-mail válido."); return; }
    const btn = $("#acc-send");
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      await account.cloud.sendLoginEmail(email, redirectUrl());
      codePanel(email);
    } catch (e) {
      btn.disabled = false; btn.textContent = "📧 Enviar e-mail de acesso";
      sfx.bad(); toast(friendlyError(e));
    }
  };
}

function codePanel(email) {
  overlay(`<p style="font-size:56px;margin:0">📧</p><h2>Confira seu e-mail</h2>
    <p>Enviamos um e-mail para <b>${esc(email)}</b>.</p>
    <p>Abra o e-mail <b>neste aparelho</b> e toque no link de acesso. O jogo vai abrir já conectado.</p>
    <p class="acc-note">Se o e-mail trouxer um código de números, digite aqui:</p>
    <input class="name-input" id="acc-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="código">
    <div class="btncol"><button class="btn" id="acc-verify">Entrar com o código</button><button class="btn ghost" id="acc-back">Voltar</button></div>`);
  $("#acc-back").onclick = loginPanel;
  $("#acc-verify").onclick = async () => {
    const code = $("#acc-code").value.replace(/\D/g, "");
    if (code.length < 6) { sfx.bad(); toast("O código tem 6 dígitos ou mais."); return; }
    try {
      await account.cloud.verifyCode(email, code);
      sfx.ok();
      await afterLogin();
    } catch (e) { sfx.bad(); toast(friendlyError(e)); }
  };
}

async function afterLogin() {
  try {
    await loadProfiles();
  } catch (e) { toast(friendlyError(e)); return; }
  renderAccountBits();
  toast("Conta conectada! ☁️");
  chooserPanel({ parent: true });
}

/**
 * "Quem vai jogar?" — lista os jogadores da conta.
 * parent=true (Área dos Pais / logo após entrar) mostra também criar e importar.
 */
export function chooserPanel({ parent = false } = {}) {
  const guest = readSaved(localStore(), SAVE_KEY);
  const canImport = parent && guest && hasMeaningfulProgress(guest) && !getLocal(GUEST_IMPORTED_KEY);
  const canCreate = parent && account.profiles.length < MAX_PROFILES;
  const list = account.profiles.map((p, i) => `<button class="btn ${p.id === account.activeId ? "mint" : "ghost"} profile-btn" data-i="${i}">
      ▶ ${esc(p.name)} <span class="acc-stars">⭐ ${profileStars(p)}</span>${p.id === account.activeId ? " · jogando" : ""}</button>`).join("");
  overlay(`<h2>Quem vai jogar?</h2>
    ${account.profiles.length ? "" : `<p>Ainda não há jogadores nesta conta.</p>`}
    <div class="btncol">${list}
      ${canImport ? `<button class="btn" id="ch-import">📥 Guardar o progresso de ${esc(guest.name || "quem já jogou")} na conta</button>` : ""}
      ${canCreate ? `<div class="new-row"><input class="name-input" id="ch-name" maxlength="14" placeholder="nome do novo jogador"><button class="btn small" id="ch-new">＋ Novo</button></div>` : ""}
      <button class="btn ghost" id="ch-close">${account.activeId ? "Fechar" : "Jogar sem conta por enquanto"}</button>
    </div>`);
  $$("#ov-panel .profile-btn").forEach((b) => (b.onclick = async () => {
    sfx.tap();
    await selectProfile(account.profiles[Number(b.dataset.i)]);
    closeOverlay(); go("home");
    toast(`Olá, ${P.name}! 👋`);
  }));
  if (canImport) $("#ch-import").onclick = async () => {
    try { await importGuest(); closeOverlay(); go("home"); toast("Progresso guardado na conta! ☁️"); }
    catch (e) { sfx.bad(); toast(friendlyError(e)); }
  };
  if (canCreate) $("#ch-new").onclick = async () => {
    const name = cleanName($("#ch-name").value);
    if (!name) { sfx.bad(); toast("Escreva o nome do jogador 🙂"); return; }
    try { await newProfile(name); closeOverlay(); go("home"); toast(`Jogador ${name} criado!`); }
    catch (e) { sfx.bad(); toast(friendlyError(e)); }
  };
  $("#ch-close").onclick = closeOverlay;
}

function managePanel() {
  const list = account.profiles.map((p, i) => `<div class="acc-row"><span>${p.id === account.activeId ? "▶ " : ""}<b>${esc(p.name)}</b> <span class="acc-stars">⭐ ${profileStars(p)}</span></span>
      <button class="btn small ghost" data-del="${i}" aria-label="Remover ${esc(p.name)}">🗑️</button></div>`).join("");
  overlay(`<h2>☁️ Conta da família</h2>
    <p class="acc-note">Conectado como <b>${esc(account.cloud.email)}</b></p>
    <p class="acc-note">${esc(STATUS_TEXT[account.status] || "")}</p>
    ${list || "<p>Nenhum jogador na conta ainda.</p>"}
    <div class="btncol">
      <button class="btn" id="mg-choose">👥 Escolher ou criar jogador</button>
      <button class="btn ghost" id="mg-sync">🔄 Sincronizar agora</button>
      <button class="btn ghost" id="mg-out">🚪 Sair da conta neste aparelho</button>
      <button class="btn ghost danger" id="mg-delete">Apagar conta e todos os dados</button>
      <button class="btn ghost" id="mg-close">Fechar</button>
    </div>`);
  $$("#ov-panel [data-del]").forEach((b) => (b.onclick = () => confirmRemoveProfile(account.profiles[Number(b.dataset.del)])));
  $("#mg-choose").onclick = () => chooserPanel({ parent: true });
  $("#mg-sync").onclick = async () => { await syncNow(); managePanel(); };
  $("#mg-out").onclick = async () => { await signOutAccount(); closeOverlay(); go("home"); toast("Você saiu da conta. O progresso continua salvo na nuvem."); };
  $("#mg-delete").onclick = confirmDeleteAccount;
  $("#mg-close").onclick = closeOverlay;
}

function confirmRemoveProfile(p) {
  overlay(`<h2>Remover ${esc(p.name)}?</h2>
    <p>O progresso de <b>${esc(p.name)}</b> será apagado da conta em todos os aparelhos. Não dá para desfazer.</p>
    <div class="btncol"><button class="btn danger-solid" id="rp-yes">Remover jogador</button><button class="btn ghost" id="rp-no">Cancelar</button></div>`);
  $("#rp-no").onclick = managePanel;
  $("#rp-yes").onclick = async () => {
    try { await removeProfile(p); toast(`${p.name} foi removido.`); managePanel(); }
    catch (e) { sfx.bad(); toast(friendlyError(e)); }
  };
}

function confirmDeleteAccount() {
  overlay(`<h2>Apagar a conta?</h2>
    <p>Isso apaga a conta <b>${esc(account.cloud.email)}</b> e o progresso de <b>todos os jogadores</b> na nuvem. Não dá para desfazer.</p>
    <p class="acc-note">O jogo continua funcionando neste aparelho, sem conta.</p>
    <div class="btncol"><button class="btn danger-solid" id="da-yes">Apagar tudo</button><button class="btn ghost" id="da-no">Cancelar</button></div>`);
  $("#da-no").onclick = managePanel;
  $("#da-yes").onclick = async () => {
    try { await deleteAccountAndData(); closeOverlay(); go("home"); toast("Conta e dados apagados."); }
    catch (e) { sfx.bad(); toast(friendlyError(e)); }
  };
}
