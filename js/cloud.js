// Cliente mínimo do Supabase (login por e-mail e tabela child_profiles), usando só fetch.
// Sem dependências; o fetch e o armazenamento podem ser trocados nos testes.

const SESSION_KEY = "aventura-matemagica-sessao";

export class CloudError extends Error {
  constructor(message, status = 0, code = "") {
    super(message);
    this.status = status;
    this.code = code;          // "offline" quando não há internet
  }
}

/** Lê os dados de login que vêm no endereço depois de tocar no link do e-mail. */
export function parseAuthHash(hash) {
  const h = String(hash || "").replace(/^#/, "");
  if (!h) return null;
  const q = new URLSearchParams(h);
  if (q.get("error_description") || q.get("error")) {
    return { error: q.get("error_description") || q.get("error") };
  }
  const access = q.get("access_token"), refresh = q.get("refresh_token");
  if (!access || !refresh) return null;
  const expiresIn = Number(q.get("expires_in") || 3600);
  return { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + expiresIn };
}

/** E-mail que está dentro do token (sem validar a assinatura — só para mostrar na tela). */
export function emailFromToken(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(decodeURIComponent(escape(atob(part))));
    return json.email || "";
  } catch (e) { return ""; }
}

export function createCloud({ url, key, fetchFn, storage, now = () => Date.now() }) {
  const doFetch = fetchFn || ((...a) => globalThis.fetch(...a));
  const store = storage || (() => { try { return globalThis.localStorage; } catch (e) { return null; } })();
  let session = null;
  try { session = JSON.parse((store && store.getItem(SESSION_KEY)) || "null"); } catch (e) { session = null; }

  function setSession(s) {
    session = s ? {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || Math.floor(now() / 1000) + Number(s.expires_in || 3600),
      email: s.email || (s.user && s.user.email) || emailFromToken(s.access_token)
    } : null;
    try {
      if (!store) return;
      if (session) store.setItem(SESSION_KEY, JSON.stringify(session));
      else store.removeItem(SESSION_KEY);
    } catch (e) { /* ok */ }
  }

  async function raw(path, { method = "GET", body, token, prefer } = {}) {
    const headers = { apikey: key, "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (prefer) headers.Prefer = prefer;
    let res;
    try {
      res = await doFetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw new CloudError("Sem conexão com a internet", 0, "offline");
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = (data && (data.msg || data.message || data.error_description || data.error)) || `Erro ${res.status}`;
      throw new CloudError(String(msg), res.status, (data && (data.error_code || data.code)) || "");
    }
    return data;
  }

  async function refresh() {
    if (!session) throw new CloudError("Não conectado", 401);
    const data = await raw("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: session.refresh_token } });
    setSession(Object.assign({ email: session.email }, data));
  }

  /** Requisição autenticada: renova o acesso se estiver vencendo e tenta de novo uma vez se der 401. */
  async function authed(path, opts = {}) {
    if (!session) throw new CloudError("Não conectado", 401);
    if (session.expires_at - 60 < now() / 1000) await refresh();
    try {
      return await raw(path, Object.assign({}, opts, { token: session.access_token }));
    } catch (e) {
      if (e.status !== 401) throw e;
      await refresh();
      return raw(path, Object.assign({}, opts, { token: session.access_token }));
    }
  }

  return {
    get signedIn() { return !!session; },
    get email() { return session ? session.email : ""; },

    /** Envia o e-mail de acesso (link e, se o modelo de e-mail tiver, um código). */
    async sendLoginEmail(email, redirectTo, data) {
      const qs = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
      const body = { email, create_user: true };
      if (data) body.data = data;   // guardado no cadastro do usuário (ex.: registro do consentimento)
      await raw(`/auth/v1/otp${qs}`, { method: "POST", body });
    },

    /** Entra com o código de 6 a 8 dígitos do e-mail. */
    async verifyCode(email, code) {
      const data = await raw("/auth/v1/verify", { method: "POST", body: { type: "email", email, token: String(code).trim() } });
      setSession(data);
    },

    /** Entra com os dados do link do e-mail (#access_token=...). Devolve true se entrou. */
    useAuthHash(hash) {
      const s = parseAuthHash(hash);
      if (!s) return false;
      if (s.error) throw new CloudError(s.error, 400);
      setSession(s);
      return true;
    },

    async signOut() {
      try { if (session) await raw("/auth/v1/logout", { method: "POST", token: session.access_token }); } catch (e) { /* sai mesmo sem internet */ }
      setSession(null);
    },

    listProfiles() {
      return authed("/rest/v1/child_profiles?select=id,name,progress,updated_at&order=created_at.asc");
    },
    async createProfile(name, progress) {
      const rows = await authed("/rest/v1/child_profiles", { method: "POST", body: { name, progress }, prefer: "return=representation" });
      return rows[0];
    },
    async updateProfile(id, fields) {
      const rows = await authed(`/rest/v1/child_profiles?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: fields, prefer: "return=representation" });
      if (!rows || !rows.length) throw new CloudError("Perfil não encontrado", 404, "not_found");
      return rows[0];
    },
    deleteProfile(id) {
      return authed(`/rest/v1/child_profiles?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    async deleteAccount() {
      await authed("/rest/v1/rpc/delete_my_account", { method: "POST", body: {} });
      setSession(null);
    }
  };
}
