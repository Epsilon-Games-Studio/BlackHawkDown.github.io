/* ====================================================================================================
 * fx/fx.js
 *
 * Efectos
 *
 * Efectos de disparo: trazadoras, fogonazos, casquillos que saltan, humo, explosiones
 * y el bucle que los anima (updFx).
 * ================================================================================================== */

'use strict';

const trMat = {};
const trM = c =>
  trMat[c] ||
  (trMat[c] = new T.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: 0.62, depthWrite: false }));
function tracer(x0, y0, z0, x1, y1, z1, col, delay) {
  const ln = new T.Mesh(UBOX, trM(col));
  ln.visible = false;
  world.add(ln);
  const d = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const tl = d > 4 && rnd() < 0.35 ? trL[(trHead = (trHead + 1) % TRL_N)] : null;
  if (tl) {
    tl.color.setHex(col);
    tl.userData.owner = ln;
  }
  fx.push({ type: 'tr', obj: ln, t: -delay, life: Math.max(0.1, d / 65), a: [x0, y0, z0], b: [x1, y1, z1], d, L: tl });
}
const lmC = {};
const lineMat = c => lmC[c] || (lmC[c] = new T.LineBasicMaterial({ color: c, fog: false }));
const _mz = new T.Vector3();
const _bp = new T.Vector3();
function ejectBrass(s) {
  if (!s.m || !s.alive || !chunkMesh) return;
  const p = s.m.gun.localToWorld(_bp.set(-0.03, 0.045, 0.06));
  if (!isFinite(p.x)) return;
  const rx = -Math.cos(s.face),
    rz = Math.sin(s.face),
    v = rr(1.2, 2);
  const b = spawnChunk(
    p.x,
    p.y,
    p.z,
    rx * v + rr(-0.3, 0.3),
    rr(1.0, 1.8),
    rz * v + rr(-0.3, 0.3),
    0.015,
    s.gun === 'saw' ? 0x86744a : 0x8e7c52,
    'splinter'
  );
  if (b) b.brass = true;
}
function burstFx(s, ix, iy, iz, unitHit) {
  const n = s.burst > 4 ? 4 : s.burst;
  s.aimP = [ix, iy, iz, G.t];
  let fx0 = s.x + Math.sin(s.face) * 0.62,
    fz0 = s.z + Math.cos(s.face) * 0.62,
    fy0 = s.stance === 'prone' ? 0.18 : s.stance === 'crouch' ? 0.64 : 0.83;
  if (s.m) {
    s.m.recoil = 1;
    const mz =
      s.pist && s.m.pistol
        ? s.m.pistol.localToWorld(_mz.set(0, -0.15, 0.014))
        : s.m.gun.localToWorld(_mz.set(0, 0.015, s.gun === 'car' ? 0.45 : s.gun === 'ak' ? 0.38 : 0.5));
    if (isFinite(mz.x)) {
      fx0 = mz.x;
      fy0 = mz.y;
      fz0 = mz.z;
    }
  }
  const col = s.team === 'us' ? 0xff7a3a : 0x9aff5a;
  for (let k = 0; k < n; k++) {
    const del = k * 0.09;
    let ex = ix + (rnd() - 0.5) * 0.5,
      ey = iy + (rnd() - 0.5) * 0.3,
      ez = iz + (rnd() - 0.5) * 0.5,
      hitW = null;
    if (!unitHit) {
      hitW = traceShot(fx0, fy0, fz0, ex, ey, ez, 26);
      if (hitW) {
        ex = hitW.x;
        ey = hitW.y;
        ez = hitW.z;
      } else {
        const dx = ex - fx0,
          dy = ey - fy0,
          dz = ez - fz0,
          L = Math.hypot(dx, dy, dz) || 1,
          f = (L + 26) / L;
        ex = fx0 + dx * f;
        ey = fy0 + dy * f;
        ez = fz0 + dz * f;
      }
    }
    tracer(fx0, fy0, fz0, ex, ey, ez, col, del);
    if (s.team === 'them' && Math.hypot(fx0 - camS.tx, fz0 - camS.tz) > 9)
      sched.push({ at: G.t + del + 0.04, fn: () => whizSnd(ex, ez) });
    if (hitW) {
      const hw = hitW,
        tl = Math.max(0.1, Math.hypot(ex - fx0, ey - fy0, ez - fz0) / 65);
      sched.push({ at: G.t + del + tl, fn: () => impactFx(hw) });
    }
    sched.push({
      at: G.t + del,
      fn: () => {
        flash(fx0, fy0, fz0, !s.pist && (s.gun === 'saw' || !!s.tech));
        if (k === 0) sfx(s.pist ? 'pistol' : s.team === 'us' ? 'm16' : 'ak', s.x, s.z, s, n);
        ejectBrass(s);
      }
    });
  }
  G.fired += s.team === 'us' && !s.god ? s.burst : 0;
}
const MZ_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.25, 'rgba(255,220,140,.95)');
  g.addColorStop(0.6, 'rgba(255,150,60,.35)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = 'rgba(255,230,160,.9)';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3,
      L = k % 2 ? 22 : 30;
    x.beginPath();
    x.moveTo(32 + Math.cos(a) * L, 32 + Math.sin(a) * L);
    x.lineTo(32 + Math.cos(a + 1.35) * 5, 32 + Math.sin(a + 1.35) * 5);
    x.lineTo(32 + Math.cos(a - 1.35) * 5, 32 + Math.sin(a - 1.35) * 5);
    x.closePath();
    x.fill();
  }
  const t = new T.CanvasTexture(c);
  t.minFilter = T.LinearFilter;
  return t;
})();
const mzMats = [0, 1, 2].map(
  () =>
    new T.SpriteMaterial({
      map: MZ_TEX,
      color: 0xffe2a8,
      blending: T.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false
    })
);
function flash(x, y, z, big) {
  const sp = new T.Sprite(mzMats[ri(3)]),
    s = (big ? rr(0.9, 1.3) : rr(0.5, 0.75)) * (1 + nightF * 0.25);
  sp.material.rotation = rnd() * 6.28;
  sp.scale.set(s, s, 1);
  sp.position.set(x, y, z);
  world.add(sp);
  fx.push({ type: 'fl', obj: sp, t: 0, life: big ? 0.07 : 0.05 });
  muzzleLight(x, y, z, big);
  if (rnd() < (big ? 0.9 : 0.5))
    spawnP(
      x,
      y,
      z,
      rr(-0.2, 0.2),
      rr(0.2, 0.5),
      rr(-0.2, 0.2),
      rr(0.6, 1.1) * (big ? 1.6 : 1),
      big ? 0.14 : 0.08,
      big ? 0.45 : 0.25,
      0x9a9488,
      0xc8c0b0,
      0.7,
      0,
      0
    );
}
function puff(x, y, z, col, n) {
  for (let k = 0; k < n * 3; k++)
    spawnP(
      x + rr(-0.1, 0.1),
      y,
      z + rr(-0.1, 0.1),
      rr(-0.7, 0.7),
      rr(0.4, 1.6),
      rr(-0.7, 0.7),
      rr(0.4, 0.9),
      rr(0.06, 0.12),
      rr(0.2, 0.38),
      col,
      shade(col, 1.15),
      rr(0.7, 1),
      0,
      0
    );
}
function boom(x, z) {
  lightFlash(x, 1.2, z, 0xffa040, 7, 12, 0.8);
  for (let k = 0; k < 70; k++) {
    const a = rnd() * 6.28,
      s = rr(1, 4.5);
    spawnP(
      x,
      0.5,
      z,
      Math.cos(a) * s,
      rr(1, 4),
      Math.sin(a) * s,
      rr(0.25, 0.6),
      rr(0.25, 0.5),
      0.08,
      pick([0xffe7a0, 0xffc050, 0xff9030]),
      0xc0301a,
      1,
      1,
      0
    );
  }
  for (let k = 0; k < 60; k++) {
    const a = rnd() * 6.28,
      s = rr(0.3, 1.6);
    spawnP(
      x + rr(-0.4, 0.4),
      rr(0.3, 1),
      z + rr(-0.4, 0.4),
      Math.cos(a) * s,
      rr(0.6, 2.2),
      Math.sin(a) * s,
      rr(2.5, 5),
      rr(0.3, 0.5),
      rr(0.9, 1.6),
      0x1e1b18,
      0x6a6258,
      1,
      0,
      0
    );
  }
  for (let k = 0; k < 30; k++) {
    const a = rnd() * 6.28,
      s = rr(2, 6);
    spawnP(
      x,
      0.5,
      z,
      Math.cos(a) * s,
      rr(2, 5),
      Math.sin(a) * s,
      rr(1, 1.8),
      0.08,
      0.07,
      pick([0x3a342c, 0x6a5a48, 0x8a7a62]),
      0x4a4036,
      1,
      0,
      9
    );
  }
  scorchAround(x, 0.03, z, rr(2.6, 3.4));
  blastCover(x, z, 2.0);
  blastRubble(x, z, 16);
}
function updFx(dt) {
  updChunks(dt);
  updShards(dt);
  updFallRopes(dt);
  updTrickles(dt);
  updTraces(dt);
  for (let k = fx.length - 1; k >= 0; k--) {
    const f = fx[k];
    f.t += dt;
    if (f.type === 'tr') {
      if (f.t < 0) continue;
      f.obj.visible = true;
      const u = clamp(f.t / f.life, 0, 1),
        seg = Math.min(1, 1.7 / (f.d || 1));
      const a = f.a,
        b = f.b,
        u0 = Math.max(0, u - seg);
      const ax = a[0] + (b[0] - a[0]) * u0,
        ay = a[1] + (b[1] - a[1]) * u0,
        az = a[2] + (b[2] - a[2]) * u0;
      const bx = a[0] + (b[0] - a[0]) * u,
        by = a[1] + (b[1] - a[1]) * u,
        bz = a[2] + (b[2] - a[2]) * u;
      const L = Math.hypot(bx - ax, by - ay, bz - az) || 0.01;
      f.obj.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      f.obj.lookAt(bx, by, bz);
      f.obj.scale.set(0.03, 0.03, L);
      if (f.L && f.L.userData.owner === f.obj) {
        f.L.position.set(bx, by, bz);
        f.L.intensity = (1.4 + nightF * 2.2) * (u < 1 ? 1 : 0);
        f.L.distance = 3.5 + nightF * 2.5;
        if (u >= 1) f.L.userData.owner = null;
      }
    } else if (f.type === 'grow') {
      const s = 0.15 + 0.85 * Math.sqrt(Math.min(1, f.t / f.life));
      f.obj.scale.setScalar(s);
      if (f.t >= f.life) {
        fx.splice(k, 1);
        continue;
      }
    } else if (f.type === 'pf') {
      f.obj.position.x += f.v[0] * dt;
      f.obj.position.y += f.v[1] * dt;
      f.obj.position.z += f.v[2] * dt;
      f.v[1] -= 1.2 * dt;
      const s = 1 + f.t * 2;
      f.obj.scale.set(s, s, s);
    } else if (f.type === 'bm') {
      const s = 1 + f.t * 5;
      f.obj.scale.set(s, s, s);
      f.obj.material.opacity = 1 - f.t / f.life;
    }
    if (f.t >= f.life) {
      if (f.L && f.L.userData.owner === f.obj) {
        f.L.intensity = 0;
        f.L.userData.owner = null;
      }
      world.remove(f.obj);
      fx.splice(k, 1);
    }
  }
}
