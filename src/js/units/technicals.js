/* ====================================================================================================
 * units/technicals.js
 *
 * Técnicas de la milicia: un pick-up con una ametralladora pesada en la caja y un hombre en ella
 * ================================================================================================== */

let TECHS = [];
const TECH_PIV = [0.17, 1.0, -0.85];
function techSpawn(pts, tag, o) {
  o = o || {};
  const T_ = Object.assign(routeOf(pts), {
    s: 0,
    v: 0,
    vmax: o.vmax || 3.4,
    stopAt: o.stopAt || 0,
    holdT: 0,
    alive: true,
    tag
  });
  const g = new T.Group(),
    body = new T.Group(),
    piv = new T.Group();
  g.add(body);
  piv.position.set(...TECH_PIV);
  body.add(piv);
  world.add(g);
  withModel('tech', M_ => {
    if (!M_.fix) {
      M_.fix = true;
      M_.geos.gun.translate(-TECH_PIV[0], -TECH_PIV[1], -TECH_PIV[2]);
      M_.mat.color.setRGB(1.15, 1.1, 1.05);
    }
    const b = lodMesh(M_.geos.body, M_.mat);
    b.castShadow = b.receiveShadow = true;
    body.add(b);
    const q = new T.Mesh(M_.geos.gun, M_.mat);
    q.castShadow = true;
    piv.add(q);
  });
  T_.g = g;
  T_.body = body;
  T_.piv = piv;
  const p = polyAt(T_, 0);
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = p[2];
  const e = foe(
    p[0],
    p[1],
    'post',
    tag || 'tech',
    Object.assign(
      { name: 'Ametrallador · técnica', burst: 5, cool: 0.9, supp: 30, acc: 0.2, hp: 85, gun: 'ak' },
      o.gunner || {}
    )
  );
  e.tech = T_;
  e.stance = 'stand';
  e.elev = 0.62;
  T_.gunner = e;
  TECHS.push(T_);
  techStep(T_, 0);
  return T_;
}
function techStep(T_, dt) {
  const e = T_.gunner;
  if (T_.alive && !e.alive) {
    T_.alive = false;
    T_.v = 0;
    emitters.push({
      x: T_.g.position.x,
      z: T_.g.position.z,
      y: 1,
      rate: 30,
      life: 6,
      vy: 1.2,
      s0: 0.3,
      s1: 1.4,
      fire: 0.3,
      sp: 0.5,
      acc: 0,
      until: G.t + 40
    });
  }
  if (e.alive && (e.auto || e.firing > 0)) T_.holdT = G.t + 6;
  const want = T_.alive && G.t > T_.holdT ? clamp((T_.L - T_.stopAt - T_.s) * 0.8, 0, T_.vmax) : 0;
  T_.v += clamp(want - T_.v, -5 * dt, 1.6 * dt);
  if (T_.v < 0) T_.v = 0;
  T_.s = Math.min(T_.L, T_.s + T_.v * dt);
  const [x, z, hd] = polyAt(T_, T_.s),
    g = T_.g;
  g.position.set(x, T_.v > 0.3 ? Math.sin(G.t * 14) * 0.02 : 0, z);
  let d = hd - g.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  g.rotation.y += dt > 0 ? d * Math.min(1, dt * 3) : d;
  // el tirador va de pie en la caja detrás del arma; el arma sigue hacia donde él mira
  const c = Math.cos(g.rotation.y),
    s = Math.sin(g.rotation.y),
    bx = TECH_PIV[0] - 0.05,
    bz = TECH_PIV[2] - 0.45;
  if (e.alive) {
    e.x = x + bx * c + bz * s;
    e.z = z - bx * s + bz * c;
    e.vx = e.vz = 0;
    e.path = [];
    if (!e.auto && !(e.firing > 0)) e.face = g.rotation.y;
  }
  let a = (e.alive ? e.face : g.rotation.y) - g.rotation.y;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  T_.piv.rotation.y += (a - T_.piv.rotation.y) * Math.min(1, dt * 6);
}
// una técnica que baja por las calles hacia un punto y se para antes de llegar para disparar
function techToward(sx, sz, gx, gz, tag, o) {
  const a = nearestFree(Math.floor(sx), Math.floor(sz)),
    b = nearestFree(Math.floor(gx), Math.floor(gz)),
    path = findPath(a[0], a[1], b[0], b[1]);
  if (!path || path.length < 6) return null;
  const pts = [[a[0] + 0.5, a[1] + 0.5]].concat(
    path.filter((_, i) => i % 3 === 2 || i === path.length - 1).map(c => [c[0] + 0.5, c[1] + 0.5])
  );
  return techSpawn(pts, tag, Object.assign({ stopAt: 14 }, o || {}));
}
// milicia en las azoteas: disparan desde detrás del pretil de la azotea libre más cercana
function roofFoe(x, z, tag, extra) {
  const cand = BLDS.filter(b => !b.ring && b.top > 1 && b.w >= 3 && b.d >= 3)
    .map(b => [Math.hypot(b.x + b.w / 2 - x, b.y + b.d / 2 - z), b])
    .sort((p, q) => p[0] - q[0])
    .slice(0, 5);
  for (const [, b] of cand) {
    const slots = bSlots(b, 'roof'),
      used = new Set(them.filter(e => e.alive && e.inB && e.inB.b === b.id).map(e => e.inB.slot));
    const k = slots.findIndex((s_, i) => !used.has(i));
    if (k < 0) continue;
    const e = foe(slots[k][0], slots[k][1], 'post', tag, Object.assign({}, CAMP_ESPEC, extra || {})),
      door = nearestFree(Math.floor(slots[k][0]), Math.floor(slots[k][1]));
    e.inB = { b: b.id, level: 'roof', slot: k, door };
    e.x = slots[k][0];
    e.z = slots[k][1];
    e.elev = b.top;
    e.stance = 'crouch';
    e.roof = true;
    return e;
  }
  return null;
}
function waveGoal(cx, cz, ang, n, tag, dist, goal, who, extra) {
  G.alert = true;
  dist = dist || 40;
  const bx = cx + Math.cos(ang) * dist,
    bz = cz + Math.sin(ang) * dist;
  for (let k = 0; k < n; k++) {
    const e = foe(bx + rr(-4, 4), bz + rr(-4, 4), 'wave', tag, extra || CAMP_ESPEC);
    if (goal) e.goal = { x: goal.x + rr(-4, 4), z: goal.z + rr(-4, 4) };
  }
  if (n >= 4 && !CINE.on && TECHS.filter(t => t.alive).length < 2 && rnd() < 0.3) {
    const T_ = techToward(bx, bz, goal ? goal.x : cx, goal ? goal.z : cz, tag);
    if (T_ && who !== false)
      sched.push({
        at: G.t + 1.5,
        fn: () => say(who || 'Super 6-4', 'Una técnica con ametralladora pesada viene con ellos.', 'air', true),
        say: 1
      });
  }
  const dir = compass(Math.cos(ang), Math.sin(ang));
  if (who !== false) say(who || 'Super 6-4', `Unos ${n} armados por el ${dir}, vienen hacia vosotros.`, 'air', true);
  autoPause('ataque desde el ' + dir);
}
/* Una defensa con reloj y oleadas desde lados que cambian */
function holdWaves(text, secs, every, n, cx, cz, o) {
  o = o || {};
  return {
    text,
    zone: { x: cx, z: cz, r: o.r || 16 },
    start() {
      G.holdEnd = G.t + secs;
      G.nextWave = G.t + (o.first || 15);
      G.waveN = 0;
      if (o.start) o.start();
    },
    tick() {
      if (G.t >= G.nextWave && G.t < G.holdEnd - 20) {
        G.nextWave = G.t + every;
        G.waveN++;
        waveGoal(cx, cz, rnd() * 6.283, n + Math.min(4, G.waveN >> 1), 'hold', o.dist || 42, { x: cx, z: cz }, o.who);
      }
      if (o.tick) o.tick();
    },
    count: () => 'quedan ' + fmtLeft(G.holdEnd - G.t),
    done: () => G.t >= G.holdEnd && (!o.done || o.done()),
    radio: o.radio,
    onDone: o.onDone
  };
}
