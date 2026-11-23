/* ====================================================================================================
 * missions/m01-irene/flight.js
 *
 * Operación Irene: la fuerza de asalto vuela desde el aeródromo, por encima de las aldeas, hasta el objetivo
 * ================================================================================================== */

'use strict';

let FLIGHT = { on: false };
function polyAt(F, s) {
  if (s < 0) {
    const a = F.pts[0],
      b = F.pts[1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a[0] + ((b[0] - a[0]) / L) * s, a[1] + ((b[1] - a[1]) / L) * s, Math.atan2(b[0] - a[0], b[1] - a[1])];
  }
  let k = 0;
  while (k < F.cum.length - 2 && F.cum[k + 1] < s) k++;
  const a = F.pts[k],
    b = F.pts[k + 1],
    L = F.cum[k + 1] - F.cum[k] || 1,
    t = clamp((s - F.cum[k]) / L, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])];
}
// una curva suave por los puntos de paso (Catmull-Rom), remuestreada cada pocas unidades
function smoothRoute(P, step) {
  const out = [P[0]];
  for (let k = 0; k < P.length - 1; k++) {
    const p0 = P[Math.max(0, k - 1)],
      p1 = P[k],
      p2 = P[k + 1],
      p3 = P[Math.min(P.length - 1, k + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let q = 1; q <= n; q++) {
      const t = q / n,
        t2 = t * t,
        t3 = t2 * t;
      out.push(
        [0, 1].map(
          i =>
            0.5 *
            (2 * p1[i] +
              (-p0[i] + p2[i]) * t +
              (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
              (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
        )
      );
    }
  }
  return out;
}
// despegue a lo largo de la pista, sobre la playa y el agua, al norte siguiendo la costa, hacia el interior sobre las aldeas hasta el K-4 y desde el sur hasta el objetivo
const CONVOY_X = [-880, 1067]; // donde la formación sobrevuela el convoy en la carretera del aeropuerto
function ireneRoute() {
  return smoothRoute(
    [
      AIRP(-110, -16),
      AIRP(10, -40),
      AIRP(150, -100),
      CONVOY_X,
      AIRP(560, 60),
      AIRP(720, 118),
      [-330, 930],
      [-150, 640],
      [60, 540],
      [220, 450],
      [262, 372],
      [264, 300],
      [265, 262]
    ],
    6
  );
}
/* Dónde acaba cada aparato: los cuatro Black Hawks sobre las esquinas del objetivo, Little Birds en la calle delante de la arcada
   y uno en la azotea de al lado, y dos Black Hawks dando vueltas por encima */
function irenePlan() {
  const T_ = BLDS.find(b => b.ring) || { x: LM.target.x - 6.5, y: LM.target.z - 5, w: 13, d: 10, top: 3.55 };
  const cx = T_.x + T_.w / 2,
    cz = T_.y + T_.d / 2,
    gY = (x, z) => {
      const i = Math.floor(x),
        j = Math.floor(z);
      return inB(i, j) && grid[idx(i, j)] === 1 ? topH[idx(i, j)] || 3 : 0;
    };
  const corners = [
    [T_.x - 4.5, T_.y - 4.5],
    [T_.x + T_.w + 4.5, T_.y - 4.5],
    [T_.x - 4.5, T_.y + T_.d + 4.5],
    [T_.x + T_.w + 4.5, T_.y + T_.d + 4.5]
  ];
  // la calle delante de la arcada (cara oeste): sitio para tres Little Birds, de morro a cola
  const clear = (x, z, r) => {
    for (let j = Math.floor(z - r); j <= Math.floor(z + r); j++)
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) if (!walk(i, j)) return false;
    return true;
  };
  const cand = [];
  for (let z = T_.y - 12; z <= T_.y + T_.d + 12; z += 0.5)
    for (let x = T_.x - 12; x <= T_.x - 2.5; x += 0.5)
      if (clear(x, z, 2.2)) cand.push([x, z, Math.abs(x - (T_.x - 5)) * 0.6 + Math.abs(z - cz)]);
  cand.sort((a, b) => a[2] - b[2]);
  const street = [];
  for (const c of cand) {
    if (street.length >= 3) break;
    if (street.every(s => Math.hypot(s[0] - c[0], s[1] - c[1]) > 8)) street.push([c[0], c[1]]);
  }
  while (street.length < 3) street.push([T_.x - 6, cz - 9 + street.length * 9]);
  // la azotea de al lado: el edificio de tamaño decente más cercano que no sea el objetivo
  let roof = null,
    rs = 1e9;
  for (const b of BLDS) {
    if (b === T_ || b.ring || b.w < 5 || b.d < 5) continue;
    const gx = Math.max(0, T_.x - (b.x + b.w), b.x - (T_.x + T_.w)),
      gz = Math.max(0, T_.y - (b.y + b.d), b.y - (T_.y + T_.d)),
      g = Math.max(gx, gz);
    if (g > 6) continue;
    const sc = g * 3 - Math.min(b.w, b.d);
    if (sc < rs) {
      rs = sc;
      roof = b;
    }
  }
  const roofP = roof ? [roof.x + roof.w / 2, roof.y + roof.d / 2, roof.top || 3.2] : [T_.x + T_.w + 8, cz, 0];
  return { cx, cz, top: T_.top || 3.55, corners, street, roof: roofP, gY };
}
/* Pasajeros: Rangers sentados en las puertas de los Black Hawks con las piernas fuera y Delta en los bancos de los Little Birds, dos por lado */
function seatRig(look, parent, x, y, z, ry) {
  const rig = buildRig(look, { gun: look === 'delta' ? 'car' : 'm16' });
  rig.gun.visible = false;
  rig.root.scale.setScalar(1.5);
  rig.root.position.set(x, y, z);
  rig.root.rotation.y = ry;
  if (rig.model) rig.pelvis.position.y = 0.52 / SOLD_K;
  rig.hipL.rotation.x = rig.hipR.rotation.x = -1.45;
  rig.knL.rotation.x = 1.25;
  rig.knR.rotation.x = 1.4;
  rig.hipL.rotation.z = 0.12;
  rig.hipR.rotation.z = -0.12;
  rig.shR.rotation.x = -0.5;
  rig.elR.rotation.x = -1.0;
  rig.shL.rotation.x = -0.65;
  rig.elL.rotation.x = -1.1;
  rig.neck.rotation.y = rr(-0.4, 0.4);
  parent.add(rig.root);
  return { rig, look, side: Math.sign(x) || 1 };
}
function loadBH(h) {
  h.pax = [];
  for (const s of [-1, 1]) {
    for (const z of [1.82, 2.68]) h.pax.push(seatRig('ranger', h.g, s * 0.9, -0.03, z, s * PH));
    h.pax.push(seatRig('ranger', h.g, s * 0.3, -0.03, 2.25, s * PH));
  }
}
function loadLB(h) {
  h.pax = [];
  for (const s of [-1, 1]) for (const z of [-0.36, -1.3]) h.pax.push(seatRig('delta', h.g, s * 1.27, 0.03, z, s * PH));
}
function smokeColumns(F) {
  // dos columnas de humo de neumáticos ardiendo en las primeras calles de la ciudad, justo en la línea de vuelo de la formación
  let s0 = null;
  for (let s = 0; s < F.L; s += 4) {
    const [x, z] = polyAt(F, s);
    if (x > 0 && z > 0 && x < W && z < H && cityDs(x, z) > 0.35) {
      s0 = s;
      break;
    }
  }
  if (s0 == null) s0 = F.L - 260;
  F.smoke = [];
  for (const [ds, off] of [
    [25, 4],
    [120, -5]
  ]) {
    const [x, z, hd] = polyAt(F, Math.min(F.L - 80, s0 + ds)),
      c = Math.cos(hd),
      sn = Math.sin(hd),
      ex = x + c * off,
      ez = z - sn * off;
    const i = Math.floor(ex),
      j = Math.floor(ez),
      y = inB(i, j) && grid[idx(i, j)] === 1 ? (topH[idx(i, j)] || 3) + 0.2 : 0.3;
    const em = { x: ex, z: ez, y, rate: 9, life: 16, vy: 3.6, s0: 1.6, s1: 7.5, fire: 0.5, acc: 0, sp: 0.9 };
    emitters.push(em);
    F.smoke.push(em);
  }
  // dejo que las columnas crezcan antes de que lleguen los helicópteros
  for (let k = 0; k < 160; k++) {
    for (const e of F.smoke) emitFrom(e, 0.1);
    updParticles(0.1);
  }
}
function blowSmoke(F, h, dt) {
  if (!F.smoke || !F.smoke.some(e => Math.hypot(e.x - h.x, e.z - h.z) < 70)) return;
  const R_ = h.lb ? 8 : 11;
  for (let k = 0; k < PN; k++) {
    if (PT[k] >= PL[k] || PE[k]) continue;
    const dx = PX[k] - h.x,
      dz = PZ[k] - h.z,
      dy = PY[k] - (h.y + 1.5),
      d2 = dx * dx + dz * dz + dy * dy * 1.8;
    if (d2 > R_ * R_) continue;
    const d = Math.sqrt(d2) || 0.1,
      f = 1 - d / R_;
    PVX[k] += (dx / d) * 26 * f * dt;
    PVZ[k] += (dz / d) * 26 * f * dt;
    PVY[k] -= 9 * f * dt;
    PT[k] += dt * 3.5 * f;
  }
}
/* La fuerza de asalto como unidades: un chalk de Rangers por Black Hawk y un equipo Delta por cada pareja de Little Birds */
function flightUnits(F) {
  const bh = F.helis.filter(h => h.role === 'corner'),
    lb = F.helis.filter(h => h.lb);
  F.units = bh
    .map((h, k) => ({ name: 'Romeo ' + (k + 1) + '-1', role: 'Super 6-' + (k + 1) + ' · 6 Rangers', helis: [h] }))
    .concat([
      { name: 'Kilo 2-1', role: 'Star 4-1 y 4-2 · 8 Delta', helis: [lb[0], lb[1]] },
      { name: 'Kilo 1-1', role: 'Star 4-3 y 4-4 · 8 Delta', helis: [lb[2], lb[3]] }
    ]);
  F.units.forEach((u, k) => {
    for (const h of u.helis) h.unit = k;
    u.rings = u.helis.map(h => {
      const r = ovRing(0.86, 1, 0xcfe6ff, 0.9);
      r.visible = false;
      return r;
    });
  });
  F.sel = null;
  const box_ = $('flyUnits');
  box_.innerHTML = '';
  F.units.forEach((u, k) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.innerHTML = `<span class="cn">${L(u.name)}</span><span class="cr">${L(u.role)}</span><span class="bar hp"><i style="width:100%"></i></span><span class="cs"><b>En tierra</b><em></em></span>`;
    b.addEventListener('click', () => flightSelect(k));
    u.el = b;
    u.st = b.querySelector('.cs b');
    u.em = b.querySelector('.cs em');
    box_.appendChild(b);
  });
}
function flightSelect(k) {
  const F = FLIGHT;
  if (!F.on) return;
  F.sel = F.sel === k ? null : k;
  F.units.forEach((u, i) => u.el.classList.toggle('sel', i === F.sel));
  if (F.sel != null) {
    const u = F.units[F.sel];
    cineText(u.name + ' · ' + u.role);
    F.capT = F.t + 2.5;
  }
}
function flightTap(cx, cy) {
  const F = FLIGHT;
  if (!F.on) return;
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObjects(
    F.helis.filter(h => h.unit != null).map(h => h.g),
    true
  )[0];
  if (hit) {
    let o = hit.object;
    while (o && !F.helis.some(h => h.g === o)) o = o.parent;
    const h = F.helis.find(h => h.g === o);
    if (h) flightSelect(h.unit);
  } else {
    let best = null,
      bd = 1.4;
    for (const m of F.men) {
      if (m.unit == null) continue;
      const v = new T.Vector3(m.x, m.y + 0.8, m.z).project(cam),
        d = Math.hypot((v.x - ndc.x) * innerWidth, (v.y - ndc.y) * innerHeight) / 40;
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    if (best) flightSelect(best.unit);
  }
}
function unitStatus(F, u) {
  const h = u.helis[0],
    all = s => u.helis.every(s),
    any = s => u.helis.some(s);
  if (u.helis[0].lb) {
    if (all(h => h.pax && h.pax.every(p => p.gone))) return 'Desplegados';
    if (any(h => h.landed)) return 'Desembarcando';
  } else {
    if (h.doneT) return 'Desplegados';
    if (h.ropeT) return 'Cuerdas';
  }
  if (any(h => h.state === 'approach')) return 'Aproximación';
  if (any(h => h.state === 'form')) return 'En vuelo';
  if (any(h => h.state === 'lift')) return 'Despegando';
  return any(h => h.rs > 0.05) ? 'Arrancando' : 'En tierra';
}
function updUnits(F, dt) {
  for (const u of F.units) {
    u.helis.forEach((h, i) => {
      const r = u.rings[i];
      r.visible = F.sel === F.units.indexOf(u) && !(h.lb && h.unload);
      if (r.visible) {
        r.position.set(h.x, h.y + 0.15, h.z);
        r.scale.setScalar(h.lb ? 4.6 : 7.2);
        r.material.opacity = 0.55 + Math.sin(F.t * 5) * 0.2;
      }
    });
  }
  F.cardT = (F.cardT || 0) - dt;
  if (F.cardT > 0) return;
  F.cardT = 0.25;
  for (const u of F.units) {
    const sp = u.helis.reduce((a, h) => a + Math.hypot(h.vx, h.vz), 0) / u.helis.length,
      alt = u.helis.reduce((a, h) => a + h.y, 0) / u.helis.length;
    u.st.textContent = L(unitStatus(F, u));
    u.em.textContent = sp > 1 ? Math.round(sp * 1.5 * 1.944) + ' kn' : '';
  }
}
function unitCentre(F, k) {
  const u = F.units[k],
    men = F.men.filter(m => m.unit === k && m.mode !== 'slide');
  const pts = men.length >= (u.helis[0].lb ? 4 : 3) ? men.map(m => [m.x, m.y, m.z]) : u.helis.map(h => [h.x, h.y, h.z]);
  const c = [0, 0, 0];
  for (const p of pts) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return c.map(v => v / pts.length);
}
/* La columna de Struecker sale de la base con los helicópteros y coge la carretera del aeropuerto; la formación pasa por encima */
function flightConvoy(F) {
  baseConvoyShow(false);
  const pts = [AIRP(91, -106), AIRP(178, -105), AIRP(225, -105)].concat(ROADS[0].pts.slice(2, 5));
  const cum = [0];
  for (let k = 1; k < pts.length; k++)
    cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  F.cpath = { pts, cum };
  F.convoy = [0, 0, 1, 0, 1, 0].map((kind, k) => {
    const v = irVehicle(kind ? 'm' : 'h');
    v.s = 9 + 9 * k;
    return v;
  });
  F.cv = 0;
  flightConvoyStep(F, 0);
}
function flightConvoyStep(F, dt) {
  F.cv += (clamp((F.t - 3) / 6, 0, 1) * 7.5 - F.cv) * Math.min(1, dt * 1.5);
  for (const v of F.convoy) {
    v.s += F.cv * dt;
    const [x, z, hd] = polyAt(F.cpath, Math.min(v.s, F.cpath.cum[F.cpath.cum.length - 1]));
    v.g.position.set(x, F.cv > 0.5 ? Math.sin(F.t * 14 + v.s) * 0.02 : 0, z);
    let d = hd - v.g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    v.g.rotation.y += d * Math.min(1, dt * 4);
    if (dt === 0) v.g.rotation.y = hd;
  }
  if (!F.said.cv && F.convoy.some(v => Math.hypot(v.g.position.x - F.helis[0].x, v.g.position.z - F.helis[0].z) < 40)) {
    F.said.cv = 1;
    say('Sgto. Struecker', 'Columna en la carretera del aeropuerto. Ahí van los pájaros, justo encima.', 'convoy');
  }
}
/* Mucha gente en las calles alrededor del objetivo y en el último tramo de la ruta; cuando los helicópteros bajan a estacionario todo el mundo se mete en casa */
function flightCivs(F) {
  const P = F.plan,
    spots = [];
  for (let n = 0; n < 600 && spots.length < 30; n++) {
    const a = rnd() * 6.283,
      d = rr(12, 55),
      i = Math.floor(P.cx + Math.cos(a) * d),
      j = Math.floor(P.cz + Math.sin(a) * d);
    if (walk(i, j) && !spots.some(s => Math.hypot(s[0] - i, s[1] - j) < 3)) spots.push([i, j]);
  }
  for (let s = F.L - 430; s < F.L - 40; s += 6) {
    const [x, z] = polyAt(F, s),
      i = Math.floor(x + rr(-16, 16)),
      j = Math.floor(z + rr(-16, 16));
    if (walk(i, j)) spots.push([i, j]);
  }
  for (const [i, j] of spots) civs.push(makeCiv(i, j));
}
function flightPanic(F, dt) {
  F.panT = (F.panT || 0) - dt;
  if (F.panT <= 0) {
    F.panT = 0.8;
    for (const h of F.helis) {
      if (h.gone || h.y > 26 || !(h.state === 'approach' || h.state === 'form')) continue;
      const i = Math.floor(h.x),
        j = Math.floor(h.z);
      if (!inB(i, j)) continue;
      addNoise(h.x, h.z, h.state === 'approach' ? 34 : 18);
    }
  }
  updCivs(dt);
}
function startFlight(opts) {
  const pts = ireneRoute();
  const cum = [0];
  for (let k = 1; k < pts.length; k++)
    cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const plan = irenePlan(),
    depYaw = AIR_RY + PH;
  FLIGHT = {
    on: true,
    t: 0,
    s: 0,
    pts,
    cum,
    L: cum[cum.length - 1],
    helis: [],
    men: [],
    ropes: [],
    plan,
    hold: 0,
    endT: null,
    cam: null,
    used: { corner: [] },
    mis: !!(opts && opts.mis),
    attract: !!(opts && opts.attract),
    said: {},
    uyaw: 0,
    uz: 1,
    yaw0: AIR_RY + Math.PI + 0.7,
    hdU: null
  };
  // huecos en la formación abierta: [a lo largo de la ruta, a la derecha, altitud]; los Little Birds van delante
  const LBS = [
      [16, -7, 10],
      [16, 7, 11],
      [26, -13, 12],
      [26, 13, 11]
    ],
    BHS = [
      [0, -9, 20],
      [0, 9, 21],
      [-13, -17, 22],
      [-13, 17, 21]
    ];
  const roles = { lb: ['street', 'street', 'street', 'roof'], bh: ['corner', 'corner', 'corner', 'corner'] };
  let n = 0;
  const mk = (h, lb, k, slot, role) => {
    const u = lb ? LBROW.u + k * LBROW.step : BHROW.u + k * BHROW.step,
      v = lb ? LBROW.v : BHROW.v,
      p = AIRP(u, v);
    Object.assign(h, {
      lb,
      slot,
      role,
      home: p,
      uv: [u, v],
      x: p[0],
      y: 0,
      z: p[1],
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: AIR_RY,
      roll: 0,
      pitch: 0,
      rs: 0,
      spool: n * 0.3 + rr(0, 0.4),
      lift: (lb ? 5.2 : 7.4) + k * 0.45 + rr(0, 0.4),
      state: 'parked',
      ph: [0, 0, 0, 0, 0, 0].map(() => rr(0, 6.283)),
      fq: [rr(0.15, 0.25), rr(0.45, 0.7), rr(0.12, 0.2), rr(0.32, 0.5), rr(0.9, 1.3)]
    });
    h.join = h.lift + 3.2 + rr(0, 0.6);
    h.g.position.set(p[0], 0, p[1]);
    h.g.rotation.set(0, AIR_RY, 0);
    n++;
    FLIGHT.helis.push(h);
  };
  for (let k = 0; k < 4; k++) {
    const lb = littleBird();
    world.add(lb.g);
    mk({ g: lb.g, rotor: lb.rotor, tail: lb.tail }, true, k, LBS[k], roles.lb[k]);
  }
  for (let k = 0; k < 4; k++) mk(makeHeliObj(), false, k, BHS[k], roles.bh[k]);
  if (FLIGHT.mis)
    boardSetup(FLIGHT); // la misión abre con los aparatos vacíos: los chalks salen corriendo y embarcan
  else
    for (const h of FLIGHT.helis) {
      if (h.lb) loadLB(h);
      else if (h.role === 'corner') loadBH(h);
    }
  smokeColumns(FLIGHT);
  flightUnits(FLIGHT);
  if (FLIGHT.mis) {
    flightConvoy(FLIGHT);
    flightCivs(FLIGHT);
  }
  FLIGHT.depYaw = depYaw;
  if (FLIGHT.attract) return;
  $('overlay').hidden = true;
  document.body.classList.add('cine');
  $('bSkip').hidden = false;
  $('cine').hidden = false;
  const c0 = AIRP(-125, -58);
  camS.tx = c0[0];
  camS.tz = c0[1];
  camS.zoomT = camS.zoom = 15;
  camS.yawT = camS.yaw = FLIGHT.yaw0;
  if (!AC) initAudio();
  else if (AC.state === 'suspended') AC.resume();
  startRotorSound();
  if (FLIGHT.board) {
    const c1 = AIRP(-131, -106);
    camS.tx = c1[0];
    camS.tz = c1[1];
    camS.zoomT = camS.zoom = 13;
    cineText('Operación Irene · 15:32 · Rangers y Delta corren a los helicópteros');
  } else cineText('Operación Irene · 15:32 · arrancan los rotores en el aeródromo');
}
function cineText(t) {
  $('cine').textContent = t;
}
