/* ====================================================================================================
 * sim/militia-idle.js
 *
 * La milicia tampoco son estatuas. Fuera de combate hablan entre ellos, señalan calle abajo, se agachan y se levantan;
 * en combate, el que tiene una pared o una esquina se esconde detrás entre ráfagas y se asoma para disparar.
 * ================================================================================================== */

'use strict';

function foeLife(e, dt) {
  if (e.rpg || e.dummy || e.tech || e.kind === 'tech') return;
  const L_ =
    e.fl || (e.fl = { next: rr(2, 8), pop: rr(1, 2.5), out: true, protT: 0, prot: false, side: rnd() < 0.5 ? 1 : -1 });
  if (e.auto && e.auto.alive && !e.moving && !e.pinned) {
    if (G.t > L_.protT) {
      L_.protT = G.t + 1.2;
      const i = Math.floor(e.x),
        j = Math.floor(e.z);
      L_.prot =
        coverProt(e, e.auto.x, e.auto.z).v > 0.3 ||
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ].some(([dx, dz]) => bAt(i + dx, j + dz) >= 0);
      const f = Math.atan2(e.auto.x - e.x, e.auto.z - e.z),
        lf_ = walk(i + Math.round(Math.cos(f)), j + Math.round(-Math.sin(f))),
        rt = walk(i - Math.round(Math.cos(f)), j - Math.round(-Math.sin(f)));
      L_.side = lf_ && !rt ? 1 : rt && !lf_ ? -1 : L_.side;
    }
    L_.pop -= dt;
    if (L_.pop <= 0) {
      L_.out = !L_.out;
      L_.pop = L_.out ? rr(1.6, 3.4) : rr(0.8, 2);
    }
    e.hide = !L_.out && L_.prot;
    if (e.hide) {
      e.cool = Math.max(e.cool, 0.3);
      if (e.stance === 'stand') e.stance = 'crouch';
    } else if (L_.prot) {
      e.peekS = L_.side;
      e.peekT = 0.35;
    }
    return;
  }
  e.hide = false;
  if (e.moving || e.pinned || e.sup > 15 || e.auto || !e.alive) return;
  L_.next -= dt;
  if (L_.next > 0) return;
  L_.next = rr(4, 11);
  const o = them.find(
      o =>
        o !== e && o.alive && !o.moving && !o.auto && !o.rpg && Math.abs(o.x - e.x) < 3.4 && Math.abs(o.z - e.z) < 3.4
    ),
    r = rnd();
  if (o && r < 0.5) {
    const T0 = rr(2.2, 3.6),
      f0 = e.face,
      g0 = o.face;
    e.face = Math.atan2(o.x - e.x, o.z - e.z);
    o.face = Math.atan2(e.x - o.x, e.z - o.z);
    e.chatT = e.talkT = T0;
    e.talkRadio = false;
    o.listenT = T0;
    if (o.fl) o.fl.next = Math.max(o.fl.next, T0 + 1.5);
    sched.push({
      at: G.t + T0 + 0.2,
      fn: () => {
        if (o.alive && !o.auto && !o.moving && rnd() < 0.7) {
          const T1 = rr(1.4, 2.4);
          o.chatT = o.talkT = T1;
          o.talkRadio = false;
          e.listenT = T1;
        }
      }
    });
    sched.push({
      at: G.t + T0 + 2.8,
      fn: () => {
        if (e.alive && !e.auto && !e.moving) e.face = f0;
        if (o.alive && !o.auto && !o.moving) o.face = g0;
      }
    });
  } else if (r < 0.72) {
    e.sigT = 1.7;
    e.sigK = 'point';
    if (o) {
      o.glanceA = e.face;
      o.glanceT = 2;
    }
  } else if (r < 0.88) {
    if (e.kind !== 'post') e.stance = e.stance === 'crouch' ? 'stand' : 'crouch';
  } else {
    e.glanceA = e.face + (rnd() < 0.5 ? -1 : 1) * rr(1.1, 1.6);
    e.glanceT = rr(1.4, 2.2);
  }
}
function nearestThreat(u) {
  let best = null,
    bd = 1e9;
  for (const e of them) {
    if (!e.alive) continue;
    let p = null;
    if (e.spotted) p = e;
    else {
      const g = G.ghosts.get(e);
      if (g && G.t - g.t < 15) p = g;
    }
    if (p) {
      const d = Math.hypot(p.x - u.x, p.z - u.z);
      if (d < bd) {
        bd = d;
        best = { x: p.x, z: p.z };
      }
    }
  }
  return best || (MIS.threat ? MIS.threat() : { x: u.x + 10, z: u.z });
}
