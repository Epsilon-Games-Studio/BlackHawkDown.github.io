#!/usr/bin/env python3
"""
Build del juego: junta todo src/ en un solo dist/index.html.

    python3 tools/build.py            -> dist/index.html (ligero: sin comentarios ni sangrías)
    python3 tools/build.py --dev      -> igual, pero con los comentarios y el formato tal cual
    python3 tools/build.py --debug    -> versión --dev con el gancho window.__dbg para los tests

¿Por qué un solo archivo? Porque el juego se publica como una página y así carga
de una tacada: un HTML con todo el código dentro, más los paquetes grandes de static/
(música, sonidos, vídeos, modelos) que van al lado y casi nunca cambian.

No necesita nada instalado: solo Python 3.
"""
import base64
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml'}


def read(path):
    with open(os.path.join(SRC, path), encoding='utf-8') as f:
        return f.read()


def b64(path):
    with open(os.path.join(SRC, 'assets', path), 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def data_uri(path):
    return 'data:%s;base64,%s' % (MIME[os.path.splitext(path)[1].lower()], b64(path))


def manifest(path):
    """Una ruta por línea; las líneas vacías y las que empiezan por # no cuentan."""
    items = [l.strip() for l in read(path).splitlines() if l.strip() and not l.strip().startswith('#')]
    if not items:
        raise SystemExit('el manifiesto %s está vacío' % path)
    return items


# ---------------------------------------------------------------------------------------------
# Macros del JS. En el código fuente los datos gordos no están pegados: hay una llamada que
# el build sustituye por el literal de siempre, así el resultado es idéntico al original.
#   __ASSET_URI__('textures/asfalto.jpg')  -> 'data:image/jpeg;base64,....'
#   __INLINE__('data/soldados.json')       -> el contenido del archivo, tal cual
#   __MODEL__('models/windows/w_b04')      -> { t:'<.heli en base64>', p:'<.png en base64>' }
# ---------------------------------------------------------------------------------------------
def expand_js_macros(code):
    code = re.sub(r"__ASSET_URI__\('([^']+)'\)", lambda m: "'" + data_uri(m.group(1)) + "'", code)
    code = re.sub(r"__INLINE__\('([^']+)'\)", lambda m: read('assets/' + m.group(1)).rstrip('\n'), code)
    code = re.sub(r"__MODEL__\('([^']+)'\)",
                  lambda m: "{ t:'%s', p:'%s' }" % (b64(m.group(1) + '.heli'), b64(m.group(1) + '.png')), code)
    return code


def expand_asset_refs(text):
    """En HTML y CSS: @asset/img/loquesea.png -> data URI."""
    return re.sub(r'@asset/([A-Za-z0-9_./-]+)', lambda m: data_uri(m.group(1)), text)


# ---------------------------------------------------------------------------------------------
# Aligerado del JS. No es un minificador de verdad (no renombra nada ni toca la lógica):
# quita comentarios, sangrías y líneas vacías. Respeta cadenas, plantillas `...${}...` y
# expresiones regulares, y nunca junta dos líneas, así que la inserción automática de ;
# se comporta exactamente igual que en el código fuente.
# ---------------------------------------------------------------------------------------------
KW_BEFORE_REGEX = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
                   'case', 'do', 'else', 'yield', 'await'}


def strip_js(src):
    out = []
    i, n = 0, len(src)
    last = ''            # último token significativo (para saber si una / abre una regex)
    stack = []           # profundidad de llaves dentro de cada ${ } de una plantilla
    line_start = True

    def regex_ok():
        if not last:
            return True
        if last[-1].isalnum() or last[-1] in '_$':
            return last in KW_BEFORE_REGEX
        return last not in (')', ']')

    def emit(t):
        nonlocal line_start
        out.append(t)
        line_start = False

    def newline():
        nonlocal line_start
        while out and out[-1] in (' ', '\t'):
            out.pop()
        if out and not line_start:
            out.append('\n')
        line_start = True

    def template(i):
        """Copia una plantilla desde la ` de apertura; devuelve dónde sigue (y si entró en un ${)."""
        j = i + 1
        while j < n:
            c = src[j]
            if c == '\\':
                j += 2
                continue
            if c == '`':
                return j + 1, False
            if c == '$' and j + 1 < n and src[j + 1] == '{':
                return j + 2, True
            j += 1
        raise ValueError('plantilla sin cerrar')

    while i < n:
        c = src[i]
        if c == '\n':
            newline(); i += 1
            continue
        if c in ' \t\r':
            if not line_start:
                emit(c)
            i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.index('*/', i + 2)
            if '\n' in src[i:j]:
                newline()
            elif not line_start:
                emit(' ')
            i = j + 2
            continue
        if c in '\'"':
            j = i + 1
            while src[j] != c:
                j += 2 if src[j] == '\\' else 1
            emit(src[i:j + 1]); last = 'str'; i = j + 1
            continue
        if c == '`' or (c == '}' and stack and stack[-1] == 0):
            if c == '}':
                stack.pop()
            j, inner = template(i)
            emit(src[i:j]); i = j
            if inner:
                stack.append(0); last = '{'
            else:
                last = 'str'
            continue
        if c == '/' and regex_ok():
            j, cls = i + 1, False
            while True:
                d = src[j]
                if d == '\\':
                    j += 2
                    continue
                if d == '[':
                    cls = True
                elif d == ']':
                    cls = False
                elif d == '/' and not cls:
                    break
                elif d == '\n':
                    raise ValueError('regex sin cerrar cerca de: ' + src[i:i + 60])
                j += 1
            j += 1
            while j < n and (src[j].isalnum() or src[j] == '_'):
                j += 1
            emit(src[i:j]); last = 'str'; i = j
            continue
        if c.isalnum() or c in '_$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$' or ord(src[j]) > 127):
                j += 1
            if c.isdigit():   # números con punto o exponente: 1.5e-3
                while j < n and (src[j].isalnum() or src[j] in '._') or (j < n and src[j] in '+-' and src[j - 1] in 'eE'):
                    j += 1
            emit(src[i:j]); last = src[i:j]; i = j
            continue
        if c == '.' and i + 1 < n and src[i + 1].isdigit():
            j = i + 1
            while j < n and (src[j].isalnum() or src[j] in '._') or (j < n and src[j] in '+-' and src[j - 1] in 'eE'):
                j += 1
            emit(src[i:j]); last = '0'; i = j
            continue
        if c == '{' and stack:
            stack[-1] += 1
        elif c == '}' and stack:
            stack[-1] -= 1
        emit(c); last = c; i += 1
    return ''.join(out).strip('\n') + '\n'


def strip_css(src):
    """Quita comentarios, sangrías y líneas vacías del CSS (sin tocar cadenas ni url(...))."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == '/' and src.startswith('/*', i):
            i = src.index('*/', i + 2) + 2
            continue
        if c in '\'"':
            j = i + 1
            while src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1]); i = j + 1
            continue
        out.append(c); i += 1
    lines = (l.strip() for l in ''.join(out).splitlines())
    return '\n'.join(l for l in lines if l) + '\n'


# ---------------------------------------------------------------------------------------------
def build(dev=False, debug=False):
    js_parts = []
    for path in manifest('js/manifest.txt'):
        code = read('js/' + path)
        js_parts.append(('// ==== %s ====\n' % path if dev else '') + code)
    game = '(function(){\n"use strict";\n' + ''.join(js_parts)
    if debug:
        game += 'window.__dbg = s => eval(s);\n'   # solo para tools/test: deja evaluar código dentro del juego
    game += '})();\n'
    game = expand_js_macros(game)
    if not dev:
        game = strip_js(game)

    css = ''.join(read('css/' + p) for p in manifest('css/manifest.txt'))
    css = expand_asset_refs(css)
    if not dev:
        css = strip_css(css)

    def script(path):
        code = read(path)
        if path == 'js/boot/splash.js':
            code = '(function(){\n' + code + '})();'
        if not dev and not path.startswith('vendor/'):
            code = strip_js(code)
        return code.rstrip('\n')

    out = []
    for line in read('index.html').splitlines():
        m = re.fullmatch(r'\s*<!-- @(\w[\w-]*)\s*(.*?)\s*-->', line)
        if not m:
            out.append(line)
            continue
        cmd, arg = m.groups()
        if cmd == 'css':
            out.append(css.rstrip('\n'))
        elif cmd == 'include':
            out.append(expand_asset_refs(read(arg)).rstrip('\n'))
        elif cmd == 'script':
            out.append(script(arg))
        elif cmd == 'static':
            out.append(''.join('<script src="%s"></script>' % f for f in arg.split()))
        elif cmd == 'js':
            out.append('<script>\n' + game + '</script>')
        else:
            raise SystemExit('marca desconocida en index.html: @' + cmd)
    html = '\n'.join(out) + '\n'
    if not dev:   # los comentarios HTML son para quien lee src/, no hace falta mandarlos al navegador
        html = re.sub(r'\n?[ \t]*<!--(?!\[)[\s\S]*?-->[ \t]*(?=\n)', '', html)
    if debug:   # en los tests no queremos esperar a Google Fonts
        html = html.replace('<link rel="stylesheet" href="https://fonts.googleapis.com',
                            '<link rel="x-stylesheet" href="https://fonts.googleapis.com')

    os.makedirs(DIST, exist_ok=True)
    name = 'dbg.html' if debug else 'index.html'
    with open(os.path.join(DIST, name), 'w', encoding='utf-8') as f:
        f.write(html)
    # los paquetes grandes se copian solo si han cambiado
    for f in os.listdir(os.path.join(ROOT, 'static')):
        a, b = os.path.join(ROOT, 'static', f), os.path.join(DIST, f)
        if not os.path.exists(b) or os.path.getmtime(a) > os.path.getmtime(b) or os.path.getsize(a) != os.path.getsize(b):
            shutil.copy2(a, b)
    print('dist/%s  %.2f MB%s' % (name, len(html.encode('utf-8')) / 1e6, '  (dev)' if dev else ''))


if __name__ == '__main__':
    args = set(sys.argv[1:])
    build(dev='--dev' in args or '--debug' in args, debug='--debug' in args)
