/* ====================================================================================================
 * sim/fatigue.js
 *
 * Fatiga (solo los nuestros): 100 es fresco. Correr por orden y estar bajo fuego intenso desgasta a un hombre; la recupera
 * quieto y fuera del fuego, más rápido de rodillas o a cubierto dentro. Un hombre cansado se mueve y dispara más despacio y falla más; a cero está
 * reventado: se va a la cobertura más cercana y no acepta órdenes de moverse hasta que recupera el aliento.
 * ================================================================================================== */

'use strict';

function updFatigue(u, dt, moving) {
  if (u.fat == null) u.fat = 100;
  if (CINE.on || u.mounted || u.ride || u.board || u.down) return;
  let d = 0;
  if (moving && u.order) d -= (u.sneak ? 1.1 : 2.6) * (u.hp < u.hp0 * 0.5 ? 1.35 : 1);
  if (u.pinned) d -= 2.4;
  else if (u.sup > 55) d -= 0.5 + (1.6 * (u.sup - 55)) / 45;
  if (!moving && !u.pinned && u.sup <= 55) d += (u.sup < 20 ? 4.6 : 2.0) * (u.stance !== 'stand' || u.inB ? 1.3 : 1);
  u.fat = clamp(u.fat + d * dt, 0, 100);
  if (!u.spent && u.fat <= 0) {
    u.spent = true;
    if (u.order && (u.order.type === 'move' || u.order.type === 'attack') && !u.inB) {
      const c = findCover(Math.floor(u.x), Math.floor(u.z), nearestThreat(u), 5, new Set());
      u.path = c ? smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z) || [] : [];
      u.order = { type: 'cover' };
      if (!u.path.length) u.stance = 'crouch';
    }
    if (G.t - (G.spentT || -99) > 6) {
      G.spentT = G.t;
      radio(
        u,
        pick([
          '¡No puedo más! Necesito un respiro.',
          'Estoy reventado. Me quedo a cubierto.',
          '¡Sin aliento! Dadme un minuto.'
        ])
      );
    }
  } else if (u.spent && u.fat >= 35) u.spent = false;
}
// bajando por la cuerda: rápido al principio, luego aprieta manos y botas y frena hasta ir a paso de andar los últimos metros
function ropeSpeed(v, h, dt) {
  v = v || 0.6;
  const top = h > 1.6 ? 5.6 : 1.3 + (2.7 * Math.max(0, h - 0.2)) / 1.4;
  return v < top ? Math.min(top, v + dt * 10) : Math.max(top, v - dt * 16);
}
function updUnit(u, dt) {
  if (!u.alive) return;
  if (kdUpd(u)) return;
  if (u.dummy) {
    u.sup = Math.max(0, u.sup - 14 * dt);
    return;
  }
  if (u.pushup != null) {
    u.sup = 0;
    u.stance = 'prone';
    return;
  }
  if (u.slide) {
    u.ropeV = ropeSpeed(u.ropeV, u.elev || 0, dt);
    u.elev = Math.max(0, (u.elev || 0) - dt * u.ropeV);
    if (u.elev <= 0) {
      u.slide = false;
      u.elev = 0;
      u.landT = 0.55;
      u.ropeV = 0;
    }
    return;
  }
  u.sup = Math.max(0, u.sup - (u.sup > 60 ? 10 : 16) * dt);
  u.pinned = u.sup >= 92 || (u.pinned && u.sup > 60);
  if (u.firing > 0) u.firing -= dt;
  const foes = u.team === 'us' ? them : us;
  if (u.team === 'them') {
    u.thinkT -= dt;
    if (u.thinkT <= 0) {
      u.thinkT = 0.8 + rnd() * 0.7;
      aiThink(u);
    }
  }

  const o = u.order;
  if (o && o.type === 'attack') {
    if (!o.target.alive) {
      u.order = null;
    } else {
      o.rT -= dt;
      const seeT = dist(u, o.target) < RANGE && losU(u, o.target);
      if (seeT) {
        if (u.path.length) u.path = [];
      } else if (o.rT <= 0 && !u.pinned && !u.inB && !u.spent) {
        o.rT = 1.5;
        const c = nearestFree(Math.floor(o.target.x), Math.floor(o.target.z));
        u.path = findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]) || [];
        u.stance = 'stand';
      }
    }
  }
  if (o && o.type === 'suppress' && G.t > o.until) u.order = null;

  if (u.stumT > 0) u.stumT -= dt;
  if (!u.path.length && !u.inB && !u.mounted && vaultCell(Math.floor(u.x), Math.floor(u.z))) {
    u.path = [nearestFree(Math.floor(u.x), Math.floor(u.z))];
  } // nunca se queda de pie metido en una pared
  if (u.team === 'them') foeLife(u, dt);
  let moving = false;
  const spd =
    u.spd *
    (u.hp < u.hp0 * 0.5 ? 0.6 : 1) *
    (u.sup > 50 ? 0.65 : 1) *
    (u.team === 'them' ? 0.9 : 1) *
    (u.sneak ? 0.55 : 1) *
    (u.fat != null && u.order ? 0.6 + (0.4 * u.fat) / 100 : 1) *
    (u.stumT > 0 ? 0.3 : 1) *
    (u.vault ? 0.72 : 1) *
    (u.fgMul || 1) *
    (u.carrying ? 0.58 : 1);
  if (u.path.length && (!u.pinned || u.vault)) {
    const n = u.path[0];
    if (!u.vault) {
      u.vsT = (u.vsT || 0) - dt;
      if (u.vsT <= 0) {
        u.vsT = 0.12;
        vaultScan(u);
      }
    }
    if (!walk(n[0], n[1])) {
      u.path = [];
    } else {
      let tx = n[0] + 0.5,
        tz = n[1] + 0.5;
      const d0 = Math.hypot(tx - u.x, tz - u.z),
        last = u.path.length === 1;
      if (u.team === 'us' && !last) {
        // persecución: apunta a un punto 1,1 m más adelante en la ruta (pasando la siguiente esquina), lo que convierte la esquina en un arco
        let px = u.x,
          pz = u.z,
          rem = 1.1,
          k = 0,
          ax = null,
          az = null;
        while (k < u.path.length && k < 4) {
          const qx = u.path[k][0] + 0.5,
            qz = u.path[k][1] + 0.5,
            sl = Math.hypot(qx - px, qz - pz);
          if (sl >= rem) {
            ax = px + ((qx - px) * rem) / sl;
            az = pz + ((qz - pz) * rem) / sl;
            break;
          }
          rem -= sl;
          px = qx;
          pz = qz;
          k++;
        }
        if (ax == null) {
          ax = px;
          az = pz;
        }
        tx = ax;
        tz = az;
        // la esquina cuenta como alcanzada cuando está cerca de ella o la ha pasado
        const n2 = u.path[1],
          ox = n2[0] + 0.5 - (n[0] + 0.5),
          oz = n2[1] + 0.5 - (n[1] + 0.5);
        if (d0 < 0.55 || ((u.x - n[0] - 0.5) * ox + (u.z - n[1] - 0.5) * oz > 0 && d0 < 1.4)) u.adv = true;
      } else if (!last && d0 < 0.7) {
        const n2 = u.path[1],
          t = (1 - d0 / 0.7) * 0.6;
        tx += (n2[0] + 0.5 - tx) * t;
        tz += (n2[1] + 0.5 - tz) * t;
      }
      const dx = tx - u.x,
        dz = tz - u.z,
        d = Math.hypot(dx, dz) || 1e-4;
      const want = last ? Math.min(spd, d0 * 3.2 + 0.25) : spd;
      const a = 1 - Math.exp(-7 * dt);
      u.vx += ((dx / d) * want - u.vx) * a;
      u.vz += ((dz / d) * want - u.vz) * a;
      u.x += u.vx * dt;
      u.z += u.vz * dt;
      if (u.adv || (last ? d0 < 0.06 : u.team !== 'us' && d0 < 0.35)) {
        u.adv = false;
        u.path.shift();
        if (!u.path.length) {
          arrive(u);
        }
      }
      moving = true;
      if (u.path.length && u.stance !== 'stand') u.stance = 'stand'; // no en el último paso: arrive() acaba de decidir cómo espera
    }
  }
  if (!moving) {
    const f = Math.exp(-10 * dt);
    u.vx *= f;
    u.vz *= f;
    if (Math.abs(u.vx) + Math.abs(u.vz) > 0.01) {
      const nx = u.x + u.vx * dt,
        nz = u.z + u.vz * dt;
      if (walk(Math.floor(nx), Math.floor(nz))) {
        u.x = nx;
        u.z = nz;
      }
    } else {
      u.vx = u.vz = 0;
    }
  }
  const vsp = Math.hypot(u.vx, u.vz);
  if (vsp > 0.25 && moving) u.face = Math.atan2(u.vx, u.vz);
  u.moving = moving;
  if (
    moving &&
    !u.vault &&
    !(u.stumT > 0) &&
    vsp > 1.7 &&
    rnd() < dt * (u.team === 'us' ? (u.fat != null && u.fat < 35 ? 0.03 : 0.008) : 0.006)
  )
    u.stumT = 0.8; // muy de vez en cuando uno que corre pierde pie
  if (u.team === 'us' && !u.npc) updFatigue(u, dt, moving);
  if (moving && u.team === 'us' && u.order && u.order.type === 'move' && u.sup > 45) {
    u.path = [];
    u.order = null;
    u.stance = 'crouch';
    moving = u.moving = false;
    if (G.t - (G.downT || -9) > 4) {
      G.downT = G.t;
      radio(u, pick(['¡Nos disparan! ¡Al suelo!', '¡Fuego enemigo, cubríos!', '¡Contacto! ¡Abajo!']));
    }
  }
  if (!moving) {
    if (u.pinned) u.stance = 'prone';
    else if (u.stance === 'prone') u.stance = 'crouch';
    else if (u.sup > 30 && u.stance === 'stand') u.stance = 'crouch';
  }

  if (u.reloading) {
    u.reloadT += dt;
    if (u.reloadT >= u.reloadDur) {
      u.reloading = false;
      u.mag = Math.min(u.magSize, u.ammo);
    }
  } else if (u.mag <= 0 && u.ammo > 0 && !u.pist) {
    // sin balas con el enemigo cerca: no hay tiempo para cambiar el cargador. El fusil cae de la correa y saca la pistola
    if (u.hasPistol && !moving && !u.pinned && !u.inB && u.auto && u.auto.alive && dist(u, u.auto) < 9.5) {
      u.pist = { st: 0, t: 0, shots: 3 + ri(4), cool: 0 };
      if (rnd() < 0.45) radio(u, pick(['¡Seco! ¡Pistola!', '¡Cambio a pistola!', '¡Sin cargador! ¡Pistola!']));
    } else {
      u.reloading = true;
      u.reloadT = 0;
      reloadSnd(u);
      if (u.team === 'us' && rnd() < 0.5) radio(u, pick(['¡Recargando!', '¡Cambio cargador!', '¡Cubridme, recargo!']));
    }
  } else if (
    !u.pist &&
    !u.auto &&
    !moving &&
    u.mag < u.magSize * 0.35 &&
    u.ammo > u.mag &&
    !(u.order && u.order.type === 'suppress')
  ) {
    u.reloading = true;
    u.reloadT = 0;
    reloadSnd(u);
  }
  if (u.pist) {
    const p_ = u.pist;
    p_.t += dt;
    const tg = u.auto && u.auto.alive && !moving && !u.pinned && dist(u, u.auto) < 12 ? u.auto : null;
    if (p_.st === 0 && p_.t > 0.55) {
      p_.st = 1;
      p_.cool = 0.12;
    } else if (p_.st === 1) {
      p_.cool -= dt;
      if (!tg || p_.shots <= 0) {
        p_.st = 2;
        p_.t = 0;
      } else if (p_.cool <= 0 && !u.noFire) {
        p_.cool = rr(0.3, 0.55);
        p_.shots--;
        const a_ = u.acc,
          b_ = u.burst,
          s_ = u.supp;
        u.acc *= 0.8;
        u.burst = 1;
        u.supp = s_ * 0.35;
        fireAt(u, tg);
        u.acc = a_;
        u.burst = b_;
        u.supp = s_;
        u.mag = 0;
      }
    } else if (p_.st === 2 && p_.t > 0.5) {
      u.pist = null;
      u.reloading = true;
      u.reloadT = 0;
      reloadSnd(u);
    }
  }
  u.status = u.reloading
    ? 'Recargando'
    : u.pinned
      ? 'Inmovilizado'
      : moving
        ? o && o.type === 'cover'
          ? 'A cubierto…'
          : 'Moviéndose'
        : o && o.type === 'suppress'
          ? 'Suprimiendo'
          : u.firing > 0
            ? 'Disparando'
            : u.healing
              ? 'Atendiendo'
              : o && o.type === 'treat'
                ? 'Seguridad'
                : u.stance === 'crouch'
                  ? 'Agazapado'
                  : 'Listo';
  if (u.inB)
    u.status =
      u.inB.level === 'roof'
        ? u.firing > 0
          ? 'Azotea · fuego'
          : 'En la azotea'
        : u.firing > 0
          ? 'Ventana · fuego'
          : 'En el edificio';
  if (u.spent && !moving) u.status = 'Agotado';
  if (u.pist) u.status = 'Pistola';

  if (u.team === 'us' && !u.npc) {
    u.wallT = (u.wallT || 0) - dt;
    if (moving || u.inB || u.auto || (o && (o.type === 'attack' || o.type === 'suppress' || o.type === 'treat')))
      u.wall = null;
    else if (u.wallT <= 0) {
      u.wallT = 0.6;
      const i = Math.floor(u.x),
        j = Math.floor(u.z);
      let best = null;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ])
        if (bAt(i + dx, j + dz) >= 0) {
          const fx = u.x - (i + 0.5 + dx * 0.5),
            fz = u.z - (j + 0.5 + dz * 0.5);
          const d = Math.abs(dx ? fx : fz);
          if (!best || d < best[0]) best = [d, Math.atan2(-dx, -dz)];
        }
      if (best) {
        if (u.wall == null) {
          u.wallVar = pick([0, 0, 1, 2]);
          if (u.wallVar === 2 && u.sup < 20) u.idleKneel = true;
        }
        u.wall = best[1];
        const thr = nearestThreat(u);
        let d = Math.atan2(thr.x - u.x, thr.z - u.z) - u.wall;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        u.wallLook = clamp(d, -1.2, 1.2) || 0.9;
      } else u.wall = null;
    }
    if (u.wall != null) u.face = u.wallVar === 1 ? u.wall + (u.wallLook < 0 ? -1.25 : 1.25) : u.wall;
  }
  u.cool -= dt;
  u.scanT -= dt;
  if (u.scanT <= 0) {
    u.scanT = 0.3;
    u.auto = null;
    let bd = 1e9;
    for (const f of foes) {
      if (!f.alive || f.dummy) continue;
      const d = dist(u, f);
      if (d < sightR(u, f) && d < bd && losU(u, f)) {
        bd = d;
        u.auto = f;
      }
    }
  }
  if (u.rpg) {
    rpgThink(u, dt, moving);
    return;
  }
  if (u.pinned || u.cool > 0 || u.reloading || u.mag <= 0 || u.noFire) return;
  if (o && o.type === 'treat' && u.healing) return;
  if (moving) {
    if (u.auto && u.auto.alive && u.team === 'us' && dist(u, u.auto) < RANGE * 0.7) {
      const a = u.acc;
      u.acc *= 0.45;
      fireAt(u, u.auto);
      u.acc = a;
      u.cool *= 1.4;
    }
    return;
  }
  if (o && o.type === 'suppress') {
    if (Math.hypot(o.x - u.x, o.z - u.z) < RANGE + 4 && losP(u, o.x, o.z)) {
      fireSuppress(u, o.x, o.z);
      return;
    }
  }
  let tgt = null;
  if (o && o.type === 'attack' && o.target.alive && dist(u, o.target) < RANGE && losU(u, o.target)) tgt = o.target;
  else if (u.auto && u.auto.alive) tgt = u.auto;
  if (tgt) fireAt(u, tgt);
}
function arrive(u) {
  if (u.order && u.order.type === 'enter') {
    const b = BLDS[u.order.b];
    if (b) placeInB(u, b, u.order.level);
    else u.order = null;
    return;
  }
  if (u.order && u.order.type === 'cover') {
    u.stance = 'crouch';
  } else if (u.order && u.order.type === 'move') {
    if (u.order.form && formHolding(u.order.form)) return; // en formación: guarda su sitio mientras el de punta sigue andando
    const kn = u.order.kneel;
    u.order = null;
    u.stance = kn || u.sup > 25 ? 'crouch' : 'stand';
    if (u.team === 'us' && !u.npc && u.sup < 25 && (u.kit === 'radio' || rnd() < 0.15)) {
      u.sigT = 1.2;
      u.sigK = 'fist';
    }
  }
}
function sightR(v, t) {
  let R = RANGE;
  if (t && t.inB && t.inB.level === 'ground' && !(t.firing > 0)) R = 7; // alguien dentro, apartado de la ventana, es difícil de ver
  if (v.team === 'them' && G.m && G.m.p2 && nightF > 0.5) return t && t.lit ? R : Math.min(R, 10); // Anochecer, fase 2: la milicia no ve a nadie más allá de 10 m salvo que lo enseñe una bengala
  if (nightF < 0.05 || (t && t.firing > 0)) return R; // un fogonazo delata a cualquiera
  let nR;
  if (v.team === 'them')
    nR = t && t.lit ? RANGE * 0.85 : 3; // sin miras nocturnas: la milicia solo ve lo que enseña la luz
  else if (v.look === 'delta' && G.nv)
    nR = (v.nvBlind || 0) > 0.45 ? 4 : NV_R; // visores nocturnos: unos 50 m alrededor, inútiles cuando los deslumbra una bengala
  else if (v.look === 'delta') nR = t && t.lit ? RANGE : 8;
  else nR = t && t.lit ? RANGE : 8;
  if (R === 7) nR = Math.min(nR, 7);
  return R + (nR - R) * nightF;
}
function medic(dt) {
  for (const u of us) u.healing = !!u.working;
  for (const m_ of us.filter(u => u.medic && u.npc && !u.noAid)) medicOne(m_, dt);
  treatOrders(dt);
  for (const u of us) {
    if (!u.down) continue;
    let rate = 0,
      who = null;
    for (const h of us) {
      if (
        !h.alive ||
        h.noAid ||
        h.moving ||
        dist(h, u) > 1.7 ||
        !(h.npc || (h.order && h.order.type === 'treat' && h.order.pat === u))
      )
        continue;
      const r = h.medic ? 1 : 0.45;
      if (r > rate) {
        rate = r;
        who = h;
      }
    }
    if (who) {
      u.reviveT += dt * rate;
      who.healing = true;
      u.dkHeld = true;
      if (u.reviveT > 5) {
        u.bleedOut = false;
        u.dkT = 0;
        u.bleedT = 0;
        u.down = false;
        u.alive = true;
        u.hp = who.medic ? 40 : 25;
        u.sup = 40;
        u.stance = 'crouch';
        u.reviveT = 0;
        u.path = [];
        u.order = null;
        if (who.order && who.order.type === 'treat') {
          u.order = { type: 'treat', id: who.order.id, until: who.order.until, rT: 0, pat: null };
          if (G.sel.has(who)) G.sel.add(u);
        }
        logMsg(`${who.name} levanta a ${u.name}`, 'us');
      }
    }
  }
}
function medicOne(m, dt) {
  if (
    m &&
    m.alive &&
    !m.inB &&
    !m.pinned &&
    !m.path.length &&
    (!m.order || m.order.type === 'cover') &&
    G.t > (m.medGoT || 0)
  ) {
    const f = us.filter(u => u.down).sort((a, b) => dist(a, m) - dist(b, m))[0];
    if (f && dist(f, m) > 1.4 && dist(f, m) < 16) {
      m.medGoT = G.t + 2;
      const c = nearestFree(Math.floor(f.x), Math.floor(f.z)),
        pth = findPath(Math.floor(m.x), Math.floor(m.z), c[0], c[1]);
      if (pth) {
        m.path = pth;
        m.order = { type: 'move' };
        m.stance = 'stand';
        if (G.t - (m.medTalk || -99) > 8) {
          m.medTalk = G.t;
          radio(m, pick([`¡Voy a por ${f.name}!`, '¡Sanitario en camino!', '¡Cubridme, voy a por él!']));
        }
      }
    }
  }
  if (m && m.alive && !m.moving && !m.pinned) {
    for (const u of us)
      if (u !== m && u.alive && u.hp < 70 && dist(u, m) < 1.7) {
        u.hp = Math.min(70, u.hp + 5 * dt);
        m.healing = true;
      }
    if (m.hp < 70 && !m.healing) m.hp = Math.min(70, m.hp + 1.5 * dt);
  }
}
function aiThink(e) {
  if (e.pinned || e.moving) return;
  const vis = us.filter(u => u.alive && dist(u, e) < sightR(e, u) && losU(e, u));
  const taken = new Set(
    them
      .filter(o => o !== e && o.alive)
      .map(o => {
        const p = o.path.length ? o.path[o.path.length - 1] : [Math.floor(o.x), Math.floor(o.z)];
        return idx(p[0], p[1]);
      })
  );
  if (vis.length) {
    G.alert = true;
    G.lastKnown = { x: vis[0].x, z: vis[0].z };
    if (e.stance === 'stand') e.stance = 'crouch';
    if (e.kind !== 'post' && !e.push) {
      const nv = vis.sort((a, b) => dist(a, e) - dist(b, e))[0];
      const pr = coverProt({ x: e.x, z: e.z, stance: 'crouch' }, nv.x, nv.z).v;
      if (pr < 0.25 && rnd() < 0.45) {
        const c = findCover(Math.floor(e.x), Math.floor(e.z), nv, 4, taken);
        if (c) e.path = findPath(Math.floor(e.x), Math.floor(e.z), c[0], c[1]) || [];
      }
    }
    if (!(e.push && rnd() < 0.45)) return; // los que van a por un objetivo siguen hacia él, con fuego o sin él
  }
  if (e.kind === 'post' || !G.alert || G.t < e.nextMove) return;
  const goal = e.kind === 'wave' ? e.goal || squadCenter() : G.lastKnown;
  if (!goal) return;
  const d = Math.hypot(goal.x - e.x, goal.z - e.z);
  e.nextMove = G.t + 2.5 + rnd() * 3;
  if (d < (e.push ? 2 : 7)) return;
  const hop = Math.min(7, d - (e.push ? 1 : 5));
  const hc = nearestFree(Math.floor(e.x + ((goal.x - e.x) / d) * hop), Math.floor(e.z + ((goal.z - e.z) / d) * hop));
  const c = findCover(hc[0], hc[1], goal, 3, taken) || hc;
  e.path = findPath(Math.floor(e.x), Math.floor(e.z), c[0], c[1]) || [];
  e.stance = 'stand';
}
function squadCenter() {
  const a = us.filter(u => u.alive);
  if (!a.length) return null;
  return { x: a.reduce((s, u) => s + u.x, 0) / a.length, z: a.reduce((s, u) => s + u.z, 0) / a.length };
}
function spawnWave() {
  G.waveSpawned = true;
  G.alert = true;
  const ESPEC = { acc: 0.18, burst: 4, cool: 1.7, supp: 9, ammo: 99999, hp: 70, gun: 'ak' };
  for (const [i, j] of [
    [62, 31],
    [62, 33],
    [63, 29],
    [32, 63],
    [30, 62],
    [32, 0]
  ]) {
    const c = nearestFree(OX + i, OZ + j);
    const e = makeUnit('them', c[0], c[1], Object.assign({ kind: 'wave', name: 'Miliciano' }, ESPEC));
    e.nextMove = G.t + rnd() * 2;
  }
  logMsg('Radio: refuerzos de la milicia entrando por el este, el norte y el sur.', 'bad');
  autoPause('refuerzos');
}
/* Misión: un objetivo final y subobjetivos que se van revelando uno a uno por radio */
const posts = () => them.filter(e => e.kind === 'post'),
  waveU = () => them.filter(e => e.kind === 'wave');
const MISSION = [
  {
    text: 'Avanzar hasta la barricada de la avenida',
    zone: { x: OX + 23.5, z: OZ + 31.5, r: 3 },
    done: () => us.some(u => u.alive && Math.hypot(u.x - (OX + 23.5), u.z - (OZ + 31.5)) < 3),
    radio: 'Barricada alcanzada. Hay nidos de la milicia en el cruce, ¡hay que callarlos!'
  },
  {
    text: 'Silenciar los nidos del cruce',
    zone: { x: OX + 34, z: OZ + 31.5, r: 8 },
    count: () => [posts().filter(e => !e.alive).length, posts().length],
    done: () => posts().every(e => !e.alive),
    radio: 'Nidos silenciados. ¡Todos al cruce, ya!'
  },
  {
    text: 'Reunir a la escuadra en el cruce',
    zone: { x: OBJ.x, z: OBJ.z, r: OBJ.r },
    count: () => {
      const a = us.filter(u => u.alive);
      return [a.filter(u => Math.hypot(u.x - OBJ.x, u.z - OBJ.z) < OBJ.r).length, a.length];
    },
    done: () => {
      const a = us.filter(u => u.alive);
      return a.length > 0 && a.every(u => Math.hypot(u.x - OBJ.x, u.z - OBJ.z) < OBJ.r);
    },
    radio: 'En posición. Mando avisa: viene la milicia en masa, ¡aguantad!'
  },
  {
    text: 'Aguantar a los refuerzos',
    zone: { x: OBJ.x, z: OBJ.z, r: OBJ.r },
    start: () => {
      if (!G.waveSpawned) spawnWave();
    },
    count: () => [waveU().filter(e => !e.alive).length, waveU().length],
    done: () => G.waveSpawned && waveU().every(e => !e.alive),
    radio: '¡Cruce asegurado! Buen trabajo.'
  }
];
