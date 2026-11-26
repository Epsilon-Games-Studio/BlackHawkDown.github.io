/* ====================================================================================================
 * missions/m01-irene/dust-and-ropes.js
 *
 * Detalles del vuelo de Irene: el polvo que levantan los Little Birds al posarse
 * y las cuerdas de fast-rope (las de todas las misiones): cómo se despliegan, cuelgan y caen al soltarlas.
 * ================================================================================================== */

let ROPE_MAT = null;
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
/* Las cuerdas de fast-rope, de principio a fin con la misma física: una cadena de puntos con gravedad que guardan su separación y se
   resisten a doblarse del todo.
   - Al desplegarla: el tripulante la echa por la puerta; la punta sale lanzada hacia fuera y cae, y la cuerda se va desenrollando
     detrás de ella desde el anclaje, culebreando hasta tocar el suelo y quedarse colgada con un poco de sobra en el suelo.
   - Mientras cuelga: el soplo del rotor la mece, más cuanto más abajo.
   - Al soltarla: el anclaje se suelta antes de que el helicóptero se mueva, la cuerda cae entera, se dobla y se queda en el suelo. */
let FROPES = [];
const FR_N = 28,
  FR_G = 6.5, // la gravedad en unidades del juego (1 = 1,5 m)
  FR_SLACK = 0.9; // lo que sobra de cuerda en el suelo
function ropeMat() {
  if (!ROPE_MAT) ROPE_MAT = new T.MeshLambertMaterial({ color: 0x2a2622 });
  return ROPE_MAT;
}
// echa una cuerda desde el punto top (que luego hay que ir moviendo con ropePin); (ox, oz) es hacia dónde la lanzan
function ropeLive(top, gy, ox, oz) {
  const L = Math.max(1, top.y - gy) + FR_SLACK,
    seg = L / (FR_N - 1),
    dt0 = 1 / 60;
  const P = [],
    Q = [];
  for (let i = 0; i < FR_N; i++) {
    P.push(top.clone());
    Q.push(top.clone());
  }
  // la punta sale lanzada hacia fuera y algo hacia abajo
  const ol = Math.hypot(ox, oz) || 1,
    th = rr(1.3, 2.0);
  Q[FR_N - 1].set(top.x - (ox / ol) * th * dt0, top.y + 1.6 * dt0, top.z - (oz / ol) * th * dt0);
  const m = new T.Mesh(new T.BufferGeometry(), ropeMat());
  m.castShadow = true;
  m.visible = false;
  world.add(m);
  const R = { P, Q, gy, seg, m, acc: 0, t: 0, still: 0, done: false, pin: true, top: top.clone(), out: FR_N - 1, ph: rnd() * 6.283, ox: ox / ol, oz: oz / ol };
  FROPES.push(R);
  return R;
}
function ropePin(R, top, gy) {
  if (!R || !R.pin) return;
  R.top.copy(top);
  if (gy !== undefined) R.gy = gy;
}
// ya está desplegada del todo y ha dejado de dar latigazos: pueden empezar a bajar
function ropeReady(R) {
  return !!R && R.outT !== undefined && R.t - R.outT > 0.35;
}
// el punto de la cuerda a la altura y, bajando desde el anclaje (null si a esa altura no hay cuerda)
function ropeAt(R, y, out) {
  if (!R) return null;
  const i0 = R.pin ? Math.max(0, R.out - 1) : 0;
  for (let i = i0; i < FR_N - 1; i++) {
    const a = R.P[i],
      b = R.P[i + 1];
    if (a.y !== b.y && (a.y - y) * (b.y - y) <= 0) {
      const t = (a.y - y) / (a.y - b.y);
      return out.set(a.x + (b.x - a.x) * t, y, a.z + (b.z - a.z) * t);
    }
  }
  return null;
}
// alguien cuelga de la cuerda a la altura y: su peso la tensa (lo usa la simulación en el siguiente paso)
function ropeGrab(R, y) {
  if (!R || !R.pin) return;
  if (R.loadF !== R.t) {
    R.loadF = R.t;
    R.loadLow = y;
  } else R.loadLow = Math.min(R.loadLow, y);
  R.loadT = R.t;
}
/* El que baja va pegado a la cuerda: los pies sobre el punto de la cuerda a su altura (a un palmo, por el lado de la cara) y el cuerpo
   inclinado como ella entre los pies y las manos. Vale para los hombres del vuelo de Irene (y) y para los de guion (elev). */
const _rfA = new T.Vector3(),
  _rfB = new T.Vector3();
function ropeFollow(u, R, y) {
  if (!R || !R.pin) return;
  ropeGrab(R, y + 0.95);
  const f = ropeAt(R, y + 0.08, _rfA),
    hnd = ropeAt(R, y + 0.95, _rfB);
  if (!f) return;
  const fc = u.face || 0;
  u.x = f.x - Math.sin(fc) * 0.13;
  u.z = f.z - Math.cos(fc) * 0.13;
  if (hnd) {
    // la inclinación de la cuerda entre los pies y las manos, en el marco del hombre (adelante y de lado)
    const dx = (hnd.x - f.x) / 0.87,
      dz = (hnd.z - f.z) / 0.87;
    u.ropeTf = Math.atan(dx * Math.sin(fc) + dz * Math.cos(fc));
    u.ropeTs = Math.atan(dx * Math.cos(fc) - dz * Math.sin(fc));
  }
}
// se suelta el anclaje: lo que quedaba enrollado arriba cae con ella
function ropeRelease(R) {
  if (!R || !R.pin) return;
  R.pin = false;
  R.t = 0;
  R.still = 0;
  R.done = false;
  // los nodos que aún estaban enrollados arriba se reparten un poco para no caer todos en el mismo punto
  for (let i = 0; i < R.out; i++) {
    R.P[i].x += rr(-0.02, 0.02);
    R.P[i].z += rr(-0.02, 0.02);
    R.Q[i].copy(R.P[i]);
  }
  R.out = 0;
}
function ropeShape(R) {
  const pts = [];
  const i0 = R.pin ? Math.max(0, R.out - 1) : 0;
  for (let i = i0; i < FR_N; i++) {
    const p = R.P[i],
      q = pts[pts.length - 1];
    if (!q || p.distanceToSquared(q) > 1e-5) pts.push(p);
  }
  if (pts.length < 2) {
    R.m.visible = false;
    return;
  }
  R.m.visible = true;
  const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), Math.max(4, pts.length * 3), 0.035, 5, false);
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
    // con alguien colgado la cuerda va tensa: casi no se mece y por encima de él se pone a plomo bajo el anclaje
    const loaded = R.pin && R.t - (R.loadT === undefined ? -9 : R.loadT) < 0.25;
    while (R.acc >= h) {
      R.acc -= h;
      const pinN = R.pin ? Math.max(R.out, 1) : 0; // los nodos 0..pinN-1 van sujetos al anclaje
      for (let i = 0; i < pinN; i++) {
        R.Q[i].copy(R.P[i]);
        R.P[i].copy(R.top);
      }
      for (let i = pinN; i < FR_N; i++) {
        const p = R.P[i],
          q = R.Q[i],
          gr = p.y <= R.gy + 0.035;
        let vx = (p.x - q.x) * (gr ? 0.82 : 0.993),
          vy = (p.y - q.y) * 0.993,
          vz = (p.z - q.z) * (gr ? 0.82 : 0.993);
        q.copy(p);
        // el soplo del rotor: la mece hacia fuera y de lado, más abajo más (sólo mientras cuelga del helicóptero)
        if (loaded && !gr) {
          // tensa: el vaivén se apaga y la cuerda se va a la vertical del anclaje; más fuerte por encima del que baja
          const above = p.y > R.loadLow - 0.4,
            k = above ? 0.06 : 0.025,
            dmp = above ? 0.9 : 0.96;
          vx = vx * dmp + (R.top.x - p.x) * k * h * 6;
          vz = vz * dmp + (R.top.z - p.z) * k * h * 6;
        }
        if (R.pin && !gr) {
          const f = (i / (FR_N - 1)) * (loaded ? 0.25 : 1),
            a1 = Math.sin(R.t * 2.3 + i * 0.45 + R.ph) * 0.9 * f,
            a2 = Math.cos(R.t * 1.6 + i * 0.3 + R.ph * 1.7) * 0.6 * f;
          vx += (R.ox * a1 - R.oz * a2) * h * h;
          vz += (R.oz * a1 + R.ox * a2) * h * h;
        }
        p.x += vx;
        p.y += vy - FR_G * h * h;
        p.z += vz;
      }
      // desenrollar: cuando el primer tramo suelto se ha alejado una longitud del anclaje, sale otro
      if (R.pin)
        while (R.out > 1 && R.P[R.out].distanceTo(R.top) >= R.seg) {
          R.out--;
          // el tramo nuevo sale ya corriendo, casi a la velocidad del que tira de él (el rollo lo empujan por la puerta)
          const n = R.P[R.out + 1],
            nq = R.Q[R.out + 1];
          R.P[R.out].copy(R.top);
          R.Q[R.out].set(R.top.x - (n.x - nq.x) * 0.85, R.top.y - (n.y - nq.y) * 0.85, R.top.z - (n.z - nq.z) * 0.85);
        }
      if (R.pin && R.out <= 1 && R.outT === undefined) R.outT = R.t;
      const pinNow = R.pin ? Math.max(R.out, 1) : 0,
        w = i => (i < pinNow ? 0 : 1);
      for (let it = 0; it < 14; it++) {
        for (let i = Math.max(0, pinNow - 1); i < FR_N - 1; i++) {
          const a = R.P[i],
            b = R.P[i + 1],
            wa = w(i),
            wb = w(i + 1);
          if (!wa && !wb) continue;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z,
            d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d <= R.seg) continue; // una cuerda tira pero no empuja
          const c = (d - R.seg) / d / (wa + wb);
          a.x += dx * c * wa;
          a.y += dy * c * wa;
          a.z += dz * c * wa;
          b.x -= dx * c * wb;
          b.y -= dy * c * wb;
          b.z -= dz * c * wb;
        }
        for (let i = pinNow; i < FR_N - 2; i++) {
          const a = R.P[i],
            b = R.P[i + 2],
            wa = w(i),
            wb = w(i + 2);
          if (!wa && !wb) continue;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z,
            d = Math.hypot(dx, dy, dz) || 1e-6,
            m_ = R.seg * 1.55; // no se dobla sobre sí misma
          if (d < m_ && d > 1e-4) {
            const c = ((d - m_) / d) * 0.5 / (wa + wb);
            a.x += dx * c * wa;
            a.y += dy * c * wa;
            a.z += dz * c * wa;
            b.x -= dx * c * wb;
            b.y -= dy * c * wb;
            b.z -= dz * c * wb;
          }
        }
        for (let i = pinNow; i < FR_N; i++) if (R.P[i].y < R.gy + 0.035) R.P[i].y = R.gy + 0.035;
      }
      // el suelo no la hace rebotar: si la ha tenido que subir, pierde esa velocidad hacia arriba
      for (let i = pinNow; i < FR_N; i++) if (R.P[i].y <= R.gy + 0.036 && R.Q[i].y < R.P[i].y) R.Q[i].y = R.P[i].y;
      for (let i = pinNow; i < FR_N; i++) moved = Math.max(moved, R.P[i].distanceTo(R.Q[i]));
    }
    ropeShape(R);
    if (R.pin) continue;
    R.still = moved < 0.0015 ? R.still + dt : 0;
    if ((R.t > 2.5 && R.still > 0.6) || R.t > 9) R.done = true;
  }
}
