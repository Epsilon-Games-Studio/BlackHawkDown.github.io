/* ====================================================================================================
 * missions/tutorial/training-ground.js
 *
 * Tutorial: el Romeo 4-1 en el campo de instrucción junto a la playa, al otro lado de la pista de los hangares de la TFR
 * ================================================================================================== */

'use strict';

// marco del aeropuerto (u a lo largo de la pista, v hacia el mar); la rejilla se trae aquí solo para esta misión
const TZ = { u0: -74, u1: -30, v0: 22, v1: 62, g0: 30, g1: 36, div: 42 }; // la puerta (g0..g1, a lo largo de v) está en el extremo oeste, mirando a la pista de tierra
// la pista de tierra con rodadas desde la puerta, cruzando el descampado hacia la pista de aterrizaje
const TZ_TRACK = [
  [-74.5, 33],
  [-86, 32.4],
  [-97, 30],
  [-106, 25.5],
  [-112, 19.5],
  [-115.5, 12.5]
];
let TZTRACK = [];
const TZ_START = [-63.5, 33],
  TZ_STAGE = [-70, 31.6],
  TZ_BLD = { u: -56.5, v: 26, h: 2.25, top: 1.9 },
  TZ_TGT = [
    [-35.5, 27],
    [-35.5, 32],
    [-35.5, 37]
  ],
  TZ_FWD = [-45.6, 32],
  TZ_CHAIN = [
    [-48, 34],
    [-48, 37],
    [-46.2, 39.6]
  ];
const TZ_SAND = [
  [-59, 29.5, 33.5],
  [-59, 35.5, 39.5],
  [-51, 26, 30],
  [-51, 33, 37],
  [-44, 24.5, 28.5],
  [-44, 31, 35],
  [-44, 38, 41]
]; // [u, v0, v1]: líneas de sacos terreros cruzando el circuito
const tzW = (u, v) => {
  const p = AIRP(u, v);
  return { x: p[0], z: p[1] };
};
// todas las celdas de la rejilla cuyo centro cae dentro de un rectángulo del marco del aeropuerto
function tzCells(u0, u1, v0, v1, fn) {
  const c = [AIRP(u0, v0), AIRP(u1, v0), AIRP(u0, v1), AIRP(u1, v1)];
  const x0 = Math.floor(Math.min(...c.map(p => p[0]))),
    x1 = Math.ceil(Math.max(...c.map(p => p[0]))),
    z0 = Math.floor(Math.min(...c.map(p => p[1]))),
    z1 = Math.ceil(Math.max(...c.map(p => p[1])));
  for (let j = z0; j <= z1; j++)
    for (let i = x0; i <= x1; i++) {
      const [u, v] = airUV(i + 0.5, j + 0.5);
      if (u >= u0 && u <= u1 && v >= v0 && v <= v1 && inB(i, j)) fn(i, j, idx(i, j));
    }
}
const tzBlock = (u0, u1, v0, v1) =>
  tzCells(u0, u1, v0, v1, (i, j, k) => {
    if (grid[k] === 0) grid[k] = 2;
  });
function tzCover(u0, u1, v0, v1, kind) {
  const o = { kind, val: COVER_VAL[kind], cells: [], i: 0, j: 0, dir: 'x', fuel: false, g: null };
  tzCells(u0, u1, v0, v1, (i, j, k) => {
    if (grid[k] !== 0) return;
    grid[k] = 2;
    cov[k] = o;
    o.cells.push(k);
    if (o.cells.length === 1) {
      o.i = i;
      o.j = j;
    }
  });
  return o;
}
// un muro de sacos terreros a lo largo de u (alongU) o de v, de tres hiladas de alto
function tzBags(u0, u1, v0, v1, h) {
  const alongU = u1 - u0 >= v1 - v0,
    L = alongU ? u1 - u0 : v1 - v0,
    n = Math.max(1, Math.round(L / 0.42)),
    st = L / n,
    cu = (u0 + u1) / 2,
    cv = (v0 + v1) / 2,
    rows = h || 3;
  MAT = M.BAG;
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < n; k++) {
      const t = (alongU ? u0 : v0) + st * (k + 0.5 + (r % 2 ? 0.5 : 0));
      if (t > (alongU ? u1 : v1) - 0.1) continue;
      const u = alongU ? t : cu,
        v = alongU ? cv : t,
        sx = alongU ? st * 0.96 : 0.44,
        sz = alongU ? 0.44 : st * 0.96;
      rb(u, v, 0.1 + r * 0.19, sx, 0.2, sz, jit(r % 2 ? 0xa8956a : 0xb4a173, 0.08), { ry: AIR_RY + rr(-0.05, 0.05) });
    }
}
// una red de camuflaje: parches de hojas con huecos, combada entre los postes; el botón de tejados la quita
function tzNet(u, v, su, sv, y) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  for (let k = 0; k < 400; k++) {
    c.fillStyle = pick(['#5a6340', '#6b6a46', '#4a5236', '#7d7150', '#575b3a']);
    c.beginPath();
    const x = rnd() * 256,
      y_ = rnd() * 256,
      r = rr(4, 11);
    for (let q = 0; q < 6; q++) {
      const a = (q / 6) * 6.283 + rnd() * 0.6;
      c.lineTo(x + Math.cos(a) * r * rr(0.5, 1.2), y_ + Math.sin(a) * r * rr(0.5, 1.2));
    }
    c.fill();
  }
  c.strokeStyle = 'rgba(40,40,30,.9)';
  c.lineWidth = 1;
  for (let k = 0; k <= 256; k += 16) {
    c.beginPath();
    c.moveTo(k, 0);
    c.lineTo(k, 256);
    c.moveTo(0, k);
    c.lineTo(256, k);
    c.stroke();
  }
  const tex = new T.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(su / 6, sv / 6);
  const geo = new T.PlaneGeometry(su, sv, 10, 12);
  geo.rotateX(-Math.PI / 2);
  const P_ = geo.attributes.position;
  for (let k = 0; k < P_.count; k++) {
    const x = P_.getX(k) / (su / 2),
      z = P_.getZ(k) / (sv / 2);
    P_.setY(k, -0.28 * (1 - x * x) * (1 - z * z) + (rnd() - 0.5) * 0.06);
  }
  geo.computeVertexNormals();
  const mat = new T.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: T.DoubleSide });
  const m = new T.Mesh(geo, mat);
  const p = AIRP(u, v);
  m.position.set(p[0], y, p[1]);
  m.rotation.y = AIR_RY;
  m.castShadow = true;
  m.receiveShadow = true;
  m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  world.add(m);
  return m;
}
// concertina: bucles sueltos de alambre de cuchillas a lo largo de una línea
function tzCoil(a, b, c, alongU) {
  MAT = M.METAL;
  for (let t = a + 0.2; t < b; t += 0.42)
    for (const s of [-1, 1]) {
      const u = alongU ? t : c,
        v = alongU ? c : t;
      rb(
        u,
        v,
        0.42,
        0.025,
        0.82,
        0.025,
        0x6e6e68,
        alongU ? { rx: s * 0.72 + rr(-0.1, 0.1), ord: 'YXZ' } : { rz: s * 0.72 + rr(-0.1, 0.1), ord: 'YXZ' }
      );
    }
  for (const y of [0.06, 0.8]) {
    const u = alongU ? (a + b) / 2 : c,
      v = alongU ? c : (a + b) / 2;
    rb(u, v, y, alongU ? b - a : 0.025, 0.025, alongU ? 0.025 : b - a, 0x6e6e68);
  }
}
// las dianas blancas: tableros de contrachapado sobre dos estacas, con una silueta negra y anillos
let TZ_TEX = null;
function tzTex() {
  if (TZ_TEX) return TZ_TEX;
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 96;
  const c = cv.getContext('2d');
  c.fillStyle = '#f2efe6';
  c.fillRect(0, 0, 64, 96);
  c.fillStyle = '#1e1e1c';
  c.beginPath();
  c.arc(32, 22, 10, 0, 6.29);
  c.fill();
  c.fillRect(14, 34, 36, 62);
  c.fillRect(22, 30, 20, 6);
  c.strokeStyle = '#f2efe6';
  c.lineWidth = 2;
  for (const r of [6, 13, 20]) {
    c.beginPath();
    c.arc(32, 58, r, 0, 6.29);
    c.stroke();
  }
  c.fillStyle = '#c23a2a';
  c.beginPath();
  c.arc(32, 58, 3, 0, 6.29);
  c.fill();
  TZ_TEX = new T.CanvasTexture(cv);
  return TZ_TEX;
}
function tzBoard(parent, y) {
  const g = new T.Group();
  parent.add(g);
  for (const s of [-1, 1]) box(0.07, y + 0.5, 0.07, 0x6a5236, s * 0.36, (y + 0.5) / 2, -0.05, g);
  box(0.86, 1.12, 0.04, 0xe8e4d8, 0, y + 0.2, 0, g);
  const f = new T.Mesh(new T.PlaneGeometry(0.82, 1.08), new T.MeshLambertMaterial({ map: tzTex() }));
  f.position.set(0, y + 0.2, 0.025);
  f.castShadow = true;
  g.add(f);
  return g;
}
function tzTarget(u, v) {
  const p = tzW(u, v),
    e = foe(p.x, p.z, 'post', 'tg', { name: 'Diana', hp: 100, acc: 0, noFire: true });
  e.x = p.x;
  e.z = p.z;
  e.dummy = true;
  e.stance = 'stand';
  e.face = AIR_RY - PH;
  e.m.root.traverse(o => {
    if (o !== e.m.root && o !== e.m.hb && o !== e.m.mark && o.isMesh) o.visible = false;
  });
  e.m.tg = tzBoard(e.m.root, 0.62);
  return e;
}
function tzStatic(u, v, ry) {
  const p = tzW(u, v),
    g = new T.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = ry;
  world.add(g);
  tzBoard(g, 0.62);
  return g;
}
function buildTrainingGround() {
  // la rejilla se mueve al aeródromo, vacía: todo lo que necesitan los soldados se escribe más abajo
  ORX = Math.floor(AIR.x) - 384;
  ORZ = Math.floor(AIR.z) - 384;
  grid.fill(0);
  topH.fill(0);
  cov.fill(null);
  reserved.fill(0);
  ground.fill(0);
  BID.fill(-1);
  BLDS = [];
  HG = new Array(W * H);
  for (const A of [STR, SVW, SHW]) A.fill(0);
  for (const A of [SVX, SHZ]) A.fill(-1);
  const C0 = tzW(-52, 42);
  for (let j = Math.floor(C0.z) - 110; j <= C0.z + 110; j++)
    for (let i = Math.floor(C0.x) - 110; i <= C0.x + 110; i++)
      if (inB(i, j) && coastS(i + 0.5, j + 0.5) > -3) grid[idx(i, j)] = 3;
  TZONE = TZ;
  const Z = TZ;
  // valla: postes, dos hilos y concertina enrollada por fuera; barreras new jersey en el lado que da a la pista; el hueco de la puerta queda abierto
  const fenceU = (u0, u1, v, out) => {
    tzBlock(u0, u1, v - 0.55, v + 0.55);
    for (let u = u0; u < u1 - 0.1; u += 4) {
      const e = Math.min(u + 4, u1);
      MAT = M.METAL;
      rb(u, v, 0.95, 0.1, 1.9, 0.1, 0x6a6a64);
      rb((u + e) / 2, v, 1.3, e - u, 0.04, 0.04, 0x8a8a84);
      rb((u + e) / 2, v, 0.65, e - u, 0.04, 0.04, 0x8a8a84);
    }
    MAT = M.METAL;
    rb(u1, v, 0.95, 0.1, 1.9, 0.1, 0x6a6a64);
    tzCoil(u0, u1, v + out, true);
  };
  const fenceV = (v0, v1, u, out) => {
    tzBlock(u - 0.55, u + 0.55, v0, v1);
    for (let v = v0; v < v1 - 0.1; v += 4) {
      const e = Math.min(v + 4, v1);
      MAT = M.METAL;
      rb(u, v, 0.95, 0.1, 1.9, 0.1, 0x6a6a64);
      rb(u, (v + e) / 2, 1.3, 0.04, 0.04, e - v, 0x8a8a84);
      rb(u, (v + e) / 2, 0.65, 0.04, 0.04, e - v, 0x8a8a84);
    }
    MAT = M.METAL;
    rb(u, v1, 0.95, 0.1, 1.9, 0.1, 0x6a6a64);
    tzCoil(v0, v1, u + out, false);
  };
  fenceU(Z.u0, Z.u1, Z.v0, -1.3);
  fenceU(Z.u0, Z.u1, Z.v1, 1.3);
  fenceV(Z.v0, Z.g0, Z.u0, -1.3);
  fenceV(Z.g1, Z.v1, Z.u0, -1.3);
  fenceV(Z.v0, Z.v1, Z.u1, 1.3);
  for (let u = Z.u0 + 1.2; u < Z.u1 - 1; u += 2.3) {
    jersey(u, Z.v0 - 2.6, 1, true);
    tzBlock(u - 1.1, u + 1.1, Z.v0 - 3, Z.v0 - 2.2);
  }
  // la puerta: una barrera de brazo a rayas sobre su poste, la garita y la bandera
  const gp = tzW(Z.u0 - 0.5, Z.g0 - 0.3),
    gate = new T.Group();
  gate.position.set(gp.x, 0, gp.z);
  gate.rotation.y = AIR_RY - PH;
  world.add(gate);
  box(0.26, 1.1, 0.26, 0xd8d4c8, 0, 0.55, 0, gate);
  box(0.3, 0.14, 0.3, 0xb02a1c, 0, 1.05, 0, gate);
  const arm = new T.Group();
  arm.position.set(0, 0.98, 0);
  gate.add(arm);
  for (let k = 0; k < 8; k++) box(0.74, 0.1, 0.1, k % 2 ? 0xb02a1c : 0xf0ece0, 0.5 + k * 0.74, 0, 0, arm);
  box(0.1, 0.7, 0.1, 0x6a6a64, Z.g1 - Z.g0 + 0.6, 0.35, 0, gate);
  G.m.arm = arm;
  G.m.armA = 0;
  G.m.armT = 0;
  {
    const hu = -76.1,
      hv = 38.5; // la garita justo fuera, junto a la puerta
    MAT = M.WOOD;
    rb(hu, hv, 1.15, 2.3, 2.3, 2.3, 0xc8c0aa);
    MAT = M.TIN;
    rb(hu, hv, 2.36, 2.8, 0.12, 2.8, 0x7a7a72);
    MAT = M.GLASS;
    rb(hu - 1.18, hv, 1.45, 0.04, 0.6, 1.2, 0x2b2925);
    rb(hu, hv - 1.18, 1.45, 1.2, 0.6, 0.04, 0x2b2925);
    MAT = M.WOOD;
    rb(hu, hv + 1.18, 0.9, 0.8, 1.7, 0.05, 0x5a4a38);
    tzBlock(hu - 1.3, hu + 1.3, hv - 1.3, hv + 1.3);
  }
  {
    const f = tzW(-75.8, 41.6);
    makeFlag(f.x, f.z, 6.5, 0, 'us');
    tzBlock(-76.2, -75.4, 41.2, 42);
  }
  MAT = M.BAG;
  tzBags(-77.2, -76.6, 27, 29.2, 2);
  tzBlock(-77.4, -76.4, 26.8, 29.4);
  // la pista de tierra: rodadas desde la puerta hacia la pista de aterrizaje, sin matorral
  TZTRACK = [];
  let pos_ = 0;
  for (let k = 0; k < TZ_TRACK.length - 1; k++) {
    const a = tzW(...TZ_TRACK[k]),
      b = tzW(...TZ_TRACK[k + 1]);
    TZTRACK.push([a.x, a.z, b.x, b.z, 3.2, false, pos_]);
    pos_ += Math.hypot(b.x - a.x, b.z - a.z);
  }

  // Humvees: uno aparcado fuera junto a la alambrada y otro dentro junto a la separación
  humveeAt(-79.6, 27.2, AIR_RY + PH);
  tzCover(-81.8, -77.4, 26.5, 27.9, 'car');
  humveeAt(-70.6, 39.4, AIR_RY + PH);
  tzCover(-72.6, -68.6, 38.7, 40.1, 'car');
  // la separación: un muro de sacos por el medio, con un hueco junto a la entrada
  tzBags(-71, Z.u1, Z.div - 0.3, Z.div + 0.3);
  tzCover(-71, Z.u1, Z.div - 0.55, Z.div + 0.55, 'sandbag');
  // el lado del circuito: el bloque gris con azotea utilizable, líneas de sacos a distintas distancias y tres dianas blancas antes del talud
  {
    const B_ = TZ_BLD,
      h = B_.h,
      id = BLDS.length,
      cells = [];
    tzCells(B_.u - h - 0.2, B_.u + h + 0.2, B_.v - h - 0.2, B_.v + h + 0.2, (i, j, k) => {
      grid[k] = 1;
      topH[k] = B_.top + 0.25;
      BID[k] = id;
      cells.push([i, j]);
    });
    const xs = cells.map(c => c[0]),
      zs = cells.map(c => c[1]),
      x0 = Math.min(...xs),
      z0 = Math.min(...zs);
    const pts = [];
    for (let a = -h + 0.6; a <= h - 0.6 + 0.01; a += 1.1)
      for (const [du, dv] of [
        [a, -h + 0.55],
        [a, h - 0.55],
        [-h + 0.55, a],
        [h - 0.55, a]
      ]) {
        const p = tzW(B_.u + du, B_.v + dv);
        if (!pts.some(q => Math.hypot(q[0] - p.x, q[1] - p.z) < 0.9)) pts.push([p.x, p.z]);
      }
    BLDS.push({
      id,
      x: x0,
      y: z0,
      w: Math.max(...xs) - x0 + 1,
      d: Math.max(...zs) - z0 + 1,
      top: B_.top,
      pts,
      name: 'Edificio de instrucción'
    });
    MAT = M.CONC;
    const g = 0x9c9c96,
      s = 2 * h;
    rb(B_.u, B_.v, B_.top / 2, s, B_.top, s, g, { b: id });
    rb(B_.u, B_.v, 0.2, s + 0.04, 0.4, s + 0.04, 0x84847e, { b: id });
    rb(B_.u, B_.v, B_.top + 0.03, s + 0.08, 0.08, s + 0.08, 0x8a8a84, { b: id });
    for (const [du, dv, su, sv] of [
      [0, -h + 0.06, s, 0.12],
      [0, h - 0.06, s, 0.12],
      [-h + 0.06, 0, 0.12, s],
      [h - 0.06, 0, 0.12, s]
    ])
      rb(B_.u + du, B_.v + dv, B_.top + 0.25, su, 0.4, sv, 0xa6a6a0, { b: id, roof: 1 });
    MAT = M.WOOD;
    rb(B_.u - h - 0.02, B_.v + 1, 0.62, 0.04, 1.2, 0.7, 0x4a3a2c, { b: id });
    MAT = M.GLASS;
    for (const dv of [-1.1, 1.1]) rb(B_.u + h + 0.02, B_.v + dv, 1.15, 0.04, 0.42, 0.6, 0x2b2925, { b: id });
    rb(B_.u, B_.v + h + 0.02, 1.15, 0.6, 0.42, 0.04, 0x2b2925, { b: id });
    MAT = M.METAL;
    for (const dv of [-0.25, 0.25])
      rb(B_.u - h - 0.08, B_.v - 1.3 + dv, B_.top / 2 + 0.3, 0.05, B_.top + 0.6, 0.05, 0x5a5a54);
    for (let y = 0.3; y < B_.top + 0.4; y += 0.32) rb(B_.u - h - 0.08, B_.v - 1.3, y, 0.05, 0.04, 0.5, 0x5a5a54);
  }
  for (const [u, a, b] of TZ_SAND) {
    tzBags(u - 0.3, u + 0.3, a, b);
    tzCover(u - 0.55, u + 0.55, a, b, 'sandbag');
  }
  MAT = M.STONE;
  rb(-31.6, 42, 0.65, 2.6, 1.3, Z.v1 - Z.v0 - 2, 0xc9b38c);
  rb(-31.6, 42, 1.35, 1.6, 0.3, Z.v1 - Z.v0 - 2.4, 0xc0a880);
  tzBlock(-33, -30.6, Z.v0 + 1, Z.v1 - 1);
  G.m.tg = TZ_TGT.map(([u, v]) => tzTarget(u, v));
  // el lado del galpón de tiro: una red de camuflaje haciendo sombra sobre la línea de tiro, un banco de sacos y otras tres dianas al fondo
  MAT = M.METAL;
  for (const u of [-70.5, -60.5]) for (const v of [45.5, 58.5]) rb(u, v, 1.25, 0.1, 2.5, 0.1, 0x5a5a50);
  G.m.net = tzNet(-65.5, 52, 10.8, 13.8, 2.45);
  tzBags(-63.2, -62.6, 46.6, 57.4, 2);
  tzCover(-63.45, -62.4, 46.6, 57.4, 'sandbag');
  MAT = M.WOOD;
  rb(-67.6, 56.6, 0.4, 1.6, 0.8, 0.8, 0x6a5a40);
  MAT = M.METAL;
  for (let k = 0; k < 3; k++) rb(-67.9 + k * 0.38, 56.6, 0.92, 0.3, 0.22, 0.5, 0x4e5a36);
  tzBlock(-68.5, -66.7, 56.1, 57.1);
  for (const v of [47.5, 51.5, 55.5]) tzStatic(-34.6, v, AIR_RY - PH);
  // tierra apisonada dentro, y ahí no crece nada
  G.m.zone = true;
}
// los soldados en la línea de tiro: dos disparando y el sargento mirando; sus balas pegan en los tableros del fondo
function tutTick(dt) {
  if (!G.m.range) return;
  tzLifeTick(dt);
  tzSun(dt);
  for (const b of G.m.buoys || []) {
    const t = G.t + b.userData.ph;
    b.position.y = -0.2 + Math.sin(t * 1.7) * 0.07 + Math.sin(t * 0.63) * 0.04;
    b.rotation.x = Math.sin(t * 1.3) * 0.13;
    b.rotation.z = Math.sin(t * 1.05 + 1) * 0.11;
  }
  for (const u of us)
    if (u.idle && u.alive) {
      u.sup = 0;
      if (!u.path.length) u.stance = 'stand';
    }
  for (const u of G.m.range.shoot) {
    u.rT = (u.rT == null ? rnd() * 2 : u.rT) - dt;
    u.sup = 0;
    u.stance = 'crouch';
    if (u.rT <= 0) {
      u.rT = rr(1.4, 3.2);
      const t = tzW(-34.6, u.lane);
      u.face = Math.atan2(t.x - u.x, t.z - u.z);
      u.firing = 0.6;
      burstFx(u, t.x + rr(-0.25, 0.25), rr(0.7, 1.2), t.z + rr(-0.25, 0.25), false);
    }
  }
  const sg = G.m.sgt;
  if (sg && sg.alive) {
    sg.sup = 0;
    if (!sg.path.length) sg.stance = 'stand';
  }
  if (G.m.guard) {
    G.m.guard.sup = 0;
    G.m.guard.stance = 'stand';
  }
  // el brazo de la barrera sube mientras pasa la escuadra y luego vuelve a bajar
  if (G.m.arm) {
    const want = G.m.armUp ? 1.35 : 0;
    G.m.armA += clamp(want - G.m.armA, -dt * 1.1, dt * 1.1);
    G.m.arm.rotation.z = G.m.armA;
  }
  // aquí hay fuego real, pero en el campo de instrucción nadie se queda sin balas
  for (const u of us) if (u.alive && !u.npc && u.ammo < u.ammo0 * 0.5) u.ammo = u.ammo0;
}

// vida alrededor de la base mientras el Romeo 4-1 va al campo de tiro: deporte junto a las tiendas, vehículos aparcados, un KC-10 descargando y un Black Hawk llegando
const TZ_KC10 = { u: -27, v: -91 },
  TZ_LAND = { u: -116, v: -72 };
function m939At(u, v, ry) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = ry;
  world.add(g);
  withModel('m939', M_ => {
    if (!M_.lit) {
      M_.lit = true;
      M_.mat.color.setRGB(1.8, 1.8, 1.7);
    }
    const q = lodMesh(M_.geos.body, M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
  return g;
}
function kc10At(u, v, ry) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = ry;
  world.add(g);
  withModel('kc10', M_ => {
    if (!M_.lit) {
      M_.lit = true;
      M_.mat.color.setRGB(1.0, 1.02, 1.05);
    }
    const q = lodMesh(M_.geos.body, M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
  return g;
}
function tzBaseLife() {
  const R = (name, extra) =>
    Object.assign(
      {},
      RANGERS[(k_ = (k_ + 1) % 6)],
      RSPEC,
      { name, role: 'Fusilero', unitName: 'Base TFR' },
      extra || {}
    );
  let k_ = 0;
  // deporte en el descampado entre los dos bloques de tiendas: dos filas haciendo flexiones y un sargento contando
  G.m.pt = [];
  const PTN = [
    'Sold. Kowalewski',
    'Esp. Thomas',
    'Sold. Moynihan',
    'Esp. Lycopolus',
    'Sold. Rodriguez',
    'Esp. Hand',
    'Sold. Neathery',
    'Esp. Heard'
  ];
  PTN.forEach((n, i) => {
    const p = tzW(-57.5 + (i % 4) * 2.6, -147.5 + (i >> 2) * 3.4),
      u = npcUnit(R(n), p.x, p.z, AIR_RY + Math.PI);
    u.noFire = true;
    u.stance = 'prone';
    u.pushup = rnd() * 6;
    G.m.pt.push(u);
  });
  {
    const p = tzW(-53.6, -151.6);
    G.m.ptSgt = npcUnit(R('Sgto. Ed Yurek', { kit: 'radio' }), p.x, p.z, AIR_RY);
    G.m.ptSgt.noFire = true;
  }
  {
    const f = tzW(-53, -136.5);
    makeFlag(f.x, f.z, 7, 0, 'us');
  }
  // vehículos aparcados delante de las tiendas: Humvees y camiones M939
  humveeAt(-64, -131, AIR_RY + PH);
  humveeAt(-60, -131, AIR_RY + PH);
  humveeAt(-44, -131, AIR_RY - PH);
  m939At(-86, -128.5, AIR_RY + PH);
  m939At(-79, -128.5, AIR_RY + PH);
  m939At(-23, -128.5, AIR_RY - PH);
  // los huecos de los Black Hawks de la misión también están ocupados: todavía no ha volado nada
  for (let k = 0; k < BHROW.fly; k++) {
    if (k === 3) continue;
    const p = AIRP(BHROW.u + k * BHROW.step, BHROW.v);
    parkedHeli(p[0], p[1], AIR_RY);
  }
  for (let k = 0; k < LBROW.fly; k++) {
    const p = AIRP(LBROW.u + k * LBROW.step, LBROW.v),
      lb = littleBird();
    lb.g.position.set(p[0], 0, p[1]);
    lb.g.rotation.y = AIR_RY;
    lb.rotor.rotation.y = k * 0.9;
    world.add(lb.g);
  }
  // un KC-10 en la plataforma, con el morro hacia los hangares, la escalerilla en la puerta delantera y gente bajando
  const K = TZ_KC10;
  kc10At(K.u, K.v, AIR_RY);
  const du = K.u - 12.2,
    top = K.v - 2.1,
    bot = K.v - 6.6;
  MAT = M.METAL;
  for (let s = 0; s < 9; s++) {
    const f = s / 8;
    rb(du, top + (bot - top) * f, 3.0 * (1 - f) + 0.05, 1.3, 0.08, 0.5, 0xd8d4c8);
  }
  for (const o of [-0.68, 0.68]) {
    const a = AIRP(du + o, (top + bot) / 2);
    B(a[0], 1.75, a[1], 0.06, 0.06, Math.hypot(bot - top, 3) * 1.02, 0x9a9a94, {
      ry: AIR_RY,
      rx: Math.atan2(3, bot - top),
      ord: 'YXZ'
    });
    rb(du + o, bot, 0.55, 0.08, 1.1, 0.08, 0x9a9a94);
    rb(du + o, top, 3.4, 0.08, 0.9, 0.08, 0x9a9a94);
  }
  rb(du, top - 0.2, 2.95, 1.6, 0.1, 1.2, 0xc8c4b8);
  G.m.stairs = { top: tzW(du, top - 0.2), bot: tzW(du, bot - 0.6), n: 0, next: 2 };
  G.m.walkers = [];
  G.m.stairNames = [
    'Esp. Dale Sizemore',
    'Esp. Brian Heard',
    'Sold. Jason Coleman',
    'Sold. Richard Kowalewski',
    'Esp. Eric Spalding',
    'Esp. Melvin dePriest',
    'Sold. Peter Neathery',
    'Sold. Jeff Bray',
    'Esp. Lorenzo Ruiz'
  ];
}
// uno que baja de la escalerilla va hacia las tiendas; las flexiones siguen y siguen
function tzLifeTick(dt) {
  const S = G.m.stairs;
  if (S && S.n < 9 && G.t >= S.next) {
    S.next = G.t + 1.7;
    const R = Object.assign({}, RANGERS[S.n % 6], RSPEC, {
      name: G.m.stairNames[S.n],
      role: 'Fusilero',
      unitName: 'Base TFR',
      kit: 'pack'
    });
    const u = npcUnit(R, S.top.x, S.top.z, AIR_RY + Math.PI);
    u.noFire = true;
    u.stairT = 0;
    u.elev = 3.1;
    G.m.walkers.push(u);
    S.n++;
  }
  for (const u of G.m.walkers || []) {
    if (u.stairT != null) {
      u.stairT += dt / 2.6;
      const f = Math.min(1, u.stairT);
      u.x = S.top.x + (S.bot.x - S.top.x) * f;
      u.z = S.top.z + (S.bot.z - S.top.z) * f;
      u.elev = 3.1 * (1 - f);
      u.vx = (S.bot.x - S.top.x) / 2.6;
      u.vz = (S.bot.z - S.top.z) / 2.6;
      u.face = Math.atan2(u.vx, u.vz);
      u.path = [];
      if (f >= 1) {
        u.stairT = null;
        u.elev = 0;
        const i = G.m.walkers.indexOf(u),
          p = tzW(-74 + (i % 5) * 1.3 + (i > 4 ? 32 : 0), -133.5 - (i % 2));
        goTo(u, p.x, p.z);
      }
    }
    u.sup = 0;
  }
  for (const u of G.m.pt || []) {
    u.sup = 0;
    u.stance = 'prone';
    u.path = [];
  }
  // los tres de la entrada hablan por turnos, girándose hacia el que habla
  for (const u of G.m.chat || []) {
    u.sup = 0;
    u.stance = 'stand';
    u.chatT -= dt;
    if (u.chatT <= 0) {
      u.chatT = rr(2.5, 6);
      if (rnd() < 0.6) {
        u.talkT = rr(1.4, 2.8);
        for (const o of G.m.chat) if (o !== u) o.face = Math.atan2(u.x - o.x, u.z - o.z);
      }
    }
  }
  // y uno se pasea por el descampado junto a la puerta, sin meterse nunca en los pasillos
  const w = G.m.walk;
  if (w && w.alive) {
    w.sup = 0;
    if (!w.path.length) {
      w.waitT -= dt;
      if (w.waitT <= 0) {
        const p = w.wp[w.wi];
        w.wi = (w.wi + 1) % w.wp.length;
        goTo(w, p.x, p.z);
        w.waitT = rr(1, 4);
      }
    }
  }
  if (G.m.ptSgt) {
    G.m.ptSgt.sup = 0;
    G.m.ptSgt.stance = 'stand';
  }
}
// la flexión: todo el cuerpo bascula sobre las puntas de los pies, arriba y abajo
function pushupPose(u) {
  const r = u.m.root;
  r.rotation.order = 'YXZ';
  const a = 0.05 + 0.26 * (0.5 + 0.5 * Math.sin(G.t * 3.1 + u.pushup));
  r.rotation.x = -a;
  r.position.y = 0.78 * Math.sin(a);
  if (u.m.gun) u.m.gun.visible = false;
}
