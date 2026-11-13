"""Teste de ponta a ponta das funções de celular (v1.4).

- App instalável (PWA): depois da primeira visita, o jogo abre e funciona SEM internet.
- App de celular (Capacitor simulado): botão "voltar" do Android e login pelo código do e-mail.

Uso: python3 tests/e2e/mobile.py
"""
import asyncio, functools, http.server, json, pathlib, re, threading
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
CLOUD = re.search(r'CLOUD_URL = "([^"]+)"', (ROOT / "js/cloud-config.js").read_text()).group(1)
REDIRECT = re.search(r'CLOUD_REDIRECT = "([^"]+)"', (ROOT / "js/cloud-config.js").read_text()).group(1)

FAKE_CAPACITOR = """
window.__exited = false;
window.Capacitor = {
  isNativePlatform: () => true,
  Plugins: { App: {
    addListener: (ev, fn) => { if (ev === 'backButton') window.__back = fn; },
    exitApp: () => { window.__exited = true; }
  } }
};
"""


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def start_playing(pg, name="Sofia"):
    await pg.wait_for_function("window.__AM !== undefined")
    await pg.click("#btn-play"); await pg.fill("#nm-in", name); await pg.click("#nm-ok")
    for _ in range(5): await pg.click("#tut-n")


async def visible_screen(pg):
    return await pg.evaluate("document.querySelector('.screen.active').id")


async def main():
    srv = serve()
    url = f"http://127.0.0.1:{srv.server_port}/index.html"
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---------- PWA: funciona sem internet ----------
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(url)
        await pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
        await pg.reload()
        await pg.wait_for_function("navigator.serviceWorker.controller !== null")
        assert await pg.evaluate("__AM.isNativeApp()") is False
        await ctx.set_offline(True)
        await pg.reload()
        await start_playing(pg)
        await pg.evaluate("__AM.startLevel(0,0)")
        await pg.wait_for_selector("#g-options .opt")
        assert await visible_screen(pg) == "s-game"
        manifest = await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
        assert manifest["name"] == "Aventura Matemágica"
        await ctx.close()
        print("✔ app instalável abre e funciona sem internet")

        # ---------- App de celular: botão voltar ----------
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        await ctx.add_init_script(FAKE_CAPACITOR)
        sent = []

        async def cloud(route, request):
            u = urlparse(request.url)
            if request.method == "OPTIONS":
                return await route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
            if u.path == "/auth/v1/otp":
                sent.append(parse_qs(u.query).get("redirect_to", [""])[0])
                return await route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}, body="{}")
            return await route.fulfill(status=404, headers={"Access-Control-Allow-Origin": "*"}, body="{}")
        await ctx.route(CLOUD + "/**", cloud)

        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(url)
        await start_playing(pg)
        assert await pg.evaluate("document.documentElement.classList.contains('native-app')")
        assert await pg.evaluate("__AM.isNativeApp()") is True
        assert await pg.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.length)") == 0, "no app não usa service worker"

        back = lambda: pg.evaluate("window.__back()")
        assert await visible_screen(pg) == "s-levels"
        await back(); assert await visible_screen(pg) == "s-map"
        await back(); assert await visible_screen(pg) == "s-home"

        await pg.click("#btn-settings-home"); await back()
        assert await visible_screen(pg) == "s-home"

        await pg.evaluate("__AM.startLevel(0,0)")
        await pg.click("#btn-pause")
        assert await pg.is_visible("#ov-panel")
        await back()
        assert not await pg.evaluate("document.getElementById('ov').classList.contains('active')"), "voltar fecha a janela"
        await back(); assert await visible_screen(pg) == "s-levels"
        await back(); await back()
        assert await visible_screen(pg) == "s-home"
        await back()
        assert await pg.evaluate("window.__exited") is True
        print("✔ botão voltar do Android")

        # ---------- App de celular: login pelo código ----------
        await pg.click("#btn-settings-home")
        await pg.click("#btn-account")
        txt = await pg.inner_text("#ov-panel")
        a, c = map(int, re.search(r"(\d+) × (\d+)", txt).groups())
        await pg.fill("#pg", str(a * c)); await pg.click("#pg-ok")
        await pg.fill("#acc-email", "mae@exemplo.com"); await pg.check("#acc-consent"); await pg.click("#acc-send")
        await pg.wait_for_selector("#acc-code")
        panel = await pg.inner_text("#ov-panel")
        assert "código de 6 números" in panel and "Entrar no jogo" not in panel, panel
        assert sent == [REDIRECT], sent
        print("✔ no app, o login pede o código do e-mail")

        await b.close()
    srv.shutdown()
    assert not errors, errors
    print("✔ Funções de celular: todos os cenários OK")


asyncio.run(main())
