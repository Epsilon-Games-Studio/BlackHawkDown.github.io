/* ====================================================================================================
 * combat/combat.js
 *
 * Combate
 *
 * Disparos y daño: fuego directo y de supresión, sangre, damage() y las explosiones.
 * ================================================================================================== */

'use strict';

function fireAt(s, t) {
  addNoise(s.x, s.z, 24);
  const d = dist(s, t);
  s.mag -= s.burst;
  s.cool = s.cool0 * (0.8 + rnd() * 0.5) * (s.fat != null ? 1.6 - (0.6 * s.fat) / 100 : 1);
  if (!s.moving) s.face = Math.atan2(t.x - s.x, t.z - s.z);
  s.firing = 0.6;
  let p =
    s.acc *
    (s.team === 'us' ? 1.15 * (0.55 + 0.45 * clamp(s.hp / s.hp0, 0, 1)) : 1) *
    clamp(1 - (d / RANGE) * 0.65, 0.25, 1) *
    (1 - (s.sup / 100) * 0.6) *
    (s.fat != null ? 0.55 + (0.45 * s.fat) / 100 : 1);
  p *= t.stance === 'prone' ? 0.55 : t.stance === 'crouch' ? 0.8 : 1;
  if (t.hide) p *= 0.55;
  const pr = coverProt(t, s.x, s.z);
  // correr al descubierto es peligroso: un soldado en movimiento sin nada entre él y el tirador es más fácil de alcanzar y de clavar
  const exposed = t.team === 'us' && t.path.length > 0 && !t.inB && pr.v < 0.3;
  if (t.path.length) p *= exposed ? 1.3 : 0.8;
  t.sup = Math.min(100, t.sup + s.supp * (1 - pr.v * 0.7) * (t.supRes || 1) * (exposed ? 1.45 : 1));
  for (const o of t.team === 'us' ? us : them)
    if (o !== t && o.alive && dist(o, t) < 1.8) o.sup = Math.min(100, o.sup + s.supp * 0.4);
  if (t.team === 'them') {
    G.alert = true;
    G.lastKnown = { x: s.x, z: s.z };
  }
  let ix,
    iy,
    iz,
    hit = null;
  if (rnd() < p) {
    if (t.inB && rnd() < pr.v) {
      const wp = wallPoint(t, s);
      ix = wp[0];
      iy = wp[1];
      iz = wp[2];
    } else if (rnd() < pr.v && pr.cell >= 0) {
      ix = kI(pr.cell) + 0.5;
      iz = kJ(pr.cell) + 0.5;
      iy = 0.45;
      hit = { cover: cov[pr.cell] };
    } else {
      ix = t.x;
      iy = 0.75;
      iz = t.z;
      hit = { unit: t };
    }
  } else {
    ix = t.x + (rnd() - 0.5) * 1.4;
    iy = 0.1 + rnd() * 1.1;
    iz = t.z + (rnd() - 0.5) * 1.4;
  }
  burstFx(s, ix, iy, iz, !!(hit && hit.unit));
  if (!(hit && hit.unit) && rnd() < 0.8) {
    t.flinchT = Math.max(t.flinchT || 0, rr(0.35, 0.55));
    for (const o of t.team === 'us' ? us : them)
      if (o !== t && o.alive && rnd() < 0.5 && dist(o, t) < 2) o.flinchT = Math.max(o.flinchT || 0, rr(0.3, 0.5));
  }
  if (hit)
    sched.push({
      at: G.t + 0.12,
      fn: () => {
        if (hit.unit && hit.unit.alive && !(s.god && hit.unit.xfire))
          damage(hit.unit, s.team === 'us' ? 32 + rnd() * 36 : 18 + rnd() * 24, s);
        if (hit.cover && hit.cover.kind === 'barrel' && cov[hit.cover.cells[0]] === hit.cover) breakBarrel(hit.cover);
      }
    });
}
function fireSuppress(s, x, z) {
  addNoise(s.x, s.z, 24);
  s.mag -= s.burst;
  s.cool = s.cool0 * 0.45 * (0.8 + rnd() * 0.4) * (s.fat != null ? 1.6 - (0.6 * s.fat) / 100 : 1);
  s.firing = 0.6;
  if (!s.moving) s.face = Math.atan2(x - s.x, z - s.z);
  const foes = s.team === 'us' ? them : us;
  for (const e of foes) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d > 2.6) continue;
    const pr = coverProt(e, s.x, s.z);
    e.sup = Math.min(100, e.sup + s.supp * 1.15 * (1 - pr.v * 0.35));
    if (e.team === 'them') {
      G.alert = true;
      G.lastKnown = { x: s.x, z: s.z };
    }
    if (rnd() < 0.05 * (1 - pr.v))
      sched.push({
        at: G.t + 0.12,
        fn: () => {
          if (e.alive) damage(e, 30 + rnd() * 30, s);
        }
      });
  }
  burstFx(s, x + (rnd() - 0.5) * 2.4, 0.1 + rnd() * 0.9, z + (rnd() - 0.5) * 2.4);
}
function bleed(u, src, n) {
  const dx = src ? u.x - src.x : rr(-1, 1),
    dz = src ? u.z - src.z : rr(-1, 1),
    L = Math.hypot(dx, dz) || 1;
  for (let k = 0; k < n; k++)
    spawnP(
      u.x + rr(-0.1, 0.1),
      rr(0.5, 0.95),
      u.z + rr(-0.1, 0.1),
      (dx / L) * rr(0.6, 2.2) + rr(-0.5, 0.5),
      rr(0.2, 1.4),
      (dz / L) * rr(0.6, 2.2) + rr(-0.5, 0.5),
      rr(0.6, 1.1),
      rr(0.05, 0.09),
      0.05,
      0xb01810,
      0x6a0c08,
      1,
      0,
      9
    );
  if (rnd() < 0.6) bloodDecal(u.x + (dx / L) * rr(0.3, 0.9), u.z + (dz / L) * rr(0.3, 0.9), rr(0.12, 0.25), 1.2);
}
const bloodMats = [0x6a0d0a, 0x58100c, 0x7a120c].map(
  c =>
    new T.MeshPhongMaterial({
      color: c,
      specular: 0x220000,
      shininess: 30,
      polygonOffset: true,
      polygonOffsetFactor: -2
    })
);
function bloodDecal(x, z, r, grow) {
  const n = 9,
    pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2,
      rr_ = r * (0.65 + rnd() * 0.5);
    pts.push(new T.Vector2(Math.cos(a) * rr_, Math.sin(a) * rr_));
  }
  const m = new T.Mesh(new T.ShapeGeometry(new T.Shape(pts)), pick(bloodMats));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rnd() * 6;
  m.position.set(x, 0.02 + rnd() * 0.004, z);
  m.receiveShadow = true;
  world.add(m);
  m.scale.setScalar(0.15);
  fx.push({ type: 'grow', obj: m, t: 0, life: grow, keep: true });
}
function damage(u, dmg, src) {
  if (u.medevac) {
    if (G.m.medHp != null && !G.m.medEnd) w4MedHit(u, dmg, src);
    return;
  }
  if (u.dummy) {
    puff(u.x, 0.9, u.z, 0xe8e2d0, 2);
    if (!G.m.live && u.alive && src && src.team === 'us' && !src.npc && G.t - (G.m.tgHint || -9) > 6) {
      G.m.tgHint = G.t;
      hint('Las dianas aún no se pueden tumbar: completa primero el objetivo actual');
    }
    if (!G.m.live || !u.alive) return;
    u.hp -= dmg;
    if (u.hp > 0) return;
    u.hp = 0;
    u.alive = false;
    u.deathT = G.t;
    G.kills++;
    sfx('hit', u.x, u.z);
    radio(src && src.team === 'us' ? src : null, pick(['¡Diana abajo!', '¡Blanco!', 'Diana tumbada.']));
    return;
  }
  if (u.immortal) {
    puff(u.x, (u.elev || 0) + 0.9, u.z, 0xe8e2d0, 2);
    return;
  } // el tirador de RPG lejano: fuera de alcance, le caiga lo que le caiga cerca
  if (u.god) {
    bleed(u, src, 2);
    u.sup = Math.min(70, u.sup + 15);
    return;
  } // misión 8: los que están clavados en la plaza no pueden caer
  if ((MIS.id === 'attract' || CINE.on) && u.team === 'us') {
    bleed(u, src, 3);
    u.hp = Math.max(50, u.hp - dmg * 0.3);
    u.sup = Math.min(100, u.sup + 25);
    return;
  }
  bleed(u, src, 8);
  if (u.m) {
    u.m.hit = 1;
    u.m.hitSide = rnd() < 0.5 ? -1 : 1;
  }
  u.hp -= dmg;
  u.sup = Math.min(100, u.sup + 25);
  if (u.hp > 0) {
    if (u.team === 'us') logMsg(`${u.name} herido`, 'bad');
    return;
  }
  u.hp = 0;
  u.alive = false;
  u.path = [];
  u.order = null;
  G.sel.delete(u);
  u.reloading = false;
  u.deathT = G.t;
  u.deadDir = rnd() < 0.55 ? -1 : 1;
  u.deadVar = rnd() < 0.4 ? 2 : 1;
  u.deadTwist = u.deadVar === 2 ? (rnd() < 0.5 ? -1.35 : 1.35) : rr(-0.6, 0.6);
  u.vx = u.vz = 0;
  bleed(u, src, 14);
  sched.push({
    at: G.t + 0.9,
    fn: () =>
      bloodDecal(u.x + Math.sin(u.face) * 0.3 * u.deadDir, u.z + Math.cos(u.face) * 0.3 * u.deadDir, rr(0.38, 0.55), 5)
  });
  if (u.team === 'them') {
    G.kills++;
    if (rnd() < 0.6)
      radio(src && src.team === 'us' ? src : null, pick(['¡Abatido!', 'Uno menos.', '¡Le di!', 'Objetivo caído.']));
  } else {
    if (u.inB) leaveB(u);
    u.down = true;
    u.reviveT = 0;
    u.deadDir = -1;
    u.deadTwist = rr(-0.3, 0.3);
    G.downs++;
    logMsg(`¡Hombre caído! ${u.name}`, 'bad');
    if (!u.npc) hint('Hombre caído: selecciona su pelotón y pulsa Atender heridos (+)');
    autoPause('hombre caído');
  }
}
function breakBarrel(o) {
  destroyCover(o);
  const x = o.i + 0.5,
    z = o.j + 0.5;
  if (!o.fuel) {
    puff(x, 0.4, z, 0x3a5a7a, 6);
    return;
  }
  explosion(x, z);
}
function explosion(x, z) {
  boom(x, z);
  sfx('boom', x, z);
  addNoise(x, z, 40);
  emitters.push({
    x,
    z,
    y: 0.5,
    rate: 50,
    life: 7,
    vy: 1.3,
    s0: 0.28,
    s1: 1.4,
    fire: 0.7,
    acc: 0,
    sp: 0.5,
    until: G.t + 25
  });
  for (const u of units) {
    if (!u.alive) continue;
    const d = Math.hypot(u.x - x, u.z - z);
    if (d > 2.4) continue;
    u.sup = 100;
    damage(u, 75 * (1 - d / 2.4) + 15, null);
  }
  for (let j = Math.floor(z) - 3; j <= Math.floor(z) + 3; j++)
    for (let i = Math.floor(x) - 3; i <= Math.floor(x) + 3; i++) {
      if (!inB(i, j)) continue;
      const k = idx(i, j);
      const o = cov[k];
      if (o && o.kind === 'barrel' && Math.hypot(o.i + 0.5 - x, o.j + 0.5 - z) < 2.2) {
        const oo = o;
        sched.push({
          at: G.t + 0.35,
          fn: () => {
            if (cov[oo.cells[0]] === oo) breakBarrel(oo);
          }
        });
      }
    }
}
