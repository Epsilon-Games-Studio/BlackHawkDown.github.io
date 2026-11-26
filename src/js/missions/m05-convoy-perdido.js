/* ====================================================================================================
 * missions/m05-convoy-perdido.js
 *
 * 5 · El convoy perdido: la columna de McKnight perdida por las calles al oeste del K-4, tal como la dibujé en el mapa.
 * Dos paradas bajo fuego (5 y 3 minutos), barricadas cerrando todas las demás salidas y la vuelta hacia la base.
 * ================================================================================================== */

const CV_RT = [
  [60, 410.5],
  [190, 410.5],
  [190, 359],
  [220.5, 359],
  [220.5, 410.5],
  [235.5, 410.5],
  [235.5, 476]
];
const CV_X = [
  { x: 181, z: 410.5 },
  { x: 214, z: 359 },
  { x: 231, z: 410.5 }
]; // las tres cruces naranjas
// las líneas rojas: todas las demás salidas de cada cruce están cerradas con neumáticos ardiendo, escombros y chatarra
const CV_BAR = [
  [201, 410.5, 'z'],
  [190, 418.5, 'x'],
  [190, 351, 'x'],
  [220.5, 350.5, 'x'],
  [228.5, 359, 'z'],
  [235.5, 402, 'x'],
  [249, 410.5, 'z'],
  [220.5, 418.5, 'x']
];
const CV_GROUPS = ['Rangers · columna A', 'Kilo 3-1', 'Rangers · columna B'];
function cvS(C, i) {
  return routeS(C, CV_X[i].x, CV_X[i].z);
}
// hombres bajando de los vehículos: vuelven al mundo junto a su vehículo y luego salen a su lado de la columna
function unmount(u, x, z) {
  if (!u.mounted || u.wasDown) return;
  const c = findWalk(x, z);
  u.mounted = false;
  u.alive = true;
  u.down = false;
  u.x = c[0] + 0.5;
  u.z = c[1] + 0.5;
  u.vx = u.vz = 0;
  u.path = [];
  u.order = null;
  u.stance = 'stand';
  u.sup = 0;
  u.elev = 0;
  if (!units.includes(u)) units.push(u);
  world.add(u.m.root);
  u.m.root.position.set(u.x, 0, u.z);
  for (const k of ['ring', 'sel', 'icon']) if (u.m[k]) overlay.add(u.m[k]);
  if (BATCH_ON && !RIGS.includes(u.m)) RIGS.push(u.m);
}
function cvDismount() {
  const C = G.m.conv,
    V = C.veh,
    perp = v => [Math.cos(v.g.rotation.y), -Math.sin(v.g.rotation.y)];
  // Rangers A a la izquierda de los vehículos de cabeza, Delta por el medio y Rangers B a la derecha de los de cola
  const plan = [
    [0, [0, 1], -1],
    [1, [2, 3], 0],
    [2, [3, 4, 5], 1]
  ];
  for (const [gi, vs, side] of plan) {
    const g = grpN(CV_GROUPS[gi]);
    if (!g) continue;
    g.members
      .filter(u => u.mounted && !u.wasDown)
      .forEach((u, i) => {
        const v = V[vs[i % vs.length]],
          [px, pz] = perp(v),
          sd = side || (i % 2 ? 1 : -1);
        unmount(u, v.x, v.z);
        const along = (Math.floor(i / vs.length) - 0.5) * 1.6,
          hx = Math.sin(v.g.rotation.y),
          hz = Math.cos(v.g.rotation.y);
        goTo(u, v.x + px * sd * 2.6 + hx * along, v.z + pz * sd * 2.6 + hz * along);
        u.order = { type: 'cover' };
      });
  }
  cvRect();
  G.sel = new Set(us.filter(u => u.alive && !u.npc));
  buildCards();
  refreshCards();
}
function cvMountAll(force) {
  for (const u of us)
    if (!u.mounted && !u.npc && (u.alive || u.down)) {
      if (u.down) u.wasDown = true;
      mount(u);
    }
}
// la milicia por el camino: en las azoteas y en las bocacalles, disparando a la columna al pasar. Su fuego es solo de adorno
// (un vehículo no puede recibir daño), pero los tiradores de los Humvees les contestan y tumban a algunos.
function cvAmbientPlan() {
  const C = G.m.conv,
    spots = [];
  for (let s = 40; s < C.L; s += 7.5) {
    const [x, z, hd] = polyAt(C, s),
      side = spots.length % 2 ? 1 : -1,
      px = Math.cos(hd) * side,
      pz = -Math.sin(hd) * side;
    spots.push({ s, x: x + px * rr(5, 9), z: z + pz * rr(5, 9), roof: rnd() < 0.5, men: [] });
  }
  G.m.amb = spots;
  G.m.ambT = 0;
}
function cvAmbient(dt) {
  const C = G.m.conv;
  if (!C || !G.m.amb) return;
  const lead = C.s;
  for (const sp of G.m.amb) {
    if (!sp.done && lead > sp.s - 50 && lead < sp.s + 10) {
      sp.done = true;
      for (let k = 0; k < (sp.roof ? 1 : 2); k++) {
        const e = sp.roof
          ? roofFoe(sp.x, sp.z, 'amb')
          : foe(sp.x + rr(-1.5, 1.5), sp.z + rr(-1.5, 1.5), 'post', 'amb', CAMP_ESPEC);
        if (e) {
          e.noFire = true;
          e.stance = 'stand';
          sp.men.push(e);
        }
      }
    }
    if (sp.done && !sp.gone && lead > sp.s + 45 && !G.m.fight) {
      sp.gone = true;
      for (const e of sp.men)
        if (e.alive) {
          e.alive = false;
          world.remove(e.m.root);
          dropOverlay(e);
        }
    }
  }
  if (C.v < 0.3) return;
  G.m.ambT -= dt;
  if (G.m.ambT > 0) return;
  G.m.ambT = rr(0.12, 0.3);
  const live = [],
    V = C.veh;
  for (const sp of G.m.amb)
    for (const e of sp.men) if (e.alive && Math.hypot(e.x - V[0].x, e.z - V[0].z) < 46) live.push(e);
  if (!live.length) return;
  const e = pick(live),
    v = pick(V),
    y0 = (e.elev || 0) + 1.25;
  e.face = Math.atan2(v.x - e.x, v.z - e.z);
  e.firing = 0.6;
  e.stance = rnd() < 0.5 ? 'crouch' : 'stand';
  e.spotted = true;
  const n = 2 + ri(3);
  for (let k = 0; k < n; k++) {
    const tx = v.x + rr(-1.2, 1.2),
      ty = rr(0.6, 2.2),
      tz = v.z + rr(-1.2, 1.2);
    tracer(e.x + Math.sin(e.face) * 0.5, y0, e.z + Math.cos(e.face) * 0.5, tx, ty, tz, 0x9aff5a, k * 0.08);
    if (rnd() < 0.4)
      sched.push({
        at: G.t + 0.2 + k * 0.08,
        fn: () => {
          lightFlash(tx, ty, tz, 0xffd080, 1.2, 2.4, 0.06);
          for (let q = 0; q < 4; q++)
            spawnP(
              tx,
              ty,
              tz,
              rr(-2, 2),
              rr(0, 2.5),
              rr(-2, 2),
              rr(0.15, 0.3),
              0.04,
              0.02,
              0xfff0b0,
              0xff8030,
              1,
              1,
              9
            );
        }
      });
  }
  flash(e.x + Math.sin(e.face) * 0.5, y0, e.z + Math.cos(e.face) * 0.5);
  sfx('ak', e.x, e.z);
  // las balas que fallan, y la respuesta de los tiradores, se comen las paredes a los dos lados de la calle
  for (let k = 0; k < 2 + ri(3); k++) cvWallHit(pick(V), rnd() < 0.5 ? e : null, k * 0.07);
}
function cvWallHit(v, from, del) {
  const ry = v.g ? v.g.rotation.y : 0,
    px = Math.cos(ry),
    pz = -Math.sin(ry),
    side = rnd() < 0.5 ? 1 : -1;
  let ox, oy, oz;
  if (from) {
    ox = from.x;
    oy = (from.elev || 0) + 1.25;
    oz = from.z;
  } else {
    ox = v.x;
    oy = 2.3;
    oz = v.z;
  }
  const tx = v.x + px * side * rr(6, 14) + (v.fx || 0) * rr(-8, 8),
    tz = v.z + pz * side * rr(6, 14) + (v.fz || 0) * rr(-8, 8);
  const h = traceShot(ox, oy, oz, tx, rr(0.4, 3.6), tz, 14);
  if (!h || h.m === -1) return;
  const col = from ? 0x9aff5a : 0xff7a3a,
    tl = Math.max(0.1, Math.hypot(h.x - ox, h.y - oy, h.z - oz) / 65);
  tracer(ox, oy, oz, h.x, h.y, h.z, col, del);
  sched.push({ at: G.t + del + tl, fn: () => impactFx(h) });
  if (!from && rnd() < 0.5)
    sched.push({
      at: G.t + del,
      fn: () => {
        flash(ox, oy, oz);
        sfx('m16', ox, oz);
      }
    });
}
// el terreno a mantener en una parada: una caja verde alrededor de la columna parada
function cvRect() {
  cvRectOff();
  const C = G.m.conv,
    V = C.veh,
    W = 9.5,
    hw = W / 2;
  // la línea de la propia columna, desde detrás del último vehículo hasta delante del primero, con sus curvas
  const sA = Math.max(0, C.s - (V.length - 1) * C.gap - 5),
    sB = Math.min(C.L, C.s + 5),
    line = [polyAt(C, sA).slice(0, 2)];
  for (let k = 1; k < C.pts.length - 1; k++)
    if (C.cum[k] > sA + 0.5 && C.cum[k] < sB - 0.5) line.push(C.pts[k].slice());
  line.push(polyAt(C, sB).slice(0, 2));
  const Lft = [],
    Rgt = [];
  for (let k = 0; k < line.length; k++) {
    const p = line[k],
      a = line[Math.max(0, k - 1)],
      b = line[Math.min(line.length - 1, k + 1)];
    const d0 = k ? [p[0] - a[0], p[1] - a[1]] : [b[0] - p[0], b[1] - p[1]],
      d1 = k < line.length - 1 ? [b[0] - p[0], b[1] - p[1]] : d0;
    const n0 = [-d0[1], d0[0]].map(v => v / Math.hypot(d0[0], d0[1])),
      n1 = [-d1[1], d1[0]].map(v => v / Math.hypot(d1[0], d1[1]));
    let mx = n0[0] + n1[0],
      mz = n0[1] + n1[1];
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml;
    mz /= ml;
    const sc = hw / Math.max(0.5, mx * n0[0] + mz * n0[1]);
    Lft.push([p[0] + mx * sc, p[1] + mz * sc]);
    Rgt.push([p[0] - mx * sc, p[1] - mz * sc]);
  }
  const poly = Lft.concat(Rgt.reverse());
  const grp = new T.Group();
  grp.position.set(0, 0.06, 0);
  const mat = new T.MeshBasicMaterial({
      color: 0x3dff6a,
      transparent: true,
      opacity: 0.85,
      side: T.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    e = 0.16,
    DA = 1.1,
    GA = 0.7;
  const quad = (x, z, w, d) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0, z);
    grp.add(m);
  };
  // un contorno discontinuo fino, nada dentro
  const dashes = (x0, z0, x1, z1) => {
    const Ln = Math.hypot(x1 - x0, z1 - z0),
      ux = (x1 - x0) / Ln,
      uz = (z1 - z0) / Ln;
    for (let t = 0; t < Ln; t += DA + GA) {
      const a = Math.min(DA, Ln - t),
        mx = x0 + ux * (t + a / 2),
        mz = z0 + uz * (t + a / 2);
      quad(mx, mz, Math.abs(ux) * a + Math.abs(uz) * e, Math.abs(uz) * a + Math.abs(ux) * e);
    }
  };
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k],
      b = poly[(k + 1) % poly.length];
    dashes(a[0], a[1], b[0], b[1]);
  }
  grounded(grp, 0.08);
  G.m.rect = grp;
}
function cvRectOff() {
  const r = G.m.rect;
  if (r) {
    overlay.remove(r);
    r.traverse(o => {
      if (o.geometry) o.geometry.dispose();
    });
    G.m.rect = null;
  }
}
// el plano de apertura: un Ranger a cubierto en el arco disparando calle arriba a milicia en el suelo y en las azoteas. Todo esto
// es solo para la cámara y se quita cuando empieza la misión.
function cvIntroFight() {
  const A = ARCH,
    cine = { us: [], them: [] };
  const R_ = Object.assign({}, RANGERS[0], RSPEC, {
    name: 'Esp. Nelson',
    role: 'Ametrallador M60',
    unitName: 'Romeo 4-1',
    gun: 'saw',
    stance: 'crouch'
  });
  const u = npcUnit(R_, A.x0 + 0.55, A.z1 + 0.7, 0);
  u.stance = 'crouch';
  u.cine = true;
  u.order = { type: 'hold' };
  cine.us.push(u);
  for (let k = 0; k < 7; k++) {
    const e = foe(A.cx + rr(-6, 6), A.z1 + rr(14, 26), 'post', 'cvi', CAMP_ESPEC);
    if (e) {
      e.noFire = true;
      e.spotted = true;
      e.hp = 9999;
      cine.them.push(e);
    }
  }
  for (let k = 0; k < 4; k++) {
    const e = roofFoe(A.cx + rr(-10, 10), A.z1 + rr(10, 22), 'cvi');
    if (e) {
      e.noFire = true;
      e.spotted = true;
      e.hp = 9999;
      cine.them.push(e);
    }
  }
  const X = (cine.X = xfMake(S61.x, S61.z, {
    n: 9,
    r0: 3,
    rr: 16,
    men: [u],
    rate: 1.8,
    nb: 6,
    perRoof: 3,
    streets: 3,
    cine: true,
    tag: 'cvi',
    unit: 'Romeo 2-2',
    r1: 36
  }));
  for (const e of cine.them)
    if (e.alive && !X.them.includes(e)) {
      e.xfire = true;
      X.them.push(e);
    }
  for (const v of X.us) if (!cine.us.includes(v)) cine.us.push(v);
  G.m.cvi = cine;
}
function cvIntroClear() {
  const c = G.m.cvi;
  if (!c) return;
  G.m.cvi = null;
  if (c.X) {
    for (const e of c.X.them) if (!c.them.includes(e)) c.them.push(e);
    c.X.roofs = [];
    c.X.streets = 0;
  }
  for (const e of c.them) {
    e.alive = false;
    if (e.m && e.m.root.parent) e.m.root.parent.remove(e.m.root);
    dropOverlay(e);
    const i = them.indexOf(e);
    if (i >= 0) them.splice(i, 1);
    const j = units.indexOf(e);
    if (j >= 0) units.splice(j, 1);
  }
  for (const u of c.us) {
    u.alive = false;
    u.npc = true;
    const i = units.indexOf(u);
    if (i >= 0) units.splice(i, 1);
    const j = us.indexOf(u);
    if (j >= 0) us.splice(j, 1);
    if (u.m && u.m.root.parent) u.m.root.parent.remove(u.m.root);
    dropOverlay(u);
  }
}
// la milicia alrededor de una parada deja de ser decorado y combate de verdad
function cvWakeAmbient(cx, cz) {
  G.m.fight = true;
  for (const sp of G.m.amb || [])
    for (const e of sp.men)
      if (e.alive && Math.hypot(e.x - cx, e.z - cz) < 40) {
        e.noFire = false;
        e.kind = 'rifle';
      }
}
function cvRoofs(cx, cz, n, tag) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 6.283 + rr(-0.2, 0.2),
      r = rr(12, 26);
    roofFoe(cx + Math.cos(a) * r, cz + Math.sin(a) * r, tag);
  }
}
// un cohete desde una azotea contra un vehículo: encima (directo) o justo al lado
function cvRocket(v, direct, onHit) {
  const a = v.g.rotation.y + (rnd() < 0.5 ? 1.3 : -1.3),
    ox = v.x + Math.sin(a) * 16,
    oz = v.z + Math.cos(a) * 16;
  const b = BLDS.filter(b => b.top > 3)
    .map(b => [Math.hypot(b.x + b.w / 2 - ox, b.y + b.d / 2 - oz), b])
    .sort((p, q) => p[0] - q[0])[0];
  const from = b
    ? { x: b[1].x + b[1].w / 2, z: b[1].y + b[1].d / 2, elev: b[1].top, face: 0, stance: 'stand', firing: 0 }
    : { x: ox, z: oz, elev: 0, face: 0, stance: 'stand', firing: 0 };
  const off = direct ? [0, 1.3, 0] : [Math.sin(a) * 2.6, 0.1, Math.cos(a) * 2.6];
  fireRPG(from, { pos: () => [v.x + off[0], off[1], v.z + off[2]] }, () => {
    const x = v.x + off[0],
      z = v.z + off[2];
    if (!direct) {
      rpgBlast(
        { x, y: 0.05, z, nx: 0, ny: 1, nz: 0, m: -1, c: groundCol(x, z), e: null, dx: 0, dy: -1, dz: 0 },
        null,
        null
      );
    } else {
      for (let q = 0; q < 14; q++)
        spawnChunk(
          v.x,
          1.4,
          v.z,
          rr(-5, 5),
          rr(1, 5),
          rr(-5, 5),
          rr(0.06, 0.18),
          pick([0x4a4e3a, 0x3a3d33, 0x2a2a26, 0x5a5e48]),
          'flake'
        );
      v.smoke = { x: v.x, z: v.z, y: 1.6, rate: 28, life: 5, vy: 1, s0: 0.3, s1: 1.8, fire: 0.25, acc: 0, sp: 0.4 };
      emitters.push(v.smoke);
    }
    for (const u of units) if (u.alive && Math.hypot(u.x - x, u.z - z) < 7) u.sup = Math.min(100, u.sup + 60);
    if (onHit) onHit();
  });
}
function cvWounded(v) {
  const rig = buildRig('ranger', { gun: 'm16' }),
    [px, pz] = [Math.cos(v.g.rotation.y), -Math.sin(v.g.rotation.y)];
  const d = irDecor(rig, v.x + px * 2, v.z + pz * 2, v.g.rotation.y + 1.2, { alive: false, down: true, look: null });
  rig.gun.visible = false;
  (G.m.wounded = G.m.wounded || []).push(d);
  G.m.wnd = d;
  for (let k = 0; k < 3; k++)
    sched.push({
      at: G.t + 0.4 + k * 0.5,
      fn: () => bloodDecal(d.x + rr(-0.3, 0.3), d.z + rr(-0.3, 0.3), rr(0.25, 0.45), 4)
    });
  return d;
}
// donde se para el vehículo de cabeza: la segunda parada está pasada la esquina, así que la columna queda en L
function cvStopS(C, i) {
  return i === 1 ? routeS(C, 220.5, 377) : cvS(C, i);
}
function cvDrive(i, vmax) {
  cvRectOff();
  const C = G.m.conv;
  C.go = true;
  C.limit = i == null ? C.L : cvStopS(C, i);
  C.vmax = vmax || 2.6;
  G.m.fight = false;
}
const cvArrived = () => {
  const C = G.m.conv;
  return C.v < 0.05 && C.s >= C.limit - 0.4;
};
const sayMk = t => say('Tte. Cor. McKnight', t, 'convoy', true),
  sayC2 = t => say('Uniform 6-4', t, 'hq', true);
function cvIntro() {
  const C = G.m.conv,
    ev = G.m.ev,
    st = G.m.steele,
    S = {};
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  let foc = () => [370, 293];
  cvIntroFight();
  cineStart({
    zoom: 9,
    spin: 0.01,
    yaw0: -0.3,
    focus: () => foc(),
    keys: [
      { t: 0.8, fn: () => sayU(ev, '¿Y los vehículos? ¿Cuánto les falta?') },
      { t: 3.5, fn: () => sayU(st, 'McKnight viene para acá, pero se topa con fuego en cada esquina.') },
      {
        t: 9,
        fn: () => {
          foc = () => [C.veh[1].x, C.veh[1].z];
          CINE.zoom = 11;
          cvDrive(0);
        }
      }
    ],
    dur: 1e9,
    tick: dt => {
      cvAmbient(dt);
      if (G.m.cvi) xfStep(G.m.cvi.X, dt);
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 20);
      // unos cincuenta metros más adentro: Pilla
      if (CINE.t > 9 && !S.pi && C.s > 95) {
        S.pi = CINE.t;
        C.vmax = 1.5;
        const L_ = [
          [0, () => say('Sgto. Maddox', '¡Mi coronel! ¡Han dado a Pilla, en el Humvee de detrás!', 'convoy', true)],
          [3, () => sayC2('Romeo 6-4, aquí Uniform 6-4. ¿Tenéis bajas?')],
          [5.6, () => sayMk('Afirmativo. El sargento Dominick Pilla.')],
          [8, () => sayC2('¿Cómo está?')],
          [9.8, () => sayMk('Está muerto.')],
          [12, () => sayC2('A todas las unidades: confirmamos un KIA. Sargento Dominick Pilla.')],
          [15.6, () => sayMk('Uniform 6-4, buscadnos una ruta hasta el helicóptero. Sacadnos de estas calles.')],
          [
            19.4,
            () => {
              S.pd = true;
              C.vmax = 2.6;
            }
          ]
        ];
        for (const [d, f] of L_) sched.push({ at: G.t + d, fn: f });
      }
      if (S.pd && !S.rk && C.s > cvS(C, 0) - 9) {
        S.rk = true;
        cvRocket(C.veh[1], false);
      }
      if (!S.pd && C.limit > cvS(C, 0) - 2) C.limit = cvS(C, 0) - 2; // la columna no llega a su parada antes del cohete
      if (S.pd && C.limit < cvS(C, 0)) C.limit = cvS(C, 0);
      if (S.rk && !S.stop && cvArrived()) {
        S.stop = CINE.t;
      }
      if (S.stop && !S.out && CINE.t > S.stop + 1.2) {
        S.out = true;
        cvDismount();
        CINE.zoom = 10;
      }
      if (S.stop && !S.say && CINE.t > S.stop + 2.5) {
        S.say = true;
        sayMk('¡Todos fuera! ¡Estableced un perímetro, tenemos que sacar a los heridos!');
      }
      if (S.stop && CINE.t > S.stop + 9) cineEnd();
    },
    onEnd: () => {
      cvIntroClear();
      const C_ = G.m.conv;
      if (!S.out) {
        C_.s = C_.limit = cvS(C_, 0);
        convoyStep(C_, 0);
        cvDismount();
      }
      cvWakeAmbient(CV_X[0].x, CV_X[0].z);
      G.sel = new Set(us.filter(u => u.alive && !u.npc));
      refreshCards();
      renderSubs();
      camS.tx = CV_X[0].x - 10;
      camS.tz = CV_X[0].z;
      camS.zoomT = 14;
      hint('Defiende la columna: Rangers a cada lado de los vehículos y Delta en el centro. Ojo con las azoteas.');
    }
  });
}
function cvLeg2() {
  const C = G.m.conv,
    S = {};
  cineStart({
    zoom: 11,
    spin: 0.01,
    yaw0: camS.yaw,
    focus: () => [C.veh[0].x, C.veh[0].z],
    keys: [
      { t: 0.5, fn: () => cvDrive(1) },
      { t: 3, fn: () => sayMk('Uniform 6-4, ¿cuánto queda para llegar a la zona de impacto?') },
      { t: 7, fn: () => sayC2('Siga recto unos 200 metros.') },
      { t: 10.5, fn: () => sayMk('Recibido.') }
    ],
    dur: 1e9,
    tick: dt => {
      cvAmbient(dt);
      if (!S.rk && C.s > cvStopS(C, 1) - 5) {
        S.rk = true;
        const v = C.veh[3];
        cvRocket(v, true, () => {
          S.hit = true;
          cvWounded(v);
          say('Maddox', '¡Impacto en el camión! ¡Tenemos un herido!', 'convoy', true);
        });
      }
      if (S.rk && !S.stop && cvArrived()) S.stop = CINE.t;
      if (S.stop && S.hit && !S.out && CINE.t > S.stop + 1.5) {
        S.out = true;
        cvDismount();
        sayMk('¡Perímetro! ¡Todo el mundo fuera, proteged al herido!');
      }
      if (S.out && CINE.t > S.stop + 8) cineEnd();
    },
    onEnd: () => {
      const C_ = G.m.conv;
      if (!S.out) {
        C_.s = C_.limit = cvStopS(C_, 1);
        convoyStep(C_, 0);
        if (!G.m.wnd) cvWounded(C_.veh[3]);
        cvDismount();
      }
      cvWakeAmbient(CV_X[1].x, CV_X[1].z);
      G.m.leg2 = true;
      renderSubs();
      camS.tx = CV_X[1].x;
      camS.tz = CV_X[1].z + 4;
      camS.zoomT = 14;
    }
  });
}
function cvFinal() {
  const C = G.m.conv,
    S = {};
  let foc = () => [C.veh[0].x, C.veh[0].z];
  G.noLose = true;
  cineStart({
    zoom: 10,
    spin: 0.01,
    yaw0: camS.yaw,
    focus: () => foc(),
    keys: [
      { t: 1, fn: () => sayC2('McKnight, desde arriba piden que dé media vuelta y entre por Hawlwadig.') },
      { t: 6.5, fn: () => sayMk('¿Media vuelta? Acabamos de salir de ahí. Buscadme otra salida.') },
      { t: 12, fn: () => sayC2('Es lo que me pasa el centro de operaciones. Den la vuelta y regresen.') },
      { t: 17.5, fn: () => say('Maddox', 'Así no salimos de aquí ninguno.', 'convoy', true) },
      { t: 21, fn: () => sayMk('Ya lo sé. Tú conduce y no te pares.') },
      {
        t: 23,
        fn: () => {
          cvDrive(2);
          CINE.zoom = 11.5;
        }
      }
    ],
    dur: 1e9,
    tick: dt => {
      cvAmbient(dt);
      if (CINE.t > 23 && !S.rk && C.s > cvS(C, 2) - 5) {
        S.rk = true;
        cvRocket(C.veh[0], true);
      }
      if (S.rk && !S.stop && cvArrived()) {
        S.stop = CINE.t;
        const L_ = [
          [
            2,
            () =>
              sayMk(
                'Uniform 6-4, aquí Romeo 6-4. Estamos otra vez en el mismo cruce. Casi sin munición, con muchos heridos, yo entre ellos, y los vehículos ya no dan más de sí.'
              )
          ],
          [11, () => sayC2('Entendido, Danny. ¿Hay alguna forma de que lleguéis al derribo?')],
          [
            16,
            () =>
              sayMk('Negativo. Con tantos heridos solo seríamos un estorbo. Hay que volver, recargar y salir otra vez.')
          ],
          [24, () => say('JOC', 'C2, que regresen. Sacadlos de ahí.', 'hq', true)],
          [28, () => sayC2('Recibido. Regresen a la base.')],
          [31, () => sayMk('Recibido. Volvemos.')],
          [
            33,
            () => {
              cvDrive(null, 3);
              S.go = CINE.t;
            }
          ]
        ];
        for (const [d, f] of L_) sched.push({ at: G.t + d, fn: f });
      }
      if (S.go && (C.s >= C.L - 0.6 || CINE.t > S.go + 26)) cineEnd();
    },
    onEnd: () => {
      G.m.done5 = true;
    }
  });
}
MISSIONS.convoy = {
  id: 'convoy',
  n: 5,
  chipX: 1.6,
  noObjRing: true,
  orbits: [{ c2: true, x: 192, z: 390, rx: 46, rz: 40, alt: 22, w: (2 * Math.PI) / 70 }],
  title: 'El convoy perdido',
  hud: 'Defender la columna de McKnight',
  phase: 'day',
  hour: 17.0,
  crashed: ['s61', 's64'],
  place: 'Calles al oeste de la K-4',
  squadTxt: 'Rangers + Delta · columna de McKnight',
  date: '3 OCT 1993',
  summary:
    'La columna de McKnight se pierde intentando llegar al Super 6-1. Bajar de los vehículos y defenderla en cada parada bajo el fuego, hasta que la orden sea volver a la base.',
  text: '17:00. En el Super 6-1 esperan a los Humvees. La columna de McKnight de McKnight avanza por las calles al oeste de la K-4, pero cada calle está cortada por barricadas y las indicaciones llegan tarde. La milicia dispara desde todas las azoteas.',
  start: [CV_RT[0][0] + 50, CV_RT[0][1]],
  cam: [370, 293, 9],
  civ: [200, 380],
  spawn() {
    const R = (name, role, unit) => Object.assign({}, RANGERS[0], RSPEC, { name, role, unitName: unit, noFire: true });
    G.m.ev = npcUnit(R('Sgto. Matt Eversmann', 'Jefe · radio', 'Romeo 4-1'), 371.5, 289.5, 2.4);
    G.m.ev.stance = 'crouch';
    G.m.steele = npcUnit(R('Cap. Mike Steele', 'Jefe de compañía', 'Romeo 1-1'), 373.5, 290.5, 2.6);
    G.m.steele.stance = 'crouch';
    spawnForce([
      {
        name: CV_GROUPS[0],
        role: 'Escolta · izquierda',
        kind: 'chalk',
        specs: rangerSpecs(['Sgto. Lorenzo Ruiz', 'Cabo Ottie', 'Esp. Kowalewski', 'Tanaka', 'Morrow', 'Díaz']).map(
          (s, i) => Object.assign(s, i === 0 ? { role: 'Jefe · radio', kit: 'radio' } : {})
        ),
        at: [110, 410]
      },
      {
        name: CV_GROUPS[1],
        role: 'Escolta · centro',
        kind: 'delta',
        specs: deltaSpecs(4, [
          { name: 'Sgto. Mayor Tim Martin' },
          { name: 'Sgto. 1º Matt Rierson' },
          { name: 'Sgto. 1º Dan Busch', role: 'Ametrallador M249' },
          { name: 'Sgto. 1º John Mace', role: 'Operador · brecha' }
        ]),
        at: [110, 410]
      },
      {
        name: CV_GROUPS[2],
        role: 'Escolta · derecha',
        kind: 'chalk',
        specs: rangerSpecs(['Sgto. Jeff Struecker', 'Cabo Kowalski', 'Herrera', 'Park', 'Sullivan', 'Moreno']).map(
          (s, i) => Object.assign(s, i === 0 ? { role: 'Jefe · radio', kit: 'radio' } : {})
        ),
        at: [110, 410]
      }
    ]);
    for (const u of us)
      if (!u.npc) {
        u.ammo = u.ammo0 = Math.round(u.ammo * 1.4);
      }
    const C = (G.m.conv = mkConvoy(['h', 'm', 'h', 'm', 'h', 'h'], CV_RT, { s0: 50, limit: 50, vmax: 2.6 }));
    C.label = 'ROMEO 6-4';
    C.gunKill = 0.12;
    for (const [x, z, d] of CV_BAR) barricade(x, z, d, 'cut', true);
    cvAmbientPlan();
    cvMountAll();
  },
  onStart() {
    cvIntro();
  },
  subs: [
    holdWaves('Defender la columna en la calle', 300, 30, 4, CV_X[0].x, CV_X[0].z, {
      dist: 36,
      who: 'Super 6-4',
      first: 10,
      r: 16,
      start: () => {
        cvRoofs(CV_X[0].x, CV_X[0].z, 7, 'cvr');
      },
      tick: () => {
        if (!G.m.c1 && G.t > G.holdEnd - 150) {
          G.m.c1 = true;
          sayMk('¡Aguantad! Estamos subiendo a los heridos a los camiones.');
        }
      },
      radio: '¡Heridos dentro! ¡Todos a los vehículos!'
    }),
    {
      text: 'Subir todos a los vehículos',
      zone: { x: CV_X[0].x, z: CV_X[0].z, r: 16 },
      start: () => {
        G.m.mT = G.t;
        const V = G.m.conv.veh;
        for (const u of us)
          if (u.alive && !u.npc) {
            const v = V.slice().sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
            goTo(u, v.x, v.z);
          }
      },
      tick: () => {
        mountNear(G.m.conv);
        if (G.t - G.m.mT > 10) cvMountAll();
      },
      count: () => [us.filter(u => u.mounted).length, us.filter(u => !u.npc).length],
      done: () => us.every(u => u.npc || u.mounted || (!u.alive && !u.down))
    },
    {
      text: 'La columna sigue hacia el Super 6-1',
      zone: { x: CV_X[1].x, z: CV_X[1].z, r: 8 },
      start: () => cvLeg2(),
      count: () => 'en marcha',
      done: () => !!G.m.leg2
    },
    holdWaves('Proteger al herido y a la columna', 180, 28, 4, CV_X[1].x, CV_X[1].z, {
      dist: 36,
      who: 'Super 6-4',
      first: 8,
      r: 16,
      start: () => {
        cvRoofs(CV_X[1].x, CV_X[1].z, 6, 'cvr2');
      },
      tick: () => {
        if (!G.m.c2 && G.t > G.holdEnd - 140) {
          G.m.c2 = true;
          say('Cabo Ottie', '¡Tiene un cohete sin explotar metido en el cuerpo!', 'us', true);
          sched.push({ at: G.t + 3, fn: () => sayMk('Que nadie lo toque. Apartaos de él y llamad al sanitario.') });
        }
      },
      radio: '¡Subid al herido! ¡Nos vamos!'
    }),
    {
      text: 'Cargar al herido y subir a los vehículos',
      zone: { x: CV_X[1].x, z: CV_X[1].z, r: 16 },
      start: () => {
        G.m.mT = G.t;
        const w = G.m.wnd;
        if (w && !w.gone) {
          w.gone = true;
          world.remove(w.m.root);
        }
        const B = gLive(grpN(CV_GROUPS[2]))[0] || gLive(grpN(CV_GROUPS[0]))[0];
        sayMk('Necesito un conductor. Tú, al volante.');
        sched.push({
          at: G.t + 2.5,
          fn: () => {
            if (B) {
              B.talkT = 2.4;
              radio(B, 'Señor, me han dado en el brazo.', true);
            }
          }
        });
        sched.push({ at: G.t + 5, fn: () => sayMk('Aquí nadie está entero. Arranca, que hay que salir de aquí.') });
        const V = G.m.conv.veh;
        for (const u of us)
          if (u.alive && !u.npc) {
            const v = V.slice().sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
            goTo(u, v.x, v.z);
          }
      },
      tick: () => {
        mountNear(G.m.conv);
        if (G.t - G.m.mT > 12) cvMountAll();
      },
      count: () => [us.filter(u => u.mounted).length, us.filter(u => !u.npc).length],
      done: () => G.t - G.m.mT > 7 && us.every(u => u.npc || u.mounted || (!u.alive && !u.down))
    },
    {
      text: 'La columna recibe nuevas órdenes',
      zone: { x: CV_X[2].x, z: CV_X[2].z, r: 8 },
      start: () => cvFinal(),
      count: () => 'en marcha',
      done: () => !!G.m.done5
    }
  ],
  opt: [
    {
      text: 'Que nadie se quede en tierra',
      ok: () => !us.some(u => !u.npc && !u.mounted && (u.alive || u.down)) || G.sub < 5
    }
  ]
};

function cvClear(b, tag) {
  if (b.cleared) return;
  if (!tagged(tag).some(e => e.alive && Math.hypot(e.x - b.x, e.z - b.z) < 26) && usNear(b.x, b.z, 3.5) > 0) {
    clearBarricade(b);
    logMsg('Barricada despejada.', 'us');
  }
}
