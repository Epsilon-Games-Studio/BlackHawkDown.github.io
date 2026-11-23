/* ====================================================================================================
 * sim/line-of-sight.js
 *
 * Línea de visión y cobertura
 *
 * Línea de visión entre dos puntos, distancia y búsqueda de cobertura.
 * ================================================================================================== */

'use strict';

function los(ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az,
    d = Math.hypot(dx, dz),
    steps = Math.ceil(d * 3);
  const ai = Math.floor(ax),
    aj = Math.floor(az),
    bi = Math.floor(bx),
    bj = Math.floor(bz);
  for (let s = 1; s < steps; s++) {
    const t = s / steps,
      i = Math.floor(ax + dx * t),
      j = Math.floor(az + dz * t);
    if ((i === ai && j === aj) || (i === bi && j === bj)) continue;
    if (inB(i, j) && grid[idx(i, j)] === 1) return false;
  }
  return true;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function coverProt(t, sx, sz) {
  if (t.inB) return { v: t.inB.level === 'ground' ? 0.9 : t.stance === 'prone' ? 0.8 : 0.6, cell: -1 };
  const ti = Math.floor(t.x),
    tj = Math.floor(t.z);
  let dx = sx - t.x,
    dz = sz - t.z;
  const L = Math.hypot(dx, dz) || 1;
  dx /= L;
  dz /= L;
  let best = 0,
    cell = -1;
  for (let oy = -1; oy <= 1; oy++)
    for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const ol = Math.hypot(ox, oy),
        dot = (ox * dx + oy * dz) / ol;
      if (dot < 0.5) continue;
      const i = ti + ox,
        j = tj + oy;
      if (!inB(i, j)) continue;
      const k = idx(i, j);
      let v = 0;
      if (grid[k] === 1) v = 0.75;
      else if (grid[k] === 2 && cov[k]) v = cov[k].val;
      v *= dot > 0.85 ? 1 : 0.75;
      if (v > best) {
        best = v;
        cell = k;
      }
    }
  const st = t.stance === 'stand' ? 0.55 : 1;
  return { v: best * st, cell };
}
function findCover(si, sj, threat, radius, taken) {
  const N = W * H;
  if (!FC.d) {
    FC.d = new Int16Array(N);
    FC.s = new Uint32Array(N);
  }
  const st = ++FC.stamp,
    D_ = FC.d,
    Ss = FC.s;
  const dd = {
    get: k => (Ss[k] === st ? D_[k] : -1),
    set: (k, v) => {
      Ss[k] = st;
      D_[k] = v;
    }
  };
  const q = [idx(si, sj)];
  dd.set(q[0], 0);
  let best = null,
    bs = -1,
    h = 0;
  while (h < q.length) {
    const k = q[h++],
      i = kI(k),
      j = kJ(k),
      d = dd.get(k);
    if (!taken.has(k) && walk(i, j)) {
      const fake = { x: i + 0.5, z: j + 0.5, stance: 'crouch' };
      const pr = threat ? coverProt(fake, threat.x, threat.z).v : anyCover(i, j);
      const sc = pr - d * 0.035;
      if (pr >= 0.3 && sc > bs) {
        bs = sc;
        best = [i, j];
      }
    }
    if (d >= radius) continue;
    for (const [dx, dy] of DIRS) {
      const ni = i + dx,
        nj = j + dy;
      if (!walk(ni, nj)) continue;
      const nk = idx(ni, nj);
      if (dd.get(nk) !== -1) continue;
      dd.set(nk, d + 1);
      q.push(nk);
    }
  }
  return best;
}
function anyCover(i, j) {
  let b = 0;
  for (const [dx, dy] of DIRS) {
    const ni = i + dx,
      nj = j + dy;
    if (!inB(ni, nj)) continue;
    const k = idx(ni, nj);
    if (grid[k] === 2 && cov[k]) b = Math.max(b, cov[k].val);
  }
  return b;
}
