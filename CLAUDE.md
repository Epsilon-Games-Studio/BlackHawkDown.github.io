# CLAUDE.md — Guía para asistentes de IA

Este proyecto es un juego táctico en tiempo real con pausa sobre la batalla de Mogadiscio (1993), escrito en JavaScript clásico y three.js, servido **directamente desde la raíz en GitHub Pages sin paso de compilación**.

## Reglas críticas (no romper)

1. **Sin build ni bundlers**: `index.html` en la raíz es la página real que sirve GitHub Pages. No uses `import`/`export` de ES modules, TypeScript, JSX, macros (`__INLINE__`, `__ASSET_URI__`, `__MODEL__`, `@asset/`), ni pasos previos de compilación.
2. **Scripts clásicos con ámbito compartido**: cada archivo en `src/js/` debe empezar por `'use strict';` y compartir sus símbolos de primer nivel en el ámbito global (sin `import`/`export`).
   - **No repitas nombres** (`const`/`let`/`function`/`class`) entre archivos distintos.
   - **No uses nombres de globales del navegador** en el primer nivel (`T` está reservado para `THREE`, `AC` para `AudioContext`, etc.).
   - El **orden en `index.html` importa**: cualquier código que se ejecuta al cargar (constantes globales, inicialización) solo puede usar símbolos declarados en archivos que aparezcan **antes** en `index.html`. Las funciones llamadas después (en eventos, `frame()`, misiones) pueden estar en cualquier orden antes de `core/boot.js`.
   - `src/js/boot/splash.js` va envuelto en una IIFE `(function () { 'use strict'; ... })();` para no chocar con `T` o `AC`.
3. **Rutas relativas (sin `/` inicial)**: el juego se publica bajo `/BlackHawkDown.github.io/`.
   - Desde `index.html` y desde cualquier JS: `'assets/...'` y `'src/...'`.
   - Desde `src/css/*.css`: `'../../assets/...'` (o `'../../../assets/...'` desde `src/css/screens/*.css`).
4. **La ciudad sale de una semilla (`rnd()`, semilla 1993)**: nunca metas una tirada nueva de `rnd()` en medio de la construcción del mundo (`world/`), o desplazarás edificios y objetos posteriores. Usa un hash de la posición o un generador propio.
5. **Idioma y textos**:
   - Todo el texto visible se escribe en **español**.
   - Si añades o cambias un texto visible, añade su traducción en `src/js/i18n/en-dictionary.js` (o un patrón en `EN_RX` en `src/js/i18n/i18n.js` si lleva números o nombres variables).
   - Nombres de variables y funciones en inglés; comentarios en español.
   - Estilo: comillas simples, punto y coma, 120 columnas, 2 espacios, LF.

## Estructura de carpetas

```
/
├── index.html                  ← Entrada real (HTML + orden de CSS y <script defer>)
├── .nojekyll                   ← Evita que GitHub Pages procese con Jekyll
├── CLAUDE.md                   ← Estas instrucciones
├── README.md
├── docs/
│   ├── ARQUITECTURA.md         ← Bucle, mundo, unidades, render, guardado
│   └── RECETAS.md              ← Paso a paso para añadir misiones, modelos, etc.
├── src/
│   ├── css/                    ← Estilos por zonas (orden = cascada en index.html)
│   ├── data/                   ← Tablas de geometría en JS (soldados, armas-1/2/3, matas-hierba)
│   ├── vendor/                 ← three.min.js (MIT)
│   └── js/
│       ├── boot/               ← splash.js, assets.js
│       ├── core/               ← config, random, game-state, models, save, main-loop, boot
│       ├── render/             ← renderer, lights, shadows, film-grade, camera…
│       ├── world/              ← rejilla, ciudad, chunks, aeropuerto, base TFR, mar…
│       ├── units/              ← soldados, batches, helicópteros, vehículos…
│       ├── sim/                ← simulación, pathfinding, los, órdenes, formaciones…
│       ├── combat/             ← disparos, impactos, escombros, RPG, apoyo aéreo…
│       ├── fx/                 ← partículas y efectos
│       ├── audio/              ← gunfire.js (carga assets/audio/sfx.json + .mp3), sound.js, menu-music.js
│       ├── input/              ← ratón, táctil y menú contextual
│       ├── ui/                 ← HUD, radio, pantallas, opciones, mapa táctico, manual
│       ├── i18n/               ← diccionario EN y traducción al vuelo
│       └── missions/           ← registry.js, attract.js, common/, tutorial/, m01-irene/, m02…m09
├── assets/
│   ├── models/                 ← <nombre>.heli + <nombre>.png (cargados con fetch desde assets.js)
│   ├── textures/               ← asfalto.jpg, isleta.jpg, detalle-suelo-*.jpg
│   ├── img/                    ← logos Épsilon (.webp), mancha-cafe.png
│   ├── audio/
│   │   ├── sfx.json            ← metadatos de los efectos (duración, ráfagas, loop)
│   │   ├── sfx/*.mp3           ← clips individuales
│   │   └── music/intro.mp3     ← música de la intro de campaña (streaming bajo demanda)
│   └── video/                  ← final.mp4 y final.webm (streaming al acabar m09)
└── tools/
    ├── smoke_test.py           ← Prueba de humo en Chromium (arranca todas las misiones)
    └── verify.mjs              ← Comparador de AST entre dos versiones
```

## Cómo entregar cambios (también desde claude.ai)

- Si añades un `.js` nuevo en `src/js/`, añade su `<script defer src="src/js/..."></script>` en `index.html` **después** de los archivos de los que dependa al cargar (y **antes** de `core/boot.js`).
- Si añades un `.css` nuevo en `src/css/`, añade su `<link rel="stylesheet" href="src/css/...">` en `index.html`.
- Si añades un modelo nuevo: sube `<nombre>.heli` y `<nombre>.png` a `assets/models/` y llámalo con `loadModel('<nombre>')` en `src/js/core/models.js`.
- Para probar en local hace falta un servidor HTTP (por ejemplo `python3 -m http.server 8000` o Live Server): abrir `index.html` con `file://` bloquea las peticiones `fetch` de modelos y sonidos.
- Antes de dar por bueno un cambio grande: `python3 tools/smoke_test.py`.
