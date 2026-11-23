/* ====================================================================================================
 * missions/tutorial/intro.js
 *
 * Arranque del tutorial: llega el Humvee con Blackburn, el nuevo, y empieza la instrucción.
 * ================================================================================================== */

'use strict';

/* La apertura: el Romeo 4-1 espera en el campo de instrucción; un Humvee trae al nuevo, Blackburn, y al sargento que lo deja allí */
function tzHumvee() {
  const v = irVehicle('h'),
    inP = [
      [-100.5, 28.8],
      [-97, 30],
      [-92, 31.4],
      [-88, 32.2],
      [-81.8, 32.6]
    ].map(q_ => {
      const w = tzW(...q_);
      return [w.x, w.z];
    });
  const outP = [
    [-81.8, 32.6],
    [-84.5, 35.6],
    [-90, 35.4],
    [-97, 30.6],
    [-106, 25.5],
    [-112, 19.5],
    [-115.5, 12.5]
  ].map(q_ => {
    const w = tzW(...q_);
    return [w.x, w.z];
  });
  const H = { v, path: smoothRoute(inP, 1.5), s: 0, sp: 0, go: true, out: false, done: false };
  H.L = H.path.reduce((a_, p_, k) => (k ? a_ + Math.hypot(p_[0] - H.path[k - 1][0], p_[1] - H.path[k - 1][1]) : 0), 0);
  H.leave = () => {
    H.path = smoothRoute(outP, 1.5);
    H.L = H.path.reduce(
      (a_, p_, k) => (k ? a_ + Math.hypot(p_[0] - H.path[k - 1][0], p_[1] - H.path[k - 1][1]) : 0),
      0
    );
    H.s = 0;
    H.sp = 0;
    H.go = true;
    H.out = true;
  };
  H.at = s_ => {
    let k = 0,
      acc = 0;
    while (k < H.path.length - 2) {
      const d = Math.hypot(H.path[k + 1][0] - H.path[k][0], H.path[k + 1][1] - H.path[k][1]);
      if (acc + d >= s_) break;
      acc += d;
      k++;
    }
    const a_ = H.path[k],
      b_ = H.path[k + 1],
      d = Math.hypot(b_[0] - a_[0], b_[1] - a_[1]) || 1,
      f = clamp((s_ - acc) / d, 0, 1);
    return [a_[0] + (b_[0] - a_[0]) * f, a_[1] + (b_[1] - a_[1]) * f, Math.atan2(b_[0] - a_[0], b_[1] - a_[1])];
  };
  H.step = dt => {
    if (!H.go) return;
    const left = H.L - H.s,
      vmax = H.out ? 7 : 6.5;
    H.sp = Math.min(
      vmax,
      H.out ? H.sp + dt * 3.2 : Math.max(H.sp, 4.5) + dt * 3.2,
      H.out ? 99 : Math.sqrt(2 * 2.6 * Math.max(0, left)) + 0.05
    );
    H.s = Math.min(H.L, H.s + H.sp * dt);
    const [x, z, yw] = H.at(H.s);
    v.g.position.set(x, 0, z);
    let dy = yw - v.g.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    v.g.rotation.y += dy * Math.min(1, dt * 5);
    if (H.s >= H.L - 0.02) {
      H.go = false;
      if (H.out) {
        world.remove(v.g);
        H.done = true;
      }
    }
  };
  const [x0, z0, y0] = H.at(0);
  v.g.position.set(x0, 0, z0);
  v.g.rotation.y = y0;
  return H;
}
function tzDoor(H, side, along) {
  const g = H.v.g,
    yw = g.rotation.y,
    fx = Math.sin(yw),
    fz = Math.cos(yw),
    rx = fz,
    rz = -fx;
  return [g.position.x + fx * along + rx * side, g.position.z + fz * along + rz * side];
}
function tutIntro() {
  const sq = tutPlayers(),
    [ev, wa, ne, tw, bl] = sq,
    gd = G.m.guard,
    esc = G.m.esc;
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.4;
      radio(u, t, true);
    }
  };
  const H = (G.m.hv = tzHumvee());
  // los dos pasajeros van dentro, fuera del mundo, hasta que se abren las puertas
  for (const u of [bl, esc])
    if (u) {
      world.remove(u.m.root);
      u.inCar = true;
    }
  const out = (u, side, along) => {
    const d = tzDoor(H, side, along),
      c = findWalk(d[0], d[1]);
    u.x = d[0];
    u.z = d[1];
    u.face = H.v.g.rotation.y + (side > 0 ? -PH : PH);
    world.add(u.m.root);
    u.inCar = false;
    u.path = [];
  };
  const gate = tzW(-74.2, 31.4),
    focus = () => {
      const p = H.v.g.position,
        t = CINE.t,
        f = sstep(0, 5, t);
      return [p.x * (1 - f) + gate.x * f, p.z * (1 - f) + gate.z * f];
    };
  cineStart({
    zoom: 10,
    spin: 0,
    yaw0: -2.75,
    block: true,
    focus: () => {
      const t = CINE.t;
      if (t < 6) return focus();
      const f = sstep(33.5, 41.5, t),
        sg = tzW(-66, 34);
      return [gate.x * (1 - f) + sg.x * f, gate.z * (1 - f) + sg.z * f];
    },
    keys: [
      {
        t: 1,
        fn: () => tutSgt('Eversmann, en cuanto llegue tu hombre nuevo empezamos. Munición real, así que ojos abiertos.')
      },
      { t: 3, fn: () => sayU(ev, 'Recibido, sargento. Lo espero en la puerta.') },
      {
        t: 5.4,
        fn: () => {
          if (bl) out(bl, -1.25, -0.75);
          if (esc) out(esc, -1.25, 0.65);
          G.m.armUp = true;
          sayU(gd, 'Romeo 4-1, adelante. Barrera arriba.');
        }
      },
      {
        t: 6.2,
        fn: () => {
          const a_ = tzW(-72.4, 30.4),
            b_ = tzW(-72.6, 32.0);
          if (esc) goTo(esc, a_.x, a_.z);
          if (bl) goTo(bl, b_.x, b_.z);
        }
      },
      { t: 8.6, fn: () => sayU(ne, '¿Un novato? Justo lo que nos faltaba.') },
      { t: 11, fn: () => sayU(tw, 'Cállate, Nelson. Todos fuimos nuevos.') },
      {
        t: 13.5,
        fn: () =>
          sayU(
            esc,
            '¿Sargento Eversmann? Le traigo al soldado Blackburn, va a su cargo. Yo estoy buscando al teniente Perino. ¿Se lo puedo dejar a usted?'
          )
      },
      { t: 19.5, fn: () => sayU(ev, 'Déjamelo a mí. El teniente estaba en el hangar de operaciones.') },
      {
        t: 23,
        fn: () => {
          sayU(esc, 'Gracias, sargento. Suerte, chaval.');
        }
      },
      {
        t: 24.5,
        fn: () => {
          if (esc) {
            const d = tzDoor(H, -1.25, 0.65);
            goTo(esc, d[0], d[1]);
          }
          sayU(ev, '¿Cuánto tiempo llevas aquí, Blackburn?');
        }
      },
      { t: 27.5, fn: () => sayU(bl, 'Acabo de llegar, sargento.') },
      { t: 30, fn: () => sayU(ev, '¿Has disparado alguna vez?') },
      { t: 33, fn: () => sayU(bl, 'No, nunca.') },
      {
        t: 35,
        fn: () => {
          sayU(ev, 'Pues hoy empiezas. Únete al resto para la práctica, y pegado a Nelson.');
          if (bl) {
            const p_ = tzW(TZ_STAGE[0] + 2.6, TZ_STAGE[1] + 0.1);
            goTo(bl, p_.x, p_.z);
          }
        }
      },
      { t: 38.5, fn: () => sayU(tw, 'Bienvenido a la arena, chaval.') },
      {
        t: 41.5,
        fn: () => {
          tutSgt(
            'Escuchad. Cinco hombres, un edificio y tres dianas. Os moveréis juntos, os cubriréis, subiréis a un hombre a la azotea, suprimiréis y avanzaréis por puntos, de parapeto en parapeto. Nada de correr en línea recta por campo abierto.'
          );
          if (ev) {
            const p_ = tzW(TZ_STAGE[0] + 1.2, TZ_STAGE[1] - 0.6);
            goTo(ev, p_.x, p_.z);
          }
        }
      },
      { t: 49.5, fn: () => sayU(ev, 'Entendido. Romeo 4-1, conmigo.') },
      { t: 52.5, fn: () => tutSgt('Eversmann, el ejercicio es tuyo. Empezamos cuando estés listo.') }
    ],
    dur: 56,
    tick: () => {
      const dt = G.dt || 1 / 30;
      H.step(dt);
      for (const u of sq) if (u.alive) u.sup = 0;
      for (const u of [bl, esc])
        if (u && u.inCar) {
          const p_ = H.v.g.position;
          u.x = p_.x;
          u.z = p_.z;
        }
      // la escolta vuelve a subir y el Humvee se va
      if (esc && !esc.inCar && CINE.t > 25.5 && !esc.path.length && !H.out) {
        world.remove(esc.m.root);
        esc.inCar = true;
        setTimeout(() => {}, 0);
        H.leave();
      }
      if (H.out && CINE.t > 27.5 && (!bl || !bl.path.length || CINE.t > 37.5)) G.m.armUp = false;
      if (CINE.t > 8 && CINE.t < 34.5 && ev && bl && !bl.inCar) {
        if (!bl.path.length) bl.face = Math.atan2(ev.x - bl.x, ev.z - bl.z);
        if (!ev.path.length) ev.face = Math.atan2(bl.x - ev.x, bl.z - ev.z);
        if (esc && !esc.inCar && !esc.path.length && CINE.t < 24.5) esc.face = Math.atan2(ev.x - esc.x, ev.z - esc.z);
      }
    },
    onEnd: () => {
      if (H && !H.done) {
        world.remove(H.v.g);
        H.done = true;
      }
      if (esc) {
        if (!esc.inCar) world.remove(esc.m.root);
        esc.inCar = true;
        dropOverlay(esc);
        units = units.filter(x => x !== esc);
        us = us.filter(x => x !== esc);
        G.m.esc = null;
      }
      if (bl && bl.inCar) {
        world.add(bl.m.root);
        bl.inCar = false;
      }
      sq.forEach((u, i) => {
        const p_ = tzW(TZ_STAGE[0] + (i % 2 ? 1.2 : -1.2) + (i === 4 ? 2.6 : 0), TZ_STAGE[1] + (i >> 1) * 1.5);
        if (u.path.length || Math.hypot(u.x - p_.x, u.z - p_.z) > 6) {
          const c = findWalk(p_.x, p_.z);
          u.x = c[0] + 0.5;
          u.z = c[1] + 0.5;
          u.path = [];
          u.order = null;
        }
        u.stance = 'stand';
      });
      G.m.armUp = false;
      tzBlock(TZ.u0 - 0.55, TZ.u0 + 0.55, TZ.g0, TZ.g1);
      const c = tzW(-62, 31);
      camS.tx = c.x;
      camS.tz = c.z;
      camS.zoomT = 12;
      camS.yawT = -2.618 - 0.25;
      G.sel = new Set();
      refreshCards();
      renderSubs();
      hint(MIS.subs[0].tip);
    }
  });
}
MISSIONS.tutorial = {
  id: 'tutorial',
  n: 0,
  title: 'Tutorial',
  hud: 'Instrucción en la base: tiro, heridos y apoyo aéreo',
  phase: 'day',
  hour: 16.7,
  crashed: [],
  squad: 'rangers',
  noCiv: true,
  place: 'Aeropuerto de Mogadiscio · campo de instrucción de la TFR',
  squadTxt: 'Rangers · Romeo 4-1',
  date: 'SEP 1993',
  summary:
    'Llega Blackburn, el nuevo. Tres ejercicios a lo largo de la tarde: tiro con munición real con el Romeo 4-1, atención a heridos con el Romeo 5-1 junto a las tiendas y apoyo aéreo con el Romeo 6-2 en la playa.',
  text: 'Base de la Task Force Ranger, en el aeropuerto. Al otro lado de la pista, junto a la playa, está el campo de instrucción. Los hombres del Romeo 4-1 esperan en el campo para un ejercicio con munición real del sargento Watson. Antes de empezar, un Humvee trae a un recién llegado: el soldado Todd Blackburn. Cada paso te dice qué tocar. El juego se para solo cuando aparece algo nuevo: da tus órdenes con calma y reanuda con Espacio o con el botón de pausa.',
  start: [OX + 2, OZ + 30],
  cam: [tzW(-100, 26).x, tzW(-100, 26).z, 10],
  threat: () => tzW(-35.5, 32),
  spawn() {
    G.m.tut = true;
    buildTrainingGround();
    const p0 = tzW(-81, 33);
    spawnForce([
      {
        name: 'Romeo 4-1',
        role: 'Rangers · instrucción',
        kind: 'chalk',
        specs: rangerSpecs([
          'Sgto. Matt Eversmann',
          'Esp. John Waddell',
          'Esp. Shawn Nelson',
          'Esp. Lance Twombly',
          'Sold. Todd Blackburn'
        ]).map((s, i) =>
          Object.assign(s, i === 0 ? { role: 'Jefe · radio' } : i === 4 ? { role: 'Recién llegado' } : {})
        ),
        at: [p0.x, p0.z],
        face: AIR_RY
      }
    ]);
    tutPlayers().forEach((u, i) => {
      const p =
          i === 0
            ? tzW(-70.6, 31.4)
            : i < 4
              ? tzW(TZ_STAGE[0] + 2.6 + (i % 2) * 1.6, TZ_STAGE[1] + 1.4 + (i >> 1) * 1.4)
              : tzW(-100.5, 28.8),
        c = findWalk(p.x, p.z);
      u.x = c[0] + 0.5;
      u.z = c[1] + 0.5;
      u.face = i === 0 ? AIR_RY - PH : AIR_RY + PH;
      if (i > 0 && i < 4) u.stance = 'crouch';
    });
    {
      const g = tzW(-100.5, 28.8);
      G.m.esc = npcUnit(
        Object.assign({}, RANGERS[3], RSPEC, {
          name: 'Sgto. Jeff Struecker',
          role: 'Le acompaña',
          unitName: 'Base TFR'
        }),
        g.x,
        g.z,
        AIR_RY + PH
      );
      G.m.esc.noFire = true;
    }
    const R = (name, role, extra) =>
      Object.assign({}, RANGERS[0], RSPEC, { name, role, unitName: 'Instrucción' }, extra || {});
    const sg = tzW(-67.4, 51.5),
      s1 = tzW(-64.2, 49.5),
      s2 = tzW(-64.2, 53.5),
      gd = tzW(-75.3, 29.3);
    G.m.sgt = npcUnit(R('Sgto. 1º Sean Watson', 'Instructor', { kit: 'radio' }), sg.x, sg.z, AIR_RY + PH);
    const a = npcUnit(R('Esp. Rob Ruiz', 'Fusilero', { stance: 'crouch' }), s1.x, s1.z, AIR_RY + PH);
    a.lane = 47.5;
    const b = npcUnit(
      R('Esp. Tom Dawes', 'Fusilero', { stance: 'crouch', gun: 'saw', burst: 6 }),
      s2.x,
      s2.z,
      AIR_RY + PH
    );
    b.lane = 51.5;
    G.m.guard = npcUnit(R('Cabo Jamie Smith', 'Puesto de guardia', { unitName: 'Base TFR' }), gd.x, gd.z, AIR_RY - PH);
    for (const u of [G.m.sgt, a, b, G.m.guard]) u.noFire = true;
    G.m.range = { shoot: [a, b] };
    tzBaseLife();
    {
      const C = [tzW(-65.6, 38.2), tzW(-64.2, 37.0), tzW(-64.0, 38.9)],
        cen = tzW(-64.6, 38.0);
      const specs = [
        Object.assign({}, RANGERS[1], RSPEC, {
          name: 'Sgto. Aaron Williamson',
          role: 'Jefe de pelotón',
          unitName: 'Romeo 2-1'
        }),
        Object.assign({}, RANGERS[0], RSPEC, { name: 'Cabo Jim Telscher', role: 'Fusilero', unitName: 'Romeo 2-1' }),
        Object.assign({}, DELTA[2], DSPEC, { name: 'Sgto. 1º John Macejunas', role: 'Operador' })
      ];
      G.m.chat = specs.map((s, i) => {
        const u = npcUnit(s, C[i].x, C[i].z, Math.atan2(cen.x - C[i].x, cen.z - C[i].z));
        u.noFire = true;
        u.chatT = rr(0.5, 3);
        return u;
      });
      const wp = [
        [-72.6, 24.2],
        [-61.6, 24.2],
        [-61.6, 26.6],
        [-72.6, 26.6]
      ].map(q => tzW(...q));
      G.m.walk = npcUnit(
        Object.assign({}, RANGERS[4], RSPEC, { name: 'Esp. Mike Kurth', role: 'Fusilero', unitName: 'Romeo 3-1' }),
        wp[0].x,
        wp[0].z,
        AIR_RY + PH
      );
      G.m.walk.noFire = true;
      G.m.walk.wp = wp;
      G.m.walk.wi = 1;
      G.m.walk.waitT = 0;
    }
    tzWoundClass(R);
    tzBeachClass(R);
  },
  onStart() {
    mapMode = 'reg';
    tutIntro();
  },
  subs: [
    {
      text: 'Mueve a toda la unidad junta hasta la línea de salida',
      zone: { x: tzW(...TZ_START).x, z: tzW(...TZ_START).z, r: 3.5 },
      tip: 'Selecciona a toda la unidad: doble toque en un soldado (o tecla T). Después toca el suelo dentro del anillo naranja.',
      start: () => tutSgt('Primero, la unidad entera hasta la línea de salida. Juntos: nadie se queda atrás.'),
      count: () => {
        const z = tzW(...TZ_START);
        return [tutPlayers().filter(u => Math.hypot(u.x - z.x, u.z - z.z) < 4.5).length, tutPlayers().length];
      },
      done: () => {
        const z = tzW(...TZ_START),
          L_ = tutPlayers();
        return G.m.allMove && L_.length && L_.every(u => Math.hypot(u.x - z.x, u.z - z.z) < 4.5 && !u.path.length);
      },
      radio: 'Romeo 4-1 en la línea de salida.'
    },
    {
      text: 'Ordena a la unidad que se cubra tras los sacos',
      zone: { x: tzW(-59.6, 34.5).x, z: tzW(-59.6, 34.5).z, r: 5 },
      tip: 'Con la unidad seleccionada, pulsa Cubrirse (C): cada soldado busca el parapeto más cercano entre él y la amenaza.',
      start: () => {
        G.m.covUsed = false;
        tutSgt('¡Contacto al frente! ¡A cubierto, detrás de los sacos!');
      },
      count: () => [
        tutPlayers().filter(u => u.order && u.order.type === 'cover' && !u.path.length).length,
        tutPlayers().length
      ],
      done: () =>
        G.m.covUsed &&
        tutPlayers().filter(u => u.order && u.order.type === 'cover' && !u.path.length).length >=
          Math.min(4, tutPlayers().length),
      radio: '¡A cubierto!'
    },
    {
      text: 'Manda a un soldado a la azotea del edificio gris',
      zone: { x: tzW(TZ_BLD.u, TZ_BLD.v).x, z: tzW(TZ_BLD.u, TZ_BLD.v).z, r: 4 },
      tip: 'Selecciona a un solo soldado (toca su ficha o tócalo a él), toca el edificio gris y elige Azotea.',
      start: () => tutSgt('Necesito ojos arriba. Un hombre a la azotea de ese edificio, ya.'),
      count: () => [Math.min(1, tutPlayers().filter(u => u.inB && u.inB.level === 'roof').length), 1],
      done: () => tutPlayers().some(u => u.inB && u.inB.level === 'roof'),
      radio: 'Arriba. Tengo las dianas a la vista.'
    },
    {
      text: 'Fuego de supresión sobre las dianas',
      zone: { x: tzW(-35.5, 32).x, z: tzW(-35.5, 32).z, r: 6 },
      tip: 'Selecciona a la unidad, pulsa Suprimir (S) y toca la zona de las dianas. Mantén el fuego unos segundos.',
      start: () => {
        G.m.supT = 0;
        tutSgt('¡Fuego de supresión sobre las dianas! Que no puedan levantar la cabeza.');
      },
      tick: () => {
        const z = tzW(-35.5, 32);
        if (
          tutPlayers().some(
            u =>
              u.order && u.order.type === 'suppress' && Math.hypot(u.order.x - z.x, u.order.z - z.z) < 8 && u.firing > 0
          )
        )
          G.m.supT += G.dt;
      },
      count: () => [Math.min(4, Math.floor(G.m.supT || 0)), 4],
      done: () => (G.m.supT || 0) >= 4,
      radio: '¡Suprimiendo! ¡Están clavados!'
    },
    {
      text: 'Avanza a dos soldados, de uno en uno, hasta los sacos de delante',
      zone: { x: tzW(...TZ_FWD).x, z: tzW(...TZ_FWD).z, r: 5.5 },
      tip: 'Selecciona a un solo soldado y llévalo hasta los sacos del anillo; luego al otro. Los demás pueden seguir suprimiendo mientras.',
      start: () => {
        G.m.soloStart = G.t;
        tutSgt('Ahora, dos hombres adelante. De uno en uno: uno se mueve mientras los demás le cubren.');
      },
      count: () => [Math.min(2, tzFwd().length), 2],
      done: () => tzFwd().length >= 2,
      radio: 'En posición, en los sacos de delante.'
    },
    {
      text: 'Avanza por puntos hasta los sacos del fondo',
      zone: { x: tzW(-46.2, 39.6).x, z: tzW(-46.2, 39.6).z, r: 4.5 },
      tip: 'Selecciona a uno o varios soldados, y toca al menos tres puntos seguidos, de parapeto en parapeto, hasta el anillo. Seguirán ese camino parando en cada punto.',
      start: () => {
        G.m.chainOK = false;
        for (const u of us) u.tzMv = 0;
        tutSgt(
          'Ahora, por puntos. Nada de ir derecho al objetivo: marcad el camino de un parapeto al siguiente y parad en cada uno.'
        );
      },
      tick: () => {
        const z = tzW(-46.2, 39.6);
        for (const u of tutPlayers())
          if (Math.max(u.chainN || 0, u.tzMv || 0) >= 3 && !u.path.length && Math.hypot(u.x - z.x, u.z - z.z) < 5.5)
            G.m.chainOK = true;
      },
      count: () => [G.m.chainOK ? 1 : 0, 1],
      done: () => G.m.chainOK,
      radio: 'En los sacos del fondo. Hemos venido por puntos.'
    },
    {
      text: 'Abate las tres dianas',
      zone: { x: tzW(-35.5, 32).x, z: tzW(-35.5, 32).z, r: 6 },
      tip: 'Selecciona soldados y toca una diana (rombo rojo) para disparar sobre ella.',
      start: () => {
        G.m.live = true;
        tutSgt('¡Fuego a discreción! Tumbad esas dianas.');
      },
      count: () => [G.m.tg.filter(e => !e.alive).length, 3],
      done: () => G.m.tg.every(e => !e.alive),
      onDone: () => {
        tutSgt(
          'Buen trabajo, Romeo 4-1. Así es como se hace ahí fuera: juntos, cubiertos y sin prisa. Recoged los casquillos.'
        );
        setTimeout(() => {
          const t_ = tutPlayers().find(u => /Twombly/.test(u.name));
          if (t_ && G.started) radio(t_, 'Nada mal para el primer día, Blackburn.', true);
        }, 4200);
      },
      radio: '¡Dianas abatidas!'
    },
    // ---- al atardecer, junto a las tiendas: el Romeo 5-1 y los heridos
    {
      text: 'Atiende al herido con el sanitario de la unidad',
      zone: { x: tzW(...TZ_WD.lie).x, z: tzW(...TZ_WD.lie).z, r: 3 },
      tip: 'Selecciona al Romeo 5-1 (toca su ficha) y pulsa Atender heridos (la cruz). El sanitario, Ortega, irá a por Hale.',
      start: () => tutWoundCine(),
      done: () => {
        const W = G.m.w;
        return !!W && !!W.hale.wasDown && W.hale.alive && !W.hale.down;
      },
      onDone: () => {
        const W = G.m.w;
        W.hale.hp = W.hale.hp0;
        W.hale.drill = false;
        W.hale.bleedT = 0;
        tzSay(
          G.m.wd.sgt,
          '¡Eso es! Rápido y sin dejarle solo. Mientras el sanitario trabaja, el reloj no corre. Hale, arriba: estás curado.'
        );
      },
      radio: 'Herido atendido. Puede andar.'
    },
    {
      text: 'Lleva a toda la unidad hasta la bandera, con el «muerto» a cuestas',
      zone: { x: tzW(...TZ_WD.flag).x, z: tzW(...TZ_WD.flag).z, r: 4.5 },
      tip: 'Espera a que un compañero cargue con Kowalski. Después selecciona al Romeo 5-1 y toca el suelo junto a la bandera.',
      start: () => tutDeadStart(),
      tick: () => tutDeadTick(),
      count: () => {
        const f = tzW(...TZ_WD.flag);
        return [tutPlayers().filter(u => Math.hypot(u.x - f.x, u.z - f.z) < 5.5).length, tutPlayers().length];
      },
      done: () => {
        const W = G.m.w,
          f = tzW(...TZ_WD.flag),
          b = W && W.kow;
        return (
          !!b &&
          !!b.carriedBy &&
          tutPlayers().length > 0 &&
          tutPlayers().every(u => Math.hypot(u.x - f.x, u.z - f.z) < 5.5 && !u.path.length)
        );
      },
      onDone: () =>
        tzSay(
          G.m.wd.sgt,
          '¿Lo habéis notado? Cargando con un hombre se avanza a la mitad. Ahí fuera, eso es tiempo bajo fuego. Kowalski, ya puedes resucitar.'
        ),
      radio: 'En la bandera. Todos, y Kowalski con nosotros.'
    },
    // ---- por la tarde, en la playa: el Romeo 6-2 y los Little Birds
    {
      text: 'Pide una pasada de Little Bird de una boya a la otra',
      zone: { x: tzW(...TZ_BC.mid).x, z: tzW(...TZ_BC.mid).z, r: 7 },
      tip: 'Pulsa Apoyo y elige Little Bird. Toca la primera boya amarilla y después la segunda.',
      start: () => tutBeachCine(),
      done: () => !!G.m.lbDone,
      onDone: () => tutBeachEnd(),
      radio: 'Pasada completada. Star 4-2 se retira.'
    }
  ],
  endDelay: 26,
  opt: []
};
const tzFwd = () => {
  const z = tzW(...TZ_FWD);
  return tutPlayers().filter(
    u => u.soloT != null && u.soloT >= (G.m.soloStart || 0) && Math.hypot(u.x - z.x, u.z - z.z) < 6.5 && !u.path.length
  );
};
