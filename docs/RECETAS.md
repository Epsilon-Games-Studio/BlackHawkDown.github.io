# Recetas

Las cosas que más se repiten, paso a paso.

## Añadir una misión

1. Crea `src/js/missions/m10-loquesea.js` con su cabecera (copia la de otra misión y cámbiala).
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

3. Añádela al manifiesto `src/js/manifest.txt`, justo después de `missions/m09-la-milla.js`.
4. Métela en la campaña: en `missions/attract.js`, añade su id a `CAMPAIGN`.
5. Traduce sus textos (título, briefing, objetivos, frases de radio) en `i18n/en-dictionary.js`.
6. `python3 tools/serve.py --dev`, a probarla.

Lo común para todas (subobjetivos, puntos de control, final) ya lo hace `missions/common/mission-flow.js`.

## Añadir una frase o un texto de pantalla

Se escribe en español donde haga falta, `radio(u, '¡Contacto!')` por ejemplo, y en
`i18n/en-dictionary.js` se añade la pareja `"¡Contacto!": "Contact!"`. Si la frase lleva números
o nombres que cambian, hace falta un patrón en `EN_RX` (en `i18n/i18n.js`).

## Añadir un archivo de código

1. Créalo en la carpeta que le toque, con su cabecera.
2. Ponlo en `src/js/manifest.txt` **después** de los archivos que use al cargar.
3. Si solo define funciones, el sitio da igual mientras esté antes de `core/boot.js`.

## Añadir un modelo 3D

Los modelos van en formato HELI (geometría binaria en base64, la lee `parseHeli` en
`units/helicopters.js`) más una textura PNG.

1. Copia `nombre.heli` y `nombre.png` a `src/assets/models/<carpeta>/`.
2. En el código: `if (EMB) EMB.nombre = __MODEL__('models/<carpeta>/nombre');` y después
   `loadModel('nombre')`. Para usarlo: `withModel('nombre', M => { … })`.
3. Los modelos grandes y que no cambian pueden ir en un paquete de `static/` para que el
   `index.html` no engorde.

## Cambiar estilos

Cada zona tiene su archivo en `src/css/`. Si una regla no hace caso, mira el orden en
`src/css/manifest.txt`: gana la que va después.

## Publicar

```bash
python3 tools/build.py
```

Sube `dist/index.html`. Los paquetes de `static/` solo hay que subirlos si han cambiado.

## Antes de publicar algo gordo

```bash
python3 tools/build.py --debug
python3 tools/smoke_test.py
```

(La prueba de humo necesita Playwright: `pip install playwright && playwright install chromium`.)

Y una partida de verdad en el ordenador y otra en el móvil en vertical.
