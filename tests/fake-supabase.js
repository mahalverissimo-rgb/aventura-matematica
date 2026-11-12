// Supabase de mentira, em memória, para testes (imita as rotas usadas por js/cloud.js).
export function fakeSupabase({ code = "123456" } = {}) {
  const db = { users: new Map(), profiles: [], sent: [], tokens: new Map(), offline: false, calls: [] };
  let seq = 0;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const issue = (email, ttl = 3600) => {
    const access = `h.${b64({ email, n: ++seq })}.s`;
    const refresh = `r${seq}`;
    db.tokens.set(access, { email, exp: Date.now() / 1000 + ttl });
    db.tokens.set(refresh, { email, refresh: true });
    return { access_token: access, refresh_token: refresh, expires_in: ttl, token_type: "bearer", user: { email } };
  };
  const json = (status, body) => ({ ok: status < 300, status, text: async () => (body === undefined ? "" : JSON.stringify(body)) });

  async function fetchFn(url, opts = {}) {
    if (db.offline) throw new TypeError("Failed to fetch");
    const u = new URL(url);
    const method = opts.method || "GET";
    const body = opts.body ? JSON.parse(opts.body) : null;
    const auth = (opts.headers && opts.headers.Authorization || "").replace("Bearer ", "");
    db.calls.push(`${method} ${u.pathname}`);
    if (!opts.headers || !opts.headers.apikey) return json(401, { message: "No API key" });

    if (u.pathname === "/auth/v1/otp") { db.sent.push(body.email); return json(200, {}); }
    if (u.pathname === "/auth/v1/verify") {
      if (body.token !== code) return json(403, { msg: "Token has expired or is invalid" });
      db.users.set(body.email, true);
      return json(200, issue(body.email));
    }
    if (u.pathname === "/auth/v1/token") {
      const t = db.tokens.get(body.refresh_token);
      if (!t || !t.refresh) return json(400, { msg: "Invalid Refresh Token" });
      db.tokens.delete(body.refresh_token);
      return json(200, issue(t.email));
    }
    if (u.pathname === "/auth/v1/logout") return json(204);

    const who = db.tokens.get(auth);
    if (!who || who.refresh || who.exp < Date.now() / 1000) return json(401, { message: "JWT expired" });
    const mine = () => db.profiles.filter((p) => p.owner === who.email);
    const idParam = (u.searchParams.get("id") || "").replace("eq.", "");

    if (u.pathname === "/rest/v1/child_profiles") {
      if (method === "GET") return json(200, mine().map(({ owner, ...p }) => p));
      if (method === "POST") {
        if (mine().length >= 6) return json(400, { message: "Limite de 6 perfis por conta" });
        const row = { id: `p${++seq}`, owner: who.email, name: body.name, progress: body.progress, updated_at: new Date().toISOString() };
        db.profiles.push(row);
        const { owner, ...out } = row;
        return json(201, [out]);
      }
      if (method === "PATCH") {
        const row = mine().find((p) => p.id === idParam);
        if (!row) return json(200, []);
        Object.assign(row, body, { updated_at: new Date().toISOString() });
        const { owner, ...out } = row;
        return json(200, [out]);
      }
      if (method === "DELETE") {
        db.profiles = db.profiles.filter((p) => !(p.owner === who.email && p.id === idParam));
        return json(204);
      }
    }
    if (u.pathname === "/rest/v1/rpc/delete_my_account") {
      db.profiles = db.profiles.filter((p) => p.owner !== who.email);
      db.users.delete(who.email);
      for (const [k, v] of db.tokens) if (v.email === who.email) db.tokens.delete(k);
      return json(204);
    }
    return json(404, { message: "rota desconhecida " + u.pathname });
  }

  return { db, fetchFn, expireAll: () => { for (const v of db.tokens.values()) if (!v.refresh) v.exp = 0; } };
}

export const memoryStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m
  };
};
