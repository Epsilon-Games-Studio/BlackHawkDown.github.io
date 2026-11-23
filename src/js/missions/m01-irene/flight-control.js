/* ====================================================================================================
 * missions/m01-irene/flight-control.js
 *
 * El vuelo de Irene: a dónde va cada aparato, cómo se mueve, la radio,
 * los pasajeros y el final del vuelo.
 * ================================================================================================== */

'use strict';

function heliTarget(F, h) {
  // dónde quiere estar ahora este aparato y a qué velocidad se mueve ese punto
  const t = F.t;
  if (h.state === 'parked' || h.state === 'lift') {
    return [h.home[0], h.state === 'lift' ? 2.6 : 0, h.home[1], 0, 0, 0];
  }
  if (h.state === 'form') {
    const along = h.slot[0] + 3.2 * Math.sin(t * h.fq[0] + h.ph[0]) + 1.4 * Math.sin(t * h.fq[1] + h.ph[1]);
    const lat = h.slot[1] + 2.6 * Math.sin(t * h.fq[2] + h.ph[2]) + 1.1 * Math.sin(t * h.fq[1] * 1.3 + h.ph[3]);
    const alt =
      h.slot[2] * clamp((t - h.join) / 6, 0.25, 1) +
      1.7 * Math.sin(t * h.fq[3] + h.ph[4]) +
      0.7 * Math.sin(t * h.fq[4] + h.ph[5]);
    const s = F.s + along,
      [px, pz, hd] = polyAt(F, s),
      c = Math.cos(hd),
      sn = Math.sin(hd);
    return [px + c * lat, alt, pz - sn * lat, sn * F.v, 0, c * F.v];
  }
  if (h.state === 'leave') {
    const P = F.plan;
    return [P.cx + h.leaveDir[0] * 600, 36, P.cz + h.leaveDir[1] * 600, 0, 0, 0];
  }
  const d = h.dest;
  if (h.role === 'orbit') {
    const th = d.th0 + d.w * (t - d.t0),
      R = d.R + 4 * Math.sin(t * 0.21 + h.ph[0]);
    return [
      d.x + Math.sin(th) * R,
      d.y + 1.5 * Math.sin(t * 0.37 + h.ph[1]),
      d.z + Math.cos(th) * R,
      Math.cos(th) * R * d.w,
      0,
      -Math.sin(th) * R * d.w
    ];
  }
  const dh = Math.hypot(d.x - h.x, d.z - h.z);
  const y = d.hover === 0 && dh < 2 ? d.y - 0.5 : d.y + d.hover + clamp((dh - 5) / 45, 0, 1) * (h.lb ? 9 : 8);
  return [d.x, y, d.z, 0, 0, 0];
}
function assignDest(F, h) {
  const P = F.plan;
  if (h.role === 'corner') {
    let best = -1,
      bd = 1e9;
    P.corners.forEach((c, k) => {
      if (F.used.corner.includes(k)) return;
      const d = Math.hypot(c[0] - h.x, c[1] - h.z);
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    F.used.corner.push(best);
    h.corner = best;
    const c = P.corners[best];
    h.dest = { x: c[0], z: c[1], y: P.gY(c[0], c[1]), hover: 12.5 + rr(-0.6, 0.6) };
  } else if (h.role === 'street') {
    const c = P.street.shift();
    h.dest = { x: c[0], z: c[1], y: 0, hover: 0 };
  } else if (h.role === 'roof') {
    h.dest = { x: P.roof[0], z: P.roof[1], y: P.roof[2], hover: 0 };
  } else {
    const k = h.orbitK || 0;
    h.dest = {
      x: P.cx,
      z: P.cz,
      y: 32 + k * 4,
      R: 52 + k * 10,
      w: (k ? -1 : 1) * 0.27,
      t0: F.t,
      th0: Math.atan2(h.x - P.cx, h.z - P.cz) + (k ? -0.4 : 0.4)
    };
  }
  h.holdYaw = Math.atan2(h.dest.x - h.x, h.dest.z - h.z);
  if (h.role === 'street') h.holdYaw = Math.PI; // morro calle arriba, al norte
}
function addMan(F, look, x, y, z, face, mode, extra, rig) {
  if (rig) {
    rig.gun.visible = true;
    rig.root.scale.setScalar(1);
    for (const j of ['hipL', 'hipR', 'knL', 'knR', 'shL', 'shR', 'elL', 'elR', 'neck']) rig[j].rotation.set(0, 0, 0);
  } else rig = buildRig(look, { gun: look === 'delta' ? 'car' : 'm16' });
  world.add(rig.root);
  rig.root.position.set(x, y, z);
  rig.root.rotation.set(0, face, 0);
  const m = Object.assign(
    {
      team: 'us',
      x,
      z,
      y,
      vx: 0,
      vz: 0,
      face,
      alive: true,
      down: false,
      hp: 100,
      hp0: 100,
      sup: 0,
      pinned: false,
      stance: 'stand',
      moving: false,
      path: [],
      order: null,
      auto: null,
      firing: 0,
      reloading: false,
      healing: false,
      talkT: 0,
      m: rig,
      mode,
      t: 0
    },
    extra || {}
  );
  F.men.push(m);
  return m;
}
function updMen(F, dt) {
  for (const m of F.men) {
    if (m.st === 'mount') continue; // embarque: lo lleva boardMount
    m.t += dt;
    let moving = false;
    if (m.mode === 'board') moving = !!m.bmov;
    if (m.mode === 'slide') {
      m.ropeV = ropeSpeed(m.ropeV, m.y - m.gy, dt);
      m.y = Math.max(m.gy, m.y - dt * m.ropeV);
      if (m.y <= m.gy) {
        m.mode = 'land';
        m.t = 0;
        m.landT = 0.55;
        m.ropeV = 0;
      }
    } else if (m.mode === 'land') {
      if (m.t > 0.5) {
        m.mode = 'off';
        m.t = 0;
      }
    } else if (m.mode === 'off') {
      const dx = m.tx - m.x,
        dz = m.tz - m.z,
        d = Math.hypot(dx, dz);
      if (d > 0.25) {
        const s = Math.min(d, dt * 2.4);
        m.vx = (dx / d) * 2.4;
        m.vz = (dz / d) * 2.4;
        m.x += (dx / d) * s;
        m.z += (dz / d) * s;
        moving = true;
        m.face = Math.atan2(dx, dz);
      } else {
        m.mode = 'cover';
        m.stance = FLIGHT.mis ? 'stand' : 'crouch';
        m.face = m.look;
      }
    }
    if (!moving) {
      m.vx *= 0.8;
      m.vz *= 0.8;
    }
    m.moving = moving;
    const r = m.m.root;
    r.position.set(m.x, m.y, m.z);
    let df = m.face - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, dt * 8), -dt * 8, dt * 8);
    animRig(m, dt);
  }
}
function flightRadio(F) {
  const once = (k, c, fn) => {
    if (!F.said[k] && c) {
      F.said[k] = 1;
      fn();
    }
  };
  const [px, pz] = polyAt(F, F.s),
    arrived = F.helis.some(h => h.state === 'approach'),
    roping = F.helis.some(h => h.ropeT);
  once('a', F.t > 0.8, () => say('Uniform 6-4', 'Todas las estaciones, aquí Uniform 6-4. Luz verde. Arrancad.', 'hq'));
  once('b', F.t > 5.5, () => say('Star 4-1', 'Star 4-1, en el aire. Los cuatro pájaros pequeños delante.', 'air'));
  once('c', F.t > 9, () => say('Super 6-1', 'Super 6-1 despegando. Super 6-4 conmigo, a la cola.', 'air'));
  once('d', F.t > 16, () => say('Uniform 6-4', 'Rumbo norte por la costa. Mantened la separación.', 'hq'));
  once(
    'e',
    VILLAGES.some(v => Math.hypot(px - v.x, pz - v.z) < v.r + 40),
    () => say('Super 6-2', 'Pasando sobre los pueblos. Hay gente en los tejados mirando hacia arriba.', 'air')
  );
  once('f', F.smoke && F.smoke.some(e => Math.hypot(e.x - px, e.z - pz) < 110), () =>
    say('Super 6-4', 'Neumáticos ardiendo delante. Saben que venimos.', 'air')
  );
  once('g', F.L - F.s < 150, () => say('Uniform 6-4', 'Un minuto. Un minuto.', 'hq'));
  once('h', arrived, () => say('Uniform 6-4', '¡Irene! ¡Irene! ¡Irene!', 'hq', true));
  once(
    'i',
    F.helis.some(h => h.lb && h.landed),
    () => say('Star 4-1', 'Star 4-1 en el suelo, en la calle frente al objetivo.', 'air')
  );
  once('j', roping, () => say('Super 6-3', '¡Cuerdas fuera! Romeo en el suelo.', 'air'));
  once(
    'k',
    F.helis.some(h => h.role === 'roof' && h.landed),
    () => say('Star 4-4', 'Star 4-4 posado en la azotea del hotel.', 'air')
  );
  once(
    'l',
    F.helis.some(h => h.state === 'leave'),
    () => say('Super 6-1', 'Super 6-1 y 6-4 en órbita sobre el objetivo. Os cubrimos desde arriba.', 'air')
  );
}
function heliStep(F, h, dt) {
  const P = F.plan;
  h.rs = clamp((F.t - h.spool) / 5.5, 0, 1);
  h.rs = h.rs * h.rs * (3 - 2 * h.rs);
  if (h.state === 'parked' && F.t >= h.lift) h.state = 'lift';
  if (h.state === 'lift' && F.t >= h.join) h.state = 'form';
  if (h.state === 'form' && (F.s + h.slot[0] > F.L - 45 || F.s >= F.L - 0.5)) {
    h.state = 'approach';
    assignDest(F, h);
  }
  const [tx, ty, tz, tvx, tvy, tvz] = heliTarget(F, h);
  if (h.state !== 'parked') {
    const k = h.state === 'approach' ? 1.1 : 1.6,
      c = h.state === 'approach' ? 2.1 : 2.4,
      amax = h.lb ? 16 : 12;
    let ax,
      az,
      ay = 2.2 * (ty - h.y) + 2.8 * (tvy - h.vy);
    if ((h.state === 'approach' || h.state === 'leave') && h.role !== 'orbit') {
      // llegada: vuela a la velocidad que todavía le deja pararse en el sitio
      const dx = tx - h.x,
        dz = tz - h.z,
        dd = Math.hypot(dx, dz) || 1e-4,
        vd = Math.min(F.mis ? 18 : 30, Math.sqrt(2 * amax * 0.55 * dd), dd * 0.9);
      ax = 2.2 * ((dx / dd) * vd - h.vx);
      az = 2.2 * ((dz / dd) * vd - h.vz);
    } else {
      ax = k * (tx - h.x) + c * (tvx - h.vx);
      az = k * (tz - h.z) + c * (tvz - h.vz);
    }
    const al = Math.hypot(ax, az);
    if (al > amax) {
      ax *= amax / al;
      az *= amax / al;
    }
    ay = clamp(ay, -4, 5);
    h.vx += ax * dt;
    h.vz += az * dt;
    h.vy += ay * dt;
    const vh = Math.hypot(h.vx, h.vz),
      vmax = h.state === 'lift' ? 1.5 : F.mis ? 34 : 56;
    if (vh > vmax) {
      h.vx *= vmax / vh;
      h.vz *= vmax / vh;
    }
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.z += h.vz * dt;
    if (
      h.state === 'approach' &&
      h.dest.hover === 0 &&
      Math.hypot(h.dest.x - h.x, h.dest.z - h.z) < 2 &&
      h.y < h.dest.y + 0.1
    ) {
      h.landed = true;
    }
    if (h.landed && h.state === 'approach') {
      h.y = h.dest.y;
      h.vy = 0;
      h.vx *= 0.8;
      h.vz *= 0.8;
    }
    if (h.y < 0) {
      h.y = 0;
      h.vy = Math.max(0, h.vy);
    }
    // rumbo: primero de lado en el punto de despegue, luego hacia donde vuela y luego el rumbo de espera sobre el objetivo
    const vh2 = Math.hypot(h.vx, h.vz);
    let want =
      h.state === 'lift' ? F.depYaw : vh2 > 5 ? Math.atan2(h.vx, h.vz) : h.state === 'approach' ? h.holdYaw : h.yaw;
    if (h.role === 'orbit' && h.state === 'approach') want = Math.atan2(h.vx, h.vz);
    let dy = want - h.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const yr = clamp(dy * 1.4, -0.9, 0.9) * (h.state === 'lift' ? 0.7 : 1);
    h.yaw += yr * dt;
    // morro abajo para acelerar, alabeando en los giros
    const c_ = Math.cos(h.yaw),
      s_ = Math.sin(h.yaw),
      fwdA = ax * s_ + az * c_,
      latA = ax * c_ - az * s_,
      fwdV = h.vx * s_ + h.vz * c_;
    h.pitch += (clamp(0.0035 * fwdV + 0.022 * fwdA, -0.22, 0.3) - h.pitch) * Math.min(1, dt * 2.5);
    h.roll += (clamp(-latA * 0.045 - yr * 0.35, -0.5, 0.5) - h.roll) * Math.min(1, dt * 2.5);
    if (h.landed && h.state === 'approach') {
      h.pitch *= 0.9;
      h.roll *= 0.9;
    }
  }
  h.g.position.set(h.x, h.y, h.z);
  h.g.rotation.set(h.pitch, h.yaw, h.roll, 'YXZ');
  h.rotor.rotation.y += dt * (h.lb ? 26 : 17) * h.rs;
  if (h.tail) h.tail.rotation.x += dt * 42 * h.rs;
  rotorWash(h.x, h.z, h.y - (h.role === 'roof' && h.dest ? h.dest.y : 0), dt, (h.lb ? 0.6 : 1) * h.rs);
  if (h.lb) lbDust(h, h.role === 'roof' && h.dest ? h.dest.y : 0, dt);
  // fast-rope: cuando ya está estable sobre su esquina, el Black Hawk suelta dos cuerdas y el chalk baja deslizándose
  if (
    h.role === 'corner' &&
    h.state === 'approach' &&
    !h.ropeT &&
    Math.hypot(h.dest.x - h.x, h.dest.z - h.z) < 1.4 &&
    Math.hypot(h.vx, h.vz) < 1.6 &&
    Math.abs(h.y - h.dest.y - h.dest.hover) < 1.6
  ) {
    h.ropeT = F.t;
    h.ropes = [-1, 1].map(s => {
      const r = ropeMesh();
      F.ropes.push(r);
      return { m: r, s };
    });
    h.sent = 0;
  }
  if (h.ropes) {
    h.g.updateMatrixWorld(true);
    for (const r of h.ropes) {
      const p = new T.Vector3(r.s * 1.35, 2.2, 2.25);
      h.g.localToWorld(p);
      r.p = p;
      const gy = P.gY(p.x, p.z),
        full = p.y - gy,
        L = full * clamp((F.t - h.ropeT) / 1.6, 0.02, 1);
      r.m.position.copy(p);
      r.m.scale.set(1, L, 1);
      r.gy = gy;
    }
    if (F.t > h.ropeT + 1.8 && h.sent < 6 && F.t > (h.lastMan || 0) + 0.75) {
      h.lastMan = F.t;
      const r = h.ropes[h.sent % 2];
      const ox = r.p.x - P.cx,
        oz = r.p.z - P.cz,
        ol = Math.hypot(ox, oz) || 1,
        sp_ = 1.5 + (h.sent >> 1) * 1.1,
        side = (h.sent >> 1) % 2 ? 1 : -1;
      const pi = h.pax ? h.pax.findIndex(p => !p.gone && p.side === r.s) : -1,
        pax = pi >= 0 ? h.pax[pi] : null;
      if (pax) pax.gone = true;
      const mtx = F.mis
          ? r.p.x + (ox / ol) * 0.9 + rr(-1.1, 1.1)
          : r.p.x + (ox / ol) * sp_ - (oz / ol) * side * 1.2 * (h.sent >> 1),
        mtz = F.mis
          ? r.p.z + (oz / ol) * 0.9 + rr(-1.1, 1.1)
          : r.p.z + (oz / ol) * sp_ + (ox / ol) * side * 1.2 * (h.sent >> 1);
      const fc = rnd() * 6.283;
      addMan(
        F,
        'ranger',
        r.p.x - Math.sin(fc) * 0.13,
        r.p.y - 0.9,
        r.p.z - Math.cos(fc) * 0.13,
        fc,
        'slide',
        { gy: r.gy, tx: mtx, tz: mtz, look: Math.atan2(ox, oz) + side * 0.5, unit: h.unit },
        pax && pax.rig
      );
      h.sent++;
      if (h.sent === 6) h.doneT = F.t;
    }
  }
  // los Delta de los Little Birds bajan de los patines y van hacia la arcada
  if (h.landed && !h.unload && (h.role === 'street' || h.role === 'roof') && h.pax) {
    h.unload = F.t;
    h.g.updateMatrixWorld(true);
  }
  if (h.unload && h.pax && h.pax.some(p => !p.gone)) {
    const k = Math.floor((F.t - h.unload - 0.4) / 0.35);
    h.pax.forEach((p, i) => {
      if (p.gone || i > k) return;
      p.gone = true;
      const w = new T.Vector3();
      p.rig.root.getWorldPosition(w);
      const s = p.side,
        wo = new T.Vector3(s * 2.0, 0, 0).applyAxisAngle(new T.Vector3(0, 1, 0), h.yaw);
      const st = h.role === 'street' && !F.mis,
        tx = st ? w.x + 3.4 + (i % 2) * 0.9 : w.x + wo.x * (F.mis ? 0.7 : 1),
        tz = st ? w.z + (i - 1.5) * 1.3 : w.z + wo.z * (F.mis ? 0.7 : 1);
      addMan(
        F,
        'delta',
        w.x + wo.x * 0.35,
        h.dest.y,
        w.z + wo.z * 0.35,
        h.yaw + s * PH,
        'off',
        { tx, tz, look: st ? PH : Math.atan2(tx - P.cx, tz - P.cz), unit: h.unit },
        p.rig
      );
    });
  }
  blowSmoke(F, h, dt);

  // cuando el chalk está abajo el Black Hawk suelta las cuerdas y se va; los Little Birds despegan cuando se vacían sus bancos
  if (h.role === 'corner' && h.doneT && h.state === 'approach' && F.t > h.doneT + 4.6) {
    for (const r of h.ropes || []) ropeDrop(r, h, F);
    h.ropes = null;
    F.orbN = F.orbN || 0;
    if (F.orbN < 2) {
      h.orbitK = F.orbN++;
      h.role = 'orbit';
      assignDest(F, h);
    } else heliLeave(F, h);
  }
  if (h.lb && h.unload && h.state === 'approach' && h.pax && h.pax.every(p => p.gone) && F.t > h.unload + 4.5)
    heliLeave(F, h);
  if (h.state === 'leave' && Math.hypot(h.x - P.cx, h.z - P.cz) > 330) {
    world.remove(h.g);
    h.gone = true;
  }
}
function heliLeave(F, h) {
  const P = F.plan,
    dx = h.x - P.cx,
    dz = h.z - P.cz,
    L = Math.hypot(dx, dz) || 1;
  h.state = 'leave';
  h.landed = false;
  h.leaveDir = [dx / L, dz / L];
}
function updFlight(dt) {
  let r = Math.min(dt, 0.25);
  while (r > 1e-4 && FLIGHT.on) {
    const h = Math.min(r, 1 / 30);
    flightStep(h);
    r -= h;
  }
}
function flightStep(dt) {
  const F = FLIGHT;
  if (F.board && F.board.on) {
    boardStep(F, dt);
    return;
  }
  F.t += dt;
  const P = F.plan,
    flying = F.helis.filter(h => h.state === 'form');
  // el punto de cabeza en la ruta: espera a que gire el primer aparato, acelera hasta crucero y frena sobre la ciudad
  const go = clamp((F.t - 8.5) / 9, 0, 1),
    sp = (F.mis ? 21 : 34) * go * go * (3 - 2 * go) * clamp((F.L - F.s) / 90, 0.3, 1);
  F.v = F.s < F.L ? sp : 0;
  F.s = Math.min(F.L, F.s + F.v * dt);
  let rsSum = 0;
  for (const h of F.helis) {
    if (h.gone) continue;
    heliStep(F, h, dt);
    rsSum += h.rs;
  }
  updMen(F, dt);
  if (F.convoy) flightConvoyStep(F, dt);
  if (F.mis) flightPanic(F, dt);
  // cámara: primero los puntos de despegue, luego la formación desde atrás y después el objetivo desde arriba
  const arrived = F.helis.some(h => h.state === 'approach');
  if (arrived && !F.arrT) F.arrT = F.t;
  {
    const hd = polyAt(F, F.s)[2];
    if (F.hdU == null) F.hdU = hd;
    else {
      const d = hd - F.hdU;
      F.hdU += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 1.5);
    }
  }
  let fx, fy, fz, zoom, yaw;
  if (F.sel != null) {
    [fx, fy, fz] = unitCentre(F, F.sel);
    zoom = 11;
    yaw = F.t < 10 ? F.yaw0 : F.hdU + Math.PI + 0.55;
  } else if (F.t < 10) {
    const c0 = AIRP(-120 + F.t * 2, -58);
    fx = c0[0];
    fy = 0;
    fz = c0[1];
    zoom = 15;
    yaw = F.yaw0;
  } else if (!arrived || F.t < F.arrT + 3) {
    fx = 0;
    fy = 0;
    fz = 0;
    for (const h of F.helis) {
      fx += h.x;
      fz += h.z;
      fy += h.y;
    }
    fx /= F.helis.length;
    fz /= F.helis.length;
    fy /= F.helis.length;
    zoom = 17;
    yaw = F.hdU + Math.PI + 0.55 + Math.sin(F.t * 0.12) * 0.25;
  } else {
    fx = P.cx - 4;
    fy = 0;
    fz = P.cz + 2;
    zoom = 16;
    if (F.finYaw == null) F.finYaw = F.hdU + Math.PI + 0.55;
    F.finYaw += dt * 0.05;
    yaw = F.finYaw;
  }
  if (arrived && F.sel != null && F.finYaw != null) yaw = F.finYaw;
  if (F.attract) {
    fx = P.cx - 3;
    fy = 0;
    fz = P.cz + 4;
    zoom = 12;
    F.attYaw = -Math.PI * 0.75;
    yaw = F.attYaw - F.uyaw;
  }
  camS.yawT = yaw + F.uyaw;
  camS.zoomT = clamp(zoom * F.uz, 4, 30);
  {
    const k = fy / Math.tan(camS.pitch),
      wx = fx - Math.sin(camS.yaw) * k,
      wz = fz - Math.cos(camS.yaw) * k,
      a = Math.min(1, dt * (F.sel != null ? 4 : 2.5));
    camS.tx += (wx - camS.tx) * a;
    camS.tz += (wz - camS.tz) * a;
  }
  updUnits(F, dt);
  // solo cargo el terreno de delante de la formación cuando la cámara la va a seguir hasta allí; la pantalla de título nunca sale del objetivo
  if (F.attract) FOCUS2 = null;
  else {
    const ah = polyAt(F, Math.min(F.L, F.s + 70));
    FOCUS2 = [ah[0], ah[1], 46];
  }
  if (AC && rotorGain)
    rotorGain.gain.setTargetAtTime(soundOn ? (0.55 * rsSum) / F.helis.length : 0, AC.currentTime, 0.2);
  const [px, pz] = polyAt(F, F.s),
    d0 = Math.hypot(px - P.cx, pz - P.cz);
  const vil = VILLAGES.find(v => Math.hypot(px - v.x, pz - v.z) < v.r + 40);
  const roping = F.helis.some(h => h.ropeT);
  if (F.capT && F.t < F.capT) {
  } else if (F.t < 5) cineText('Operación Irene · 15:32 · arrancan los rotores en el aeródromo');
  else if (F.t < 11) cineText('Despegan cuatro Little Bird y cuatro Black Hawk');
  else if (roping) cineText('¡Irene! Cuerdas sobre las cuatro esquinas · dos Black Hawk vigilan en círculo');
  else if (arrived) cineText('Los Little Bird se posan frente al objetivo · uno sobre la azotea de al lado');
  else if (F.s < 230) cineText('Dejan atrás el aeródromo, rumbo a la costa');
  else if (coastS(px, pz) > -26) cineText('Rumbo norte por la costa, sobre la playa y el océano Índico');
  else if (vil) cineText('Sobrevolando ' + vil.nm);
  else if (F.smoke && F.smoke.some(e => Math.hypot(e.x - px, e.z - pz) < 90))
    cineText('Humo de neumáticos ardiendo: la milicia avisa de que llegamos');
  else if (d0 > 160 && cityDs(clamp(px, WB.x0, WB.x1), clamp(pz, WB.z0, WB.z1)) < 0.1)
    cineText('Tierra adentro, hacia la ciudad');
  else if (d0 > 160) cineText('Entrando en Mogadiscio por la rotonda K-4');
  else cineText('Aproximación al objetivo, junto al Hotel Olympic');
  flightRadio(F);
  if (F.attract) {
    attractFlight(F, dt);
    return;
  }
  if (F.mis) {
    const deployed =
      F.helis.filter(h => h.role === 'corner').every(h => h.doneT) &&
      F.helis.filter(h => h.lb).every(h => h.pax && h.pax.every(p => p.gone)) &&
      !F.men.some(m => m.mode === 'slide');
    if (deployed && !F.depT) F.depT = F.t;
    if ((F.depT && F.t > F.depT + 1.5) || F.t > 260) finishFlightMission(F);
    return;
  }
  const done = F.helis.filter(h => h.role === 'corner').every(h => h.doneT);
  if (done && !F.endT) F.endT = F.t;
  if (F.endT && F.t > F.endT + 7) endFlight();
  if (F.t > 260) endFlight();
}
function endFlight() {
  for (const h of FLIGHT.helis) world.remove(h.g);
  for (const r of FLIGHT.ropes || []) world.remove(r);
  for (const v of FLIGHT.convoy || []) world.remove(v.g);
  if (FLIGHT.convoy) baseConvoyShow(true);
  for (const e of FLIGHT.smoke || []) {
    const i = emitters.indexOf(e);
    if (i >= 0) emitters.splice(i, 1);
  }
  for (const m of FLIGHT.men || []) world.remove(m.m.root);
  for (const u of FLIGHT.units || []) for (const r of u.rings) overlay.remove(r);
  $('flyUnits').innerHTML = '';
  FLIGHT = { on: false };
  FOCUS2 = null;
  document.body.classList.remove('cine');
  $('bSkip').hidden = true;
  $('cine').hidden = true;
  $('overlay').hidden = false;
  camS.tx = OX + 31;
  camS.tz = OZ + 30;
  camS.zoomT = 13;
  camS.yawT = -Math.PI * 0.75;
  if (AC && rotorGain) rotorGain.gain.setTargetAtTime(0, AC.currentTime, 0.3);
}
