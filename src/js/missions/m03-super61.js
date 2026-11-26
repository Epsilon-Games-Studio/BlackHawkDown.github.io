/* ====================================================================================================
 * missions/m03-super61.js
 *
 * 3 · Super 6-1: Kilo 1-1 a pie desde la columna y Romeo 4-1 desde su esquina olvidada, cada uno por su ruta
 * ================================================================================================== */

const S61_BLUE = [
  [257.2, 388.6],
  [293.8, 353.7],
  [293.8, 321.4],
  [353.3, 320.5],
  [361.8, 318.2]
]; // Kilo 1-1, desde la columna
const S61_GREEN = [
  [294, 220.2],
  [331.2, 220.2],
  [331.2, 236.4],
  [368.6, 236.2],
  [368.6, 273.8],
  [370.7, 286]
]; // Romeo 4-1, desde la esquina de bloqueo
const S61_BX = { x: 361.8, z: 318.2 },
  S61_GX = { x: 370.7, z: 286 };
// una ruta discontinua pintada en el suelo con una punta de flecha, y la X donde termina
function routeMarks(pts, col) {
  const g = new T.Group(),
    mat = new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
      depthWrite: false
    });
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k],
      [bx, bz] = pts[k + 1],
      L = Math.hypot(bx - ax, bz - az),
      a = Math.atan2(bx - ax, bz - az);
    for (let s = 0.6; s < L - 0.4; s += 2.1) {
      const m = new T.Mesh(UBOX, mat);
      m.scale.set(0.32, 0.02, Math.min(1.25, L - s));
      m.position.set(ax + ((bx - ax) * (s + 0.6)) / L, 0.07, az + ((bz - az) * (s + 0.6)) / L);
      m.rotation.y = a;
      g.add(m);
    }
  }
  const [ex, ez] = pts[pts.length - 1];
  for (const r of [Math.PI / 4, -Math.PI / 4]) {
    const m = new T.Mesh(UBOX, mat);
    m.scale.set(0.42, 0.02, 2.6);
    m.position.set(ex, 0.08, ez);
    m.rotation.y = r;
    g.add(m);
  }
  return grounded(g);
}
MISSIONS.s61 = {
  id: 's61',
  n: 3,
  title: 'Super 6-1',
  hud: 'Llegar a pie hasta el Super 6-1',
  phase: 'day',
  hour: 16.33,
  crashed: ['s61'],
  place: 'Desde Hawlwadig y desde el edificio objetivo hasta el Super 6-1',
  squadTxt: 'Kilo 1-1 + Romeo 4-1',
  date: '3 OCT 1993',
  summary:
    'Llevar a Kilo 1-1 desde la columna y al Romeo 4-1 desde su esquina de bloqueo, cada uno por su ruta, hasta los dos puntos junto al Super 6-1, y asegurar el lugar del derribo.',
  text: '16:20. El Super 6-1 acaba de caer unas manzanas al noreste. La columna de McKnight está parada en el tercer cruce de Hawlwadig y los vehículos no caben por esos callejones: Kilo 1-1 se ofrece a ir a pie. Mientras, en una esquina de bloqueo junto al edificio objetivo, el Romeo 4-1 de Eversmann ve que la columna se ha ido sin ellos. Deciden no esperar más e ir también hasta el helicóptero.',
  start: [258, 386],
  cam: [258, 384, 9],
  civ: [320, 270],
  spawn() {
    const hoot = Object.assign({}, DELTA[1], DSPEC, {
      name: 'Sgto. 1º Hoot Gibson',
      role: 'Jefe de equipo',
      kit: 'radio'
    });
    const chalk = rangerSpecs([
      'Sgto. Matt Eversmann',
      'Esp. John Waddell',
      'Esp. Shawn Nelson',
      'Esp. Lance Twombly',
      'Esp. John Grimes',
      'Vega'
    ]).map((s, i) => Object.assign(s, i === 0 ? { role: 'Jefe · radio', kit: 'radio' } : {}));
    spawnForce([
      {
        name: D_B,
        role: 'A pie desde la columna',
        kind: 'delta',
        specs: [hoot].concat(deltaSpecs(6).slice(2)),
        at: [S61_BLUE[0][0] + 1.5, S61_BLUE[0][1] - 1]
      },
      {
        name: 'Romeo 4-1',
        role: 'Rangers · esquina de bloqueo',
        kind: 'chalk',
        specs: chalk,
        at: [S61_GREEN[0][0], S61_GREEN[0][1]]
      }
    ]);
    for (const u of us)
      if (!u.npc) {
        u.ammo = u.ammo0 = Math.round(u.ammo * 1.8);
      } // mucho camino a pie: cargadores de más en cada chaleco
    // Romeo 4-1 aguanta la esquina a cubierto: sacos terreros mirando al norte calle arriba y un coche destrozado mirando al oeste por la avenida
    for (let i = 290; i <= 292; i++) addCover('sandbag', i, 216, 'x');
    addCover('car', 291, 224, 'z');
    addCover('crates', 293, 222.5 | 0, 'x');
    const spots = [
      [290.6, 217.6, Math.PI],
      [291.6, 217.7, Math.PI],
      [292.6, 217.6, Math.PI],
      [292.6, 224.3, -PH],
      [292.7, 225.6, -PH],
      [293.7, 223.6, -PH * 1.3]
    ];
    grpN('Romeo 4-1').members.forEach((u, i) => {
      const s = spots[i];
      u.x = s[0];
      u.z = s[1];
      u.face = s[2];
      u.stance = 'crouch';
    });
    // la columna, parada donde la dejó la misión 2, y su jefe en la calle junto al Humvee de cabeza
    const C = (G.m.conv = mkConvoy(
      ['h', 'm', 'h', 'm', 'h', 'h'],
      [
        [256.5, 224],
        [256.5, 486]
      ],
      { s0: HW_STOP[2] - 224 + 4, limit: HW_STOP[2] - 224 + 4 }
    ));
    C.label = 'ROMEO 6-4';
    C.gunKill = 0.05;
    const R = (name, role, unit) => Object.assign({}, RANGERS[0], RSPEC, { name, role, gun: 'm16', unitName: unit });
    G.m.mck = npcUnit(R('Tte. Cor. McKnight', 'Jefe de la columna', 'Columna McKnight'), 258.6, 383.5, -PH);
    G.m.mck.noFire = true;
    G.m.str = npcUnit(R('Sgto. Jeff Struecker', 'Jefe de vehículo', 'Columna McKnight'), 254.5, 389, PH);
    G.m.str.noFire = true;
    // milicia a lo largo de las dos rutas: tiradores sueltos, parejas y grupos
    const P = (x, z, k, tag) => foe(x, z, k || 'post', tag || 'route', CAMP_ESPEC);
    for (const [x, z, k] of [
      [272, 375, 'rifle'],
      [276, 371],
      [288, 360, 'rifle'],
      [298, 346],
      [291, 338, 'rifle'],
      [297, 336],
      [289, 329],
      [308, 324, 'rifle'],
      [324, 316],
      [329, 324, 'rifle'],
      [333, 318],
      [345, 326],
      [352, 312, 'rifle']
    ])
      P(x, z, k);
    for (const [x, z, k] of [
      [309, 223, 'rifle'],
      [322, 216],
      [334, 228, 'rifle'],
      [328, 231],
      [347, 239],
      [352, 233, 'rifle'],
      [356, 241],
      [372, 250, 'rifle'],
      [365, 262],
      [373, 266],
      [366, 279, 'rifle']
    ])
      P(x, z, k);
    for (const [x, z] of [
      [256, 404],
      [260, 408],
      [243, 386]
    ])
      P(x, z, 'post', 'cin');
    for (const [x, z] of [
      [300, 344],
      [331, 314],
      [348, 228],
      [374, 256]
    ])
      roofFoe(x, z, 'route');
    G.m.tech = techSpawn(
      [
        [380, 320.5],
        [352, 320.5],
        [318, 320.5]
      ],
      'route',
      { stopAt: 0 }
    );
    G.m.tech.holdT = 1e9;
    for (const [x, z] of [
      [291.5, 205],
      [293.2, 203.5],
      [279, 219.5],
      [276, 221.5]
    ]) {
      const e = P(x, z, 'post', 'cin2');
      e.acc = 0.05;
      e.hp = 5000;
    }
    G.m.routes = [routeMarks(S61_BLUE, 0x3b8bff), routeMarks(S61_GREEN, 0x58c45a)];
    G.m.rb = ringAt(S61_BX.x, S61_BX.z, 4.5, 0x3b8bff);
    G.m.rg = ringAt(S61_GX.x, S61_GX.z, 4.5, 0x58c45a);
  },
  onStart() {
    s61Intro();
  },
  subs: [
    {
      text: 'Kilo 1-1 y Romeo 4-1: llegar a los puntos junto al Super 6-1',
      zone: { x: S61.x, z: S61.z, r: 12 },
      start: () => {
        G.m.raceT = G.t + 150;
      },
      tick: () => {
        const d = grpN(D_B),
          c = grpN('Romeo 4-1'),
          C = G.m.conv;
        if (C && C.veh.length && C.s >= C.L - 3) {
          for (const v of C.veh) world.remove(v.g);
          C.veh = [];
        }
        if (!G.m.raced && G.t > G.m.raceT) s61Race();
        if (!G.m.raceLost && them.some(e => e.alive && e.tag === 'race' && Math.hypot(e.x - S61.x, e.z - S61.z) < 7)) {
          G.m.raceLost = true;
          say('Super 6-4', 'La milicia ha llegado al helicóptero antes que vosotros.', 'air', true);
        }
        // emboscadas por el camino: grupos que salen cuando cada unidad llega a mitad de su ruta
        if (!G.m.ambB && gIn(d, 293.8, 330, 9) > 0) {
          G.m.ambB = true;
          waveGoal(300, 330, 0.2, 4, 'amb', 22, { x: 293.8, z: 325 }, 'Super 6-4');
        }
        if (!G.m.ambB2 && gIn(d, 335, 320.5, 9) > 0) {
          G.m.ambB2 = true;
          waveGoal(345, 320, -1.4, 3, 'amb', 20, { x: 340, z: 320.5 }, false);
        }
        if (!G.m.ambG && gIn(c, 340, 236, 9) > 0) {
          G.m.ambG = true;
          waveGoal(350, 236, -0.9, 4, 'amb', 22, { x: 350, z: 236.3 }, 'Super 6-4');
        }
        if (!G.m.ambG2 && gIn(c, 368.6, 262, 8) > 0) {
          G.m.ambG2 = true;
          waveGoal(368.6, 268, 0.1, 3, 'amb', 20, { x: 368.6, z: 270 }, false);
        }
        s61Chase(d, c);
        if (G.m.tech && G.m.tech.holdT > 1e8 && gIn(d, 300, 322, 26) > 0) {
          G.m.tech.holdT = 0;
          say('Super 6-4', 'Kilo 1-1, técnica bajando por la Calle Nacional hacia vosotros.', 'air', true);
        }
        // un punto solo cuenta cuando la unidad está allí y nadie le dispara durante unos segundos
        const hold = (k, g_, P_, ring, line) => {
          const ok = gReady(g_, P_.x, P_.z, 5) && foesNear(P_.x, P_.z, 20) === 0;
          G.m[k + 'T'] = ok ? (G.m[k + 'T'] == null ? G.t : G.m[k + 'T']) : null;
          const was = G.m[k];
          G.m[k] = ok && G.t - G.m[k + 'T'] >= 4;
          if (G.m[k] && !was) {
            radio(gLive(g_)[0], line);
            if (ring) ring.material.color.setHex(0x6fd36a);
          }
          if (!G.m[k] && was && ring) ring.material.color.setHex(k === 'inB' ? 0x3b8bff : 0x58c45a);
        };
        hold('inB', d, S61_BX, G.m.rb, 'Kilo 1-1 en el punto sur del 6-1. Zona limpia.');
        hold('inG', c, S61_GX, G.m.rg, 'Romeo 4-1 en la esquina norte del 6-1. Zona limpia.');
      },
      count: () => {
        const d = grpN(D_B),
          c = grpN('Romeo 4-1'),
          f = P_ => foesNear(P_.x, P_.z, 20);
        const one = (n, g_, P_, k) =>
          G.m[k] ? `${n} ✓` : `${n} ${gIn(g_, P_.x, P_.z, 5)}/${gNeed(g_)}${f(P_) ? ' · milicia ' + f(P_) : ''}`;
        return one('Delta', d, S61_BX, 'inB') + ' — ' + one('Chalk', c, S61_GX, 'inG');
      },
      done: () => G.m.inB && G.m.inG,
      onDone: () => {
        for (const g of G.m.routes || []) overlay.remove(g);
        for (const r of [G.m.rb, G.m.rg]) if (r) overlay.remove(r);
      },
      radio: 'Estamos en el 6-1. Perímetro alrededor del helicóptero.'
    },
    {
      text: 'Asegurar el lugar del derribo',
      zone: { x: S61.x, z: S61.z, r: 20 },
      start: () => {
        if (!G.m.raced) {
          G.m.raceT = G.t;
          s61Race();
        }
      },
      tick: () => {
        const ok = G.m.raced && G.t > G.m.raceT + 30 && foesNear(S61.x, S61.z, 22) === 0;
        G.m.clrT = ok ? (G.m.clrT == null ? G.t : G.m.clrT) : null;
      },
      count: () =>
        foesNear(S61.x, S61.z, 22)
          ? `milicia cerca del helicóptero: ${foesNear(S61.x, S61.z, 22)}`
          : `zona limpia ${Math.min(10, Math.floor(G.t - (G.m.clrT || G.t)))}/10 s`,
      done: () => G.m.clrT != null && G.t - G.m.clrT >= 10,
      onDone: () => sched.push({ at: G.t + 2.5, fn: s61Star }),
      radio: 'Zona del derribo asegurada.'
    }
  ],
  endDelay: 600,
  opt: [{ text: 'Llegar antes que la milicia', ok: () => !G.m.raceLost }]
};
// la milicia que deja atrás una unidad no se queda quieta: va detrás de ella, así que correr solo se lleva el combate consigo
function s61Chase(d, c) {
  if (G.t < (G.m.chaseT || 0)) return;
  G.m.chaseT = G.t + 1;
  const groups = [d, c];
  for (const e of them) {
    if (!e.alive || (e.tag !== 'route' && e.tag !== 'amb') || e.roof || e.tech) continue;
    if (e.hunt == null) {
      for (let gi = 0; gi < 2; gi++)
        if (gLive(groups[gi]).some(u => Math.hypot(u.x - e.x, u.z - e.z) < 16)) {
          e.hunt = gi;
          e.kind = 'wave';
          e.nextMove = G.t + rr(1, 3);
          break;
        }
    }
    if (e.hunt != null) {
      const L = gLive(groups[e.hunt]);
      if (!L.length) continue;
      const lx = L.reduce((a, u) => a + u.x, 0) / L.length,
        lz = L.reduce((a, u) => a + u.z, 0) / L.length;
      e.goal = { x: lx, z: lz };
      G.alert = true;
      if (!e.moving && e.nextMove > G.t + 2) e.nextMove = G.t + rr(0.5, 2);
    }
  }
}
// el final de la misión: los Delta y los Rangers cantan sus esquinas bajo fuego; un Black Hawk con dos Little Birds por encima;
// el Star 4-1 se sale de la formación, se posa en el descampado junto a los restos, baja un Delta, registra la cabina y vuelve cargando con un superviviente
function s61Star() {
  // dónde se ponen las unidades, el sitio del Little Bird junto a los restos y la cabina, tal como los marqué en mi boceto
  const d = grpN(D_B),
    c = grpN('Romeo 4-1'),
    LZ = { x: 373.1, z: 307.0 },
    CP = { x: 379.9, z: 303.9 },
    VIEW = [375.9, 292.9, 0, 1];
  const place = (g, pts, face) =>
    gLive(g).forEach((u, i) => {
      const p = pts[i % pts.length],
        q = findWalk(p[0], p[1]);
      u.x = Math.abs(q[0] + 0.5 - p[0]) < 1 ? p[0] : q[0] + 0.5;
      u.z = Math.abs(q[1] + 0.5 - p[1]) < 1 ? p[1] : q[1] + 0.5;
      if (u.inB) leaveB(u);
      u.path = [];
      u.order = { type: 'hold' };
      u.stance = 'crouch';
      u.face = face;
    });
  place(
    c,
    [
      [368.7, 290.4],
      [369.9, 290.3],
      [372.0, 290.3],
      [373.1, 290.5],
      [367.0, 293.9],
      [367.5, 295.4]
    ],
    2.4
  );
  place(
    d,
    [
      [S61_BX.x, S61_BX.z],
      [S61_BX.x - 1.2, S61_BX.z + 0.8],
      [S61_BX.x + 1.2, S61_BX.z + 0.6],
      [S61_BX.x - 0.6, S61_BX.z + 1.8],
      [S61_BX.x + 0.7, S61_BX.z + 1.9]
    ],
    0.6
  );
  for (const [x, z] of [
    [390, 292],
    [392, 300],
    [388, 313],
    [378, 318],
    [361, 311],
    [386, 285]
  ])
    foe(x, z, 'post', 'end', { acc: 0.04, hp: 5000 });
  G.alert = true;
  G.noLose = true;
  const cas = irDecor(buildRig('delta', { gun: 'car' }), CP.x + 0.3, CP.z - 0.2, 2.6, {
    alive: false,
    down: true,
    look: null
  });
  cas.m.gun.visible = false;
  const K = (x, z, y, t, yaw, ev) => ({ t, x, y, z, yaw, ev });
  const S = (G.m.star = { cas, st: 'calls' });
  const say_ = (w, t) => say(w, t, w === 'Star 4-1' ? 'air' : 'hq', true);
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  let bh = null,
    lb2 = null,
    star = null,
    man = null;
  const flight = () => {
    const x0 = LZ.x - 70,
      z0 = LZ.z - 95;
    bh = scriptHeli(
      'bh',
      [
        K(x0, z0, 24, 0),
        K(x0 + 30, z0 + 40, 22, 6),
        K(S61.x - 6, S61.z - 14, 20, 12),
        K(S61.x + 26, S61.z + 6, 21, 18),
        K(S61.x + 70, S61.z + 30, 23, 25),
        K(S61.x + 130, S61.z + 60, 25, 33, null, H => {
          H.gone = true;
        })
      ],
      { spline: true }
    );
    c2Cabin(bh.h); // es el C2 (Uniform 6-4): con sus dos asientos y los dos Rangers
    lb2 = scriptHeli(
      'lb',
      [
        K(x0 + 7, z0 - 4, 19, 0),
        K(x0 + 37, z0 + 36, 18, 6),
        K(S61.x + 1, S61.z - 18, 17, 12),
        K(S61.x + 33, S61.z + 2, 18, 18),
        K(S61.x + 77, S61.z + 26, 20, 25),
        K(S61.x + 137, S61.z + 56, 22, 33, null, H => {
          H.gone = true;
        })
      ],
      { spline: true }
    );
    star = scriptHeli(
      'lb',
      [
        K(x0 - 7, z0 + 5, 19, 0),
        K(x0 + 23, z0 + 45, 18, 6),
        K(LZ.x - 14, LZ.z - 26, 13, 13),
        K(LZ.x - 5, LZ.z - 11, 7, 18.5),
        K(LZ.x - 1, LZ.z - 3.5, 2.6, 23),
        K(LZ.x, LZ.z, 0.8, 26.5),
        K(LZ.x, LZ.z, 0, 29.5, 0.05, () => {
          S.st = 'landed';
          S.t = G.t;
        }),
        K(LZ.x, LZ.z, 0, 900, 0.05)
      ],
      { spline: true }
    );
  };
  const lead = g => gLive(g)[0];
  cineStart({
    zoom: 11,
    spin: 0,
    yaw0: -0.18,
    block: true,
    focus: () => {
      if (S.cam === 'bh' && bh && !bh.gone) return [bh.x, bh.z, bh.y];
      if (S.cam === 'star' && star && !star.gone) return [star.x, star.z, star.y];
      if (S.cam === 'ground') return [(LZ.x + CP.x) / 2 + 1, (LZ.z + CP.z) / 2 - 3, 0, 1];
      return VIEW;
    },
    keys: [
      {
        t: 0.8,
        fn: () => sayU(lead(c), 'Kilo 1-1, aquí Romeo 4-1. Estamos en la esquina norte, junto al arco. ¿Dónde estáis?')
      },
      {
        t: 5,
        fn: () =>
          sayU(
            lead(d),
            'Romeo 4-1, Kilo 1-1. Esquina suroeste, en la Calle Nacional. Os vemos: no tiréis hacia el sur.'
          )
      },
      {
        t: 9.5,
        fn: () => sayU(lead(c), 'Recibido. Nosotros cubrimos el norte y el este, vosotros el sur y el oeste.')
      },
      { t: 13, fn: () => sayU(lead(d), 'Hay alguien vivo en la cabina del 6-1. Hay que sacarlo ya.') },
      {
        t: 16,
        fn: () => {
          flight();
          S.cam = 'bh';
          CINE.zoom = 14;
        }
      },
      {
        t: 21,
        fn: () =>
          say_('Uniform 6-4', 'Star 4-1, aquí Uniform 6-4. Hay supervivientes en el 6-1. ¿Puedes meterte y sacarlos?')
      },
      { t: 25.5, fn: () => say_('Star 4-1', 'Recibido, 6-4. Star 4-1 bajando. Cubridnos desde las esquinas.') },
      {
        t: 28,
        fn: () => {
          S.cam = 'star';
          CINE.zoom = 10;
        }
      },
      { t: 36, fn: () => sayU(lead(c), '¡Little Bird entrando! ¡Fuego de cobertura, que no levanten la cabeza!') }
    ],
    dur: 1e9,
    tick: dt => {
      for (const u of gLive(d).concat(gLive(c))) {
        u.sup = Math.min(u.sup, 20);
        if (u.hp < 40) u.hp = 40;
        u.path = [];
        if (u.ammo < 60) u.ammo = 60;
      }
      for (const e of them)
        if (e.alive && e.tag === 'end') {
          e.spotted = true;
          if (e.hp < 40) e.hp = 40;
        }
      if (S.st === 'landed' && G.t > S.t + 2) {
        S.st = 'out';
        S.cam = 'ground';
        CINE.zoom = 8;
        man = irDecor(buildRig('delta', { gun: 'car' }), LZ.x + 1.2, LZ.z - 0.3, 1.6, { spd: 2.2 });
        G.m.wounded = [man];
        say_('Star 4-1', 'En el suelo. ¡Ve, ve! Te cubro desde aquí.');
        man.path = [[CP.x - 0.4, CP.z + 0.4]];
        man.then = o => {
          S.st = 'search';
          S.t = G.t;
          o.stance = 'crouch';
          o.look = Math.atan2(cas.x - o.x, cas.z - o.z);
        };
      }
      if (S.st === 'search') {
        man.stance = 'crouch';
        if (G.t > S.t + 4) {
          S.st = 'carry';
          man.stance = 'stand';
          man.spd = 1.4;
          man.look = null;
          sayU(man, '¡Tengo uno vivo! ¡Lo saco!');
          man.path = [[LZ.x + 1.2, LZ.z - 0.3]];
          man.then = o => {
            S.st = 'loaded';
            S.t = G.t;
            o.gone = true;
            world.remove(o.m.root);
            world.remove(cas.m.root);
          };
        }
      }
      if (S.st === 'carry' && man) {
        const r = cas.m.root;
        cas.x = man.x;
        cas.z = man.z;
        r.position.set(man.x + Math.sin(man.face) * 0.1, 0.95, man.z + Math.cos(man.face) * 0.1);
        r.rotation.y = man.face + PH;
      }
      if (S.st !== 'loaded' && S.st !== 'gone') animRig(cas, dt);
      // tres segundos después de subir el hombre, el Star 4-1 despega y se va; la cámara se queda en el sitio del derribo
      if (S.st === 'loaded' && G.t > S.t + 3) {
        S.st = 'gone';
        say_('Star 4-1', 'Uniform 6-4, Star 4-1 despegando con un herido a bordo. Volvemos a por más.');
        star.keys = [
          K(LZ.x, LZ.z, 0, 0, 0.05),
          K(LZ.x, LZ.z, 1.6, 1.8, 0.05),
          K(LZ.x - 4, LZ.z + 9, 5, 4.5),
          K(LZ.x - 20, LZ.z + 34, 14, 8.5),
          K(LZ.x - 60, LZ.z + 85, 25, 14, null, H => {
            H.gone = true;
          }),
          K(LZ.x - 90, LZ.z + 120, 30, 20)
        ];
        star.t = 0;
        star.k = 0;
        sched.push({
          at: G.t + 6,
          fn: () =>
            say_('Uniform 6-4', 'Recibido, Star 4-1. Buen trabajo. Todas las unidades, mantened el perímetro del 6-1.')
        });
        sched.push({ at: G.t + 11, fn: () => cineEnd() });
      }
    },
    onEnd: () => {
      G.endAt = G.t + 1.5;
    }
  });
  camS.yaw = camS.yawT = -0.18;
  camS.tx = VIEW[0];
  camS.tz = VIEW[1];
  camS.zoom = camS.zoomT = 11;
}
function s61Intro() {
  const C = G.m.conv,
    d = grpN(D_B),
    hoot = d.members[0],
    mck = G.m.mck,
    str = G.m.str,
    c = grpN('Romeo 4-1').members;
  const [ev, wa, ne, tw, gr] = c;
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  const A = [257.2, 377],
    Bc = [296, 222];
  for (const u of d.members.slice(1)) u.stance = 'crouch';
  G.speed = 0.8;
  cineStart({
    zoom: 8.5,
    spin: 0.012,
    yaw0: -0.35,
    focus: () => {
      const f = sstep(17, 21, CINE.t);
      return [A[0] + (Bc[0] - A[0]) * f, A[1] + (Bc[1] - A[1]) * f];
    },
    keys: [
      {
        t: 0.8,
        fn: () =>
          say(
            'Romeo 6-4',
            '¡Black Hawk derribado! ¡Black Hawk derribado! Super 6-1 ha caído en la ciudad, al noreste de vuestra posición.',
            'hq',
            true
          )
      },
      {
        t: 5.5,
        fn: () =>
          sayU(mck, '¿Cuánto falta hasta el helicóptero? Con los camiones no vamos a pasar por esos callejones.')
      },
      { t: 9.5, fn: () => sayU(hoot, 'Coronel, nosotros vamos a pie. Llegamos antes que la columna.') },
      { t: 12.5, fn: () => sayU(mck, 'Adelante, Delta. Nosotros seguimos por Hawlwadig y buscamos otro camino.') },
      {
        t: 15,
        fn: () => {
          sayU(hoot, 'Kilo 1-1, conmigo. Nos movemos.');
          for (const u of d.members) u.stance = 'stand';
        }
      },
      {
        t: 16.5,
        fn: () => {
          mount(mck);
          mount(str);
          C.go = true;
          C.limit = C.L - 2;
          CINE.zoom = 10;
        }
      },
      // la esquina junto al objetivo, donde se ha quedado atrás el Romeo 4-1
      {
        t: 21.5,
        fn: () => {
          CINE.zoom = 7.5;
          sayU(ne, 'Sargento... la columna se ha ido. Ya no se oyen los motores.');
        }
      },
      { t: 25, fn: () => sayU(tw, 'Se han olvidado de nosotros.') },
      { t: 27.5, fn: () => sayU(ev, 'Nadie se ha olvidado. Volverán a por nosotros.') },
      { t: 30.5, fn: () => sayU(ne, 'No van a volver, sargento. Están yendo hacia el helicóptero.') },
      {
        t: 33.5,
        fn: () =>
          say(
            'Romeo 6-4',
            'A todas las unidades: Super 6-1 en el suelo. Repito, tenemos un Black Hawk derribado.',
            'hq',
            true
          )
      },
      { t: 37.5, fn: () => sayU(gr, '¿Y ahora qué hacemos?') },
      {
        t: 39.5,
        fn: () => sayU(ev, 'Vamos al helicóptero a pie. Allí nos juntamos con los demás. Romeo 4-1, en marcha.')
      },
      {
        t: 43,
        fn: () => {
          for (const u of c) u.stance = 'stand';
        }
      }
    ],
    dur: 45,
    tick: () => {
      for (const u of d.members.concat(c))
        if (u.alive) {
          u.sup = Math.min(u.sup, 15);
        }
      if (CINE.t < 43) for (const u of c) if (u.alive && !u.talkT) u.stance = 'crouch';
      for (const e of them) if ((e.tag === 'cin' || e.tag === 'cin2') && e.alive && e.hp < 60) e.hp = 60;
      if (CINE.t > 17)
        for (const e of them)
          if (e.tag === 'cin2' && e.alive) {
            e.spotted = true;
            e.sup = Math.min(e.sup, 40);
          }
    },
    onEnd: () => {
      for (const e of them)
        if (e.alive && (e.tag === 'cin2' || e.tag === 'cin')) {
          e.hp = Math.min(e.hp, 80);
          e.tag = 'route';
        }
      G.speed = 1;
      $('bSpeed').textContent = '1×';
      if (!mck.mounted) mount(mck);
      if (!str.mounted) mount(str);
      if (!C.go) {
        C.go = true;
        C.limit = C.L - 2;
      }
      for (const u of c) u.stance = 'stand';
      G.sel = new Set(us.filter(u => u.alive && !u.npc));
      refreshCards();
      renderSubs();
      camS.tx = 300;
      camS.tz = 300;
      camS.zoomT = 16;
      say(
        'Super 6-4',
        'Kilo 1-1 por el sur, Romeo 4-1 por el norte: seguid las rutas marcadas hasta los dos puntos junto al 6-1.',
        'air',
        true
      );
      hint(
        'Selecciona cada unidad (toca su ficha) y llévala por su ruta: azul para Kilo 1-1, verde para el Romeo 4-1.'
      );
    }
  });
}
function s61Race() {
  G.m.raced = true;
  for (const a of [-1.3, 0.2, 1.9]) waveGoal(S61.x, S61.z, a, 4, 'race', 48, S61, false);
  say('Super 6-4', 'Grupos armados corriendo hacia el 6-1 desde el norte, el este y el sur.', 'air', true);
}
