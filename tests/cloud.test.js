import { test } from "node:test";
import assert from "node:assert/strict";
import { createCloud, parseAuthHash, emailFromToken, CloudError } from "../js/cloud.js";
import { fakeSupabase, memoryStorage } from "./fake-supabase.js";

const URL_ = "https://exemplo.supabase.co";
const make = (fake, storage = memoryStorage()) => createCloud({ url: URL_, key: "pk", fetchFn: fake.fetchFn, storage });

test("login com código, criar, listar, alterar e apagar perfil", async () => {
  const fake = fakeSupabase();
  const c = make(fake);
  assert.equal(c.signedIn, false);
  await c.sendLoginEmail("mae@exemplo.com", "https://jogo/");
  assert.deepEqual(fake.db.sent, ["mae@exemplo.com"]);
  await assert.rejects(c.verifyCode("mae@exemplo.com", "000000"), /invalid/);
  await c.verifyCode("mae@exemplo.com", "123456");
  assert.equal(c.signedIn, true);
  assert.equal(c.email, "mae@exemplo.com");

  const p = await c.createProfile("Sofia", { coins: 5 });
  assert.equal(p.name, "Sofia");
  const rows = await c.listProfiles();
  assert.equal(rows.length, 1);
  const up = await c.updateProfile(p.id, { progress: { coins: 9 } });
  assert.equal(up.progress.coins, 9);
  await c.deleteProfile(p.id);
  assert.equal((await c.listProfiles()).length, 0);
});

test("sessão continua depois de recarregar a página", async () => {
  const fake = fakeSupabase();
  const st = memoryStorage();
  const c1 = make(fake, st);
  await c1.verifyCode("pai@exemplo.com", "123456");
  const c2 = make(fake, st);
  assert.equal(c2.signedIn, true);
  assert.equal(c2.email, "pai@exemplo.com");
  assert.deepEqual(await c2.listProfiles(), []);
});

test("acesso vencido é renovado sozinho", async () => {
  const fake = fakeSupabase();
  const c = make(fake);
  await c.verifyCode("a@b.com", "123456");
  fake.expireAll();
  assert.deepEqual(await c.listProfiles(), []);
  assert.ok(fake.db.calls.includes("POST /auth/v1/token"));
});

test("sem internet gera erro 'offline'", async () => {
  const fake = fakeSupabase();
  const c = make(fake);
  await c.verifyCode("a@b.com", "123456");
  fake.db.offline = true;
  await assert.rejects(c.listProfiles(), (e) => e instanceof CloudError && e.code === "offline");
});

test("cada conta só vê os próprios perfis", async () => {
  const fake = fakeSupabase();
  const a = make(fake), b = make(fake);
  await a.verifyCode("a@x.com", "123456");
  await b.verifyCode("b@x.com", "123456");
  await a.createProfile("Ana", {});
  assert.equal((await b.listProfiles()).length, 0);
});

test("limite de 6 perfis e apagar conta", async () => {
  const fake = fakeSupabase();
  const c = make(fake);
  await c.verifyCode("a@x.com", "123456");
  for (let i = 0; i < 6; i++) await c.createProfile("P" + i, {});
  await assert.rejects(c.createProfile("P7", {}), /Limite de 6/);
  await c.deleteAccount();
  assert.equal(c.signedIn, false);
  assert.equal(fake.db.profiles.length, 0);
});

test("link do e-mail: lê o #access_token e trata erro", () => {
  const s = parseAuthHash("#access_token=abc&expires_in=3600&refresh_token=r1&token_type=bearer&type=magiclink");
  assert.equal(s.access_token, "abc");
  assert.equal(s.refresh_token, "r1");
  assert.equal(parseAuthHash("#qualquer=1"), null);
  assert.match(parseAuthHash("#error=access_denied&error_description=Email+link+is+invalid+or+has+expired").error, /expired/);
  const c = make(fakeSupabase());
  assert.equal(c.useAuthHash("#access_token=h." + Buffer.from('{"email":"x@y.com"}').toString("base64url") + ".s&refresh_token=r&expires_in=60"), true);
  assert.equal(c.email, "x@y.com");
});

test("emailFromToken aguenta token inválido", () => {
  assert.equal(emailFromToken("lixo"), "");
});
