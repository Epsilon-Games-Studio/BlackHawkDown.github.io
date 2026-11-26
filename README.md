# Mogadiscio '93 · Black Hawk Down

Juego táctico en tiempo real con pausa sobre la batalla de Mogadiscio del 3 y 4 de octubre de 1993.
Lo hago yo, Jesús Navas Aller, bajo el nombre de **Épsilon Games Studio**.

Mandas a los Rangers y a los Delta calle a calle: los mueves por puntos, los pones a cubierto, pides
pasadas de Little Bird, cargas con los heridos y, si hace falta, con los muertos, porque aquí no se deja
a nadie atrás. La campaña sigue la cronología real, desde la Operación Irene hasta la Milla, y hay un
tutorial en la base de la Task Force Ranger para aprender a jugar antes de salir.

Se juega en el navegador, tanto en el ordenador como en el móvil en vertical.

---

## Arrancarlo en tu ordenador

Solo hace falta **Python 3**. No hay que instalar nada más.

```bash
python3 tools/serve.py --dev
```

Abre <http://localhost:8000> y a jugar. Mientras está en marcha, cada vez que guardas un archivo de
`src/` se vuelve a montar el juego solo, y basta con recargar la página.

> ¿Por qué no se abre `src/index.html` directamente? Porque es una plantilla. El juego de verdad lo
> monta `tools/build.py` juntando todas las piezas en un solo archivo, `dist/index.html`.

## Montar la versión para publicar

```bash
python3 tools/build.py
```

Deja en `dist/` todo lo que hay que subir:

- `index.html`: el juego entero en un solo archivo, sin comentarios ni sangrías para que pese menos.
- `music.js`, `sounds.js`, `video.js`, `videow.js`, `embed.js`, `embed2.js`, `embed3.js` y `embed4.js`: los paquetes
  grandes (música, sonidos, vídeos y modelos 3D). Casi nunca cambian, así que después de la primera
  vez normalmente basta con subir `index.html`.

| Comando | Para qué |
|---|---|
| `python3 tools/build.py` | El juego listo para publicar (ligero) |
| `python3 tools/build.py --dev` | Igual, pero con todos los comentarios (mejor para depurar) |
| `python3 tools/build.py --debug` | Versión `--dev` con un gancho para las pruebas automáticas (`dist/dbg.html`) |
| `python3 tools/serve.py` | Servidor local que se monta solo al guardar |
| `python3 tools/smoke_test.py` | Prueba de humo: arranca todas las misiones y mira que nada pete |
| `node tools/verify.mjs a.html b.html` | Comprueba que dos builds ejecutan exactamente el mismo código |

Si tienes Node, también vale `npm run dev`, `npm run build`, `npm run format` y `npm test`
(están en `package.json`).

---

## Cómo está organizado

```
BHD/
├── README.md              ← esto
├── docs/
│   ├── ARQUITECTURA.md    ← cómo funciona el juego por dentro
│   ├── RECETAS.md         ← paso a paso: añadir una misión, un modelo, un texto…
│   └── ANIMACIONES.md     ← las 188 animaciones y qué dispara cada una
├── src/                   ← TODO el código fuente
│   ├── index.html         ← la plantilla de la página (el build la rellena)
│   ├── html/              ← el HTML de cada parte: logo, HUD, pantallas, mapa
│   ├── css/               ← los estilos, por zonas (HUD, pantallas…) + manifest.txt con el orden
│   ├── js/                ← el juego (ver abajo) + manifest.txt con el orden de carga
│   ├── assets/            ← imágenes, texturas, modelos y datos que el build mete dentro
│   └── vendor/            ← three.js, tal cual
├── static/                ← los paquetes grandes que se publican al lado (música, vídeo, modelos)
├── tools/                 ← build, servidor, pruebas y verificación
└── dist/                  ← lo que genera el build (no se toca a mano)
```

### El JavaScript, por carpetas

| Carpeta | Qué hay |
|---|---|
| `core/` | Configuración, aleatorio con semilla, estado de la partida, modelos, guardado, bucle principal y arranque |
| `render/` | three.js: renderer, sol y hora del día, luces, sombras, LOD, batches de soldados, postproceso y cámara |
| `world/` | La ciudad y la región: rejilla, calles, edificios, mercados, árboles, mar, aeropuerto, base de la TFR, ambiente… |
| `units/` | Soldados (esqueleto, animación, armas), técnicas, columnas de vehículos y aeronaves con guion |
| `sim/` | La simulación: el paso de juego, órdenes, formaciones, búsqueda de caminos, visión, fatiga, edificios ocupables |
| `combat/` | Disparos, impactos, escombros, muros que se rompen, RPG, desangrarse, apoyo aéreo |
| `fx/` | Partículas y efectos de disparo |
| `audio/` | Disparos y sonidos construidos o grabados, y la música del menú |
| `input/` | Ratón, táctil y menú contextual |
| `ui/` | HUD, radio, pantallas, opciones, campaña, mapa táctico y manual de campo |
| `i18n/` | El diccionario español → inglés y la traducción al vuelo |
| `missions/` | Una por archivo (`m01`…`m09`), el tutorial, la pantalla de título y lo común a todas (`common/`) |

Cada archivo empieza con una cabecera que explica qué hace. Si buscas algo, mira primero las cabeceras.

---

## Lo que conviene saber antes de tocar nada

**El orden de carga importa.** El build pega los archivos de `src/js/manifest.txt` uno detrás de otro
dentro de una sola función, así que todos se ven entre sí como si fueran un único archivo. Las funciones
se pueden llamar desde cualquier sitio, pero lo que se ejecuta al cargar (los `const`, la construcción del
mundo…) va en el orden del manifiesto. Un archivo nuevo se pone justo después del último del que dependa.
Con el CSS pasa lo mismo: si dos reglas chocan, gana la que va después.

**La ciudad sale de una semilla.** Todo Mogadiscio se genera con `rnd()` a partir de la semilla 1993.
Si añades una tirada nueva de `rnd()` en mitad de la construcción, se mueve todo lo que viene detrás:
edificios, coches, puestos… Por eso verás muchos comentarios del tipo «su propio generador» o «dejo la
tirada para que no cambie nada»: lo nuevo usa un hash de la posición o un generador propio, y lo que se
quita deja su tirada hecha.

**Los textos se escriben en español.** El inglés sale del diccionario de `i18n/en-dictionary.js`. Si
añades una frase nueva que se ve en pantalla, añade también su traducción allí.

**Los datos gordos no están pegados en el código.** Texturas, modelos y tablas de datos viven en
`src/assets/`. En el código verás `__ASSET_URI__('textures/asfalto.jpg')`, `__INLINE__('data/soldados.json')`
o `__MODEL__('models/windows/w_b04')`, y el build los sustituye por el contenido real.

**Formato.** El código lo formatea Prettier (`.prettierrc.json`) y `.editorconfig` mantiene lo básico
en cualquier editor. Nombres de variables y funciones en inglés, comentarios en español.

---

## Comprobar que no he roto nada

1. `python3 tools/build.py` y probar en el navegador (en el ordenador y en el móvil en vertical).
2. `python3 tools/build.py --debug`, servir `dist/` y lanzar `python3 tools/smoke_test.py`: arranca
   las once misiones, simula unos segundos de cada una y avisa si salta algún error.
3. Si solo has reorganizado o comentado código, `node tools/verify.mjs viejo.html dist/index.html`
   compara el árbol sintáctico de los dos y te dice si el juego ejecuta exactamente lo mismo.

---

## Créditos

- Creado y dirigido por **Jesús Navas Aller** · Épsilon Games Studio.
- Motor 3D: [three.js](https://threejs.org) (licencia MIT).
- Los modelos 3D, texturas y sonidos son los que he ido subiendo al proyecto.
