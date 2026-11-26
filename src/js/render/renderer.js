/* ====================================================================================================
 * render/renderer.js
 *
 * Lo básico de three.js: renderer, sombras y calidad gráfica
 * ================================================================================================== */

const canvas = $('view');
const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = Math.min(innerWidth, innerHeight) < 700 ? T.PCFShadowMap : T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // las sombras solo se redibujan cuando algo se ha movido (shadowFrame)
/* Presets gráficos: cuántas luces recorren los shaders, el tamaño del mapa de sombras, cuándo pasan los modelos
   a su versión ligera, qué cosas pequeñas proyectan sombra y cada cuánto se animan los hombres lejanos o fuera de cámara */
const GFXQ = {
  high: { pt: 8, sp: 3, sm: 2048, soft: false, shN: 2, lod: 1, castR: 0.12, dsh: true, far: 22 },
  mid: { pt: 5, sp: 2, sm: 2048, soft: false, shN: 2, lod: 1.3, castR: 0.22, dsh: false, far: 16 },
  low: { pt: 3, sp: 1, sm: 1024, soft: false, shN: 3, lod: 1.8, castR: 0.34, dsh: false, far: 12 }
};
const GFX_PHONE =
  Math.min(innerWidth, innerHeight) < 700 || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
let GFX = null;
function gfxQ() {
  return GFX || GFXQ.high;
}
