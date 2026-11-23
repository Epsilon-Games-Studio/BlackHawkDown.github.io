/* ====================================================================================================
 * units/vehicle-columns.js
 *
 * Columnas de vehículos: siguen una ruta de calles, paran donde se les dice y los tiradores de la M2 combaten
 * ================================================================================================== */

'use strict';

function routeOf(pts) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++)
    cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
const routeS = (C, x, z) => {
  let best = 0,
    bd = 1e9;
  for (let s = 0; s <= C.L; s += 0.5) {
    const p = polyAt(C, s),
      d = Math.hypot(p[0] - x, p[1] - z);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
};
function mkConvoy(kinds, pts, o) {
  o = o || {};
  const R_ = routeOf(pts);
  const C = Object.assign(R_, {
    s: o.s0 || 0,
    v: 0,
    vmax: o.vmax || 2.3,
    gap: o.gap || 8.6,
    limit: o.limit != null ? o.limit : R_.L,
    go: !!o.go,
    veh: [],
    un: !!o.un,
    fire: o.fire !== false,
    name: o.name || 'Columna'
  });
  for (const k of kinds) {
    const v = k === 'un' ? unApc() : k === 'btr' ? btrVehicle() : irVehicle(k);
    v.kind = k;
    v.fireT = rr(0, 1);
    v.aim = 0;
    C.veh.push(v);
  }
  CONVOYS.push(C);
  convoyStep(C, 0);
  return C;
}
function convoyStep(C, dt) {
  const lim = C.spread && C.limit >= C.L - 0.01 ? C.L + C.veh.length * C.gap + 2 : C.limit; // desplegándose: la columna sigue metiendo vehículos
  const want = C.go ? clamp((lim - C.s) * 0.6, 0, C.vmax) : 0;
  C.v += clamp(want - C.v, -4 * dt, 1.2 * dt);
  if (C.v < 0) C.v = 0;
  C.s = Math.min(C.s + C.v * dt, Math.max(C.s, lim));
  const moving = C.v > 0.3;
  C.veh.forEach((v, i) => {
    if (v.own) {
      convoyOwn(v, C, dt);
      return;
    }
    if (C.spread && C.spread[i] && C.s - i * C.gap >= C.sGate && v.x != null) {
      v.own = { pts: [[v.x, v.z]].concat(C.spread[i]), k: 1, sp: C.v };
      convoyOwn(v, C, dt);
      return;
    }
    const [x, z, hd] = polyAt(C, C.s - i * C.gap);
    if (v.x != null) {
      const mx = x - v.x,
        mz = z - v.z,
        ml = Math.hypot(mx, mz);
      if (ml > 1e-4) {
        v.fx = mx / ml;
        v.fz = mz / ml;
      }
    }
    v.x = x;
    v.z = z;
    v.g.position.set(x, moving ? Math.sin(G.t * 13 + i) * 0.02 : 0, z);
    let d = hd - v.g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    v.g.rotation.y += dt > 0 ? d * Math.min(1, dt * 3) : d;
    if (moving)
      for (let j = Math.floor(z - 1.6); j <= Math.floor(z + 1.6); j++)
        for (let i2 = Math.floor(x - 1.6); i2 <= Math.floor(x + 1.6); i2++) {
          if (!inB(i2, j)) continue;
          const o = cov[idx(i2, j)];
          if (o && o.kind !== 'fountain' && o.kind !== 'wreck' && !o.barricade) destroyCover(o);
        }
    if (v.piv && C.fire && dt > 0) convoyGun(v, dt, C.gunKill == null ? 0.25 : C.gunKill);
  });
}
function convoyOwn(v, C, dt) {
  const O = v.own;
  if (O.k >= O.pts.length) {
    v.g.position.y = 0;
    return;
  }
  const [tx, tz] = O.pts[O.k],
    dx = tx - v.x,
    dz = tz - v.z,
    L = Math.hypot(dx, dz),
    last = O.k === O.pts.length - 1;
  if (L < (last ? 0.12 : 1.0)) {
    O.k++;
    return;
  }
  const want = last ? Math.min(C.vmax, L * 0.5 + 0.15) : C.vmax;
  O.sp += clamp(want - O.sp, -4 * dt, 1.2 * dt);
  if (O.sp < 0) O.sp = 0;
  const st = Math.min(L, O.sp * dt);
  v.x += (dx / L) * st;
  v.z += (dz / L) * st;
  v.g.position.set(v.x, O.sp > 0.3 ? Math.sin(G.t * 13) * 0.02 : 0, v.z);
  let d = Math.atan2(dx, dz) - v.g.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  v.g.rotation.y += dt > 0 ? d * Math.min(1, dt * 2.6) : d;
}
function convoyGun(v, dt, kill) {
  v.fireT -= dt;
  let tgt = null,
    bd = 30;
  for (const e of them) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - v.x, e.z - v.z);
    if (d < bd && los(v.x, v.z, e.x, e.z)) {
      bd = d;
      tgt = e;
    }
  }
  if (!tgt) return;
  const want = Math.atan2(tgt.x - v.x, tgt.z - v.z) - v.g.rotation.y;
  let d = want - v.aim;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  v.aim += clamp(d, -dt * 2.5, dt * 2.5);
  v.piv.rotation.y = v.aim;
  if (v.fireT <= 0 && Math.abs(d) < 0.25) {
    v.fireT = rr(0.5, 0.9);
    const s = Math.sin(v.g.rotation.y + v.aim),
      c = Math.cos(v.g.rotation.y + v.aim),
      mx = v.x + s * 1.1,
      mz = v.z + c * 1.1;
    for (let k = 0; k < 3; k++) {
      tracer(mx, 2.15, mz, tgt.x + rr(-0.6, 0.6), 0.3 + rnd() * 0.9, tgt.z + rr(-0.6, 0.6), 0xff7a3a, k * 0.08);
      sched.push({
        at: G.t + k * 0.08,
        fn: () => {
          flash(mx + s * 0.25, 2.15, mz + c * 0.25, true);
          if (chunkMesh) {
            const b = spawnChunk(
              v.x - s * 0.2,
              2.2,
              v.z - c * 0.2,
              c * rr(1.4, 2.2),
              rr(1.2, 2),
              -s * rr(1.4, 2.2),
              0.025,
              0x8a7848,
              'splinter'
            );
            if (b) b.brass = true;
          }
        }
      });
    }
    for (let q = 0; q < 3; q++)
      sched.push({
        at: G.t + q * 0.08 + 0.001,
        fn: () => {
          if (q === 0) sfx('m2', v.x, v.z, null, 3);
        }
      });
    addNoise(v.x, v.z, 30);
    tgt.sup = Math.min(100, tgt.sup + 30);
    if (rnd() < kill)
      sched.push({
        at: G.t + 0.15,
        fn: () => {
          if (tgt.alive) damage(tgt, 45 + rnd() * 30, null);
        }
      });
  }
}
/* Los blindados blancos de la ONU que vinieron a por ellos de noche: un transporte de ruedas hecho de cajas */
let APC_GEO = null;
function apcGeo() {
  if (APC_GEO) return APC_GEO;
  const L = [],
    WH = 0xe6e4dc,
    WH2 = 0xc9c7bf,
    BK = 0x1c1c1a;
  L.push([2.5, 1.25, 5.4, 0, 1.25, 0, WH]); // casco
  L.push([2.3, 0.5, 1.3, 0, 1.55, 2.95, WH2, -0.55]); // glacis inclinado
  L.push([2.36, 0.14, 5.2, 0, 1.92, -0.1, WH2]); // techo

  for (const s of [-1, 1]) {
    for (const z of [-1.7, 0, 1.7]) {
      L.push([1.0, 0.38, 0, s * 1.2, 0.5, z, BK, 0, 0, PH, 'c']);
      L.push([0.5, 0.4, 0, s * 1.21, 0.5, z, 0x5a5a56, 0, 0, PH, 'c']);
    }
  }
  L.push([0.04, 0.5, 0.9, 0, 1.2, -2.72, WH2]); // puerta trasera
  APC_GEO = partGeo(L);
  return APC_GEO;
}
let UN_TEX = null;
function unLetters() {
  if (UN_TEX) return UN_TEX;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#141414';
  x.font = '900 54px "Arial Black", Impact, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('UN', 64, 35);
  UN_TEX = new T.CanvasTexture(c);
  return UN_TEX;
}
let BTR_TUR = null,
  BTR_SPLIT = null,
  BTR_TG = null;
// los triángulos del casco alrededor del anillo de la torreta, recortados para que cojan la pintura blanca
function btrSplit(src) {
  if (BTR_SPLIT) return BTR_SPLIT;
  const P_ = src.attributes.position,
    I_ = src.index ? src.index.array : [...Array(P_.count).keys()],
    keep = [],
    ring = [];
  for (let t = 0; t < I_.length; t += 3) {
    let inR = true,
      cx = 0,
      cz = 0;
    for (let q = 0; q < 3; q++) {
      const v = I_[t + q];
      cx += (P_.getX(v) - BTR_PIV[0]) / 3;
      cz += (P_.getZ(v) - BTR_PIV[2]) / 3;
      if (P_.getY(v) < BTR_PIV[1] - 0.9) inR = false;
    }
    if (Math.hypot(cx, cz) > 0.95) inR = false;
    (inR ? ring : keep).push(I_[t], I_[t + 1], I_[t + 2]);
  }
  const mk = ix => {
    const g = new T.BufferGeometry();
    for (const k in src.attributes) g.setAttribute(k, src.attributes[k]);
    g.setIndex(ix);
    g.computeBoundingSphere();
    return g;
  };
  return (BTR_SPLIT = [mk(keep), mk(ring)]);
}
function btrVehicle() {
  const g = new T.Group(),
    body = new T.Group();
  body.scale.setScalar(1 / 1.5);
  g.add(body);
  world.add(g);
  const piv = new T.Group();
  piv.position.set(BTR_PIV[0], BTR_PIV[1], BTR_PIV[2]);
  body.add(piv);
  withModel('btr', M_ => {
    if (!M_.lit) {
      M_.lit = true;
      M_.mat.color.setRGB(0.9, 0.9, 0.88);
    }
    if (!BTR_TUR) {
      BTR_TUR = M_.mat.clone();
      BTR_TUR.map = whiteMap(M_.mat.map, true);
      BTR_TUR.color.setRGB(1, 1, 1);
      BTR_TUR.vertexColors = false;
      BTR_TUR.needsUpdate = true;
    } // la torreta pintada de blanco como el casco
    const [gb, gr] = btrSplit(M_.geos.body);
    const q = lodMesh(gb, M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    body.add(q);
    const rg = new T.Mesh(gr, M_.mat);
    rg.castShadow = rg.receiveShadow = true;
    body.add(rg);
    if (!BTR_TG) {
      BTR_TG = M_.geos.turret.clone();
      BTR_TG.deleteAttribute('normal');
      BTR_TG.computeVertexNormals();
    } // sus normales guardadas salían oscuras
    const t = new T.Mesh(BTR_TG, BTR_TUR);
    t.castShadow = true;
    piv.add(t);
  });
  // el UN negro en los dos costados
  const mat = new T.MeshBasicMaterial({ map: unLetters(), transparent: true, depthWrite: false, side: T.DoubleSide }),
    geo = new T.PlaneGeometry(1.5, 0.75);

  return { g, piv, kind: 'btr' };
}
function unApc() {
  const g = new T.Group(),
    body = new T.Group();
  body.scale.setScalar(1 / 1.5);
  g.add(body);
  world.add(g);
  const m = new T.Mesh(apcGeo(), heliMat);
  m.castShadow = true;
  m.receiveShadow = true;
  body.add(m);
  return { g, piv: null, kind: 'un' };
}
/* Barricadas: neumáticos, chatarra y un coche quemado cruzados en una calle, ardiendo; bloquean hasta que la tropa las despeja */
function barricade(x, z, dir, tag, solid) {
  const g = new T.Group();
  world.add(g);
  const cells = [],
    o = { kind: 'barricade', val: 0.7, cells, i: Math.floor(x), j: Math.floor(z), g, barricade: tag };
  const tire = new T.CylinderGeometry(0.34, 0.34, 0.16, 10),
    tm = lmat(0x1f1e1c),
    jm = [lmat(0x6a5a48), lmat(0x3a3430), lmat(0x8a7a62), lmat(0x5a4a3a)];
  for (let k = -4; k <= 4; k++) {
    const i = Math.floor(x + (dir === 'x' ? k : 0)),
      j = Math.floor(z + (dir === 'z' ? k : 0));
    if (!inB(i, j) || grid[idx(i, j)] === 1) continue;
    const kk = idx(i, j);
    if (cov[kk]) destroyCover(cov[kk]);
    cells.push(kk);
    grid[kk] = solid ? 1 : 2;
    cov[kk] = o;
    topH[kk] = 0.8;
    // los neumáticos: un montón del modelo subido en cada celda, girado y escalado a su manera;
    // si no ha cargado, las pilas de cilindros de antes. Las tiradas aleatorias son las mismas en los dos casos.
    const stack = [];
    for (let n = 0; n < 3 + ri(2); n++) stack.push([i + 0.5 + rr(-0.1, 0.1), 0.09 + n * 0.16, j + 0.5 + rr(-0.1, 0.1)]);
    const TM = MODELS.u_tires;
    if (TM && TM.ready) {
      const m = new T.Mesh(TM.geos.m, TM.mat),
        h = hash2(i * 13 + 7, j * 31 - 5);
      m.position.set(i + 0.5, 0, j + 0.5);
      m.rotation.y = h * 6.283;
      m.scale.setScalar(0.75 + h * 0.35);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    } else
      for (const p of stack) {
        const m = new T.Mesh(tire, tm);
        m.position.set(p[0], p[1], p[2]);
        m.castShadow = true;
        g.add(m);
      }
    if (rnd() < 0.6) {
      const m = new T.Mesh(UBOX, pick(jm));
      m.scale.set(rr(0.3, 0.9), rr(0.2, 0.7), rr(0.3, 0.9));
      m.position.set(i + 0.5 + rr(-0.3, 0.3), 0.3, j + 0.5 + rr(-0.3, 0.3));
      m.rotation.y = rnd() * 3;
      m.castShadow = true;
      g.add(m);
    }
  }
  const em = { x, z, y: 0.9, rate: 42, life: 11, vy: 1.5, s0: 0.5, s1: 2.6, fire: 0.55, acc: 0, sp: 0.9 };
  emitters.push(em);
  o.em = em;
  return { x, z, o, em, cleared: false };
}
function clearBarricade(b) {
  if (b.cleared) return;
  b.cleared = true;
  destroyCover(b.o);
  b.em.until = G.t + 0.01;
}
