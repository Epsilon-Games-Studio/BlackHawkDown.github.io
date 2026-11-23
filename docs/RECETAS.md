# Recetas

Las cosas que más se repiten, paso a paso.

## Añadir una misión

1. Crea `src/js/missions/m10-loquesea.js` con `'use strict';` y su cabecera (copia la de otra misión y cámbiala).
2. Define la misión:

   ```js
   MISSIONS.loquesea = {
     id: 'loquesea',
     n: 10,                       // número en la campaña
     title: 'Título',
     hud: 'Objetivo principal',   // lo que sale en el panel de arriba
     phase: 'night',              // day | dusk | night | dawn
     hour: 2.5,                   // hora de inicio (2:30)
     date: '4 OCT 1993',
     place: 'Dónde pasa',
     squadTxt: 'Quién va',
     summary: 'Una línea para la lista de la campaña.',
     text: 'El briefing completo.',
     start: [x, z],               // dónde empieza la cámara
     cam: [x, z, zoom],
     spawn() { /* colocar a la gente: addGroup(), foe(), npcUnit()… */ },
     onStart() { /* cinemática de entrada, radio… */ },
     subs: [
       {
         text: 'Llegar al cruce',
         zone: { x, z, r: 6 },    // el anillo en el suelo
         tip: 'Consejo que sale al empezar el objetivo',
         start: () => {},         // al empezar este objetivo
         tick: () => {},          // en cada paso mientras está activo
         count: () => [hechos, total],
         done: () => /* true cuando se cumple */ false,
         onDone: () => {},
         radio: 'Frase que se oye al cumplirlo'
       }
     ],
     opt: [{ text: 'Objetivo opcional', ok: () => true }]
   };
   ```

3. Enlázala en `index.html` con `<script defer src="src/js/missions/m10-loquesea.js"></script>`, justo después de `m09-la-milla.js`.
4. Métela en la campaña: en `src/js/missions/attract.js`, añade su id a `CAMPAIGN`.
5. Traduce sus textos (título, briefing, objetivos, frases de radio) en `src/js/i18n/en-dictionary.js`.
6. Abre un servidor local (`python3 -m http.server 8000`) y a probarla.

Lo común para todas (subobjetivos, puntos de control, final) ya lo hace `src/js/missions/common/mission-flow.js`.

## Añadir una frase o un texto de pantalla

Se escribe en español donde haga falta, `radio(u, '¡Contacto!')` por ejemplo, y en
`src/js/i18n/en-dictionary.js` se añade la pareja `"¡Contacto!": "Contact!"`. Si la frase lleva números
o nombres que cambian, hace falta un patrón en `EN_RX` (en `src/js/i18n/i18n.js`).

## Añadir un archivo de código

1. Créalo en la carpeta de `src/js/` que le toque, con su cabecera y `'use strict';` al principio.
2. Enlázalo en `index.html` con `<script defer src="src/js/...">` **después** de los archivos que use al cargar (y antes de `core/boot.js`).
3. Si solo define funciones, el sitio da igual mientras esté antes de `core/boot.js`.

## Añadir un modelo 3D

Los modelos van en formato binario HELI (lo lee `parseHeli` en `src/js/units/helicopters.js`) más una textura PNG.

1. Copia `nombre.heli` y `nombre.png` a `assets/models/`.
2. En `src/js/core/models.js`, llama a `loadModel('nombre')`. Para usarlo en el mundo o en una misión: `withModel('nombre', M => { … })`.

## Añadir o cambiar un sonido

Los efectos viven en `assets/audio/sfx/<nombre>.mp3` y sus tiempos en `assets/audio/sfx.json`.
Si añades o sustituyes un clip, actualiza su entrada en `sfx.json` (al menos la duración `d`, y `r`/`t`/`s`/`loop` si aplica).

## Cambiar estilos

Cada zona tiene su archivo en `src/css/`. Si una regla no hace caso, mira el orden de los `<link rel="stylesheet">` en `index.html`: gana la que va después. Si añades un archivo nuevo, añade su `<link>` ahí.

## Publicar

GitHub Pages publica directamente la rama `main` tal cual: basta con subir los archivos cambiados (sin paso de compilación).

## Antes de publicar algo gordo

```bash
python3 tools/smoke_test.py
```

(La prueba de humo necesita Playwright: `pip install playwright && playwright install chromium`.)

Y una partida de verdad en el ordenador y otra en el móvil en vertical.
