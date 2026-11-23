/* ====================================================================================================
 * missions/m08-mortero.js
 *
 * 8 · Fuego de mortero: Kilo 1-1 vuelve del 6-4 y silencia la técnica del Super 6-1;
 * empiezan a caer granadas de mortero sobre el edificio de los heridos y el Romeo 4-1 de Eversmann sale a oscuras a buscar el tubo
 * ================================================================================================== */

'use strict';

const M8_TECH = { x: 370.7, z: 279.8 }; // la X naranja: la técnica, en la calle al norte del arco
const M8_BARREL = { x: 373.4, z: 277.4 }; // el bidón ardiendo que la ilumina
const M8_GREEN = [
  [345.5, 276.4],
  [369.6, 276.6]
]; // la calle verde por la que bajan los Delta, de oeste a este
const M8_BEHIND = [
  [369.6, 276.6],
  [368.3, 276.1],
  [367.1, 276.8],
  [365.9, 276.2],
  [364.7, 276.7]
]; // apilados detrás del arma
const M8_R22 = [
  [366.5, 295.5],
  [366.5, 296.6],
  [368.6, 295.3],
  [368.7, 297.2]
]; // primer cuadrado azul: Romeo 2-2
const M8_R31 = [
  [366.5, 312.4],
  [366.5, 313.6],
  [368.6, 311.6],
  [368.7, 314.2]
]; // segundo cuadrado azul: Romeo 3-1
const M8_DPOS = [
  [374.5, 299.5],
  [379.5, 299.8],
  [378.5, 304.5],
  [384.5, 304.5],
  [386.5, 300.5]
]; // la cobertura de los Delta en la plaza, lejos de los círculos IR
const M8_ZONES = [
  { x: 387.6, z: 250.4, r: 9 },
  { x: 338.3, z: 268.4, r: 9 },
  { x: 364.3, z: 347.4, r: 9 }
]; // los círculos rojos: donde puede estar el mortero
const M8_ROOFS = [
  [380, 286, 9],
  [397, 298, 9],
  [397, 309, 9]
]; // los tres edificios rojos, con milicia por todas sus azoteas
const M8_YAW = 2.99; // la cámara de apertura: mirando al norte por la calle del arco, con la técnica abajo
const M8_HOUSE = { x: 375.5, z: 207.5 }; // el edificio de los heridos (misión 7)
const m8House = () => {
  const b = bAt(Math.floor(M8_HOUSE.x), Math.floor(M8_HOUSE.z));
  return b >= 0 ? BLDS[b] : null;
};

// disparos de adorno: la ráfaga, las trazadoras y los impactos en las paredes, sin daño (el fuego cruzado de la plaza, la técnica de la escena inicial)
function m8Shot(s, t) {
  if (!s || !s.alive || !t) return;
  s.face = Math.atan2(t.x - s.x, t.z - s.z);
  s.firing = 0.6;
  s.cool = (s.cool0 || 1) * rr(0.8, 1.3);
  addNoise(s.x, s.z, 24);
  let ix, iy, iz;
  if (t.inB && t.inB.level === 'roof') {
    [ix, iy, iz] = wallPoint(t, s);
  } else {
    ix = t.x + rr(-0.9, 0.9);
    iy = rr(0.15, 1.1);
    iz = t.z + rr(-0.9, 0.9);
  }
  burstFx(s, ix, iy, iz, false);
  t.sup = Math.min(t.god ? 70 : 100, (t.sup || 0) + 6);
}
// la plaza y las azoteas se cruzan fuego todo el rato: los Rangers y los Delta de ahí no pueden morir y su fuego nunca vacía esas azoteas
function m8Xfire(dt, rate) {
  G.m.xfT = (G.m.xfT || 0) - dt;
  while (G.m.xfT <= 0) {
    G.m.xfT += rr(0.2, 0.45) / (rate || 1);
    const R = them.filter(e => e.alive && e.tag === 'roof'),
      P = us.filter(u => u.alive && u.god && u.m8in);
    if (!R.length || !P.length) return;
    if (rnd() < 0.55) m8Shot(pick(R), pick(P));
    else m8Shot(pick(P), pick(R));
  }
  for (const u of us) if (u.god) u.sup = Math.min(u.sup, 70);
}
// un intercambio infinito de adorno: Rangers a cubierto que no pueden caer y milicia en las azoteas (y alguno en las calles) que no se acaba nunca
function xfSpots(cx, cz, n, r0, r1, sep, avoid) {
  const cand = [];
  for (let j = Math.floor(cz - r1); j <= cz + r1; j++)
    for (let i = Math.floor(cx - r1); i <= cx + r1; i++) {
      const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz);
      if (d < r0 || d > r1 || !walk(i, j) || reserved[idx(i, j)]) continue;
      if (avoid && avoid(i + 0.5, j + 0.5)) continue;
      let wall = 0;
      for (const [a, b] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1]
      ])
        if (inB(i + a, j + b) && (grid[idx(i + a, j + b)] === 1 || cov[idx(i + a, j + b)])) wall++;
      if (wall) cand.push([i + 0.5, j + 0.5, wall + phs(i, j, 91) * 2]);
    }
  cand.sort((p, q) => q[2] - p[2]);
  const out = [];
  for (const c of cand) {
    if (out.every(o => Math.hypot(o[0] - c[0], o[1] - c[1]) >= sep)) out.push(c);
    if (out.length >= n) break;
  }
  return out;
}
function xfMake(cx, cz, o) {
  const X = {
    t: 0,
    rate: o.rate || 1.2,
    us: [],
    them: [],
    roofs: [],
    streets: o.streets || 0,
    tag: o.tag || 'xr',
    cx,
    cz,
    r1: o.r1 || 34
  };
  const names = [
    'Sgto. Bales',
    'Esp. Mayo',
    'Cabo Hart',
    'Esp. Lowe',
    'Sgto. Dorn',
    'Esp. Kerr',
    'Cabo Pratt',
    'Esp. Wade',
    'Sgto. Cole',
    'Esp. Ruano'
  ];
  xfSpots(cx, cz, o.n || 0, o.r0 || 3, o.rr || 15, 2.6, o.avoid).forEach(([x, z], k) => {
    const u = npcUnit(
      Object.assign({}, RANGERS[k % 6], RSPEC, {
        name: names[k % names.length],
        role: 'A cubierto',
        unitName: o.unit || 'Romeo 2-2',
        gun: k % 4 === 2 ? 'saw' : 'm16'
      }),
      x,
      z,
      0
    );
    u.stance = 'crouch';
    u.order = { type: 'hold' };
    X.us.push(u);
  });
  for (const u of o.men || []) X.us.push(u);
  for (const u of X.us) {
    u.npc = true;
    u.god = true;
    u.m8in = true;
    if (o.cine) u.cine = true;
  }
  // las azoteas que dan al sitio: las altas más cercanas, con unos pocos hombres en cada una
  const near = BLDS.filter(b => !b.ring && b.top > 3 && b.w >= 3 && b.d >= 3)
    .map(b => [Math.hypot(b.x + b.w / 2 - cx, b.y + b.d / 2 - cz), b])
    .filter(p => p[0] > (o.br0 || 12) && p[0] < X.r1 && !(o.skipB || []).includes(p[1]))
    .sort((p, q) => p[0] - q[0])
    .slice(0, o.nb || 5);
  for (const [, b] of near) X.roofs.push({ b, n: o.perRoof || 3 });
  xfRefill(X, true);
  for (const u of X.us) {
    const t = X.them
      .filter(e => e.alive)
      .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
    if (t) u.face = Math.atan2(t.x - u.x, t.z - u.z);
  }
  return X;
}
function xfRefill(X, all) {
  X.them = X.them.filter(e => e.alive);
  for (const R of X.roofs) {
    const slots = bSlots(R.b, 'roof');
    if (!slots.length) continue;
    const on = X.them.filter(e => e.inB && e.inB.b === R.b.id),
      used = new Set(on.map(e => e.inB.slot));
    for (let q = on.length; q < R.n; q++) {
      const k = Math.floor(((q + 0.5) * slots.length) / R.n);
      let kk = k;
      while (used.has(kk) && kk < slots.length - 1) kk++;
      if (used.has(kk)) break;
      used.add(kk);
      const e = foe(slots[kk][0], slots[kk][1], 'post', X.tag, CAMP_ESPEC);
      if (!e) continue;
      e.inB = {
        b: R.b.id,
        level: 'roof',
        slot: kk,
        door: nearestFree(Math.floor(slots[kk][0]), Math.floor(slots[kk][1]))
      };
      e.x = slots[kk][0];
      e.z = slots[kk][1];
      e.elev = R.b.top;
      e.stance = 'crouch';
      e.roof = true;
      e.xfire = true;
      e.noFire = true;
      e.spotted = true;
      e.face = Math.atan2(X.cx - e.x, X.cz - e.z);
      X.them.push(e);
      if (!all) break;
    }
  }
  const st = X.them.filter(e => !e.roof).length;
  for (let q = st; q < X.streets; q++) {
    const a = phs(q, G.t, 93) * 6.283,
      d = 18 + phs(G.t, q, 94) * 10,
      c = findWalk(X.cx + Math.cos(a) * d, X.cz + Math.sin(a) * d);
    const e = foe(c[0] + 0.5, c[1] + 0.5, 'post', X.tag, CAMP_ESPEC);
    if (!e) continue;
    e.xfire = true;
    e.noFire = true;
    e.spotted = true;
    e.stance = 'crouch';
    e.face = Math.atan2(X.cx - e.x, X.cz - e.z);
    X.them.push(e);
    if (!all) break;
  }
}
function xfStep(X, dt) {
  if (!X) return;
  X.t -= dt;
  X.rf = (X.rf || 0) - dt;
  if (X.rf <= 0) {
    X.rf = 4;
    xfRefill(X, false);
  }
  while (X.t <= 0) {
    X.t += rr(0.15, 0.4) / X.rate;
    const R = X.them.filter(e => e.alive),
      P = X.us.filter(u => u.alive && !u.inside);
    if (!R.length || !P.length) break;
    const u = pick(P),
      near = R.filter(e => Math.hypot(e.x - u.x, e.z - u.z) < 40),
      e = near.length ? pick(near) : pick(R);
    if (rnd() < 0.5) m8Shot(e, u);
    else m8Shot(u, e);
  }
  for (const u of X.us) if (u.alive) u.sup = Math.min(u.sup, 60);
}
function xfClear(X) {
  if (!X) return;
  for (const e of X.them) {
    if (!e.alive) continue;
    e.alive = false;
    if (e.m && e.m.root.parent) e.m.root.parent.remove(e.m.root);
    dropOverlay(e);
  }
  X.roofs = [];
  X.streets = 0;
  X.them = [];
}
// una azotea llena de milicia, hueco a hueco a lo largo del pretil
function m8RoofFill(b, n) {
  const slots = bSlots(b, 'roof');
  for (let k = 0; k < Math.min(n, slots.length); k++) {
    const s = slots[Math.floor((k * slots.length) / n)],
      door = nearestFree(Math.floor(s[0]), Math.floor(s[1]));
    const e = foe(s[0], s[1], 'post', 'roof', CAMP_ESPEC);
    e.inB = { b: b.id, level: 'roof', slot: Math.floor((k * slots.length) / n), door };
    e.x = s[0];
    e.z = s[1];
    e.elev = b.top;
    e.stance = 'crouch';
    e.roof = true;
    e.xfire = true;
    e.face = Math.atan2(S61.x - e.x, S61.z - e.z);
  }
}
// puestos en las calles: solos, de dos en dos o de tres en tres, nunca en la calle de los Delta ni junto a la puerta de la casa
function m8Streets() {
  const keepOut = [
    [S61.x, S61.z, 16],
    [M8_HOUSE.x, M8_HOUSE.z, 14]
  ].concat(M8_ZONES.map(z => [z.x, z.z, 12]));
  const cand = [];
  for (let j = 214; j <= 356; j++)
    for (let i = 334; i <= 405; i++) {
      const k = idx(i, j);
      if (!walk(i, j) || !STR[k]) continue;
      const x = i + 0.5,
        z = j + 0.5;
      if (x > 338 && x < 375 && z > 271 && z < 282) continue; // la calle verde y el cruce de la técnica
      if (keepOut.some(([a, b, r]) => Math.hypot(x - a, z - b) < r)) continue;
      cand.push([x, z]);
    }
  for (let k = cand.length - 1; k > 0; k--) {
    const q = Math.floor(Math.random() * (k + 1));
    [cand[k], cand[q]] = [cand[q], cand[k]];
  }
  const sizes = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
    spots = [];
  for (const p of cand) {
    if (spots.length >= sizes.length) break;
    if (spots.some(s => Math.hypot(s[0] - p[0], s[1] - p[1]) < 13)) continue;
    spots.push(p);
  }
  spots.forEach((p, n) => {
    for (let q = 0; q < sizes[n]; q++) {
      const e = foe(p[0] + (q ? rr(-1.6, 1.6) : 0), p[1] + (q ? rr(-1.6, 1.6) : 0), 'post', 'calle', CAMP_ESPEC);
      e.face = rnd() * 6.283;
    }
  });
}
// el mortero: un tubo sobre su placa base, un bípode, munición y sus tres hombres; en una de las tres zonas, elegida al azar
function m8Mortar() {
  const Z = M8_ZONES[Math.floor(Math.random() * M8_ZONES.length)],
    c = findWalk(Z.x, Z.z),
    x = c[0] + 0.5,
    z = c[1] + 0.5;
  const yaw = Math.atan2(M8_HOUSE.x - x, M8_HOUSE.z - z),
    g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  world.add(g);
  const dk = new T.MeshLambertMaterial({ color: 0x2e3128 }),
    ol = new T.MeshLambertMaterial({ color: 0x484b36 }),
    wd = new T.MeshLambertMaterial({ color: 0x6a5434 });
  const bx = (mat, sx, sy, sz, px, py, pz, rx) => {
    const m = new T.Mesh(UBOX, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    if (rx) m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  bx(dk, 0.62, 0.06, 0.62, 0, 0.03, 0);
  const a = 0.78,
    len = 1.15,
    tube = new T.Mesh(new T.CylinderGeometry(0.06, 0.065, len, 8), ol);
  tube.castShadow = true;
  tube.rotation.x = a;
  tube.position.set(0, 0.08 + (Math.cos(a) * len) / 2, (Math.sin(a) * len) / 2);
  g.add(tube);
  for (const s of [-1, 1]) {
    const leg = bx(dk, 0.035, 0.78, 0.035, s * 0.2, 0.33, 0.62, -0.35);
    leg.rotation.z = s * 0.28;
  }
  bx(wd, 0.5, 0.22, 0.3, 0.75, 0.11, -0.35);
  bx(wd, 0.5, 0.22, 0.3, 0.78, 0.33, -0.33);
  bx(wd, 0.42, 0.2, 0.28, -0.7, 0.1, -0.5);
  const mz = [x + Math.sin(yaw) * Math.sin(a) * len, 0.08 + Math.cos(a) * len, z + Math.cos(yaw) * Math.sin(a) * len];
  const crew = [
    [-0.85, -0.45],
    [0.85, -0.35],
    [0.1, -1.25]
  ].map(([lx, lz]) => {
    const wx = x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
      wz = z - lx * Math.sin(yaw) + lz * Math.cos(yaw);
    const e = foe(wx, wz, 'post', 'mortar', Object.assign({}, CAMP_ESPEC, { name: 'Mortero · sirviente' }));
    e.x = wx;
    e.z = wz;
    e.face = yaw;
    e.stance = 'crouch';
    return e;
  });
  G.m.mort = { x, z, g, mz, zone: Z, crew, shots: 0 };
}
// un silbido que baja de tono justo antes de que caiga el proyectil
function m8Whistle(x, z) {
  if (!AC || !soundOn) return;
  const now = AC.currentTime,
    d = Math.hypot(x - camS.tx, z - camS.tz),
    v = Math.max(0.02, 1 - d / 45) * 0.07;
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1500, now);
  o.frequency.exponentialRampToValueAtTime(420, now + 1.1);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(v, now + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
  o.connect(g);
  g.connect(SND && SND.gate ? SND.gate : AC.destination);
  o.start(now);
  o.stop(now + 1.2);
}
// dispara el tubo: un fogonazo y un golpe sordo en el mortero, y sus hombres se dejan ver un momento
function m8Launch() {
  const M_ = G.m.mort;
  if (!M_) return;
  M_.shots++;
  const [x, y, z] = M_.mz;
  lightFlash(x, y + 0.3, z, 0xffd8a0, 6, 18, 0.25);
  sfx('boom', x, z);
  addNoise(x, z, 30);
  for (let k = 0; k < 14; k++)
    spawnP(
      x,
      y,
      z,
      rr(-0.5, 0.5),
      rr(1, 2.4),
      rr(-0.5, 0.5),
      rr(1.2, 2.2),
      rr(0.15, 0.3),
      rr(0.8, 1.4),
      0x8a8478,
      0x5a5650,
      0.7,
      0,
      0
    );
  for (const e of M_.crew)
    if (e.alive) {
      e.firing = 0.8;
      e.stance = 'crouch';
    }
  const roof = rnd() < 0.45;
  sched.push({ at: G.t + 2.2, fn: () => m8Whistle(M8_HOUSE.x, M8_HOUSE.z) });
  sched.push({ at: G.t + 3.3, fn: () => m8Impact(roof) });
  // Steele, en la azotea de la casa, ve el fogonazo
  if ([2, 5, 9, 14, 20].includes(M_.shots)) {
    const dir = compass(M_.x - M8_HOUSE.x, M_.z - M8_HOUSE.z);
    sched.push({ at: G.t + 1.2, fn: () => say('Cap. Steele', `¡Fogonazo al ${dir}!`, 'us', true) });
  }
}
// cae un proyectil: en la azotea de la casa (el edificio pierde aguante) o en las calles de alrededor
function m8Impact(roof) {
  if (G.over) return;
  const b = m8House();
  if (roof && b) {
    const x = b.x + rr(0.7, b.w - 0.7),
      z = b.y + rr(0.7, b.d - 0.7),
      y = b.top + 0.1;
    lightFlash(x, y + 1, z, 0xffa040, 8, 14, 0.8);
    sfx('boom', x, z);
    addNoise(x, z, 40);
    for (let k = 0; k < 60; k++) {
      const a = rnd() * 6.28,
        s = rr(1, 4.5);
      spawnP(
        x,
        y + 0.3,
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
    for (let k = 0; k < 50; k++) {
      const a = rnd() * 6.28,
        s = rr(0.3, 1.6);
      spawnP(
        x + rr(-0.4, 0.4),
        y + rr(0.2, 0.8),
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
    for (let k = 0; k < 18; k++)
      spawnChunk(
        x + rr(-0.5, 0.5),
        y + 0.3,
        z + rr(-0.5, 0.5),
        rr(-5, 5),
        rr(3, 8),
        rr(-5, 5),
        rr(0.08, 0.25),
        pick([0xcfc4a8, 0xbfae8e, 0x8f866f, 0x6a5a48])
      );
    for (const u of units)
      if (u.alive && u.inB && u.inB.level === 'roof' && Math.hypot(u.x - x, u.z - z) < 2) damage(u, 60, null);
    const was = G.m.bHp;
    G.m.bHp = Math.max(CINE.on ? 86 : 0, G.m.bHp - rr(4, 6.5));
    G.m.bFlash = 1;
    if (was > 70 && G.m.bHp <= 70) {
      emitters.push({
        x: b.x + b.w * 0.3,
        z: b.y + b.d * 0.6,
        y: b.top + 0.2,
        rate: 14,
        life: 7,
        vy: 1.1,
        s0: 0.3,
        s1: 1.6,
        fire: 0.15,
        acc: 0,
        sp: 0.3
      });
    }
    if (was > 40 && G.m.bHp <= 40) {
      emitters.push({
        x: b.x + b.w * 0.7,
        z: b.y + b.d * 0.35,
        y: b.top + 0.2,
        rate: 24,
        life: 7,
        vy: 1.3,
        s0: 0.3,
        s1: 1.9,
        fire: 0.55,
        acc: 0,
        sp: 0.4
      });
    }
    if (!CINE.on)
      for (const [lim, who, t] of [
        [75, 'Cap. Steele', '¡Otro en el tejado! ¡Se está abriendo el techo!'],
        [50, 'Esp. Lance Twombly', '¡Ha caído medio techo sobre la sala! ¡Daos prisa!'],
        [25, 'Cap. Steele', '¡Las vigas no aguantan más! ¡Un par más y se nos viene abajo!']
      ])
        if (was > lim && G.m.bHp <= lim) say(who, t, 'us', true);
    if (G.m.bHp <= 0 && !G.m.collapsed) m8Collapse();
    return;
  }
  // en la calle: un sitio a entre cinco y quince metros de la casa
  let x = M8_HOUSE.x,
    z = M8_HOUSE.z;
  for (let n = 0; n < 30; n++) {
    const a = rnd() * 6.283,
      d = rr(5, 15),
      i = Math.floor(M8_HOUSE.x + Math.cos(a) * d),
      j = Math.floor(M8_HOUSE.z + Math.sin(a) * d);
    if (walk(i, j)) {
      x = i + 0.5;
      z = j + 0.5;
      break;
    }
  }
  boom(x, z);
  sfx('boom', x, z);
  addNoise(x, z, 40);
  for (const u of units) {
    if (!u.alive) continue;
    const d = Math.hypot(u.x - x, u.z - z);
    if (d > 6) continue;
    u.sup = Math.min(100, u.sup + 80 * (1 - d / 6));
    if (d < 1.9 && !(u.inB && u.inB.level === 'ground')) damage(u, 55 * (1 - d / 1.9) + 15, null);
  }
}
function m8Collapse() {
  G.m.collapsed = true;
  const b = m8House();
  if (!b) return;
  const cx = b.x + b.w / 2,
    cz = b.y + b.d / 2;
  for (let k = 0; k < 6; k++)
    sched.push({
      at: G.t + k * 0.25,
      fn: () => {
        const x = cx + rr(-2, 2),
          z = cz + rr(-2, 2);
        lightFlash(x, 3, z, 0xffa040, 6, 16, 0.6);
        sfx('boom', x, z);
        for (let q = 0; q < 70; q++) {
          const a = rnd() * 6.28,
            s = rr(1, 6);
          spawnP(
            x,
            rr(0.5, b.top),
            z,
            Math.cos(a) * s,
            rr(0.2, 2.5),
            Math.sin(a) * s,
            rr(2, 4),
            rr(0.4, 0.8),
            rr(1.5, 3),
            0x8a7a62,
            0x5a5048,
            0.85,
            0,
            0
          );
        }
      }
    });
  say('Cap. Steele', '¡El techo se viene abajo! ¡Los heridos! ¡Sacadlos de ahí!', 'us', true);
  sched.push({
    at: G.t + 3,
    fn: () => {
      say('Uniform 6-4', 'Romeo 4-1, el edificio de los heridos se ha derrumbado.', 'hq', true);
      endGame(false);
    }
  });
}
// la escena inicial
function m8Intro() {
  const r22 = G.m.r22,
    r31 = G.m.r31,
    D = G.m.delta,
    hoot = D[0],
    T_ = G.m.tech,
    gun = T_.gunner,
    crew = G.m.techCrew,
    R41 = gLive(grpN('Romeo 4-1'));
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  const evm = R41[0],
    wad = R41[1],
    twb = { name: 'Esp. Lance Twombly' };
  G.m.cf = [S61.x - 6, S61.z - 9];
  G.alert = true;
  for (const e of them) if (e.tag === 'roof' || e.tag === 'calle' || e.tag === 'mortar') e.noFire = true;
  camS.yaw = camS.yawT = M8_YAW;
  cineStart({
    zoom: 9,
    spin: 0,
    yaw0: M8_YAW,
    focus: () => G.m.cf,
    text: L('Super 6-1 · 19:40 · una técnica clava al suelo a los Rangers que quedan junto al helicóptero'),
    keys: [
      { t: 1.5, fn: () => sayU(r22[0], '¡Esa ametralladora nos tiene clavados! ¡No puedo ni asomar la cabeza!') },
      { t: 5.5, fn: () => sayU(r31[0], '¡Está en la calle del arco! ¡No llegamos a ella!') },
      {
        t: 9,
        text: L('De las sombras de la calle llega Kilo 1-1, de vuelta del Super 6-4'),
        fn: () => {
          G.m.dGo = true;
          CINE.zoom = 7.5;
          D.forEach((u, i) => {
            u.path = pathThrough([[u.x, u.z], M8_BEHIND[i]]).map(p => [Math.floor(p[0]), Math.floor(p[1])]);
            u.order = { type: 'move' };
            u.stance = 'stand';
            u.sneak = true;
            u.spd = 3.0;
          });
        }
      },
      {
        t: 26,
        fn: () => {
          sayU(hoot, '¡Hey, adiga!');
          sched.push({ at: G.t + 0.6, fn: () => say('Kilo 1-1', '(«¡Eh, tú!», en somalí)', 'delta', true) });
          G.m.turn = true;
        }
      },
      {
        t: 27.4,
        fn: () => {
          const tg = [gun].concat(crew);
          D.forEach((u, i) => {
            const t = tg[i % tg.length];
            sched.push({ at: G.t + i * 0.12, fn: () => m8Shot(u, t) });
            sched.push({ at: G.t + 0.35 + i * 0.12, fn: () => m8Shot(u, t) });
          });
          for (const t of tg)
            sched.push({
              at: G.t + 0.25 + rnd() * 0.4,
              fn: () => {
                if (t.alive) damage(t, 999, hoot);
              }
            });
          G.m.techDead = true;
        }
      },
      {
        t: 30,
        fn: () => {
          sayU(
            hoot,
            'Romeo 2-2, aquí Kilo 1-1. La técnica está fuera. Kilo 1-1 acercándose por la esquina norte, por el arco. ¡No disparéis!'
          );
          D.forEach((u, i) => {
            u.sneak = false;
            u.spd = 2.7;
            goTo(u, M8_DPOS[i][0], M8_DPOS[i][1]);
          });
          CINE.zoom = 9;
        }
      },
      {
        t: 36,
        fn: () => {
          G.m.cf = [S61.x - 3, S61.z - 6];
          sayU(r22[0], 'Kilo 1-1, os tenemos. Gracias, nos habéis salvado el pellejo.');
        }
      },
      {
        t: 41,
        fn: () =>
          sayU(r31[0], 'Os debemos una. Cuidado con las azoteas del norte y del este: están llenas de tiradores.')
      },
      {
        t: 45.5,
        text: L('El edificio de los heridos, calle arriba: empiezan a caer granadas de mortero'),
        fn: () => {
          G.m.cf = [M8_HOUSE.x - 2, M8_HOUSE.z + 3];
          CINE.zoom = 10.5;
          G.m.shell = true;
          G.m.csT = G.t + 0.6;
        }
      },
      { t: 49, fn: () => sayU(evm, '¡Morteros! ¡Nos están cayendo morteros encima!') },
      { t: 53, fn: () => say('Cap. Steele', '¡Han dado en el tejado! ¡Los heridos están justo debajo!', 'us', true) },
      {
        t: 57.5,
        fn: () => sayU(evm, 'Uniform 6-4, aquí Romeo 4-1. Nos castigan con morteros desde una posición desconocida.')
      },
      {
        t: 63,
        fn: () =>
          say(
            'Uniform 6-4',
            'Recibido, Romeo 4-1. No tenemos ojos sobre el tubo. Por los disparos está en una de tres zonas al sur de vuestro edificio. Os las marco en el mapa.',
            'hq',
            true
          )
      },
      {
        t: 70.5,
        fn: () =>
          say(twb.name, 'Como no hagamos algo, el edificio se nos cae encima con todos los heridos dentro.', 'us', true)
      },
      {
        t: 75,
        fn: () => {
          sayU(evm, 'Romeo 4-1, conmigo. Vamos a buscar ese mortero.');
          R41.forEach((u, i) => {
            leaveB(u);
            goTo(u, 369.2 + (i % 2) * 1.6, 205.5 + (i >> 1) * 1.6);
            u.stance = 'stand';
          });
          G.m.cf = [M8_HOUSE.x - 5, M8_HOUSE.z + 1];
        }
      },
      { t: 79, fn: () => sayU(wad, 'Sin visores no se ve nada ahí fuera, sargento.') },
      { t: 82.5, fn: () => sayU(evm, 'Pues mirad los fogonazos. Cada vez que dispare, nos dirá dónde está.') }
    ],
    dur: 87,
    tick: dt => {
      if (G.m.dGo && hoot.alive) G.m.cf = G.m.techDead ? G.m.cf : [hoot.x + 2.5, hoot.z + 1.5];
      if (G.m.dGo && !G.m.techDead && hoot.alive && Math.hypot(hoot.x - M8_TECH.x, hoot.z - M8_TECH.z) < 9) {
        G.m.cf = [M8_TECH.x - 2, M8_TECH.z - 1];
        if (!G.m.dZoom) {
          G.m.dZoom = true;
          CINE.zoom = 5.8;
        }
      }
      if (G.m.turn) {
        for (const e of [gun].concat(crew))
          if (e.alive) {
            e.face = Math.atan2(hoot.x - e.x, hoot.z - e.z);
            e.firing = Math.max(e.firing || 0, 0.2);
          }
      }
      // hasta que los Delta le dan, el arma machaca el primer cuadrado azul a través del arco
      if (!G.m.techDead && !G.m.turn && gun.alive) {
        G.m.tgT = (G.m.tgT || 0) - dt;
        if (G.m.tgT <= 0) {
          G.m.tgT = rr(0.28, 0.45);
          m8Shot(gun, rnd() < 0.75 ? pick(r22) : pick(r31));
        }
        G.m.tcT = (G.m.tcT || 0) - dt;
        if (G.m.tcT <= 0) {
          G.m.tcT = rr(0.9, 1.6);
          const c = pick(crew);
          if (c.alive) m8Shot(c, pick(r22));
        }
        G.m.trT = (G.m.trT || 0) - dt;
        if (G.m.trT <= 0) {
          G.m.trT = rr(1.6, 3);
          m8Shot(pick(r22.concat(r31)), gun);
        }
      }
      for (const u of D)
        if (u.alive && !u.m8in && G.m.techDead && Math.hypot(u.x - S61.x, u.z - S61.z) < 26 && !u.path.length) {
          u.m8in = true;
          u.stance = 'crouch';
        }
      m8Xfire(dt, 0.6);
      if (G.m.shell && G.t >= G.m.csT) {
        G.m.csT = G.t + rr(1.8, 2.8);
        const roof = rnd() < 0.5;
        m8Whistle(M8_HOUSE.x, M8_HOUSE.z);
        sched.push({ at: G.t + 1.1, fn: () => m8Impact(roof) });
      }
      for (const u of us) if (u.alive && !u.god) u.sup = Math.min(u.sup, 25);
    },
    onEnd: () => m8Go()
  });
}
// empieza la caza: Romeo 4-1 en la calle y las tres zonas en el suelo y en el mapa
function m8Go() {
  const R41 = gLive(grpN('Romeo 4-1'));
  R41.forEach((u, i) => {
    if (u.inB) leaveB(u);
    if (!u.path.length && Math.hypot(u.x - M8_HOUSE.x, u.z - M8_HOUSE.z) < 4) {
      const c = findWalk(369.2 + (i % 2) * 1.6, 205.5 + (i >> 1) * 1.6);
      u.x = c[0] + 0.5;
      u.z = c[1] + 0.5;
    }
    u.stance = 'crouch';
  });
  for (const u of G.m.delta) {
    u.noFire = false;
    u.sneak = false;
    u.m8in = true;
    if (u.path.length) {
      const p = u.path[u.path.length - 1];
      u.x = p[0] + 0.5;
      u.z = p[1] + 0.5;
      u.path = [];
    }
    u.stance = 'crouch';
    u.order = { type: 'hold' };
  }
  for (const u of G.m.r22.concat(G.m.r31)) u.noFire = false;
  for (const e of them) if (e.tag === 'roof' || e.tag === 'calle' || e.tag === 'mortar') e.noFire = false;
  G.m.shell = false;
  G.m.mortT = G.t + 7;
  camS.tx = M8_HOUSE.x - 6;
  camS.tz = M8_HOUSE.z + 6;
  camS.zoomT = 12;
  G.sel = new Set(R41);
  buildCards();
  refreshCards();
  renderSubs();
  hint(
    'El mortero está en una de las tres zonas naranjas. Cada disparo deja un fogonazo. Usa bengalas para ver en la oscuridad y acaba con sus tres sirvientes antes de que se hunda el edificio.'
  );
}
function m8Tick(dt) {
  m8Xfire(dt, 1);
  const M_ = G.m.mort;
  if (!M_) return;
  const live = M_.crew.filter(e => e.alive).length;
  if (live && G.t >= G.m.mortT) {
    G.m.mortT = G.t + rr(10, 14) * (live < 3 ? 1.35 : 1);
    m8Launch();
  }
  // encontrado: las otras dos zonas desaparecen
  if (
    !G.m.found &&
    (M_.crew.some(e => e.alive && e.spotted) ||
      us.some(u => u.alive && !u.npc && Math.hypot(u.x - M_.x, u.z - M_.z) < 10))
  ) {
    G.m.found = true;
    for (const r of G.m.zr || []) overlay.remove(r);
    G.m.zr = [ringAt(M_.x, M_.z, 4, 0xff6a3a)];
    G.m.mzMap = [{ x: M_.x, z: M_.z, r: 4 }];
    const sp = us
      .filter(u => u.alive && !u.npc)
      .sort((a, b) => Math.hypot(a.x - M_.x, a.z - M_.z) - Math.hypot(b.x - M_.x, b.z - M_.z))[0];
    if (sp) radio(sp, '¡Ahí está el mortero! ¡Tres hombres junto al tubo!');
    autoPause('mortero localizado');
  }
}
