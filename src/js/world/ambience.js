/* ====================================================================================================
 * world/ambience.js
 *
 * Ambiente dinámico: viento, palmeras, toldos, banderas, pájaros y helicóptero
 * ================================================================================================== */

'use strict';

let palms = [],
  flags = [],
  birds = [],
  AW = [],
  awMesh = null,
  wireGeo = null,
  wireBase = null,
  wireMeta = null,
  heli = null;
const windAt = t =>
  0.65 + 0.35 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.77 + 1.3) + (typeof sandBoost === 'number' ? sandBoost : 0);
// una celda de calle sin pared al lado (el centro de una calle), el asfalto o una pista fuera de la ciudad
function onRoad(x, z) {
  const i = Math.floor(x),
    j = Math.floor(z);
  if (inB(i, j)) {
    if (!STR[idx(i, j)]) return false;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!inB(i + di, j + dj)) continue;
        const g = grid[idx(i + di, j + dj)];
        if (g === 1 || g === 3) return false;
      }
    return true;
  }
  return roadDist(x, z, ROADSEG)[0] < 4.2 || roadDist(x, z, TRACKS)[0] < 1.6;
}
function palm(x, z, h) {
  if (PLANNING) {
    lazyAdd(x, z, () => palm(x, z, h));
    return;
  }
  h = h || rr(3.2, 4.6);
  for (let k = 0; k < 234; k++) rnd();
  let hs = Math.imul(Math.round(x * 16), 73856093) ^ Math.imul(Math.round(z * 16), 19349663) ^ 0x2c1b3c6d;
  const R = () => {
    hs = (hs + 0x9e3779b9) | 0;
    let q = Math.imul(hs ^ (hs >>> 16), 0x85ebca6b);
    q = Math.imul(q ^ (q >>> 13), 0xc2b2ae35);
    return ((q ^ (q >>> 16)) >>> 0) / 4294967296;
  };
  const v = Math.floor(R() * 3) % 3;
  const e = {
    x,
    z,
    v,
    s: ((h * 1.4) / PALM_META[v].top) * (0.94 + R() * 0.12),
    ry: R() * Math.PI * 2,
    c: 0.84 + R() * 0.2
  };
  if (onRoad(x, z) || GHOST || stadIn(x, z)) return;
  if (CUR) CUR.PM.push(e);
  else palmReady(() => palmMesh([e], v, world));
}
