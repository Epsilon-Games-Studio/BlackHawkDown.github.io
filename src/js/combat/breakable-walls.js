/* ====================================================================================================
 * combat/breakable-walls.js
 *
 * Muros que se rompen: las cajas del edificio se recortan alrededor de un agujero (varios cortes solapados dejan el borde irregular); un impacto
 * en una esquina se la lleva. Los trozos vuelven a la malla instanciada del propio chunk, así el muro roto conserva su aspecto
 * ================================================================================================== */

function boxAxis(e) {
  const r = ((e.ry % Math.PI) + Math.PI) % Math.PI;
  return !e.rx && !e.rz && (r < 0.02 || Math.abs(r - Math.PI / 2) < 0.02 || Math.abs(r - Math.PI) < 0.02);
}
function boxAABB(e) {
  const r = ((e.ry % Math.PI) + Math.PI) % Math.PI,
    sw = Math.abs(r - Math.PI / 2) < 0.02,
    sx = sw ? e.sz : e.sx,
    sz = sw ? e.sx : e.sz;
  return [e.x - sx / 2, e.x + sx / 2, e.y - e.sy / 2, e.y + e.sy / 2, e.z - sz / 2, e.z + sz / 2];
}
function chunkOf(e) {
  for (const ch of GEN) {
    if (ch.BX.includes(e)) return [ch, 'BX'];
    if (ch.BXm.includes(e)) return [ch, 'BXm'];
  }
  return null;
}
function hgAdd(e) {
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
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const k = idx(i, j);
      (HG[k] || (HG[k] = [])).push(e);
    }
}
function chunkRebuild(ch) {
  for (const [k, L, sh] of [
    ['box', 'BX', true],
    ['bxm', 'BXm', false]
  ]) {
    if (!ch[L].length) continue;
    const old = ch[k];
    ch[k] = makeInst(UBOX, ch[L], sh, ch.group);
    if (old) {
      ch.group.remove(old);
      old.geometry.dispose();
    }
  }
  if (G && G.roofs) cutChunk(ch, true);
}
// una caja menos otra caja, las dos alineadas con los ejes: hasta seis piezas
function subBox(A, Hb) {
  const [x0, x1, y0, y1, z0, z1] = A,
    hx0 = Math.max(x0, Hb[0]),
    hx1 = Math.min(x1, Hb[1]),
    hy0 = Math.max(y0, Hb[2]),
    hy1 = Math.min(y1, Hb[3]),
    hz0 = Math.max(z0, Hb[4]),
    hz1 = Math.min(z1, Hb[5]);
  if (hx0 >= hx1 || hy0 >= hy1 || hz0 >= hz1) return null;
  const out = [],
    add = (a, b, c, d, e, f) => {
      if (b - a > 0.02 && d - c > 0.02 && f - e > 0.02) out.push([a, b, c, d, e, f]);
    };
  add(x0, hx0, y0, y1, z0, z1);
  add(hx1, x1, y0, y1, z0, z1);
  add(hx0, hx1, y0, hy0, z0, z1);
  add(hx0, hx1, hy1, y1, z0, z1);
  add(hx0, hx1, hy0, hy1, z0, hz0);
  add(hx0, hx1, hy0, hy1, hz1, z1);
  return out;
}
function holePunch(h) {
  const e0 = h.e;
  if (!e0 || e0.b == null || e0.b < 0 || !boxAxis(e0) || !HG) return false;
  const bid = e0.b,
    ax = Math.abs(h.nx) > Math.abs(h.nz),
    s = ax ? Math.sign(h.nx) : Math.sign(h.nz);
  const corner = h.corner || 0,
    w = corner ? 2.4 : rr(1.4, 1.8),
    hh = corner ? rr(2.2, 2.8) : rr(1.3, 1.6),
    dep = corner ? 1.5 : rr(0.8, 1.1);
  // los cortes: el principal y dos más pequeños en sus bordes, para que el agujero no sea una caja perfecta
  const cut = (cw, ch_, cd, ot, oy) => {
    const t0 = (ax ? h.z : h.x) + ot + (corner ? corner * 0.6 : 0),
      y0 = Math.max(0.2, h.y + oy - ch_ / 2);
    const n0 = (ax ? h.x : h.z) - s * cd,
      n1 = (ax ? h.x : h.z) + s * 0.3,
      nl = Math.min(n0, n1),
      nh = Math.max(n0, n1);
    return ax ? [nl, nh, y0, y0 + ch_, t0 - cw / 2, t0 + cw / 2] : [t0 - cw / 2, t0 + cw / 2, y0, y0 + ch_, nl, nh];
  };
  const cuts = [
    cut(w, hh, dep, 0, 0),
    cut(w * 0.55, hh * 0.5, dep * 0.7, rr(-0.5, 0.5) * w, hh * 0.5),
    cut(w * 0.5, hh * 0.45, dep * 0.6, rr(-0.4, 0.4) * w, -hh * 0.45)
  ];
  // todas las cajas rectas de ese edificio a las que llegan los cortes
  const seen = new Set(),
    cand = [];
  const ci = Math.floor(h.x),
    cj = Math.floor(h.z);
  for (let j = cj - 3; j <= cj + 3; j++)
    for (let i = ci - 3; i <= ci + 3; i++) {
      if (!inB(i, j)) continue;
      for (const e of HG[idx(i, j)] || [])
        if (!seen.has(e)) {
          seen.add(e);
          if (e.b === bid && !e.gone && !e.isProp && !e.inv && boxAxis(e)) cand.push(e);
        }
    }
  // una caja que queda casi toda dentro de los cortes desaparece entera (si no, se quedaría colgando)
  const vol = A => (A[1] - A[0]) * (A[3] - A[2]) * (A[5] - A[4]);
  const inside = A => {
    let v = 0;
    for (const Hb of cuts) {
      const x0 = Math.max(A[0], Hb[0]),
        x1 = Math.min(A[1], Hb[1]),
        y0 = Math.max(A[2], Hb[2]),
        y1 = Math.min(A[3], Hb[3]),
        z0 = Math.max(A[4], Hb[4]),
        z1 = Math.min(A[5], Hb[5]);
      if (x1 > x0 && y1 > y0 && z1 > z0) v += (x1 - x0) * (y1 - y0) * (z1 - z0);
    }
    return v / Math.max(1e-6, vol(A));
  };
  let work = [],
    touched = new Set(),
    blown = [],
    any = false;
  for (const e of cand) {
    const A = boxAABB(e),
      f = inside(A);
    if (f <= 0) continue;
    if (f > 0.55) {
      blown.push(e);
      any = true;
    } else work.push({ e, A, src: e });
  }
  for (const Hb of cuts) {
    const next = [];
    for (const p of work) {
      const r = subBox(p.A, Hb);
      if (!r) {
        next.push(p);
        continue;
      }
      any = true;
      touched.add(p.src);
      for (const A of r) next.push({ e: null, A, src: p.src });
    }
    work = next;
  }
  if (!any) return false;
  holeStrip(cuts, bid, ax, h);
  const chs = new Set();
  for (const e of blown) {
    const where = chunkOf(e);
    if (where) {
      chs.add(where[0]);
      e.gone = true;
    }
  }
  for (const src of touched) {
    const where = chunkOf(src);
    if (!where) continue;
    const [ch] = where;
    chs.add(ch);
    src.gone = true;
    for (const p of work)
      if (p.src === src && !p.e) {
        const A = p.A;
        if (Math.min(A[1] - A[0], A[3] - A[2], A[5] - A[4]) < 0.07) continue; // que no queden astillas flotando
        const n = inst(
          (A[0] + A[1]) / 2,
          (A[2] + A[3]) / 2,
          (A[4] + A[5]) / 2,
          A[1] - A[0],
          A[3] - A[2],
          A[5] - A[4],
          src.c,
          { m: src.m, b: src.b, roof: src.roof }
        );
        ch.BX.push(n);
        hgAdd(n);
      }
  }
  for (const ch of chs) chunkRebuild(ch);
  clearMarksOf(new Set([...touched, ...blown])); // las marcas de bala y el hollín de las cajas recortadas se quedarían colgando en el aire
  // hollín alrededor del hueco y en el fondo del agujero si tiene fondo
  const C = cuts[0],
    tw = ax ? C[5] - C[4] : C[1] - C[0];
  for (const off of [-1, 1]) {
    const q = {
      x: ax ? h.x + s * 0.02 : h.x + off * (tw / 2 + 0.2),
      y: h.y + rr(-0.2, 0.3),
      z: ax ? h.z + off * (tw / 2 + 0.2) : h.z + s * 0.02
    };
    const hb = traceShot(q.x + h.nx * 0.5, q.y, q.z + h.nz * 0.5, q.x - h.nx * 0.3, q.y, q.z - h.nz * 0.3, 0);
    if (hb && hb.m >= 0) scorch(hb, rr(0.55, 0.8));
  }
  {
    const hb = traceShot(
      h.x + h.nx * 0.5,
      h.y,
      h.z + h.nz * 0.5,
      h.x - h.nx * (dep + 0.4),
      h.y,
      h.z - h.nz * (dep + 0.4),
      0
    );
    if (hb && hb.m >= 0 && Math.hypot(hb.x - h.x, hb.z - h.z) > 0.3) scorch(hb, rr(0.9, 1.2));
  }
  return { cuts, ax, s, w, hh, dep, corner };
}
/* Lo que cuelga de la parte del muro que ya no está se va con él: marcos de ventana y sus cristales, aires acondicionados, toldos, carteles y las
   cajas invisibles que hacían sus veces (no puede quedar nada en el aire) */
/* El montón: más de lo que daría de verdad el agujero, para que se lea como mucho escombro. Unos pocos terrones grandes y aplanados hacen el cuerpo
   contra el muro y cientos de trozos lo cubren, más alto al pie del muro y aclarándose hacia la calle; el suelo que queda abierto detrás del muro
   también se cubre. Por el agujero caen además trozos más grandes que ruedan y acaban delante. */
function rubbleHeap(h, H, cc) {
  const C = H.cuts[0],
    ax = H.ax,
    nx = h.nx,
    nz = h.nz,
    tx = -nz,
    tz = nx;
  const tc = ax ? (C[4] + C[5]) / 2 : (C[0] + C[1]) / 2,
    wc = ax ? h.x : h.z; // el centro del agujero a lo largo del muro, y la línea del muro
  const bx = ax ? wc : tc,
    bz = ax ? tc : wc,
    half = (ax ? C[5] - C[4] : C[1] - C[0]) / 2 + 0.5,
    y0 = C[2],
    low = y0 < 0.75;
  const floorY = low ? 0 : y0,
    D = H.corner ? 3.8 : 3.2,
    Hm = H.corner ? 0.75 : 0.55,
    sideOut = H.corner ? 1.6 : 0;
  const at = (d, t) => [bx + nx * d + tx * t, bz + nz * d + tz * t];
  const prof = (d, t) =>
    Hm *
    Math.pow(1 - Math.min(1, Math.max(0, d) / D), 1.3) *
    (1 - Math.min(1, Math.pow(Math.abs(t) / (half + 1.2), 2)));
  const lay = (x, z, y, s, flat, sq) => {
    const c = spawnShard(x, y, z, 0, 0, 0, s, cc(), flat, true);
    if (!c) return;
    if (sq) c.sy *= sq;
    c.y = y + c.sy * 0.25;
  };
  // el cuerpo del montón
  for (let k = 0; k < 12; k++) {
    const d = rr(-0.2, 1.6),
      t = rr(-half, half) + (H.corner ? H.corner * rr(0, sideOut) : 0),
      [x, z] = at(d, t);
    lay(x, z, 0, rr(0.55, 1.0), false, rr(0.28, 0.42));
  }
  // trozos encima y desparramándose, un tercio de ellos sobre el suelo de detrás del muro roto
  for (let k = 0; k < 300; k++) {
    const inside = rnd() < 0.3,
      d = inside ? -rr(0, H.dep * 0.95) : D * Math.pow(rnd(), 1.5),
      t = rr(-half, half) + (H.corner && rnd() < 0.35 ? H.corner * rr(0, sideOut + 1) : 0),
      [x, z] = at(d, t);
    const s = rnd() < 0.12 ? rr(0.28, 0.45) : rr(0.05, 0.22),
      base = inside ? floorY : 0,
      hgt = inside ? (low ? Hm * 0.9 : 0.25) : prof(d, t);
    lay(x, z, base + hgt * rnd(), s, rnd() < 0.3, 0);
  }
  // trozos más grandes cayendo por el agujero, despedidos hacia fuera
  for (let k = 0; k < 60; k++) {
    const t = rr(-half + 0.3, half - 0.3),
      y = rr(C[2] + 0.1, C[3] - 0.1),
      [x, z] = at(rr(-0.3, 0.2), t),
      v = rr(1.2, 4.2);
    spawnShard(
      x,
      y,
      z,
      (nx * rr(0.8, 1.4) + tx * rr(-0.35, 0.35)) * v,
      rr(0.2, 2.2),
      (nz * rr(0.8, 1.4) + tz * rr(-0.35, 0.35)) * v,
      rr(0.08, 0.24),
      cc(),
      rnd() < 0.3
    );
  }
}
function holeStrip(cuts, bid, ax, h) {
  const inCut = (x, y, z, et, ey, en) =>
    cuts.some(C => {
      const lo = ax ? [C[0] - en, C[2] - ey, C[4] - et] : [C[0] - et, C[2] - ey, C[4] - en],
        hi = ax ? [C[1] + en, C[3] + ey, C[5] + et] : [C[1] + et, C[3] + ey, C[5] + en];
      return x > lo[0] && x < hi[0] && y > lo[1] && y < hi[1] && z > lo[2] && z < hi[2];
    });
  const near = (x, z) => Math.abs(x - h.x) < 6 && Math.abs(z - h.z) < 6;
  for (const ch of GEN) {
    for (const r of ch.PR || [])
      if (!r.gone && near(r.x, r.z) && inCut(r.x, r.y, r.z, 0.05, 0.12, 0.4)) {
        r.gone = true;
        propWrite(r);
      }
    for (const e of ch.AWM || [])
      if (!e.gone && near(e.x, e.z) && inCut(e.x, e.y - 0.15, e.z, -e.w * 0.25, 0.25, 0.7)) e.gone = true;
    for (const e of ch.AW || []) if (!e.gone && near(e.x, e.z) && inCut(e.x, e.y, e.z, 0, 0.15, 0.7)) e.gone = true;
    for (const L of [ch.BX, ch.BXm])
      for (const e of L || [])
        if (e.inv && !e.gone && e.b === bid && near(e.x, e.z) && inCut(e.x, e.y, e.z, 0, 0.05, 0.4)) e.gone = true;
  }
}
// un temblor corto de la cámara
const SHAKE = { until: 0, a: 0 };
function camShake(a, t) {
  SHAKE.a = Math.max(a, performance.now() < SHAKE.until ? SHAKE.a : 0);
  SHAKE.until = performance.now() + t * 1000;
  SHAKE.t = t;
}
// el reloj rojo en el suelo alrededor de un hombre que se desangra: un anillo completo tenue y, encima, el arco que se llena en diez segundos
function dkClock(u, M) {
  const on = !!(u.down && u.bleedOut && !CINE.on && MIS.id !== 'attract');
  if (!on) {
    if (M.dk) {
      M.dk.visible = false;
      M.dkBg.visible = false;
    }
    return;
  }
  if (!M.dk) {
    M.dkBg = unitRing(0.5, 0.64, 0xe05a42, 0.28);
    M.dk = new T.Mesh(
      new T.BufferGeometry(),
      new T.MeshBasicMaterial({
        color: 0xff2a1a,
        transparent: true,
        opacity: 0.95,
        side: T.DoubleSide,
        depthWrite: false,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
      })
    );
    M.dk.rotation.x = -Math.PI / 2;
    world.add(M.dk);
    M.dkF = -1;
  }
  const f = clamp((u.dkT || 0) / BLEED_DK, 0, 1);
  if (Math.abs(f - M.dkF) > 0.004) {
    M.dk.geometry.dispose();
    M.dk.geometry = new T.RingGeometry(0.5, 0.64, 56, 1, Math.PI / 2, -Math.max(0.001, f) * Math.PI * 2);
    M.dkF = f;
  }
  const y = (u.elev || 0) + 0.045;
  M.dk.position.set(u.x, y + 0.004, u.z);
  M.dkBg.position.set(u.x, y, u.z);
  M.dk.visible = M.dkBg.visible = true;
  M.dk.material.opacity = 0.8 + Math.sin(performance.now() / 120) * 0.15;
}
