/* ====================================================================================================
 * render/model-lod.js
 *
 * LOD de modelos: el KC-10, los helicópteros, los camiones y el resto de modelos cargados llevan dos versiones más ligeras
 * de su geometría (hechas una vez y compartidas por todas las copias) y cambian a ellas cuando se ven pequeños en pantalla
 * ================================================================================================== */

'use strict';

let LODS = new Set();
function lodLevels(geo) {
  if (geo.userData.lods) return geo.userData.lods;
  if (!geo.boundingBox) geo.computeBoundingBox();
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const d = geo.boundingBox.min.distanceTo(geo.boundingBox.max),
    tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  if (tris < 600) return (geo.userData.lods = [geo, geo, geo]);
  return ((geo.userData.lods = [geo, null, null]), (geo.userData.lodD = d), geo.userData.lods);
}
function lodGet(geo, lv) {
  const L_ = lodLevels(geo);
  if (!L_[lv]) L_[lv] = simplifyGeo(geo, geo.userData.lodD / (lv === 1 ? 110 : 45));
  return L_[lv];
}
function lodMesh(geo, mat) {
  const m = new T.Mesh(geo, mat);
  m.userData.lodBase = geo;
  m.userData.lv = 0;
  LODS.add(m);
  return m;
}
function lodReg(m) {
  m.userData.lodBase = m.geometry;
  m.userData.lv = 0;
  LODS.add(m);
  return m;
}
// las cosas pequeñas no echan sombra por debajo del tamaño que marque el preset (la pasada de sombras se pinta tan a menudo como la vista)
const CASTS = new Set();
function castReg(m, geo, sc) {
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  m.userData.castR = geo.boundingSphere.radius * (sc || 1);
  m.userData.cast0 = m.castShadow;
  m.castShadow = m.userData.cast0 && m.userData.castR >= gfxQ().castR;
  CASTS.add(m);
}
let lodN = 0;
const _lodV = new T.Vector3();
function lodFrame() {
  if (++lodN % 6) return;
  for (let k = CRANEM.length - 1; k >= 0; k--) {
    const q = CRANEM[k];
    if (!q.parent) {
      CRANEM.splice(k, 1);
      continue;
    }
    q.visible = !(G && G.roofs);
  }
  const ppm = lowH / (2 * halfH());
  for (const m of LODS) {
    if (!m.parent) {
      LODS.delete(m);
      continue;
    }
    const base = m.userData.lodBase;
    if (!base.boundingSphere) base.computeBoundingSphere();
    const r = base.boundingSphere.radius * m.matrixWorld.getMaxScaleOnAxis(),
      px = 2 * r * ppm;
    const lb = gfxQ().lod;
    let lv = px > 110 * lb ? 0 : px > 45 * lb ? 1 : 2;
    if (lv !== m.userData.lv) {
      m.userData.lv = lv;
      m.geometry = lv ? lodGet(base, lv) : base;
    }
  }
}
