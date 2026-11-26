/* ====================================================================================================
 * sim/leaving-area.js
 *
 * Alejarse de la zona de la misión, en todas las misiones:
 *   - a unas tres manzanas del corredor de la misión, C2 avisa por radio que regresen;
 *   - cuanto más se alejan, más milicia les cae encima, desde delante y por los flancos;
 *   - muy lejos, un último aviso y, si siguen, una salva de RPG desde los tejados acaba con la unidad.
 *
 * La zona es el corredor que une el punto de partida con todos los objetivos de la misión (cada uno con su radio),
 * más los derribos, la ruta de las columnas de vehículos y los propios vehículos.
 * ================================================================================================== */

const OOB = {
  warn: 55, // ~3 manzanas (unos 80 m) fuera del corredor: aviso de C2 y empiezan los refuerzos
  rpg: 110, // ~6 manzanas: último aviso y, a los pocos segundos, la salva de RPG
  cap: 40 // milicianos de refuerzo vivos a la vez, como mucho
};
// segmentos [x1, z1, x2, z2, r]: un punto es un segmento de longitud cero
function oobZone() {
  const S = [],
    pts = [];
  const add = (x, z, r) => {
    if (x == null || z == null || !isFinite(x) || !isFinite(z)) return;
    pts.push([x, z, r || 0]);
  };
  if (MIS.start) add(MIS.start[0], MIS.start[1], 10);
  for (const s of MIS.subs || []) {
    let z = null;
    try {
      z = s.zone;
    } catch (e) {
      z = null;
    }
    if (z) add(z.x, z.z, z.r);
  }
  // el corredor de objetivos: del punto de partida al primero, del primero al segundo...
  for (let k = 1; k < pts.length; k++) S.push([pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], Math.max(pts[k - 1][2], pts[k][2])]);
  for (const p of pts) S.push([p[0], p[1], p[0], p[1], p[2]]);
  for (const c of MIS.crashed || []) if (LM[c]) S.push([LM[c].x, LM[c].z, LM[c].x, LM[c].z, 14]);
  for (const C of CONVOYS || []) {
    if (!C._oob) {
      C._oob = [];
      for (let s = 0; s <= C.L; s += 12) C._oob.push(polyAt(C, s));
    }
    for (let k = 1; k < C._oob.length; k++) S.push([C._oob[k - 1][0], C._oob[k - 1][1], C._oob[k][0], C._oob[k][1], 10]);
    for (const v of C.veh) if (v.x != null && v.alive !== false) S.push([v.x, v.z, v.x, v.z, 12]);
  }
  if (MIS.area) for (const a of MIS.area) S.push([a.x, a.z, a.x, a.z, a.r || 0]); // una misión puede ampliar su zona
  return S;
}
// cuánto está (x,z) fuera de la zona y hacia qué punto de ella queda lo más cerca
function oobDist(x, z, S) {
  let best = 1e9,
    bx = x,
    bz = z;
  for (const [x1, z1, x2, z2, r] of S) {
    const dx = x2 - x1,
      dz = z2 - z1,
      L2 = dx * dx + dz * dz;
    const t = L2 > 1e-6 ? clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1) : 0,
      px = x1 + dx * t,
      pz = z1 + dz * t,
      d = Math.hypot(x - px, z - pz) - r;
    if (d < best) {
      best = d;
      bx = px;
      bz = pz;
    }
  }
  return [Math.max(0, best), bx, bz];
}
function oobActive() {
  return (
    MIS &&
    G &&
    G.started &&
    !G.over &&
    MIS.id !== 'attract' &&
    MIS.id !== 'tutorial' &&
    !MIS.noArea &&
    !CINE.on &&
    !(typeof FLIGHT !== 'undefined' && FLIGHT.on) &&
    IRN &&
    IRN.groups &&
    IRN.groups.length
  );
}
function updLeavingArea(dt) {
  if (!oobActive()) return;
  G.oobT = (G.oobT || 0) - dt;
  if (G.oobT > 0) return;
  G.oobT = 0.5;
  const S = oobZone();
  if (!S.length) return;
  const st = G.oob || (G.oob = {});
  IRN.groups.forEach((g, gi) => {
    const L = g.members.filter(u => u.alive && !u.mounted && !u.ride && !u.medevac);
    const R = st[gi] || (st[gi] = { on: false, wave: 0, warnT: -99, rpgT: 0, fired: false });
    if (!L.length || R.fired) return;
    const cx = L.reduce((s, u) => s + u.x, 0) / L.length,
      cz = L.reduce((s, u) => s + u.z, 0) / L.length;
    const [d, nx, nz] = oobDist(cx, cz, S);
    // de vuelta en la zona (con un margen, para no avisar dos veces por pisar la raya)
    if (d < OOB.warn - 10) {
      if (R.on) say('C2', `${g.name}, les vemos de vuelta en la zona. Continúen con la misión.`, 'hq');
      R.on = false;
      R.rpgT = 0;
      return;
    }
    if (d < OOB.warn) return;
    const ang = Math.atan2(cz - nz, cx - nx); // hacia fuera de la zona: por donde se están yendo
    if (!R.on || G.t - R.warnT > 45) {
      if (d < OOB.rpg || R.on)
        say('C2', `${g.name}, atención: se están alejando de la zona objetivo. ¡Regresen inmediatamente!`, 'hq', true);
      if (!R.on) autoPause('se están alejando de la zona objetivo');
      R.warnT = G.t;
      R.on = true;
      R.wave = Math.max(R.wave, G.t + 6);
    }
    // refuerzos: cuanto más lejos, más gente y más a menudo
    const k = clamp((d - OOB.warn) / (OOB.rpg - OOB.warn), 0, 1);
    if (G.t >= R.wave) {
      R.wave = G.t + 20 - 11 * k;
      oobWave(g, L, cx, cz, ang, k);
    }
    // muy lejos: último aviso y la salva
    if (d >= OOB.rpg) {
      if (!R.rpgT) {
        R.rpgT = G.t + 6;
        say('C2', `¡${g.name}, están completamente fuera del perímetro, sin apoyo! ¡Den media vuelta ya!`, 'hq', true);
      } else if (G.t >= R.rpgT) {
        R.fired = true;
        oobSalvo(g, L, cx, cz, ang);
      }
    } else if (d < OOB.rpg - 8) R.rpgT = 0;
  });
}
// una oleada de milicia que les cierra el paso por delante y, si siguen alejándose, también por los flancos
function oobWave(g, L, cx, cz, ang, k) {
  const vivos = them.filter(e => e.alive && e.tag === 'oob').length;
  if (vivos >= OOB.cap) return;
  G.alert = true;
  const n = Math.min(OOB.cap - vivos, 6 + Math.round(k * 8));
  const lados = k > 0.35 ? [0, 1.2, -1.2] : [0, rnd() < 0.5 ? 1.1 : -1.1];
  const goal = { x: cx, z: cz };
  let hechos = 0;
  lados.forEach((da, li) => {
    const m = li === lados.length - 1 ? n - hechos : Math.round(n / lados.length);
    const a = ang + da + rr(-0.25, 0.25),
      dist = rr(30, 40),
      bx = cx + Math.cos(a) * dist,
      bz = cz + Math.sin(a) * dist;
    for (let q = 0; q < m; q++) {
      const e = foe(bx + rr(-5, 5), bz + rr(-5, 5), 'wave', 'oob', CAMP_ESPEC);
      e.goal = { x: goal.x + rr(-4, 4), z: goal.z + rr(-4, 4) };
      hechos++;
    }
  });
  // los que ya venían de antes van ahora a donde está la unidad
  for (const e of them) if (e.alive && e.tag === 'oob') e.goal = { x: cx + rr(-4, 4), z: cz + rr(-4, 4) };
  const dir = compass(Math.cos(ang), Math.sin(ang)),
    nm = g.name;
  const txt =
    k > 0.35
      ? pick([
          `${nm}, mucha gente armada convergiendo sobre vosotros por el ${dir} y los flancos. ¡Salid de ahí!`,
          `${nm}, os están rodeando. Grupos grandes por el ${dir} y por los dos lados.`,
          `¡${nm}, no paran de salir de las casas! ¡Volved hacia la zona!`
        ])
      : pick([
          `${nm}, milicia concentrándose al ${dir} de vuestra posición.`,
          `${nm}, veo armados moviéndose hacia vosotros desde el ${dir}.`,
          `${nm}, más gente armada saliendo a la calle al ${dir}. Vienen a por vosotros.`
        ]);
  sched.push({ at: G.t + 2.5, fn: () => say('Super 6-4', txt, 'air', true), say: 1 });
}
// la salva: un cohete por hombre desde los tejados y callejones de alrededor; no queda nadie
function oobSalvo(g, L, cx, cz, ang) {
  say('Super 6-4', `¡RPG! ¡RPG! ¡Varios lanzamientos sobre ${g.name}!`, 'air', true);
  L.forEach((u, i) => {
    sched.push({
      at: G.t + 0.6 + i * 0.32,
      fn: () => {
        if (!u.alive) return;
        const [ox, oy, oz] = oobLauncher(u, ang),
          ty = (u.elev || 0) + 0.9,
          D = Math.hypot(u.x - ox, ty - oy, u.z - oz) || 1,
          h = {
            x: u.x,
            y: ty,
            z: u.z,
            nx: (ox - u.x) / D,
            ny: (oy - ty) / D,
            nz: (oz - u.z) / D,
            m: -1,
            c: groundCol(u.x, u.z),
            e: null,
            dx: (u.x - ox) / D,
            dy: (ty - oy) / D,
            dz: (u.z - oz) / D
          };
        launchRocket(ox, oy, oz, h, null, u); // impacto directo
        rpgBackblast(ox, oy, oz, Math.atan2(u.x - ox, u.z - oz));
        rpgSnd(ox, oz, false);
        // por si el impacto no basta (más vida, chaleco...): cuando llega el cohete, no se levanta
        sched.push({
          at: G.t + Math.max(0.12, D / 30) + 0.05,
          fn: () => {
            if (u.alive) damage(u, 999, null);
          }
        });
      }
    });
  });
  sched.push({
    at: G.t + 0.6 + L.length * 0.32 + 2.5,
    fn: () => say('C2', `Hemos perdido el contacto con ${g.name}.`, 'hq', true),
    say: 1
  });
}
// de dónde sale cada cohete: un tejado o un callejón a 18-30 de distancia con línea de tiro limpia hasta el hombre
function oobLauncher(u, ang) {
  for (let t = 0; t < 24; t++) {
    const a = ang + rr(-1.8, 1.8),
      d = rr(18, 30),
      x = u.x + Math.cos(a) * d,
      z = u.z + Math.sin(a) * d,
      i = Math.floor(x),
      j = Math.floor(z);
    if (!inB(i, j)) continue;
    const k = idx(i, j);
    if (grid[k] === 1 && topH[k] > 1) return [x, topH[k] + 1.1, z]; // desde un tejado se ve todo
    if (walk(i, j) && los(x, z, u.x, u.z)) return [x, 1.2, z];
  }
  const a = ang + rr(-0.6, 0.6);
  return [u.x + Math.cos(a) * 16, 6, u.z + Math.sin(a) * 16];
}
