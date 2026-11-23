/* ====================================================================================================
 * combat/rpg-gunners.js
 *
 * Tiradores de RPG de la milicia: uno de cada veinte. 15 % de acierto y 30 s de recarga; el cohete deja humo y luz y la explosión suelta escombros grandes y pequeños
 * ================================================================================================== */

'use strict';

function rpgEligible(s) {
  if (!s || s.dummy || s.noRpg || window.__noRPG || s.tag === 'rpg' || /técnica/.test(s.name || '')) return false;
  let id = null;
  try {
    id = MIS && MIS.id;
  } catch (e) {}
  if (id === 'tutorial' || id === 'attract') return false;
  return (s.look || 'militia') === 'militia';
}
function rpgThink(u, dt, moving) {
  if (G.m && G.m.noRpgUntil && G.t < G.m.noRpgUntil) {
    u.rpgAim = 0;
    return;
  }
  if (!u.rpgLoaded) {
    if (!u.reloading && G.t >= u.rpgReady - 2.5) {
      if (u.rpgRel) {
        u.rpgLoaded = true;
        u.rpgRel = false;
      } else {
        u.reloading = true;
        u.reloadT = 0;
        reloadSnd(u);
        u.reloadDur = 2.5;
        u.rpgRel = true;
      }
    }
    return;
  }
  const t = u.auto;
  if (u.pinned || u.noFire || !t || !t.alive) {
    u.rpgAim = 0;
    return;
  }
  const d = dist(u, t);
  if (d < 4.5 || d > RANGE + 4) {
    u.rpgAim = 0;
    return;
  }
  if (moving) {
    u.path = [];
    u.vx = u.vz = 0;
    u.nextMove = G.t + 4;
    u.thinkT = 3;
    u.stance = 'crouch';
    return;
  } // un tirador cargado y con objetivo se para a disparar
  u.face = Math.atan2(t.x - u.x, t.z - u.z);
  u.rpgAim = (u.rpgAim || 0) + dt;
  if (u.rpgAim < 1.3) return; // un momento con el tubo al hombro antes del disparo, para que se le vea venir
  u.rpgAim = 0;
  u.rpgLoaded = false;
  u.rpgReady = G.t + 30;
  rpgFire(u, t);
}
const _rq = new T.Vector3();
const rkMats = {
  body: new T.MeshLambertMaterial({ color: 0x3d4232 }),
  head: new T.MeshLambertMaterial({ color: 0x58623e }),
  fin: new T.MeshLambertMaterial({ color: 0x2a2a26 }),
  flame: new T.MeshBasicMaterial({ color: 0xffc860, fog: false })
};
function rpgFire(s, t) {
  const hit = rnd() < 0.15;
  let o = s.m && s.m.gun ? s.m.gun.localToWorld(_rq.set(0, 0.1, 0.6)) : null;
  const ox = o && isFinite(o.x) ? o.x : s.x + Math.sin(s.face) * 0.5,
    oy = o && isFinite(o.y) ? o.y : (s.elev || 0) + 1.45,
    oz = o && isFinite(o.z) ? o.z : s.z + Math.cos(s.face) * 0.5;
  const ty = (t.elev || 0) + (t.stance === 'prone' ? 0.25 : t.stance === 'crouch' ? 0.6 : 0.85);
  let ax, ay, az;
  if (hit) {
    ax = t.x;
    ay = ty;
    az = t.z;
  } else {
    const a = rnd() * Math.PI * 2,
      r = rr(4, 7.5);
    ax = t.x + Math.cos(a) * r;
    az = t.z + Math.sin(a) * r;
    ay = Math.max(0.15, ty + rr(-0.6, 1.4));
  }
  const L = Math.hypot(ax - ox, ay - oy, az - oz) || 1,
    sk = Math.min(1.4, L * 0.5); // la traza empieza pasados los sacos del propio tirador
  let h = traceShot(
      ox + ((ax - ox) / L) * sk,
      oy + ((ay - oy) / L) * sk,
      oz + ((az - oz) / L) * sk,
      ax,
      ay,
      az,
      hit ? 0 : 30
    ),
    direct = null;
  if (hit && (!h || Math.hypot(h.x - ox, h.y - oy, h.z - oz) > L - 0.6)) {
    direct = t;
    h = {
      x: ax,
      y: ay,
      z: az,
      nx: -(ax - ox) / L,
      ny: 0,
      nz: -(az - oz) / L,
      m: -2,
      c: 0x8a7a62,
      e: null,
      dx: (ax - ox) / L,
      dy: (ay - oy) / L,
      dz: (az - oz) / L
    };
  }
  if (!h) {
    const f = (L + 30) / L,
      ex = ox + (ax - ox) * f,
      ez = oz + (az - oz) * f;
    h = {
      x: ex,
      y: 0,
      z: ez,
      nx: 0,
      ny: 1,
      nz: 0,
      m: -1,
      c: groundCol(ex, ez),
      e: null,
      dx: (ax - ox) / L,
      dy: 0,
      dz: (az - oz) / L
    };
  }
  launchRocket(ox, oy, oz, h, s, direct);
  // disparo: fogonazo en la boca y el rebufo levantando polvo y humo detrás del tirador
  s.firing = 0.9;
  s.cool = 1;
  rpgBackblast(ox, oy, oz, s.face);
  rpgSnd(ox, oz, false);
  sfx('ak', ox, oz);
  addNoise(s.x, s.z, 40);
  G.alert = true;
  if (t.team === 'us') {
    t.sup = Math.min(100, t.sup + 30);
    if (G.t - rpgCallT > 5) {
      rpgCallT = G.t;
      const c = us.filter(u => u.alive && !u.npc).sort((p, q) => dist(p, s) - dist(q, s))[0];
      if (c)
        radio(c, pick(['¡RPG!', '¡RPG, RPG!', '¡Cohete! ¡Cubríos!', '¡RPG en el tejado!'].slice(0, s.roof ? 4 : 3)));
      logMsg('¡RPG! Lanzacohetes de la milicia.', 'bad');
    }
  }
}
function rpgBackblast(ox, oy, oz, face) {
  const bx = -Math.sin(face),
    bz = -Math.cos(face),
    rx = ox + bx * 0.9,
    rz = oz + bz * 0.9;
  lightFlash(ox, oy, oz, 0xffc070, 5 + nightF * 3, 9 + nightF * 3, 0.3);
  for (let k = 0; k < 26; k++) {
    const v = rr(2, 6);
    spawnP(
      rx,
      oy - 0.1,
      rz,
      (bx + rr(-0.45, 0.45)) * v,
      rr(-0.3, 0.6) * v * 0.3,
      (bz + rr(-0.45, 0.45)) * v,
      rr(0.15, 0.35),
      rr(0.18, 0.3),
      0.06,
      pick([0xffe7a0, 0xffc050]),
      0xc0501a,
      1,
      1,
      0
    );
  }
  for (let k = 0; k < 44; k++) {
    const v = rr(1, 4.5);
    spawnP(
      rx,
      Math.max(0.1, oy - 0.3),
      rz,
      (bx + rr(-0.7, 0.7)) * v,
      rr(0, 0.5) * v,
      (bz + rr(-0.7, 0.7)) * v,
      rr(1.4, 3),
      rr(0.2, 0.35),
      rr(0.9, 1.6),
      jit(0xbcae94, 0.06),
      0xd2c8b4,
      rr(0.6, 0.9),
      0,
      0
    );
  }
}
// un cohete en vuelo desde (ox,oy,oz) hasta el impacto h; un disparo con guion puede apuntar a cualquier sitio (rozando un helicóptero, por ejemplo) y revienta en lo que haya detrás
function rocketAt(ox, oy, oz, tx, ty, tz, src) {
  const L = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
  let h = traceShot(ox + ((tx - ox) / L) * 1.4, oy + ((ty - oy) / L) * 1.4, oz + ((tz - oz) / L) * 1.4, tx, ty, tz, 60);
  if (!h) {
    const f = (L + 60) / L,
      ex = ox + (tx - ox) * f,
      ez = oz + (tz - oz) * f;
    h = {
      x: ex,
      y: 0,
      z: ez,
      nx: 0,
      ny: 1,
      nz: 0,
      m: -1,
      c: groundCol(ex, ez),
      e: null,
      dx: (tx - ox) / L,
      dy: 0,
      dz: (tz - oz) / L
    };
  }
  launchRocket(ox, oy, oz, h, src || null, null);
  rpgBackblast(ox, oy, oz, Math.atan2(tx - ox, tz - oz));
  rpgSnd(ox, oz, false);
}
function launchRocket(ox, oy, oz, h, s, direct) {
  const R = new T.Group(),
    mk = (mat, sx, sy, sz, z) => {
      const m = new T.Mesh(UBOX, mat);
      m.scale.set(sx, sy, sz);
      m.position.z = z;
      R.add(m);
      return m;
    };
  // el cohete PG-7 de verdad (el modelo subido, solo el cohete); si todavía no ha cargado, el de cajas de siempre
  const RK = MODELS.u_rocket;
  if (RK && RK.ready) {
    const m = new T.Mesh(RK.geos.m, RK.mat);
    m.castShadow = true;
    R.add(m);
  } else {
    mk(rkMats.body, 0.06, 0.06, 0.42, -0.05);
    mk(rkMats.head, 0.11, 0.11, 0.17, 0.24);
    mk(rkMats.head, 0.05, 0.05, 0.08, 0.36);
    mk(rkMats.fin, 0.16, 0.01, 0.06, -0.24);
    mk(rkMats.fin, 0.01, 0.16, 0.06, -0.24);
  }
  const fl = mk(rkMats.flame, 0.07, 0.07, 0.16, -0.36);
  R.position.set(ox, oy, oz);
  R.lookAt(h.x, h.y, h.z);
  world.add(R);
  const D = Math.hypot(h.x - ox, h.y - oy, h.z - oz),
    Lt = trL[(trHead = (trHead + 1) % TRL_N)];
  Lt.color.setHex(0xffa040);
  Lt.userData.owner = R;
  ROCKETS.push({ R, fl, L: Lt, a: [ox, oy, oz], h, t: 0, dur: Math.max(0.12, D / 30), D, src: s, direct, sp: 0 });
}
function updRockets(dt) {
  for (let k = ROCKETS.length - 1; k >= 0; k--) {
    const r = ROCKETS[k];
    r.t += dt;
    const f = Math.min(1, r.t / r.dur),
      h = r.h;
    const x = r.a[0] + (h.x - r.a[0]) * f,
      y = r.a[1] + (h.y - r.a[1]) * f,
      z = r.a[2] + (h.z - r.a[2]) * f;
    r.R.position.set(x, y, z);
    r.R.rotateZ(dt * 14);
    r.fl.scale.z = 0.12 + rnd() * 0.1;
    r.fl.scale.x = r.fl.scale.y = 0.06 + rnd() * 0.03;
    // estela de humo: una cinta gruesa justo detrás, que se adelgaza y se va al envejecer
    r.sp += dt * 170;
    const dx = (h.x - r.a[0]) / r.D,
      dy = (h.y - r.a[1]) / r.D,
      dz = (h.z - r.a[2]) / r.D;
    while (r.sp > 1) {
      r.sp -= 1;
      const b = rnd() * dt * 30,
        px = x - dx * (0.35 + b),
        py = y - dy * (0.35 + b),
        pz = z - dz * (0.35 + b);
      spawnP(
        px + rr(-0.04, 0.04),
        py + rr(-0.04, 0.04),
        pz + rr(-0.04, 0.04),
        rr(-0.25, 0.25),
        rr(0.05, 0.35),
        rr(-0.25, 0.25),
        rr(3, 5),
        rr(0.22, 0.3),
        rr(1.3, 1.9),
        jit(0xa8a49c, 0.04),
        0x84807a,
        1,
        0,
        0
      );
      if (rnd() < 0.35)
        spawnP(
          px,
          py,
          pz,
          -dx * 2 + rr(-0.3, 0.3),
          -dy * 2 + rr(-0.3, 0.3),
          -dz * 2 + rr(-0.3, 0.3),
          rr(0.08, 0.16),
          rr(0.12, 0.2),
          0.04,
          pick([0xffe7a0, 0xffc050]),
          0xff6020,
          1,
          1,
          0
        );
    }
    if (r.L.userData.owner === r.R) {
      r.L.position.set(x, y + 0.15, z);
      r.L.intensity = (2.6 + nightF * 3.4) * (0.85 + rnd() * 0.3);
      r.L.distance = 6 + nightF * 4;
    }
    if (f >= 1) {
      if (r.L.userData.owner === r.R) {
        r.L.intensity = 0;
        r.L.userData.owner = null;
      }
      world.remove(r.R);
      ROCKETS.splice(k, 1);
      rpgBlast(r.h, r.src, r.direct, r.big);
      if (r.big) bigBlast(r.h);
    }
  }
}
function rpgBlast(h, src, direct, big) {
  blastCover(h.x, h.z, 1.7);
  if (h.m >= 0 && h.e) {
    if (!big) wallBlast(h);
  } else blastRubble(h.x, h.z, 8);
  const nx = h.nx,
    ny = h.ny,
    nz = h.nz,
    col = h.c == null ? 0xb0a080 : h.c,
    wall = h.m >= 0,
    brick = wall && h.m === M.BRICK;
  if (wall) {
    if (!big) scorch(h, rr(1.6, 2.1));
  } else scorchAround(h.x, 0.03, h.z, rr(1.8, 2.4));
  const px = h.x + nx * 0.12,
    py = Math.max(0.05, h.y + ny * 0.12),
    pz = h.z + nz * 0.12;
  lightFlash(px, py + 0.6, pz, 0xffa040, 6 + nightF * 6, 10 + nightF * 6, 1.0);
  lightFlash(px, py + 0.4, pz, 0xfff2c8, 5, 5.5, 0.18);
  rpgSnd(px, pz, true);
  sfx('boom', px, pz);
  addNoise(px, pz, 50);
  const dir = (s, up) => {
    let a = nx + rr(-1, 1) * s,
      b = ny + rr(-0.2, 1) * s + (up || 0),
      c = nz + rr(-1, 1) * s;
    const l = Math.hypot(a, b, c) || 1;
    return [a / l, b / l, c / l];
  };
  // bola de fuego y chispas
  for (let k = 0; k < 26; k++) {
    const [a, b, c] = dir(0.7, 0.3),
      v = rr(0.3, 1.6);
    spawnP(
      px,
      py + 0.2,
      pz,
      a * v,
      b * v + 0.4,
      c * v,
      rr(0.35, 0.6),
      rr(0.9, 1.5),
      0.35,
      pick([0xfff6d0, 0xffe7a0, 0xffd060]),
      0xe0601a,
      1,
      1,
      0
    );
  }
  for (let k = 0; k < 80; k++) {
    const [a, b, c] = dir(0.9, 0.2),
      v = rr(1.2, 5.5);
    spawnP(
      px,
      py,
      pz,
      a * v,
      b * v,
      c * v,
      rr(0.3, 0.8),
      rr(0.45, 0.9),
      0.15,
      pick([0xfff2c0, 0xffe7a0, 0xffc050, 0xff9030]),
      pick([0xc0301a, 0x8a2010]),
      1,
      1,
      0
    );
  }
  for (let k = 0; k < 45; k++) {
    const [a, b, c] = dir(1.1, 0.3),
      v = rr(5, 11);
    spawnP(
      px,
      py,
      pz,
      a * v,
      b * v,
      c * v,
      rr(0.35, 0.9),
      rr(0.04, 0.07),
      0.02,
      pick([0xfff4c0, 0xffe080]),
      0xff6a20,
      1,
      1,
      9
    );
  }
  // una nube oscura que rueda y luego el polvo lanzado por el suelo o desde la pared
  for (let k = 0; k < 70; k++) {
    const [a, b, c] = dir(1, 0.5),
      v = rr(0.4, 2.2);
    spawnP(
      px + rr(-0.3, 0.3),
      py + rr(0, 0.4),
      pz + rr(-0.3, 0.3),
      a * v,
      b * v + rr(0.3, 1),
      c * v,
      rr(3, 6.5),
      rr(0.35, 0.6),
      rr(1.6, 2.8),
      jit(0x26221e, 0.12),
      0x6a6258,
      rr(0.8, 1),
      0,
      0
    );
  }
  const dc = brick ? 0xb08060 : shade(col, 1.12);
  for (let k = 0; k < 50; k++) {
    const a = rnd() * 6.28,
      v = rr(2.5, 6);
    spawnP(
      wall ? px : px + Math.cos(a) * 0.3,
      wall ? py + rr(-0.4, 0.4) : 0.15,
      wall ? pz : pz + Math.sin(a) * 0.3,
      wall ? (nx + rr(-0.8, 0.8)) * v : Math.cos(a) * v,
      wall ? rr(-0.5, 1) * v * 0.4 : rr(0.1, 0.6),
      wall ? (nz + rr(-0.8, 0.8)) * v : Math.sin(a) * v,
      rr(1.6, 3.2),
      rr(0.25, 0.4),
      rr(1.1, 2),
      jit(dc, 0.06),
      shade(dc, 1.06),
      rr(0.6, 0.85),
      0,
      0
    );
  }
  // escombros: unos pocos terrones grandes y una lluvia de trocitos, de lo que haya alcanzado
  const cc = () => (brick || (wall && rnd() < 0.2) ? jit(0xa0644a, 0.1) : jit(shade(col, rr(0.75, 1)), 0.1));
  for (let k = 0; k < 14; k++) {
    const [a, b, c] = dir(0.9, 0.4),
      v = rr(3, 7.5);
    spawnChunk(px, py, pz, a * v, b * v + rr(1, 3), c * v, rr(0.13, 0.3), cc());
  }
  for (let k = 0; k < 45; k++) {
    const [a, b, c] = dir(1.1, 0.5),
      v = rr(3, 10);
    spawnChunk(px, py, pz, a * v, b * v + rr(1, 4), c * v, rr(0.035, 0.08), cc(), rnd() < 0.3 ? 'flake' : null);
  }
  if (h.m === M.WOOD)
    for (let k = 0; k < 12; k++) {
      const [a, b, c] = dir(1, 0.4),
        v = rr(3, 8);
      spawnChunk(px, py, pz, a * v, b * v + 2, c * v, rr(0.06, 0.12), jit(shade(col, 1.1), 0.1), 'splinter');
    }
  if (h.m === M.GLASS || h.m === M.METAL || h.m === M.TIN)
    for (let k = 0; k < 16; k++) {
      const [a, b, c] = dir(1, 0.4),
        v = rr(3, 8);
      spawnChunk(px, py, pz, a * v, b * v + 2, c * v, rr(0.05, 0.1), jit(shade(col, 1.05), 0.1), 'flake');
    }
  // quemadura: una mancha negra en el suelo, una marca de cráter quemado en una pared
  if (wall) {
    if (!big) {
      decal(h, 0x2a2420, 0.9);
      decal(h, 0x3a322a, 0.55);
      decal(h, shade(col, 0.5), 0.35);
    }
  } else {
    const sc = new T.Mesh(
      new T.CircleGeometry(1.4, 12),
      new T.MeshBasicMaterial({ color: 0x221d18, transparent: true, opacity: 0.72, depthWrite: false })
    );
    sc.rotation.x = -Math.PI / 2;
    sc.position.set(px, 0.03 + rnd() * 0.004, pz);
    world.add(sc);
    decal({ x: px, y: 0, z: pz, nx: 0, ny: 1, nz: 0, e: null }, 0x18140f, 1.1);
  }
  emitters.push({
    x: px,
    z: pz,
    y: Math.max(0.2, py - 0.2),
    rate: 16,
    life: 4.5,
    vy: 0.9,
    s0: 0.3,
    s1: 1.6,
    fire: rnd() < 0.35 && !wall ? 0.35 : 0,
    acc: 0,
    sp: 0.6,
    until: G.t + (wall ? 5 : 9)
  });
  // efecto en la gente: el que recibe el impacto, todos los de la explosión y supresión alrededor
  for (const u of units) {
    if (!u.alive) continue;
    const d = Math.hypot(u.x - px, u.z - pz, ((u.elev || 0) + 0.7 - py) * 0.8);
    if (u === direct) {
      u.sup = 100;
      damage(u, 120 + rnd() * 30, src);
      continue;
    }
    if (big) continue; // el cohete del tirador lejano tira a la gente al suelo (bigBlast), no la hiere
    if (d < 7) {
      u.sup = Math.min(100, u.sup + 75 * (1 - d / 7));
      u.flinchT = Math.max(u.flinchT || 0, 0.8);
    }
    if (d < 1.9 && !(u.inB && d > 1)) {
      const pr = coverProt(u, px, pz);
      damage(u, (48 * (1 - d / 1.9) + 8) * (1 - pr.v * 0.6) * (u.stance === 'stand' ? 1 : 0.7), src);
    }
  }
  for (let j = Math.floor(pz) - 3; j <= Math.floor(pz) + 3; j++)
    for (let i = Math.floor(px) - 3; i <= Math.floor(px) + 3; i++) {
      if (!inB(i, j)) continue;
      const o = cov[idx(i, j)];
      if (o && o.kind === 'barrel' && Math.hypot(o.i + 0.5 - px, o.j + 0.5 - pz) < 2.4) {
        const oo = o;
        sched.push({
          at: G.t + 0.3,
          fn: () => {
            if (cov[oo.cells[0]] === oo) breakBarrel(oo);
          }
        });
      }
    }
}
