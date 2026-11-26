# Cómo funciona por dentro

Esto es el mapa general. Para el detalle, cada archivo de `src/js/` tiene su cabecera y sus comentarios.

## 1. De la página al primer frame

```
dist/index.html
 ├─ <style>     todo el CSS (src/css, en el orden de su manifest)
 ├─ splash      el logo de Épsilon (js/boot/splash.js): sale mientras carga lo demás
 ├─ HTML        HUD y pantallas (src/html)
 ├─ three.js    (src/vendor)
 ├─ static/*.js música, sonidos, vídeos y modelos en base64 → window.__EMBED
 ├─ assets.js   assetTxt() / assetPng(): sacan un modelo de __EMBED
 └─ el juego    los archivos de js/manifest.txt, en orden, dentro de una función
                (function(){ "use strict"; …todo… })();
```

Como todo el juego va dentro de **una sola función**, cualquier archivo ve las variables y funciones
de los demás sin `import` ni `export`. Es cómodo, pero tiene una regla: lo que se ejecuta **al cargar**
(un `const X = …` que llama a algo, construir mallas, etc.) solo puede usar lo que ya se ha cargado
antes en el manifiesto. Las funciones se pueden llamar desde cualquier sitio, porque cuando de verdad
se llaman ya está todo cargado.

El último archivo, `core/boot.js`, aplica las opciones guardadas y el idioma, arranca la batalla
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

Justo después va `updLeavingArea` (`sim/leaving-area.js`), que vigila en todas las misiones si una
unidad se aleja de la zona. La zona es el corredor que une el punto de partida con los objetivos, más
los derribos y la ruta de las columnas. Una misión puede ampliarla con `MIS.area` o quitarla con
`MIS.noArea`. A unas 3 manzanas fuera (`OOB.warn`), C2 avisa y empiezan los refuerzos enemigos. A
unas 6 (`OOB.rpg`) llega un último aviso y, si no vuelven, una salva de RPG elimina la unidad.

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
  Encima van las capas del cuerpo vivo (`units/death-physics.js` y `units/living-body*.js`): caídas con
  física, gestos, señales, atender heridos, explosiones… El catálogo completo, con lo que dispara cada
  una, está en `docs/ANIMACIONES.md`.
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
- **Cinemáticas de la introducción** (`film/prologue-film.js`): el puesto de ayuda humanitaria (después de «El hambre se
  convierte en un arma»; acaba cuando la técnica termina de avanzar, unos 22 s), la captura en la pista (46,5 s, al
  empezar a caer la tarde, antes del aviso del informante) y Mogadiscio desde las afueras (8 s, antes del título). Son
  cinemáticas de juego: la cámara del juego, que se gira, se acerca y se inclina; la radio arriba; y «Saltar escena», que
  usa `CINE` mientras duran.
  - Las dos primeras montan su propio escenario en una `T.Scene` aparte (suelo con relieve, pistas y caminos de tierra
    como cintas sobre el relieve, hierbajos, rocas, basura, casas de adobe, gallinas, un perro del modelo `animals`,
    pájaros; en el reparto, los puestos de mercado del juego montados con `marketStall` y un cobertizo de lona). Se
    ven como el juego porque usan sus mismas piezas: el sol con su mapa de sombras, la luz de ambiente y las luces de
    fogonazos, trazadoras y destellos se pasan a esa escena (`proLights()`) y vuelven al acabar; `setSun()` pone la hora
    (la captura lleva además un tono anaranjado, `S.gold`, y menos rayos, `S.rayK`); la calima es la misma niebla; el
    polvo, el humo y las motas son las partículas del juego; los disparos son `mzMats` + `muzzleLight` y las trazadoras
    `UBOX`/`trM`; y se pinta igual que una misión (oclusión ambiental y rayos con `atmoFrame`/`renderRays`, y la pasada de
    película).
  - La vista de la ciudad (`cityBuild`/`cityFrame`) usa la ciudad del juego, vista casi en horizontal (10°) desde las
    afueras del oeste con una cámara con perspectiva (la proyección de `cam` se cambia solo mientras dura), con el
    horizonte y el cielo; la cámara se desplaza despacio de lado. Esconde lo que hay de fondo (soldados, helicópteros,
    disparos y los cables de la luz, que de lejos cruzan el horizonte como una raya), y los trozos de ciudad de la vista se
    van generando antes, durante los textos (`cityWarm`). Pone gente andando (`findPath`), milicianos en las esquinas y
    unos coches en un grupo propio que se quita al acabar.
  - La música del final (`audio/intro-score.js`) usa los instrumentos de `audio/menu-music.js`: entra con la ciudad
    (`iscStart`), sube con un platillo y redobles bajo la última frase (`iscRise`) y estalla al salir el título
    BLACK HAWK DOWN (`iscHit`); se apaga al pasar a la misión o al saltar la intro (`iscStop`).
  - Modelos: camión `f_truck`, Jeep Cherokee `f_jeep` y el Willys blanco de la Cruz Roja `f_willys` (convertido del
    .blend subido, sin las marcas de la ONU y con las cruces pintadas) en `assets/models/film/`, técnica, tienda, Black
    Hawk, Little Bird y soldados. Mientras dura (`PRO.on`), el bucle principal solo pinta la escena.
- **Secuencia de la introducción** (`introSeq()` en `i18n/i18n.js`, la usan `playIntro` y `campIntro`): una cadena de
  pasos, cada uno espera al anterior: cada texto (2,6 s + 62 ms por letra), las cinemáticas donde marca `INTRO_FILM`
  (el paso siguiente espera a que acabe o se salte), y al final un fundido a negro con el título BLACK HAWK DOWN
  antes de pasar a la misión.

## 7. Idiomas y guardado

- Todo el texto está escrito en español. `L(texto)` lo traduce al inglés si hace falta, con el
  diccionario de `i18n/en-dictionary.js` y unos patrones para las frases con números o nombres.
- La campaña se guarda en el navegador y, en claude.ai, también en el almacén privado del jugador
  (`core/save.js`). Las opciones, solo en el navegador (`ui/options-and-menus.js`).
