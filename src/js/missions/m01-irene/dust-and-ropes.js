/* ====================================================================================================
 * missions/m01-irene/dust-and-ropes.js
 *
 * Detalles del vuelo de Irene: el polvo que levantan los Little Birds al posarse
 * y las cuerdas de fast-rope que caen al suelo.
 * ================================================================================================== */

'use strict';

let ROPE_GEO = null,
  ROPE_MAT = null;
/* Un Little Bird cerca del suelo levanta un anillo de polvo: la misma calima suave y la arena corriendo que en las rachas sobre la ciudad,
   lanzadas en redondo por el rotor. Empieza cuando el aparato baja, se hace más espeso y más ancho al posarse, sigue mientras está posado con
   las palas girando y se apaga cuando vuelve a subir. */
function lbDust(h, gy, dt) {
  const alt = h.y - gy;
  if (dt <= 0 || alt > 15 || h.rs < 0.05) return;
  const s = Math.pow(1 - Math.max(0, alt) / 15, 1.6) * h.rs,
    cx = h.x,
    cz = h.z;
  h.dAcc = (h.dAcc || 0) + dt * s * 48;
  while (h.dAcc > 1) {
    h.dAcc -= 1;
    const a = rnd() * 6.283,
      ca = Math.cos(a),
      sa = Math.sin(a),
      r0 = rr(1.0, 2.0) + s * rr(0, 1.2),
      v = rr(2.4, 4.4) * (0.45 + s * 0.8);
    spawnP(
      cx + ca * r0,
      gy + rr(0.1, 0.5),
      cz + sa * r0,
      ca * v,
      rr(0.12, 0.5),
      sa * v,
      rr(2.4, 4.2),
      rr(1.0, 1.7),
      rr(3.0, 4.8),
      0xa98b5f,
      0xc2a77c,
      rr(0.3, 0.46) * (0.35 + 0.65 * s),
      0,
      0
    );
  }
  h.sAcc = (h.sAcc || 0) + dt * s * 80;
  while (h.sAcc > 1) {
    h.sAcc -= 1;
    const a = rnd() * 6.283,
      ca = Math.cos(a),
      sa = Math.sin(a),
      r0 = rr(0.8, 2.4),
      v = rr(4.5, 7.5) * (0.5 + s * 0.6);
    spawnP(
      cx + ca * r0 + rr(-0.2, 0.2),
      gy + rr(0.02, 0.16),
      cz + sa * r0 + rr(-0.2, 0.2),
      ca * v,
      rr(-0.05, 0.2),
      sa * v,
      rr(0.45, 0.9),
      rr(0.06, 0.1),
      rr(0.08, 0.14),
      0xf3e6c4,
      0xe2cfa4,
      rr(0.5, 0.8) * (0.4 + 0.6 * s),
      0,
      0
    );
  }
}
/* Una cuerda de fast-rope soltada por su Black Hawk: una cadena de puntos con gravedad que guardan su separación y se resisten a doblarse
   del todo, así se dobla y serpentea al caer; se desliza y se para en el suelo, y ahí se queda */
let FROPES = [];
const FR_N = 26,
  FR_G = 6.5;
function ropeDrop(r, h, F) {
  const top = r.p,
    gy = r.gy,
    L = Math.max(1, top.y - gy),
    seg = L / (FR_N - 1),
    th = Math.atan2(h.vx || rr(-1, 1), h.vz || rr(-1, 1)) + rr(-0.9, 0.9),
    ph = rnd() * 6.283;
  const P = [],
    Q = [],
    dt0 = 1 / 60;
  for (let i = 0; i < FR_N; i++) {
    const y = top.y - i * seg,
      f = 1 - i / (FR_N - 1),
      vt = rr(1.1, 2.0) * f,
      w = Math.sin(i * 0.55 + ph) * 0.7 * f;
    const vx = Math.sin(th) * vt + Math.cos(th) * w,
      vz = Math.cos(th) * vt - Math.sin(th) * w;
    P.push(new T.Vector3(top.x, Math.max(gy + 0.03, y), top.z));
    Q.push(new T.Vector3(top.x - vx * dt0, Math.max(gy + 0.03, y) + 0.02 * f, top.z - vz * dt0));
  }
  world.remove(r.m);
  const i0 = F.ropes.indexOf(r.m);
  if (i0 >= 0) F.ropes.splice(i0, 1);
  const m = new T.Mesh(new T.BufferGeometry(), ROPE_MAT);
  m.castShadow = true;
  world.add(m); // no va en F.ropes: se queda cuando termina el vuelo
  const R = { P, Q, gy, seg, m, acc: 0, t: 0, still: 0, done: false };
  FROPES.push(R);
  ropeShape(R);
}
function ropeShape(R) {
  const g = new T.TubeGeometry(new T.CatmullRomCurve3(R.P), FR_N * 3, 0.035, 5, false);
  R.m.geometry.dispose();
  R.m.geometry = g;
}
function updFallRopes(dt) {
  if (!FROPES.length || dt <= 0) return;
  const h = 1 / 60;
  for (const R of FROPES) {
    if (R.done || !R.m.parent) continue;
    R.acc += Math.min(dt, 0.1);
    R.t += Math.min(dt, 0.1);
    let moved = 0;
    while (R.acc >= h) {
      R.acc -= h;
      for (let i = 0; i < FR_N; i++) {
        const p = R.P[i],
          q = R.Q[i],
          gr = p.y <= R.gy + 0.035;
        let vx = (p.x - q.x) * (gr ? 0.82 : 0.995),
          vy = (p.y - q.y) * 0.995,
          vz = (p.z - q.z) * (gr ? 0.82 : 0.995);
        q.copy(p);
        p.x += vx;
        p.y += vy - FR_G * h * h;
        p.z += vz;
      }
      for (let it = 0; it < 14; it++) {
        for (let i = 0; i < FR_N - 1; i++) {
          const a = R.P[i],
            b = R.P[i + 1],
            dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z,
            d = Math.hypot(dx, dy, dz) || 1e-6,
            c = ((d - R.seg) / d) * 0.5;
          a.x += dx * c;
          a.y += dy * c;
          a.z += dz * c;
          b.x -= dx * c;
          b.y -= dy * c;
          b.z -= dz * c;
        }
        for (let i = 0; i < FR_N - 2; i++) {
          const a = R.P[i],
            b = R.P[i + 2],
            dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z,
            d = Math.hypot(dx, dy, dz) || 1e-6,
            m_ = R.seg * 1.55; // no se dobla sobre sí misma
          if (d < m_) {
            const c = ((d - m_) / d) * 0.25;
            a.x += dx * c;
            a.y += dy * c;
            a.z += dz * c;
            b.x -= dx * c;
            b.y -= dy * c;
            b.z -= dz * c;
          }
        }
        for (const p of R.P) if (p.y < R.gy + 0.035) p.y = R.gy + 0.035;
      }
      for (let i = 0; i < FR_N; i++) moved = Math.max(moved, R.P[i].distanceTo(R.Q[i]));
    }
    ropeShape(R);
    R.still = moved < 0.0015 ? R.still + dt : 0;
    if ((R.t > 2.5 && R.still > 0.6) || R.t > 9) R.done = true;
  }
}
function ropeMesh() {
  if (!ROPE_GEO) {
    ROPE_GEO = new T.CylinderGeometry(0.035, 0.035, 1, 5);
    ROPE_GEO.translate(0, -0.5, 0);
    ROPE_MAT = new T.MeshLambertMaterial({ color: 0x2a2622 });
  }
  const r = new T.Mesh(ROPE_GEO, ROPE_MAT);
  r.castShadow = true;
  world.add(r);
  return r;
}
