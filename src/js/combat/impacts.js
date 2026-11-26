/* ====================================================================================================
 * combat/impacts.js
 *
 * Impactos de bala: rayos contra el mundo, escombros y agujeros
 * ================================================================================================== */

let HG = null,
  hgStamp = 0,
  trickles = [];
const RH = { ax: 0, sg: 1 };
const _hv = new T.Vector3(),
  _hd = new T.Vector3();
function buildHitGrid() {
  HG = [];
  for (let k = 0; k < W * H; k++) HG.push([]);
  const add = e => {
    e.r = 0.5 * Math.hypot(e.sx, e.sy, e.sz);
    e.st = 0;
    if (e.rx || e.ry || e.rz) {
      _e.set(e.rx, e.ry, e.rz, e.ord);
      e.q = new T.Quaternion().setFromEuler(_e);
      e.qi = e.q.clone().invert();
    }
    const i0 = Math.max(ORX, Math.floor(e.x - e.r)),
      i1 = Math.min(ORX + W - 1, Math.floor(e.x + e.r)),
      j0 = Math.max(ORZ, Math.floor(e.z - e.r)),
      j1 = Math.min(ORZ + H - 1, Math.floor(e.z + e.r));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) HG[idx(i, j)].push(e);
  };
  for (const e of BX) add(e);
  for (const e of AW) add(e);
  for (const e of CY) add(e);
}
function rayEntry(e, ox, oy, oz, dx, dy, dz, tMax) {
  if (e.gone) return -1;
  const px = e.x - ox,
    py = e.y - oy,
    pz = e.z - oz,
    tc = px * dx + py * dy + pz * dz;
  if (tc + e.r < 0 || tc - e.r > tMax) return -1;
  if (px * px + py * py + pz * pz - tc * tc > e.r * e.r) return -1;
  if (G && G.roofs && e.b >= 0 && (e.roof || e.y - e.sy / 2 >= CUT)) return -1;
  _hv.set(-px, -py, -pz);
  _hd.set(dx, dy, dz);
  if (e.qi) {
    _hv.applyQuaternion(e.qi);
    _hd.applyQuaternion(e.qi);
  }
  let t0 = -1e9,
    t1 = 1e9,
    ax = 0,
    sg = 1;
  for (let a = 0; a < 3; a++) {
    const o = a === 0 ? _hv.x : a === 1 ? _hv.y : _hv.z,
      d = a === 0 ? _hd.x : a === 1 ? _hd.y : _hd.z,
      h = (a === 0 ? e.sx : a === 1 ? e.sy : e.sz) / 2;
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(o) > h) return -1;
      continue;
    }
    let ta = (-h - o) / d,
      tb = (h - o) / d;
    if (ta > tb) {
      const t = ta;
      ta = tb;
      tb = t;
    }
    if (ta > t0) {
      t0 = ta;
      ax = a;
      sg = d > 0 ? -1 : 1;
    }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  if (t0 < 0 || t0 > tMax) return -1;
  RH.ax = ax;
  RH.sg = sg;
  return t0;
}
function groundCol(x, z) {
  const i = Math.floor(x),
    j = Math.floor(z);
  return isStreet(i, j) ? 0xcdb892 : inR(PLAZA, i, j) ? 0xd6cab0 : 0xbfa784;
}
// lo primero que encuentra una bala de o hacia t (siguiendo `extra` unidades pasado t); null si no hay nada
function traceShot(ox, oy, oz, tx, ty, tz, extra) {
  let dx = tx - ox,
    dy = ty - oy,
    dz = tz - oz;
  const L = Math.hypot(dx, dy, dz) || 1;
  dx /= L;
  dy /= L;
  dz /= L;
  const st = ++hgStamp,
    T0 = 0.9;
  let best = L + extra,
    be = null,
    bax = 0,
    bsg = 1;
  if (dy < -1e-6) {
    const tg = -oy / dy;
    if (tg > T0 && tg < best) {
      best = tg;
      be = 'ground';
    }
  }
  for (let t = 0; t <= best + 0.5; t += 0.4) {
    const i = Math.floor(ox + dx * t),
      j = Math.floor(oz + dz * t);
    if (!inB(i, j)) continue;
    const k = idx(i, j),
      list = HG[k] || [];
    for (let n = 0; n < list.length; n++) {
      const e = list[n];
      if (e.st === st) continue;
      e.st = st;
      const th = rayEntry(e, ox, oy, oz, dx, dy, dz, best);
      if (th > T0 && th < best) {
        best = th;
        be = e;
        bax = RH.ax;
        bsg = RH.sg;
      }
    }
    const o = cov[k];
    if (o && o.hb && o.hb.st !== st) {
      o.hb.st = st;
      const th = rayEntry(o.hb, ox, oy, oz, dx, dy, dz, best);
      if (th > T0 && th < best) {
        best = th;
        be = o.hb;
        bax = RH.ax;
        bsg = RH.sg;
      }
    }
  }
  if (!be) return null;
  const x = ox + dx * best,
    y = oy + dy * best,
    z = oz + dz * best;
  if (be === 'ground') return { x, y: 0, z, nx: 0, ny: 1, nz: 0, m: -1, c: groundCol(x, z), e: null, dx, dy, dz };
  _hv.set(0, 0, 0);
  _hv.setComponent(bax, bsg);
  if (be.q) _hv.applyQuaternion(be.q);
  return { x, y, z, nx: _hv.x, ny: _hv.y, nz: _hv.z, m: be.m, c: be.c, e: be, dx, dy, dz };
}

/* Trozos de escombro: cajitas que vuelan, rebotan, se asientan y se desvanecen */
const CHN = 1200;
let chunkMesh = null,
  CH = [],
  chHead = 0;
