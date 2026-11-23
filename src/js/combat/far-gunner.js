/* ====================================================================================================
 * combat/far-gunner.js
 *
 * El tirador lejano: en todas las misiones hay, en algún sitio fuera de alcance, un tirador de RPG al que el jugador no puede llegar nunca. De vez en cuando
 * dispara a la unidad que manda el jugador. El cohete revienta en el edificio más cercano: abre un agujero en el muro (o se lleva
 * la esquina), suelta un montón de escombro y tira al suelo a todos los que están a menos de seis metros (KD_R).
 * ================================================================================================== */

'use strict';

function farRpgTick(dt) {
  if (
    !G ||
    !G.started ||
    G.over ||
    CINE.on ||
    FLIGHT.on ||
    !MIS ||
    MIS.id === 'attract' ||
    MIS.id === 'tutorial' ||
    MIS.noFarRpg
  )
    return;
  const F = G.farRpg || (G.farRpg = { next: G.t + rr(60, 90), st: 'idle' });
  if (F.st === 'aim') {
    const g = F.g,
      t = F.tgt;
    if (!g || !g.m) {
      F.st = 'idle';
      return;
    }
    g.face = Math.atan2(F.h.x - g.x, F.h.z - g.z);
    g.stance = 'crouch';
    g.rpgAim = 1;
    if (G.t >= F.fireAt) {
      farRpgFire(F);
      F.st = 'gone';
      F.goneAt = G.t + 7;
    }
    return;
  }
  if (F.st === 'gone') {
    if (G.t >= F.goneAt) {
      farRpgDrop(F);
      F.st = 'idle';
      F.next = G.t + rr(90, 150);
    }
    return;
  }
  if (G.t < F.next) return;
  const sel = [...G.sel].filter(
    u =>
      u.alive &&
      !u.npc &&
      !u.mounted &&
      !u.ride &&
      !u.board &&
      !(u.inB && u.inB.level === 'ground') &&
      (u.elev || 0) < 0.2
  );
  if (!sel.length) {
    F.next = G.t + 6;
    return;
  }
  const t = sel[ri(sel.length)],
    h = farRpgWall(t);
  if (!h) {
    F.next = G.t + 8;
    return;
  }
  const pos = farRpgSpot(h);
  if (!pos) {
    F.next = G.t + 8;
    return;
  }
  const g = foe(
    pos.x,
    pos.z,
    'post',
    'farRpg',
    Object.assign({}, CAMP_ESPEC, { gun: 'rpg', rpg: true, rpgLoaded: true, rpgReady: 1e9, name: 'Miliciano · RPG' })
  );
  g.x = pos.x;
  g.z = pos.z;
  g.immortal = true;
  g.noFire = true;
  g.showAlways = true;
  g.hp = g.hp0 = 1e6;
  g.stance = 'crouch';
  if (pos.b) {
    g.inB = { b: pos.b.id, level: 'roof', slot: 0, door: nearestFree(Math.floor(pos.x), Math.floor(pos.z)) };
    g.elev = pos.b.top;
    g.roof = true;
  }
  F.g = g;
  F.tgt = t;
  F.h = h;
  F.st = 'aim';
  F.fireAt = G.t + 2.2;
}
// el muro más cercano al objetivo: rayos a su alrededor a la altura del pecho y de la cabeza; si hay una esquina cerca, el impacto se lleva a ella
function farRpgWall(t) {
  let best = null;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2 + rnd() * 0.1;
    for (const y of [1.3, 2.2]) {
      const h = traceShot(t.x, y, t.z, t.x + Math.cos(a) * 13, y, t.z + Math.sin(a) * 13, 0);
      if (!h || h.m < 0 || !h.e || h.e.b == null || h.e.b < 0 || h.e.roof || Math.abs(h.ny) > 0.35 || h.e.isProp)
        continue;
      const d = Math.hypot(h.x - t.x, h.z - t.z);
      if (d < 2.2) continue;
      if (!best || d < best.d) best = { h, d };
    }
  }
  if (!best) return null;
  const h = best.h,
    ax = Math.abs(h.nx) > Math.abs(h.nz),
    e = h.e;
  // lo que mide la cara a lo largo del muro, sacado de la caja de impacto: una esquina a menos de 2,5 m se lleva el cohete
  if (!e.rx && !e.rz && boxAxis(e)) {
    const A = boxAABB(e),
      lo = ax ? A[4] : A[0],
      hi = ax ? A[5] : A[1],
      p = ax ? h.z : h.x;
    if (p - lo < 2.5) {
      if (ax) h.z = lo + 0.35;
      else h.x = lo + 0.35;
      h.corner = -1;
    } else if (hi - p < 2.5) {
      if (ax) h.z = hi - 0.35;
      else h.x = hi - 0.35;
      h.corner = 1;
    }
  }
  h.y = clamp(h.y, 1.1, Math.max(1.3, Math.min(2.4, e.y + e.sy / 2 - 0.7)));
  return h;
}
// dónde se pone él: una azotea o una calle a 40-60 m por delante de ese muro, con línea despejada hasta él
function farRpgSpot(h) {
  const n0 = Math.atan2(h.nx, h.nz);
  let fallback = null;
  for (const D of [48, 56, 40, 62])
    for (const da of [0, 0.3, -0.3, 0.55, -0.55]) {
      const a = n0 + da,
        px = h.x + Math.sin(a) * D,
        pz = h.z + Math.cos(a) * D,
        i = Math.floor(px),
        j = Math.floor(pz);
      if (!inB(i, j)) continue;
      let spot = null;
      const bid = bAt(i, j);
      if (bid >= 0) {
        const b = BLDS[bid];
        if (b && b.top > 2 && !b.ring)
          spot = {
            x: clamp(px, b.x + 0.6, b.x + b.w - 0.6),
            z: clamp(pz, b.y + 0.6, b.y + b.d - 0.6),
            y: b.top + 1.45,
            b
          };
      } else if (walk(i, j)) spot = { x: i + 0.5, z: j + 0.5, y: 1.45, b: null };
      if (!spot) continue;
      if (!fallback) fallback = spot;
      const L = Math.hypot(h.x - spot.x, h.y - spot.y, h.z - spot.z),
        s = 1.6 / L;
      const hh = traceShot(
        spot.x + (h.x - spot.x) * s,
        spot.y + (h.y - spot.y) * s,
        spot.z + (h.z - spot.z) * s,
        h.x,
        h.y,
        h.z,
        0
      );
      if (!hh || Math.hypot(hh.x - h.x, hh.y - h.y, hh.z - h.z) < 1) return spot;
    }
  return fallback;
}
function farRpgFire(F) {
  const g = F.g,
    h = F.h;
  const o = g.m && g.m.gun ? g.m.gun.localToWorld(_rq.set(0, 0.1, 0.6)) : null;
  const ox = o && isFinite(o.x) ? o.x : g.x,
    oy = o && isFinite(o.y) ? o.y : (g.elev || 0) + 1.45,
    oz = o && isFinite(o.z) ? o.z : g.z;
  const L = Math.hypot(h.x - ox, h.y - oy, h.z - oz) || 1;
  const hh = {
    x: h.x,
    y: h.y,
    z: h.z,
    nx: h.nx,
    ny: h.ny,
    nz: h.nz,
    m: h.m,
    c: h.c,
    e: h.e,
    dx: (h.x - ox) / L,
    dy: (h.y - oy) / L,
    dz: (h.z - oz) / L,
    corner: h.corner
  };
  launchRocket(ox, oy, oz, hh, g, null);
  ROCKETS[ROCKETS.length - 1].big = true;
  g.rpgLoaded = false;
  g.firing = 0.9;
  rpgBackblast(ox, oy, oz, g.face);
  rpgSnd(ox, oz, false);
  addNoise(g.x, g.z, 40);
  const c = us
    .filter(u => u.alive && !u.npc)
    .sort((p, q) => Math.hypot(p.x - h.x, p.z - h.z) - Math.hypot(q.x - h.x, q.z - h.z))[0];
  if (c) radio(c, pick(['¡RPG! ¡Al suelo!', '¡Cohete! ¡Cuerpo a tierra!', '¡RPG, RPG! ¡Abajo!']), true);
}
function farRpgDrop(F) {
  const g = F.g;
  if (!g) return;
  g.alive = false;
  g.gone = true;
  if (g.m && g.m.root.parent) world.remove(g.m.root);
  dropOverlay(g);
  units = units.filter(o => o !== g);
  them = them.filter(o => o !== g);
  F.g = null;
}
// la explosión grande en el muro: agujero o esquina rota, escombro, una nube de polvo que rueda calle abajo y todos los de cerca al suelo
function bigBlast(h) {
  const H = holePunch(h);
  const px = h.x + h.nx * 0.3,
    py = h.y,
    pz = h.z + h.nz * 0.3,
    col = h.c == null ? 0xb0a080 : h.c,
    brick = h.m === M.BRICK;
  lightFlash(px, py + 0.8, pz, 0xffa040, 9 + nightF * 6, 16 + nightF * 6, 1.2);
  sfx('boom', px, pz);
  camShake(0.55, 1.1);
  const cc = () => (brick || rnd() < 0.2 ? jit(0xa0644a, 0.1) : jit(shade(col, rr(0.7, 1)), 0.1));
  // siempre hacia la calle (el lado de donde vino el cohete), nunca hacia dentro del edificio
  const tx = -h.nz,
    tz = h.nx,
    out = (v, f, l) => [(h.nx * f + tx * l) * v, (h.nz * f + tz * l) * v];
  for (let k = 0; k < 40; k++) {
    const v = rr(3, 9),
      [vx, vz] = out(v, rr(0.7, 1.5), rr(-0.8, 0.8));
    spawnShard(px, py + rr(-0.4, 0.5), pz, vx, rr(1.5, 5), vz, rr(0.06, 0.15), cc(), rnd() < 0.25);
  }
  for (let k = 0; k < 90; k++) {
    const v = rr(3, 12),
      [vx, vz] = out(v, rr(0.6, 1.5), rr(-0.9, 0.9));
    spawnShard(px, py + rr(-0.5, 0.6), pz, vx, rr(1, 6), vz, rr(0.02, 0.06), cc(), rnd() < 0.35);
  }
  if (H) rubbleHeap(h, H, cc);
  // una nube espesa de polvo y humo
  const dc = brick ? 0xb08060 : shade(col, 1.1);
  for (let k = 0; k < 120; k++) {
    const a = rnd() * 6.28,
      v = rr(0.8, 4.5);
    spawnP(
      px + rr(-0.6, 0.6),
      rr(0.2, py + 1),
      pz + rr(-0.6, 0.6),
      (h.nx * 0.8 + Math.cos(a) * 0.6) * v,
      rr(0.1, 1.2),
      (h.nz * 0.8 + Math.sin(a) * 0.6) * v,
      rr(3.5, 7.5),
      rr(0.45, 0.8),
      rr(2, 3.6),
      jit(dc, 0.06),
      shade(dc, 1.06),
      rr(0.7, 0.95),
      0,
      0
    );
  }
  emitters.push({
    x: px,
    z: pz,
    y: py,
    rate: 22,
    life: 5,
    vy: 0.7,
    s0: 0.4,
    s1: 1.8,
    fire: 0,
    acc: 0,
    sp: 0.7,
    until: G.t + 12
  });
  // todos los que están a menos de seis metros, al suelo
  let n = 0;
  for (const u of units) {
    if (!u.alive) continue;
    if (Math.hypot(u.x - h.x, u.z - h.z) <= KD_R) {
      knockDown(u, h.x, h.z);
      if (u.team === 'us' && u.kdT) n++;
    }
  }
  if (n) {
    logMsg(`¡La onda expansiva derriba a ${n} ${n > 1 ? 'hombres' : 'hombre'}!`, 'bad');
    hint('La explosión los ha tirado al suelo: tardarán 10 segundos en levantarse y poder disparar.');
    autoPause('impacto de RPG');
  }
}
