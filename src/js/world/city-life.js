/* ====================================================================================================
 * world/city-life.js
 *
 * El resto de lo que vive en la ciudad: pájaros en las azoteas y en los postes que levantan el vuelo cuando pasa un helicóptero o
 * explota algo, cabras y gallinas (y algún perro) que salen corriendo con el ruido, y papelillos que arrastra el viento por el suelo.
 * Todo son cajas en una sola malla instanciada, y solo alrededor de la cámara.
 * ================================================================================================== */

'use strict';

const CRN = 760;
let CRIT = null,
  CRFREE = [],
  FLOCKS = [],
  ANIMALS = [],
  lifeT = 0,
  lifeT2 = 0,
  trashAcc = 0,
  lifeCam = null,
  lifeClock = 0;
function initLife() {
  CRIT = new T.InstancedMesh(UBOX, new T.MeshLambertMaterial({ color: 0xffffff }), CRN);
  CRIT.frustumCulled = false;
  CRIT.castShadow = gfxQ().dsh;
  CRIT.receiveShadow = true;
  CRIT.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < CRN; k++) {
    CRIT.setMatrixAt(k, ZERO_M);
    CRIT.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(CRIT);
  CRFREE = [];
  for (let k = CRN - 1; k >= 0; k--) CRFREE.push(k);
  FLOCKS = [];
  ANIMALS = [];
  lifeCam = null;
  lifeT = lifeT2 = 0;
  ANM.chicken = ANM.dog = null;
}
const critTake = n => {
  if (CRFREE.length < n) return null;
  const a = [];
  for (let k = 0; k < n; k++) a.push(CRFREE.pop());
  return a;
};
const critFree = a => {
  for (const k of a) {
    CRIT.setMatrixAt(k, ZERO_M);
    CRFREE.push(k);
  }
};
function critSet(k, x, y, z, yaw, lx, ly, lz, sx, sy, sz, pitch, roll) {
  const c = Math.cos(yaw),
    s_ = Math.sin(yaw);
  dummy.position.set(x + lx * c + lz * s_, y + ly, z - lx * s_ + lz * c);
  dummy.rotation.set(pitch || 0, yaw, roll || 0, 'YXZ');
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  CRIT.setMatrixAt(k, dummy.matrix);
}
// piezas: [x, y, z, sx, sy, sz, hueco de color, tipo]; tipo 0 cuerpo, 1/2 los dos pares de patas, 3 cabeza y cuello, 4 cola
const ANIM = {
  goat: {
    sp: 0.5,
    run: 3.4,
    pal: [
      [0xe6e0d2, 0xd8d0c0, 0x4a4036],
      [0x8a6a4a, 0x5a4634, 0x2a2622],
      [0x2e2a26, 0x24201c, 0x6a6258],
      [0xc9b08a, 0x9a7c58, 0x3a3028],
      [0xe6e0d2, 0x3a302a, 0x4a4036]
    ],
    parts: [
      [0, 0.3, 0, 0.15, 0.17, 0.36, 0, 0],
      [0, 0.4, 0.2, 0.08, 0.16, 0.09, 0, 3],
      [0, 0.47, 0.28, 0.09, 0.09, 0.15, 1, 3],
      [0.045, 0.55, 0.25, 0.022, 0.07, 0.022, 2, 3],
      [-0.045, 0.55, 0.25, 0.022, 0.07, 0.022, 2, 3],
      [0.05, 0.11, 0.13, 0.04, 0.22, 0.04, 1, 1],
      [-0.05, 0.11, -0.13, 0.04, 0.22, 0.04, 1, 1],
      [-0.05, 0.11, 0.13, 0.04, 0.22, 0.04, 1, 2],
      [0.05, 0.11, -0.13, 0.04, 0.22, 0.04, 1, 2]
    ]
  },
  chicken: {
    sp: 0.4,
    run: 2.4,
    pal: [
      [0xe2dccc, 0xd0c8b6, 0xb02a1e, 0xd0a040],
      [0x8a4a2a, 0x5a3220, 0xb02a1e, 0xd0a040],
      [0x2a2622, 0x1e1c1a, 0xb02a1e, 0xc09038],
      [0xb88a52, 0x7a5a36, 0xb02a1e, 0xd0a040]
    ],
    parts: [
      [0, 0.13, 0, 0.09, 0.1, 0.15, 0, 0],
      [0, 0.2, 0.08, 0.05, 0.09, 0.05, 0, 3],
      [0, 0.255, 0.09, 0.02, 0.03, 0.045, 2, 3],
      [0, 0.19, -0.09, 0.05, 0.1, 0.05, 1, 4],
      [0.025, 0.04, 0, 0.02, 0.08, 0.02, 3, 1],
      [-0.025, 0.04, 0, 0.02, 0.08, 0.02, 3, 2]
    ]
  },
  dog: {
    sp: 0.8,
    run: 3.9,
    pal: [
      [0xb89468, 0x9a7a52, 0x2a2622],
      [0x6a5238, 0x54402c, 0x2a2622],
      [0xd8c8a8, 0xbca888, 0x3a302a]
    ],
    parts: [
      [0, 0.26, 0, 0.12, 0.13, 0.38, 0, 0],
      [0, 0.34, 0.23, 0.1, 0.11, 0.13, 0, 3],
      [0, 0.31, 0.32, 0.06, 0.05, 0.08, 1, 3],
      [0, 0.3, -0.24, 0.03, 0.03, 0.16, 1, 4],
      [0.04, 0.1, 0.14, 0.04, 0.2, 0.04, 1, 1],
      [-0.04, 0.1, -0.14, 0.04, 0.2, 0.04, 1, 1],
      [-0.04, 0.1, 0.14, 0.04, 0.2, 0.04, 1, 2],
      [0.04, 0.1, -0.14, 0.04, 0.2, 0.04, 1, 2]
    ]
  }
};
const nearBase = (x, z) => {
  const [u, v] = airUV(x, z);
  return u > BASE.u0 - 450 && u < BASE.u1 + 450 && v > BASE.v0 - 160 && v < BASE.v1 + 200;
};
function lifeFree(x, z) {
  if (TZONE || nearBase(x, z)) return false;
  const i = Math.floor(x),
    j = Math.floor(z);
  if (inB(i, j)) {
    const g = grid[idx(i, j)];
    return g === 0;
  }
  if (coastS(x, z) > -10) return false;
  const ch = CHUNKS.get(Math.floor(x / CS) + ',' + Math.floor(z / CS));
  if (!ch || !ch.gen) return false;
  for (const e of ch.BX) {
    if (
      e.sy > 0.5 &&
      e.y - e.sy / 2 < 0.6 &&
      Math.abs(x - e.x) < Math.max(e.sx, e.sz) / 2 + 0.25 &&
      Math.abs(z - e.z) < Math.max(e.sx, e.sz) / 2 + 0.25
    )
      return false;
  }
  return true;
}
// los dos tipos que quedan, como los modelos subidos: una malla instanciada para cada uno, los perros negros o marrón oscuro
const ANM = { chicken: null, dog: null },
  ANM_N = { chicken: 60, dog: 8 };
loadModel('animals');
function anmMesh(kind) {
  let A_ = ANM[kind];
  if (A_ && A_.m.parent === world) return A_;
  const M_ = MODELS.animals;
  if (!M_ || !M_.ready) return null;
  const m = new T.InstancedMesh(M_.geos[kind], M_.mat, ANM_N[kind]);
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < ANM_N[kind]; k++) {
    m.setMatrixAt(k, ZERO_M);
    m.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(m);
  A_ = ANM[kind] = { m, free: [] };
  for (let k = ANM_N[kind] - 1; k >= 0; k--) A_.free.push(k);
  return A_;
}
function addAnimal(kind, x, z) {
  if (kind === 'goat') kind = 'chicken';
  const A_ = anmMesh(kind);
  if (!A_ || !A_.free.length) return null;
  const D_ = ANIM[kind],
    mi = A_.free.pop();
  const a = {
    kind,
    D: D_,
    mi,
    A: A_,
    sl: [],
    x,
    z,
    hx: x,
    hz: z,
    face: rnd() * 6.283,
    st: 'idle',
    wait: rr(0.5, 5),
    t: rnd() * 9,
    ph: rnd() * 6,
    v: 0,
    sc: kind === 'chicken' ? rr(0.9, 1.1) : rr(0.85, 1.0),
    chk: rnd() * 0.3,
    graze: rnd() < 0.6
  };
  A_.m.setColorAt(
    mi,
    tmpCol.setHex(
      kind === 'dog' ? pick([0x2a2826, 0x1e1c1a, 0x4a3426, 0x3a2a20]) : jit(pick([0xffffff, 0xf0e6dc, 0xd8ccc0]), 0.04)
    )
  );
  A_.m.instanceColor.needsUpdate = true;
  ANIMALS.push(a);
  return a;
}
function animalFree(a) {
  if (a.A) {
    a.A.m.setMatrixAt(a.mi, ZERO_M);
    a.A.m.instanceMatrix.needsUpdate = true;
    a.A.free.push(a.mi);
  }
}
function addAnimalOld(kind, x, z) {
  const D_ = ANIM[kind],
    sl = critTake(D_.parts.length);
  if (!sl) return null;
  const pal = pick(D_.pal),
    a = {
      kind,
      D: D_,
      sl,
      x,
      z,
      hx: x,
      hz: z,
      face: rnd() * 6.283,
      st: 'idle',
      wait: rr(0.5, 5),
      t: rnd() * 9,
      ph: rnd() * 6,
      v: 0,
      sc: kind === 'goat' ? rr(1.15, 1.5) : kind === 'chicken' ? rr(1.25, 1.5) : rr(1.15, 1.35),
      chk: rnd() * 0.3,
      graze: rnd() < 0.6
    };
  D_.parts.forEach((q, n) => CRIT.setColorAt(sl[n], tmpCol.setHex(jit(pal[q[6]] != null ? pal[q[6]] : pal[0], 0.05))));
  CRIT.instanceColor.needsUpdate = true;
  ANIMALS.push(a);
  return a;
}
function lifeThreat(x, z, shy) {
  for (const h of HELI_NEAR) {
    if (h[1] < 34 && Math.hypot(h[0] - x, h[2] - z) < 27) return h;
  }
  if (LIT.blast && LIT.blast.t < 1.6 && Math.hypot(LIT.blast.x - x, LIT.blast.z - z) < 46)
    return [LIT.blast.x, 0, LIT.blast.z];
  if (G && G.noise)
    for (const n of G.noise) {
      if (G.t - n.t < 1.2 && G.t >= n.t && Math.hypot(n.x - x, n.z - z) < Math.min(n.r, 26)) return [n.x, 0, n.z];
    }
  if (shy && units)
    for (const u of units) {
      if (u.alive && u.moving && Math.abs(u.x - x) < shy && Math.abs(u.z - z) < shy) return [u.x, -1, u.z];
    }
  return null;
}
function updAnimal(a, dt, near) {
  const D_ = a.D;
  a.t += dt;
  a.chk -= dt;
  if (a.chk <= 0) {
    a.chk = 0.3;
    const th = lifeThreat(a.x, a.z, a.kind === 'dog' ? 0 : 1.9);
    if (th) {
      const soft = th[1] === -1;
      a.st = 'flee';
      a.fl = Math.max(a.fl || 0, soft ? rr(0.8, 1.6) : rr(3.5, 7));
      a.dir = Math.atan2(a.x - th[0], a.z - th[2]) + rr(-0.5, 0.5);
    }
  }
  let sp = 0;
  if (a.st === 'flee') {
    a.fl -= dt;
    sp = D_.run * (a.fl < 0.6 ? 0.5 : 1);
    if (a.fl <= 0) {
      a.st = 'idle';
      a.wait = rr(1, 4);
      a.hx = a.x;
      a.hz = a.z;
    }
  } else if (a.st === 'walk') {
    sp = D_.sp;
    const d = Math.hypot(a.tx - a.x, a.tz - a.z);
    if (d < 0.15) {
      a.st = 'idle';
      a.wait = rr(1.5, 7);
      a.graze = rnd() < 0.7;
    } else a.dir = Math.atan2(a.tx - a.x, a.tz - a.z);
  } else {
    a.wait -= dt;
    if (a.wait <= 0) {
      const tx = a.hx + rr(-2.6, 2.6),
        tz = a.hz + rr(-2.6, 2.6);
      if (lifeFree(tx, tz)) {
        a.tx = tx;
        a.tz = tz;
        a.st = 'walk';
      } else a.wait = rr(0.5, 2);
    }
  }
  a.v += (sp - a.v) * Math.min(1, dt * 6);
  if (a.v > 0.03) {
    let df = a.dir - a.face;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    a.face += clamp(df, -dt * 7, dt * 7);
    const nx = a.x + Math.sin(a.face) * a.v * dt,
      nz = a.z + Math.cos(a.face) * a.v * dt;
    if (lifeFree(nx, nz)) {
      a.x = nx;
      a.z = nz;
    } else if (a.st === 'flee') a.dir += rr(0.7, 1.4) * (rnd() < 0.5 ? 1 : -1);
    else {
      a.st = 'idle';
      a.wait = rr(0.5, 2);
    }
    a.ph += (a.v * dt * (a.kind === 'chicken' ? 30 : 13)) / a.sc;
  }
  if (!near) {
    if (a.A) a.vis = false;
    return;
  }
  if (a.A) {
    const s_ = a.sc,
      w = Math.min(1, a.v / 0.3),
      sw = Math.sin(a.ph) * w,
      run = a.st === 'flee' ? 1 : 0,
      idle = a.v < 0.05;
    const peck = a.kind === 'chicken' && idle && Math.sin(a.t * 2.3 + a.ph) > 0.4 ? Math.max(0, Math.sin(a.t * 13)) : 0;
    const bob = Math.abs(sw) * (a.kind === 'chicken' ? 0.03 : 0.02) * (1 + run),
      pitch = peck * 0.55 + (a.kind === 'chicken' ? sw * 0.12 : sw * 0.05) + run * 0.08;
    const roll = a.kind === 'chicken' ? Math.sin(a.ph * 0.5) * 0.12 * w : Math.sin(a.ph) * 0.04 * w;
    dummy.position.set(a.x, bob, a.z);
    dummy.rotation.set(pitch, a.face, roll, 'YXZ');
    dummy.scale.setScalar(s_);
    dummy.updateMatrix();
    a.A.m.setMatrixAt(a.mi, dummy.matrix);
    a.A.m.instanceMatrix.needsUpdate = true;
    dummy.rotation.order = 'XYZ';
    return;
  }
  const s_ = a.sc,
    w = Math.min(1, a.v / 0.3),
    sw = Math.sin(a.ph) * w,
    run = a.st === 'flee' ? 1 : 0;
  const idle = a.v < 0.05,
    peck =
      a.kind === 'chicken'
        ? idle && Math.sin(a.t * 2.3 + a.ph) > 0.4
          ? Math.max(0, Math.sin(a.t * 13))
          : 0
        : idle && a.graze && a.kind === 'goat'
          ? 1
          : 0;
  const bob = Math.abs(sw) * 0.012 * (1 + run),
    sl = a.sl;
  for (let n = 0; n < D_.parts.length; n++) {
    const q = D_.parts[n];
    let lx = q[0],
      ly = q[1],
      lz = q[2],
      pt = 0;
    if (q[7] === 1 || q[7] === 2) {
      const sg = q[7] === 1 ? 1 : -1;
      pt = sw * sg * (0.42 + 0.22 * run);
      lz += Math.sin(pt) * q[4] * 0.5;
    } else if (q[7] === 3) {
      if (a.kind === 'goat') {
        ly -= ((peck * 0.2 * (ly - 0.3)) / 0.17) * 0.9;
        lz += peck * 0.05;
        pt = peck * 0.9;
      } else if (a.kind === 'chicken') {
        ly -= peck * 0.1;
        lz += peck * 0.05 + sw * 0.012;
        pt = peck * 0.8;
      } else {
        ly += run * 0.02;
      }
      ly += bob;
    } else if (q[7] === 4) {
      pt = a.kind === 'dog' ? -0.5 - run * 0.3 : -0.5;
      ly += bob;
    } else ly += bob;
    critSet(
      sl[n],
      a.x,
      0,
      a.z,
      a.face,
      lx * s_,
      ly * s_,
      lz * s_,
      q[3] * s_,
      q[4] * s_,
      q[5] * s_,
      pt,
      q[7] === 4 && a.kind === 'dog' ? Math.sin(a.t * 9) * 0.3 : 0
    );
  }
}
// dónde pueden posarse unos pájaros: en uno de los dos cables entre dos postes (siguiendo su comba) o en el borde de una azotea
function perchSpot(cx, cz, R) {
  if (wires && wires.length && rnd() < 0.55) {
    for (let n = 0; n < 30; n++) {
      const line = wires[ri(wires.length)];
      if (line.length < 2) continue;
      const k = ri(line.length - 1),
        a = line[k],
        b = line[k + 1];
      if (a[1] < 4 || b[1] < 4) continue;
      const mx = (a[0] + b[0]) / 2,
        mz = (a[2] + b[2]) / 2;
      if (Math.hypot(mx - cx, mz - cz) > R) continue;
      const dx = b[0] - a[0],
        dz = b[2] - a[2],
        L = Math.hypot(dx, dz);
      if (L < 3) continue;
      const horiz = Math.abs(dx) > Math.abs(dz),
        off = rnd() < 0.5 ? -0.4 : 0.4,
        t0 = rr(0.2, 0.8);
      return {
        wire: true,
        a,
        b,
        L,
        t0,
        ox: horiz ? 0 : off,
        oz: horiz ? off : 0,
        x: a[0] + dx * t0,
        z: a[2] + dz * t0,
        y: a[1],
        ax: dx / L,
        az: dz / L
      };
    }
  }
  for (let n = 0; n < 40; n++) {
    const i = Math.floor(cx + rr(-R, R)),
      j = Math.floor(cz + rr(-R, R));
    if (!inB(i, j)) continue;
    const k = idx(i, j);
    if (grid[k] !== 1 || topH[k] < 2.2 || topH[k] > 15) continue;
    const e = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ].find(([dx, dz]) => inB(i + dx, j + dz) && grid[idx(i + dx, j + dz)] !== 1);
    if (!e) continue;
    const x = i + 0.5 + e[0] * 0.38,
      z = j + 0.5 + e[1] * 0.38,
      h = HG ? traceShot(x, topH[k] + 2.6, z, x, topH[k] - 1.2, z, 0) : null;
    if (!h || h.ny < 0.8 || h.y < 2) continue;
    return { x, y: h.y, z, ax: e[1] ? 1 : 0, az: e[0] ? 1 : 0, L: 0.5, face: Math.atan2(e[0], e[1]) };
  }
  return null;
}
function addFlock(P_) {
  const n = 3 + ri(6),
    sl = birdTake(n);
  if (!sl) return;
  const col = pick([0x2a2622, 0x3a3228, 0x55504a, 0x1e1c1a, 0x6a6660, 0x4a4a52]),
    F_ = { st: 'perch', P: P_, sl, b: [], t: 0, chk: rnd() * 0.25 };
  const span = P_.wire ? Math.min(P_.L * 0.6, n * 0.3) : P_.L * 2;
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * (span / Math.max(n, 3)) + rr(-0.05, 0.05);
    let x, y, z, yaw;
    if (P_.wire) {
      const t = clamp(P_.t0 + o / P_.L, 0.05, 0.95);
      x = P_.a[0] + (P_.b[0] - P_.a[0]) * t + P_.ox;
      z = P_.a[2] + (P_.b[2] - P_.a[2]) * t + P_.oz;
      y = P_.a[1] - 0.55 * Math.sin(t * Math.PI) + 0.075;
      yaw = Math.atan2(P_.ax, P_.az) + ((rnd() < 0.5 ? 1 : -1) * Math.PI) / 2 + rr(-0.3, 0.3);
    } else {
      x = P_.x + P_.ax * o;
      z = P_.z + P_.az * o;
      y = P_.y + 0.07;
      yaw = (P_.face != null ? P_.face : rnd() * 6.283) + rr(-0.6, 0.6);
    }
    const b = { x, y, z, yaw, ph: rnd() * 6, vx: 0, vy: 0, vz: 0, hop: rr(1, 6) };
    F_.b.push(b);
    for (let q = 0; q < 3; q++) jit(q ? shade(col, 0.85) : col, 0.06);
    b.k = sl[k];
    b.sc = 0.78 + (k % 4) * 0.045;
    b.fold = 1;
  } // (las tiradas de color se mantienen: misma secuencia aleatoria)
  FLOCKS.push(F_);
}
function updFlock(F_, dt, near) {
  F_.t += dt;
  F_.chk -= dt;
  if (F_.st === 'perch' && F_.chk <= 0) {
    F_.chk = 0.15;
    const th = lifeThreat(F_.P.x, F_.P.z, 4.5);
    if (th) {
      F_.st = 'fly';
      F_.t = 0;
      const base = Math.atan2(F_.P.x - th[0], F_.P.z - th[2]);
      for (const b of F_.b) {
        const a = base + rr(-0.7, 0.7),
          v = rr(3.6, 6);
        b.vx = Math.sin(a) * v;
        b.vz = Math.cos(a) * v;
        b.vy = rr(2.6, 4.4);
        b.dl = rr(0, 0.35);
        b.curl = rr(-0.35, 0.35);
      }
    }
  }
  const hide = G && G.roofs && F_.P.y > CUT && F_.st === 'perch';
  F_.b.forEach((b, k) => {
    const s0 = b.k;
    if (F_.st === 'fly' && F_.t > b.dl) {
      const c = Math.cos(b.curl * dt),
        s_ = Math.sin(b.curl * dt),
        vx = b.vx * c + b.vz * s_,
        vz = b.vz * c - b.vx * s_;
      b.vx = vx;
      b.vz = vz;
      b.vy += (1.1 - b.vy) * dt * 0.9;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.yaw = Math.atan2(b.vx, b.vz);
      b.ph += dt * 17;
    } else if (F_.st === 'perch') {
      b.hop -= dt;
      if (b.hop <= 0) {
        b.hop = rr(1.5, 7);
        b.yaw += rr(-1.2, 1.2);
      }
    }
    if (!near) return;
    if (hide) {
      birdHide(s0);
      return;
    }
    const fly = F_.st === 'fly' && F_.t > b.dl;
    if (fly) {
      // levantando el vuelo: las alas se abren en un tercio de segundo, aleteando fuerte, con el cuerpo cabeceando hacia arriba mientras sube
      b.fold = Math.max(0, b.fold - dt * 3.2);
      const [a1, a2] = wingBeat(b.ph, 1),
        climb = clamp(b.vy / 4, -0.3, 1);
      birdPut(
        s0,
        b.x,
        b.y - 0.07 + Math.sin(b.ph - 1.2) * 0.03,
        b.z,
        b.yaw,
        -0.35 * climb,
        -b.curl * 0.8,
        a1 * (1 - b.fold) + 0.5 * b.fold,
        a2 * (1 - b.fold),
        b.fold,
        b.sc
      );
    } else {
      // posado: alas plegadas, algún picotazo y de vez en cuando una sacudida de alas
      const pk = Math.sin(F_.t * 1.7 + b.ph) > 0.75 ? 0.45 : 0,
        ruffle = Math.max(0, Math.sin(F_.t * 0.9 + b.ph * 3) - 0.93) * 8;
      birdPut(s0, b.x, b.y - 0.075, b.z, b.yaw, pk, 0, ruffle * 0.25, 0, 1 - ruffle * 0.35, b.sc);
    }
  });
  birdFlush();
  return F_.st === 'fly' && F_.t > 9;
}
function updLife(dt, t) {
  if (!CRIT || !world || CRIT.parent !== world || dt <= 0) return;
  const cx = camS.tx,
    cz = camS.tz,
    hh = halfH(),
    view = hh * 2.1 + 6;
  let vx = 0,
    vz = 0;
  if (lifeCam) {
    vx = (cx - lifeCam[0]) / dt;
    vz = (cz - lifeCam[1]) / dt;
    if (Math.hypot(vx, vz) > 60) {
      vx = vz = 0;
    }
  }
  lifeCam = [cx, cz];
  const fast = Math.hypot(vx, vz) > 6,
    lx = cx + vx * 1.9,
    lz = cz + vz * 1.9;
  // animales
  for (let k = ANIMALS.length - 1; k >= 0; k--) {
    const a = ANIMALS[k],
      d = Math.hypot(a.x - cx, a.z - cz);
    if (d > (fast ? 95 : 78)) {
      critFree(a.sl);
      animalFree(a);
      ANIMALS.splice(k, 1);
      continue;
    }
    updAnimal(a, dt, d < view + 6);
  }
  for (let k = FLOCKS.length - 1; k >= 0; k--) {
    const F_ = FLOCKS[k],
      d = Math.hypot(F_.P.x - cx, F_.P.z - cz);
    if (updFlock(F_, dt, d < view + 30) || (F_.st === 'perch' && d > 82)) {
      birdFree(F_.sl);
      FLOCKS.splice(k, 1);
    }
  }
  dummy.rotation.order = 'XYZ';
  CRIT.instanceMatrix.needsUpdate = true;
  lifeT -= dt;
  if (lifeT <= 0) {
    lifeT = fast ? 0.12 : 0.6;
    const quiet = (x, z, r) =>
      !(G && G.noise && G.noise.some(n => G.t - n.t < 20 && G.t >= n.t && Math.hypot(n.x - x, n.z - z) < r)) &&
      !HELI_NEAR.some(h => h[1] < 34 && Math.hypot(h[0] - x, h[2] - z) < r);
    const inG = inB(Math.floor(lx), Math.floor(lz)),
      dens = lx > WB.x0 && lx < WB.x1 && lz > WB.z0 && lz < WB.z1 ? cityDs(lx, lz) : 0,
      cap = !MIS || MIS.noCiv ? 0 : dens > 0.5 ? 9 : 30;
    for (let n = 0; n < (fast ? 3 : 2) && ANIMALS.length < cap; n++) {
      const a = rnd() * 6.283,
        d = fast ? rr(0, 22) : rr(view * 0.75, view + 26),
        x = lx + Math.cos(a) * d,
        z = lz + Math.sin(a) * d;
      if (Math.hypot(x - cx, z - cz) < view * 0.72 || !lifeFree(x, z) || !quiet(x, z, 26)) continue;
      if (units && units.some(u => u.alive && Math.hypot(u.x - x, u.z - z) < 10)) continue;
      if (ANIMALS.some(o => Math.hypot(o.x - x, o.z - z) < 7)) continue;
      const i = Math.floor(x),
        j = Math.floor(z),
        street = inB(i, j) && STR[idx(i, j)] > 0,
        r_ = rnd();
      let kind = r_ < 0.86 ? 'chicken' : 'dog';
      if (kind === 'dog' && ANIMALS.filter(o => o.kind === 'dog').length >= 3) kind = 'chicken';
      if (kind === 'chicken' && street && rnd() < 0.5) continue;
      const cnt = kind === 'dog' ? 1 : 2 + ri(5);
      for (let q = 0; q < cnt; q++) {
        const px = x + rr(-2.2, 2.2) * (q ? 1 : 0),
          pz = z + rr(-2.2, 2.2) * (q ? 1 : 0);
        if (lifeFree(px, pz)) {
          const an = addAnimal(kind, px, pz);
          if (an) {
            an.hx = x;
            an.hz = z;
          }
        }
      }
    }
    for (let n = 0; n < (FLOCKS.length < 6 ? 4 : 1); n++)
      if (FLOCKS.length < 18 && inG && !TZONE && !(MIS && MIS.id === 'attract')) {
        const P_ = perchSpot(lx, lz, hh * 1.9 + 8);
        if (!P_ || !quiet(P_.x, P_.z, 22) || FLOCKS.some(F_ => Math.hypot(F_.P.x - P_.x, F_.P.z - P_.z) < 4)) continue;
        if (units && units.some(u => u.alive && Math.hypot(u.x - P_.x, u.z - P_.z) < 7)) continue;
        if (!fast && G.t > 4 && Math.abs(P_.x - cx) < hh * 1.1 && Math.abs(P_.z - cz) < hh * 1.1 && FLOCKS.length >= 6)
          continue;
        addFlock(P_);
      }
  }
  // papelillos al viento: motas que rozan el suelo calle abajo
  const wnd = windAt(t);
  trashAcc += dt * (5 + 16 * wnd);
  while (trashAcc > 1) {
    trashAcc -= 1;
    const x = cx + rr(-hh * 1.6, hh * 1.6),
      z = cz + rr(-hh * 1.6, hh * 1.6),
      i = Math.floor(x),
      j = Math.floor(z);
    if (!inB(i, j) || grid[idx(i, j)] === 1) continue;
    const v = rr(1.1, 3.2) * wnd;
    spawnP(
      x,
      rr(0.03, 0.16),
      z,
      0.92 * v + rr(-0.2, 0.2),
      rr(-0.03, 0.09),
      0.39 * v + rr(-0.3, 0.3),
      rr(1.6, 3.8),
      rr(0.03, 0.05),
      rr(0.03, 0.045),
      pick([0xf0eee8, 0xd8d2c2, 0x8a7458, 0x6a5a48, 0xb8a888, 0x4a5e74, 0x9a3a2e, 0xc9a24a, 0x3a3632]),
      0xb8ae98,
      1,
      0,
      0.25
    );
  }
}
function makeCiv(i, j) {
  const woman = rnd() < 0.45;
  const c = {
    team: 'civ',
    x: i + 0.5,
    z: j + 0.5,
    vx: 0,
    vz: 0,
    face: rnd() * 6.283,
    alive: true,
    down: false,
    hp: 100,
    hp0: 100,
    sup: 0,
    pinned: false,
    stance: 'stand',
    moving: false,
    path: [],
    order: null,
    auto: null,
    firing: 0,
    reloading: false,
    healing: false,
    talkT: 0,
    state: 'idle',
    waitT: rr(1, 6),
    spd: rr(0.9, 1.3),
    dangerT: rnd(),
    gone: false,
    woman
  };
  const rig = buildRig('civ', { woman });
  rig.gun.visible = false;
  world.add(rig.root);
  rig.root.position.set(c.x, 0, c.z);
  rig.root.rotation.y = c.face;
  c.angry = rnd() < (woman ? 0.22 : 0.5);
  c.thrower = c.angry && rnd() < 0.6;
  c.gph = rnd() * 6;
  c.m = rig;
  return c;
}
function spawnCivs() {
  civs = [];
  if (MIS.noCiv) return;
  for (let k = 0; k < 600 && civs.length < 24; k++) {
    const C0 = MIS.civ,
      i = Math.floor(C0[0]) - 58 + ri(116),
      j = Math.floor(C0[1]) - 58 + ri(116);
    if (!walk(i, j)) continue;
    if (Math.hypot(i - C0[0], j - C0[1]) < 10) continue; // el combate ya está ahí
    if (Math.hypot(i - MIS.start[0], j - MIS.start[1]) < 8) continue; // ni por donde entra la escuadra
    if (civs.some(c => Math.hypot(c.x - i, c.z - j) < 3)) continue;
    civs.push(makeCiv(i, j));
  }
}
function dangerFor(c) {
  let best = null,
    bd = 1e9;
  for (const n of G.noise) {
    if (G.t - n.t > 6) continue;
    const d = Math.hypot(n.x - c.x, n.z - c.z);
    if (d < n.r && d < bd) {
      bd = d;
      best = n;
    }
  }
  for (const u of units) {
    if (!u.alive) continue;
    const d = Math.hypot(u.x - c.x, u.z - c.z);
    if (d < 5 && d < bd) {
      bd = d;
      best = u;
    }
  }
  return best;
}
function startFlee(c, src) {
  // la puerta más cercana que no lleve otra vez hacia el peligro
  const si = Math.floor(c.x),
    sj = Math.floor(c.z),
    N = W * H;
  if (!FC.d) {
    FC.d = new Int16Array(N);
    FC.s = new Uint32Array(N);
  }
  const st = ++FC.stamp,
    D_ = FC.d,
    Ss = FC.s;
  const q = [idx(si, sj)];
  Ss[q[0]] = st;
  D_[q[0]] = 0;
  let h = 0,
    best = null,
    bs = 1e9;
  while (h < q.length) {
    const k = q[h++],
      i = kI(k),
      j = kJ(k),
      d = D_[k];
    if (d > 0) {
      const door = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].find(([dx, dy]) => bAt(i + dx, j + dy) >= 0);
      if (door) {
        const sc = d - Math.hypot(i - src.x, j - src.z) * 0.7;
        if (sc < bs) {
          bs = sc;
          best = [i, j, i + door[0], j + door[1]];
        }
      }
    }
    if (d >= 22) continue;
    for (const [dx, dy] of DIRS) {
      const ni = i + dx,
        nj = j + dy;
      if (!walk(ni, nj)) continue;
      const nk = idx(ni, nj);
      if (Ss[nk] === st) continue;
      Ss[nk] = st;
      D_[nk] = d + 1;
      q.push(nk);
    }
  }
  c.state = 'flee';
  c.dangerT = 3;
  if (best) {
    c.path = findPath(si, sj, best[0], best[1]) || [];
    c.door = [best[2], best[3]];
  }
  if (!best || !c.path.length) {
    const ax = c.x - src.x,
      az = c.z - src.z,
      L = Math.hypot(ax, az) || 1,
      g = nearestFree(Math.floor(c.x + (ax / L) * 12), Math.floor(c.z + (az / L) * 12));
    c.path = findPath(si, sj, g[0], g[1]) || [];
    c.door = null;
  }
}
function updCivs(dt) {
  for (const c of civs) {
    if (c.gone) continue;
    if (c.watch) {
      watchCiv(c, dt);
      continue;
    }
    if (c.state === 'enter') {
      c.enterT -= dt;
      const dx = c.door[0] + 0.5 - c.x,
        dz = c.door[1] + 0.5 - c.z,
        L = Math.hypot(dx, dz) || 1;
      c.vx = (dx / L) * 2;
      c.vz = (dz / L) * 2;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      c.moving = true;
      c.face = Math.atan2(dx, dz);
      if (c.enterT <= 0) {
        c.gone = true;
        c.m.root.visible = false;
      }
      continue;
    }
    c.dangerT -= dt;
    if (c.dangerT <= 0) {
      c.dangerT = 0.4;
      const d = dangerFor(c);
      if (d && c.state !== 'flee') {
        c.tgt = null;
        startFlee(c, d);
      }
    }
    if (civAngry(c, dt)) {
      c.vx *= 0.8;
      c.vz *= 0.8;
      c.moving = false;
      c.stance = 'stand';
      continue;
    }
    if (c.state === 'idle') {
      c.waitT -= dt;
      if (c.waitT <= 0) {
        const g = nearestFree(Math.floor(c.x + rr(-6, 6)), Math.floor(c.z + rr(-6, 6)));
        c.path = findPath(Math.floor(c.x), Math.floor(c.z), g[0], g[1]) || [];
        c.state = c.path.length ? 'walk' : 'idle';
        c.waitT = rr(2, 7);
      }
    }
    let moving = false;
    if (c.path.length) {
      if (!c.vault) vaultScan(c);
      const n = c.path[0],
        tx = n[0] + 0.5,
        tz = n[1] + 0.5,
        dx = tx - c.x,
        dz = tz - c.z,
        d = Math.hypot(dx, dz) || 1e-4;
      const want = c.state === 'flee' ? c.spd * 2.7 : c.spd * 0.8,
        a = 1 - Math.exp(-6 * dt);
      c.vx += ((dx / d) * want - c.vx) * a;
      c.vz += ((dz / d) * want - c.vz) * a;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      moving = true;
      if (d < 0.35) {
        c.path.shift();
        if (!c.path.length) {
          if (c.state === 'flee' && c.door) {
            c.state = 'enter';
            c.enterT = 0.55;
          } else if (c.state === 'flee') {
            c.state = 'cower';
            c.waitT = rr(4, 9);
          } else {
            c.state = 'idle';
          }
        }
      }
    }
    if (c.state === 'cower') {
      c.waitT -= dt;
      if (c.waitT <= 0) c.state = 'idle';
    }
    if (!moving) {
      const f = Math.exp(-10 * dt);
      c.vx *= f;
      c.vz *= f;
    }
    c.moving = moving;
    c.stance = c.state === 'cower' ? 'crouch' : 'stand';
    if (moving && Math.hypot(c.vx, c.vz) > 0.2) c.face = Math.atan2(c.vx, c.vz);
  }
  // de vez en cuando alguien sale de una casa tranquila
  G.civT = (G.civT || 0) - dt;
  if (G.civT <= 0) {
    G.civT = rr(10, 18);
    if (civs.filter(c => !c.gone).length < 20) {
      for (let k = 0; k < 40; k++) {
        const i = Math.floor(camS.tx) + ri(60) - 30,
          j = Math.floor(camS.tz) + ri(60) - 30;
        if (
          !walk(i, j) ||
          ![
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ].some(([dx, dy]) => bAt(i + dx, j + dy) >= 0)
        )
          continue;
        if (G.noise.some(n => G.t - n.t < 25 && Math.hypot(n.x - i, n.z - j) < 30)) continue;
        if (units.some(u => u.alive && Math.hypot(u.x - i, u.z - j) < 12)) continue;
        civs = civs.filter(c => !c.gone || (world.remove(c.m.root), false));
        civs.push(makeCiv(i, j));
        break;
      }
    }
  }
}
// un mirón se queda en su sitio mirando la calle; un disparo cerca le hace agacharse un momento, pero no corre
function watchCiv(c, dt) {
  c.vx *= 0.8;
  c.vz *= 0.8;
  c.moving = false;
  c.path = [];
  if (MIS.id === 'mile' && G.m.finS) {
    if (c.cheer == null) {
      const h = rnd();
      c.cheer = h < 0.45 ? 'jump' : h < 0.8 ? 'arms' : 'surge';
      c.chPh = rnd() * 6.283;
      c.bx = c.x;
      c.bz = c.z;
      c.state = 'idle';
    }
    if (c.cheer === 'surge') {
      const f = Math.sin(G.t * 1.1 + c.chPh) * 0.25 + 0.25;
      c.x = c.bx + Math.sin(c.face0) * f;
      c.z = c.bz + Math.cos(c.face0) * f;
      c.moving = Math.abs(Math.cos(G.t * 1.1 + c.chPh)) > 0.3;
    }
    c.stance = 'stand';
    c.lookT = (c.lookT || 0) - dt;
    if (c.lookT <= 0) {
      c.lookT = rr(1, 3);
      const t = c.follow ? c.follow() : null;
      c.face = t ? Math.atan2(t[0] - c.x, t[1] - c.z) + rr(-0.3, 0.3) : c.face0 + rr(-0.5, 0.5);
    }
    return;
  }
  c.dangerT -= dt;
  if (c.dangerT <= 0) {
    c.dangerT = 0.5;
    if (G.noise.some(n => G.t - n.t < 1.5 && Math.hypot(n.x - c.x, n.z - c.z) < 7)) {
      c.state = 'cower';
      c.waitT = rr(2, 4);
    }
  }
  if (c.state === 'cower') {
    c.waitT -= dt;
    if (c.waitT <= 0) c.state = 'idle';
  }
  c.stance = c.state === 'cower' ? 'crouch' : 'stand';
  c.lookT = (c.lookT || 0) - dt;
  if (c.lookT <= 0) {
    c.lookT = rr(1.5, 5);
    const t = c.follow ? c.follow() : null;
    c.face = t ? Math.atan2(t[0] - c.x, t[1] - c.z) + rr(-0.3, 0.3) : c.face0 + rr(-0.6, 0.6);
    // la multitud no es amistosa: algunos sacuden el puño a lo que pasa y unos pocos le tiran una piedra
    c.gest = !!(t && c.angry && c.state !== 'cower' && Math.hypot(t[0] - c.x, t[1] - c.z) < 13);
    if (c.gest && c.thrower && !(c.throwA > 0) && rnd() < 0.3) {
      c.throwA = 1.1;
      c.thrAt = { x: t[0], z: t[1] };
    }
  }
  if (c.throwA > 0) {
    const p = c.throwA;
    c.throwA -= dt;
    if (p > 0.26 && c.throwA <= 0.26 && c.thrAt) throwStone(c, c.thrAt);
  }
}
function syncCivs(adt) {
  for (const c of civs) {
    if (c.gone) continue;
    const r = c.m.root;
    r.position.set(c.x, c.cheer === 'jump' ? Math.max(0, Math.sin(G.t * 5.2 + c.chPh)) * 0.2 : 0, c.z);
    let df = c.face - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, adt * 8), -adt * 8, adt * 8);
    if (!animDue(c, adt)) continue;
    animRig(c, c._anD);
    // los civiles no llevan nada: los brazos se balancean y bombean al correr
    const m = c.m,
      run = clamp((Math.hypot(c.vx, c.vz) - 1.2) / 1.5, 0, 1),
      w = clamp(Math.hypot(c.vx, c.vz) / 0.9, 0, 1),
      s = Math.sin(m.phase);
    m.shR.rotation.x += s * (0.35 + 0.5 * run) * w;
    m.shL.rotation.x -= s * (0.35 + 0.5 * run) * w;
    m.elR.rotation.x -= 0.5 * run;
    m.elL.rotation.x -= 0.5 * run;
    if (c.state === 'cower') {
      m.shR.rotation.x = -2.6;
      m.shL.rotation.x = -2.6;
      m.elR.rotation.x = -2;
      m.elL.rotation.x = -2;
    } else if (c.cheer) {
      const t = G.t * (c.cheer === 'jump' ? 5.2 : 3) + c.chPh,
        up = Math.sin(t);
      if (c.cheer !== 'surge' || up > 0) {
        m.shR.rotation.x = -2.75 + up * 0.25;
        m.shL.rotation.x = -2.6 - up * 0.25;
        m.elR.rotation.x = -0.35 - Math.max(0, -up) * 0.6;
        m.elL.rotation.x = -0.3 - Math.max(0, up) * 0.6;
      }
    } else civGesture(c, adt);
  }
}
