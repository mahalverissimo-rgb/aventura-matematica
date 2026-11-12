"""Teste de ponta a ponta: abre o jogo num navegador real e joga.

Uso:  python3 tests/e2e/smoke.py            (testa a versão em módulos via servidor local
                                              e o arquivo único em dist/)
Requer: pip install playwright && playwright install chromium
"""
import asyncio, functools, http.server, json, pathlib, sys, threading
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / "package.json").read_text())["version"].rsplit(".", 1)[0]


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def run(url, label, b):
    pg = await b.new_page(viewport={"width": 390, "height": 844})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "fonts" not in m.text else None)
    await pg.goto(url)
    await pg.wait_for_function("window.__AM !== undefined")
    assert await pg.evaluate("__AM.VERSION") == VERSION

    # nome obrigatório + tutorial
    await pg.click("#btn-play")
    await pg.click("#nm-ok")
    assert await pg.is_visible("#nm-in"), "aceitou nome vazio"
    await pg.fill("#nm-in", "sofia")
    await pg.click("#nm-ok")
    for _ in range(5):
        await pg.click("#tut-n")
    assert await pg.evaluate("__AM.P().name") == "Sofia"
    assert await pg.evaluate("__AM.P().coins") == 5

    # joga o nível 1 sem errar
    await pg.click("#levels .lvl")
    for _ in range(5):
        await pg.wait_for_timeout(250)
        a = await pg.evaluate("String(__AM.G().current.answer)")
        await pg.click(f"#g-options .opt[data-v='{a}']")
        await pg.wait_for_timeout(1000)
    await pg.wait_for_selector("#ov-next")
    assert await pg.evaluate("__AM.P().stars[0]") == 3
    assert await pg.evaluate("__AM.P().coins") == 40
    assert "Sofia" in await pg.inner_text("#ov-panel")

    # próximo nível: erra uma vez, usa dica, pausa -> configurações -> volta ao jogo
    await pg.click("#ov-next")
    await pg.wait_for_timeout(300)
    a = await pg.evaluate("String(__AM.G().current.answer)")
    await pg.click(f"#g-options .opt:not([data-v='{a}'])")
    await pg.wait_for_timeout(500)
    assert await pg.evaluate("__AM.G().lives") == 2
    await pg.click("#g-mascot")
    await pg.click("#btn-pause")
    await pg.click("#ov-set")
    assert await pg.is_visible("#s-settings")
    assert await pg.inner_text("#app-version") == VERSION
    await pg.click("#s-settings [data-go=back]")
    assert await pg.is_visible("#s-game")

    # loja: compra o Laço Mágico (25)
    await pg.goto(url)
    await pg.wait_for_function("window.__AM !== undefined")
    assert await pg.evaluate("__AM.P().coins") == 40, "progresso não foi salvo"
    await pg.click("#btn-shop-home")
    await pg.click("#shop .item:nth-child(5) button")
    assert await pg.evaluate("__AM.P().hat") == "bow"
    assert await pg.evaluate("__AM.P().coins") == 15

    # área dos pais: resposta errada não desliga anúncios
    await pg.click("#s-shop [data-go=back]")
    await pg.click("#btn-settings-home")
    await pg.click("[data-set=ads]")
    await pg.fill("#pg", "1")
    await pg.click("#pg-ok")
    assert await pg.evaluate("__AM.P().settings.ads") is True

    await pg.close()
    assert not errors, f"erros no console: {errors}"
    print(f"✔ {label}: OK")


async def main():
    srv = serve()
    dist = ROOT / "dist" / f"aventura-matematica-v{VERSION}.html"
    if not dist.exists():
        sys.exit("Rode antes: npm run build")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await run(f"http://127.0.0.1:{srv.server_port}/index.html", "versão em módulos (GitHub Pages)", b)
        await run(dist.as_uri(), f"arquivo único {dist.name}", b)
        await b.close()
    srv.shutdown()


asyncio.run(main())
