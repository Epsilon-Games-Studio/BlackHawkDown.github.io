/* ====================================================================================================
 * render/shadow-map.js
 *
 * Mapa de sombras: las sombras de toda la ciudad solo se vuelven a renderizar cuando se mueve la cámara o el sol;
 * con la vista quieta solo lo necesitan las cosas que se mueven (soldados, vehículos, rotores), así que se refresca cada pocos frames
 * ================================================================================================== */

const SHK = { x: NaN, z: NaN, yaw: NaN, zoom: NaN, sx: NaN, sy: NaN, sz: NaN, n: 0, k: 0 };
function shadowFrame() {
  const s = sun.position,
    moved =
      Math.abs(camS.tx - SHK.x) > 0.02 ||
      Math.abs(camS.tz - SHK.z) > 0.02 ||
      Math.abs(camS.yaw - SHK.yaw) > 0.001 ||
      Math.abs(camS.zoom - SHK.zoom) > 0.01 ||
      Math.abs(s.x - SHK.sx) > 0.01 ||
      Math.abs(s.y - SHK.sy) > 0.01 ||
      Math.abs(s.z - SHK.sz) > 0.01;
  const live = G && G.started && !G.paused && !G.over;
  // la última prueba: un modelo que carga tarde también tiene su sombra
  if (moved || (live && ++SHK.n >= gfxQ().shN) || SHK.force || ++SHK.k % 30 === 0) {
    renderer.shadowMap.needsUpdate = true;
    SHK.n = 0;
    SHK.force = false;
    SHK.x = camS.tx;
    SHK.z = camS.tz;
    SHK.yaw = camS.yaw;
    SHK.zoom = camS.zoom;
    SHK.sx = s.x;
    SHK.sy = s.y;
    SHK.sz = s.z;
  }
}
