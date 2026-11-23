/* ====================================================================================================
 * missions/m02-hawlwadig.js
 *
 * 2 · Calle Hawlwadig: tres cruces bajando por Hawlwadig y luego el Super 6-1
 * ================================================================================================== */

'use strict';

const HW_X = [
  { x: 256.5, z: 255.5, n: 'primer' },
  { x: 256.5, z: 321, n: 'segundo' },
  { x: 256.5, z: 392, n: 'tercer' }
];
const HW_STOP = [244, 309.5, 380.5]; // donde se para el vehículo de cabeza, antes de cada cruce
// la frase de Hoot a Sanderson: aquí va la frase exacta de la película
const FRASE_HOOT = 'Tranquilo, Sanderson. De los vehículos nos encargamos nosotros.';
function npcUnit(spec, x, z, face) {
  const c = findWalk(x, z),
    u = makeUnit('us', c[0], c[1], Object.assign({ kind: 'us', npc: true }, spec));
  u.x = x;
  u.z = z;
  if (face != null) u.face = face;
  u.stance = spec.stance || 'stand';
  return u;
}
function hawlHoldSub(k) {
  const X = HW_X[k];
  return {
    text: `Asegurar el ${X.n} cruce`,
    zone: { x: X.x, z: X.z, r: 12 },
    start: () => {
      G.m.held = 0;
      G.nextWave = G.t + 25;
      G.waveN = 0;
      const C = G.m.conv;
      C.go = true;
      C.limit = routeS(C, X.x, HW_STOP[k]);
      if (k > 0)
        say('Romeo 6-4', `Columna en marcha hacia el ${X.n} cruce. Aseguradlo antes de que llegue.`, 'hq', true);
      if (k > 0)
        sched.push({
          at: G.t + 45,
          fn: () => {
            if (G.sub === k && techToward(X.x + 48, X.z + (k === 1 ? -1 : 1), X.x, X.z, 'tech'))
              say('Super 6-4', `Técnica con ametralladora pesada entrando por el este del ${X.n} cruce.`, 'air', true);
          }
        });
    },
    tick: () => {
      const men = us.filter(u => u.alive && !u.npc && Math.hypot(u.x - X.x, u.z - X.z) < 14).length;
      G.m.there = men >= 3;
      if (G.m.there) G.m.held += G.dt;
      // en esta misión la munición no se acaba: los vehículos tienen a todos abastecidos
      for (const u of us) if (u.alive && !u.npc && u.ammo < u.ammo0) u.ammo = u.ammo0;
      // oleadas más grandes, partidas en grupos que vienen de dos o tres direcciones a la vez
      const near = them.filter(e => e.alive && Math.hypot(e.x - X.x, e.z - X.z) < 50).length;
      if (G.t >= G.nextWave && near >= 9) G.nextWave = G.t + 10; // el cruce ya está bastante animado: la siguiente oleada espera
      if (G.t >= G.nextWave && G.m.held < 215) {
        G.nextWave = G.t + 62;
        G.waveN++;
        const parts = 2,
          total = 4 + Math.min(3, G.waveN >> 1) + k,
          a0 = rnd() * 6.283;
        for (let p = 0; p < parts; p++) {
          const n = Math.max(2, Math.round(total / parts)),
            ang = a0 + p * (6.283 / parts) + rr(-0.5, 0.5);
          waveGoal(
            X.x + rr(-6, 6),
            X.z + rr(-8, 8),
            ang,
            n,
            'hold',
            rr(32, 48),
            { x: X.x + rr(-5, 5), z: X.z + rr(-6, 6) },
            p === 0 ? 'Romeo 6-4' : false,
            { acc: 0.23, hp: 80 }
          );
        }
      }
    },
    count: () => (G.m.there ? '' : 'llevad al menos 3 hombres al cruce · ') + 'quedan ' + fmtLeft(240 - G.m.held),
    done: () => G.m.held >= 240,
    onDone: () => {
      if (k === 2) G.m.x3T = G.t;
      say(
        'Romeo 6-4',
        k < 2 ? 'Cruce asegurado. Columna, adelante.' : 'Tercer cruce asegurado. Buen trabajo.',
        'hq',
        true
      );
    }
  };
}
MISSIONS.hawl = {
  id: 'hawl',
  n: 2,
  orbits: [
    { c2: true, x: 258, z: 324, rx: 24, rz: 80, alt: 21, w: (2 * Math.PI) / 150 },
    { lb: true, x: 254, z: 324, rx: 15, rz: 72, alt: 11, w: (-2 * Math.PI) / 105 }
  ],
  title: 'Calle Hawlwadig',
  hud: 'Asegurar tres cruces para la columna',
  phase: 'day',
  hour: 15.917,
  crashed: [],
  place: 'Calle Hawlwadig · del objetivo hacia la K-4',
  squadTxt: 'Delta + Rangers',
  date: '3 OCT 1993',
  summary:
    'Abrir paso a la columna de McKnight por la calle Hawlwadig asegurando tres cruces, aguantando cuatro minutos de oleadas en cada uno.',
  text: '15:55. Los prisioneros van en los camiones y la columna espera junto al edificio objetivo, bajo el fuego. El capitán Steele pide más seguridad para los vehículos y Kilo 1-1, con Hoot al frente, se ofrece. El resto monta y la columna baja por Hawlwadig: Kilo 1-1 y el Romeo 2-1 van a pie, asegurando cada cruce antes de que pasen los vehículos.',
  start: [259, 236],
  cam: [260, 231, 9],
  civ: [256, 300],
  spawn() {
    const C = (G.m.conv = mkConvoy(
      ['h', 'm', 'h', 'm', 'h', 'h'],
      [
        [256.5, 224],
        [256.5, 410]
      ],
      { s0: 14, limit: 14 }
    ));
    C.label = 'ROMEO 6-4';
    C.gunKill = 0.05;
    const vz = k => 238 - k * 8.6;
    // las dos unidades del jugador
    spawnForce([
      {
        name: 'Kilo 1-1',
        role: 'Asalto · a pie',
        kind: 'delta',
        specs: [
          Object.assign({}, DELTA[1], DSPEC, { name: 'Sgto. 1º Hoot Gibson', role: 'Jefe de equipo', kit: 'radio' })
        ].concat(deltaSpecs(6).slice(2)),
        at: [260.5, 226]
      },
      { name: 'Romeo 2-1', role: 'Rangers · a pie', kind: 'chalk', specs: chalkSpecs(1), at: [254, 222] }
    ]);
    const hoot = IRN.groups[0].members[0];
    hoot.x = 261.0;
    hoot.z = 232.4;
    hoot.face = -PH;
    hoot.noFire = true;
    IRN.groups[0].members.slice(1).forEach((u, i) => {
      u.x = 260.6 + (i % 2) * 0.8;
      u.z = 224.5 + (i >> 1) * 1.4;
      u.face = -PH;
      u.stance = 'crouch';
    });
    IRN.groups[1].members.forEach((u, i) => {
      const side = i % 2 ? 254.2 : 258.8,
        c = findWalk(side, vz(1 + (i >> 1)) + (i % 2 ? 1.2 : -1.2));
      u.x = c[0] + 0.5;
      u.z = c[1] + 0.5;
      u.face = i % 2 ? -PH : PH;
      u.stance = 'crouch';
    });
    // los que van montados: los Delta de Sanderson, Steele, Struecker y los Rangers en los camiones
    const R = (name, role) => Object.assign({}, RANGERS[0], RSPEC, { name, role, gun: 'm16' });
    G.m.sand = npcUnit(
      Object.assign({}, DELTA[0], DSPEC, { name: 'Sgto. 1º Sanderson', role: 'Jefe de equipo', unitName: 'Kilo 2-1' }),
      261.0,
      231.0,
      -PH
    );
    G.m.steele = npcUnit(
      Object.assign(R('Cap. Mike Steele', 'Jefe de compañía'), { unitName: 'Romeo 1-1' }),
      259.3,
      231.0,
      PH
    );
    G.m.str = npcUnit(
      Object.assign(R('Sgto. Jeff Struecker', 'Jefe de vehículo'), { unitName: 'Columna McKnight' }),
      259.3,
      232.4,
      PH
    );
    for (const u of [G.m.sand, G.m.steele, G.m.str]) u.noFire = true;
    G.m.npc = [G.m.sand, G.m.steele, G.m.str];
    for (let k = 0; k < 3; k++)
      G.m.npc.push(
        npcUnit(
          Object.assign({}, DELTA[2 + k], DSPEC, {
            name: ['Sgto. Wex', 'Sgto. Norris', 'Sgto. Pruitt'][k],
            unitName: 'Kilo 2-1'
          }),
          261.4,
          226 + k * 1.2,
          -PH
        )
      );
    for (let k = 0; k < 6; k++) {
      const side = k % 2 ? 254.2 : 258.8;
      G.m.npc.push(
        npcUnit(
          Object.assign(R(['Cabo Twombly', 'Esp. Grimes', 'Yurek', 'Smith', 'Galentine', 'Kurth'][k], 'Fusilero'), {
            unitName: 'Columna McKnight',
            stance: 'crouch'
          }),
          side,
          vz(3 + (k >> 1)) + (k % 2 ? 1 : -1),
          k % 2 ? -PH : PH
        )
      );
    }
    // milicia disparando a la columna desde el norte y desde la calle transversal
    for (const [x, z] of [
      [256, 176],
      [252, 180],
      [261, 178],
      [241, 236],
      [245, 237],
      [282, 236],
      [286, 235]
    ])
      foe(x, z, 'post', 'cin', { acc: 0.12 });
    // y esperando en cada cruce
    HW_X.forEach(X => {
      for (const [dx, dz, k] of [
        [-9, -1, 'post'],
        [9, 1, 'post'],
        [-4, 7, 'rifle'],
        [5, 9, 'post'],
        [13, -3, 'rifle'],
        [-14, 2, 'rifle'],
        [2, -10, 'rifle']
      ])
        foe(X.x + dx, X.z + dz, k, 'x' + X.n, { acc: 0.18, hp: 75 });
      roofFoe(X.x + 10, X.z - 7, 'x' + X.n, { acc: 0.16 });
      roofFoe(X.x - 10, X.z + 8, 'x' + X.n, { acc: 0.16 });
    });
  },
  onStart() {
    hawlIntro();
  },
  subs: [
    hawlHoldSub(0),
    hawlHoldSub(1),
    hawlHoldSub(2),
    {
      text: 'Super 6-1 ha sido alcanzado',
      zone: { x: S61.x, z: S61.z, r: 6 },
      start: () => s61Shot(),
      count: () => (G.m.down61 ? 'derribado' : 'en el aire'),
      done: () => !!G.m.down61
    }
  ],
  endDelay: 4,
  opt: [
    { text: 'Asegurar los tres cruces en menos de 16 minutos', ok: () => (G.m.x3T != null ? G.m.x3T < 960 : G.t < 960) }
  ]
};

function hawlResupply() {
  for (const u of us)
    if (u.alive && !u.npc) {
      u.ammo = Math.max(u.ammo, u.ammo0);
      u.mag = Math.min(u.magSize, u.ammo);
    }
  for (const u of us) if (u.alive && !u.npc) u.fat = 100;
  say('Sgto. Struecker', 'Cajas de munición desde los vehículos. ¡Recargad!', 'convoy', true);
  logMsg('Munición repartida.', 'us');
}
function hawlIntro() {
  const C = G.m.conv,
    talk = [G.m.steele, G.m.sand, IRN.groups[0].members[0], G.m.str];
  const sayU = (u, t) => {
    u.talkT = 2.4;
    radio(u, t, true);
  };
  const lb = () =>
    scriptHeli('lb', [
      { t: 0, x: 256.5, y: 10, z: 150 },
      { t: 34, x: 256.5, y: 9, z: 300 },
      {
        t: 44,
        x: 256.5,
        y: 24,
        z: 430,
        ev: S => {
          S.gone = true;
        }
      }
    ]);
  const mountAll = () => {
    G.m.mounting = true;
    const V = C.veh;
    G.m.npc.forEach((u, i) => {
      u.noFire = false;
      u.ride = u === G.m.str ? V[0] : u === G.m.steele ? V[1] : V[2 + (i % 4)];
      goTo(u, u.ride.x + (i % 2 ? -1.8 : 1.8), u.ride.z);
    });
  };
  G.speed = 0.65;
  cineStart({
    zoom: 7,
    spin: 0.02,
    focus: () => (G.m.follow ? [C.veh[0].x, C.veh[0].z + 4] : [260.2, 231.2]),
    text: 'Calle Hawlwadig · 15:55 · la columna espera junto al edificio objetivo',
    keys: [
      { t: 0.5, fn: lb },
      {
        t: 2,
        fn: () =>
          sayU(
            G.m.steele,
            'Sanderson, necesito más seguridad en los vehículos. Nos están disparando desde todas las esquinas.'
          )
      },
      { t: 7, fn: () => sayU(G.m.sand, 'Tengo a mi gente repartida por toda la manzana, capitán.') },
      { t: 11, fn: () => sayU(talk[2], 'Mis chicos se encargan, Sanderson.') },
      { t: 14.5, fn: () => sayU(talk[2], FRASE_HOOT) },
      { t: 19, fn: () => sayU(G.m.steele, '¡Struecker, vaya delante!') },
      { t: 21, fn: () => sayU(G.m.str, '¡Huaa!') },
      {
        t: 22.5,
        fn: () => {
          sayU(G.m.steele, 'Tú, ven conmigo.');
          mountAll();
        }
      },
      {
        t: 24.5,
        text: 'Todos montan en los vehículos menos Kilo 1-1 y el Romeo 2-1',
        fn: () =>
          say('Romeo 6-4', 'Columna, aquí Romeo 6-4. Os tengo a la vista. Montad y salid hacia el sur.', 'hq', true)
      },
      {
        t: 34,
        fn: () => {
          for (const u of G.m.npc) if (!u.mounted) mount(u);
          sayU(G.m.str, 'Romeo 6-4, todo despejado. Tres vehículos cargados.');
        }
      },
      {
        t: 37.5,
        text: 'La columna de McKnight avanza hasta el primer cruce',
        fn: () => {
          say('Romeo 6-4', 'Recibido. Columna, en marcha hasta el primer cruce.', 'hq', true);
          C.go = true;
          C.limit = routeS(C, 256.5, HW_STOP[0]);
          G.m.follow = true;
          CINE.zoom = 10;
        }
      }
    ],
    tick: dt => {
      for (const u of talk)
        if (u.alive) {
          u.sup = 0;
          if (!u.path.length && !G.m.mounting) u.stance = 'stand';
        }
      for (const u of G.m.npc)
        if (!u.mounted) {
          u.sup = Math.min(u.sup, 20);
          if (u.ride && Math.hypot(u.ride.x - u.x, u.ride.z - u.z) < 3.2) mount(u);
        }
      if (them.filter(e => e.alive && e.tag === 'cin').length < 4 && G.t > (G.m.cinW || 0)) {
        G.m.cinW = G.t + 6;
        for (const [x, z] of [
          [255, 172],
          [243, 236]
        ])
          foe(x + rr(-2, 2), z + rr(-1, 1), 'post', 'cin', { acc: 0.1 });
      }
      if (G.m.follow && C.s >= C.limit - 0.3) {
        G.m.arrT = G.m.arrT || CINE.t;
        if (CINE.t > G.m.arrT + 2) cineEnd();
      }
    },
    onEnd: () => {
      G.speed = 1;
      $('bSpeed').textContent = '1×';
      for (const u of G.m.npc) if (!u.mounted) mount(u);
      IRN.groups[0].members[0].noFire = false;
      for (const e of them)
        if (e.tag === 'cin' && e.alive && e.z < 200) {
          e.alive = false;
          world.remove(e.m.root);
          dropOverlay(e);
        }
      G.sel = new Set(us.filter(u => u.alive && !u.npc));
      refreshCards();
      renderSubs();
      camS.zoomT = 13;
      say(
        'Romeo 6-4',
        'Kilo 1-1, Romeo 2-1: asegurad el primer cruce. La columna no pasa hasta que esté limpio.',
        'hq',
        true
      );
      hint('Lleva a tus dos unidades al primer cruce y aguanta cuatro minutos. La columna avanzará cruce a cruce.');
    }
  });
}
function s61Shot() {
  const sx = S61.x - 26,
    sz = S61.z - 14;
  const shooters = [
    [0, 0],
    [1.2, 0.8],
    [-1, 1.1],
    [0.6, -1.2]
  ].map(([dx, dz]) => {
    const e = foe(sx + dx, sz + dz, 'post', 'rpg', { acc: 0.1 });
    e.spotted = true;
    return e;
  });
  let H = null;
  H = scriptHeli('bh', [
    { t: 0, x: S61.x - 70, y: 24, z: S61.z - 50 },
    {
      t: 6,
      x: S61.x - 34,
      y: 22,
      z: S61.z - 26,
      ev: () =>
        fireRPG(shooters[0], { pos: () => [H.x, H.y + 2, H.z - 3] }, () => {
          heliSnd('heli_hit', H.x, H.z);
          H.spin = 1.4;
          H.noTail = true;
          H.smoke = {
            x: H.x,
            z: H.z,
            y: H.y,
            rate: 55,
            life: 6,
            vy: 0.6,
            s0: 0.5,
            s1: 2.4,
            fire: 0.3,
            acc: 0,
            sp: 0.5
          };
          emitters.push(H.smoke);
          say('Super 6-1', 'Aquí 6-1, nos han dado.', 'air', true);
        })
    },
    { t: 7, x: S61.x - 30, y: 21.5, z: S61.z - 22 },
    {
      t: 9,
      x: S61.x - 24,
      y: 19,
      z: S61.z - 16,
      ev: () => {
        say('Super 6-1', '¡Super 6-1 cayendo! ¡Super 6-1 cayendo!', 'air', true);
        H.spin = 2.6;
      }
    },
    {
      t: 11,
      x: S61.x - 17,
      y: 16,
      z: S61.z - 11,
      ev: () => say('Uniform 6-4', 'El 6-1 está cayendo. ¡Le han dado, le han dado!', 'hq', true)
    },
    {
      t: 15,
      x: S61.x - 9,
      y: 10,
      z: S61.z - 5,
      ev: () => {
        H.spin = 3.6;
      }
    },
    { t: 19, x: S61.x - 2, y: 3.5, z: S61.z - 1 },
    {
      t: 21.5,
      x: S61.x,
      y: 0,
      z: S61.z,
      ev: S => {
        S.gone = true;
        boom(S61.x, S61.z);
        heliSnd('heli_crash', S61.x, S61.z) || sfx('boom', S61.x, S61.z);
        wreck(S61.x, S61.z, 0.5, false);
        emitters.push({
          x: S61.x,
          z: S61.z,
          y: 2,
          rate: 60,
          life: 12,
          vy: 2,
          s0: 0.6,
          s1: 3.4,
          fire: 0.3,
          acc: 0,
          sp: 1
        });
        sched.push({
          at: G.t + 1.5,
          fn: () =>
            say(
              'Uniform 6-4',
              '¡Black Hawk derribado! ¡Black Hawk derribado! Ha caído una nave en la ciudad.',
              'hq',
              true
            )
        });
        sched.push({
          at: G.t + 6,
          fn: () => {
            G.m.down61 = true;
            cineEnd();
          }
        });
      }
    }
  ]);
  cineStart({
    block: false,
    zoom: 15,
    spin: 0.03,
    focus: () => (H && !H.gone ? [H.x, H.z, H.y] : [S61.x, S61.z, 0]),
    text: 'El Super 6-1 cubre a la columna desde el aire'
  });
}
