#!/usr/bin/env python3
"""
Servidor para desarrollar: monta el juego, lo sirve en http://localhost:8000 y lo vuelve a montar
solo cada vez que guardas algo en src/. Recarga el navegador y listo.

    python3 tools/serve.py            # build ligero (como el que se publica)
    python3 tools/serve.py --dev      # con comentarios: más cómodo para depurar en el navegador
    python3 tools/serve.py --port 9000

Solo usa Python 3, sin instalar nada.
"""
import functools
import http.server
import os
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build  # noqa: E402

ROOT = build.ROOT
args = sys.argv[1:]
DEV = '--dev' in args
PORT = int(args[args.index('--port') + 1]) if '--port' in args else 8000


def snapshot():
    """La hora de modificación de cada archivo de src/: si algo cambia, toca volver a montar."""
    out = {}
    for base, _, files in os.walk(os.path.join(ROOT, 'src')):
        for f in files:
            p = os.path.join(base, f)
            out[p] = os.path.getmtime(p)
    return out


def watch():
    last = snapshot()
    while True:
        time.sleep(0.7)
        now = snapshot()
        if now != last:
            last = now
            try:
                build.build(dev=DEV)
            except Exception as e:   # un error de build no tira el servidor: se arregla y se vuelve a guardar
                print('  ¡error en el build!', e)


if __name__ == '__main__':
    build.build(dev=DEV)
    threading.Thread(target=watch, daemon=True).start()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=build.DIST)
    print('Sirviendo dist/ en http://localhost:%d  (Ctrl+C para parar)' % PORT)
    http.server.ThreadingHTTPServer(('', PORT), handler).serve_forever()
