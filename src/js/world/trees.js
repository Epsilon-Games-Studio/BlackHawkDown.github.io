/* ====================================================================================================
 * world/trees.js
 *
 * Los árboles (la colección subida; las palmeras se quedan como están): cuatro modelos, corteza y hojas en una sola textura,
 * meciéndose en la GPU como las palmeras (el tronco se dobla, la copa se mueve más hacia el borde y un rotor encima la sacude)
 * ================================================================================================== */

'use strict';

const TREE_META = [
  { c: [-0.02, 2.33, 0.28], R: 2.17, h: 4.4, f: 2.07, cards: 231, of: 1760 },
  { c: [-0.13, 2.06, 0.07], R: 1.83, h: 4.0, f: 3.2, cards: 199, of: 16384 },
  { c: [-0.11, 1.81, -0.14], R: 1.35, h: 3.2, f: 3.2, cards: 118, of: 2728 },
  { c: [0.07, 1.7, 0.08], R: 1.45, h: 3.0, f: 2.64, cards: 145, of: 1800 }
];
const TREES = [];
let TREE_GEO = null,
  TREE_MAT = null,
  TREE_DEP = null,
  treeWait = [];
function treeReady(fn) {
  if (TREE_GEO) fn();
  else treeWait.push(fn);
}
function treeAt(x, z, h, small) {
  if (PLANNING) {
    lazyAdd(x, z, () => treeAt(x, z, h, small));
    return;
  }
  if (onRoad(x, z) || inStadium(x, z)) return; // ni en las carreteras ni dentro del estadio
  const a = phs(x, z, 21),
    v = small ? 2 + Math.floor(a * 2) : Math.floor(a * 4);
  const e = {
    x,
    z,
    v,
    s: (h / TREE_META[v].h) * (0.92 + phs(x, z, 22) * 0.16),
    ry: phs(x, z, 23) * 6.283,
    c: 0.88 + phs(x, z, 24) * 0.18
  };
  const L_ = CUR || chunkFor(x, z);
  if (CUR || !L_.gen) L_.TR.push(e);
  else
    treeReady(() => {
      if (L_.group) treeMesh([e], v, L_.group);
    });
}
function treeInit() {
  withModel('trees', M_ => {
    TREE_GEO = [0, 1, 2, 3].map(v => {
      const P_ = TREE_META[v],
        parts = [M_.geos['t' + v + '_trunk'], M_.geos['t' + v + '_leaves']];
      let nv = 0,
        ni = 0;
      for (const q of parts) {
        nv += q.attributes.position.count;
        ni += q.index.count;
      }
      const pos = new Float32Array(nv * 3),
        nor = new Float32Array(nv * 3),
        uv = new Float32Array(nv * 2),
        ap = new Float32Array(nv * 2),
        idx_ = new Uint32Array(ni);
      let o = 0,
        oi = 0;
      parts.forEach((q, pi) => {
        const pa = q.attributes.position,
          na = q.attributes.normal,
          ua = q.attributes.uv,
          ia = q.index.array;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i),
            y = pa.getY(i),
            z = pa.getZ(i),
            k = o + i;
          pos[k * 3] = x;
          pos[k * 3 + 1] = y;
          pos[k * 3 + 2] = z;
          nor[k * 3] = na.getX(i) / 127;
          nor[k * 3 + 1] = na.getY(i) / 127;
          nor[k * 3 + 2] = na.getZ(i) / 127;
          uv[k * 2] = ua.getX(i) / 65535;
          uv[k * 2 + 1] = ua.getY(i) / 65535;
          ap[k * 2] = Math.min(1.2, Math.pow(Math.max(0, y) / P_.h, 2)) * 0.55;
          ap[k * 2 + 1] = pi
            ? 0.45 * Math.pow(Math.min(1, Math.hypot(x - P_.c[0], y - P_.c[1], z - P_.c[2]) / P_.R), 1.5)
            : 0;
        }
        for (let i = 0; i < ia.length; i++) idx_[oi + i] = ia[i] + o;
        o += pa.count;
        oi += ia.length;
      });
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.setAttribute('aPalm', new T.BufferAttribute(ap, 2));
      geo.setIndex(new T.BufferAttribute(idx_, 1));
      geo.computeBoundingSphere();
      return geo;
    });
    const map = M_.mat.map;
    TREE_MAT = new T.MeshLambertMaterial({ map, alphaTest: 0.5, side: T.DoubleSide });
    TREE_MAT.onBeforeCompile = sh => palmShader(sh, true);
    TREE_MAT.customProgramCacheKey = () => 'treeL';
    TREE_DEP = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.5, side: T.DoubleSide });
    TREE_DEP.onBeforeCompile = sh => palmShader(sh, false);
    TREE_DEP.customProgramCacheKey = () => 'treeD';
    const w = treeWait;
    treeWait = [];
    for (const f of w) f();
  });
}
function treeMesh(L_, v, parent) {
  const m = new T.InstancedMesh(TREE_GEO[v], TREE_MAT, L_.length);
  m.castShadow = true;
  m.receiveShadow = true;
  m.customDepthMaterial = TREE_DEP;
  m.frustumCulled = false;
  L_.forEach((e, k) => {
    dummy.position.set(e.x, 0, e.z);
    dummy.rotation.set(0, e.ry, 0);
    dummy.scale.setScalar(e.s);
    dummy.updateMatrix();
    m.setMatrixAt(k, dummy.matrix);
    m.setColorAt(k, tmpCol.setRGB(e.c, e.c * 0.98, e.c * 0.93));
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  parent.add(m);
  TREES.push(m);
  return m;
}
function buildTrees(ch) {
  if (!ch.TR.length) return;
  treeReady(() => {
    if (!ch.group) return;
    for (let v = 0; v < 4; v++) {
      const L_ = ch.TR.filter(e => e.v === v);
      if (L_.length) treeMesh(L_, v, ch.group);
    }
  });
}
