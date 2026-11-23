/* ====================================================================================================
 * render/mesh-simplify.js
 *
 * Simplificación de mallas para la distancia: los vértices se agrupan en una rejilla (si hace falta, sin cruzar huesos)
 * y se tiran los triángulos que se colapsan. La uso con los soldados y los modelos grandes cuando se ven pequeños.
 * ================================================================================================== */

'use strict';

function simplifyGeo(geo, cell, keyAttr) {
  const P = geo.attributes.position,
    n = P.count,
    pa = P.array,
    idx = geo.index ? geo.index.array : null;
  const K = keyAttr ? geo.attributes[keyAttr].array : null,
    ks = keyAttr ? geo.attributes[keyAttr].itemSize : 0;
  const map = new Int32Array(n),
    keys = new Map(),
    rep = [];
  let m = 0;
  // nunca fusiono a través de una costura de textura o una arista viva: la textura se queda donde estaba y las caras planas siguen planas
  const UV = geo.attributes.uv,
    NR = geo.attributes.normal,
    uq = UV ? (UV.normalized ? 1 / 65535 : 1) : 0;
  for (let i = 0; i < n; i++) {
    let k =
      Math.floor(pa[i * 3] / cell) +
      ',' +
      Math.floor(pa[i * 3 + 1] / cell) +
      ',' +
      Math.floor(pa[i * 3 + 2] / cell) +
      (K ? ',' + K[i * ks] : '');
    if (UV) k += ',' + Math.round(UV.array[i * 2] * uq * 48) + ',' + Math.round(UV.array[i * 2 + 1] * uq * 48);
    if (NR && !K) {
      const f = NR.normalized ? 1 / 127 : 1;
      k +=
        ',' +
        Math.round(NR.array[i * 3] * f * 2) +
        Math.round(NR.array[i * 3 + 1] * f * 2) +
        Math.round(NR.array[i * 3 + 2] * f * 2);
    }
    let j = keys.get(k);
    if (j === undefined) {
      j = m++;
      keys.set(k, j);
      rep.push(i);
    }
    map[i] = j;
  }
  const N = idx ? idx.length : n,
    tri = [];
  for (let t = 0; t < N; t += 3) {
    const a = map[idx ? idx[t] : t],
      b = map[idx ? idx[t + 1] : t + 1],
      c = map[idx ? idx[t + 2] : t + 2];
    if (a !== b && b !== c && a !== c) tri.push(a, b, c);
  }
  const out = new T.BufferGeometry();
  for (const name in geo.attributes) {
    const s = geo.attributes[name],
      sz = s.itemSize,
      arr = new s.array.constructor(m * sz);
    for (let j = 0; j < m; j++) {
      const i = rep[j];
      for (let q = 0; q < sz; q++) arr[j * sz + q] = s.array[i * sz + q];
    }
    out.setAttribute(name, new T.BufferAttribute(arr, sz, s.normalized));
  }
  out.setIndex(m > 65535 ? new T.Uint32BufferAttribute(tri, 1) : new T.Uint16BufferAttribute(tri, 1));
  if (geo.boundingSphere) out.boundingSphere = geo.boundingSphere.clone();
  return out;
}
