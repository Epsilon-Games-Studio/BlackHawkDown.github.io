/* ====================================================================================================
 * missions/common/helpers.js
 *
 * Misiones: el cruce original y dos misiones largas de prueba, una de día y otra de noche
 * ================================================================================================== */

'use strict';

const ESPEC2 = { acc: 0.16, burst: 4, cool: 1.8, supp: 9, ammo: 99999, hp: 70, gun: 'ak' };
const S61 = { x: LM.s61.x, z: LM.s61.z },
  S64 = { x: LM.s64.x, z: LM.s64.z };
function findWalk(x, z) {
  const i0 = Math.floor(x),
    j0 = Math.floor(z);
  for (let r = 0; r < 40; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (walk(i0 + di, j0 + dj)) return [i0 + di, j0 + dj];
      }
  return nearestFree(i0, j0);
}
function foe(x, z, kind, tag, extra) {
  const c = findWalk(x, z);
  const e = makeUnit('them', c[0], c[1], Object.assign({ kind, tag, name: 'Miliciano' }, ESPEC2, extra || {}));
  if (kind === 'post') e.stance = 'crouch';
  if (kind === 'wave') e.nextMove = (G ? G.t : 0) + rnd() * 2;
  return e;
}
const tagged = t => them.filter(e => e.tag === t);
const tagDone = t => tagged(t).every(e => !e.alive);
const tagCount = t => {
  const L = tagged(t);
  return [L.filter(e => !e.alive).length, L.length];
};
// una oleada de milicia desde un lado, fuera de la vista, corriendo hacia la escuadra
function waveFrom(cx, cz, ang, n, tag, dist) {
  G.alert = true;
  dist = dist || 40;
  const bx = cx + Math.cos(ang) * dist,
    bz = cz + Math.sin(ang) * dist;
  for (let k = 0; k < n; k++) foe(bx + rr(-4, 4), bz + rr(-4, 4), 'wave', tag);
  const dir = compass(Math.cos(ang), Math.sin(ang));
  logMsg('Radio: milicia acercándose desde el ' + dir + '.', 'bad');
  autoPause('ataque desde el ' + dir);
}
function inBNear(x, z, r, level) {
  return us.filter(u => {
    if (!u.alive || !u.inB) return false;
    if (level && u.inB.level !== level) return false;
    const b = BLDS[u.inB.b];
    return Math.hypot(b.x + b.w / 2 - x, b.y + b.d / 2 - z) < r;
  }).length;
}
const fmtLeft = s => {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
// una defensa con reloj: oleadas cada cierto tiempo desde lados que cambian hasta que se acaba el tiempo
function holdSub(text, secs, every, n, cx, cz, radio) {
  return {
    text,
    zone: { x: cx, z: cz, r: 14 },
    start: () => {
      G.holdEnd = G.t + secs;
      G.nextWave = G.t + 20;
      G.waveN = 0;
    },
    tick: () => {
      if (G.t >= G.nextWave && G.t < G.holdEnd - 25) {
        G.nextWave = G.t + every;
        G.waveN++;
        waveFrom(cx, cz, rnd() * Math.PI * 2, n + Math.min(3, G.waveN >> 1), 'hold');
      }
    },
    count: () => 'quedan ' + fmtLeft(G.holdEnd - G.t),
    done: () => G.t >= G.holdEnd,
    radio
  };
}
/* Equipo de mortero: mientras viva, caen proyectiles cerca de la escuadra */
function mortarShell() {
  const c = squadCenter();
  if (!c) return;
  const x = c.x + rr(-7, 7),
    z = c.z + rr(-7, 7);
  logMsg('¡Mortero! ¡A cubierto!', 'bad');
  sched.push({
    at: G.t + 1.6,
    fn: () => {
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
  });
}
/* Fardos de suministros lanzados por un Black Hawk: una caja bajo un paracaídas desparramado, un bote de humo y un anillo */
let CRATES = [];
function dropCrates(pts) {
  CRATES = pts.map(p => {
    const c = findWalk(p[0], p[1]),
      x = c[0] + 0.5,
      z = c[1] + 0.5,
      g = new T.Group();
    g.position.set(x, 0, z);
    world.add(g);
    const box_ = new T.Mesh(UBOX, new T.MeshLambertMaterial({ color: 0x5a5e3a }));
    box_.scale.set(0.8, 0.55, 0.7);
    box_.position.y = 0.28;
    box_.castShadow = true;
    g.add(box_);
    const chute = new T.Mesh(
      new T.SphereGeometry(0.9, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshLambertMaterial({ color: 0xd8d4c4, side: T.DoubleSide })
    );
    chute.scale.set(1.2, 0.25, 1);
    chute.position.set(0.9, 0, 0.4);
    chute.rotation.z = 0.3;
    g.add(chute);
    const em = { x, z, y: 0.3, rate: 10, life: 7, vy: 1.1, s0: 0.25, s1: 1.5, fire: 0, acc: 0, sp: 0.12 };
    emitters.push(em);
    const ring = grounded(ovRing(0.9, 1.1, 0xe7a63d, 0.9), 0.08);
    ring.position.x = x;
    ring.position.z = z;
    return { x, z, g, em, ring, got: false };
  });
}
function pickCrates() {
  for (const c of CRATES) {
    if (c.got) continue;
    if (us.some(u => u.alive && !u.inB && Math.hypot(u.x - c.x, u.z - c.z) < 1.5)) {
      c.got = true;
      world.remove(c.g);
      overlay.remove(c.ring);
      c.em.until = G.t;
      logMsg('Suministro recogido.', 'us');
    }
  }
}
