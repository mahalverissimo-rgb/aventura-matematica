"""Teste de ponta a ponta da Conta da família, com um Supabase simulado.

Simula dois aparelhos (A e B) da mesma família: login por código e por link,
guardar progresso na conta, criar e trocar jogadores, sincronizar entre aparelhos,
jogar sem internet e apagar a conta.

Uso: python3 tests/e2e/account.py
"""
import asyncio, base64, functools, http.server, json, pathlib, re, threading, time
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
CLOUD = re.search(r'CLOUD_URL = "([^"]+)"', (ROOT / "js/cloud-config.js").read_text()).group(1)
CODE = "123456"


class FakeSupabase:
    def __init__(self):
        self.profiles, self.tokens, self.sent, self.offline, self.seq = [], {}, [], False, 0
        self.consents = []

    def issue(self, email):
        self.seq += 1
        payload = base64.urlsafe_b64encode(json.dumps({"email": email}).encode()).decode().rstrip("=")
        access, refresh = f"h.{payload}.s{self.seq}", f"r{self.seq}"
        self.tokens[access] = {"email": email, "exp": time.time() + 3600}
        self.tokens[refresh] = {"email": email, "refresh": True}
        return {"access_token": access, "refresh_token": refresh, "expires_in": 3600, "token_type": "bearer", "user": {"email": email}}

    def mine(self, email):
        return [p for p in self.profiles if p["owner"] == email]

    @staticmethod
    def public(p):
        return {k: v for k, v in p.items() if k != "owner"}

    async def handle(self, route, request):
        if self.offline:
            return await route.abort()
        cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"}
        if request.method == "OPTIONS":
            return await route.fulfill(status=200, headers=cors)
        u = urlparse(request.url)
        body = json.loads(request.post_data) if request.post_data else None
        auth = (request.headers.get("authorization") or "").replace("Bearer ", "")

        def reply(status, data=None):
            return route.fulfill(status=status, headers={**cors, "Content-Type": "application/json"},
                                 body="" if data is None else json.dumps(data))

        if u.path == "/auth/v1/otp":
            self.sent.append(body["email"]); self.consents.append(body.get("data")); return await reply(200, {})
        if u.path == "/auth/v1/verify":
            if body["token"] != CODE:
                return await reply(403, {"msg": "Token has expired or is invalid"})
            return await reply(200, self.issue(body["email"]))
        if u.path == "/auth/v1/token":
            t = self.tokens.pop(body["refresh_token"], None)
            return await reply(200, self.issue(t["email"])) if t else await reply(400, {"msg": "Invalid Refresh Token"})
        if u.path == "/auth/v1/logout":
            return await reply(204)
        who = self.tokens.get(auth)
        if not who or who.get("refresh"):
            return await reply(401, {"message": "JWT expired"})
        email = who["email"]
        pid = (parse_qs(u.query).get("id") or [""])[0].replace("eq.", "")
        if u.path == "/rest/v1/child_profiles":
            if request.method == "GET":
                return await reply(200, [self.public(p) for p in self.mine(email)])
            if request.method == "POST":
                self.seq += 1
                row = {"id": f"p{self.seq}", "owner": email, "name": body["name"], "progress": body["progress"], "updated_at": "now"}
                self.profiles.append(row); return await reply(201, [self.public(row)])
            if request.method == "PATCH":
                rows = [p for p in self.mine(email) if p["id"] == pid]
                for p in rows: p.update(body)
                return await reply(200, [self.public(p) for p in rows])
            if request.method == "DELETE":
                self.profiles = [p for p in self.profiles if not (p["owner"] == email and p["id"] == pid)]
                return await reply(204)
        if u.path == "/rest/v1/rpc/delete_my_account":
            self.profiles = [p for p in self.profiles if p["owner"] != email]
            return await reply(204)
        return await reply(404, {"message": "rota desconhecida"})

    def profile(self, name):
        return next(p for p in self.profiles if p["name"] == name)


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def new_device(b, fake, errors):
    ctx = await b.new_context(viewport={"width": 390, "height": 844})
    await ctx.route(CLOUD + "/**", fake.handle)
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return pg


async def ready(pg):
    await pg.wait_for_function("window.__AM !== undefined")
    await pg.wait_for_timeout(400)


async def play_level(pg, r, l):
    await pg.evaluate(f"__AM.startLevel({r},{l})")
    for _ in range(5):
        await pg.wait_for_timeout(250)
        a = await pg.evaluate("String(__AM.G().current.answer)")
        await pg.click(f"#g-options .opt[data-v='{a}']")
        await pg.wait_for_timeout(1000)
    await pg.wait_for_selector("#ov-map")
    await pg.click("#ov-map")
    await pg.wait_for_timeout(300)
    if await pg.is_visible("#ov-skip"):
        await pg.click("#ov-skip")


async def parent_gate(pg):
    txt = await pg.inner_text("#ov-panel")
    a, b = map(int, re.search(r"(\d+) × (\d+)", txt).groups())
    await pg.fill("#pg", str(a * b))
    await pg.click("#pg-ok")


async def open_account(pg, url):
    if not await pg.is_visible("#s-settings"):
        await pg.goto(url); await ready(pg)
        await pg.click("#btn-settings-home")
    await pg.click("#btn-account")
    await parent_gate(pg)


async def main():
    srv = serve()
    url = f"http://127.0.0.1:{srv.server_port}/index.html"
    fake, errors = FakeSupabase(), []
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---------- Aparelho A: joga sem conta ----------
        A = await new_device(b, fake, errors)
        await A.goto(url); await ready(A)
        await A.click("#btn-play"); await A.fill("#nm-in", "Sofia"); await A.click("#nm-ok")
        for _ in range(5): await A.click("#tut-n")
        await play_level(A, 0, 0)
        assert await A.evaluate("__AM.P().stars[0]") == 3

        # ---------- entra na conta com código e guarda o progresso ----------
        await open_account(A, url)
        await A.fill("#acc-email", "mae@exemplo.com"); await A.click("#acc-send")
        await A.wait_for_timeout(300)
        assert fake.sent == [], "sem a autorização do responsável não pode enviar"
        await A.check("#acc-consent"); await A.click("#acc-send")
        await A.wait_for_selector("#acc-code")
        assert fake.sent == ["mae@exemplo.com"]
        assert fake.consents[0]["consent_version"] == "1.5" and fake.consents[0]["consent_by"] == "responsavel"
        await A.fill("#acc-code", "000000"); await A.click("#acc-verify")
        await A.wait_for_timeout(300)
        assert await A.is_visible("#acc-code"), "código errado não pode entrar"
        await A.fill("#acc-code", CODE); await A.click("#acc-verify")
        await A.wait_for_selector("#ch-import")
        await A.click("#ch-import")
        await A.wait_for_timeout(800)
        sofia = fake.profile("Sofia")
        assert sofia["progress"]["stars"] == {"0": 3}, sofia
        assert await A.inner_text("#home-cloud") == "☁️"
        print("✔ login com código e progresso guardado na conta")

        # ---------- jogar envia o progresso para a nuvem ----------
        await play_level(A, 0, 1)
        await A.wait_for_timeout(2000)
        assert fake.profile("Sofia")["progress"]["stars"].get("1") == 3
        await A.reload(); await ready(A)
        assert await A.evaluate("__AM.P().name") == "Sofia"
        assert await A.evaluate("__AM.P().stars[1]") == 3
        print("✔ progresso sincronizado e mantido ao recarregar")

        # ---------- cria um segundo jogador e troca ----------
        await open_account(A, url)
        await A.click("#mg-choose")
        await A.fill("#ch-name", "teo"); await A.click("#ch-new")
        await A.wait_for_timeout(800)
        assert await A.evaluate("__AM.P().name") == "Teo"
        assert await A.evaluate("Object.keys(__AM.P().stars).length") == 0
        assert await A.evaluate("__AM.P().tutorialSeen") is False
        assert await A.is_visible("#btn-switch")
        await A.click("#btn-switch")
        await A.click("#ov-panel .profile-btn >> text=Sofia")
        await A.wait_for_timeout(600)
        assert await A.evaluate("__AM.P().name") == "Sofia"
        assert await A.evaluate("__AM.P().stars[1]") == 3
        print("✔ segundo jogador criado e troca de jogador")

        # ---------- Aparelho B: entra pelo link do e-mail ----------
        B = await new_device(b, fake, errors)
        s = fake.issue("mae@exemplo.com")
        await B.goto(f"{url}#access_token={s['access_token']}&expires_in=3600&refresh_token={s['refresh_token']}&token_type=bearer&type=magiclink")
        await ready(B)
        assert "access_token" not in B.url, "o token não pode ficar no endereço"
        await B.wait_for_selector("#ov-panel .profile-btn")
        await B.click("#ov-panel .profile-btn >> text=Sofia")
        await B.wait_for_timeout(600)
        assert await B.evaluate("__AM.P().stars[0]") == 3 and await B.evaluate("__AM.P().stars[1]") == 3
        print("✔ outro aparelho entra pelo link e continua de onde parou")

        # ---------- B sem internet ----------
        fake.offline = True
        await play_level(B, 0, 2)
        await B.wait_for_timeout(1800)
        assert await B.evaluate("__AM.account.status") == "offline"
        assert await B.evaluate("__AM.P().stars[2]") == 3, "progresso local mantido sem internet"
        assert "2" not in fake.profile("Sofia")["progress"]["stars"]
        fake.offline = False
        await B.evaluate("window.dispatchEvent(new Event('online'))")
        await B.wait_for_timeout(800)
        assert fake.profile("Sofia")["progress"]["stars"].get("2") == 3
        print("✔ sem internet guarda no aparelho e sincroniza quando volta")

        # ---------- A recebe o que B jogou ----------
        await A.reload(); await ready(A)
        await A.wait_for_timeout(600)
        assert await A.evaluate("__AM.P().stars[2]") == 3
        print("✔ aparelho A recebe o progresso feito no aparelho B")

        # ---------- ver meus dados ----------
        await open_account(A, url)
        await A.click("#mg-data")
        dados = json.loads(await A.inner_text("#dt-json"))
        assert dados["conta"]["email"] == "mae@exemplo.com"
        assert sorted(j["apelido"] for j in dados["jogadores"]) == ["Sofia", "Teo"]
        assert dados["jogadores"][0]["progresso"]["stars"]
        await A.click("#dt-back"); await A.click("#mg-close")
        print("✔ ver meus dados mostra tudo o que a conta guarda")

        # ---------- apagar a conta ----------
        await open_account(A, url)
        await A.click("#mg-delete"); await A.click("#da-yes")
        await A.wait_for_timeout(600)
        assert fake.profiles == []
        assert await A.evaluate("__AM.account.cloud.signedIn") is False
        assert await A.evaluate("__AM.P().name") == "Sofia"   # volta ao progresso sem conta do aparelho
        assert await A.inner_text("#home-cloud") == ""
        print("✔ apagar conta remove tudo da nuvem e o jogo segue sem conta")

        await b.close()
    srv.shutdown()
    assert not errors, f"erros no navegador: {errors}"
    print("✔ Conta da família: todos os cenários OK")


asyncio.run(main())
