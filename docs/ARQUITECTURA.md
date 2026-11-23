# Cómo funciona por dentro

Esto es el mapa general. Para el detalle, cada archivo de `src/js/` tiene su cabecera y sus comentarios.

## 1. De la página al primer frame

```
index.html (en la raíz, servido tal cual por GitHub Pages)
 ├─ <link>      16 hojas CSS de src/css/ en orden de cascada
 ├─ splash      el logo de Épsilon (src/js/boot/splash.js): sale mientras carga lo demás
 ├─ HTML        HUD, pantallas, cinemáticas y mapa táctico
 ├─ three.js    (src/vendor/three.min.js)
 ├─ assets.js   assetBin() / assetPng(): cargan modelos .heli + .png desde assets/models/
 ├─ data/*.js   tablas de geometría síncrona (src/data/)
 └─ el juego    los <script defer> de src/js/, en orden de dependencia
```

Todos los `<script defer>` del juego se descargan en paralelo y se ejecutan en orden en el ámbito
global compartido, cada uno con `'use strict';` en su cabecera. Es cómodo porque no hace falta
`import`/`export` ni compilación, pero tiene dos reglas: no repetir nombres de primer nivel entre
archivos, y lo que se ejecuta **al cargar** (un `const X = …` que llama a algo, construir mallas,
etc.) solo puede usar lo que ya se ha ejecutado en un `<script>` anterior de `index.html`. Las
funciones se pueden llamar desde cualquier sitio, porque cuando se ejecutan ya está todo cargado.

Mientras tanto, los modelos (`.heli` + `.png`), las texturas y los efectos de sonido (`assets/audio/sfx.json`
+ `.mp3`) se descargan en paralelo sin bloquear el arranque; la música de la intro y el vídeo final
se cargan en *streaming* solo en su misión.

El último archivo, `src/js/core/boot.js`, aplica las opciones guardadas y el idioma, arranca la batalla
de fondo de la pantalla de título (`startAttract`) y lanza el bucle.

## 2. El bucle

`core/main-loop.js` → `frame(now)`, una vez por frame del navegador:

1. Cámara: suaviza giro y zoom, y mueve el vuelo de Irene o la cinemática si las hay.
2. Mundo: `updWorld()` construye unos pocos chunks de ciudad que faltan cerca de la cámara.
3. Simulación: si la partida corre y no está en pausa, `step(dt)` (en `sim/simulation.js`), dos
   medios pasos si va a velocidad doble.
4. Ambiente: viento, palmeras, ropa tendida, basura, pájaros y luces (siguen aunque no haya partida).
5. Sol: `setSun()` con la hora de la misión, que avanza a `TIMESCALE` (3 veces el tiempo real).
6. `sync()`: coloca cada malla donde dice el estado.
7. Render: escena a baja resolución, sombras solo si algo se ha movido, rayos de luz, postproceso
   de película (`render/film-grade.js`) y encima el overlay (anillos, rutas, marcadores).

`step(dt)` es el corazón: guiones y cinemáticas, cohetes, columnas y técnicas, tareas programadas
(`sched`), visibilidad, cada unidad (`updUnit`), formaciones, vida entre órdenes, heridos, fatiga
y el avance de la misión (`updMission`).

## 3. El mundo

- Una **rejilla de 768 × 768 celdas** (1 celda = 1,5 m) contiene la ciudad. Cada celda sabe si se puede
  andar (`grid`), su altura (`topH`), qué cobertura tiene (`cov`) y de qué tipo es el suelo (`ground`).
- La ciudad se **planifica entera** al empezar (calles, manzanas, edificios clave) con el aleatorio con
  semilla de `core/random.js`, pero solo se **construye en 3D** por chunks cuando la cámara se acerca
  (`world/chunks.js`).
- Casi todo se pinta con `InstancedMesh`: cajas iguales agrupadas (`world/instanced-parts.js`) y modelos
  subidos instanciados por chunk (`world/props.js`, `world/markets.js`…).
- Fuera de la rejilla está la región: la costa, las aldeas, la carretera del aeropuerto y la base de la
  Task Force Ranger (`world/airport.js`, `world/tfr-base.js`).

> **Ojo con la semilla.** Si metes una tirada nueva de `rnd()` durante la construcción, se mueve todo
> lo que viene detrás. Lo nuevo debe usar un hash de la posición o su propio generador.

## 4. Las unidades

- Cada soldado es un esqueleto articulado (`units/soldier-rig.js`) animado con muelles y capas
  procedurales: paso, carrera agachado, cojera, recarga, IK de las manos al arma y de los pies al suelo.
- Para pintar cientos de hombres de golpe se agrupan en **batches** (`units/soldier-batches.js`):
  una sola llamada de dibujo para muchos esqueletos, y versiones más ligeras cuando se ven pequeños.
- Los nuestros están en `us`, la milicia en `them` y todos juntos en `units`. Los grupos que maneja el
  jugador (cada uno con su ficha) están en `IRN.groups` (`sim/force-groups.js`).

## 5. El estado y las misiones

- `G` (`core/game-state.js`) guarda la partida: tiempo, pausa, selección, subobjetivo actual, bajas…
  `G.m` es la bolsa de cada misión para sus propias cosas.
- `MIS` es la misión cargada. Todas están registradas en `MISSIONS` (`missions/registry.js`) y la
  campaña, en orden, en `CAMPAIGN` (`missions/attract.js`).
- Una misión tiene sus datos (título, hora, briefing…), un `spawn()` que coloca a la gente, un `onStart()`
  y una lista de **subobjetivos** (`subs`). El motor común está en `missions/common/mission-flow.js`:
  arranca cada sub, comprueba si está cumplido, guarda punto de control y termina la misión.
- Las cinemáticas usan `cineStart()` (`missions/common/cinematics.js`): fotogramas clave con texto
  o funciones, en tiempo de juego, que se pueden saltar.
- La radio va por `radio()` y `say()` (`ui/radio-chat.js`).

## 6. Render

- **Baja resolución a propósito**: se pinta a una fracción de la pantalla (`PS`) y se escala sin suavizar,
  para el aspecto pixel-art. La resolución baja sola si los fps caen (`render/light-pool.js`).
- **Sombras** solo cuando la cámara, el sol o algo se mueve (`render/shadow-map.js`).
- **Luces**: un pool fijo de luces que se reparte entre las que más importan en pantalla, para que los
  shaders no se recompilen nunca.
- **Postproceso**: etalonaje de película, rayos de sol, cielo, niebla, visión nocturna (`render/film-grade.js`).
- **Reflejos en el mar**: solo los helicópteros, con una cámara reflejada (`world/ocean.js`).

## 7. Idiomas y guardado

- Todo el texto está escrito en español. `L(texto)` lo traduce al inglés si hace falta, con el
  diccionario de `i18n/en-dictionary.js` y unos patrones para las frases con números o nombres.
- La campaña se guarda en el navegador y, en claude.ai, también en el almacén privado del jugador
  (`core/save.js`). Las opciones, solo en el navegador (`ui/options-and-menus.js`).
