/* ====================================================================================================
 * combat/bleeding.js
 *
 * Desangrarse: un hombre que se queda sangrando (por debajo del 70 % de vida) durante un minuto cae. En el suelo se llena un reloj rojo
 * a su alrededor en diez segundos; si nadie le está atendiendo cuando se cierra, muere. A los muertos no se les deja atrás: uno de su
 * unidad (nunca el sanitario) va a por él y lo lleva a cuestas el resto de la misión, más despacio.
 * ================================================================================================== */

'use strict';

const BLEED_T = 60,
  BLEED_DK = 10;
function bleedTick(dt) {
  if (!G || !G.started || G.over || CINE.on || MIS.id === 'attract') return;
  for (const u of us) {
    if (u.npc || u.god || u.mounted || u.medevac || u.dummy) continue;
    if (u.alive && u.drill) u.bleedT = 0;
    else if (u.alive && u.hp < u.hp0 * 0.7) {
      const was = u.bleedT || 0;
      u.bleedT = was + dt;
      if (was < 30 && u.bleedT >= 30) {
        logMsg(`${u.name} se está desangrando`, 'bad');
        radio(
          u,
          pick([
            '¡Me estoy desangrando! ¡Sanitario!',
            '¡Sigo sangrando! ¡Que alguien me vende!',
            '¡No para de sangrar!'
          ])
        );
      }
      if (was < 45 && u.bleedT >= 45)
        hint('Un herido se desangra: selecciona su pelotón y pulsa Atender heridos antes de que caiga.');
      if (u.bleedT >= BLEED_T) bleedFall(u);
    } else if (u.alive) u.bleedT = 0;
    if (u.down && u.bleedOut) {
      if (!(u.reviveT > 0 && u.dkHeld)) u.dkT = (u.dkT || 0) + dt;
      if (u.drill && u.dkT > 6) u.dkT = 6;
      u.dkHeld = false;
      if (u.dkT >= BLEED_DK) kia(u);
    }
  }
  bodiesTick(dt);
}
function bleedFall(u) {
  if (u.inB) leaveB(u);
  u.hp = 0;
  u.alive = false;
  u.down = true;
  u.bleedOut = true;
  u.dkT = 0;
  u.bleedT = 0;
  u.reviveT = 0;
  u.path = [];
  u.order = null;
  G.sel.delete(u);
  u.reloading = false;
  u.deathT = G.t;
  u.deadDir = -1;
  u.deadTwist = rr(-0.3, 0.3);
  u.vx = u.vz = 0;
  G.downs++;
  bleed(u, null, 6);
  sched.push({ at: G.t + 0.9, fn: () => bloodDecal(u.x, u.z, rr(0.4, 0.55), 5) });
  logMsg(`¡${u.name} cae desangrado!`, 'bad');
  hint('¡Hombre desangrándose! Tienes 10 segundos: Atender heridos con su pelotón o lo perderás.');
  autoPause('hombre caído');
}
function kia(u) {
  u.down = false;
  u.bleedOut = false;
  u.kia = true;
  u.alive = false;
  u.dkT = BLEED_DK;
  u.reviveT = 0;
  u.deathT = G.t - 1;
  G.kia = (G.kia || 0) + 1;
  logMsg(`${u.name} ha muerto`, 'bad');
  const c = us.filter(o => o.alive && !o.npc && o !== u).sort((a, b) => dist(a, u) - dist(b, u))[0];
  if (c)
    radio(
      c,
      pick([
        `¡Lo hemos perdido! ¡${trName(u.name)} ha muerto!`,
        'No respira... Se ha ido.',
        `¡${trName(u.name)}! ¡Mierda, se nos ha ido!`
      ])
    );
  (G.bodies = G.bodies || []).push(u);
}
// primero los de su unidad, luego cualquiera; nunca el sanitario ni uno que ya lleve a otro
function bodyUnit(b) {
  if (typeof IRN !== 'undefined' && IRN.groups) {
    const g = IRN.groups.find(g_ => g_.members.includes(b));
    if (g) return g.members;
  }
  return us;
}
function canCarry(o) {
  return (
    o.alive &&
    !o.npc &&
    !o.medic &&
    !o.carrying &&
    !o.mounted &&
    !o.ride &&
    !o.board &&
    !(o.kdT > G.t) &&
    !(o.inB && o.inB.level === 'ground') &&
    (o.elev || 0) < 0.1
  );
}
function bodiesTick(dt) {
  if (!G.bodies || !G.bodies.length) return;
  G.bodyT = (G.bodyT || 0) - dt;
  for (const b of G.bodies) {
    if (b.stowed) continue;
    const c = b.carriedBy;
    if (c) {
      // lo suelta si cae el que lo lleva, o embarca con él cuando sube
      if (c.mounted || c.board) {
        b.stowed = true;
        b.carriedBy = null;
        c.carrying = null;
        if (b.m && b.m.root.parent) world.remove(b.m.root);
        dropOverlay(b);
        continue;
      }
      if (!c.alive) {
        b.carriedBy = null;
        c.carrying = null;
        b.x = c.x + rr(-0.4, 0.4);
        b.z = c.z + rr(-0.4, 0.4);
        b.elev = 0;
        logMsg(`${c.name} suelta el cuerpo de ${b.name}`, 'bad');
      } else {
        b.x = c.x;
        b.z = c.z;
        continue;
      }
    }
    // lo recoge alguien que esté lo bastante cerca
    const near = us
      .filter(o => canCarry(o) && Math.hypot(o.x - b.x, o.z - b.z) < 1.6)
      .sort((p, q) => (bodyUnit(b).includes(q) ? 1 : 0) - (bodyUnit(b).includes(p) ? 1 : 0))[0];
    if (near) {
      pickBody(near, b);
      continue;
    }
    // si no, va a por él el hombre libre más cercano de su unidad
    if (G.bodyT > 0) continue;
    if (
      b.fetcher &&
      b.fetcher.alive &&
      b.fetcher.order &&
      b.fetcher.order.type === 'fetch' &&
      b.fetcher.order.body === b
    )
      continue;
    const pool = bodyUnit(b).filter(
      o =>
        canCarry(o) &&
        !o.pinned &&
        !(o.order && o.order.type !== 'cover' && o.order.type !== 'hold' && o.order.type !== 'fetch') &&
        !o.path.length &&
        Math.hypot(o.x - b.x, o.z - b.z) < 30
    );
    const f = pool.sort((p, q) => dist(p, b) - dist(q, b))[0];
    if (f) {
      const cl = nearestFree(Math.floor(b.x), Math.floor(b.z)),
        pth = smoothPath(findPath(Math.floor(f.x), Math.floor(f.z), cl[0], cl[1]), f.x, f.z);
      if (pth && pth.length) {
        f.path = pth;
        f.order = { type: 'fetch', body: b };
        f.stance = 'stand';
        b.fetcher = f;
        if (!b.fetchSaid) {
          b.fetchSaid = true;
          radio(
            f,
            pick([
              'Voy a por él. Nadie se queda atrás.',
              'Yo lo llevo. No lo dejamos aquí.',
              '¡Cubridme, voy a por él!'
            ])
          );
        }
      }
    }
  }
  if (G.bodyT <= 0) G.bodyT = 2;
}
function pickBody(c, b) {
  c.carrying = b;
  b.carriedBy = c;
  b.fetcher = null;
  if (c.order && c.order.type === 'fetch') c.order = null;
  if (c.stance === 'prone') c.stance = 'crouch';
  logMsg(`${c.name} carga con ${b.name}`, 'us');
  radio(
    c,
    pick(['Lo tengo. Nos lo llevamos.', 'Lo llevo a cuestas. Seguimos.', 'Arriba, hermano. Te sacamos de aquí.'])
  );
}
// el cuerpo sobre los hombros del que lo lleva, cruzado en la espalda
const SLUNG = { side: 0.16, back: 0, y: 0.56, pitch: 0.4 };
function syncBody(u) {
  const c = u.carriedBy,
    r = u.m.root;
  if (!c || !c.m) return false;
  const cr = c.m.root,
    low = c.stance === 'prone' ? 0.55 : c.stance === 'crouch' ? 0.42 : 0,
    yaw = cr.rotation.y,
    sx = Math.cos(yaw),
    sz = -Math.sin(yaw);
  // doblado sobre su hombro derecho: las caderas arriba, el tronco colgando por la espalda y las piernas por delante
  r.position.set(
    c.x + sx * SLUNG.side - Math.sin(yaw) * SLUNG.back,
    (c.elev || 0) + SLUNG.y - low,
    c.z + sz * SLUNG.side - Math.cos(yaw) * SLUNG.back
  );
  r.rotation.y = yaw + Math.PI;
  r.visible = cr.visible;
  const b = u.m.body;
  b.rotation.set(SLUNG.pitch, 0, 0);
  b.position.set(0, 0, 0);
  if (u.m.gun) u.m.gun.visible = false;
  return true;
}
