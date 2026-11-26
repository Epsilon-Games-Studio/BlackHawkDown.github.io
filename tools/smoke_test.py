#!/usr/bin/env python3
"""
Prueba de humo: abre el juego en un Chromium sin ventana, arranca cada misión,
la deja correr unos segundos de juego y mira que no salte ningún error.
No juega por ti: solo comprueba que nada revienta al cargar y al simular.

    python3 tools/build.py --debug     # genera dist/dbg.html (con el gancho __dbg)
    python3 tools/smoke_test.py        # levanta su propio servidor sobre dist/ y prueba
    python3 tools/smoke_test.py http://localhost:8766/dbg.html   # o contra uno que ya tengas

Necesita Playwright para Python (pip install playwright && playwright install chromium).
Las capturas quedan en tools/out/.
"""
import asyncio
import functools
import http.server
import json
import os
import sys
import threading

from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
if len(sys.argv) > 1:
    URL = sys.argv[1]
else:   # un servidor propio, en un puerto libre, sirviendo dist/
    dist = os.path.join(os.path.dirname(HERE), 'dist')
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(
        type('Quiet', (http.server.SimpleHTTPRequestHandler,), {'log_message': lambda *a: None}), directory=dist))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    URL = 'http://127.0.0.1:%d/dbg.html' % srv.server_address[1]

# Cada misión se arranca, se saltan sus cinemáticas y se simulan ~20 s de juego a 30 fps.
RUN_MISSION = """
setMission(%s); startMission();
let n = 0; while (CINE.on && n++ < 8) cineSkip();
for (let k = 0; k < 30*20; k++){ step(1/30); if (CINE.on && CINE.t > 2) cineSkip(); }
[MIS.id, G.sub, us.filter(u => u.alive).length, them.filter(e => e.alive).length]
"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1100, 'height': 750})).new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        await pg.goto(URL, timeout=120000)
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=os.path.join(OUT, 'titulo.png'), timeout=180000)
        ev = lambda code: pg.evaluate("c => { try { return JSON.stringify(__dbg(c)); } catch (e) { return 'ERR ' + e.message; } }", code)
        ids = json.loads(await ev("Object.keys(MISSIONS)"))
        print('misiones:', ', '.join(ids))
        bad = 0
        for mid in ids:
            r = await ev(RUN_MISSION % json.dumps(mid))
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=os.path.join(OUT, 'mision-%s.png' % mid), timeout=180000)
            fail = r.startswith('"ERR') or r.startswith('ERR')
            bad += fail
            print(('  FALLO ' if fail else '  ok    ') + mid.ljust(14) + r)
        await b.close()
        real = [e for e in errors if 'AudioContext' not in e and 'GL Driver' not in e]
        for e in real[:20]:
            print('  error de la página:', e[:300])
        print('TODO BIEN' if not bad and not real else 'HAY PROBLEMAS')
        sys.exit(1 if bad or real else 0)

asyncio.run(main())
