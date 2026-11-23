/* ====================================================================================================
 * missions/m08-segunda-fase.js
 *
 * 8 · Segunda fase: la plaza pide ayuda, los Little Birds no distinguen amigos de enemigos y el Romeo 4-1 marca las azoteas con IR
 * ================================================================================================== */

'use strict';

const M8_IR = [
  {
    x: 380.9,
    z: 293.3,
    r: 4.2,
    roofs: [[380, 286]],
    run: [
      [358, 286],
      [398, 286]
    ],
    dir: 'oeste',
    name: 'la azotea del norte'
  },
  {
    x: 397.0,
    z: 303.9,
    r: 4.2,
    roofs: [
      [397, 298],
      [397, 309]
    ],
    run: [
      [397, 284],
      [397, 322]
    ],
    dir: 'norte',
    name: 'las azoteas del este'
  }
];
// un anillo discontinuo en el suelo
function m8DashRing(x, z, r, col) {
  const g = new T.Group(),
    mat = new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.9,
      side: T.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    n = Math.max(14, Math.round(r * 5)),
    st = 6.283 / n;
  for (let k = 0; k < n; k++) {
    const geo = new T.RingGeometry(r - 0.32, r, 4, 1, k * st, st * 0.58);
    geo.rotateX(-Math.PI / 2);
    g.add(new T.Mesh(geo, mat));
  }
  g.position.set(x, 0.06, z);
  return grounded(g, 0.08);
}
// la granada: un arco pequeño de la mano a la azotea y luego el estroboscopio parpadeando en el pretil
function m8Throw(u, tx, ty, tz) {
  const m = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.14, 6), new T.MeshLambertMaterial({ color: 0x3a3d30 }));
  world.add(m);
  u.face = Math.atan2(tx - u.x, tz - u.z);
  u.stance = 'stand';
  u.firing = 0.5;
  (G.m.proj = G.m.proj || []).push({ m, x0: u.x, y0: 1.5, z0: u.z, tx, ty, tz, t: 0, T: 1.1 });
}
function m8Fx(dt) {
  for (const p of G.m.proj || []) {
    if (p.done) continue;
    p.t += dt;
    const f = Math.min(1, p.t / p.T);
    p.m.position.set(
      p.x0 + (p.tx - p.x0) * f,
      p.y0 + (p.ty - p.y0) * f + Math.sin(f * Math.PI) * 3.2,
      p.z0 + (p.tz - p.z0) * f
    );
    p.m.rotation.x += dt * 12;
    if (f >= 1) {
      p.done = true;
      p.m.rotation.set(Math.PI / 2, 0, 0);
      p.m.position.y = p.ty + 0.05;
      const s = new T.Sprite(FLARE_CORE);
      s.scale.set(0.6, 0.6, 1);
      s.position.set(p.tx, p.ty + 0.25, p.tz);
      world.add(s);
      (G.m.strobes = G.m.strobes || []).push(s);
    }
  }
  // un estroboscopio IR: invisible a simple vista, solo parpadea a través de los visores
  const nvOn = !!((G.nv || G.nvAt) && nightF > 0.25);
  for (const s of G.m.strobes || []) s.visible = nvOn && (G.t * 2.6) % 1 < 0.22;
}
// una pasada de tiro sobre la azotea marcada: todos los disparos en la azotea, solo caen los que están arriba
function m8Run(k) {
  const Z = M8_IR[k],
    [a, b] = Z.run,
    B_ = Z.roofs.map(([x, z]) => BLDS[bAt(x, z)]).filter(Boolean),
    ids = new Set(B_.map(b_ => b_.id));
  const only = new Set(them.filter(e => e.alive && e.inB && ids.has(e.inB.b)));
  let dx = b[0] - a[0],
    dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  dx /= L;
  dz /= L;
  const S = [a[0] - dx * 70, a[1] - dz * 70],
    E = [b[0] + dx * 110, b[1] + dz * 110];
  const lb = littleBird();
  world.add(lb.g);
  lb.g.visible = false;
  SUP.runs.push({
    a,
    b,
    d: [dx, dz],
    L,
    pts: [S, a, b, E],
    cum: [0, 70, 70 + L, 180 + L],
    s: 0,
    delay: 0.5,
    lb,
    fireAcc: 0,
    rk: 99,
    sup: false,
    hit: new Set(),
    x: S[0],
    z: S[1],
    alt: 22,
    only,
    roofB: B_,
    noMark: true
  });
  G.m.run = SUP.runs[SUP.runs.length - 1];
  return only;
}
// la plaza pide ayuda; los Little Birds, altos; Eversmann se ofrece a marcar
function m8AirIntro() {
  const r22 = G.m.r22,
    r31 = G.m.r31,
    R41 = gLive(grpN('Romeo 4-1')),
    evm = R41.find(u => /Eversmann/.test(u.name)) || R41[0];
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  const lbAt = () => {
    const o = ORBITS[0];
    if (!o) return [S61.x, S61.z];
    const p = o.h.g.position;
    return [p.x, p.z, p.y];
  };
  G.m.cf = [S61.x - 2, S61.z - 6];
  cineStart({
    zoom: 10,
    spin: 0.012,
    yaw0: camS.yaw,
    focus: () => (G.m.cf === 'lb' ? lbAt() : G.m.cf),
    text: L('Super 6-1 · los tejados del norte y del este no dejan de disparar'),
    keys: [
      {
        t: 1,
        fn: () =>
          sayU(
            r22[0],
            '¡Uniform 6-4, aquí Romeo 2-2! ¡Estamos recibiendo mucho fuego desde las azoteas! ¡Necesitamos apoyo!'
          )
      },
      { t: 6.5, fn: () => sayU(r31[0], '¡Nos tienen cogidos entre tres tejados! ¡No podemos movernos de aquí!') },
      {
        t: 11,
        fn: () => say('Uniform 6-4', 'Star 4-1, Star 4-4: apoyo de fuego en la zona de impacto del 6-1.', 'hq', true)
      },
      {
        t: 14.5,
        text: L('Dos Little Birds sobrevuelan la zona, altos, con visores nocturnos'),
        fn: () => {
          G.m.cf = 'lb';
          CINE.zoom = 13;
        }
      },
      {
        t: 16,
        text: L('Visión nocturna · Star 4-1'),
        fn: () => {
          const p = lbAt();
          G.nvAt = [[p[0], 0, p[1]]];
          G.nvR = 999;
          say(
            'Star 4-1',
            'Aquí Star 4-1, sobre la zona. Hay mucha actividad ahí abajo. No puedo distinguir a los buenos de los malos.',
            'air',
            true
          );
        }
      },
      {
        t: 22,
        fn: () =>
          say(
            'Star 4-1',
            'Necesito que me marquéis los objetivos con infrarrojo. Marcadme los tejados con IR.',
            'air',
            true
          )
      },
      {
        t: 27,
        fn: () => {
          G.nvAt = null;
          G.nvR = 0;
          if (evm) G.m.cf = [evm.x, evm.z];
          CINE.zoom = 9;
          sayU(
            evm,
            'Star 4-1, aquí Romeo 4-1. Estamos en una de las calles que dan a la zona de impacto. Os marcamos nosotros los dos edificios.'
          );
        }
      },
      { t: 33.5, fn: () => say('Star 4-1', 'Recibido, Romeo 4-1. Esperando vuestras luces.', 'air', true) }
    ],
    dur: 37,
    tick: dt => {
      m8Xfire(dt, 1.3);
      m8Fx(dt);
      for (const u of us) if (u.alive && !u.god) u.sup = Math.min(u.sup, 25);
    },
    onEnd: () => {
      G.nvAt = null;
      G.nvR = 0;
      G.m.air = true;
      G.m.irR = M8_IR.map(z => m8DashRing(z.x, z.z, z.r, 0x4a8cff));
      G.m.mzMap = M8_IR.map(z => ({ x: z.x, z: z.z, r: z.r, col: '#2a5a9a', lab: 'Marcar IR' }));
      G.sel = new Set(gLive(grpN('Romeo 4-1')));
      refreshCards();
      renderSubs();
      camS.zoomT = 13;
      hint(
        'Lleva al Romeo 4-1 a los dos círculos azules de la zona de impacto. En cada uno, tu equipo marcará con IR el tejado de al lado para el Little Bird.'
      );
    }
  });
}
// alcanzado un círculo: con los visores, uno tira la granada IR a la azotea y el Star 4-1 hace su pasada
function m8IR(k) {
  const Z = M8_IR[k],
    R41 = gLive(grpN('Romeo 4-1')),
    evm = R41.find(u => /Eversmann/.test(u.name)) || R41[0];
  const B0 = BLDS[bAt(Z.roofs[0][0], Z.roofs[0][1])],
    tx = B0.x + B0.w / 2,
    tz = B0.y + B0.d / 2,
    ty = B0.top;
  const thr = R41.slice().sort((a, b) => Math.hypot(a.x - tx, a.z - tz) - Math.hypot(b.x - tx, b.z - tz))[0];
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  G.m.irBusy = true;
  for (const u of R41) {
    u.path = [];
    u.order = null;
    u.stance = 'crouch';
  }
  G.m.cf = [thr.x, thr.z];
  G.nvAt = [
    [thr.x, 0, thr.z],
    [tx, ty, tz]
  ];
  let only = null;
  const runAt = () => {
    const r = G.m.run,
      p = r && r.lb && r.lb.g.position;
    return p && r.lb.g.visible && SUP.runs.includes(r) ? [p.x, p.z, p.y] : null;
  };
  cineStart({
    zoom: 6.5,
    spin: 0.01,
    yaw0: camS.yaw,
    focus: () => (G.m.cf === 'run' && runAt()) || (G.m.cf === 'run' ? [tx, tz, ty] : G.m.cf),
    text: L('Visión nocturna · marcando ' + Z.name + ' con infrarrojo'),
    keys: [
      { t: 0.6, fn: () => sayU(thr, '¡Granada IR! ¡Marcando!') },
      { t: 1.6, fn: () => m8Throw(thr, tx + rr(-0.8, 0.8), ty, tz + rr(-0.8, 0.8)) },
      {
        t: 3.4,
        fn: () => {
          G.m.cf = [tx, tz, ty];
          CINE.zoom = 9;
        }
      },
      { t: 4.2, fn: () => sayU(evm, `Star 4-1, objetivo marcado. Estroboscopio IR en ${Z.name}.`) },
      {
        t: 8.5,
        fn: () => {
          say('Star 4-1', `Veo vuestra luz. Entro desde el ${Z.dir}. ¡Cabezas abajo!`, 'air', true);
          only = m8Run(k);
          G.m.cf = 'run';
          CINE.zoom = 12;
        }
      },
      {
        t: 24,
        fn: () => {
          G.m.cf = [tx, tz, ty];
          CINE.zoom = 10;
          say('Star 4-1', 'Objetivo batido. Saliendo de la pasada.', 'air', true);
        }
      },
      {
        t: 27.5,
        fn: () =>
          sayU(
            k ? G.m.r31[0] : G.m.r22[0],
            k ? '¡Buen tiro! ¡El este está limpio!' : '¡Buen tiro! ¡Esa azotea ya no dispara!'
          )
      }
    ],
    dur: 31,
    tick: dt => {
      m8Xfire(dt, 1);
      m8Fx(dt);
      if (thr.alive) G.nvAt[0] = [thr.x, 0, thr.z];
      {
        const p = runAt();
        G.nvAt[2] = p ? [p[0], 0, p[1]] : [0, -999, 0];
      }
      for (const u of us) if (u.alive && !u.god) u.sup = Math.min(u.sup, 25);
    },
    onEnd: () => {
      G.nvAt = null;
      G.m.irBusy = false;
      if (only) for (const e of only) if (e.alive) damage(e, 9999, null);
      G.m.irDone[k] = true;
      if (G.m.irR && G.m.irR[k]) {
        overlay.remove(G.m.irR[k]);
        G.m.irR[k] = null;
      }
      G.m.mzMap = M8_IR.filter((z, q) => !G.m.irDone[q]).map(z => ({
        x: z.x,
        z: z.z,
        r: z.r,
        col: '#2a5a9a',
        lab: 'Marcar IR'
      }));
      G.sel = new Set(gLive(grpN('Romeo 4-1')));
      refreshCards();
      renderSubs();
    }
  });
}
function m8IRTick(dt) {
  m8Xfire(dt, 1);
  m8Fx(dt);
  if (!G.m.air || G.m.irBusy || CINE.on) return;
  const g = grpN('Romeo 4-1');
  M8_IR.forEach((Z, k) => {
    if (!G.m.irDone[k] && !G.m.irBusy && gReady(g, Z.x, Z.z, Z.r + 0.4, 3)) m8IR(k);
  });
}
// el final: las gracias desde la plaza y desde el aire, y Garrison por radio con Steele
function m8Final() {
  const r22 = G.m.r22,
    sayU = (u, t) => {
      if (u) {
        u.talkT = 2.6;
        radio(u, t, true);
      }
    };
  G.m.cf = [S61.x - 2, S61.z - 5];
  G.m.mzMap = null;
  cineStart({
    zoom: 10,
    spin: 0.015,
    yaw0: camS.yaw,
    focus: () => G.m.cf,
    keys: [
      {
        t: 1,
        fn: () => say('Star 4-1', 'Romeo 4-1, los tejados están limpios. Buen trabajo con las marcas.', 'air', true)
      },
      {
        t: 6,
        fn: () =>
          sayU(r22[0], '¡Gracias, Romeo 4-1! ¡Gracias, Star 4-1! Nos habéis quitado de encima a esos tiradores.')
      },
      { t: 11.5, fn: () => say('Star 4-1', 'Aguantad un poco más ahí abajo. La ayuda está en camino.', 'air', true) },
      {
        t: 16,
        text: L('Joint Operations Center · aeropuerto de Mogadiscio'),
        fn: () => {
          G.m.cf = [M8_HOUSE.x - 2, M8_HOUSE.z + 2];
          CINE.zoom = 11;
        }
      },
      {
        t: 17,
        fn: () =>
          say(
            'JOC',
            'Capitán Steele, aquí Garrison. Hemos conseguido que los paquistaníes y la 10ª de Montaña organicen un convoy para sacaros de ahí.',
            'hq',
            true
          )
      },
      { t: 24, fn: () => say('Cap. Steele', 'Recibido, señor. ¿Cuánto les queda?', 'us', true) },
      {
        t: 27.5,
        fn: () =>
          say('JOC', 'Están formando la columna en el estadio. Aguantad. No vamos a dejar a nadie atrás.', 'hq', true)
      },
      { t: 33.5, fn: () => say('Cap. Steele', 'Recibido. Aguantaremos hasta que lleguen aquí.', 'us', true) }
    ],
    dur: 37,
    tick: dt => {
      m8Fx(dt);
    },
    onEnd: () => {
      G.m.fin = true;
    }
  });
}
MISSIONS.night = {
  id: 'night',
  n: 8,
  title: 'Resistir de noche',
  hud: 'Destruir el mortero y marcar con IR las azoteas para los Little Birds',
  phase: 'night',
  hour: 19.667,
  sunHour: 21,
  crashed: ['s61', 's64'],
  orbits: [
    { lb: true, x: 381, z: 296, rx: 30, rz: 24, alt: 24, w: (2 * Math.PI) / 46 },
    { lb: true, x: 381, z: 296, rx: 22, rz: 30, alt: 27, w: (-2 * Math.PI) / 58 }
  ],
  place: 'Del Super 6-1 a el edificio de los heridos',
  squadTxt: 'Rangers · Romeo 4-1',
  date: '3 OCT 1993',
  noCiv: true,
  noObjRing: true,
  endDelay: 1.5,
  summary:
    'Kilo 1-1 vuelve del Super 6-4 y silencia la técnica que tiene clavados a los Rangers del 6-1. Un mortero castiga el edificio de los heridos: el Romeo 4-1 sale de noche a buscarlo y después marca con IR las azoteas para los Little Birds.',
  text: '19:40. Es noche cerrada. Junto al Super 6-1, el Romeo 2-2 y el Romeo 3-1 siguen a cubierto bajo el fuego de una técnica y de las azoteas. Kilo 1-1 vuelve del Super 6-4. En el edificio de los heridos, calle arriba, empiezan a caer granadas de mortero: hay que encontrar el tubo antes de que el edificio se venga abajo.',
  start: [M8_HOUSE.x - 6, M8_HOUSE.z],
  cam: [S61.x - 6, S61.z - 9, 9],
  civ: [S61.x, S61.z],
  spawn() {
    // el Romeo 4-1, a las órdenes del jugador: dentro de la casa con los heridos
    spawnForce([
      {
        name: 'Romeo 4-1',
        role: 'Rangers · cazar el mortero',
        kind: 'chalk',
        specs: chalkSpecs(3).map((s, i) => Object.assign(s, i === 0 ? { role: 'Jefe · radio', kit: 'radio' } : {})),
        at: [M8_HOUSE.x - 5, M8_HOUSE.z]
      }
    ]);
    const hb = m8House();
    if (hb) for (const u of gLive(grpN('Romeo 4-1'))) placeInB(u, hb, 'ground');
    // las dos unidades de Rangers del derribo: no pueden morir ni recibir órdenes
    const R = (name, unit, k) =>
      Object.assign({}, RANGERS[k % 6], RSPEC, { name, role: 'A cubierto en el 6-1', unitName: unit, medic: false });
    const mk = (L_, pts, unit, face) =>
      L_.map((n, k) => {
        const u = npcUnit(R(n, unit, k), pts[k][0], pts[k][1], face);
        u.stance = 'crouch';
        u.god = true;
        u.m8in = true;
        u.noFire = true;
        u.order = { type: 'hold' };
        return u;
      });
    G.m.r22 = mk(['Tte. Larry Perino', 'Esp. Phipps', 'Esp. Rodriguez', 'Cabo Goodale'], M8_R22, 'Romeo 2-2', 2.85);
    G.m.r31 = mk(['Sgto. Okafor', 'Cabo Lindqvist', 'Herrera', 'Park'], M8_R31, 'Romeo 3-1', 1.4);
    // Kilo 1-1, de vuelta del 6-4: a oscuras en el extremo oeste de la calle verde
    const hoot = Object.assign({}, DELTA[1], DSPEC, {
      name: 'Sgto. 1º Hoot Gibson',
      role: 'Jefe de equipo',
      kit: 'radio'
    });
    G.m.delta = [hoot].concat(deltaSpecs(6).slice(2)).map((s, i) => {
      const u = npcUnit(
        Object.assign({}, s, { unitName: 'Kilo 1-1' }),
        M8_GREEN[0][0] - i * 1.25,
        M8_GREEN[0][1] + (i % 2 ? 0.5 : -0.3),
        PH
      );
      u.god = true;
      u.noFire = true;
      u.stance = 'crouch';
      return u;
    });
    // la técnica en la cruz naranja, iluminada por un bidón ardiendo, con dos hombres
    G.m.tech = techSpawn(
      [
        [M8_TECH.x, M8_TECH.z - 1],
        [M8_TECH.x, M8_TECH.z]
      ],
      'tech',
      { vmax: 0.1 }
    );
    G.m.tech.gunner.noFire = true;
    G.m.techCrew = [
      [368.9, 278.6],
      [372.4, 279.2]
    ].map(([x, z]) => {
      const e = foe(x, z, 'post', 'tech', CAMP_ESPEC);
      e.x = x;
      e.z = z;
      e.noFire = true;
      e.face = 0;
      e.stance = 'stand';
      return e;
    });
    {
      const g = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.85, 10), new T.MeshLambertMaterial({ color: 0x5a3a26 }));
      g.position.set(M8_BARREL.x, 0.43, M8_BARREL.z);
      g.castShadow = true;
      world.add(g);
      emitters.push({
        x: M8_BARREL.x,
        z: M8_BARREL.z,
        y: 0.95,
        rate: 16,
        life: 8,
        vy: 1.15,
        s0: 0.24,
        s1: 1.8,
        fire: 0.45,
        acc: 0,
        sp: 0.24,
        lsrc: true
      });
      LIGHTSRC.push({ x: M8_BARREL.x, y: 1.3, z: M8_BARREL.z, col: 0xff7428, i: 3.2, d: 11, fl: 1 });
    }
    // los restos siguen humeando y alumbran un poco la plaza
    emitters.push({
      x: S61.x + 0.8,
      z: S61.z - 0.4,
      y: 0.9,
      rate: 16,
      life: 8,
      vy: 1.15,
      s0: 0.24,
      s1: 1.8,
      fire: 0.45,
      acc: 0,
      sp: 0.24,
      lsrc: true
    });
    LIGHTSRC.push({ x: S61.x + 0.8, y: 1.2, z: S61.z - 0.4, col: 0xff7a30, i: 2.6, d: 10, fl: 1 });
    // las tres azoteas, los puestos en las calles y el mortero
    for (const [x, z, n] of M8_ROOFS) {
      const b = bAt(x, z);
      if (b >= 0) m8RoofFill(BLDS[b], n);
    }
    m8Streets();
    m8Mortar();
    G.m.bHp = 100;
    G.m.syms = [
      { label: 'ROMEO 2-2', pts: () => G.m.r22.filter(u => u.alive).map(u => [u.x, u.z]) },
      { label: 'ROMEO 3-1', pts: () => G.m.r31.filter(u => u.alive).map(u => [u.x, u.z]) },
      { label: 'KILO 1-1', pts: () => G.m.delta.filter(u => u.alive && u.m8in).map(u => [u.x, u.z]) }
    ];
  },
  onStart() {
    m8Intro();
  },
  subs: [
    {
      text: 'Encontrar el mortero y acabar con sus tres sirvientes',
      zone: { x: M8_HOUSE.x, z: M8_HOUSE.z, r: 5 },
      start: () => {
        G.m.zr = M8_ZONES.map(z => ringAt(z.x, z.z, z.r, 0xe7a63d));
        G.m.mzMap = M8_ZONES;
      },
      tick: () => m8Tick(G.dt || 1 / 30),
      count: () => 'edificio ' + Math.round(G.m.bHp) + ' %',
      done: () => tagDone('mortar'),
      onDone: () => {
        G.m.mDone = true;
        for (const r of G.m.zr || []) overlay.remove(r);
        G.m.zr = [];
        G.m.mzMap = null;
        sched.push({
          at: G.t + 2,
          fn: () => say('Cap. Steele', 'Ha dejado de caer. Buen trabajo, Romeo 4-1.', 'us', true)
        });
        sched.push({
          at: G.t + 4.5,
          fn: () => say('Uniform 6-4', 'Recibido, Romeo 4-1. Mortero fuera de combate.', 'hq', true)
        });
      },
      radio: '¡Mortero neutralizado! ¡Ya no dispara!'
    },
    {
      text: 'Marcar con IR las azoteas para los Little Birds (círculos azules)',
      zone: { x: 389, z: 298.6, r: 6 },
      start: () => {
        G.m.irDone = [false, false];
        sched.push({ at: G.t + 7, fn: () => m8AirIntro() });
      },
      tick: () => m8IRTick(G.dt || 1 / 30),
      count: () => [G.m.irDone.filter(Boolean).length, 2],
      done: () => G.m.irDone.every(Boolean) && !CINE.on
    },
    {
      text: 'Aguantar: la ayuda está en camino',
      zone: { x: S61.x, z: S61.z, r: 8 },
      start: () => m8Final(),
      tick: () => m8Fx(G.dt || 1 / 30),
      done: () => !!G.m.fin
    }
  ],
  opt: [{ text: 'Que el edificio aguante por encima del 50 %', ok: () => (G.m.bHp || 0) >= 50 }]
};
