# Black Hawk Down

Juego táctico en tiempo real con pausa sobre la batalla de Mogadiscio del 3 y 4 de octubre de 1993.
Autor, Jesús Navas Aller, bajo el nombre de **Épsilon Games Studio**.

Se juega en el navegador, tanto en el ordenador como en el móvil en vertical.

---

## Arranque en local

El repositorio se sirve **tal cual en GitHub Pages**, sin paso de compilación. Para probarlo en local solo hace falta un servidor estático (por ejemplo **Python 3**):

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000> y a jugar.

> ¿Por qué hace falta un servidor y no abrir `index.html` con doble clic (`file://`)? Por seguridad, los navegadores bloquean las peticiones `fetch` y las texturas WebGL sobre archivos locales.

| Comando | Para qué |
|---|---|
| `python3 -m http.server 8000` | Servidor local para jugar y depurar |
| `python3 tools/smoke_test.py` | Prueba de humo: arranca todas las misiones en Chromium y comprueba que no haya errores |
| `node tools/verify.mjs a.html b.html` | Compara el árbol sintáctico (AST) de dos versiones |

---

## Cómo está organizado

```
BlackHawkDown.github.io/
├── index.html             ← la página real del juego (CSS, HTML y scripts en orden)
├── .nojekyll              ← evita que GitHub Pages pase el repo por Jekyll
├── CLAUDE.md              ← guía e invariantes para trabajar con IA
├── README.md              ← esto
├── docs/
│   ├── ARQUITECTURA.md    ← cómo funciona el juego por dentro
│   └── RECETAS.md         ← paso a paso: añadir una misión, un modelo, un texto…
├── src/                   ← código fuente y tablas de geometría
│   ├── css/               ← estilos por zonas (el orden en index.html decide la cascada)
│   ├── data/              ← mallas de soldados, armas y hierba en JS
│   ├── js/                ← el juego (ver abajo)
│   └── vendor/            ← three.js (MIT)
├── assets/                ← binarios servidos aparte (carga en paralelo / bajo demanda)
│   ├── models/            ← modelos 3D (.heli + .png)
│   ├── textures/          ← texturas de asfalto, isleta y suelo
│   ├── img/               ← logos del estudio y recursos de UI
│   ├── audio/             ← música (streaming) y efectos (sfx.json + .mp3)
│   └── video/             ← vídeo final en MP4 y WebM (streaming)
└── tools/                 ← prueba de humo y comparador de AST
```

### El JavaScript, por carpetas (`src/js/`)

| Carpeta | Qué hay |
|---|---|
| `boot/` | Animación de entrada (`splash.js`) y acceso a los modelos 3D (`assets.js`) |
| `core/` | Configuración, aleatorio con semilla, estado de la partida, carga de modelos, guardado, bucle principal y arranque |
| `render/` | three.js: renderer, sol y hora del día, luces, sombras, LOD, postproceso y cámara |
| `world/` | La ciudad y la región: rejilla, calles, edificios, mercados, árboles, mar, aeropuerto, base de la TFR, ambiente… |
| `units/` | Soldados (esqueleto, animación, armas, batches), técnicas, columnas de vehículos y aeronaves con guion |
| `sim/` | La simulación: el paso de juego, órdenes, formaciones, búsqueda de caminos, visión, fatiga, edificios ocupables |
| `combat/` | Disparos, impactos, escombros, muros que se rompen, RPG, desangrarse, apoyo aéreo |
| `fx/` | Partículas y efectos de disparo |
| `audio/` | Disparos y sonidos (`sfx.json` + `.mp3` o construidos) y la música del menú |
| `input/` | Ratón, táctil y menú contextual |
| `ui/` | HUD, radio, pantallas, opciones, campaña, mapa táctico y manual de campo |
| `i18n/` | El diccionario español → inglés y la traducción al vuelo |
| `missions/` | Una por archivo (`m01`…`m09`), el tutorial, la pantalla de título y lo común a todas (`common/`) |

Cada archivo empieza con una cabecera que explica qué hace. Si buscas algo, mira primero las cabeceras.

---

## Lo que conviene saber antes de tocar nada

**El orden de carga importa.** Todos los `<script defer>` de `index.html` comparten el ámbito global y se ejecutan en orden. Las funciones se pueden llamar desde cualquier sitio, pero lo que se ejecuta al cargar (los `const`, la construcción de materiales…) solo puede depender de archivos que estén **antes** en `index.html`. Un archivo nuevo se enlaza ahí justo después del último del que dependa (y siempre antes de `core/boot.js`). Con el CSS pasa lo mismo: si dos reglas chocan, gana la que va después en `<head>`.

**La ciudad sale de una semilla.** Todo Mogadiscio se genera con `rnd()` a partir de la semilla 1993. Si añades una tirada nueva de `rnd()` en mitad de la construcción, se mueve todo lo que viene detrás: edificios, coches, puestos… Por eso verás muchos comentarios del tipo «su propio generador» o «dejo la tirada para que no cambie nada»: lo nuevo usa un hash de la posición o un generador propio, y lo que se quita deja su tirada hecha.

**Los textos se escriben en español.** El inglés sale del diccionario de `src/js/i18n/en-dictionary.js`. Si añades una frase nueva que se ve en pantalla, añade también su traducción allí.

**Los assets van sueltos en `assets/`.** Modelos (`.heli` + `.png`), texturas, sonidos y vídeos se cargan con `fetch` o por `<audio>`/`<video>` sin bloquear el arranque. Solo las tablas pequeñas de geometría síncrona (`soldados`, `armas-*`, `matas-hierba`) están en `src/data/*.js`.

**Estilo.** Comillas simples, punto y coma, 2 espacios, LF. Nombres de variables y funciones en inglés, comentarios en español.

---

## Comprobar que no he roto nada

1. `python3 -m http.server 8000` y probar en el navegador (en el ordenador y en el móvil en vertical).
2. `python3 tools/smoke_test.py`: arranca las once misiones en Chromium, simula unos segundos de cada una y avisa si salta algún error.

---

## Créditos

- Creado y dirigido por **Jesús Navas Aller** · Épsilon Games Studio.
- Motor 3D: [three.js](https://threejs.org) (licencia MIT).
- Los modelos 3D, texturas y sonidos son los que he ido subiendo al proyecto.
