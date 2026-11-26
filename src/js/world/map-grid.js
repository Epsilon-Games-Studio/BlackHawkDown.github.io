/* ====================================================================================================
 * world/map-grid.js
 *
 * El mapa
 *
 * La rejilla del mapa: tipos de celda, alturas, paletas de colores de fachada y las utilidades
 * para marcar y consultar celdas. Es la base sobre la que se construye todo.
 * ================================================================================================== */

let topH, grid, cov, reserved, ground, world, units, us, them, fx, sched, nBld, emitters, poles;
// la rejilla táctica normalmente cae sobre la ciudad; una misión puede llevarla a otro sitio (el tutorial la pone en el aeródromo)
let ORX = 0,
  ORZ = 0,
  TZONE = null;
const idx = (i, j) => (j - ORZ) * W + (i - ORX);
const inB = (i, j) => i >= ORX && j >= ORZ && i < ORX + W && j < ORZ + H;
const kI = k => (k % W) + ORX,
  kJ = k => ((k / W) | 0) + ORZ;
const walk = (i, j) => inB(i, j) && grid[idx(i, j)] === 0;
const PLAZA = { x0: OX + 36, x1: OX + 50, y0: OZ + 22, y1: OZ + 27 },
  MARKET = { x0: OX + 36, x1: OX + 50, y0: OZ + 36, y1: OZ + 49 };
const inR = (r, i, j) => i >= r.x0 && i <= r.x1 && j >= r.y0 && j <= r.y1;
const isStreet = (i, j) => inB(i, j) && STR[idx(i, j)] > 0;
const openArea = (i, j) => !inB(i, j) || isStreet(i, j) || inR(PLAZA, i, j);

const WALLS = [0xe6dfcc, 0xd9c7a0, 0xc9cfc0, 0xdcb487, 0xd0a688, 0xb8c3c4, 0xece2cc, 0xcfc4a8, 0xbfae8e, 0xd8cfb8];
const BASES = [0x5d876a, 0x4c7a82, 0x86684a, 0x95493a, 0x6a6a5c, 0x7a8a5a];
const ROOFS = [0xa79e8c, 0x9a9282, 0x8f866f, 0xb0a690];
const AWN = [0x4f6a52, 0x7e4a3e, 0x4a5c72, 0x8e7a4e, 0x46625e];
const SIGN = [0x4a5e74, 0xa89a62, 0x7e4a3e, 0x52684e, 0xd8d2c2];

const COVER_H = {
  sandbag: 0.58,
  barrier: 0.83,
  wall: 0.9,
  car: 0.85,
  van: 0.85,
  pickup: 0.85,
  bus: 0.85,
  barrel: 0.72,
  rubble: 0.3,
  crates: 0.6,
  tires: 0.55,
  stall: 0.76,
  tree: 0,
  fountain: 0.6
};
function setTop(x, y, w, d, h) {
  for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) if (inB(i, j)) topH[idx(i, j)] = h;
}
const barrelMats = {};
function barrelMat(c) {
  return (
    barrelMats[c] ||
    (barrelMats[c] = patchDetail(new T.MeshPhongMaterial({ color: c, specular: 0x111111, shininess: 8 }), {
      m: M.METAL,
      cyl: true,
      ext: [0.52, 0.72, 0.52]
    }))
  );
}
function markB(x, y, w, d) {
  for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) if (inB(i, j)) grid[idx(i, j)] = 1;
}
function freeLot(x, y, w, d) {
  for (let j = y; j < y + d; j++)
    for (let i = x; i < x + w; i++)
      if (!inB(i, j) || grid[idx(i, j)] !== 0 || reserved[idx(i, j)] || openArea(i, j)) return false;
  return true;
}
