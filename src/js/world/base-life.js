/* ====================================================================================================
 * world/base-life.js
 *
 * Vida en la base: personal de tierra y hombres francos de servicio en camiseta y ropa de deporte, sin casco
 * ================================================================================================== */

'use strict';

const BASE_SKINS = [0xe0b08a, 0xd29d76, 0xc48b63, 0xa8704a, 0x7a5038, 0x5e3c28];
function baseLook(P, spec) {
  const v = spec.v || 'tee',
    skin = spec.skin || pick(BASE_SKINS),
    hair = pick(HAIRS);
  const top = {
    tee: pick([0x5a4632, 0x4e4030, 0x6a5a40]),
    tan: 0xb8a074,
    pt: 0x8c8e8c,
    dcu: DCU,
    boonie: DCU,
    mech: 0x5a6040
  }[v];
  const tpt = v === 'dcu' || v === 'boonie' ? UPT.DCU : UPT.CLOTH;
  const low = v === 'pt' ? 0x1e1e22 : v === 'mech' ? 0x5a6040 : DCU,
    lpt = v === 'pt' || v === 'mech' ? UPT.CLOTH : UPT.DCU;
  const short = v === 'tee' || v === 'tan' || v === 'pt';
  E(P.pelvis, 0.29, 0.17, 0.19, 0, -0.01, 0, low, 1.06, lpt);
  if (v !== 'pt') Bx(P.pelvis, 0.31, 0.04, 0.21, 0, 0.06, 0, v === 'mech' ? 0x3a3a30 : 0x2a2a24, UPT.WEB);
  E(P.abd, 0.27, 0.18, 0.18, 0, 0.07, 0, top, 1.04, tpt);
  E(P.chest, 0.3, 0.24, 0.2, 0, 0.08, 0, top, 1.1, tpt);
  Sp(P.chest, 0.12, 0.12, 0.12, 0.185, 0.175, 0, top, tpt);
  Sp(P.chest, 0.12, 0.12, 0.12, -0.185, 0.175, 0, top, tpt);
  if (v === 'pt') Bx(P.chest, 0.13, 0.045, 0.01, 0, 0.1, 0.102, 0x2a2a2a, UPT.NONE); // ARMY cruzado en el pecho
  if (v === 'dcu' || v === 'boonie')
    for (const s of [-1, 1]) Bx(P.chest, 0.08, 0.08, 0.02, s * 0.075, 0.11, 0.1, shade(DCU, 0.92), UPT.DCU, 0.15);
  if (v === 'mech') {
    Bx(P.chest, 0.012, 0.3, 0.01, 0, 0.0, 0.104, 0x3a3a30, UPT.NONE);
    Bx(P.chest, 0.07, 0.06, 0.02, 0.08, 0.12, 0.1, shade(top, 0.9), UPT.CLOTH);
  }
  if (rnd() < 0.3 && v !== 'pt') Bx(P.chest, 0.02, 0.12, 0.01, -0.04, 0.12, 0.103, 0xb8b8b0, UPT.GUN, 0, 0, 0.3); // cadena de las chapas
  E(P.neck, 0.075, 0.08, 0.075, 0, 0.03, 0, skin, 0.95, UPT.SKIN);
  face(P, skin, hair, { stubble: rnd() < 0.45 });
  if (v === 'dcu' || v === 'mech') {
    const hc = v === 'mech' ? 0x3a3a34 : DCU; // gorra de patrulla / gorra de béisbol
    E(P.head, 0.17, 0.07, 0.18, 0, 0.17, -0.005, hc, 0.95, v === 'dcu' ? UPT.DCU : UPT.CLOTH);
    Bx(P.head, 0.13, 0.016, 0.07, 0, 0.145, 0.1, hc, UPT.CLOTH, -0.1);
  } else if (v === 'boonie') {
    Cy(P.head, 0.3, 0.018, 0, 0.15, 0, DCU, UPT.DCU);
    Dm(P.head, 0.18, 0.1, 0.19, 0, 0.15, 0, DCU, UPT.DCU);
  } else Dm(P.head, 0.158, 0.06, 0.168, 0, 0.14, -0.006, hair, UPT.HAIR); // pelado al estilo militar
  if (rnd() < 0.3) Bx(P.head, 0.112, 0.024, 0.018, 0, 0.1, 0.086, 0x101010, UPT.NONE); // gafas de sol
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    if (short) {
      E(P['ua' + s], 0.108, 0.11, 0.112, 0, -0.04, 0, top, 1.12, tpt);
      E(P['ua' + s], 0.088, 0.2, 0.092, 0, -0.12, 0, skin, 1, UPT.SKIN);
    } else {
      E(P['ua' + s], 0.102, 0.25, 0.107, 0, -0.11, 0, top, 1.12, tpt);
      Cy(P['ua' + s], 0.11, 0.05, 0, -0.2, 0, shade(top, 0.93), tpt);
      if (s === 'L' && v !== 'mech') usFlag(P.uaL, 0.059, -0.07);
    } // mangas remangadas hasta el codo
    Sp(P['fa' + s], 0.08, 0.08, 0.08, 0, 0, 0, skin, UPT.SKIN);
    E(P['fa' + s], 0.078, 0.19, 0.08, 0, -0.095, 0, skin, 0.9, UPT.SKIN);
    if (s === 'L' && rnd() < 0.5) Cy(P['fa' + s], 0.085, 0.025, 0, -0.16, 0, 0x1a1a1a, UPT.RUBBER); // reloj
    hand(P['hd' + s], v === 'mech' && rnd() < 0.5 ? 0x2e2a24 : skin, false, sg);
  }
  if (v === 'pt') {
    for (const s of ['L', 'R']) {
      E(P['th' + s], 0.145, 0.14, 0.155, 0, -0.06, 0, low, 1.1, UPT.CLOTH);
      E(P['th' + s], 0.12, 0.18, 0.125, 0, -0.17, 0, skin, 1, UPT.SKIN);
      Sp(P['sh' + s], 0.105, 0.1, 0.11, 0, 0, 0, skin, UPT.SKIN);
      E(P['sh' + s], 0.095, 0.18, 0.1, 0, -0.09, 0, skin, 1, UPT.SKIN);
      E(P['sh' + s], 0.1, 0.06, 0.105, 0, -0.18, 0, 0xe8e6e0, 1, UPT.CLOTH);
      Bx(P['ft' + s], 0.105, 0.065, 0.2, 0, -0.025, 0.04, 0xd8d6d0, UPT.CLOTH);
      Bx(P['ft' + s], 0.112, 0.022, 0.215, 0, -0.06, 0.045, 0x3a3a3a, UPT.RUBBER);
    }
  } else legs(P, low, lpt, BOOT, { cargo: v !== 'mech' });
  P.gun = [];
  P.mag = [[0.01, 0.01, 0.01, 0, 0, 0, 0x000000]];
  return P;
}
let CREW = null;
const CREW_NODES = {
  // caminos por la base, (u, v)
  a1: [-170, -88],
  a2: [-110, -88],
  a3: [-40, -88],
  a4: [0, -88],
  a5: [60, -88],
  a6: [130, -90],
  a7: [175, -90],
  b1: [-170, -116],
  b2: [-130, -116],
  b3: [-90, -116],
  b4: [-53, -116],
  b5: [0, -116],
  b6: [25, -120],
  b7: [60, -118],
  b8: [100, -117],
  b9: [175, -116],
  t0: [-53, -145],
  t1: [-70, -145],
  t2: [-36, -145],
  t3: [-53, -128],
  t4: [-53, -161],
  g1: [186, -110],
  c1: [72, -30],
  c2: [108, -30]
};
const CREW_EDGES =
  'a1-a2 a2-a3 a3-a4 a4-a5 a5-a6 a6-a7 b1-b2 b2-b3 b3-b4 b4-b5 b5-b6 b6-b7 b7-b8 b8-b9 a1-b1 a3-b4 a4-b5 a5-b7 a7-b9 b9-g1 b4-t3 t3-t0 t0-t1 t0-t2 t0-t4 a5-c1 c1-c2 a6-c2'
    .split(' ')
    .map(e => e.split('-'));
function crewPath(from, to) {
  const prev = { [from]: null },
    q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) break;
    for (const [a, b] of CREW_EDGES) {
      const o = a === n ? b : b === n ? a : null;
      if (o && !(o in prev)) {
        prev[o] = n;
        q.push(o);
      }
    }
  }
  const out = [];
  for (let n = to; n; n = prev[n]) out.unshift(n);
  return out;
}
function crewMan(u, v, spec, face) {
  const p = AIRP(u + rr(-0.3, 0.3), v + rr(-0.3, 0.3));
  const c = {
    team: 'civ',
    x: p[0],
    z: p[1],
    vx: 0,
    vz: 0,
    face: face == null ? rnd() * 6.283 : face,
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
    role: spec.role || 'idle',
    waitT: rr(1, 6),
    spd: spec.spd || rr(1.0, 1.3)
  };
  const rig = buildRig('base', spec);
  rig.gun.visible = false;
  world.add(rig.root);
  rig.root.position.set(c.x, 0, c.z);
  rig.root.rotation.y = c.face;
  c.m = rig;
  CREW.push(c);
  return c;
}
const AIRF = d => AIR_RY + d; // una orientación en el marco de la base: 0 = hacia la pista
function spawnCrew() {
  CREW = [];
  const V = ['tee', 'tee', 'tan', 'dcu', 'boonie', 'dcu', 'tee'];
  // gente caminando a sus cosas entre las tiendas, los hangares, la terminal y la línea de vuelo
  const nodes = Object.keys(CREW_NODES).filter(n => n[0] !== 'g');
  for (let k = 0; k < 9; k++) {
    const n = pick(nodes),
      c = crewMan(CREW_NODES[n][0], CREW_NODES[n][1], { v: pick(V), role: 'walk' });
    c.node = n;
    c.waitT = rr(0, 4);
  }
  // un grupo corriendo en fila por dentro de la valla, haciendo deporte
  const loop = [
    [-186, -178],
    [186, -178],
    [186, -122],
    [-186, -119]
  ];
  for (let k = 0; k < 4; k++) {
    const c = crewMan(-150 + k * 2.2, -178, { v: 'pt', role: 'jog', spd: 2.7 });
    c.loop = loop.map(q => AIRP(q[0], q[1]));
    c.li = 1;
  }
  // corrillos hablando: junto a las tiendas, a la puerta de la terminal, junto al convoy y bajo el ala de un C-130
  for (const [gu, gv, n, vs] of [
    [-53, -131, 3, ['tee', 'tan', 'tee']],
    [40, -118, 3, ['dcu', 'dcu', 'boonie']],
    [118, -112, 4, ['dcu', 'tee', 'boonie', 'tan']],
    [90, -35, 2, ['mech', 'dcu']]
  ]) {
    const cen = AIRP(gu, gv);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.283 + rr(-0.3, 0.3),
        q = [gu + Math.cos(a) * 1.1, gv + Math.sin(a) * 1.1],
        p = AIRP(q[0], q[1]);
      const c = crewMan(q[0], q[1], { v: vs[k], role: 'chat' }, Math.atan2(cen[0] - p[0], cen[1] - p[1]));
      c.talkT = rnd() < 0.4 ? rr(0.5, 2) : 0;
    }
  }
  // mecánicos en los helicópteros: uno de rodillas junto a una rueda y otro de pie en la puerta de la cabina
  for (const k of [6, 7]) {
    const u = BHROW.u + k * BHROW.step;
    const a = crewMan(u + 2.2, BHROW.v + 2.5, { v: 'mech', role: 'kneel' }, AIRF(-PH));
    a.stance = 'crouch';
    crewMan(u - 2.6, BHROW.v - 0.5, { v: 'mech', role: 'still' }, AIRF(PH));
  }
  {
    const a = crewMan(LBROW.u + 5 * LBROW.step + 1.8, LBROW.v + 1, { v: 'mech', role: 'kneel' }, AIRF(-PH));
    a.stance = 'crouch';
  }
  // los guardias de la puerta
  for (const dv of [-4.5, 4.5]) crewMan(BASE.u1 - 1.5, BASE.gateV + dv, { v: 'dcu', role: 'still' }, AIRF(PH));
}
function updCrew(dt) {
  const ctr = AIRP(0, -100),
    near =
      Math.hypot(camS.tx - ctr[0], camS.tz - ctr[1]) < 300 ||
      (typeof FLIGHT !== 'undefined' && FLIGHT && FLIGHT.on && FLIGHT.s < 400);
  if (!CREW) {
    if (!near) return;
    spawnCrew();
  }
  for (const c of CREW) c.m.root.visible = near;
  if (!near || dt <= 0) return;
  for (const c of CREW) {
    let tx = null,
      tz = null;
    if (c.role === 'walk') {
      if (!c.path.length) {
        c.waitT -= dt;
        if (c.waitT <= 0) {
          let to = c.node;
          while (to === c.node) to = pick(Object.keys(CREW_NODES));
          c.path = crewPath(c.node, to)
            .slice(1)
            .map(n => {
              const q = CREW_NODES[n];
              return { n, p: AIRP(q[0] + rr(-1.2, 1.2), q[1] + rr(-1.2, 1.2)) };
            });
          c.waitT = rr(2, 9);
        }
      }
      if (c.path.length) {
        tx = c.path[0].p[0];
        tz = c.path[0].p[1];
        if (Math.hypot(tx - c.x, tz - c.z) < 0.4) {
          c.node = c.path[0].n;
          c.path.shift();
        }
      }
    } else if (c.role === 'jog') {
      const q = c.loop[c.li];
      tx = q[0];
      tz = q[1];
      if (Math.hypot(tx - c.x, tz - c.z) < 0.6) c.li = (c.li + 1) % c.loop.length;
    } else if (c.role === 'chat') {
      c.waitT -= dt;
      if (c.waitT <= 0) {
        c.waitT = rr(1.5, 5);
        if (rnd() < 0.45) c.talkT = rr(1, 2.6);
      }
    }
    let moving = false;
    if (tx != null) {
      const dx = tx - c.x,
        dz = tz - c.z,
        d = Math.hypot(dx, dz) || 1e-4,
        want = c.role === 'jog' ? c.spd : c.spd * 0.8,
        a = 1 - Math.exp(-6 * dt);
      c.vx += ((dx / d) * want - c.vx) * a;
      c.vz += ((dz / d) * want - c.vz) * a;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      moving = true;
    } else {
      const f = Math.exp(-10 * dt);
      c.vx *= f;
      c.vz *= f;
    }
    c.moving = moving;
    if (moving && Math.hypot(c.vx, c.vz) > 0.2) c.face = Math.atan2(c.vx, c.vz);
    const r = c.m.root;
    r.position.set(c.x, 0, c.z);
    let df = c.face - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, dt * 8), -dt * 8, dt * 8);
    animRig(c, dt);
    const m = c.m,
      sp = Math.hypot(c.vx, c.vz),
      run = clamp((sp - 1.2) / 1.5, 0, 1),
      w = clamp(sp / 0.9, 0, 1),
      s = Math.sin(m.phase);
    m.shR.rotation.x += s * (0.35 + 0.5 * run) * w;
    m.shL.rotation.x -= s * (0.35 + 0.5 * run) * w;
    m.elR.rotation.x -= 1.1 * run;
    m.elL.rotation.x -= 1.1 * run;
    if (c.role === 'still' && c.v !== 'mech') {
      m.shR.rotation.x -= 0.15;
      m.shL.rotation.x -= 0.15;
    }
    if (c.role === 'chat' && c.talkT > 0) {
      m.elR.rotation.x -= 0.6 + Math.sin(performance.now() / 260) * 0.25;
    }
  }
}

const STAD_GX = [398, 404, 410, 416, 422],
  STAD_GZ = [50, 57.5, 64.5, 71.5]; // los pasillos entre tiendas
let STADC = null;
function spawnStadCrew() {
  STADC = [];
  const add = (look, x, z, face, role, o) => {
    const rig = buildRig(look, { gun: 'm16' });
    rig.gun.visible = !!(o && o.gun);
    world.add(rig.root);
    rig.root.position.set(x, 0, z);
    rig.root.rotation.y = face;
    const c = Object.assign(
      {
        team: 'civ',
        x,
        z,
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
        role,
        waitT: rr(1, 6),
        spd: rr(1.0, 1.25),
        m: rig
      },
      o || {}
    );
    STADC.push(c);
    return c;
  };
  // centinelas en la puerta sur y en el aparcamiento de vehículos
  add('pak', 412.4, 85, 0, 'still', { gun: true });
  add('pak', 417.6, 85, 0, 'still', { gun: true });
  add('pak', 432.5, 47.5, -PH * 0.6, 'still', { gun: true });
  // hombres caminando por los pasillos entre las tiendas
  const walker = (look, n) => {
    for (let k = 0; k < n; k++) {
      const gi = ri(STAD_GX.length),
        gj = ri(STAD_GZ.length),
        c = add(look, STAD_GX[gi] + rr(-0.4, 0.4), STAD_GZ[gj] + rr(-0.4, 0.4), rnd() * 6.283, 'walk');
      c.gi = gi;
      c.gj = gj;
      c.waitT = rr(0, 4);
    }
  };
  walker('pak', 7);
  // corrillos hablando junto a las tiendas y los camiones
  for (const [gx, gz, n] of [
    [429.3, 61, 3],
    [416, 47.8, 2],
    [398.2, 47.5, 2]
  ])
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.283 + rr(-0.3, 0.3),
        x = gx + Math.cos(a) * 1.0,
        z = gz + Math.sin(a) * 1.0;
      const c = add('pak', x, z, Math.atan2(gx - x, gz - z), 'chat');
      c.talkT = rnd() < 0.4 ? rr(0.5, 2) : 0;
    }
  add('pak', 407, 58.6, PH, 'still').poseName = 'sit';
  // la última noche: los Rangers que volvieron antes, ya sin casco, andando de un lado a otro, de pie junto a los muertos
  if (MIS && MIS.id === 'mile') {
    walker('base', 6);
    for (const [x, z, f] of [
      [431, 77.6, Math.PI],
      [433.2, 77.4, Math.PI * 1.1],
      [427.4, 71.4, PH * 0.4]
    ])
      add('base', x, z, f, 'still');
  }
}
function updStadCrew(dt) {
  const near = Math.hypot(camS.tx - STADIUM.x, camS.tz - STADIUM.z) < 130;
  if (!STADC) {
    if (!near) return;
    spawnStadCrew();
  }
  for (const c of STADC) c.m.root.visible = near;
  if (!near || dt <= 0) return;
  for (const c of STADC) {
    let tx = null,
      tz = null;
    if (c.role === 'walk') {
      if (c.tx == null) {
        c.waitT -= dt;
        if (c.waitT <= 0) {
          const opts = [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1]
            ]
              .map(([a, b]) => [c.gi + a, c.gj + b])
              .filter(([i, j]) => i >= 0 && i < STAD_GX.length && j >= 0 && j < STAD_GZ.length),
            [i, j] = pick(opts);
          c.gi = i;
          c.gj = j;
          c.tx = STAD_GX[i] + rr(-0.45, 0.45);
          c.tz = STAD_GZ[j] + rr(-0.45, 0.45);
        }
      }
      if (c.tx != null) {
        tx = c.tx;
        tz = c.tz;
        if (Math.hypot(tx - c.x, tz - c.z) < 0.4) {
          c.tx = null;
          c.waitT = rnd() < 0.6 ? rr(0.1, 0.6) : rr(2, 7);
        }
      }
    } else if (c.role === 'chat') {
      c.waitT -= dt;
      if (c.waitT <= 0) {
        c.waitT = rr(1.5, 5);
        if (rnd() < 0.45) c.talkT = rr(1, 2.6);
      }
    }
    let moving = false;
    if (tx != null) {
      const dx = tx - c.x,
        dz = tz - c.z,
        d = Math.hypot(dx, dz) || 1e-4,
        want = c.spd * 0.8,
        a = 1 - Math.exp(-6 * dt);
      c.vx += ((dx / d) * want - c.vx) * a;
      c.vz += ((dz / d) * want - c.vz) * a;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      moving = true;
    } else {
      const f = Math.exp(-10 * dt);
      c.vx *= f;
      c.vz *= f;
    }
    c.moving = moving;
    if (moving && Math.hypot(c.vx, c.vz) > 0.2) c.face = Math.atan2(c.vx, c.vz);
    const r = c.m.root;
    r.position.set(c.x, 0, c.z);
    let df = c.face - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, dt * 8), -dt * 8, dt * 8);
    animRig(c, dt);
    const m = c.m,
      sp = Math.hypot(c.vx, c.vz),
      w = clamp(sp / 0.9, 0, 1),
      s = Math.sin(m.phase);
    m.shR.rotation.x += s * 0.35 * w;
    m.shL.rotation.x -= s * 0.35 * w;
    if (c.role === 'chat' && c.talkT > 0) {
      m.elR.rotation.x -= 0.6 + Math.sin(performance.now() / 260) * 0.25;
    }
  }
}

function looks(look, spec) {
  const P = {
    pelvis: [],
    abd: [],
    chest: [],
    neck: [],
    head: [],
    uaL: [],
    faL: [],
    hdL: [],
    uaR: [],
    faR: [],
    hdR: [],
    thL: [],
    shL: [],
    ftL: [],
    thR: [],
    shR: [],
    ftR: [],
    gun: [],
    mag: [],
    cant: [],
    strap: [],
    sling: [],
    tail: [],
    ant1: [],
    ant2: []
  };
  const skin = spec.skin || 0xc48b63;
  if (look === 'base') return baseLook(P, spec);
  if (look === 'militia' || look === 'civ') {
    const civ = look === 'civ',
      woman = civ && spec.woman;
    const sk = pick([0x4a3020, 0x553624, 0x3e281c, 0x5e3c26]),
      hair = 0x151311;
    const shirt = pick([
      0xc8beaa, 0x6c7a86, 0x8a5e4e, 0x7a805e, 0xd6cdb8, 0x58566a, 0xa8925e, 0xb8b0a0, 0x5a6a4a, 0x9a4a3a
    ]);
    const spt = pick([UPT.CLOTH, UPT.CLOTH, UPT.PLAID, UPT.STRIPE]);
    const pants = pick([0x3a3a36, 0x6b5a45, 0x2f3a4a, 0x5b5040, 0x8a7a60, 0x4a5236]);
    const kilt = woman || rnd() < 0.45,
      lower = woman
        ? pick([0x8a2a4a, 0x2a6a8a, 0xc89a2a, 0x6a3a8a, 0x3a7a5a, 0xb04a2a])
        : kilt
          ? pick([0x6a5a7a, 0x7a6a4a, 0x4a5a6a, 0x8a5a4a, 0x3a5a5a])
          : pants,
      lpt = kilt ? UPT.PLAID : UPT.CLOTH;
    E(P.pelvis, 0.28, 0.16, 0.18, 0, 0, 0, lower, 1.05, lpt);
    if (rnd() < 0.6) Bx(P.pelvis, 0.3, 0.035, 0.2, 0, 0.06, 0, pick([0x3a2a1c, 0x4a3a2a, 0x1c1c1a]), UPT.LEATHER);
    E(P.abd, 0.27, 0.18, 0.17, 0, 0.07, 0, shirt, 1.04, spt);
    E(P.chest, 0.29, 0.24, 0.18, 0, 0.08, 0, shirt, 1.1, spt);
    Sp(P.chest, 0.1, 0.1, 0.1, 0.18, 0.18, 0, shirt, spt);
    Sp(P.chest, 0.1, 0.1, 0.1, -0.18, 0.18, 0, shirt, spt);
    const rig = civ ? 1 : rnd();
    if (rig < 0.35) {
      const rc = pick([0x6a6a4a, 0x5a5a3e, 0x7a704e]);
      Bx(P.abd, 0.26, 0.11, 0.065, 0, 0.12, 0.1, rc, UPT.CLOTH);
      for (let k = 0; k < 3; k++) Bx(P.abd, 0.07, 0.08, 0.03, -0.08 + k * 0.08, 0.12, 0.14, shade(rc, 0.9), UPT.CLOTH);
      Bx(P.chest, 0.04, 0.03, 0.27, 0.1, 0.18, 0, rc, UPT.WEB, -0.25);
      Bx(P.chest, 0.04, 0.03, 0.27, -0.1, 0.18, 0, rc, UPT.WEB, -0.25);
    } else if (rig < 0.6) {
      Bx(P.chest, 0.05, 0.42, 0.03, 0, 0.04, 0.1, 0x3a3428, UPT.LEATHER, 0, 0, 0.62);
      for (let k = 0; k < 5; k++)
        Bx(P.chest, 0.012, 0.03, 0.012, -0.1 + k * 0.05, -0.08 + k * 0.06, 0.118, 0xc8a24a, UPT.NONE, 0, 0, 0.62);
    }
    if (rnd() < 0.3) {
      const scc = pick([0xd8d0bc, 0x9a3a2e, 0x3a5a8a, 0xc9a24a]);
      E(P.neck, 0.17, 0.05, 0.16, 0, 0.02, 0, scc, 1, UPT.PLAID);
      Bx(P.tail, 0.055, 0.15, 0.012, 0, -0.07, 0, scc, UPT.PLAID);
      Bx(P.tail, 0.06, 0.02, 0.016, 0, -0.15, 0, shade(scc, 0.85), UPT.PLAID);
      P.tailAt = [0.03, 0.03, -0.075];
    }
    E(P.neck, 0.075, 0.08, 0.075, 0, 0.03, 0, sk, 0.95, UPT.SKIN);
    face(P, sk, hair, { beard: rnd() < 0.35, stubble: rnd() < 0.4 });
    Dm(P.head, 0.158, 0.085, 0.168, 0, 0.132, -0.006, hair, UPT.HAIR);
    const hat = woman ? 2 : rnd();
    if (woman) {
      const sc = pick([0x2a2a3a, 0x6a2a3a, 0xd8c8a8, 0x3a5a7a, 0x8a5a2a]);
      Dm(P.head, 0.2, 0.13, 0.21, 0, 0.12, 0, sc, UPT.CLOTH);
      E(P.head, 0.2, 0.2, 0.2, 0, 0.02, -0.01, sc, 1.05, UPT.CLOTH);
      E(P.neck, 0.26, 0.14, 0.22, 0, -0.02, 0, sc, 1.2, UPT.CLOTH);
      Bx(P.tail, 0.13, 0.22, 0.014, 0, -0.105, 0, sc, UPT.CLOTH);
      P.tailAt = [0, 0.03, -0.1];
    }
    if (hat < 0.25) Dm(P.head, 0.175, 0.095, 0.182, 0, 0.142, 0, pick([0xe6e0d0, 0xd8d0bc, 0x2a2a28]), UPT.CLOTH);
    else if (hat < 0.45) {
      const hc = pick([0xd8d0bc, 0x8a3a2a, 0x5a6a4a, 0xe8e2d0, 0x3a5a8a]);
      E(P.head, 0.182, 0.075, 0.19, 0, 0.16, 0, hc, 0.88, UPT.PLAID);
      Bx(P.head, 0.05, 0.12, 0.03, 0.03, 0.06, -0.09, hc, UPT.PLAID, 0.3);
    }
    if (rnd() < 0.2) Bx(P.head, 0.112, 0.024, 0.018, 0, 0.1, 0.086, 0x101010, UPT.NONE);
    const sleeve = rnd() < 0.5;
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      E(P['ua' + s], 0.095, 0.24, 0.1, 0, -0.11, 0, sleeve ? shirt : sk, 1.1, sleeve ? spt : UPT.SKIN);
      Sp(P['fa' + s], 0.08, 0.08, 0.08, 0, 0, 0, sleeve ? shirt : sk, sleeve ? spt : UPT.SKIN);
      E(P['fa' + s], 0.078, 0.19, 0.08, 0, -0.095, 0, sk, 0.9, UPT.SKIN);
      if (rnd() < 0.2) Cy(P['fa' + s], 0.085, 0.02, 0, -0.17, 0, pick([0xc8a24a, 0x8a8a84]), UPT.GUN);
      hand(P['hd' + s], sk, false, sg);
      if (woman) {
        E(P['th' + s], 0.17, 0.27, 0.18, 0, -0.12, 0, lower, 1.1, UPT.CLOTH);
        E(P['sh' + s], 0.14, 0.22, 0.15, 0, -0.1, 0, lower, 1.15, UPT.CLOTH);
      } else if (kilt) {
        E(P['th' + s], 0.15, 0.26, 0.16, 0, -0.12, 0, lower, 1.12, UPT.PLAID);
        Sp(P['sh' + s], 0.09, 0.09, 0.09, 0, 0, 0, sk, UPT.SKIN);
        E(P['sh' + s], 0.085, 0.21, 0.09, 0, -0.105, 0, sk, 1, UPT.SKIN);
      } else {
        E(P['th' + s], 0.125, 0.27, 0.13, 0, -0.13, 0, pants, 1.12, UPT.CLOTH);
        Sp(P['sh' + s], 0.11, 0.1, 0.11, 0, 0, 0, pants, UPT.CLOTH);
        E(P['sh' + s], 0.1, 0.21, 0.1, 0, -0.105, 0, pants, 1, UPT.CLOTH);
      }
      if (rnd() < 0.5) {
        // sandalias
        Bx(P['ft' + s], 0.095, 0.045, 0.18, 0, -0.035, 0.04, sk, UPT.SKIN);
        Bx(P['ft' + s], 0.108, 0.018, 0.205, 0, -0.06, 0.045, pick([0x2a2622, 0x3a3028, 0x5a4a3a]), UPT.LEATHER);
        Bx(P['ft' + s], 0.1, 0.012, 0.03, 0, -0.012, 0.07, 0x2a2622, UPT.NONE);
      } else {
        const sc = pick([0xd8d4c8, 0x8a8a84, 0x3a3a38]);
        Bx(P['ft' + s], 0.105, 0.06, 0.2, 0, -0.03, 0.04, sc, UPT.CLOTH);
        Bx(P['ft' + s], 0.112, 0.02, 0.21, 0, -0.06, 0.045, 0xe8e4d8, UPT.RUBBER);
      }
    }
    const gp = civ ? [[], [[0.01, 0.01, 0.01, 0, 0, 0, 0x000000]]] : gunParts(spec.gun === 'rpg' ? 'rpg' : 'ak');
    P.gun = gp[0];
    P.mag = gp[1];
    if (!civ && spec.gun !== 'rpg') {
      const slc = [0x3a2a1c, 0x4a4a32, 0x2a2622][(sk >> 4) % 3];
      /* Ninguna tirada extra de la secuencia aleatoria: las misiones salen igual que antes */ Bx(
        P.sling,
        0.022,
        0.2,
        0.006,
        0,
        -0.1,
        0,
        slc,
        UPT.LEATHER
      );
      P.slingAt = [0, -0.03, -0.22];
    }
    if (!civ && rnd() < 0.2) {
      Cy(P.chest, 0.06, 0.7, 0.08, 0.12, -0.15, 0x4a5a3a, UPT.CLOTH, 0.9);
      Cy(P.chest, 0.09, 0.12, 0.1, 0.42, -0.0, 0x3a4a2e, UPT.CLOTH, 0.9);
    }
    return P;
  }
  const delta = look === 'delta',
    pak = look === 'pak',
    hair = pick(HAIRS);
  const UC = pak ? 0x55603a : DCU,
    UPU = pak ? UPT.CLOTH : UPT.DCU; // las tropas paquistaníes de la ONU: verde oliva, chaleco arena y el casco azul
  const vest = delta ? BLK : pak ? 0xc3ad80 : WDL,
    vpt = delta ? UPT.WEB : pak ? UPT.CLOTH : UPT.WDL,
    pouch = delta ? 0x2e2e2c : pak ? 0xa8956a : OD;
  // pelvis y cinturón
  E(P.pelvis, 0.29, 0.17, 0.19, 0, -0.01, 0, UC, 1.06, UPU);
  Sp(P.pelvis, 0.16, 0.1, 0.14, 0, -0.08, 0, UC, UPU);
  Bx(P.pelvis, 0.315, 0.045, 0.215, 0, 0.06, 0, delta ? BLK : OD, UPT.WEB);
  Bx(P.pelvis, 0.04, 0.035, 0.012, 0, 0.06, 0.11, 0x6a6a5a, UPT.GUN);
  if (delta) {
    Bx(P.pelvis, 0.06, 0.07, 0.05, 0.13, 0.03, 0.08, BLK, UPT.WEB);
    Bx(P.pelvis, 0.12, 0.09, 0.05, 0, 0.0, -0.12, BLK, UPT.WEB);
  } else {
    for (const s of [-1, 1]) {
      Bx(P.pelvis, 0.07, 0.08, 0.055, s * 0.1, 0.02, 0.1, OD, UPT.WEB);
      Bx(P.pelvis, 0.074, 0.025, 0.062, s * 0.1, 0.065, 0.1, shade(OD, 0.85), UPT.WEB);
    }
    Bx(P.pelvis, 0.06, 0.06, 0.05, 0.13, 0.02, -0.07, OD, UPT.WEB);
    Cy(P.cant, 0.085, 0.13, 0, -0.072, 0, pak ? 0x4a5236 : OD, UPT.WEB);
    Cy(P.cant, 0.03, 0.02, 0, 0.004, 0, 0x2a2a24, UPT.GUN);
    Bx(P.cant, 0.034, 0.03, 0.014, 0, -0.008, 0.042, shade(OD, 0.85), UPT.WEB);
    P.cantAt = [-0.12, 0.072, -0.1];
  }
  if (delta) {
    Bx(P.cant, 0.085, 0.1, 0.05, 0, -0.06, 0, 0x2e2e2c, UPT.WEB);
    Bx(P.cant, 0.088, 0.022, 0.054, 0, -0.012, 0, BLK, UPT.WEB);
    P.cantAt = [0.135, 0.055, -0.07];
  }
  Bx(P.strap, 0.026, 0.15, 0.006, 0, -0.075, 0, delta ? 0x2e2e2c : shade(OD, 0.8), UPT.WEB);
  Bx(P.strap, 0.03, 0.018, 0.01, 0, -0.15, 0, 0x2a2a24, UPT.GUN);
  P.strapAt = [0.158, 0.045, 0.035];
  // abdomen
  E(P.abd, 0.27, 0.18, 0.18, 0, 0.07, 0, UC, 1.04, UPU);
  Bx(P.abd, 0.33, 0.15, 0.24, 0, 0.085, 0, vest, vpt);
  for (let k = 0; k < 3; k++) {
    Bx(P.abd, 0.075, 0.1, 0.05, -0.09 + k * 0.09, 0.075, 0.13, k === 1 && delta ? 0x3a3a36 : pouch, UPT.WEB);
    Bx(P.abd, 0.078, 0.028, 0.055, -0.09 + k * 0.09, 0.125, 0.132, shade(pouch, 0.85), UPT.WEB);
  }
  // pecho
  E(P.chest, 0.3, 0.24, 0.2, 0, 0.08, 0, UC, 1.1, UPU);
  Sp(P.chest, 0.12, 0.12, 0.12, 0.185, 0.175, 0, UC, UPU);
  Sp(P.chest, 0.12, 0.12, 0.12, -0.185, 0.175, 0, UC, UPU);
  Bx(P.chest, 0.35, 0.2, 0.25, 0, 0.075, 0, vest, vpt);
  Bx(P.chest, 0.3, 0.05, 0.24, 0, 0.18, -0.012, shade(vest, 0.9), vpt);
  for (const s of [-1, 1]) Bx(P.chest, 0.06, 0.03, 0.27, s * 0.1, 0.19, 0, delta ? BLK : OD, UPT.WEB);
  if (delta) {
    Bx(P.chest, 0.07, 0.12, 0.06, 0.17, 0.1, 0.03, 0x30302c, UPT.WEB);
    Cy(P.chest, 0.012, 0.11, 0.2, 0.2, 0.02, BLK, UPT.GUN);
    Bx(P.chest, 0.05, 0.06, 0.04, -0.11, 0.12, 0.13, BLK, UPT.WEB);
  } else {
    Bx(P.chest, 0.05, 0.06, 0.04, 0.1, 0.13, 0.13, OD, UPT.WEB);
    Cy(P.chest, 0.05, 0.06, -0.1, 0.12, 0.135, 0x3a4030, UPT.GUN, PH);
  }
  const kit = spec.kit;
  if (kit === 'radio') {
    Bx(P.chest, 0.2, 0.27, 0.11, 0, 0.07, -0.17, OD, UPT.WEB);
    Bx(P.chest, 0.18, 0.06, 0.1, 0, 0.22, -0.17, 0x4a4a32, UPT.WEB);
    Bx(P.chest, 0.04, 0.07, 0.03, -0.16, 0.16, 0.1, BLK, UPT.GUN);
    Bx(P.chest, 0.03, 0.03, 0.03, 0.05, 0.25, -0.2, 0x3a3a34, UPT.GUN);
  } else if (kit === 'medic') {
    Bx(P.chest, 0.24, 0.26, 0.13, 0, 0.06, -0.18, delta ? 0x3a3a34 : OD, UPT.WEB);
    Bx(P.chest, 0.06, 0.02, 0.01, 0, 0.1, -0.25, 0xd8d0c0, UPT.NONE);
    Bx(P.chest, 0.02, 0.06, 0.01, 0, 0.1, -0.25, 0xd8d0c0, UPT.NONE);
  } else if (kit === 'pack') {
    Bx(P.chest, 0.22, 0.22, 0.1, 0, 0.06, -0.16, rnd() < 0.5 ? OD : 0x4f5c36, UPT.WEB);
    Cy(P.chest, 0.07, 0.24, 0, 0.2, -0.16, OD, UPT.CLOTH, 0, 0, PH);
  } else if (kit === 'hydra') {
    Bx(P.chest, 0.18, 0.25, 0.07, 0, 0.07, -0.14, BLK, UPT.WEB);
    Cy(P.chest, 0.012, 0.2, 0.1, 0.15, -0.08, 0x2a2a2a, UPT.RUBBER, 0.3);
  } else if (kit === 'breach') {
    Bx(P.chest, 0.18, 0.25, 0.07, 0, 0.07, -0.14, BLK, UPT.WEB);
    Cy(P.chest, 0.035, 0.55, 0.06, 0.14, -0.19, 0x2a2a28, UPT.GUN, 0.4, 0, 0.3);
  }
  // cuello y cabeza
  E(P.neck, 0.075, 0.08, 0.075, 0, 0.03, 0, skin, 0.95, UPT.SKIN);
  face(P, skin, hair, { beard: delta && rnd() < 0.5, stubble: rnd() < 0.5 });
  if (delta) {
    Dm(P.head, 0.21, 0.15, 0.22, 0, 0.145, 0, 0x232322, UPT.RUBBER);
    E(P.head, 0.214, 0.03, 0.224, 0, 0.15, 0, 0x1c1c1b, 1, UPT.RUBBER);
    for (const s of [-1, 1]) {
      Sp(P.head, 0.045, 0.075, 0.075, s * 0.1, 0.1, 0, BLK, UPT.RUBBER);
      Bx(P.head, 0.012, 0.08, 0.012, s * 0.105, 0.17, 0.02, BLK, UPT.NONE);
    }
    Bx(P.head, 0.012, 0.012, 0.09, 0.09, 0.07, 0.07, BLK, UPT.NONE, 0, -0.4, 0);
    Bx(P.head, 0.05, 0.035, 0.03, 0, 0.21, 0.11, 0x3a3a38, UPT.GUN);
    Bx(P.head, 0.075, 0.05, 0.065, 0, 0.255, 0.135, 0x3e3e3c, UPT.GUN);
    Cy(P.head, 0.028, 0.02, 0.02, 0.255, 0.172, 0x55606a, UPT.NONE, PH);
    Cy(P.head, 0.028, 0.02, -0.02, 0.255, 0.172, 0x55606a, UPT.NONE, PH);
    if (rnd() < 0.5) Bx(P.head, 0.118, 0.026, 0.016, 0, 0.1, 0.088, 0x0e0e0e, UPT.NONE);
  } else if (pak) {
    Dm(P.head, 0.245, 0.17, 0.255, 0, 0.14, 0, 0x3c6fb4, UPT.CLOTH, -0.07);
    E(P.head, 0.252, 0.03, 0.265, 0, 0.152, 0, 0x3466a8, 1, UPT.CLOTH, -0.07);
    for (const s of [-1, 1])
      Bx(P.head, 0.012, 0.11, 0.012, s * 0.068, 0.08, 0.035, 0x2a2a24, UPT.NONE, -0.35, 0, s * 0.1);
    Bx(P.head, 0.05, 0.018, 0.028, 0, 0.022, 0.078, 0x2a2a24, UPT.NONE);
  } else {
    Dm(P.head, 0.245, 0.17, 0.255, 0, 0.14, 0, 0xc2ac80, UPU, -0.07);
    E(P.head, 0.252, 0.03, 0.265, 0, 0.152, 0, 0xb8a276, 1, UPU, -0.07);
    Bx(P.head, 0.18, 0.018, 0.04, 0, 0.162, 0.124, 0xb8a276, UPU, 0.1);
    let hn = 7;
    for (const ch of String(spec.name || '') + (spec.name ? '' : String(skin ^ (hair << 3))))
      hn = (Math.imul(hn, 31) + ch.charCodeAt(0)) >>> 0;
    const kitH = /Eversmann/.test(spec.name || '') ? 0 : hn % 20; // Eversmann llevaba las gafas en el casco
    if (kitH < 9) {
      // gafas subidas sobre el casco
      E(P.head, 0.236, 0.016, 0.246, 0, 0.172, -0.002, 0x1b1b19, 0.95, UPT.RUBBER, -0.07, 0, 0, 0); // la cinta elástica, horizontal y ajustada alrededor del casco
      const tilt = -0.42; // van apoyadas en la pendiente del frente del casco, justo encima del ala
      for (const sd of [-1, 1]) {
        const x = sd * 0.037,
          y = 0.182,
          z = 0.121;
        SpR(P.head, 0.07, 0.054, 0.03, x, y, z, 0x1d1d1b, UPT.RUBBER, tilt, sd * 0.32, 0); // copa de goma
        SpR(P.head, 0.056, 0.04, 0.014, x + sd * 0.002, y + 0.002, z + 0.011, 0x5a6870, UPT.NONE, tilt, sd * 0.32, 0); // lente ahumada
        SpR(P.head, 0.02, 0.011, 0.006, x - sd * 0.01, y + 0.01, z + 0.017, 0xb4c0c4, UPT.NONE, tilt, sd * 0.32, 0); // brillo
      }
      Bx(P.head, 0.02, 0.016, 0.018, 0, 0.18, 0.13, 0x1d1d1b, UPT.RUBBER, tilt); // puente de la nariz
    } else if (kitH < 14) {
      // solo una cinta elástica oliva alrededor del casco
      E(P.head, 0.236, 0.012, 0.245, 0, 0.172, -0.002, 0x4f5236, 0.94, UPT.CLOTH, -0.07, 0, 0, 0);
    }
    for (const s of [-1, 1])
      Bx(P.head, 0.012, 0.11, 0.012, s * 0.068, 0.08, 0.035, 0x2a2a24, UPT.NONE, -0.35, 0, s * 0.1);
    Bx(P.head, 0.05, 0.018, 0.028, 0, 0.022, 0.078, 0x2a2a24, UPT.NONE);
  }
  // brazos
  const glove = delta ? 0x5e5e50 : rnd() < 0.5 ? 0x2e2a24 : skin;
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    E(P['ua' + s], 0.102, 0.25, 0.107, 0, -0.11, 0, UC, 1.12, UPU);
    Sp(P['fa' + s], 0.092, 0.092, 0.092, 0, 0, 0, UC, UPU);
    E(P['fa' + s], 0.09, 0.19, 0.092, 0, -0.095, 0, UC, 0.9, UPU);
    Cy(P['fa' + s], 0.093, 0.022, 0, -0.18, 0, shade(UC, 0.9), UPU);
    hand(P['hd' + s], glove, glove !== skin, sg);
  }
  Bx(P.uaR, 0.006, 0.04, 0.055, -0.055, -0.05, 0, 0x5a3a3a, UPT.NONE);
  Bx(P.uaL, 0.006, 0.03, 0.045, 0.056, -0.035, 0, 0x3a3a2a, UPT.NONE);
  if (!pak) usFlag(P.uaL, 0.059, -0.078);
  legs(P, UC, UPU, BOOT, { cargo: true, pads: delta });
  if (delta) {
    Bx(P.thR, 0.04, 0.13, 0.09, -0.08, -0.1, 0.01, BLK, UPT.WEB);
    Bx(P.thR, 0.03, 0.06, 0.05, -0.1, -0.05, 0.04, GM, UPT.GUN);
    Bx(P.thL, 0.04, 0.1, 0.09, 0.075, -0.1, 0, OD, UPT.WEB);
  }
  const gp = gunParts(spec.gun || 'm16');
  P.gun = gp[0];
  P.mag = gp[1];
  P.pistol = [
    [0.026, 0.115, 0.034, 0, -0.085, 0.014, 0x1a1a1a],
    [0.024, 0.045, 0.05, 0, -0.04, -0.02, 0x141413]
  ];
  P.holster = [
    [0.045, 0.12, 0.065, 0, -0.05, 0, 0x2a2824],
    [0.024, 0.045, 0.036, 0, 0.028, 0.006, 0x141413]
  ];
  if (spec.gun !== 'rpg') {
    Bx(P.sling, 0.024, 0.21, 0.006, 0, -0.105, 0, delta ? 0x2a2a28 : shade(OD, 0.85), UPT.WEB);
    Bx(P.sling, 0.03, 0.012, 0.012, 0, 0, 0, GM, UPT.GUN);
    P.slingAt = [0, -0.035, spec.gun === 'car' ? -0.2 : -0.25];
  }
  return P;
}
/* Poses: las rotaciones en x son cabeceo (positivo inclina hacia delante / dobla la rodilla hacia atrás); desplazamientos del arma en el marco del pecho */
const POSE_BASE = {
  py: 0.52,
  lie: 0,
  tor: 0.03,
  head: 0.05,
  rua: [-0.25, 0, 0.15],
  rfa: -1.3,
  rwr: 0,
  lua: [-0.9, 0, -0.35],
  lfa: -1.0,
  lwr: 0.15,
  lth: [0, 0],
  lsh: 0,
  lft: 0,
  rth: [0, 0],
  rsh: 0,
  rft: 0,
  gun: [-0.1, -0.01, 0.17, 0.5, 0.35, 0]
};
const mkPose = o => {
  const p = JSON.parse(JSON.stringify(POSE_BASE));
  return Object.assign(p, o);
};
const POSES = {
  ready: mkPose({}),
  aim: mkPose({
    tor: 0.07,
    head: 0.1,
    rua: [-0.3, 0, 0.25],
    rfa: -1.7,
    rwr: 0.1,
    lua: [-1.2, 0, -0.5],
    lfa: -0.35,
    lwr: -0.1,
    lth: [-0.1, 0],
    lsh: 0.12,
    rth: [0.12, 0],
    rsh: 0.05,
    gun: [-0.1, 0.07, 0.25, 0, 0, 0]
  }),
  kneel: mkPose({
    py: 0.33,
    tor: 0.1,
    head: 0.1,
    rua: [-0.3, 0, 0.25],
    rfa: -1.7,
    rwr: 0.1,
    lua: [-1.2, 0, -0.5],
    lfa: -0.35,
    lwr: -0.1,
    lth: [-1.45, 0],
    lsh: 1.45,
    rth: [0.1, 0],
    rsh: 1.5,
    rft: 0.3,
    gun: [-0.1, 0.07, 0.25, 0, 0, 0]
  }),
  kneelR: mkPose({ py: 0.33, tor: 0.06, lth: [-1.45, 0], lsh: 1.45, rth: [0.1, 0], rsh: 1.5, rft: 0.3 }),
  prone: mkPose({
    lie: 1,
    tor: 0,
    head: -1.15,
    rua: [-2.7, 0, 0.25],
    rfa: -0.5,
    lua: [-2.8, 0, -0.35],
    lfa: -0.3,
    lth: [0, 0.12],
    lsh: 0,
    rth: [0, -0.12],
    rsh: 0,
    lft: 0.9,
    rft: 0.9,
    gun: [-0.08, 0.33, 0.03, -1.5708, 0, 0]
  }),
  pushup: mkPose({
    lie: 1,
    tor: 0,
    head: -0.7,
    rua: [-1.45, 0, 0.32],
    rfa: -0.1,
    lua: [-1.45, 0, -0.32],
    lfa: -0.1,
    lth: [0, 0.08],
    lsh: 0,
    rth: [0, -0.08],
    rsh: 0,
    lft: 0.9,
    rft: 0.9,
    gun: [-0.08, 0.33, 0.03, -1.5708, 0, 0]
  }),
  cower: mkPose({
    lie: 1,
    tor: 0,
    head: -0.5,
    rua: [-2.95, 0, 0.65],
    rfa: -2.2,
    rwr: 0.4,
    lua: [-2.95, 0, -0.65],
    lfa: -2.2,
    lwr: 0.4,
    lth: [-0.15, 0.15],
    lsh: 0.35,
    rth: [0, -0.15],
    rsh: 0.5,
    lft: 0.9,
    rft: 0.9,
    gun: [-0.28, 0.1, 0.05, -1.3, 0, 1.3]
  }),
  treat: mkPose({
    py: 0.33,
    tor: 0.5,
    head: 0.55,
    rua: [-0.75, 0, 0.12],
    rfa: -0.85,
    rwr: 0.3,
    lua: [-0.75, 0, -0.12],
    lfa: -0.85,
    lwr: 0.3,
    lth: [-1.45, 0],
    lsh: 1.45,
    rth: [0.1, 0],
    rsh: 1.5,
    rft: 0.3,
    gun: [-0.05, 0.04, -0.17, -1.1, 0, 0.5]
  }),
  blind: mkPose({
    py: 0.33,
    tor: -0.12,
    head: 0.25,
    rua: [-2.55, 0, 0.18],
    rfa: -0.55,
    lua: [-2.45, 0, -0.3],
    lfa: -0.45,
    lth: [-1.45, 0],
    lsh: 1.45,
    rth: [0.1, 0],
    rsh: 1.5,
    rft: 0.3,
    gun: [-0.04, 0.4, 0.2, 0.15, 0, 0]
  }),
  collapse: mkPose({
    py: 0.3,
    tor: 0.5,
    head: 0.6,
    rua: [0.2, 0, -0.3],
    rfa: -0.4,
    lua: [0.2, 0, 0.3],
    lfa: -0.4,
    lth: [-1.2, 0.15],
    lsh: 1.6,
    rth: [-0.9, -0.15],
    rsh: 1.7,
    lft: 0.5,
    rft: 0.5,
    gun: [-0.3, -0.04, 0.2, 1.2, 0, 0.6]
  }),
  dead: mkPose({
    lie: 1,
    tor: 0,
    head: 0.35,
    rua: [-0.4, 0, -1.3],
    rfa: -0.3,
    rwr: 0.5,
    lua: [-0.4, 0, 1.3],
    lfa: -0.3,
    lwr: 0.5,
    lth: [0, 0.2],
    lsh: 0.2,
    rth: [0, -0.2],
    rsh: 0.1,
    lft: 0.8,
    rft: 0.6,
    gun: [-0.48, 0.08, -0.05, 0, 0, 1.4]
  }),
  downed: mkPose({
    lie: 1,
    tor: -0.1,
    head: 0.25,
    rua: [-1.3, 0, 0.45],
    rfa: -1.5,
    rwr: 0.3,
    lua: [-0.25, 0, -1.0],
    lfa: -0.5,
    lwr: 0.3,
    lth: [-0.55, 0.1],
    lsh: 0.9,
    rth: [0, -0.15],
    rsh: 0.15,
    lft: 0.6,
    rft: 0.7,
    gun: [-0.5, 0.05, 0.1, 0.2, 0, 1.3]
  }),
  slung: mkPose({
    tor: 2.35,
    head: 0.45,
    rua: [-2.55, 0, 0.25],
    rfa: -0.25,
    rwr: 0.3,
    lua: [-2.6, 0, -0.25],
    lfa: -0.2,
    lwr: 0.3,
    lth: [0.05, 0.08],
    lsh: 0.2,
    rth: [-0.05, -0.08],
    rsh: 0.3,
    lft: 0.5,
    rft: 0.6,
    gun: [-0.48, 0.08, -0.05, 0, 0, 1.4]
  }),
  carry: mkPose({
    tor: 0.08,
    head: 0.05,
    rua: [-0.55, 0, 0.12],
    rfa: -0.35,
    lua: [-0.55, 0, -0.12],
    lfa: -0.35,
    gun: [-0.3, -0.04, 0.2, 1.2, 0, 0.6]
  }),
  doorSit: mkPose({
    py: 0.14,
    tor: 0.06,
    head: 0.2,
    rua: [-0.35, 0, 0.25],
    rfa: -1.1,
    lua: [-0.7, 0, -0.35],
    lfa: -0.8,
    lth: [-1.5, 0.12],
    lsh: 1.35,
    rth: [-1.45, -0.1],
    rsh: 1.15,
    lft: 0.25,
    rft: 0.3,
    gun: [-0.12, -0.02, 0.2, 0.9, 0.2, 0.3]
  }),
  sit: mkPose({
    py: 0.14,
    tor: -0.18,
    head: 0.12,
    rua: [-0.15, 0, 0.25],
    rfa: -0.6,
    lua: [-0.2, 0, -0.3],
    lfa: -0.6,
    lth: [-1.5, 0],
    lsh: 0.05,
    rth: [-1.5, 0],
    rsh: 0.08,
    lft: -0.2,
    rft: -0.2,
    gun: [-0.3, -0.04, 0.2, 1.2, 0, 0.6]
  }),
  civ: mkPose({
    tor: 0.02,
    head: 0.02,
    rua: [0.08, 0, -0.1],
    rfa: -0.25,
    rwr: 0,
    lua: [0.08, 0, 0.1],
    lfa: -0.25,
    lwr: 0
  }),
  dead2: mkPose({
    lie: 1,
    tor: 0.35,
    head: 0.5,
    rua: [-0.9, 0, 0.3],
    rfa: -1.2,
    rwr: 0.6,
    lua: [-0.6, 0, -0.2],
    lfa: -1.5,
    lwr: 0.6,
    lth: [-1.0, 0.1],
    lsh: 1.3,
    rth: [-0.6, -0.1],
    rsh: 1.0,
    lft: 0.5,
    rft: 0.4,
    gun: [-0.5, 0.0, 0.1, 0.3, 0, 1.2]
  })
};
const POSE_KEYS = ['py', 'lie', 'tor', 'head', 'rfa', 'lfa', 'lsh', 'rsh'];
const hitMat = new T.MeshBasicMaterial({ visible: false });
const hitGeo = new T.BoxGeometry(0.9, 1.5, 0.9);

/* Marcadores superpuestos: se pintan después del etalonaje para que el azul y el rojo sigan vivos */
const overlay = new T.Scene();
{
  const rm = overlay.remove.bind(overlay);
  overlay.remove = (...o) => {
    for (const x of o) if (x && x.parent && x.parent !== overlay) x.parent.remove(x);
    return rm(...o);
  };
}
// un marcador plano sobre el suelo: dentro del mundo, con test de profundidad, un pelo por encima de la arena, sin dar ni recibir sombra
function grounded(o, y) {
  o.traverse(m => {
    if (m.material) {
      m.material.depthTest = true;
      m.material.depthWrite = false;
      m.material.fog = false;
      m.material.polygonOffset = true;
      m.material.polygonOffsetFactor = -4;
      m.material.polygonOffsetUnits = -4;
      m.material.needsUpdate = true;
    }
    m.castShadow = false;
    m.receiveShadow = false;
  });
  if (y != null) o.position.y = y;
  o.renderOrder = 2;
  world.add(o);
  return o;
}
const COL_US = 0x3d8bff,
  COL_THEM = 0xff3b2e;
// los anillos de cada unidad viven en el mundo, sobre el suelo: finos, suaves y tapados por el hombre que está dentro
function unitRing(r0, r1, col, op) {
  const m = new T.Mesh(
    new T.RingGeometry(r0, r1, 28),
    new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: op,
      side: T.DoubleSide,
      depthWrite: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
  );
  m.rotation.x = -Math.PI / 2;
  world.add(m);
  return m;
}
function ovRing(r0, r1, col, op) {
  const m = new T.Mesh(
    new T.RingGeometry(r0, r1, 32),
    new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: op,
      side: T.DoubleSide,
      depthTest: false,
      depthWrite: false
    })
  );
  m.rotation.x = -Math.PI / 2;
  overlay.add(m);
  return m;
}
function iconTex(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const x = c.getContext('2d');
  const px = (i, j, col) => {
    x.fillStyle = col;
    x.fillRect(i, j, 1, 1);
  };
  if (kind === 'them') {
    for (let j = 0; j < 24; j++)
      for (let i = 0; i < 24; i++) {
        const d = Math.abs(i - 11.5) + Math.abs(j - 11.5);
        if (d <= 10.5) px(i, j, d > 9.5 ? '#000000' : '#ff3b2e');
      }
    for (let t = 0; t < 7; t++) {
      px(9 + t, 9 + t, '#000000');
      px(15 - t, 9 + t, '#000000');
    }
  } else {
    const sel = kind === 'sel',
      down = kind === 'down';
    const fill = down ? '#5a6370' : sel ? '#9cc2ec' : '#5c8fca';
    x.fillStyle = '#000000';
    x.fillRect(2, 6, 20, 13);
    x.fillStyle = fill;
    x.fillRect(3, 7, 18, 11);
    if (sel) {
      x.fillStyle = '#000000';
      x.fillRect(1, 5, 22, 1);
      x.fillRect(1, 19, 22, 1);
      x.fillRect(1, 5, 1, 15);
      x.fillRect(22, 5, 1, 15);
    }
    for (let t = 0; t < 18; t++) {
      const y = 7 + Math.round((t * 10) / 17);
      px(3 + t, y, '#000000');
      px(20 - t, y, '#000000');
    }
  }
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  return t;
}
const ICONS = { us: iconTex('us'), sel: iconTex('sel'), down: iconTex('down'), them: iconTex('them') };
function ovIcon(kind) {
  const s = new T.Sprite(
    new T.SpriteMaterial({ map: ICONS[kind], depthTest: false, depthWrite: false, transparent: true })
  );
  overlay.add(s);
  return s;
}
const ghostGeo = new T.OctahedronGeometry(0.22, 0);

// una malla con skinning por soldado: cada pieza va rígida a su articulación, así el hombre entero es una sola llamada de dibujo (y una de sombra)
function boneVis(b) {
  let v = true;
  Object.defineProperty(b, 'visible', {
    get: () => true,
    set: x => {
      v = !!x;
      b.scale.setScalar(v ? b.baseS || 1 : 0);
    },
    configurable: true
  });
  Object.defineProperty(b, 'shown', { get: () => v });
}
function buildRig(look, spec) {
  const P = looks(look, spec),
    bones = [],
    parts = [];
  const MIL = (look === 'militia' || (look === 'civ' && !(spec && spec.woman))) && !(spec && spec.boxes);
  // las tropas de la ONU y los de la base también llevan el modelo del Ranger (el aspecto antiguo hecho de piezas se sigue dibujando antes, para no alterar la secuencia aleatoria)
  const RV =
    spec && spec.boxes
      ? null
      : look === 'pak'
        ? { helmet: 'un' }
        : look === 'base'
          ? {
              helmet: 'none',
              torso: null, // los hombres de la base: el Ranger tal cual, con chaleco y manga larga, solo que sin casco

              skin: spec.skin || BASE_SKINS[RV_N % BASE_SKINS.length],
              hair: CREW_HAIR[(RV_N++ * 3) % CREW_HAIR.length]
            }
          : null;
  if ((RV && RV.helmet === 'none') || (spec && spec.pilot)) {
    P.sling = [];
    P.holster = [];
    P.pistol = [];
  }
  const MOD = ((look === 'ranger' || look === 'delta') && !(spec && spec.boxes)) || MIL || !!RV,
    SJ = MIL ? SOLD_JM : SOLD_J;
  if (MOD) {
    for (const k of [
      'pelvis',
      'abd',
      'chest',
      'neck',
      'head',
      'uaL',
      'faL',
      'hdL',
      'uaR',
      'faR',
      'hdR',
      'thL',
      'shL',
      'ftL',
      'thR',
      'shR',
      'ftR',
      'cant',
      'strap',
      'tail'
    ])
      P[k] = [];
    if (spec && (spec.medic || spec.kit === 'medic') && !MIL) GmE(P.chest, 'alice', 0, ALICE_AT);
  }
  const jp = (k, x, y, z) => (MOD ? SJ[k] : [x, y, z]);
  const J = (parent, x, y, z, list) => {
    const g = new T.Bone();
    g.position.set(x, y, z);
    parent.add(g);
    bones.push(g);
    if (list && list.length) parts.push([g, list]);
    return g;
  };
  const root = new T.Group(),
    body = new T.Bone();
  bones.push(body);
  const Jp = (par, k, x, y, z, list) => J(par, ...jp(k, x, y, z), list);
  const pelvis = Jp(body, 'pelvis', 0, 0.52, 0, P.pelvis);
  const abd = Jp(pelvis, 'abd', 0, 0.05, 0, P.abd);
  const chest = Jp(abd, 'chest', 0, 0.15, 0, P.chest);
  const neck = Jp(chest, 'neck', 0, 0.2, 0, P.neck);
  const head = Jp(neck, 'head', 0, 0.05, 0, P.head);
  const shL = Jp(chest, 'shL', 0.2, 0.19, 0, P.uaL),
    elL = Jp(shL, 'elL', 0, -0.23, 0, P.faL),
    wrL = Jp(elL, 'wrL', 0, -0.2, 0, P.hdL);
  const shR = Jp(chest, 'shR', -0.2, 0.19, 0, P.uaR),
    elR = Jp(shR, 'elR', 0, -0.23, 0, P.faR),
    wrR = Jp(elR, 'wrR', 0, -0.2, 0, P.hdR);
  const hipL = Jp(pelvis, 'hipL', 0.085, -0.03, 0, P.thL),
    knL = Jp(hipL, 'knL', 0, -0.26, 0, P.shL),
    anL = Jp(knL, 'anL', 0, -0.21, 0, P.ftL);
  const hipR = Jp(pelvis, 'hipR', -0.085, -0.03, 0, P.thR),
    knR = Jp(hipR, 'knR', 0, -0.26, 0, P.shR),
    anR = Jp(knR, 'anR', 0, -0.21, 0, P.ftR);
  const gun = J(chest, 0, 0, 0, P.gun);
  const gunMag = J(gun, 0, 0, 0, P.mag),
    handMag = J(wrL, 0, 0.03, 0.01, P.mag);
  const pistol = J(wrR, 0, -0.02, 0.03, P.pistol || []),
    holster = J(pelvis, -0.155, -0.05, 0.01, P.holster || []);
  const swg = [],
    hang = (par, at, list, o) => {
      if (!list.length || !at) return;
      swg.push(Object.assign({ b: J(par, at[0], at[1], at[2], list), axis: SW_DOWN, rest: SW_DOWN }, o));
    };
  hang(pelvis, P.cantAt, P.cant, { L: 0.075, k: 60, c: 7, lim: 0.45, in: 0.7, zMax: 0.18 }); // cantimplora / bolsillo, golpeando contra la cadera
  hang(pelvis, P.strapAt, P.strap, { L: 0.09, k: 6, c: 5, lim: 0.8, in: 0.8, xMin: -0.12 }); // una punta de correa suelta
  hang(gun, P.slingAt, P.sling, { L: 0.11, k: 5, c: 5, lim: 0.85, in: 0.7 }); // la correa bajo el fusil
  hang(neck, P.tailAt, P.tail, { L: 0.09, k: 8, c: 4.5, lim: 0.7, in: 0.8, rest: SW_TAIL, zMax: -0.08 }); // la punta de un pañuelo por la espalda
  if (P.ant1.length && P.antAt) {
    const a1 = J(chest, P.antAt[0], P.antAt[1], P.antAt[2], P.ant1),
      a2 = J(a1, 0, 0.28, 0, P.ant2);
    swg.push({ b: a1, b2: a2, axis: SW_UP, rest: SW_ANT, L: 0.55, k: 120, c: 4, lim: 0.45, gs: 0.3, in: 1 });
  } // la antena de látigo sobre la radio
  // fusiono las piezas en la pose de reposo, cada vértice con todo su peso en su propia articulación
  const mesh = new T.SkinnedMesh(new T.BufferGeometry(), unitSkinMat);
  mesh.add(body);
  root.add(mesh);
  mesh.updateMatrixWorld(true);
  const pos = [],
    nor = [],
    col = [],
    pat = [],
    lp = [],
    si = [],
    sw = [],
    ind = [],
    uvs = [];
  let off = 0;
  const nm = new T.Matrix3();
  if (MOD) {
    const S_ = soldMesh(MIL ? 'militia' : RV ? 'ranger' : look); // el modelo, ya en esta pose de reposo, cada vértice con hasta cuatro huesos
    const tk = !MIL
        ? -1
        : spec && spec.tex != null
          ? spec.tex
          : look === 'civ'
            ? CIV_TEX[(CIV_N++ * 3) % CIV_TEX.length]
            : MIL_ALL[MIL_N++ % MIL_ALL.length],
      cl = tk >= 0 ? milCell(tk) : null;
    for (let i = 0; i < S_.nv; i++) {
      if (RV) {
        const fl = rgVariant(i, S_, pos, nor, col, RV);
        uvs.push(S_.U[i * 2], S_.U[i * 2 + 1]);
        pat.push(0);
        lp.push(fl, 100, 0);
        for (let q = 0; q < 4; q++) {
          si.push(S_.SI[i * 4 + q]);
          sw.push(S_.SW[i * 4 + q]);
        }
        continue;
      } else {
        pos.push(S_.P[i * 3], S_.P[i * 3 + 1], S_.P[i * 3 + 2]);
        nor.push(S_.N[i * 3], S_.N[i * 3 + 1], S_.N[i * 3 + 2]);
        col.push(1, 1, 1);
        if (cl) uvs.push(cl[0] + S_.U[i * 2] * cl[2], cl[1] + S_.U[i * 2 + 1] * cl[3]);
        else uvs.push(S_.U[i * 2], S_.U[i * 2 + 1]);
      }
      pat.push(0);
      lp.push(0, 0, 0);
      for (let q = 0; q < 4; q++) {
        si.push(S_.SI[i * 4 + q]);
        sw.push(S_.SW[i * 4 + q]);
      }
    }
    for (let i = 0; i < S_.I.length; i++) ind.push(S_.I[i]);
    off = S_.nv;
  }
  for (const [b, list] of parts) {
    const gg = partGeo(list),
      bi = bones.indexOf(b);
    nm.getNormalMatrix(b.matrixWorld);
    const pa = gg.attributes.position,
      na = gg.attributes.normal;
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(b.matrixWorld);
      pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      nor.push(_v.x, _v.y, _v.z);
      si.push(bi, 0, 0, 0);
      sw.push(1, 0, 0, 0);
      uvs.push(SOLD_UV0[0], SOLD_UV0[1]);
    }
    col.push(...gg.attributes.color.array);
    pat.push(...gg.attributes.aPat.array);
    lp.push(...gg.attributes.aLP.array);
    const ix = gg.index.array;
    for (let i = 0; i < ix.length; i++) ind.push(ix[i] + off);
    off += pa.count;
    gg.dispose();
  }
  const geo = mesh.geometry;
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('aPat', new T.Float32BufferAttribute(pat, 1));
  geo.setAttribute('aLP', new T.Float32BufferAttribute(lp, 3));
  geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
  geo.setIndex(ind);
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.boundingSphere = new T.Sphere(new T.Vector3(0, 0.6, 0), 1.7);
  mesh.bind(new T.Skeleton(bones));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  for (const q of swg) q.b.quaternion.setFromUnitVectors(q.axis, q.rest); // atado recto y luego puesto a colgar en reposo
  for (const b of [gun, gunMag, handMag, pistol]) boneVis(b);
  handMag.visible = false;
  pistol.visible = false;
  const rig = {
    root,
    body,
    pelvis,
    abd,
    chest,
    torso: chest,
    neck,
    head,
    shL,
    elL,
    wrL,
    shR,
    elR,
    wrR,
    hipL,
    knL,
    anL,
    hipR,
    knR,
    anR,
    gun,
    gunMag,
    handMag,
    pistol,
    holster,
    skin: mesh,
    walk: 0,
    phase: rnd() * 6,
    recoil: 0,
    breathe: rnd() * 6,
    fidT: rr(3, 9),
    fid: null,
    hitSide: 1,
    talkB: 0,
    prevYaw: null,
    turnW: 0,
    sw: swg
  };
  if (MOD) {
    rig.model = look;
    rig.body.scale.setScalar(SOLD_K);
    for (const b of [gun, handMag, pistol]) {
      b.baseS = 1 / SOLD_K;
      b.scale.multiplyScalar(1 / SOLD_K);
    }
    rig.L1 = -SJ.elL[1];
    rig.L2 = -SJ.wrL[1];
    rig.armOut = 0.16;
    rig.py0 = SJ.pelvis[1];
    const g = MIL ? (look === 'civ' ? 'none' : spec && spec.gun === 'rpg' ? 'rpg' : 'ak') : (spec && spec.gun) || 'm16';
    rig.gripR =
      g === 'car'
        ? [0, -0.058, -0.05]
        : g === 'ak'
          ? [0, -0.072, -0.115]
          : g === 'rpg'
            ? [0, 0.0, 0.095]
            : [0, -0.055, -0.045];
    rig.gripL =
      g === 'car'
        ? [0, -0.012, 0.1]
        : g === 'm203'
          ? [0, -0.07, 0.2]
          : g === 'ak'
            ? [0, -0.014, 0.235]
            : g === 'rpg'
              ? [0, -0.035, 0.25]
              : [0, -0.01, 0.13];
    if (g === 'none') rig.noGun = true;
  }
  rig.geo0 = geo;
  rig.lv = 0;
  if (BATCH_ON) {
    mesh.visible = false;
    RIGS.push(rig);
  } // lo dibuja su batch, no él solo
  return rig;
}
