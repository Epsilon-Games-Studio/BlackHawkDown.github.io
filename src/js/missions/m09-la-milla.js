/* ====================================================================================================
 * missions/m09-la-milla.js
 *
 * 9 · La Milla: la columna de rescate llega al Super 6-1, se saca a los pilotos, la columna recoge a los heridos y corre hacia el estadio
 * ================================================================================================== */

const M9_YAW = M8_YAW - Math.PI; // el ángulo que elegí para las escenas de esta misión: desde el sur, con el norte arriba
const M9_X = 370.5,
  M9_S = 321,
  M9_N = 201; // la calle del derribo, la calle al sur de ella y la calle al norte de la casa
const M9_ROUTE = [
  [MILE_X, 236],
  [MILE_X, M9_S],
  [M9_X, M9_S],
  [M9_X, M9_N],
  [MILE_X, M9_N],
  [MILE_X, 79],
  [395, 79],
  [395, 50]
];
const M9_SX = 153.5,
  M9_SH = 244.5; // donde se para el vehículo de cabeza: la X verde junto a los restos y la X naranja junto a la casa
const M9_KINDS = ['h', 'm', 'btr', 'btr', 'm', 'btr', 'btr', 'h']; // Humvees, camiones y los BTR blancos de la ONU
const M9_NOSE = [S61.x + Math.sin(0.5) * 2.3, S61.z + Math.cos(0.5) * 2.3]; // la cabina de los restos, donde están atrapados los pilotos
const M9_AMB = { x: 427, z: 169.5 }; // la X roja: la emboscada en el cruce al este de la avenida
const M9_PURPLE = { x0: 405, x1: 425, z0: 100, z1: 132 }; // la caja morada: la multitud antes del estadio
const M9_PAK = {
  name: 'Soldado paquistaní',
  role: 'ONU · Pakistán',
  unitName: 'ONU · Pakistán',
  look: 'pak',
  gun: 'm16',
  kit: 'none',
  acc: 0.4,
  burst: 3,
  cool: 1.3,
  supp: 12,
  ammo: 240,
  spd: 2.2,
  supRes: 0.6,
  reloadDur: 2.4
};
const m9Say = (u, t) => {
  if (u) {
    u.talkT = 2.6;
    radio(u, t, true);
  }
};
const m9Lead = () => {
  const C = G.m.C,
    v = C.veh[0];
  return [v.x, v.z];
};
// el sitio, el rumbo y el punto de detrás de un vehículo, sacados de la ruta
function m9Veh(i) {
  const C = G.m.C,
    [x, z, hd] = polyAt(C, C.s - i * C.gap),
    fx = Math.sin(hd),
    fz = Math.cos(hd);
  return { x, z, hd, fx, fz, rx: fz, rz: -fx, bx: x - fx * 3.1, bz: z - fz * 3.1 };
}
// alguien se baja por detrás de un vehículo
function m9Out(spec, i, side) {
  const V = m9Veh(i),
    u = npcUnit(spec, V.bx + V.rx * (side || 0) * 0.6, V.bz + V.rz * (side || 0) * 0.6, V.hd + Math.PI);
  u.god = true;
  u.noFire = true;
  return u;
}
// ... y se vuelve a subir: anda hasta la parte de atrás y desaparece
function m9Board(u, i) {
  u.board = i;
  const V = m9Veh(i);
  goTo(u, V.bx, V.bz);
  u.stance = 'stand';
}
function m9Gone(u) {
  world.remove(u.m.root);
  dropOverlay(u);
  us = us.filter(o => o !== u);
  units = units.filter(o => o !== u);
  G.sel.delete(u);
  u.alive = false;
  u.gone = true;
}
function m9Boarding() {
  for (const u of us.slice())
    if (u.board != null && u.alive) {
      const V = m9Veh(u.board);
      if (Math.hypot(u.x - V.bx, u.z - V.bz) < 1.8 || (!u.path.length && Math.hypot(u.x - V.bx, u.z - V.bz) < 4))
        m9Gone(u);
      else if (!u.path.length) goTo(u, V.bx, V.bz);
    }
}
// una camilla: varas, lona y un hombre encima (tapado en el caso de los pilotos muertos), llevada por dos de a a b
function m9Stretcher(a, b, covered, bearerLooks) {
  const grp = new T.Group();
  world.add(grp);
  const pole = new T.MeshLambertMaterial({ color: 0x5a4a32 }),
    cv = new T.MeshLambertMaterial({ color: 0x5d5d42 });
  for (const sx of [-0.3, 0.3]) {
    const m = new T.Mesh(UBOX, pole);
    m.scale.set(0.05, 0.05, 2.3);
    m.position.set(sx, 0.78, 0);
    m.castShadow = true;
    grp.add(m);
  }
  const c = new T.Mesh(UBOX, cv);
  c.scale.set(0.6, 0.03, 1.8);
  c.position.set(0, 0.78, 0);
  grp.add(c);
  let wd = null;
  if (covered) {
    const sh = new T.MeshLambertMaterial({ color: 0x6a6a52 });
    const b1 = new T.Mesh(UBOX, sh);
    b1.scale.set(0.5, 0.2, 1.65);
    b1.position.set(0, 0.9, 0);
    b1.castShadow = true;
    grp.add(b1);
    const b2 = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), sh);
    b2.scale.set(1, 0.7, 1.1);
    b2.position.set(0, 0.95, 0.72);
    grp.add(b2);
  } else {
    const r = buildRig('ranger', { gun: 'm16' });
    r.gun.visible = false;
    grp.add(r.root);
    r.root.position.set(0, 0.8, -0.3);
    wd = {
      m: r,
      alive: true,
      poseName: 'prone',
      stance: 'prone',
      moving: false,
      face: 0,
      vx: 0,
      vz: 0,
      sup: 0,
      talkT: 0,
      firing: 0
    };
  }
  const bear = (bearerLooks || ['ranger', 'ranger']).map(l => {
    const r = buildRig(l, { gun: l === 'delta' ? 'car' : 'm16' });
    r.gun.visible = false;
    return irDecor(r, a[0], a[1], 0, { poseName: 'carry', spd: 0.6 });
  });
  const S = { grp, wd, bear, a, b, f: 0, go: false, gone: false, spd: 0.65 };
  (G.m.str = G.m.str || []).push(S);
  m9StrStep(S, 0);
  return S;
}
function m9StrStep(S, dt) {
  if (S.gone) return;
  const L = Math.hypot(S.b[0] - S.a[0], S.b[1] - S.a[1]) || 1;
  if (S.go) S.f = Math.min(1, S.f + (S.spd * dt) / L);
  const mx = S.a[0] + (S.b[0] - S.a[0]) * S.f,
    mz = S.a[1] + (S.b[1] - S.a[1]) * S.f,
    hd = Math.atan2(S.b[0] - S.a[0], S.b[1] - S.a[1]),
    fx = Math.sin(hd),
    fz = Math.cos(hd);
  const moving = S.go && S.f < 1;
  S.bear.forEach((d, i) => {
    const s = i ? -1.05 : 1.05;
    d.x = mx + fx * s;
    d.z = mz + fz * s;
    d.face = hd;
    d.moving = moving;
    d.vx = moving ? fx * S.spd : 0;
    d.vz = moving ? fz * S.spd : 0;
    d.m.root.position.set(d.x, 0, d.z);
    d.m.root.rotation.y = hd;
    animRig(d, dt);
  });
  S.grp.position.set(mx, 0, mz);
  S.grp.rotation.y = hd;
  if (S.wd) animRig(S.wd, dt);
  if (S.f >= 1 && S.go) {
    S.loadT = (S.loadT || 0) + dt;
    if (S.loadT > 0.8) m9StrGone(S);
  }
}
function m9StrGone(S) {
  if (S.gone) return;
  S.gone = true;
  world.remove(S.grp);
  for (const d of S.bear) world.remove(d.m.root);
}
function m9Strs(dt) {
  for (const S of G.m.str || []) m9StrStep(S, dt);
}
// el soplete en la cabina: chispas y un parpadeo azul frío
function m9Cut(dt) {
  if (!G.m.cut) return;
  const [x, z] = M9_NOSE;
  G.m.cutT = (G.m.cutT || 0) - dt;
  if (G.m.cutT <= 0) {
    G.m.cutT = rr(0.05, 0.11);
    for (let k = 0; k < 4; k++)
      spawnP(
        x + rr(-0.15, 0.15),
        rr(0.7, 1.1),
        z + rr(-0.15, 0.15),
        rr(-2.2, 2.2),
        rr(0.5, 2.6),
        rr(-2.2, 2.2),
        rr(0.25, 0.6),
        rr(0.04, 0.08),
        0.02,
        pick([0xfff2c0, 0xffd070, 0xffffff]),
        0xff8a30,
        1,
        1,
        1
      );
    if (rnd() < 0.45) lightFlash(x, 1.2, z, rnd() < 0.5 ? 0xbcd6ff : 0xffe2b0, rr(2, 3.6), 6, 0.09);
  }
}
// los camilleros eligen su propio terreno: multitudes mirando desde los bordes de la ruta
function m9CrowdSpots() {
  const S = [],
    add = (x, z, fx, fz) => {
      if (S.some(o => Math.hypot(o.x - x, o.z - z) < 1.05)) return;
      const i = Math.floor(x),
        j = Math.floor(z);
      if (!inB(i, j) || grid[idx(i, j)] === 1) return;
      S.push({ x, z, face: Math.atan2(fx, fz), c: null });
    };
  // la calle del derribo hasta la casa, aquí y allá
  for (let z = 288; z > 214; z -= rr(4, 8)) add(rnd() < 0.5 ? M9_X - 2.3 : M9_X + 2.3, z, 0, 0);
  // la calle hacia el este hasta la avenida
  for (let x = 376; x < 410; x += rr(3.5, 7)) add(x, rnd() < 0.5 ? M9_N - 2.3 : M9_N + 2.3, 0, 0);
  // la avenida, menos gente cerca de la emboscada y a tope en la caja morada
  for (let z = 196; z > 134; z -= rr(3, 6)) {
    if (Math.abs(z - M9_AMB.z) < 12) continue;
    add(rnd() < 0.5 ? MILE_X - 2.7 : MILE_X + 2.7, z, 0, 0);
  }
  for (let z = M9_PURPLE.z1; z > M9_PURPLE.z0 + 2; z -= 1.15) {
    add(MILE_X - 2.7 + rr(-0.15, 0.15), z, 0, 0);
    add(MILE_X + 2.7 + rr(-0.15, 0.15), z + 0.5, 0, 0);
    if (rnd() < 0.5) add(MILE_X - 3.6, z + 0.3, 0, 0);
    if (rnd() < 0.5) add(MILE_X + 3.6, z - 0.3, 0, 0);
  }
  // cada uno mira a la calle junto a la que está
  for (const o of S) {
    const onAve = Math.abs(o.x - MILE_X) < 5 && o.z < 199,
      onN = Math.abs(o.z - M9_N) < 4 && o.x > 372;
    o.face = onAve ? (o.x < MILE_X ? PH : -PH) : onN ? (o.z < M9_N ? 0 : Math.PI) : o.x < M9_X ? PH : -PH;
  }
  return S;
}
function m9Crowd(dt) {
  if (!G.m.crowdOn) return;
  G.m.crT = (G.m.crT || 0) - dt;
  if (G.m.crT > 0) return;
  G.m.crT = 0.5;
  const cx = camS.tx,
    cz = camS.tz;
  let live = G.m.spots.filter(o => o.c).length;
  for (const o of G.m.spots) {
    const d = Math.hypot(o.x - cx, o.z - cz);
    if (!o.c && d < 40 && live < 70) {
      const c = makeCiv(Math.floor(o.x), Math.floor(o.z));
      c.x = o.x;
      c.z = o.z;
      c.watch = true;
      c.face0 = c.face = o.face;
      c.m.root.rotation.y = o.face;
      c.dangerT = rnd();
      c.follow = () => {
        if (!G.m.C) return null;
        for (const v of G.m.C.veh) {
          if (Math.hypot(v.x - c.x, v.z - c.z) < 16) return [v.x, v.z];
        }
        const s_ = us.find(u => u.alive && Math.hypot(u.x - c.x, u.z - c.z) < 9);
        return s_ ? [s_.x, s_.z] : null;
      };
      civs.push(c);
      o.c = c;
      live++;
    } else if (o.c && d > 52) {
      world.remove(o.c.m.root);
      o.c.gone = true;
      civs = civs.filter(q => q !== o.c);
      o.c = null;
      live--;
    }
  }
}
// los Little Birds siguen a la cabeza de la columna, bajos sobre el derribo y más altos cuando ya se mueve
function m9Birds(dt, alt) {
  if (!G.m.C) return;
  const [lx, lz] = m9Lead();
  ORBITS.forEach((o, k) => {
    const a = Math.min(1, dt * 0.25);
    o.x += (lx + (k ? 11 : -9) - o.x) * a;
    o.z += (lz + (k ? -12 : 9) - o.z) * a;
    o.alt += ((alt || 8.5) + k * 2.5 - o.alt) * Math.min(1, dt * 0.3);
  });
}
// los Rangers que van a pie: se mantienen en los flancos y detrás de la columna
function m9Follow(dt, behind) {
  G.m.flT = (G.m.flT || 0) - dt;
  if (G.m.flT > 0) return;
  G.m.flT = 1.2;
  const C = G.m.C,
    F = (G.m.fol || []).filter(u => u.alive && !u.gone && u.board == null);
  F.forEach((u, k) => {
    const s = behind ? C.s - (C.veh.length - 1) * C.gap - 5 - (k >> 1) * 1.6 : C.s - 6 - (k % 6) * C.gap * 0.95,
      side = k % 2 ? 1 : -1;
    const [x, z, hd] = polyAt(C, Math.max(0, s)),
      tx = x + Math.cos(hd) * side * (behind ? 0.9 : 2.3),
      tz = z - Math.sin(hd) * side * (behind ? 0.9 : 2.3);
    if (Math.hypot(u.x - tx, u.z - tz) > 2.2) {
      goTo(u, tx, tz);
      u.stance = 'stand';
    } else if (!u.path.length) u.stance = 'crouch';
  });
}
const m9Players = () => us.filter(u => u.alive && !u.npc);
// una bengala de iluminación para la escena: no sale de las bengalas del jugador
function m9Flare(x, z) {
  if (!SUP) return;
  const sp = new T.Sprite(FLARE_GLOW),
    core = new T.Sprite(FLARE_CORE);
  sp.scale.set(3.4, 3.4, 1);
  core.scale.set(0.55, 0.55, 1);
  world.add(sp);
  world.add(core);
  SUP.flares.push({
    x: x + rr(-1, 1),
    y: 24,
    z: z + rr(-1, 1),
    t: 0,
    sp,
    core,
    vx: rr(-0.15, 0.15),
    vz: rr(-0.15, 0.15),
    acc: 0,
    lit: 0,
    fall: 0.42
  });
  lightFlash(x, 24, z, 0xffffff, 6, 60, 0.4);
  sfx('boom', x, z);
}
// faros: una luz delante de cada vehículo de la columna, para el pool de luces
function m9Lights() {
  const C = G.m.C;
  if (!C) return;
  if (!G.m.hl) {
    G.m.hl = C.veh.map(() => {
      const s_ = { x: 0, y: 1.1, z: 0, col: 0xffeccc, i: 1.2, d: 8 };
      LIGHTSRC.push(s_);
      return s_;
    });
  }
  C.veh.forEach((v, i) => {
    const h = G.m.hl[i],
      ry = v.g.rotation.y;
    h.x = v.x + Math.sin(ry) * 3.4;
    h.z = v.z + Math.cos(ry) * 3.4;
    h.off = nightF < 0.2 || v.gone;
  });
}
// milicia que hace parar a la columna: cerca del vehículo de cabeza
// (solo los que la columna puede ver o tienen línea sobre ella; y tras medio minuto parada, la columna se abre paso a la fuerza)
function m9Block(r) {
  const [lx, lz] = m9Lead(),
    on = them.some(
      e =>
        e.alive &&
        !e.dummy &&
        Math.hypot(e.x - lx, e.z - lz) < r &&
        (e.spotted || e.tech || (!e.roof && los(e.x, e.z, lx, lz)))
    );
  if (!on) {
    G.m.blkT = 0;
    return false;
  }
  G.m.blkT = (G.m.blkT || 0) + 0.4;
  if (G.m.blkT > 30) {
    if (G.m.blkT < 30.5)
      say(
        'Tte. Cor. McKnight',
        '¡No podemos quedarnos aquí parados! ¡Columna, adelante! ¡Fuego a discreción!',
        'convoy',
        true
      );
    if (G.m.blkT > 42) G.m.blkT = 0;
    return false;
  }
  return true;
}
// el telón: fundido a negro, texto y vuelta; lo lleva el reloj de la escena para que saltar funcione
function m9Curtain(t, t0) {
  let el = $('curtain');
  if (!el) {
    el = document.createElement('div');
    el.id = 'curtain';
    el.innerHTML = '<span></span>';
    document.body.appendChild(el);
  }
  const a = t < t0 ? 0 : t < t0 + 1.5 ? (t - t0) / 1.5 : t < t0 + 6.5 ? 1 : t < t0 + 8 ? 1 - (t - t0 - 6.5) / 1.5 : 0;
  const w =
    t < t0 + 2 ? 0 : t < t0 + 2.7 ? (t - t0 - 2) / 0.7 : t < t0 + 5.4 ? 1 : t < t0 + 6.1 ? 1 - (t - t0 - 5.4) / 0.7 : 0;
  el.hidden = a <= 0;
  el.style.opacity = a.toFixed(3);
  el.firstChild.textContent = L('Unas horas más tarde');
  el.firstChild.style.opacity = w.toFixed(3);
}
function m9CurtainOff() {
  const el = $('curtain');
  if (el) {
    el.hidden = true;
    el.style.opacity = 0;
  }
}

/* La apertura: la columna baja por la ruta verde, los paquistaníes se despliegan, se corta la cabina, pasan las horas, salen los pilotos y no hay sitio para los Rangers */
function m9Intro() {
  const C = G.m.C,
    D = G.m.k11,
    R22 = G.m.r22,
    R31 = G.m.r31,
    st = G.m.steele,
    sand = G.m.sand;
  for (const u of us) if (u.m8in) u.noFire = true;
  C.go = true;
  C.limit = M9_SX;
  C.vmax = 2.6;
  G.alert = true;
  ORBITS.forEach((o, k) => {
    o.a = 0.4 + k * Math.PI;
  });
  G.m.cf = 'lead';
  const T0 = 79; // el telón
  cineStart({
    zoom: 10.5,
    spin: 0,
    yaw0: M9_YAW,
    focus: () =>
      G.m.cf === 'lead'
        ? m9Lead()
        : G.m.cf === 'lb'
          ? (() => {
              const p = ORBITS[0].h.g.position;
              return [p.x, p.z, p.y];
            })()
          : typeof G.m.cf === 'function'
            ? G.m.cf()
            : G.m.cf,
    keys: [
      { t: 1.5, fn: () => m9Say(R22[0], '¡Ahí llega el convoy! ¡Ya era hora!') },
      {
        t: 5.5,
        fn: () =>
          say(
            'Tte. Cor. McKnight',
            'Romeo 2-2, aquí la columna. Entramos en la zona de impacto por el sur. No nos disparéis.',
            'convoy',
            true
          )
      },
      { t: 11, fn: () => m9Say(st, 'Os vemos. Cuidado con las azoteas: todavía quedan tiradores.') },
      {
        t: 22,
        fn: () => {
          if (C.s < M9_SX - 0.5) {
            C.s = M9_SX;
            C.v = 0;
          }
          G.m.cf = [M9_X + 1.5, 312];
          CINE.zoom = 7;
          // las tropas paquistaníes bajan de los BTR y cubren los dos lados de la columna
          G.m.pak = [];
          [2, 3, 5, 6].forEach((vi, n) => {
            for (let k = 0; k < 3; k++) {
              const u = m9Out(Object.assign({}, M9_PAK, { skin: pick([0x9a6a48, 0x8a5a3c, 0xa87a54]) }), vi, k - 1);
              const V = m9Veh(vi),
                side = (k + n) % 2 ? 1 : -1,
                along = (k - 1) * 2.2;
              u.noFire = false;
              u.pakSide = side;
              sched.push({
                at: G.t + 0.3 + k * 0.5,
                fn: () => {
                  goTo(u, V.x + V.rx * side * 2.6 + V.fx * along, V.z + V.rz * side * 2.6 + V.fz * along);
                }
              });
              G.m.pak.push(u);
            }
          });
        }
      },
      {
        t: 23.5,
        fn: () => say('Sgto. · 10ª de Montaña', '¡Paquistaníes, a los flancos! ¡Cubrid las calles!', 'convoy', true)
      },
      {
        t: 27,
        fn: () => {
          G.m.cf = 'lb';
          CINE.zoom = 12.5;
        }
      },
      {
        t: 32,
        fn: () => {
          G.m.cf = [M9_NOSE[0] - 1, M9_NOSE[1] + 1];
          CINE.zoom = 7.5;
          // tres Delta y los PJ del Humvee de cabeza van a la cabina
          G.m.pj = ['Sgto. Tim Wilkinson', 'Sgto. Scott Fales', 'Sgto. Jeff Bray'].map((n, k) => {
            const u = m9Out(
              Object.assign({}, DELTA[(k + 3) % DELTA.length], DSPEC, {
                name: n,
                role: 'PJ',
                pj: true,
                unitName: 'Columna ONU',
                kit: k ? 'pack' : 'medic'
              }),
              0,
              k - 1
            );
            const a = 0.5 + [-0.9, 0, 0.9][k] + Math.PI * 0.5;
            goTo(u, M9_NOSE[0] + Math.sin(a) * 1.6, M9_NOSE[1] + Math.cos(a) * 1.6);
            return u;
          });
        }
      },
      {
        t: 38,
        fn: () => {
          m9Say(G.m.pj[0], 'Los pilotos están atrapados en la cabina. El fuselaje se ha aplastado contra ellos.');
          for (const u of G.m.pj) {
            u.face = Math.atan2(M9_NOSE[0] - u.x, M9_NOSE[1] - u.z);
            u.stance = 'crouch';
          }
        }
      },
      { t: 43, fn: () => m9Say(G.m.pj[1], 'Nos va a llevar un buen rato sacarlos. Traed la sierra.') },
      {
        t: 45,
        fn: () => {
          G.m.cut = true;
        }
      },
      {
        t: 47.5,
        fn: () => {
          G.m.cf = () => {
            const m = G.m.mck,
              s_ = sand;
            return m ? [(m.x + s_.x) / 2, (m.z + s_.z) / 2] : [S61.x, S61.z];
          };
          CINE.zoom = 7.5;
          // bajan McKnight, el C2 y unos cuantos Rangers; Sanderson se acerca andando
          G.m.mck = m9Out(
            Object.assign({}, RANGERS[0], RSPEC, {
              name: 'Tte. Cor. McKnight',
              role: 'Jefe de la columna',
              unitName: 'Columna ONU',
              kit: 'radio',
              spd: 1.15
            }),
            2,
            -1
          );
          G.m.c2 = m9Out(
            Object.assign({}, DELTA[0], DSPEC, {
              name: 'Tte. Cor. Harrell',
              role: 'C2',
              unitName: 'Uniform 6-4',
              kit: 'radio',
              spd: 1.15
            }),
            2,
            1
          );
          G.m.crg = ['Sgto. Jeff Struecker', 'Esp. Kurth', 'Esp. Galentine'].map((n, k) =>
            m9Out(
              Object.assign({}, RANGERS[k + 1], RSPEC, { name: n, role: 'Fusilero', unitName: 'Columna ONU' }),
              3,
              k - 1
            )
          );
          const mx = (S61.x - 1.5 + M9_X) / 2 + 1,
            mz = 311.5;
          goTo(G.m.mck, mx - 0.7, mz + 0.4);
          goTo(G.m.c2, mx - 0.5, mz - 0.6);
          sand.spd = 1.1;
          goTo(sand, mx + 0.9, mz - 0.2);
          G.m.crg.forEach((u, k) => goTo(u, M9_X + 1.2 + k * 0.8, 316 + (k % 2) * 1.2));
        }
      },
      {
        t: 56,
        fn: () => {
          G.m.mck.face = Math.atan2(sand.x - G.m.mck.x, sand.z - G.m.mck.z);
          m9Say(G.m.mck, '¿Quiere que lo lleve?');
        }
      },
      {
        t: 59.5,
        fn: () => {
          sand.face = Math.atan2(G.m.c2.x - sand.x, G.m.c2.z - sand.z);
          m9Say(sand, 'Me alegro de verte.');
        }
      },
      { t: 63, fn: () => say('JOC', '¿Cómo vais, Danny?', 'hq', true) },
      {
        t: 66.5,
        fn: () => m9Say(G.m.mck, 'Tenemos que desmontar la cabina del helicóptero para poder sacar a los pilotos.')
      },
      { t: 72.5, fn: () => say('JOC', 'Danny, no nos iremos sin ellos. No abandonaremos a nadie.', 'hq', true) },
      // el salto en el tiempo, detrás del telón
      {
        t: T0 + 3,
        fn: () => {
          G.sunShift += 4.5;
          G.startClock += Math.round(4.5 * 3600);
          G.m.cut = false;
          for (const e of them) if (e.alive && (e.tag === 'roof' || e.tag === 'roofs')) damage(e, 9999, null);
          for (const u of G.m.pj) m9Gone(u);
          const T_ = m9Veh(1);
          G.m.pil = [0, 1].map(k =>
            m9Stretcher(
              [M9_NOSE[0] - 1.2 - k * 1.6, M9_NOSE[1] + 0.4 + k * 0.9],
              [T_.bx + T_.rx * (k ? 0.8 : -0.8), T_.bz + T_.rz * (k ? 0.8 : -0.8)],
              true,
              k ? ['delta', 'ranger'] : ['delta', 'delta']
            )
          );
          for (const u of G.m.pak)
            if (u.alive) {
              u.stance = 'crouch';
            }
          G.m.cf = [M9_NOSE[0] - 2, M9_NOSE[1] + 2];
          CINE.zoom = 8.5;
        }
      },
      { t: T0 + 9, fn: () => say('Sgto. Tim Wilkinson', '¡Ya está! ¡Los tenemos!', 'delta', true) },
      {
        t: T0 + 10.5,
        fn: () => {
          G.m.pil[0].go = true;
          sched.push({
            at: G.t + 2.2,
            fn: () => {
              G.m.pil[1].go = true;
            }
          });
        }
      },
      {
        t: T0 + 19,
        fn: () => {
          G.m.cf = [M9_X + 0.5, 312];
          CINE.zoom = 11;
          say('Tte. Cor. McKnight', '¡Todo el mundo a los vehículos! ¡Nos vamos!', 'convoy', true);
          R31.forEach((u, k) => {
            goTo(u, M9_X + (k % 2 ? 1.6 : -1.6), 318 - k * 0.8);
          });
          G.m.crg.forEach(u => m9Board(u, 3));
        }
      },
      { t: T0 + 23, fn: () => m9Say(R31[0], '¡No hay sitio!') },
      { t: T0 + 25.5, fn: () => m9Say(R22[0], '¿Cómo que no hay sitio?') },
      {
        t: T0 + 28.5,
        fn: () => {
          G.m.c2.face = Math.atan2(st.x - G.m.c2.x, st.z - G.m.c2.z);
          m9Say(G.m.c2, 'La 10ª de Montaña les escoltará.');
        }
      },
      {
        t: T0 + 32,
        fn: () => {
          st.face = Math.atan2(G.m.c2.x - st.x, G.m.c2.z - st.z);
          m9Say(st, 'Con el debido respeto, señor, mis Rangers cubrirán los vehículos.');
        }
      },
      {
        t: T0 + 37.5,
        fn: () => say('Romeo 4-1', 'Capitán Steele, aquí Romeo 4-1. ¿Cuánto tardará el convoy?', 'us', true)
      },
      {
        t: T0 + 42,
        fn: () => m9Say(st, 'Estamos organizándonos en la zona de impacto. Preparaos, en cinco minutos estamos allí.')
      },
      {
        t: T0 + 47,
        fn: () => {
          CINE.zoom = 13;
          m9Board(G.m.mck, 0);
          m9Board(G.m.c2, 2);
          for (const u of G.m.pak)
            if (u.alive) {
              const V = [2, 3, 5, 6],
                best = V.reduce(
                  (b, vi) => {
                    const q = m9Veh(vi);
                    const d = Math.hypot(q.bx - u.x, q.bz - u.z);
                    return d < b[1] ? [vi, d] : b;
                  },
                  [2, 1e9]
                )[0];
              m9Board(u, best);
            }
        }
      }
    ],
    dur: T0 + 51,
    tick: dt => {
      m9Curtain(CINE.t, T0);
      m9Cut(dt);
      m9Lights();
      m9Strs(dt);
      m9Boarding();
      m9Birds(dt, 14);
      if (CINE.t < 52) {
        m8Xfire(dt, 0.7);
      }
      // lo que no han rematado las armas de la columna lo hacen los de la plaza
      if (CINE.t > 50 && !G.m.roofsDone) {
        G.m.roofsDone = true;
        for (const e of them)
          if (e.alive && e.tag === 'roof') {
            const s_ = pick(us.filter(u => u.alive && u.m8in));
            if (s_) m8Shot(s_, e);
            damage(e, 9999, null);
          }
      }
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 30);
    },
    onEnd: () => {
      m9CurtainOff();
      m9IntroEnd();
    }
  });
}
// lo que la escena no llegó a hacer (si se salta), hecho de golpe; luego empieza la escolta
function m9IntroEnd() {
  const C = G.m.C;
  if (!G.m.pil) {
    G.sunShift += 4.5;
    G.startClock += Math.round(4.5 * 3600);
  }
  G.m.cut = false;
  for (const S of G.m.str || []) m9StrGone(S);
  for (const u of us.slice()) if (u.board != null || u.pj || u.look === 'pak') m9Gone(u);
  for (const k of ['mck', 'c2']) if (G.m[k] && !G.m[k].gone) m9Gone(G.m[k]);
  for (const u of G.m.crg || []) if (!u.gone) m9Gone(u);
  for (const e of them) if (e.alive && e.tag === 'roof') damage(e, 9999, null);
  for (const u of us)
    if (u.alive) {
      u.noFire = false;
      u.m8in = false;
    }
  C.s = Math.max(C.s, M9_SX);
  C.go = true;
  C.limit = C.s;
  C.vmax = 2.0;
  G.m.phase = 'A';
  G.m.crowdOn = true;
  G.m.fol = G.m.r31.concat([G.m.steele, G.m.sand]).concat(G.m.r11 || []);
  camS.tx = M9_X + 4;
  camS.tz = 300;
  camS.zoomT = 13;
  camS.yawT = M9_YAW;
  G.sel = new Set(m9Players());
  buildCards();
  refreshCards();
  renderSubs();
  hint(
    'La columna solo avanza si Kilo 1-1 o el Romeo 2-2 van con ella y no hay milicianos delante. Escóltala por la ruta naranja hasta el edificio de los heridos.'
  );
}
// la escolta: la columna avanza despacio por la calle hasta la casa; se para si hay milicia delante y espera a su escolta
function m9EscortTick() {
  const C = G.m.C,
    dt = G.dt || 1 / 30;
  if (G.m.phase !== 'A') return;
  m9Follow(dt, false);
  m9Crowd(dt);
  m9Birds(dt, 16);
  m9Lights();
  G.m.esT = (G.m.esT || 0) - dt;
  if (G.m.esT > 0) return;
  G.m.esT = 0.4;
  const [lx, lz] = m9Lead(),
    esc = m9Players().some(u => Math.hypot(u.x - lx, u.z - lz) < 18),
    blk = m9Block(13);
  C.limit = esc && !blk ? M9_SH : C.s;
  if (blk && G.t > (G.m.blkSay || 0)) {
    G.m.blkSay = G.t + 14;
    say(
      'Tte. Cor. McKnight',
      pick([
        '¡Contacto delante! ¡Limpiad la calle, no podemos avanzar!',
        '¡Tiradores en la calle! ¡La columna se para!',
        '¡Nos disparan desde delante! ¡Quitadlos de ahí!'
      ]),
      'convoy',
      true
    );
    autoPause('la columna está parada');
  } else if (!esc && !blk && G.t > (G.m.escSay || 0)) {
    G.m.escSay = G.t + 16;
    say('Tte. Cor. McKnight', 'Escolta, ¿dónde estáis? Sin cobertura no seguimos.', 'convoy', true);
  }
}
/* En la casa: salen los heridos, los graves al camión y el resto irá andando */
function m9HouseCine() {
  const C = G.m.C,
    R41 = G.m.r41,
    ev = R41[0],
    st = G.m.steele;
  C.limit = C.s;
  G.m.phase = 'H';
  cineStart({
    zoom: 6,
    spin: 0,
    yaw0: M9_YAW,
    focus: () => (typeof G.m.cf === 'function' ? G.m.cf() : G.m.cf),
    keys: [
      {
        t: 0.2,
        fn: () => {
          leaveB(ev);
          goTo(ev, M9_X + 1.6, 211);
          // la cámara en los heridos mientras salen y los llevan al camión, y luego en los que irán andando
          G.m.cf = () => {
            const S = (G.m.wst || []).find(q => !q.gone);
            if (S && CINE.t < 16) return [S.grp.position.x, S.grp.position.z];
            return [(ev.x + st.x) / 2, (ev.z + st.z) / 2];
          };
        }
      },
      { t: 1.5, fn: () => m9Say(ev, '¡Ya están aquí! ¡Sacad a los heridos!') },
      {
        t: 3,
        fn: () => {
          const T_ = m9Veh(1);
          G.m.wst = [0, 1].map(k =>
            m9Stretcher(
              [M9_X + 2.3, 209.5 + k * 0.4],
              [T_.bx + T_.rx * (k ? 0.8 : -0.8), T_.bz + T_.rz * (k ? 0.8 : -0.8)],
              false,
              ['ranger', 'ranger']
            )
          );
          G.m.wst[0].go = true;
          sched.push({
            at: G.t + 2.5,
            fn: () => {
              G.m.wst[1].go = true;
            }
          });
        }
      },
      { t: 4.5, fn: () => say('Sgto. · 10ª de Montaña', '¡Los heridos graves, al camión! ¡Rápido!', 'convoy', true) },
      {
        t: 9,
        fn: () => {
          R41.slice(1).forEach((u, k) => {
            leaveB(u);
            goTo(u, M9_X + 1.4 - (k % 2) * 2.8, 207.5 - (k >> 1) * 1.2);
          });
          goTo(st, M9_X - 1.2, 209.5);
        }
      },
      {
        t: 10.5,
        fn: () =>
          say('Sgto. · 10ª de Montaña', '¡Los que podáis andar, subid al techo de los blindados!', 'convoy', true)
      },
      { t: 14.5, fn: () => m9Say(st, '¿En el techo?') },
      { t: 17, fn: () => m9Say(R41[3] || R41[1], 'Nos acribillarán a tiros ahí arriba.') },
      { t: 20.5, fn: () => m9Say(st, 'Iremos andando detrás de los vehículos.') },
      {
        t: 24,
        fn: () => {
          say('Tte. Cor. McKnight', 'Columna, en marcha. Al estadio.', 'convoy', true);
          C.vmax = 3.0;
          C.limit = C.L;
          G.m.cf = () => m9Lead();
          CINE.zoom = 11;
        }
      }
    ],
    dur: 28,
    tick: dt => {
      m9Strs(dt);
      m9Crowd(dt);
      m9Lights();
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 30);
    },
    onEnd: () => {
      for (const S of G.m.str || []) m9StrGone(S);
      for (const u of R41) if (u.inB) leaveB(u);
      G.m.phase = 'B';
      C.vmax = 3.0;
      C.limit = C.L;
      G.m.fol = (G.m.fol || []).concat(R41);
      G.nextWave = G.t + 18;
      G.m.mileT0 = G.t;
      camS.tx = M9_X + 6;
      camS.tz = 206;
      camS.zoomT = 13;
      G.sel = new Set(m9Players());
      refreshCards();
      renderSubs();
      hint(
        'La columna ya no espera: corre detrás de los vehículos por la ruta amarilla hasta el estadio. En el cruce de la X roja hay una emboscada.'
      );
    }
  });
}
// la Milla: los vehículos van un poco más rápido que los hombres a pie; solo los para la milicia que tengan delante
function m9MileTick() {
  const C = G.m.C,
    dt = G.dt || 1 / 30;
  if (G.m.phase !== 'B') return;
  m9Follow(dt, true);
  m9Crowd(dt);
  m9Birds(dt, 19);
  m9Lights();
  G.m.esT = (G.m.esT || 0) - dt;
  if (G.m.esT <= 0) {
    G.m.esT = 0.4;
    // en cuanto el vehículo de cabeza pisa el asfalto de la avenida, la columna ya no se para por nada y tira para el estadio: los hombres entran solos
    if (!G.m.run && C.s >= (G.m.asphS || (G.m.asphS = routeS(C, MILE_X, 199)))) {
      G.m.run = true;
      C.vmax = 4.4;
      C.limit = C.L;
      say('Tte. Cor. McKnight', '¡Columna, no paramos! ¡Directos al estadio, a toda máquina!', 'convoy', true);
    }
    const blk = G.m.run ? false : m9Block(15);
    C.limit = blk ? C.s : C.L;
    const [lx, lz] = m9Lead();
    if (!G.m.ambSaid && Math.hypot(lx - M9_AMB.x, lz - M9_AMB.z) < 34) {
      G.m.ambSaid = true;
      say(
        'Star 4-1',
        '¡Emboscada en el cruce de delante! ¡Una técnica y un montón de armados a la derecha de la avenida!',
        'air',
        true
      );
      autoPause('emboscada');
    }
    if (blk && G.t > (G.m.blkSay || 0)) {
      G.m.blkSay = G.t + 14;
      say(
        'Tte. Cor. McKnight',
        pick(['¡Nos cortan el paso! ¡Limpiad el cruce!', '¡La columna está parada! ¡Fuego delante!']),
        'convoy',
        true
      );
    }
    // no se deja a nadie atrás: los Rangers a pie tienen que seguir el ritmo de los vehículos
    const c = m9Players(),
      rear = polyAt(C, C.s - (C.veh.length - 1) * C.gap);
    if (c.length && !G.m.run) {
      const near = Math.min(...c.map(u => Math.hypot(u.x - rear[0], u.z - rear[1])));
      if (near > 32) {
        G.m.farT = (G.m.farT || 0) + 0.4;
        if (G.m.farT > 8 && !G.m.behind) {
          G.m.behind = true;
          say('Cap. Steele', '¡Los vehículos se nos van! ¡Corred!', 'us', true);
        }
      } else G.m.farT = 0;
    }
    // la caja morada: la multitud antes del estadio
    if (!G.m.finS && c.some(u => u.x > M9_PURPLE.x0 && u.x < M9_PURPLE.x1 && u.z > M9_PURPLE.z0 && u.z < M9_PURPLE.z1))
      m9FinalCine();
  }
  // de vez en cuando salen dos o tres armados de una bocacalle por delante de la columna
  if (G.t >= G.nextWave && C.s < 400) {
    G.nextWave = G.t + rr(20, 30);
    const s = C.s + rr(26, 40),
      [x, z, hd] = polyAt(C, Math.min(C.L, s)),
      side = rnd() < 0.5 ? 1 : -1,
      n = 2 + ri(2);
    const bx = x + Math.cos(hd) * side * rr(10, 16),
      bz = z - Math.sin(hd) * side * rr(10, 16);
    for (let k = 0; k < n; k++) {
      const e = foe(bx + rr(-1.5, 1.5), bz + rr(-1.5, 1.5), 'wave', 'mw', CAMP_ESPEC);
      e.goal = { x: x + rr(-2, 2), z: z + rr(-2, 2) };
    }
  }
}
/* La caja morada: la multitud llena la avenida, los hombres están reventados, algunos caen y los levantan, y entran andando en el estadio */
function m9FinalCine() {
  G.m.finS = true;
  const C = G.m.C;
  for (const e of them) e.noFire = true;
  C.limit = C.L;
  C.vmax = Math.max(C.vmax, 2.6);
  const all = us.filter(u => u.alive && !u.gone),
    R31 = G.m.r31.filter(u => u.alive),
    R41 = G.m.r41.filter(u => u.alive),
    P_ = m9Players();
  // los que van andando detrás de los vehículos se pegan a las escuadras, para que toda la fuerza cruce junta entre la multitud
  const pz = P_.length ? P_.reduce((a, u) => a + u.z, 0) / P_.length : 130;
  all
    .filter(u => u.npc)
    .forEach((u, k) => {
      if (Math.abs(u.z - pz) > 10 || Math.abs(u.x - MILE_X) > 5) {
        const c = findWalk(MILE_X + ((k % 3) - 1) * 1.3, pz + 3 + ((k / 3) | 0) * 1.3);
        u.x = c[0] + 0.5;
        u.z = c[1] + 0.5;
        u.path = [];
      }
    });
  // todos entran despacio en el estadio: la carrera se acabó; las escuadras siguen hasta las tiendas
  all.forEach((u, k) => {
    u.spd = 1.35 + rnd() * 0.25;
    u.noFire = true;
    u.stance = 'stand';
    u.order = { type: 'move' };
  });
  // cada uno sube la calle por su línea: unos pegados a las paredes, otros por el medio, desperdigados
  const via = (u, k, x, z) => {
    const lat = ((k * 37) % 11) / 10 - 0.5,
      my = MILE_X + lat * 5.4,
      mz = Math.min(u.z - 4, 96 + (k % 4) * 1.5),
      a = nearestFree(Math.floor(my), Math.floor(mz)),
      b = nearestFree(Math.floor(x), Math.floor(z));
    const p1 = findPath(Math.floor(u.x), Math.floor(u.z), a[0], a[1]),
      p2 = findPath(a[0], a[1], b[0], b[1]);
    u.path = p1 && p2 ? smoothPath(p1, u.x, u.z).concat(smoothPath(p2, a[0] + 0.5, a[1] + 0.5)) : [];
    if (!u.path.length) goTo(u, x, z);
    u.order = { type: 'move' };
  };
  all.forEach((u, k) => {
    u.spd = 1.05 + (((k * 53) % 10) / 10) * 0.55;
  });
  P_.forEach((u, k) => via(u, k, 404.5 + (k % 5) * 2.2, 71.2 + ((k / 5) | 0) * 1.6));
  all.filter(u => u.npc).forEach((u, k) => via(u, k + 3, 399 + (k % 7) * 1.5, 75 + ((k / 7) | 0) * 1.5));
  m9Hospital();
  const fall = R31[1] || R31[0],
    help = R31[0],
    lean = R41.slice(1, 3);
  // la cámara se queda cerca de las escuadras del jugador todo el camino
  const plC = () => {
    const L_ = m9Players();
    return L_.length
      ? [L_.reduce((a, u) => a + u.x, 0) / L_.length, L_.reduce((a, u) => a + u.z, 0) / L_.length]
      : [MILE_X, 90];
  };
  cineStart({
    zoom: 5,
    spin: 0,
    yaw0: M9_YAW,
    focus: () => {
      if (G.m.tw == null) return plC();
      const g = G.m.guide,
        k = sstep(0, 1, (CINE.t - G.m.tw - 7) / 7);
      const p = g ? [g.x, g.z] : [422.5, 74.6];
      return [p[0] + (422.5 - p[0]) * k, p[1] + (74.6 - p[1]) * k];
    },
    keys: [
      {
        t: 4,
        fn: () => {
          if (fall && fall !== help) {
            fall.path = [];
            fall.poseName = 'collapse';
            fall.spd = 0;
          }
        }
      },
      {
        t: 5.2,
        fn: () => {
          if (fall && fall !== help) fall.poseName = 'sit';
        }
      },
      {
        t: 6,
        fn: () => {
          if (help && fall && fall !== help) {
            m9Say(help, '¡Arriba! ¡Ya casi estamos, no te quedes aquí!');
            goTo(help, fall.x + 0.7, fall.z);
          }
        }
      },
      {
        t: 9.5,
        fn: () => {
          if (help && fall && fall !== help) {
            fall.poseName = 'carry';
            fall.spd = 1.05;
            help.spd = 1.05;
            goTo(fall, 410.5, 76.5);
            goTo(help, 411.3, 76.5);
          }
        }
      },
      {
        t: 10.5,
        fn: () => {
          if (lean.length === 2) {
            lean[1].poseName = 'carry';
            lean.forEach((u, k) => {
              u.spd = 1.15;
              goTo(u, 413.6 + k * 0.7, 75.6);
            });
          }
        }
      },
      { t: 16, fn: () => m9Say(G.m.steele, 'Seguid andando. Ya estamos.') },
      {
        t: 26,
        fn: () => say('Cap. Steele', 'Uniform 6-4, aquí Romeo 1-1. Estamos en el estadio. Todos dentro.', 'us', true)
      },
      { t: 31, fn: () => say('Uniform 6-4', 'Recibido, Romeo 1-1. Bienvenidos.', 'hq', true) }
    ],
    dur: 60,
    tick: dt => {
      m9Crowd(dt);
      m9Birds(dt, 19);
      m9Lights();
      m9HospStep(dt);
      m9Trips(fall, help);
      for (const u of us)
        if (u.alive) {
          u.sup = 0;
          if (u.poseName === 'carry' && !u.path.length && !u.trip) u.poseName = null;
        }
      // cuando las escuadras ya están entre las tiendas, la cámara las deja por los heridos y los muertos; luego el fundido
      if (!G.m.inside && CINE.t > 33) {
        const P2 = m9Players();
        if (P2.filter(u => u.z < 76.5).length >= P2.length / 2 || CINE.t > 50) {
          G.m.inside = true;
          m9Ending();
        }
      }
      if (G.m.tw != null) m9FinCurtain(CINE.t - G.m.tw);
    },
    onEnd: () => {
      if (G.m.tw != null)
        m9Epilogue(() => {
          G.m.fin = true;
        });
      else G.m.fin = true;
    }
  });
}
function m9Hospital() {
  const H = (G.m.hosp = { wd: [], med: [] });
  const pole = new T.MeshLambertMaterial({ color: 0x5a4a32 }),
    cv = new T.MeshLambertMaterial({ color: 0x5d5d42 }),
    bl = new T.MeshLambertMaterial({ color: 0x4a0c08 });
  const poses = ['downed', 'downed', 'prone', 'downed', 'sit', 'downed', 'prone', 'downed', 'downed', 'downed'],
    looks = ['ranger', 'ranger', 'delta', 'ranger', 'ranger', 'delta', 'ranger', 'ranger', 'ranger', 'ranger'];
  let k = 0;
  for (const z of [72.7, 76.1])
    for (let c = 0; c < 5; c++, k++) {
      const x = 417 + c * 2.2 + (z > 74 ? 0.5 : 0),
        grp = new T.Group();
      grp.position.set(x, 0, z);
      grp.rotation.y = z > 74 ? Math.PI : 0;
      world.add(grp);
      for (const sx of [-0.3, 0.3]) {
        const m = new T.Mesh(UBOX, pole);
        m.scale.set(0.05, 0.05, 2.3);
        m.position.set(sx, 0.16, 0);
        m.castShadow = true;
        grp.add(m);
        for (const sz of [-0.85, 0.85]) {
          const l = new T.Mesh(UBOX, pole);
          l.scale.set(0.04, 0.14, 0.04);
          l.position.set(sx, 0.07, sz);
          grp.add(l);
        }
      }
      const cn = new T.Mesh(UBOX, cv);
      cn.scale.set(0.6, 0.03, 1.8);
      cn.position.set(0, 0.16, 0);
      cn.receiveShadow = true;
      grp.add(cn);
      const st = new T.Mesh(UBOX, bl);
      st.scale.set(0.42, 0.005, 0.5 + (k % 3) * 0.15);
      st.position.set(((k % 2) - 0.5) * 0.1, 0.178, 0.1 + (k % 3) * 0.12);
      grp.add(st); // la lona empapada
      const p = poses[k],
        r = buildRig(looks[k], { gun: 'm16' });
      r.gun.visible = false;
      grp.add(r.root);
      r.root.position.set(0, p === 'sit' ? 0.02 : 0.19, p === 'sit' ? 0.1 : -0.3);
      const w = {
        m: r,
        alive: true,
        poseName: p,
        stance: p === 'sit' ? 'crouch' : 'prone',
        moving: false,
        face: 0,
        vx: 0,
        vz: 0,
        sup: 0,
        talkT: 0,
        firing: 0,
        ph: k * 1.7,
        grp
      };
      H.wd.push(w);
      for (let q = 0; q < 1 + (k % 2); q++) bloodDecal(x + rr(-0.5, 0.5), z + rr(-0.9, 0.9), rr(0.3, 0.55), 0.1);
      // un sanitario en una de cada dos camillas, de rodillas a su lado y trabajando
      if (k % 2 === 0 || k === 5) {
        const side = k % 4 < 2 ? 1 : -1,
          rig = buildRig(k === 4 ? 'base' : 'ranger', { gun: 'm16' });
        const d = irDecor(rig, x + side * 0.78, z + (z > 74 ? 0.2 : -0.2), -side * PH, {
          poseName: 'treat',
          stance: 'crouch',
          look: -side * PH,
          ph: k * 0.9
        });
        rig.gun.visible = false;
        H.med.push(d);
      }
    }
  // los muertos bajo los focos, catorce: en la esquina noreste del campo, bajo la torre de luz y lejos de todo lo que se mueve
  // (ni los vehículos que aparcan ni los hombres que entran pasan por ahí)
  for (let q = 0; q < 14; q++)
    prop(
      'deco9',
      'bbag',
      424.5 + (q % 7) * 0.95,
      0,
      q < 7 ? 43.5 : 45.8,
      (phs(q, 3, 81) - 0.5) * 0.08,
      1,
      q % 3 ? 0xe8e8e0 : 0xd4d4ca
    );
  // un hombre de pie junto a ellos y otros dos andando entre las camillas
  H.walk = [0, 1].map(q => {
    const rig = buildRig('base', { gun: 'm16' });
    rig.gun.visible = false;
    return irDecor(rig, 416 + q * 9, 74.4, PH, { spd: 0.9, look: PH, wp: q });
  });
}
function m9HospStep(dt) {
  const H = G.m.hosp;
  if (!H) return;
  const t = G.t;
  for (const w of H.wd) {
    animRig(w, dt);
    const m = w.m,
      a = Math.sin(t * 1.3 + w.ph),
      b = Math.sin(t * 0.7 + w.ph * 2);
    // se mueven: una mano a la herida, una rodilla que sube, la cabeza que rueda
    m.shR.rotation.x += a * 0.22;
    m.elR.rotation.x -= 0.25 + b * 0.2;
    if (m.head) m.head.rotation.y += b * 0.25;
    if (m.hipL) m.hipL.rotation.x -= Math.max(0, a) * 0.3;
  }
  for (const d of H.med) {
    irDecorStep(d, dt);
    const m = d.m,
      a = Math.sin(t * 2.4 + d.ph);
    m.elR.rotation.x += a * 0.25;
    m.elL.rotation.x -= a * 0.2;
    m.shR.rotation.x += Math.sin(t * 1.1 + d.ph) * 0.12;
  }
  for (const d of H.walk) {
    if (!d.path.length) {
      d.waitT = (d.waitT || 0) - dt;
      if (d.waitT <= 0) {
        d.wp = (d.wp + 1) % 3;
        d.path = [
          [
            [416, 74.4],
            [421, 74.4],
            [426.2, 74.4]
          ][d.wp]
        ];
        d.waitT = rr(2, 5);
      }
    }
    irDecorStep(d, dt);
  }
}
// los hombres tropiezan al andar y el que está más cerca se para a levantarlos
function m9Trips(fall, help) {
  if (G.m.tw != null) return;
  const t = CINE.t,
    busy = u => u === fall || u === help || u.trip || u.tripH || u.poseName;
  for (const u of us) {
    const T_ = u.trip;
    if (!T_) continue;
    if (t > T_.t + 1.1 && !T_.h) {
      T_.h = true;
      u.poseName = 'sit';
    }
    if (t > T_.t + 2.6 && !T_.up) {
      T_.up = true;
      u.poseName = 'carry';
      u.path = T_.path;
      u.spd = T_.spd * 0.85;
      const h = T_.helper;
      if (h && h.tripH) {
        h.path = h.tripH.path;
        h.poseName = 'carry';
        h.spd = u.spd;
      }
    }
    if (t > T_.t + 6.5) {
      u.trip = null;
      u.poseName = null;
      u.spd = T_.spd;
      const h = T_.helper;
      if (h && h.tripH) {
        h.poseName = null;
        h.spd = h.tripH.spd;
        h.tripH = null;
      }
    }
  }
  G.m.trT = (G.m.trT || 6) - (G.dt || 1 / 30);
  if (G.m.trT > 0 || t < 6) return;
  G.m.trT = rr(2.6, 4.5);
  const cand = us.filter(u => u.alive && !busy(u) && u.path.length > 2 && u.z > 80);
  if (!cand.length) return;
  const u = pick(cand),
    h = us
      .filter(o => o !== u && o.alive && !busy(o) && o.path.length && Math.hypot(o.x - u.x, o.z - u.z) < 5)
      .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
  u.trip = { t, path: u.path, spd: u.spd, helper: h || null };
  u.path = [];
  u.poseName = 'collapse';
  if (h) {
    h.tripH = { path: h.path, spd: h.spd };
    const c = findWalk(u.x + 0.7, u.z);
    h.path = [[c[0], c[1]]];
    if (rnd() < 0.5) m9Say(h, pick(['Arriba, vamos.', 'Dame la mano. Ya casi estamos.', 'Te tengo. Sigue andando.']));
  }
}
function m9Ending() {
  const t0 = (G.m.tw = CINE.t),
    H = G.m.hosp,
    w = H ? H.wd : [],
    md = H ? H.med : [];
  CINE.zoom = 4.8;
  CINE.spin = 0.008;
  // uno se acerca a los heridos y la cámara va con él
  const P_ = m9Players()
    .concat(us.filter(u => u.alive && u.npc))
    .filter(u => !u.trip && u.z < 80);
  const g = (G.m.guide =
    P_.sort((a, b) => Math.hypot(a.x - 418, a.z - 74.4) - Math.hypot(b.x - 418, b.z - 74.4))[0] || null);
  if (g) {
    g.poseName = null;
    g.spd = 1.05;
    goTo(g, 419.6, 74.4);
  }
  const talk = (d, n) => {
    if (d) d.talkT = n || 2.6;
  };
  CINE.keys.push(
    {
      t: t0 + 8,
      fn: () => {
        talk(w[1]);
        say('Herido', '¡Ah! ¡La pierna, no puedo con la pierna!', 'us', true);
      }
    },
    {
      t: t0 + 11,
      fn: () => {
        talk(md[0]);
        say('Sanitario', 'Quieto, quieto. Mírame a mí. Ya estás aquí, te tengo.', 'us', true);
      }
    },
    {
      t: t0 + 14.5,
      fn: () => {
        talk(w[6]);
        say('Herido', 'No me dejéis aquí tirado… ¿dónde está mi equipo?', 'us', true);
      }
    },
    {
      t: t0 + 18,
      fn: () => {
        talk(md[2]);
        say('Sanitario', '¡Necesito más vendas aquí y otra bolsa de suero!', 'us', true);
      }
    },
    {
      t: t0 + 21.5,
      fn: () => {
        talk(w[3]);
        say('Herido', 'Hace frío… mucho frío…', 'us', true);
      }
    }
  );
  CINE.dur = t0 + 35;
}
// el fundido lento a negro al final del todo, y la palabra
function m9FinCurtain(t) {
  let el = $('curtain');
  if (!el) {
    el = document.createElement('div');
    el.id = 'curtain';
    el.innerHTML = '<span></span>';
    document.body.appendChild(el);
  }
  const a = clamp((t - 23) / 6, 0, 1),
    w = clamp((t - 30) / 2.5, 0, 1);
  el.hidden = a <= 0;
  el.style.opacity = a.toFixed(3);
  el.classList.add('epi');
  el.firstChild.textContent = L(M9_EPI0);
  el.firstChild.style.opacity = w.toFixed(3);
}
// después de la batalla: el balance, luego el vídeo de los ataúdes con la bandera, un fundido lento a negro y lo que vino después
const M9_EPI0 =
    'Durante los dos días de batalla murieron cerca de 1.000 somalíes y 19 soldados estadounidenses perdieron la vida.',
  M9_EPI = [
    'Los sargentos de la Delta Force Gary Gordon y Randy Shughart fueron los primeros soldados en recibir la Medalla de Honor a título póstumo desde la guerra de Vietnam.',
    'El piloto Michael Durant fue liberado por la milicia de Aidid tras 11 días de cautiverio.',
    'Dos semanas después, el presidente Clinton retiró de Somalia a la Delta Force y a los Rangers.'
  ];
function m9EpiClear() {
  for (const id of ['epiVid', 'epiTxt']) {
    const e = $(id);
    if (e) {
      if (e.tagName === 'VIDEO') {
        try {
          e.pause();
        } catch (_) {}
        if (e.src.startsWith('blob:')) URL.revokeObjectURL(e.src);
      }
      e.remove();
    }
  }
}
function m9Epilogue(done) {
  const cur = $('curtain'),
    span = cur && cur.firstChild;
  let over = false,
    tm = [];
  const later = (ms, f) =>
    tm.push(
      setTimeout(() => {
        if (!over) f();
      }, ms)
    );
  const finish = () => {
    if (over) return;
    over = true;
    tm.forEach(clearTimeout);
    m9EpiClear();
    if (span) span.style.opacity = 0;
    done();
  };
  if (MUS.out && AC) MUS.out.gain.setTargetAtTime(0, AC.currentTime, 0.8); // la música deja paso al vídeo
  // el balance se queda un momento más y luego se va
  later(2500, () => {
    if (span) {
      span.style.transition = 'opacity 1.6s';
      span.style.opacity = 0;
    }
  });
  const texts = () => {
    m9EpiClear();
    const box = document.createElement('div');
    box.id = 'epiTxt';
    box.onclick = finish;
    box.innerHTML = M9_EPI.map(p => '<p>' + L(p) + '</p>').join('');
    document.body.appendChild(box);
    [...box.children].forEach((p, k) =>
      later(800 + k * 4200, () => {
        p.style.opacity = 1;
      })
    );
    later(800 + M9_EPI.length * 4200 + 9000, () => {
      box.style.opacity = 0;
    });
    later(800 + M9_EPI.length * 4200 + 11500, finish);
  };
  later(4400, () => {
    let src = null;
    try {
      const t0 = document.createElement('video'),
        mp4 = !!t0.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
        w = !mp4 && window.__FINVIDW; // H.264 donde se pueda reproducir, VP9 donde no
      const b = atob((w ? window.__FINVIDW : window.__FINVID) || ''),
        u = new Uint8Array(b.length);
      for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k);
      if (u.length) src = URL.createObjectURL(new Blob([u], { type: w ? 'video/webm' : 'video/mp4' }));
    } catch (_) {}
    if (!src) {
      texts();
      return;
    }
    const v = document.createElement('video');
    v.id = 'epiVid';
    v.src = src;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.onclick = finish;
    document.body.appendChild(v);
    let out = false;
    v.addEventListener(
      'playing',
      () => {
        v.style.opacity = 1;
      },
      { once: true }
    );
    v.addEventListener('timeupdate', () => {
      if (!out && v.duration && v.currentTime > v.duration - 3.6) {
        out = true;
        v.style.transition = 'opacity 3.4s ease-in';
        v.style.opacity = 0;
      }
    });
    v.addEventListener('ended', () => later(out ? 900 : 0, texts), { once: true });
    v.addEventListener('error', () => texts(), { once: true });
    const p = v.play();
    if (p && p.catch)
      p.catch(() => {
        v.muted = true;
        v.play().catch(() => texts());
      });
  });
}
// el terreno: quién está dónde cuando llega la columna
function m9Spawn() {
  // el jugador: Kilo 1-1 en la plaza y el Romeo 2-2 junto al muro oeste
  const hoot = Object.assign({}, DELTA[1], DSPEC, {
    name: 'Sgto. 1º Hoot Gibson',
    role: 'Jefe de equipo',
    kit: 'radio'
  });
  spawnForce([
    {
      name: 'Kilo 1-1',
      role: 'Delta',
      kind: 'delta',
      specs: [hoot].concat(deltaSpecs(6).slice(2)),
      at: [M8_DPOS[0][0], M8_DPOS[0][1]]
    },
    {
      name: 'Romeo 2-2',
      role: 'Rangers',
      kind: 'chalk',
      specs: rangerSpecs(['Tte. Larry Perino', 'Esp. Phipps', 'Esp. Rodriguez', 'Cabo Goodale']),
      at: [366.6, 295.5]
    }
  ]);
  const place = (u, x, z, face) => {
    const c = findWalk(x, z);
    u.x = c[0] + 0.5;
    u.z = c[1] + 0.5;
    u.face = face;
    u.stance = 'crouch';
    u.m8in = true;
  };
  G.m.k11 = grpN('Kilo 1-1').members;
  G.m.r22 = grpN('Romeo 2-2').members;
  G.m.k11.forEach((u, k) => place(u, M8_DPOS[k][0], M8_DPOS[k][1], 0));
  G.m.r22.forEach((u, k) => place(u, [366.6, 367.4, 366.6, 367.4][k], [293.5, 294.6, 296.2, 297.4][k], PH));
  for (const u of us) u.god = false;
  // los demás, sin órdenes de nadie: el Romeo 3-1 junto al muro, Steele y su radio junto a los restos, y Sanderson
  const R = (name, unit, k, extra) =>
    Object.assign({}, RANGERS[k % 6], RSPEC, { name, role: 'Fusilero', unitName: unit, medic: false }, extra || {});
  const mk = (L_, pts, unit, face) =>
    L_.map((n, k) => {
      const u = npcUnit(R(n, unit, k), pts[k][0], pts[k][1], face);
      u.stance = 'crouch';
      u.god = true;
      u.m8in = true;
      u.noFire = true;
      return u;
    });
  G.m.r31 = mk(
    ['Sgto. Okafor', 'Cabo Lindqvist', 'Herrera', 'Park'],
    [
      [366.6, 310.6],
      [367.4, 311.8],
      [366.6, 313.2],
      [367.4, 314.4]
    ],
    'Romeo 3-1',
    PH
  );
  G.m.steele = npcUnit(R('Cap. Steele', 'Romeo 1-1', 0, { role: 'Jefe de la fuerza', kit: 'radio' }), 375.2, 309.2, 0);
  G.m.steele.god = true;
  G.m.steele.m8in = true;
  G.m.steele.noFire = true;
  G.m.r11 = mk(
    ['Sgto. Watson', 'Esp. Lance Twombly'],
    [
      [376.6, 310.4],
      [374.2, 310.8]
    ],
    'Romeo 1-1',
    0
  );
  G.m.sand = npcUnit(
    Object.assign({}, DELTA[0], DSPEC, { name: 'Sgto. 1º Sanderson', role: 'Jefe de equipo', unitName: 'Kilo 2-1' }),
    380.2,
    309.4,
    -PH
  );
  G.m.sand.god = true;
  G.m.sand.noFire = true;
  G.m.sand.stance = 'crouch';
  // el Romeo 4-1 y los heridos, dentro de la casa calle arriba
  const hb = m8House();
  G.m.r41 = mk(
    ['Sgto. Matt Eversmann', 'Esp. John Waddell', 'Esp. Shawn Nelson', 'Esp. Dale Sizemore'],
    [
      [M8_HOUSE.x - 5, M8_HOUSE.z],
      [M8_HOUSE.x - 5, M8_HOUSE.z + 1],
      [M8_HOUSE.x - 5, M8_HOUSE.z - 1],
      [M8_HOUSE.x - 5, M8_HOUSE.z + 2]
    ],
    'Romeo 4-1',
    PH
  );
  for (const u of G.m.r41) {
    u.m8in = false;
    if (hb) placeInB(u, hb, 'ground');
  }
  // la última milicia en las azoteas alrededor de la plaza (los puntos rojos)
  for (const [x, z] of [
    [382, 289],
    [396.5, 299],
    [397, 309],
    [382, 327]
  ]) {
    const e = roofFoe(x, z, 'roof');
    if (e) {
      e.noFire = true;
      e.xfire = true;
    }
  }
  // la calle hasta la casa: puestos en las bocacalles y unos pocos en las azoteas
  for (const [x, z, k] of [
    [361, 276, 'post'],
    [359.5, 277, 'post'],
    [382, 255, 'post'],
    [383.5, 256.5, 'rifle'],
    [360, 236, 'post'],
    [361.5, 237.5, 'post'],
    [381.5, 220, 'post'],
    [383, 221, 'rifle'],
    [358, 255.5, 'post']
  ])
    foe(x, z, k, 'esc', CAMP_ESPEC);
  for (const [x, z] of [
    [362, 266],
    [380, 246],
    [362, 228]
  ])
    roofFoe(x, z, 'esc');
  // la Milla: grupitos junto a las bocacalles
  for (const [x, z, n] of [
    [391, 193, 2],
    [392, 210, 2],
    [430, 186, 3],
    [400, 152, 2],
    [431, 151, 2],
    [401, 135, 3]
  ])
    for (let k = 0; k < n; k++) foe(x + rr(-1.5, 1.5), z + rr(-1.5, 1.5), k ? 'post' : 'rifle', 'mile', CAMP_ESPEC);
  // la emboscada en la X roja: una técnica en el cruce y hombres en la calle y en las azoteas
  G.m.ambT = techSpawn(
    [
      [438, 168.5],
      [425, 168.5]
    ],
    'amb',
    { vmax: 1.6 }
  );
  for (const [x, z] of [
    [421, 166.5],
    [423.5, 170.5],
    [426, 166.8],
    [428.5, 170.2],
    [431, 167],
    [433.5, 170.4],
    [436, 166.6],
    [421.5, 173.5],
    [424, 163.5],
    [430, 173.8]
  ])
    foe(x, z, 'post', 'amb', CAMP_ESPEC);
  for (const [x, z] of [
    [427, 158],
    [427, 180],
    [404, 160],
    [404, 178]
  ])
    roofFoe(x, z, 'amb');
  for (const [x, z] of [
    [380.6, 296.8],
    [374.2, 316.6],
    [366.2, 302.5],
    [366.8, 262.4],
    [374.4, 233.6],
    [366.6, 214.2],
    [411.6, 187.5],
    [418.6, 149.6],
    [411.5, 135.5]
  ])
    m9FireBarrel(x, z);
  // la columna, con la cola todavía en la avenida
  G.m.C = mkConvoy(M9_KINDS, M9_ROUTE, { s0: 103, limit: 103, vmax: 2.6, gap: 8.6, un: true, go: false });
  // pasada la puerta la columna se reparte: por el lado oeste, a lo largo de la grada sur y junto a la puerta
  G.m.C.sGate = routeS(G.m.C, MILE_X, 85.5);
  G.m.C.spread = [
    [
      [413, 80.6],
      [397, 79.6],
      [394.5, 74],
      [394.5, 50]
    ],
    [
      [413, 80.6],
      [397.5, 79.6],
      [395, 75],
      [394.5, 57]
    ],
    [
      [413, 80.6],
      [398.5, 79.6],
      [395.5, 76],
      [394.5, 64]
    ],
    [
      [413, 80.6],
      [399.5, 79.6],
      [396, 77],
      [394.5, 71]
    ],
    [
      [417, 80.6],
      [428, 79.4],
      [432, 74],
      [432, 52]
    ],
    [
      [417, 80.6],
      [427.5, 79.6],
      [431.5, 75],
      [432, 58.5]
    ],
    [
      [417, 80.6],
      [427, 79.8],
      [431, 76],
      [432, 65]
    ],
    [
      [417, 80.6],
      [426.5, 80],
      [430.5, 77],
      [432, 71.5]
    ]
  ]; // el lado este: la puerta queda despejada
  G.m.spots = m9CrowdSpots();
  G.m.mapRoutes = [
    {
      pts: [
        [MILE_X, 262],
        [MILE_X, M9_S],
        [M9_X, M9_S],
        [M9_X, 299]
      ],
      col: '#3e9f3a',
      x: [M9_X, 297]
    },
    {
      pts: [
        [M9_X - 1.5, 292],
        [M9_X - 1.5, 212]
      ],
      col: '#de8a1c',
      x: [M9_X - 1.5, 207.5],
      lab: 'Edificio de los heridos',
      labAt: [M9_X + 3, 207.5]
    },
    {
      pts: [
        [M9_X, 205],
        [M9_X, M9_N],
        [MILE_X, M9_N],
        [MILE_X, 94]
      ],
      col: '#d8b416',
      lab: 'Estadio',
      labAt: [MILE_X + 3, 94]
    },
    { col: '#c8321e', x: [M9_AMB.x, M9_AMB.z], lab: 'Emboscada', labAt: [M9_AMB.x + 2, M9_AMB.z] },
    {
      col: '#7a3aa8',
      box: [M9_PURPLE.x0 + 6, M9_PURPLE.z0 + 4, M9_PURPLE.x1 - 6, M9_PURPLE.z1],
      lab: 'Multitud',
      labAt: [M9_PURPLE.x1 - 4, (M9_PURPLE.z0 + M9_PURPLE.z1) / 2]
    }
  ];
  G.m.syms = [
    { label: 'ROMEO 3-1', pts: () => G.m.r31.filter(u => u.alive).map(u => [u.x, u.z]) },
    {
      label: 'ROMEO 1-1',
      pts: () =>
        [G.m.steele]
          .concat(G.m.r11)
          .filter(u => u.alive)
          .map(u => [u.x, u.z])
    },
    { label: 'ROMEO 4-1', pts: () => G.m.r41.filter(u => u.alive && !u.inB).map(u => [u.x, u.z]) }
  ];
}
// no queda nada tirado en el carril de la columna: coches, muros y chatarra ahí los atravesarían los vehículos
function m9Lane(i, j) {
  const x = i + 0.5,
    z = j + 0.5;
  for (let k = 1; k < M9_ROUTE.length; k++) {
    const [ax, az] = M9_ROUTE[k - 1],
      [bx, bz] = M9_ROUTE[k];
    if (
      x >= Math.min(ax, bx) - 2.2 &&
      x <= Math.max(ax, bx) + 2.2 &&
      z >= Math.min(az, bz) - 2.2 &&
      z <= Math.max(az, bz) + 2.2
    )
      return true;
  }
  return false;
}
// un bidón de aceite ardiendo en la calle: llamas, humo y su luz
function m9FireBarrel(x, z) {
  const c = findWalk(x, z);
  x = c[0] + 0.5;
  z = c[1] + 0.5;
  const g = new T.Mesh(
    new T.CylinderGeometry(0.3, 0.3, 0.85, 10),
    new T.MeshLambertMaterial({ color: pick([0x5a3a26, 0x3d3a34, 0x6a4a2a]) })
  );
  g.position.set(x, 0.43, z);
  g.castShadow = true;
  world.add(g);
  emitters.push({
    x,
    z,
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
  LIGHTSRC.push({ x, y: 1.3, z, col: 0xff7428, i: 3.2, d: 11, fl: 1 });
}
MISSIONS.mile = {
  id: 'mile',
  laneFree: (i, j) => m9Lane(i, j),
  n: 9,
  title: 'La Milla',
  hud: 'Escoltar al convoy de rescate y llegar al estadio',
  phase: 'night',
  hour: 1.917,
  crashed: ['s61', 's64'],
  orbits: [
    { lb: true, x: S61.x - 10, z: S61.z + 8, rx: 12, rz: 10, alt: 14, w: (2 * Math.PI) / 30 },
    { lb: true, x: S61.x + 10, z: S61.z - 10, rx: 10, rz: 13, alt: 17, w: (2 * Math.PI) / 38 }
  ],
  litter: { x: S61.x - 2, z: S61.z + 3, r: 13, big: true },
  place: 'Del Super 6-1 al estadio',
  squadTxt: 'Delta · Kilo 1-1 + Rangers · Romeo 2-2',
  date: '4 OCT 1993',
  noObjRing: true,
  endDelay: 2,
  summary:
    'La columna de rescate llega al Super 6-1. Hay que sacar a los pilotos atrapados, escoltar al convoy hasta el edificio de los heridos y seguir a los vehículos a pie hasta el estadio.',
  text: '01:55. La columna de la ONU, con Humvees, camiones y blindados paquistaníes y malasios, entra por fin en la zona de impacto del Super 6-1. Los pilotos siguen atrapados en la cabina. Cuando salgan, quedan los heridos del edificio y la milla hasta el estadio.',
  start: [S61.x - 4, S61.z],
  cam: [S61.x, S61.z, 11],
  civ: [MILE_X, 160],
  spawn() {
    m9Spawn();
  },
  onStart() {
    m9Intro();
  },
  subs: [
    {
      text: 'Escoltar al convoy hasta el edificio de los heridos',
      zone: { x: M9_X, z: 207, r: 6 },
      tick: () => m9EscortTick(),
      count: () => {
        const C = G.m.C;
        return Math.max(0, Math.round(M9_SH - C.s)) + ' m';
      },
      done: () => G.m.phase === 'A' && G.m.C.s >= M9_SH - 0.4,
      onDone: () => m9HouseCine()
    },
    {
      text: 'Seguir a los vehículos a pie hasta el estadio',
      zone: { x: MILE_X, z: 90, r: 10 },
      tick: () => m9MileTick(),
      done: () => !!G.m.fin
    }
  ],
  opt: [{ text: 'No quedarse atrás de los vehículos', ok: () => !G.m.behind }]
};
