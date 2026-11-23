/* ====================================================================================================
 * units/scripted-aircraft.js
 *
 * Aeronaves con guion: fotogramas clave en el tiempo; vuelan, se quedan en estacionario, se posan y caen
 * ================================================================================================== */

'use strict';

function scriptHeli(kind, keys, o) {
  const h = kind === 'lb' ? littleBird() : makeHeliObj();
  if (kind === 'lb') world.add(h.g);
  const k0 = keys[0];
  const S = Object.assign(
    {
      h,
      kind,
      keys,
      t: 0,
      k: 0,
      yaw: k0.yaw != null ? k0.yaw : 0,
      spin: 0,
      x: k0.x,
      y: k0.y,
      z: k0.z,
      smoke: null,
      rope: null
    },
    o || {}
  );
  h.g.position.set(S.x, S.y, S.z);
  SCRIPTED.push(S);
  startRotorSound();
  return S;
}
function scriptStep(dt) {
  for (let n = SCRIPTED.length - 1; n >= 0; n--) {
    const S = SCRIPTED[n];
    S.t += dt;
    const K = S.keys;
    while (S.k < K.length - 1 && S.t >= K[S.k + 1].t) {
      S.k++;
      if (K[S.k].ev) K[S.k].ev(S);
    }
    if (S.gone) {
      world.remove(S.h.g);
      if (S.rope) world.remove(S.rope);
      if (S.smoke) S.smoke.until = G.t + 0.01;
      SCRIPTED.splice(n, 1);
      continue;
    }
    const a = K[S.k],
      b = K[Math.min(S.k + 1, K.length - 1)];
    const px = S.x,
      pz = S.z;
    if (S.spline && b !== a) {
      const lf = clamp((S.t - a.t) / Math.max(0.01, b.t - a.t), 0, 1),
        p0 = K[Math.max(0, S.k - 1)],
        p3 = K[Math.min(K.length - 1, S.k + 2)];
      const cr = (q0, q1, q2, q3) =>
        0.5 *
        (2 * q1 +
          (-q0 + q2) * lf +
          (2 * q0 - 5 * q1 + 4 * q2 - q3) * lf * lf +
          (-q0 + 3 * q1 - 3 * q2 + q3) * lf * lf * lf);
      S.x = cr(p0.x, a.x, b.x, p3.x);
      S.y = Math.max(0, cr(p0.y, a.y, b.y, p3.y));
      S.z = cr(p0.z, a.z, b.z, p3.z);
    } else {
      const f = b === a ? 1 : sstep(0, 1, (S.t - a.t) / Math.max(0.01, b.t - a.t));
      S.x = a.x + (b.x - a.x) * f;
      S.y = a.y + (b.y - a.y) * f;
      S.z = a.z + (b.z - a.z) * f;
    }
    const vx = (S.x - px) / Math.max(dt, 1e-4),
      vz = (S.z - pz) / Math.max(dt, 1e-4),
      sp = Math.hypot(vx, vz);
    if (S.spin) S.yaw += S.spin * dt;
    else if (sp > 1.2) {
      let d = Math.atan2(vx, vz) - S.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      S.yaw += d * Math.min(1, dt * (S.turn || 2.2));
    } else if (a.yaw != null) {
      let d = a.yaw - S.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      S.yaw += d * Math.min(1, dt * 1.5);
    }
    S.h.g.position.set(S.x, S.y, S.z);
    S.h.g.rotation.set(clamp(sp * 0.01, 0, 0.18) + (S.tilt || 0), S.yaw, S.spin ? Math.sin(S.t * 3) * 0.15 : 0, 'YXZ');
    if (S.h.rotor) S.h.rotor.rotation.y += dt * 17;
    if (S.h.tail && !S.noTail) S.h.tail.rotation.x += dt * 42;
    if (S.y < 16) rotorWash(S.x, S.z, Math.max(S.y, 0.5), dt, 0.9);
    if (S.smoke) {
      S.smoke.x = S.x;
      S.smoke.z = S.z;
      S.smoke.y = S.y + 2;
    }
    if (S.rope) {
      S.rope.position.set(S.x + Math.sin(S.yaw + PH) * 1.0, S.y + 1.6, S.z + Math.cos(S.yaw + PH) * 1.0);
      S.rope.scale.y = Math.max(0.1, S.y + 1.6);
    }
  }
}
/* Hombres bajando por una cuerda desde un helicóptero en estacionario, uno detrás de otro */
function fastRope(S, g, specs, gap) {
  S.rope = ropeMesh();
  specs.forEach((sp, k) =>
    sched.push({
      at: G.t + 0.4 + k * (gap || 1.1),
      fn: () => {
        const rx_ = S.x + Math.sin(S.yaw + PH) * 1.0,
          rz_ = S.z + Math.cos(S.yaw + PH) * 1.0,
          u = addMember(g, sp, rx_ + rr(-0.6, 0.6), rz_ + rr(-0.6, 0.6));
        u.slide = true;
        u.elev = Math.max(0, S.y + 1.2);
        u.stance = 'stand';
        u.ropeV = 0.6;
        if (walk(Math.floor(rx_), Math.floor(rz_))) {
          u.face = rnd() * 6.283;
          u.x = rx_ - Math.sin(u.face) * 0.13;
          u.z = rz_ - Math.cos(u.face) * 0.13;
        }
        if (k === specs.length - 1)
          sched.push({
            at: G.t + 3,
            fn: () => {
              if (S.rope) {
                world.remove(S.rope);
                S.rope = null;
              }
              G.m.roped = true;
            }
          });
        buildCards();
      }
    })
  );
}
