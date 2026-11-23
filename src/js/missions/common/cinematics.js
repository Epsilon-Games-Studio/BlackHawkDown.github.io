/* ====================================================================================================
 * missions/common/cinematics.js
 *
 * 2 · Calle Hawlwadig
 * ================================================================================================== */

'use strict';

/* ----------------------------------------------------------------------------------------------------
 * Cinemáticas dentro de la misión: se va el HUD, la cámara gira alrededor de un punto que el jugador puede rotar y un guion corre en tiempo de juego
 * -------------------------------------------------------------------------------------------------- */
let CINE = { on: false };
function cineStart(o) {
  CINE = Object.assign(
    { on: true, t: 0, k: 0, uyaw: 0, uz: 1, yaw0: camS.yaw, keys: [], dur: 1e9, zoom: 11, spin: 0.025, block: true },
    o
  );
  document.body.classList.add('cine');
  $('bSkip').hidden = false;
  $('bSkip').textContent = 'Saltar escena';
  $('flyUnits').innerHTML = '';
  $('cine').hidden = !o.text;
  if (o.text) cineText(o.text);
  G.sel = new Set();
  closeCtx();
  setMode('move');
  openMap(false);
}
function cineStep(dt) {
  if (!CINE.on) return;
  CINE.t += dt;
  const K = CINE.keys;
  while (CINE.k < K.length && CINE.t >= K[CINE.k].t) {
    const e = K[CINE.k++];
    if (e.text) {
      $('cine').hidden = false;
      cineText(e.text);
    }
    if (e.fn) e.fn();
  }
  if (CINE.tick) CINE.tick(dt);
  if (CINE.k >= K.length && CINE.t >= CINE.dur) cineEnd();
}
function cineEnd() {
  if (!CINE.on) return;
  const f = CINE.onEnd;
  CINE.on = false;
  document.body.classList.remove('cine');
  $('bSkip').hidden = true;
  $('cine').hidden = true;
  $('bSkip').textContent = 'Saltar vuelo';
  if (f) f();
}
function cineCam(rdt) {
  const f = CINE.focus ? CINE.focus() : [camS.tx, camS.tz, 0],
    a = Math.min(1, rdt * 2.2);
  // un punto en el aire aparece más arriba en pantalla que su sitio en el suelo: apunto a donde aparece y lo encuadro un poco por debajo del centro
  const k = f[3] ? 0 : (f[2] || 0) / Math.tan(camS.pitch) + (0.3 * halfH()) / Math.sin(camS.pitch),
    c = [f[0] - Math.sin(camS.yaw) * k, f[1] - Math.cos(camS.yaw) * k];
  camS.tx += (c[0] - camS.tx) * a;
  camS.tz += (c[1] - camS.tz) * a;
  camS.zoomT = clamp((CINE.zoom || 11) * CINE.uz, 4, 30);
  camS.yawT = CINE.yaw0 + CINE.uyaw + CINE.t * CINE.spin;
}
function cineSkip() {
  let n = 0;
  while (CINE.on && !G.over && n++ < 30 * 150) step(1 / 30);
  CHAT.q = [];
}
function goTo(u, x, z) {
  const c = nearestFree(Math.floor(x), Math.floor(z)),
    p = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z);
  u.path = p || [];
  u.order = { type: 'move' };
  u.stance = 'stand';
}

/* Un RPG: una estela de humo desde el lanzador hasta su objetivo y luego lo que haga el impacto */
let RPGS = [];
function fireRPG(from, to, onHit) {
  const R = new T.Group(),
    mk = (mat, sx, sy, sz, z) => {
      const m = new T.Mesh(UBOX, mat);
      m.scale.set(sx, sy, sz);
      m.position.z = z;
      R.add(m);
      return m;
    };
  mk(rkMats.body, 0.09, 0.09, 0.6, -0.05);
  mk(rkMats.head, 0.16, 0.16, 0.24, 0.32);
  mk(rkMats.fin, 0.24, 0.015, 0.08, -0.32);
  mk(rkMats.fin, 0.015, 0.24, 0.08, -0.32);
  const fl = mk(rkMats.flame, 0.12, 0.12, 0.3, -0.5);
  from.face = Math.atan2(to.x - from.x, to.z - from.z);
  from.firing = 0.8;
  from.stance = 'crouch';
  const y0 = (from.elev || 0) + 1.5;
  rpgBackblast(from.x, y0, from.z, from.face);
  rpgSnd(from.x, from.z, false);
  const b = typeof to.pos === 'function' ? to.pos() : [to.x, to.y, to.z];
  R.position.set(from.x, y0, from.z);
  world.add(R);
  const Lt = trL[(trHead = (trHead + 1) % TRL_N)];
  Lt.color.setHex(0xffa040);
  Lt.userData.owner = R;
  RPGS.push({
    m: R,
    fl,
    L: Lt,
    a: [from.x, y0, from.z],
    to,
    t: 0,
    sp: 0,
    dur: Math.max(1.1, Math.hypot(b[0] - from.x, b[1] - y0, b[2] - from.z) / 24),
    onHit
  });
}
function updRPGs(dt) {
  for (let k = RPGS.length - 1; k >= 0; k--) {
    const r = RPGS[k];
    r.t += dt;
    const f = Math.min(1, r.t / r.dur),
      b = typeof r.to.pos === 'function' ? r.to.pos() : [r.to.x, r.to.y, r.to.z];
    const x = r.a[0] + (b[0] - r.a[0]) * f,
      y = r.a[1] + (b[1] - r.a[1]) * f,
      z = r.a[2] + (b[2] - r.a[2]) * f;
    const px = r.m.position.x,
      py = r.m.position.y,
      pz = r.m.position.z;
    r.m.position.set(x, y, z);
    r.m.lookAt(b[0], b[1], b[2]);
    r.m.rotateZ(r.t * 14);
    r.fl.scale.z = 0.25 + rnd() * 0.15;
    // una estela blanca y gruesa a lo largo de todo lo recorrido en este frame, con chispas del motor
    const D = Math.hypot(x - px, y - py, z - pz);
    r.sp += D * 9;
    while (r.sp > 1) {
      r.sp -= 1;
      const q = rnd(),
        sx = px + (x - px) * q,
        sy = py + (y - py) * q,
        sz = pz + (z - pz) * q;
      spawnP(
        sx + rr(-0.06, 0.06),
        sy + rr(-0.06, 0.06),
        sz + rr(-0.06, 0.06),
        rr(-0.3, 0.3),
        rr(0.05, 0.4),
        rr(-0.3, 0.3),
        rr(3.5, 5.5),
        rr(0.3, 0.42),
        rr(1.6, 2.4),
        jit(0xd6d2ca, 0.04),
        0x8a857c,
        1,
        0,
        0
      );
      if (rnd() < 0.4)
        spawnP(
          sx,
          sy,
          sz,
          rr(-1, 1),
          rr(-1, 1),
          rr(-1, 1),
          rr(0.1, 0.2),
          rr(0.2, 0.3),
          0.05,
          pick([0xffe7a0, 0xffc050]),
          0xff6020,
          1,
          1,
          0
        );
    }
    if (r.L && r.L.userData.owner === r.m) {
      r.L.position.set(x, y, z);
      r.L.intensity = (3 + nightF * 3) * (0.85 + rnd() * 0.3);
      r.L.distance = 9 + nightF * 4;
    }
    if (f >= 1) {
      world.remove(r.m);
      RPGS.splice(k, 1);
      if (r.L && r.L.userData.owner === r.m) {
        r.L.intensity = 0;
        r.L.userData.owner = null;
      }
      // la explosión en el aire: un fogonazo, una bola de fuego grande, chispas, una bocanada negra y trozos cayendo
      lightFlash(b[0], b[1], b[2], 0xffa040, 12, 22, 1.1);
      rpgSnd(b[0], b[2], true);
      sfx('boom', b[0], b[2]);
      for (let q = 0; q < 30; q++) {
        const a = rnd() * 6.28,
          s = rr(0.3, 1.6);
        spawnP(
          b[0],
          b[1],
          b[2],
          Math.cos(a) * s,
          rr(-0.4, 1.2),
          Math.sin(a) * s,
          rr(0.4, 0.7),
          rr(1.1, 1.8),
          0.4,
          pick([0xfff6d0, 0xffe7a0, 0xffd060]),
          0xe0601a,
          1,
          1,
          0
        );
      }
      for (let q = 0; q < 90; q++) {
        const a = rnd() * 6.28,
          s = rr(1, 6);
        spawnP(
          b[0],
          b[1],
          b[2],
          Math.cos(a) * s,
          rr(-2, 3),
          Math.sin(a) * s,
          rr(0.3, 0.8),
          rr(0.35, 0.7),
          0.1,
          pick([0xffe7a0, 0xffc050, 0xff9030]),
          0xc0301a,
          1,
          1,
          6
        );
      }
      for (let q = 0; q < 40; q++) {
        const a = rnd() * 6.28,
          s = rr(5, 11);
        spawnP(
          b[0],
          b[1],
          b[2],
          Math.cos(a) * s,
          rr(-3, 4),
          Math.sin(a) * s,
          rr(0.4, 0.9),
          rr(0.05, 0.08),
          0.02,
          pick([0xfff4c0, 0xffe080]),
          0xff6a20,
          1,
          1,
          9
        );
      }
      for (let q = 0; q < 45; q++) {
        const a = rnd() * 6.28,
          s = rr(0.5, 2.4);
        spawnP(
          b[0] + rr(-0.4, 0.4),
          b[1] + rr(-0.3, 0.3),
          b[2] + rr(-0.4, 0.4),
          Math.cos(a) * s,
          rr(-0.2, 1),
          Math.sin(a) * s,
          rr(3, 5.5),
          rr(0.5, 0.8),
          rr(2, 3.2),
          jit(0x26221e, 0.12),
          0x6a6258,
          1,
          0,
          0
        );
      }
      for (let q = 0; q < 16; q++)
        spawnChunk(
          b[0],
          b[1],
          b[2],
          rr(-5, 5),
          rr(-1, 4),
          rr(-5, 5),
          rr(0.06, 0.16),
          pick([0x3a3d33, 0x2a2a26, 0x4a4a44, 0x5a5e50]),
          'flake'
        );
      if (r.onHit) r.onHit();
    }
  }
}
