/* ====================================================================================================
 * combat/air-support.js
 *
 * Ruido: disparos y explosiones que hacen correr a los civiles
 * ================================================================================================== */

'use strict';

function addNoise(x, z, r) {
  if (!G) return;
  G.noise.push({ x, z, r: r || 22, t: G.t });
  if (G.noise.length > 40) G.noise.shift();
}

/* ----------------------------------------------------------------------------------------------------
 * Apoyo aéreo: pasadas de tiro de los Little Birds y bengalas de iluminación
 * -------------------------------------------------------------------------------------------------- */
let SUP = null;
const LB_SPEED = 28,
  LB_PASS = 11,
  LB_LEN = 33.3,
  LB_HW = 5,
  FLARE_R = 66,
  LB_CD = 40,
  FL_CD = 8; // la pasada: como mucho 50 m de largo y 15 m de ancho, volando despacio
function lbClamp(a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    L = Math.hypot(dx, dz);
  return L > LB_LEN ? [a[0] + (dx / L) * LB_LEN, a[1] + (dz / L) * LB_LEN] : b;
}
const flareL = [];
for (let k = 0; k < 2; k++) {
  const L = new T.PointLight(0xeef2ff, 0, FLARE_R, 1.1);
  scene.add(L);
  flareL.push(L);
}
function glowTex(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'),
    g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}
const FLARE_GLOW = new T.SpriteMaterial({
  map: glowTex([
    [0, 'rgba(255,255,255,1)'],
    [0.18, 'rgba(255,252,236,.85)'],
    [0.45, 'rgba(255,240,210,.25)'],
    [1, 'rgba(255,230,200,0)']
  ]),
  transparent: true,
  depthWrite: false,
  blending: T.AdditiveBlending,
  fog: false
});
const FLARE_CORE = new T.SpriteMaterial({
  map: glowTex([
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,1)'],
    [1, 'rgba(255,255,255,0)']
  ]),
  transparent: true,
  depthWrite: false,
  fog: false
});
function resetSupport() {
  SUP = { lbN: 3, lbCd: 0, flN: 4, flCd: 0, runs: [], rockets: [], flares: [], lbA: null, draft: null };
  updSupBtns();
}
function updSupBtns() {
  if (!SUP || !$('oLB')) return;
  const lbOk = SUP.lbN > 0 && SUP.lbCd <= 0,
    flOk = SUP.flN > 0 && SUP.flCd <= 0 && nightF > 0.25;
  $('oLB').querySelector('em').textContent = SUP.lbCd > 0 && SUP.lbN > 0 ? Math.ceil(SUP.lbCd) + 's' : '×' + SUP.lbN;
  $('oFlr').querySelector('em').textContent =
    nightF <= 0.25 ? L('noche') : SUP.flCd > 0 && SUP.flN > 0 ? Math.ceil(SUP.flCd) + 's' : '×' + SUP.flN;
  $('oLB').classList.toggle('off', !lbOk);
  $('oFlr').classList.toggle('off', !flOk);
  $('oSupport').classList.toggle('ready', lbOk || flOk);
  if ($('oNV')) {
    $('oNV').classList.toggle('off', !us.some(u => u.alive && u.look === 'delta') || nightF <= 0.25);
    if (G.nv && nightF <= 0.25) setNV(false);
  }
}
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    L2 = dx * dx + dz * dz || 1,
    t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1);
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
};
function compass(dx, dz) {
  const ang = (Math.atan2(dx, -dz) * 180) / Math.PI,
    n = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  return n[((Math.round(ang / 45) % 8) + 8) % 8];
}
function callLB(a, b) {
  if (!SUP || SUP.lbN <= 0) {
    hint('No quedan pasadas de Little Bird');
    return false;
  }
  if (SUP.lbCd > 0) {
    hint('Star 4-2 está rearmando: ' + Math.ceil(SUP.lbCd) + ' s');
    return false;
  }
  let dx = b[0] - a[0],
    dz = b[1] - a[1],
    L = Math.hypot(dx, dz);
  if (L < 5) {
    hint('Traza una línea más larga: la pasada va de un punto a otro');
    return false;
  }
  if (SUP.dry && G.m.buoys) {
    const B = G.m.buoys.map(o => [o.position.x, o.position.z]),
      nr = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 4.5;
    if (!((nr(a, B[0]) && nr(b, B[1])) || (nr(a, B[1]) && nr(b, B[0])))) {
      SUP.lbA = null;
      hint('La pasada tiene que ir de una boya a la otra: toca una boya amarilla y después la otra.');
      if (G.m.bch && G.t > (G.m.lbMiss || 0)) {
        G.m.lbMiss = G.t + 8;
        tzSay(G.m.bch.sgt, 'Casi. De boya a boya: empezad en una y terminad en la otra.');
      }
      return false;
    }
  }
  dx /= L;
  dz /= L;
  if (L > LB_LEN) {
    L = LB_LEN;
    b = [a[0] + dx * L, a[1] + dz * L];
  }
  SUP.lbN--;
  SUP.lbCd = SUP.dry ? 6 : LB_CD;
  const S = [a[0] - dx * 110, a[1] - dz * 110],
    E = [b[0] + dx * 110, b[1] + dz * 110];
  const lb = littleBird();
  world.add(lb.g);
  lb.g.visible = false;
  SUP.runs.push({
    a,
    b,
    d: [dx, dz],
    L,
    pts: [S, a, b, E],
    cum: [0, 110, 110 + L, 220 + L],
    s: 0,
    delay: 1,
    lb,
    fireAcc: 0,
    rk: 0,
    sup: false,
    hit: new Set(),
    x: S[0],
    z: S[1],
    alt: 22,
    dry: !!SUP.dry
  });
  radio(
    leader(),
    SUP.dry
      ? 'Star 4-2, pasada en seco de boya a boya. Sin munición.'
      : 'Star 4-2, pasada de fuego sobre la línea marcada. ¡Cabezas abajo!'
  );
  sched.push({
    at: G.t + 1.4,
    fn: () => logMsg('Star 4-2: recibido, entro desde el ' + compass(-dx, -dz) + '. En camino.', 'us')
  });
  updSupBtns();
  return true;
}
function lbShot(r, x, y, z) {
  const p = clamp(r.s - r.cum[1] + 9 + rr(-1.6, 1.6), 0, r.L),
    lat = rr(-LB_HW, LB_HW);
  let tx = r.a[0] + r.d[0] * p - r.d[1] * lat,
    tz = r.a[1] + r.d[1] * p + r.d[0] * lat;
  if (r.roofB && r.roofB.length) {
    const B_ = r.roofB
      .slice()
      .sort(
        (q, w) =>
          Math.hypot(q.x + q.w / 2 - tx, q.y + q.d / 2 - tz) - Math.hypot(w.x + w.w / 2 - tx, w.y + w.d / 2 - tz)
      )[0];
    tx = B_.x + rr(0.3, B_.w - 0.3);
    tz = B_.y + rr(0.3, B_.d - 0.3);
  }
  const i = Math.floor(tx),
    j = Math.floor(tz),
    roof = inB(i, j) && grid[idx(i, j)] === 1,
    ty = roof ? topH[idx(i, j)] : 0.04;
  const side = ((r.fireAcc * 7) | 0) % 2 ? -1 : 1,
    gx = x - r.d[1] * side * 0.8 + r.d[0] * 0.7,
    gz = z + r.d[0] * side * 0.8 + r.d[1] * 0.7,
    gy = y - 0.45;
  tracer(gx, gy, gz, tx, ty, tz, 0xffb24a, 0);
  sched.push({ at: G.t + Math.hypot(tx - gx, ty - gy, tz - gz) / 65, fn: () => lbImpact(tx, ty, tz, roof) });
  sfx('mini', gx, gz);
}
function lbImpact(x, y, z, roof) {
  const c0 = roof ? 0xc8c0b0 : 0xbcaa88;
  for (let k = 0; k < 4; k++)
    spawnP(
      x + rr(-0.15, 0.15),
      y + 0.03,
      z + rr(-0.15, 0.15),
      rr(-0.7, 0.7),
      rr(0.8, 2.4),
      rr(-0.7, 0.7),
      rr(0.5, 1.1),
      rr(0.08, 0.14),
      rr(0.35, 0.65),
      c0,
      0xd6caae,
      rr(0.6, 0.9),
      0,
      2
    );
  if (rnd() < 0.35)
    for (let k = 0; k < 3; k++)
      spawnP(x, y + 0.1, z, rr(-2, 2), rr(1, 3), rr(-2, 2), rr(0.15, 0.3), 0.05, 0.03, 0xffe0a0, 0xff9040, 1, 1, 9);
  if (rnd() < 0.25)
    spawnChunk(
      x,
      y + 0.1,
      z,
      rr(-1.5, 1.5),
      rr(1.5, 3),
      rr(-1.5, 1.5),
      rr(0.03, 0.07),
      roof ? 0xb4aa98 : 0x8a7a62,
      'chip'
    );
  addNoise(x, z, 30);
  if (roof) {
    for (const u of units) {
      if (u.alive && u.inB && u.inB.level === 'roof' && Math.hypot(u.x - x, u.z - z) < 1.1 && rnd() < 0.3)
        damage(u, 30 + rnd() * 30, null);
    }
    return;
  }
  for (const u of units) {
    if (!u.alive || u.inB) continue;
    const d = Math.hypot(u.x - x, u.z - z);
    if (d > 1.15) continue;
    if (rnd() < (u.stance === 'prone' ? 0.3 : 0.55)) damage(u, (u.team === 'them' ? 45 : 32) + rnd() * 35, null);
  }
}
function lbRocket(r, x, y, z, side) {
  const p = clamp(r.s - r.cum[1] + 15 + rr(-2, 2), 0, r.L),
    tx = r.a[0] + r.d[0] * p + r.d[1] * side * rr(0, LB_HW * 0.8),
    tz = r.a[1] + r.d[1] * p - r.d[0] * side * rr(0, LB_HW * 0.8);
  const gx = x - r.d[1] * side * 0.9,
    gz = z + r.d[0] * side * 0.9,
    gy = y - 0.4;
  const m = new T.Mesh(UBOX, trM(0xfff2c8));
  m.scale.set(0.12, 0.12, 0.5);
  world.add(m);
  SUP.rockets.push({
    x: gx,
    y: gy,
    z: gz,
    tx,
    ty: 0.2,
    tz,
    t: 0,
    T: Math.hypot(tx - gx, gy, tz - gz) / 55,
    sx: gx,
    sy: gy,
    sz: gz,
    m
  });
  sfx('boom', gx, gz);
}
function rocketHit(x, z) {
  boom(x, z);
  sfx('boom', x, z);
  addNoise(x, z, 40);
  for (const u of units) {
    if (!u.alive) continue;
    const d = Math.hypot(u.x - x, u.z - z);
    if (d > 6) continue;
    u.sup = Math.min(100, u.sup + 85 * (1 - d / 6));
    if (d < 2.3 && !(u.inB && u.inB.level === 'ground')) damage(u, 85 * (1 - d / 2.3) + 20, null);
  }
  for (let j = Math.floor(z) - 2; j <= Math.floor(z) + 2; j++)
    for (let i = Math.floor(x) - 2; i <= Math.floor(x) + 2; i++) {
      if (!inB(i, j)) continue;
      const o = cov[idx(i, j)];
      if (o && o.kind === 'barrel' && cov[o.cells[0]] === o) breakBarrel(o);
    }
}
function updRuns(dt) {
  if (!SUP) return;
  SUP.lbCd = Math.max(0, SUP.lbCd - dt);
  SUP.flCd = Math.max(0, SUP.flCd - dt);
  for (let k = SUP.runs.length - 1; k >= 0; k--) {
    const r = SUP.runs[k];
    if (r.delay > 0) {
      r.delay -= dt;
      if (r.delay > 0) continue;
      r.lb.g.visible = true;
    }
    r.s += LB_PASS * dt; // una sola velocidad para toda la pasada: entrada, sobre la franja y salida
    if (r.s >= r.cum[3]) {
      world.remove(r.lb.g);
      SUP.runs.splice(k, 1);
      continue;
    }
    const seg = r.s < r.cum[1] ? 0 : r.s < r.cum[2] ? 1 : 2,
      f = (r.s - r.cum[seg]) / (r.cum[seg + 1] - r.cum[seg] || 1),
      A = r.pts[seg],
      Bp = r.pts[seg + 1];
    const x = A[0] + (Bp[0] - A[0]) * f,
      z = A[1] + (Bp[1] - A[1]) * f;
    const toA = r.cum[1] - r.s,
      fromB = r.s - r.cum[2];
    let alt = 6.5;
    if (toA > 0) alt = 6.5 + Math.min(1, toA / 80) * 15;
    else if (fromB > 0) alt = 6.5 + Math.min(1, fromB / 90) * 18;
    r.x = x;
    r.z = z;
    r.alt = alt;
    r.lb.g.position.set(x, alt, z);
    r.lb.g.rotation.set(toA > 0 && toA < 80 ? 0.14 : fromB > 0 ? -0.08 : 0.1, Math.atan2(r.d[0], r.d[1]), 0, 'YXZ');
    r.lb.rotor.rotation.y += dt * 32;
    if (r.lb.tail) r.lb.tail.rotation.x += dt * 55;
    const inPass = r.s > r.cum[1] - 12 && r.s < r.cum[2] - 5;
    if (r.dry && !r.said && r.s > r.cum[2] + 10) {
      r.said = true;
      say('Star 4-2', 'Ataque completado. Pasada sobre las boyas, sin un disparo. Star 4-2 se retira.', 'air', true);
      if (G.m) G.m.lbDone = true;
    }
    if (inPass && !r.dry) {
      r.fireAcc += dt * 38;
      while (r.fireAcc > 1) {
        r.fireAcc -= 1;
        lbShot(r, x, alt, z);
      }
      // todo el que está dentro de la franja marcada muere cuando pasa el fuego: amigo o enemigo, al descubierto o bajo techo
      const sweep = r.s - r.cum[1] + 9;
      for (const u of units) {
        if (!u.alive || r.hit.has(u)) continue;
        const qx = u.x - r.a[0],
          qz = u.z - r.a[1],
          t = qx * r.d[0] + qz * r.d[1],
          lat = Math.abs(qx * r.d[1] - qz * r.d[0]);
        if (t < -0.5 || t > r.L + 0.5 || lat > LB_HW || t > sweep || (r.only && !r.only.has(u))) continue;
        r.hit.add(u);
        damage(u, 9999, null);
      }
      if (r.rk < Math.ceil(r.L / 11) && r.s > r.cum[1] - 10 + r.rk * 11) {
        r.rk++;
        lbRocket(r, x, alt, z, -1);
        lbRocket(r, x, alt, z, 1);
      }
      if (!r.sup && !r.only) {
        r.sup = true;
        for (const u of units) {
          if (!u.alive) continue;
          if (segDist(u.x, u.z, r.a, r.b) < LB_HW + 6) u.sup = Math.min(100, u.sup + (u.team === 'them' ? 70 : 30));
        }
        if (rnd() < 0.7)
          sched.push({ at: G.t + 2.5, fn: () => logMsg('Star 4-2: ¡fuera! Saliendo de la pasada.', 'us') });
      }
    }
  }
  for (let k = SUP.rockets.length - 1; k >= 0; k--) {
    const q = SUP.rockets[k];
    q.t += dt;
    const u = Math.min(1, q.t / q.T);
    const nx = q.sx + (q.tx - q.sx) * u,
      ny = q.sy + (q.ty - q.sy) * u,
      nz = q.sz + (q.tz - q.sz) * u;
    q.m.position.set(nx, ny, nz);
    q.m.lookAt(q.tx, q.ty, q.tz);
    spawnP(
      nx,
      ny,
      nz,
      rr(-0.2, 0.2),
      rr(0.1, 0.5),
      rr(-0.2, 0.2),
      rr(0.8, 1.6),
      0.12,
      rr(0.5, 0.9),
      0xd8d4cc,
      0xa8a49c,
      0.7,
      0,
      0
    );
    if (u >= 1) {
      world.remove(q.m);
      SUP.rockets.splice(k, 1);
      rocketHit(q.tx, q.tz);
    }
  }
  updFlares(dt);
}
function callFlare(x, z) {
  if (!SUP || SUP.flN <= 0) {
    hint('No quedan bengalas');
    return false;
  }
  if (nightF <= 0.25) {
    hint('Las bengalas solo están disponibles de noche');
    return false;
  }
  if (SUP.flCd > 0) {
    hint('Siguiente bengala en ' + Math.ceil(SUP.flCd) + ' s');
    return false;
  }
  SUP.flN--;
  SUP.flCd = FL_CD;
  radio(leader(), 'Pido iluminación sobre la zona marcada.');
  sched.push({
    at: G.t + 2.2,
    fn: () => {
      const sp = new T.Sprite(FLARE_GLOW),
        core = new T.Sprite(FLARE_CORE);
      sp.scale.set(3.4, 3.4, 1);
      core.scale.set(0.55, 0.55, 1);
      world.add(sp);
      world.add(core);
      const F_ = {
        x: x + rr(-2, 2),
        y: SUP.dry ? 17 : 30,
        z: z + rr(-2, 2),
        t: 0,
        sp,
        core,
        vx: rr(-0.25, 0.25),
        vz: rr(-0.25, 0.25),
        acc: 0,
        lit: 0
      };
      if (coastS(F_.x, F_.z) > 1) {
        const rg = new T.Group();
        world.add(rg);
        REFL.push(rg);
        F_.rg = rg;
        F_.rs = new T.Sprite(FLARE_GLOW);
        F_.rc = new T.Sprite(FLARE_CORE);
        F_.rs.scale.set(3.4, 3.4, 1);
        F_.rc.scale.set(0.55, 0.55, 1);
        rg.add(F_.rs);
        rg.add(F_.rc);
        F_.gl = new T.Mesh(
          new T.PlaneGeometry(1, 1),
          new T.MeshBasicMaterial({
            map: FLARE_GLOW.map,
            transparent: true,
            depthWrite: false,
            blending: T.AdditiveBlending,
            opacity: 0,
            color: 0xfff2d8
          })
        );
        F_.gl.rotation.order = 'YXZ';
        F_.gl.renderOrder = 3;
        world.add(F_.gl);
      }
      SUP.flares.push(F_);
      lightFlash(x, 30, z, 0xffffff, 6, 60, 0.4);
      logMsg('Bengala en el aire.', 'us');
      updSupBtns();
    }
  });
  updSupBtns();
  return true;
}
function updFlares(dt) {
  for (let k = SUP.flares.length - 1; k >= 0; k--) {
    const f = SUP.flares[k];
    f.t += dt;
    const w = windAt(ambT);
    f.y -= (f.fall || 0.6) * dt;
    f.x += (f.vx + w * 0.3) * dt;
    f.z += f.vz * dt + Math.sin(f.t * 0.7) * 0.12 * dt;
    f.lit = Math.min(1, f.t * 2) * clamp(f.y / 3, 0, 1) * (0.88 + 0.12 * Math.sin(f.t * 23) * Math.sin(f.t * 7.3));
    f.sp.position.set(f.x, f.y, f.z);
    f.core.position.set(f.x, f.y, f.z);
    f.sp.material.opacity = f.lit;
    if (f.rg) {
      f.rs.position.set(f.x, f.y, f.z);
      f.rc.position.set(f.x, f.y, f.z);
      // el brillo sobre el oleaje: bajo la bengala, alargado hacia el ojo y titilando
      const k = f.y / Math.tan(camS.pitch),
        tx = -Math.sin(camS.yaw),
        tz = -Math.cos(camS.yaw),
        s0 = 1.5,
        s1 = k + 4 + f.y * 0.2; // desde un poco más allá del punto que tiene debajo hasta pasada su imagen reflejada
      f.gl.position.set(f.x + (tx * (s0 + s1)) / 2, 0.07, f.z + (tz * (s0 + s1)) / 2);
      f.gl.rotation.set(-Math.PI / 2, camS.yaw, 0);
      f.gl.scale.set(2.2 + f.y * 0.05, s1 - s0, 1);
      f.gl.material.opacity = Math.min(
        1,
        f.lit * (0.5 + 0.9 * nightF) * (0.6 + 0.25 * Math.sin(f.t * 9.1) + 0.15 * Math.sin(f.t * 23.7))
      );
    }
    // el rastro de humo que deja encima mientras baja, y unas pocas chispas goteando
    f.acc += dt * 12;
    while (f.acc > 1) {
      f.acc -= 1;
      spawnP(
        f.x + rr(-0.08, 0.08),
        f.y + 0.25,
        f.z + rr(-0.08, 0.08),
        rr(-0.08, 0.08) + w * 0.25,
        rr(0.02, 0.18),
        rr(-0.08, 0.08),
        rr(5, 8),
        0.12,
        rr(1, 1.8),
        0xe8e8e2,
        0xa8a8a2,
        0.4,
        0,
        0
      );
    }
    if (rnd() < dt * 14)
      spawnP(
        f.x,
        f.y - 0.1,
        f.z,
        rr(-0.5, 0.5),
        rr(-1, -0.3),
        rr(-0.5, 0.5),
        rr(0.3, 0.7),
        0.05,
        0.02,
        0xffffff,
        0xfff0c0,
        1,
        1,
        4
      );
    if (f.y <= 0.4) {
      world.remove(f.sp);
      world.remove(f.core);
      if (f.rg) {
        world.remove(f.rg);
        world.remove(f.gl);
        f.gl.geometry.dispose();
        f.gl.material.dispose();
      }
      SUP.flares.splice(k, 1);
    }
  }
}
function updFlareLights(now) {
  const fl = SUP
    ? SUP.flares
        .slice()
        .sort((a, b) => Math.hypot(a.x - camS.tx, a.z - camS.tz) - Math.hypot(b.x - camS.tx, b.z - camS.tz))
    : [];
  flareL.forEach((L, k) => {
    const f = fl[k];
    if (!f) {
      L.intensity = 0;
      return;
    }
    L.position.set(f.x, f.y, f.z);
    L.intensity = 2.1 * f.lit * (0.35 + 0.65 * nightF);
  });
}
/* Rebufo del rotor: un anillo de polvo que sale despedido bajo un helicóptero que vuela bajo */
function rotorWash(x, z, alt, dt, k) {
  if (alt > 24 || dt <= 0) return;
  washLvl = Math.max(washLvl, (1 - alt / 24) * (k || 1) * Math.max(0, 1 - Math.hypot(x - camS.tx, z - camS.tz) / 42));
  const s = (1 - alt / 24) * (k || 1),
    wet = coastS(x, z) > -2,
    n = Math.floor(s * dt * 70 + rnd());
  for (let q = 0; q < n; q++) {
    const a = rnd() * 6.283,
      r0 = rr(1.0, 3.0),
      v = rr(2.5, 5.5) * s + 1;
    spawnP(
      x + Math.cos(a) * r0,
      rr(0.05, 0.3),
      z + Math.sin(a) * r0,
      Math.cos(a) * v,
      rr(0.1, 0.5),
      Math.sin(a) * v,
      rr(0.7, 1.5),
      rr(0.2, 0.4),
      rr(0.8, 1.6),
      wet ? 0xe8f0f0 : 0xc4b494,
      wet ? 0xd8e4e8 : 0xd8caa8,
      (wet ? 0.5 : 0.4) * s + 0.08,
      0,
      0
    );
  }
}
