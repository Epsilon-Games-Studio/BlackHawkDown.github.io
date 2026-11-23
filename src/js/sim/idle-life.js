/* ====================================================================================================
 * sim/idle-life.js
 *
 * Vida entre órdenes: los soldados sin nada que hacer no se quedan como estatuas.
 * Cada uno coge su sector y lo barre, hinca la rodilla o se levanta, el jefe señala, rellenan un cargador,
 * revisan el fusil o se giran hacia el de al lado y hablan con las manos. Nada de esto cambia lo que pueden hacer en combate.
 * ================================================================================================== */

'use strict';

const IDLE_ACTS = [
  'kneel',
  'kneel',
  'point',
  'reload',
  'inspect',
  'inspect',
  'talk',
  'talk',
  'glance',
  'glance',
  'vest',
  'high',
  'peek',
  'peek',
  'shuffle',
  'shuffle',
  'shuffle',
  'shuffle'
];
function idleOK(u) {
  return (
    u.alive &&
    !u.down &&
    !u.gone &&
    !u.moving &&
    !u.path.length &&
    !u.auto &&
    !(u.firing > 0) &&
    !u.reloading &&
    !u.healing &&
    !u.pinned &&
    u.sup < 30 &&
    !u.poseName &&
    u.pushup == null &&
    !u.slide &&
    !u.mounted &&
    u.stairT == null &&
    u.stance !== 'prone' &&
    !u.board &&
    u.lane == null &&
    !u.ride &&
    !u.noIdle &&
    !(u.order && (u.order.type === 'attack' || u.order.type === 'suppress')) &&
    !(u.inB && u.inB.level === 'ground')
  );
}
const idleMates = (u, r) =>
  us.filter(
    o =>
      o !== u &&
      o.idl &&
      o.idl.on &&
      Math.hypot(o.x - u.x, o.z - u.z) < r &&
      (o.grp === u.grp || o.unitName === u.unitName || r < 4)
  );
// uno va hacia otro, le dice algo, le pasa algo o le da en el hombro y señala, y vuelve a su sitio
function visitStep(u, I, dt) {
  const V_ = I.visit,
    o = V_.o;
  if (
    CINE.on ||
    !u.alive ||
    u.down ||
    u.order ||
    u.auto ||
    u.sup > 18 ||
    u.inB ||
    !o.alive ||
    o.down ||
    (V_.st !== 'back' && (o.moving || o.auto))
  ) {
    I.visit = null;
    if (!u.order) u.path = [];
    return false;
  }
  V_.t += dt;
  if (V_.st === 'go') {
    if (!u.path.length && !u.moving) {
      if (Math.hypot(o.x - u.x, o.z - u.z) > 2.2 || V_.t < 0.3) {
        I.visit = null;
        return false;
      }
      V_.st = 'talk';
      V_.t = 0;
      V_.T = rr(2.6, 4.2);
      V_.kind = pick(['talk', 'talk', 'give', 'tap']);
      u.chatT = u.talkT = V_.T * 0.6;
      u.talkRadio = false;
      o.listenT = V_.T;
      if (o.idl) {
        o.idl.to = u;
        o.idl.lockT = G.t + V_.T;
        o.idl.next = Math.max(o.idl.next, V_.T + 1);
      }
      if (V_.kind === 'give') {
        sched.push({
          at: G.t + 0.5,
          fn: () => {
            if (u.alive && I.visit === V_) {
              u.giveT = 1.3;
              o.giveT = 1.1;
            }
          }
        });
      }
      if (V_.kind === 'tap') {
        u.tapT = 0.9;
        sched.push({
          at: G.t + 1.0,
          fn: () => {
            if (u.alive && I.visit === V_) {
              const a = Math.atan2(o.x - u.x, o.z - u.z) + rr(-1.3, 1.3);
              u.sigT = 1.6;
              u.sigK = 'point';
              V_.pA = a;
              o.glanceA = a;
              o.glanceT = 2;
            }
          }
        });
      }
    }
    return true;
  }
  if (V_.st === 'talk') {
    u.face = V_.pA != null && u.sigT > 0 ? V_.pA : Math.atan2(o.x - u.x, o.z - u.z);
    if (o.wall == null && !o.moving) o.face = Math.atan2(u.x - o.x, u.z - o.z);
    if (V_.t > V_.T) {
      V_.st = 'back';
      V_.t = 0;
      u.path = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), V_.home[0], V_.home[1]), u.x, u.z) || [];
    }
    return true;
  }
  if (!u.path.length && !u.moving) {
    I.visit = null;
    I.next = rr(3, 7);
    return false;
  }
  return true;
}
function idleLife(u, dt) {
  const I =
    u.idl || (u.idl = { on: false, t: 0, next: rr(1.5, 4), sector: null, sw: rnd() * 6.28, to: null, lockT: 0 });
  if (I.visit) {
    I.visit = null;
  }
  if (I.shuf) {
    const q = I.shuf,
      dx = q.x - u.x,
      dz = q.z - u.z,
      d = Math.hypot(dx, dz);
    if (!idleOK(u) || CINE.on || d < 0.04 || G.t > q.until) {
      I.shuf = null;
      u.vx = u.vz = 0;
    } else {
      const v = Math.min(0.75, d * 3 + 0.15);
      u.vx = (dx / d) * v;
      u.vz = (dz / d) * v;
    }
  }
  if (CINE.on || !idleOK(u)) {
    if (I.on) {
      I.on = false;
      I.to = null;
      u.idleKneel = false;
      u.chatT = 0;
    }
    I.t = 0;
    I.next = Math.max(I.next, rr(1, 2.5));
    return;
  }
  I.on = true;
  I.t += dt;
  I.next -= dt;
  // el sector: hacia fuera del centro de los que tiene alrededor, o hacia la amenaza cuando está solo
  if (I.sector == null || (I.t > 0.8 && I.secT == null) || G.t > (I.secT || 0)) {
    const M_ = idleMates(u, 6);
    if (M_.length) {
      const cx = (M_.reduce((a, o) => a + o.x, 0) + u.x) / (M_.length + 1),
        cz = (M_.reduce((a, o) => a + o.z, 0) + u.z) / (M_.length + 1);
      I.sector = Math.hypot(u.x - cx, u.z - cz) > 0.25 ? Math.atan2(u.x - cx, u.z - cz) : u.face + rr(-1.2, 1.2);
    } else {
      const th = nearestThreat(u);
      I.sector = Math.atan2(th.x - u.x, th.z - u.z) + rr(-0.5, 0.5);
    }
    I.secT = G.t + rr(8, 15);
  }
  // mirando: un barrido lento del sector, o hacia el que le habla, o hacia donde señala
  if (u.wall == null) {
    let want = I.sector + Math.sin(I.t * 0.35 + I.sw) * 0.55 + Math.sin(I.t * 0.13 + I.sw * 2) * 0.25;
    if (I.to && G.t < I.lockT && I.to.alive) want = Math.atan2(I.to.x - u.x, I.to.z - u.z);
    else if (I.pointA != null && G.t < I.lockT) want = I.pointA;
    else {
      I.to = null;
      I.pointA = null;
    }
    if (I.t > 0.6) u.face = want;
  }
  if (I.next > 0) return;
  I.next = rr(4, 9);
  const act = pick(IDLE_ACTS);
  if (act === 'kneel') {
    u.idleKneel = !u.idleKneel;
    if (!u.idleKneel) I.next = rr(3, 6);
  } else if (act === 'point') {
    const lead =
      u.kit === 'radio' || u.name.includes('Sgto') || u.name.includes('Tte') || u.name.includes('Cap') || rnd() < 0.25;
    if (!lead) {
      I.next = 1;
      return;
    }
    I.pointA = I.sector + rr(-0.9, 0.9);
    I.lockT = G.t + 2.2;
    u.sigT = 1.8;
    u.sigK = 'point';
    for (const o of idleMates(u, 7))
      if (rnd() < 0.8) {
        o.glanceA = I.pointA;
        o.glanceT = rr(1.4, 2.2);
      } // los demás miran hacia donde señala
  } else if (act === 'reload') {
    if (u.mag < u.magSize && u.ammo > u.mag) {
      u.reloading = true;
      u.reloadT = 0;
      reloadSnd(u);
    } // rellenando un cargador que no está lleno
    else if (u.m) u.m.fid = { k: 'inspect', t: 0, d: rr(2.6, 3.6), dir: rnd() < 0.5 ? -1 : 1 };
  } else if (act === 'inspect') {
    if (u.m) u.m.fid = { k: 'inspect', t: 0, d: rr(2.6, 3.8), dir: rnd() < 0.5 ? -1 : 1 };
  } else if (act === 'talk') {
    const o = idleMates(u, 3.4).filter(o => !(o.chatT > 0))[0];
    if (!o) {
      I.next = 1.5;
      return;
    }
    const T0 = rr(2.6, 3.8);
    I.to = o;
    I.lockT = G.t + T0 + 2.6;
    o.idl.to = u;
    o.idl.lockT = G.t + T0 + 2.6;
    o.idl.next = Math.max(o.idl.next, T0 + 2);
    u.chatT = T0;
    u.talkT = T0;
    o.listenT = T0;
    if (rnd() < 0.65)
      sched.push({
        at: G.t + T0 + 0.3,
        fn: () => {
          if (o.alive && o.idl && o.idl.on && o.idl.to === u) {
            const T1 = rr(1.6, 2.6);
            o.chatT = T1;
            o.talkT = T1;
            u.listenT = T1;
          }
        }
      }); // y el otro le contesta
  } else if (act === 'glance') {
    u.glanceA = u.face + (rnd() < 0.5 ? -1 : 1) * rr(1.1, 1.7);
    u.glanceT = rr(1.3, 2.2);
  } else if (act === 'vest' || act === 'high') {
    if (u.m) u.m.fid = { k: act, t: 0, d: act === 'vest' ? rr(2.4, 3.4) : rr(2, 3.2), dir: 1 };
  } else if (act === 'peek') {
    // contra una pared con la esquina a un paso: se asoma y mira
    if (u.wall == null) {
      I.next = 1;
      return;
    }
    const f = u.wall,
      fx_ = Math.sin(f),
      fz_ = Math.cos(f),
      i = Math.floor(u.x),
      j = Math.floor(u.z);
    let side = 0;
    for (const sd of rnd() < 0.5 ? [1, -1] : [-1, 1]) {
      const li = i + Math.round(Math.cos(f) * sd),
        lj = j + Math.round(-Math.sin(f) * sd);
      if (walk(li, lj) && bAt(li - Math.round(fx_), lj - Math.round(fz_)) < 0) {
        side = sd;
        break;
      }
    }
    if (!side) {
      I.next = 1.5;
      return;
    }
    u.peekS = side;
    u.peekT = rr(1.8, 3);
    I.next = Math.max(I.next, u.peekT + 2);
  } else if (act === 'shuffle') {
    if (u.wall != null || u.stance === 'prone') {
      I.next = 1;
      return;
    }
    if (I.home == null || Math.hypot(I.home[0] - u.x, I.home[1] - u.z) > 1.2) I.home = [u.x, u.z];
    for (let n = 0; n < 6; n++) {
      const a = rnd() * 6.283,
        r = rr(0.3, 0.55);
      let x = I.home[0] + Math.cos(a) * r,
        z = I.home[1] + Math.sin(a) * r;
      if (Math.hypot(x - u.x, z - u.z) < 0.2) {
        x = I.home[0];
        z = I.home[1];
      }
      if (!walk(Math.floor(x), Math.floor(z))) continue;
      if (units.some(o => o !== u && o.alive && Math.hypot(o.x - x, o.z - z) < 0.6)) continue;
      u.idleKneel = false;
      I.shuf = { x, z, until: G.t + 2.5 };
      I.next = Math.max(I.next, rr(2.5, 5));
      return;
    }
    I.next = 1.5;
  } else if (act === 'visit') {
    if (u.wall != null && rnd() < 0.5) {
      I.next = 1.5;
      return;
    }
    if (
      G.noise.some(n => G.t - n.t < 12 && Math.hypot(n.x - u.x, n.z - u.z) < 22) ||
      them.some(e => e.alive && e.spotted && Math.hypot(e.x - u.x, e.z - u.z) < 26)
    ) {
      I.next = 2;
      return;
    }
    const o = idleMates(u, 5.5).filter(
      o =>
        !(o.chatT > 0) &&
        !o.idl.visit &&
        Math.hypot(o.x - u.x, o.z - u.z) > 1.6 &&
        !us.some(q => q.idl && q.idl.visit && q.idl.visit.o === o)
    )[0];
    if (!o) {
      I.next = 1.5;
      return;
    }
    let best = null,
      bd = 1e9;
    for (const [dx, dz] of DIRS) {
      const ci = Math.floor(o.x) + dx,
        cj = Math.floor(o.z) + dz;
      if (!walk(ci, cj) || units.some(q => q.alive && Math.floor(q.x) === ci && Math.floor(q.z) === cj)) continue;
      const d = Math.hypot(ci + 0.5 - u.x, cj + 0.5 - u.z);
      if (d < bd) {
        bd = d;
        best = [ci, cj];
      }
    }
    if (!best || bd < 0.8) {
      I.next = 1.5;
      return;
    }
    PF.noVault = true;
    const pth = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), best[0], best[1]), u.x, u.z);
    PF.noVault = false;
    if (!pth || !pth.length || pth.length > 9) {
      I.next = 1.5;
      return;
    }
    I.visit = { o, home: [Math.floor(u.x), Math.floor(u.z)], st: 'go', t: 0 };
    u.idleKneel = false;
    u.path = pth;
    u.stance = 'stand';
  }
}
