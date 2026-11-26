/* ====================================================================================================
 * missions/m07-anochecer.js
 *
 * 7 · Anochecer: los heridos llevados a una casa calle arriba y luego los Delta van a por el segundo derribo de noche
 * ================================================================================================== */

const PM_START = { x: 369.5, z: 283.5 }; // el círculo verde, justo al norte del arco
const PM_DOOR = { x: 370.5, z: 207.5 },
  PM_BLD = { x: 375, z: 207 }; // la casa a la que se llevan los heridos (lado este de la calle)
const PM_ROUTE = [
  [369.8, 286.5],
  [369.8, 283],
  [370.2, 240],
  [370.4, 207.5]
];
const PM_BLUE = [
  [370.5, 220],
  [318.5, 220],
  [318.5, 245],
  [315, 265],
  [315, 302.5],
  [302, 302.5],
  [302, 321],
  [314, 321],
  [314, 357.5],
  [278.5, 360]
];
const PM_EXIT = [
  [279, 364.5],
  [291, 365],
  [302.5, 365],
  [312, 365.5]
];
const PM_FLARES = [
  [316, 262],
  [314, 338]
];
// una guía discontinua pintada en el suelo
function dashGuide(pts, col, w, dash, gap) {
  const grp = new T.Group(),
    mat = new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.8,
      side: T.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
  let carry = 0;
  for (let k = 1; k < pts.length; k++) {
    const [x0, z0] = pts[k - 1],
      [x1, z1] = pts[k],
      L = Math.hypot(x1 - x0, z1 - z0);
    if (L < 0.01) continue;
    const ux = (x1 - x0) / L,
      uz = (z1 - z0) / L;
    for (let t = carry; t < L; t += dash + gap) {
      const a = Math.min(dash, L - t),
        geo = new T.PlaneGeometry(w, a);
      geo.rotateX(-Math.PI / 2);
      const m = new T.Mesh(geo, mat);
      m.rotation.y = Math.atan2(ux, uz);
      m.position.set(x0 + ux * (t + a / 2), 0.07, z0 + uz * (t + a / 2));
      grp.add(m);
    }
    carry = (carry - L) % (dash + gap);
    if (carry < 0) carry += dash + gap;
  }
  return grounded(grp);
}
function dropGuide(gr) {
  if (!gr) return;
  overlay.remove(gr);
  gr.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
}
// una ruta de calles por la rejilla que sigue los giros indicados
function pathThrough(pts) {
  const out = [];
  for (let k = 1; k < pts.length; k++) {
    PF.noVault = true;
    const a = findWalk(pts[k - 1][0], pts[k - 1][1]),
      b = findWalk(pts[k][0], pts[k][1]),
      p = findPath(a[0], a[1], b[0], b[1]) || [];
    PF.noVault = false;
    for (const c of p) out.push([c[0] + 0.5, c[1] + 0.5]);
  }
  return out.length ? out : pts;
}
// camillas: dos camilleros y un hombre tumbado entre ellos, recorriendo la ruta verde
function pmStretcher(k) {
  const grp = new T.Group();
  world.add(grp);
  MAT = M.GEN;
  const pole = new T.MeshLambertMaterial({ color: 0x5a4a32 }),
    canvas = new T.MeshLambertMaterial({ color: 0x5d5d42 });
  for (const sx of [-0.3, 0.3]) {
    const m = new T.Mesh(UBOX, pole);
    m.scale.set(0.05, 0.05, 2.3);
    m.position.set(sx, 0.78, 0);
    grp.add(m);
  }
  const c = new T.Mesh(UBOX, canvas);
  c.scale.set(0.6, 0.03, 1.8);
  c.position.set(0, 0.78, 0);
  grp.add(c);
  const wr = buildRig('ranger', { gun: 'm16' });
  wr.gun.visible = false;
  grp.add(wr.root);
  wr.root.position.set(0, 0.8, -0.3);
  const wd = {
    m: wr,
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
  const bear = [0, 1].map(i => {
    const r = buildRig('ranger', { gun: 'm16' });
    r.gun.visible = false;
    return irDecor(r, PM_START.x, PM_START.z, Math.PI, { poseName: 'carry', spd: 0.6 });
  });
  return { grp, wd, bear, s: -k * 6.5 };
}
function pmColumn(dt) {
  const R_ = G.m.pmR;
  if (!R_) return;
  const lead = (G.m.pmLead = Math.min(R_.L, (G.m.pmLead || 0) + (G.m.pmGo ? 0.55 * dt : 0)));
  for (const S of G.m.pmS) {
    const s1 = clamp(lead + S.s, 0, R_.L),
      s0 = clamp(s1 - 2.0, 0, R_.L);
    const [x1, z1, h1] = polyAt(R_, s1),
      [x0, z0] = polyAt(R_, s0),
      mx = (x0 + x1) / 2,
      mz = (z0 + z1) / 2,
      hd = Math.atan2(x1 - x0, z1 - z0) || h1;
    const moving = G.m.pmGo && lead < R_.L;
    S.bear.forEach((b, i) => {
      const x = i ? x0 : x1,
        z = i ? z0 : z1;
      b.vx = moving ? Math.sin(hd) * 0.55 : 0;
      b.vz = moving ? Math.cos(hd) * 0.55 : 0;
      b.x = x;
      b.z = z;
      b.face = hd;
      b.moving = moving;
      b.m.root.position.set(x, 0, z);
      b.m.root.rotation.y = hd;
      animRig(b, dt);
    });
    S.grp.position.set(mx, 0, mz);
    S.grp.rotation.y = hd;
    animRig(S.wd, dt);
  }
  const c = pmMid();
  if (G.m.pmRing) {
    G.m.pmRing.position.set(c[0], 0.05, c[1]);
    G.m.pmRing.visible = !CINE.on;
  }
}
// el centro del grupo de camillas, para su anillo, su símbolo y su barra
function pmMid() {
  const R_ = G.m.pmR;
  if (!R_) return [PM_START.x, PM_START.z];
  const s = clamp((G.m.pmLead || 0) - 4.2, 0, R_.L),
    p = polyAt(R_, s);
  return [p[0], p[1]];
}
function pmXfire() {
  const g41 = grpN('Romeo 4-1'),
    g11 = grpN('Romeo 1-1');
  const men = gLive(g41).concat(
    gLive(g11),
    (G.m.stay || []).filter(u => u.alive)
  );
  for (const g of [g41, g11]) if (g) g.hide = true;
  const bOf = (x, z) => {
    const b = bAt(Math.floor(x), Math.floor(z));
    return b >= 0 ? BLDS[b] : null;
  };
  const skip = [bOf(363.8, 313.4), bOf(386.4, 326.9), bOf(PM_BLD.x, PM_BLD.z)].filter(Boolean);
  G.m.pmX = xfMake(S61.x, S61.z, {
    n: 6,
    r0: 4,
    rr: 14,
    men,
    rate: 1.5,
    nb: 6,
    perRoof: 3,
    streets: 3,
    skipB: skip,
    unit: 'Romeo 2-2',
    r1: 36
  });
  for (const u of men) G.sel.delete(u);
  for (const u of G.m.pmW || []) u.god = true; // los heridos que andan tampoco caen: lo que está en juego son las camillas
  G.sel = new Set(gLive(grpN(D_B)));
  buildCards();
  refreshCards();
}
// el Romeo 4-1 va junto a las camillas todo el camino
function pmEscort() {
  const g = grpN('Romeo 4-1');
  if (!g || !G.m.pmGo) return;
  G.m.pmEt = (G.m.pmEt || 0) - (G.dt || 1 / 30);
  if (G.m.pmEt > 0) return;
  G.m.pmEt = 1.2;
  const [cx, cz] = pmMid(),
    R_ = G.m.pmR,
    [, , hd] = polyAt(R_, clamp((G.m.pmLead || 0) - 4.2, 0, R_.L)),
    ax = Math.sin(hd),
    az = Math.cos(hd);
  gLive(g).forEach((u, i) => {
    if (u.inB) return;
    const side = i % 2 ? 1 : -1,
      along = ((i >> 1) - 1) * 2.2,
      x = cx + az * side * 1.9 + ax * along,
      z = cz - ax * side * 1.9 + az * along;
    if (Math.hypot(u.x - x, u.z - z) > 1.6) {
      goTo(u, x, z);
      u.spd = 1.2;
      u.stance = 'crouch';
    }
  });
}
function pmIntro() {
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  pmXfire();
  const c41 = grpN('Romeo 4-1').members,
    c11 = grpN('Romeo 1-1').members,
    dt_ = G.m.pmW[0];
  for (const [x, z] of [
    [358, 262],
    [382, 266],
    [352, 296],
    [395, 309],
    [372, 330],
    [360, 276],
    [388, 278]
  ]) {
    const e = foe(x, z, 'rifle', 'pre', CAMP_ESPEC);
    e.spotted = true;
  }
  for (let k = 0; k < 3; k++) roofFoe(S61.x + rr(-25, 25), S61.z + rr(-25, 25), 'pre');
  G.alert = true;
  cineStart({
    zoom: 10.5,
    spin: 0.02,
    yaw0: camS.yaw,
    focus: () => [S61.x - 4, S61.z - 8],
    keys: [
      { t: 2, fn: () => sayU(c11[2], 'El convoy se ha ido, no van a venir.') },
      { t: 6.5, fn: () => sayU(dt_, 'Tendremos que atrincherarnos aquí hasta que vuelvan.') },
      { t: 11, fn: () => sayU(c41[0], 'Tenemos muchos heridos, hay que reagruparse en algún sitio para atenderlos.') },
      {
        t: 16.5,
        fn: () => {
          CINE.zoom = 12;
          say(
            D_B,
            'Hay un edificio calle arriba, al norte del arco. Llevadlos allí. Nosotros os cubrimos.',
            'delta',
            true
          );
        }
      }
    ],
    dur: 22,
    tick: dt => {
      xfStep(G.m.pmX, dt);
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 25);
    },
    onEnd: () => {
      camS.tx = PM_START.x;
      camS.tz = PM_START.z - 8;
      camS.zoomT = 12;
      G.sel = new Set(us.filter(u => u.alive && !u.npc));
      refreshCards();
      renderSubs();
      hint(
        'Los heridos caminan solos hasta el edificio por la ruta verde, con el Romeo 4-1 a su lado. Solo mandas a Delta: protégelos. El resto de Rangers combate por su cuenta en la zona de impacto.'
      );
    }
  });
}
function pmWoundedGo() {
  G.m.pmGo = true;
  const W_ = G.m.pmW;
  let k = 0;
  for (const u of W_)
    if (u.alive) {
      const tz = PM_DOOR.z + 2 + (k % 3) * 1.4,
        tx = PM_DOOR.x - 0.6 + ((k / 3) | 0) * 1.1;
      k++;
      u.pmT = [tx, tz];
      goTo(u, tx, tz);
      u.spd = 0.55;
    }
}
function pmWatch(dt) {
  pmColumn(dt);
  xfStep(G.m.pmX, dt);
  pmEscort();
  // el fuego sobre el grupo de camillas lo va desgastando: de cerca, o disparando con línea hasta él
  G.m.pmPT = (G.m.pmPT || 0) - dt;
  if (G.m.pmPT <= 0) {
    G.m.pmPT = 1;
    const [cx, cz] = pmMid();
    let dm = 0;
    for (const e of them) {
      if (!e.alive || e.pinned) continue;
      const d = Math.hypot(e.x - cx, e.z - cz);
      if (d > 30) continue;
      if (d < 6) dm += 1.4;
      else if (e.firing > 0 && los(e.x, e.z, cx, cz)) dm += 0.3;
    }
    if (dm) {
      G.m.pmHp = Math.max(0, G.m.pmHp - dm);
      G.m.medFlash = 1;
    }
    if (G.m.pmHp <= 0 && !G.over) {
      say('Uniform 6-4', 'Hemos perdido a los heridos de las camillas.', 'hq', true);
      endGame(false);
    }
  }
  // los heridos que se han quedado cortos (se pusieron a cubierto, los tiraron al suelo) se vuelven a mandar
  for (const u of G.m.pmW)
    if (u.alive && u.pmT && !u.path.length && Math.hypot(u.x - u.pmT[0], u.z - u.pmT[1]) > 2.5 && G.t > (u.pmRe || 0)) {
      u.pmRe = G.t + 3;
      goTo(u, u.pmT[0], u.pmT[1]);
      u.spd = 0.55;
    }
  // de uno en uno o de dos en dos, saliendo de las bocacalles
  if (G.t >= (G.m.pmNext || 0)) {
    G.m.pmNext = G.t + rr(7, 13);
    if (them.filter(e => e.alive && e.tag === 'p1').length < 9) {
      const [lx, lz] = polyAt(G.m.pmR, G.m.pmLead || 0);
      const n = 1 + ri(2),
        a = rnd() * 6.283,
        d = rr(22, 32);
      for (let q = 0; q < n; q++) {
        const e = foe(lx + Math.cos(a) * d + rr(-2, 2), lz + Math.sin(a) * d + rr(-2, 2), 'wave', 'p1', {
          acc: 0.2,
          hp: 80
        });
        e.goal = { x: lx + rr(-3, 3), z: lz + rr(-3, 3) };
      }
    }
  }
}
const pmArrived = () => {
  const R_ = G.m.pmR;
  if (!R_ || (G.m.pmLead || 0) < R_.L - 0.1) return false;
  return G.m.pmW.every(u => !u.alive || Math.hypot(u.x - u.pmT[0], u.z - u.pmT[1]) < 2.6);
};
// dentro de la casa: los heridos y los Rangers dentro, se hace de noche y Hoot forma su equipo
function pmHouse() {
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  xfClear(G.m.pmX);
  G.m.pmX = null;
  const c41 = grpN('Romeo 4-1') ? grpN('Romeo 4-1').members : [],
    d = grpN(D_B),
    hoot = d.members[0];
  const ev = c41[0],
    sm = G.m.pmSm,
    doc = G.m.pmDoc;
  for (const e of them)
    if (e.alive && Math.hypot(e.x - PM_DOOR.x, e.z - PM_DOOR.z) < 30) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  dropGuide(G.m.pmG);
  G.m.pmG = null;
  const S = {};
  cineStart({
    zoom: 8.5,
    spin: 0.012,
    yaw0: camS.yaw,
    focus: () => [PM_BLD.x - 2, PM_BLD.z],
    keys: [
      { t: 0.5, fn: () => sayU(ev, '¡Todos adentro! ¡Meted las camillas, rápido!') },
      {
        t: 3.5,
        fn: () => {
          // todos menos los Delta entran
          pmInside();
        }
      },
      {
        t: 6,
        fn: () =>
          say(
            'Doc Schmid',
            'Necesito luz aquí. La bala le ha abierto la arteria femoral, no consigo pinzarla.',
            'us',
            true
          )
      },
      { t: 11.5, fn: () => say('Cabo Jamie Smith', 'Doc... no siento la pierna.', 'us', true) },
      {
        t: 14.5,
        fn: () => say('Doc Schmid', 'Mírame, Smith. Te tengo. Aprieta los dientes, vamos a salir de esta.', 'us', true)
      },
      {
        t: 19.5,
        fn: () =>
          say(
            'Sgto. Matt Eversmann',
            'Uniform 6-4, aquí Romeo 4-1. Tengo un herido muy grave, necesitamos sacarlo de aquí ya.',
            'us',
            true
          )
      },
      {
        t: 25.5,
        fn: () =>
          say(
            'Uniform 6-4',
            'Negativo, Romeo 4-1. No podemos meter otra nave. Aguantad hasta que llegue la columna.',
            'hq',
            true
          )
      },
      { t: 31, fn: () => say('Esp. Lance Twombly', 'Se está haciendo de noche...', 'us', true) },
      { t: 34, fn: () => say('Doc Schmid', 'Necesito plasma y más vendas. Mantenedlo despierto.', 'us', true) },
      {
        t: 39,
        fn: () =>
          sayU(hoot, 'Eversmann. Voy a formar un grupo con mis hombres. Vamos a la segunda zona de impacto, al 6-4.')
      },
      { t: 44.5, fn: () => say('Sgto. Matt Eversmann', '¿Ahora? ¿De noche, con todo eso ahí fuera?', 'us', true) },
      { t: 48.5, fn: () => sayU(hoot, 'De noche ellos no ven. Nosotros sí. Visores abajo, Delta.') }
    ],
    dur: 53,
    tick: dt => {
      pmDusk(CINE.t);
      for (const u of us) if (u.alive) u.sup = 0;
    },
    onEnd: () => pmNight()
  });
}
// no se queda nadie fuera: los heridos y las camillas dentro, Delta y los Rangers en las ventanas y el Romeo 1-1 arriba en la azotea
function pmInside() {
  const bi = bAt(Math.floor(PM_BLD.x), Math.floor(PM_BLD.z)),
    b = bi >= 0 ? BLDS[bi] : null;
  for (const S_ of G.m.pmS) {
    S_.grp.visible = false;
    for (const bb of S_.bear) bb.m.root.visible = false;
  }
  if (G.m.pmRing) {
    overlay.remove(G.m.pmRing);
    G.m.pmRing = null;
  }
  G.m.syms = (G.m.syms || []).filter(s => s.label !== 'ROMEO 4-1');
  for (const u of us.slice()) {
    if (!u.alive || u.stay) continue;
    u.path = [];
    u.order = null;
    if (u.inB) leaveB(u);
    const roof = !!(grpN('Romeo 1-1') && grpN('Romeo 1-1').members.includes(u)),
      keep = roof || u.look === 'delta' || !!(grpN('Romeo 4-1') && grpN('Romeo 4-1').members.includes(u));
    if (keep && b) {
      placeInB(u, b, roof ? 'roof' : 'ground');
      if (u.inB) continue;
    }
    u.alive = false;
    u.inside = true;
    world.remove(u.m.root);
    dropOverlay(u);
  }
}
// la noche cae de forma uniforme durante la escena de la casa: la luz baja a ritmo constante, no de golpe al ponerse el sol
function pmDusk(t) {
  if (G.m.pmD0 == null) G.m.pmD0 = clamp(1 - nightF, 0, 1);
  const f = clamp((t - 3) / 45, 0, 1),
    D = G.m.pmD0 * (1 - f);
  let lo = 0,
    hi = 1;
  for (let k = 0; k < 24; k++) {
    const m = (lo + hi) / 2;
    if (m * m * (3 - 2 * m) < D) lo = m;
    else hi = m;
  }
  const se = -0.12 + 0.32 * lo,
    h = 5.9 + (12.05 * (Math.PI - Math.asin(clamp(se, -1, 1)))) / Math.PI,
    now = G.sun0 + (G.t * TIMESCALE) / 3600;
  G.sunShift = f >= 1 ? Math.max(h - now, 20.7 - now) : Math.max(G.sunShift || 0, h - now);
}
function pmNight() {
  G.sunShift = Math.max(G.sunShift || 0, 20.7 - (G.sun0 + (G.t * TIMESCALE) / 3600));
  G.m.p2 = true;
  for (const S_ of G.m.pmS || []) {
    world.remove(S_.grp);
    for (const b of S_.bear) world.remove(b.m.root);
  }
  G.m.pmS = [];
  if (G.m.pmRing) {
    overlay.remove(G.m.pmRing);
    G.m.pmRing = null;
  }
  // los Rangers se quedan atrás: los de la azotea y los del Super 6-1 vigilan, pero ya no están a las órdenes del jugador
  for (const u of us.slice()) {
    if (u.look === 'delta' && !u.npc) continue;
    if (u.alive && (u.inB || u.stay)) {
      u.npc = true;
      G.sel.delete(u);
      continue;
    }
    if (u.m.root.parent) world.remove(u.m.root);
    dropOverlay(u);
    u.alive = false;
  }
  us = us.filter(u => u.alive || u.look === 'delta');
  units = units.filter(u => u.team !== 'us' || us.includes(u));
  IRN.groups = IRN.groups.filter(g => g.name === D_B);
  for (const g of IRN.groups) g.members = g.members.filter(u => us.includes(u));
  G.m.syms = [{ label: 'ROMEO 2-2', pts: () => (G.m.stay || []).filter(u => u.alive).map(u => [u.x, u.z]) }];
  const c11 = us.filter(u => u.npc && u.inB && u.alive);
  if (c11.length) G.m.syms.push({ label: 'ROMEO 1-1', pts: () => c11.filter(u => u.alive).map(u => [u.x, u.z]) });
  gLive(grpN(D_B)).forEach((u, i) => {
    if (u.inB) leaveB(u);
    u.inB = null;
    const c = findWalk(PM_BLUE[0][0] + (i % 3) - 1, PM_BLUE[0][1] - 1 - ((i / 3) | 0));
    u.x = c[0] + 0.5;
    u.z = c[1] + 0.5;
    u.path = [];
    u.order = null;
    u.stance = 'crouch';
    u.elev = 0;
  });
  for (const e of them)
    if (e.alive) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  // el camino al 6-4 está vigilado: puestos por las calles y un anillo de ellos alrededor de los restos
  for (const [x, z, k] of [
    [330, 221, 'post'],
    [318, 232, 'rifle'],
    [320, 256, 'post'],
    [313, 282, 'rifle'],
    [316, 296, 'post'],
    [305, 309, 'rifle'],
    [308, 321, 'post'],
    [314, 334, 'rifle'],
    [312, 349, 'post'],
    [296, 359, 'rifle']
  ])
    foe(x, z, k, 'route', CAMP_ESPEC);
  for (const [dx, dz, k] of [
    [8, -8, 'post'],
    [-9, -6, 'post'],
    [10, 8, 'rifle'],
    [-10, 9, 'rifle'],
    [0, -13, 'post'],
    [14, 0, 'rifle'],
    [-14, -1, 'post']
  ])
    foe(S64.x + dx, S64.z + dz, k, 's64z', CAMP_ESPEC);
  G.m.pmBlue = dashGuide(pathThrough(PM_BLUE), 0x4a8cff, 0.28, 1.0, 0.8);
  buildCards();
  G.sel = new Set(gLive(grpN(D_B)));
  refreshCards();
  renderSubs();
  setSun(G.sun0 + (G.t * TIMESCALE) / 3600 + G.sunShift);
  setNV(true);
  camS.tx = PM_BLUE[0][0] - 6;
  camS.tz = PM_BLUE[0][1];
  camS.zoomT = 12;
  hint(
    'Delta: sigue la ruta azul hasta el Super 6-4 con los visores. La milicia solo os ve a menos de 10 m, salvo bajo una bengala.'
  );
}
// una bengala de la milicia: toda la calle iluminada y los visores deslumbrados
function enemyFlare(x, z) {
  const sp = new T.Sprite(FLARE_GLOW),
    core = new T.Sprite(FLARE_CORE);
  sp.scale.set(3.4, 3.4, 1);
  core.scale.set(0.55, 0.55, 1);
  world.add(sp);
  world.add(core);
  tracer(x + rr(-8, 8), 0.8, z + rr(-8, 8), x, 26, z, 0xffe8c0, 0);
  sched.push({
    at: G.t + 0.5,
    fn: () => {
      SUP.flares.push({
        x,
        y: 26,
        z,
        t: 0,
        sp,
        core,
        vx: rr(-0.2, 0.2),
        vz: rr(-0.2, 0.2),
        acc: 0,
        lit: 0,
        enemy: true,
        fall: 1.5
      });
      G.m.flLit = true;
      lightFlash(x, 26, z, 0xffffff, 6, 60, 0.4);
    }
  });
}
function pmFlares() {
  const L_ = gLive(grpN(D_B));
  if (!L_.length) return;
  // con los visores y a oscuras, los Delta se mueven despacio y agachados; con una bengala encima vuelven a lo normal
  const lit = SUP.flares.some(f => f.lit > 0.15);
  for (const u of L_) u.sneak = !lit && G.nv && nightF > 0.5;
  if (G.m.flLit && !SUP.flares.some(f => f.enemy)) {
    G.m.flLit = false;
    const sp = L_[0];
    sched.push({
      at: G.t + 0.8,
      fn: () => {
        if (sp.alive) {
          sp.talkT = 2.6;
          radio(sp, 'Volvemos a estar a oscuras. Ya podemos usar los visores.', true);
        }
      }
    });
  }
  PM_FLARES.forEach((p, k) => {
    if (G.m['fl' + k]) return;
    const lim = k ? 38 : 80;
    const u =
      L_.find(u => Math.hypot(u.x - p[0], u.z - p[1]) < 10) || L_.find(u => Math.hypot(u.x - S64.x, u.z - S64.z) < lim);
    if (!u) return;
    G.m['fl' + k] = true;
    enemyFlare(u.x + rr(-4, 4), u.z + rr(-4, 4));
    G.alert = true;
    const sp = L_[1 % L_.length],
      sp2 = L_[2 % L_.length];
    sched.push({
      at: G.t + 1.6,
      fn: () => {
        sp.talkT = 2.6;
        radio(sp, '¡No podemos ver con los visores! La luz ciega las gafas.', true);
      }
    });
    sched.push({
      at: G.t + 4.2,
      fn: () => {
        sp2.talkT = 2.2;
        radio(sp2, '¡Hay que cubrirse!', true);
        for (const m of gLive(grpN(D_B))) m.stance = 'crouch';
      }
    });
    for (let q = 0; q < 3; q++) {
      const a = rnd() * 6.283,
        e = foe(u.x + Math.cos(a) * 24, u.z + Math.sin(a) * 24, 'wave', 'fl', { acc: 0.22, hp: 80 });
      e.goal = { x: u.x, z: u.z };
    }
  });
}
/* El final: el 6-4 está vacío; las cargas, la carrera y los restos volando por los aires */
function pmBlow() {
  const d = grpN(D_B),
    L_ = gLive(d),
    hoot = d.members[0].alive ? d.members[0] : L_[0];
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  dropGuide(G.m.pmBlue);
  G.m.pmBlue = null;
  for (const f of SUP.flares) {
    world.remove(f.sp);
    world.remove(f.core);
  }
  SUP.flares.length = 0;
  G.m.flLit = false; // cualquier bengala que siga en el aire se apaga en el acto
  for (const u of L_) {
    u.sneak = false;
    u.spd = 3.4;
    u.stance = 'stand';
  } // llegan corriendo
  for (const e of them)
    if (e.alive && Math.hypot(e.x - S64.x, e.z - S64.z) < 45) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  for (const e of them)
    if (e.alive) {
      e.noFire = true;
      e.sup = 0;
    }
  const S = {},
    exitP = pathThrough(PM_EXIT);
  camS.tx = S64.x + 2;
  camS.tz = S64.z + 1;
  L_.forEach((u, i) => {
    const a = (i / L_.length) * 6.283;
    goTo(u, S64.x + Math.cos(a) * 3.2, S64.z + Math.sin(a) * 3.2);
    u.spd = 3.4;
  });
  cineStart({
    zoom: 8,
    spin: 0.01,
    yaw0: camS.yaw,
    focus: () => [S64.x + 2, S64.z + 1],
    keys: [
      { t: 1, fn: () => sayU(hoot, 'Revisad el aparato. Rápido.') },
      { t: 5.5, fn: () => sayU(L_[1 % L_.length], 'Aquí no hay nadie. El piloto, Durant, no está.') },
      { t: 9, fn: () => sayU(L_[2 % L_.length], 'Ni rastro de Gordon ni de Shughart. Se los han llevado.') },
      { t: 13, fn: () => sayU(hoot, 'Volad el pájaro. No les vamos a dejar nada.') },
      {
        t: 14,
        fn: () => {
          L_.slice(0, 2).forEach((u, i) => {
            goTo(u, S64.x + (i ? 1.6 : -1.6), S64.z + 0.8);
          });
        }
      },
      {
        t: 16.5,
        fn: () => {
          L_.slice(0, 2).forEach(u => {
            u.stance = 'crouch';
            u.working = true;
          });
          sayU(L_[1 % L_.length], 'Colocando las cargas.');
        }
      },
      {
        t: 21,
        fn: () => {
          sayU(L_[0], 'Cargas puestas. ¡Fuera, fuera!');
          for (const u of L_) {
            u.working = false;
            u.sneak = true;
            u.spd = 2.6;
            u.stance = 'stand';
            u.path = exitP.map(p => [Math.floor(p[0]), Math.floor(p[1])]);
            u.order = { type: 'move' };
          }
        }
      },
      {
        t: 28,
        fn: () => {
          pmExplode();
          CINE.zoom = 10.5;
        }
      },
      {
        t: 30,
        fn: () => {
          for (const u of L_) {
            const p = exitP[exitP.length - 1];
            goTo(u, p[0] + 22, p[1] + 2);
            u.spd = 2.6;
            u.sneak = true;
          }
        }
      }
    ],
    dur: 50,
    tick: dt => {
      pmPieces(dt);
      for (const e of them)
        if (e.alive) {
          e.noFire = true;
          e.firing = 0;
        }
      for (const u of L_)
        if (u.alive) {
          u.sup = 0;
          u.noFire = true;
          if (CINE.t > 34 && Math.hypot(u.x - S64.x, u.z - S64.z) > 40) u.m.root.visible = false;
        }
    },
    onEnd: () => {
      G.m.blown = true;
    }
  });
}
function pmExplode() {
  setNV(false);
  const W_ = WRECK_G.s64,
    x = S64.x,
    z = S64.z;
  for (let k = 0; k < 4; k++) {
    const a = rnd() * 6.283,
      r = rr(0, 3);
    sched.push({
      at: G.t + k * 0.18,
      fn: () => {
        boom(x + Math.cos(a) * r, z + Math.sin(a) * r);
        sfx('boom', x, z);
      }
    });
  }
  lightFlash(x, 3, z, 0xffb050, 14, 40, 1.6);
  // la onda expansiva: un anillo de polvo corriendo por el suelo, y cada papel que alcanza sale despedido hacia arriba y lejos
  LIT.blast = { x, z, t: 0, id: (LIT.blast ? LIT.blast.id : 0) + 1 };
  for (let k = 0; k < 90; k++) {
    const a = (k / 90) * 6.283 + rr(-0.03, 0.03),
      s = rr(14, 20);
    spawnP(
      x + Math.cos(a) * 1.5,
      0.25,
      z + Math.sin(a) * 1.5,
      Math.cos(a) * s,
      rr(0.1, 0.6),
      Math.sin(a) * s,
      rr(0.9, 1.4),
      rr(0.3, 0.5),
      rr(1.2, 2),
      0x8a7a62,
      0x5a5048,
      0.75,
      0,
      0
    );
  }
  for (let k = 0; k < 40; k++)
    spawnChunk(
      x + rr(-2, 2),
      rr(0.5, 2.5),
      z + rr(-2, 2),
      rr(-9, 9),
      rr(4, 12),
      rr(-9, 9),
      rr(0.08, 0.35),
      pick([0x2a2622, 0x3d4235, 0x1c1c1a, 0x5a5a50]),
      rnd() < 0.5 ? 'flake' : null
    );
  for (const [dx, dz, f] of [
    [0, 0, 1],
    [-2.5, 1.5, 0.7],
    [3, -1, 0.6]
  ])
    emitters.push({
      x: x + dx,
      z: z + dz,
      y: 1,
      rate: 40 * f,
      life: 9,
      vy: 2.2,
      s0: 0.5,
      s1: 3.2,
      fire: 0.85,
      acc: 0,
      sp: 1
    });
  LIGHTSRC.push({ x, y: 2.4, z, col: 0xff7a2a, i: 6, d: 26, fl: 1 });
  LIGHTSRC.push({ x: x - 3, y: 1.6, z: z + 2, col: 0xff6a20, i: 3.5, d: 14, fl: 1 });
  // el fuselaje se deshace: la cabina vuelca y salen despedidos el rotor, la cola y las puertas
  G.m.pieces = [];
  if (W_ && W_.g) {
    W_.g.updateMatrixWorld(true);
    const burnt = new T.MeshLambertMaterial({ color: 0x2c2723 });
    const parts = [];
    W_.inner.traverse(o => {
      if (o.isMesh) parts.push(o);
    });
    parts.forEach((o, i) => {
      const m = new T.Mesh(o.geometry, burnt);
      o.matrixWorld.decompose(m.position, m.quaternion, m.scale);
      m.castShadow = true;
      world.add(m);
      const big = i === 0,
        a = rnd() * 6.283,
        sp = big ? rr(0.8, 1.6) : rr(4, 8);
      G.m.pieces.push({
        m,
        vx: Math.cos(a) * sp,
        vz: Math.sin(a) * sp,
        vy: big ? rr(2.5, 3.5) : rr(6, 10),
        h: 0,
        h0: big ? 0 : -m.position.y * 0.9,
        w: new T.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(),
        ws: big ? rr(0.4, 0.8) : rr(3, 7),
        rest: false
      });
    });
    W_.g.visible = false;
  }
}
function pmPieces(dt) {
  for (const p of G.m.pieces || []) {
    if (p.rest) continue;
    p.vy -= 9.8 * dt;
    const dh = p.vy * dt;
    p.h += dh;
    p.m.position.x += p.vx * dt;
    p.m.position.z += p.vz * dt;
    p.m.position.y += dh;
    p.m.rotateOnWorldAxis(p.w, p.ws * dt);
    if (p.h <= p.h0 && p.vy < 0) {
      if (Math.abs(p.vy) > 3) {
        p.vy = -p.vy * 0.25;
        p.vx *= 0.5;
        p.vz *= 0.5;
        p.ws *= 0.4;
      } else p.rest = true;
    }
  }
}
MISSIONS.perim = {
  id: 'perim',
  n: 7,
  title: 'Héroes',
  hud: 'Llevar a los heridos al edificio y, de noche, llegar al Super 6-4',
  phase: 'dusk',
  hour: 17.25,
  sunHour: 17.3,
  crashed: ['s61', 's64'],
  place: 'Del Super 6-1 a la segunda zona de impacto',
  squadTxt: 'Rangers + Delta',
  date: '3 OCT 1993',
  summary:
    'El convoy se ha ido. Escoltar a los heridos hasta un edificio calle arriba del Super 6-1 y, ya de noche, cruzar con Delta y visores hasta el Super 6-4 para volarlo.',
  text: '17:15. Atardece sobre el Super 6-1. El convoy se ha ido y no va a volver. Hay demasiados heridos para quedarse en la calle: los Rangers los llevarán en camillas hasta un edificio al norte del arco mientras el resto los cubre. Cuando caiga la noche, Hoot saldrá con su equipo de Delta hacia el Super 6-4.',
  start: [PM_START.x, PM_START.z],
  cam: [S61.x - 4, S61.z - 8, 11],
  civ: [S61.x - 30, S61.z],
  spawn() {
    const hoot = Object.assign({}, DELTA[1], DSPEC, {
      name: 'Sgto. 1º Hoot Gibson',
      role: 'Jefe de equipo',
      kit: 'radio'
    });
    const lead = (L_, role) => L_.map((s, i) => Object.assign(s, i === 0 ? { role, kit: 'radio' } : {}));
    spawnForce([
      {
        name: D_B,
        role: 'Escolta · luego hacia el 6-4',
        kind: 'delta',
        specs: [hoot].concat(deltaSpecs(6).slice(2)),
        at: [363.8, 313.4]
      },
      {
        name: 'Romeo 4-1',
        role: 'Rangers · escolta y camillas',
        kind: 'chalk',
        specs: rangerSpecs(['Sgto. Matt Eversmann', 'Esp. John Waddell']).map((s, i) =>
          Object.assign(s, i === 0 ? { role: 'Jefe · radio', kit: 'radio' } : {})
        ),
        at: [369.5, 290.5]
      },
      {
        name: 'Romeo 1-1',
        role: 'Rangers · cobertura',
        kind: 'chalk',
        specs: lead(chalkSpecs(0), 'Jefe de compañía'),
        at: [386.4, 326.9]
      }
    ]);
    // donde terminó Wolcott: Delta en la azotea suroeste, Romeo 4-1 en el arco y Romeo 1-1 en la azotea sureste
    const roofOf = (x, z) => {
      const b = bAt(Math.floor(x), Math.floor(z));
      return b >= 0 ? BLDS[b] : null;
    };
    const bSO = roofOf(363.8, 313.4),
      bSE = roofOf(386.4, 326.9);
    gLive(grpN(D_B)).forEach(u => {
      if (bSO) placeInB(u, bSO, 'roof');
      u.stance = 'crouch';
    });
    gLive(grpN('Romeo 1-1')).forEach(u => {
      if (bSE) placeInB(u, bSE, 'roof');
      u.stance = 'crouch';
    });
    grpN('Romeo 4-1').members.forEach((u, i) => {
      u.x = 368.7 + i * 1.3;
      u.z = 290.4;
      u.stance = 'crouch';
      u.face = 3.1;
    });
    // los dos chalks heridos van andando solos, despacio
    const W = (name, role, unit) => Object.assign({}, RANGERS[0], RSPEC, { name, role, unitName: unit, hp: 60 });
    G.m.pmW = [];
    [
      ['Sgto. Di Tomasso', 'Herido · camina', 'Romeo 3-1'],
      ['Esp. Kurth', 'Herido · camina', 'Romeo 3-1'],
      ['Cabo Yurek', 'Herido · camina', 'Romeo 3-1'],
      ['Sgto. Ruiz', 'Herido · camina', 'Romeo 2-1'],
      ['Esp. Galentine', 'Herido · camina', 'Romeo 2-1'],
      ['Cabo Thomas', 'Herido · camina', 'Romeo 2-1']
    ].forEach(([n, r, un], k) => {
      const u = npcUnit(W(n, r, un), PM_START.x - 1 + (k % 3) * 1.1, PM_START.z + 1 + ((k / 3) | 0) * 1.3, Math.PI);
      u.stance = 'crouch';
      u.hp = 60;
      G.m.pmW.push(u);
    });
    G.m.pmR = routeOf(PM_ROUTE);
    G.m.pmLead = 0;
    G.m.pmGo = false;
    G.m.pmHp = 100;
    G.m.pmS = [pmStretcher(0), pmStretcher(1)];
    G.m.pmRing = ringAt(PM_START.x, PM_START.z, 5, 0x3dff6a);
    pmColumn(0);
    // Rangers que se quedan en el Super 6-1: se ven, pero no se mandan
    G.m.stay = [];
    [
      [373.5, 297.5, 0],
      [381.5, 298, 0.8],
      [383.5, 306.5, 2.0],
      [372, 309, 3.6],
      [377.5, 312.5, 3.1]
    ].forEach(([x, z, f], k) => {
      const u = npcUnit(
        Object.assign({}, RANGERS[k % 6], RSPEC, {
          name: ['Tte. Larry Perino', 'Esp. Phipps', 'Esp. Rodriguez', 'Cabo Goodale', 'Esp. Heard'][k],
          role: 'Se queda en el 6-1',
          unitName: 'Romeo 2-2'
        }),
        x,
        z,
        f
      );
      u.stance = 'crouch';
      u.stay = true;
      u.order = { type: 'hold' };
      G.m.stay.push(u);
    });
    G.m.syms = [
      { label: 'ROMEO 2-2', pts: () => G.m.stay.filter(u => u.alive).map(u => [u.x, u.z]) },
      { label: 'ROMEO 4-1', pts: () => (G.m.pmS && G.m.pmS.length && G.m.pmS[0].grp.visible ? [pmMid()] : []) }
    ];
  },
  onStart() {
    pmIntro();
  },
  subs: [
    {
      text: 'Escoltar a los heridos hasta el edificio (ruta verde)',
      zone: { x: PM_DOOR.x, z: PM_DOOR.z, r: 5 },
      start: () => {
        G.m.pmG = dashGuide(PM_ROUTE.slice(1).concat([[PM_BLD.x, PM_BLD.z]]), 0x3dff6a, 0.28, 1.1, 0.7);
        pmWoundedGo();
        G.m.pmNext = G.t + 6;
      },
      tick: () => pmWatch(G.dt || 1 / 30),
      count: () =>
        Math.round((100 * (G.m.pmLead || 0)) / G.m.pmR.L) + ' % del camino · camillas ' + Math.round(G.m.pmHp) + ' %',
      done: () => pmArrived(),
      onDone: () => pmHouse()
    },
    {
      text: 'Delta: llegar de noche al Super 6-4 (ruta azul)',
      zone: { x: S64.x, z: S64.z, r: 9 },
      tick: () => pmFlares(),
      count: () => Math.round(Math.min(...gLive(grpN(D_B)).map(u => Math.hypot(u.x - S64.x, u.z - S64.z)))) + ' m',
      done: () => gLive(grpN(D_B)).some(u => Math.hypot(u.x - S64.x, u.z - S64.z) < 24),
      onDone: () => pmBlow()
    },
    { text: 'Volar el Super 6-4', zone: { x: S64.x, z: S64.z, r: 6 }, count: () => '', done: () => !!G.m.blown }
  ],
  opt: [{ text: 'Todos los heridos llegan al edificio', ok: () => (G.m.pmW || []).every(u => u.alive || u.inside) }]
};
