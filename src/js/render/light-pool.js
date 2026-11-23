/* ====================================================================================================
 * render/light-pool.js
 *
 * Pool de luces: cada farola, fuego, fogonazo y luz de chaleco sigue funcionando igual, pero solo las pocas que más importan
 * en pantalla (brillantes, cerca de la vista) se encienden para los shaders; el número nunca cambia, así que no se recompila nada
 * ================================================================================================== */

'use strict';

let LP_PT = [],
  LP_SP = [],
  LP_N = 0,
  LP_SON = false;
const LP_S = [];
function lpShown(o) {
  while (o && o !== scene) {
    if (!o.visible && !o.isLight) return false;
    o = o.parent;
  }
  return !!o;
}
function lpPick(arr, K, R) {
  LP_S.length = 0;
  for (const L of arr) {
    if (!lpShown(L)) {
      L.visible = false;
      continue;
    }
    const e = L.matrixWorld.elements,
      x = L.parent === scene ? L.position.x : e[12],
      z = L.parent === scene ? L.position.z : e[14];
    const d = Math.hypot(x - camS.tx, z - camS.tz),
      reach = L.distance || 8;
    let sc = L.intensity > 0.001 ? (L.intensity + 0.1) * reach : 0;
    if (d > R + reach) sc *= 0.001;
    else if (d > R) sc /= 1 + (d - R);
    LP_S.push([sc, L]);
  }
  LP_S.sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < LP_S.length; k++) LP_S[k][1].visible = k < K;
}
function lightPool() {
  if (LP_N++ % 30 === 0) {
    LP_PT = [];
    LP_SP = [];
    scene.traverse(o => {
      if (o.isPointLight) LP_PT.push(o);
      else if (o.isSpotLight) LP_SP.push(o);
    });
  }
  const Q = gfxQ(),
    hh = halfH(),
    R = Math.hypot((hh * innerWidth) / innerHeight, hh / Math.sin(camS.pitch)) + 2;
  lpPick(LP_PT, Q.pt, R);
  LP_SON = nightF > (LP_SON ? 0.2 : 0.3);
  lpPick(LP_SP, LP_SON ? Q.sp : 0, R);
}
/* Resolución dinámica: cuando los fps se quedan por debajo de 28 la imagen se pinta un escalón más gruesa (hasta un 57 % más o menos), y vuelve
   a afinarse cuando pasa holgadamente de 52; el contador de FPS (Opciones) enseña los fps y la escala */
const DYN = { i: 0, acc: 0, n: 0, fps: 60, cool: 0 },
  DYN_K = [1, 1.2, 1.45, 1.75];
function dynTick(raw) {
  if (!(raw > 0) || raw > 1) return;
  DYN.acc += raw;
  DYN.n++;
  if (DYN.acc < 1) return;
  DYN.fps = DYN.n / DYN.acc;
  DYN.acc = 0;
  DYN.n = 0;
  const active = G && G.started && !G.paused && !G.over && !document.hidden;
  if (OPT.dyn === false) DYN.i = 0;
  else if (active) {
    DYN.cool--;
    if (DYN.fps < 28 && DYN.i < DYN_K.length - 1 && DYN.cool <= 0) {
      DYN.i++;
      DYN.cool = 2;
    } else if (DYN.fps > 52 && DYN.i > 0 && DYN.cool <= -5) {
      DYN.i--;
      DYN.cool = 2;
    }
  }
  const el = $('fpsC');
  if (el) {
    el.hidden = !OPT.fps;
    if (OPT.fps)
      el.textContent = Math.round(DYN.fps) + ' FPS' + (DYN.i ? ' · ' + Math.round(100 / DYN_K[DYN.i]) + ' %' : '');
  }
}
/* Ritmo de animación: los hombres fuera de cámara se colocan uno de cada cuatro frames, y uno de cada dos cuando la cámara está muy alejada */
let ANP_F = -1,
  ANP_R = 0;
function animDue(u, dt) {
  if (ANP_F !== frameStamp) {
    ANP_F = frameStamp;
    const hh = halfH();
    ANP_R = Math.hypot((hh * innerWidth) / innerHeight, hh / Math.sin(camS.pitch)) + 3;
  }
  u._anA = (u._anA || 0) + dt;
  if (u._anO == null) u._anO = (Math.random() * 4) | 0;
  const r = u.m.root,
    off = !r.visible || Math.hypot(u.x - camS.tx, u.z - camS.tz) > ANP_R;
  const every = off ? 4 : camS.zoom > gfxQ().far ? 2 : 1;
  u._anK = (u._anK || 0) + 1;
  if (every > 1 && (u._anK + u._anO) % every) return false;
  u._anD = Math.min(u._anA, 0.12);
  u._anA = 0;
  return true;
}
function applyGfx() {
  const g = OPT.gfx || (GFX_PHONE ? 'mid' : 'high');
  GFX = GFXQ[g] || GFXQ.high;
  const Q = GFX;
  if (sun.shadow.mapSize.x !== Q.sm) {
    sun.shadow.mapSize.set(Q.sm, Q.sm);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
  }
  const ty = Q.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
  if (renderer.shadowMap.type !== ty) {
    renderer.shadowMap.type = ty;
    scene.traverse(o => {
      if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true;
    });
  }
  for (const m of CASTS) {
    if (!m.parent) {
      CASTS.delete(m);
      continue;
    }
    m.castShadow = m.userData.cast0 && m.userData.castR >= Q.castR;
  }
  if (typeof chunkMesh !== 'undefined' && chunkMesh) chunkMesh.castShadow = Q.dsh;
  if (CRIT) CRIT.castShadow = Q.dsh;
  SHK.force = true;
}
