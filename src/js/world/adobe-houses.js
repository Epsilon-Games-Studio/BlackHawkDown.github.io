/* ====================================================================================================
 * world/adobe-houses.js
 *
 * Las casas del campo, fuera de la ciudad: los ocho modelos de adobe subidos, repartidos a partes iguales por las aldeas,
 * a lo largo de la carretera del aeropuerto y en las afueras. Las paredes se repintan con el mismo enlucido que las casas
 * de la ciudad (blanco sucio, cada una con su tono); las puertas, ventanas, escaleras y vigas llevan su textura.
 * Unas tienen tapia de adobe con portón de madera y otras no; unas un árbol en el patio y otras no.
 * Cerca de la cámara se llenan de vida: gente a la puerta y en el patio, y gallinas picoteando. Con un helicóptero
 * encima o tiros cerca, la gente se mete en casa.
 * Nada de esto toca la secuencia aleatoria de la ciudad: el reparto tiene su propio generador.
 * ================================================================================================== */

// por modelo: alto, la huella (celdas de 0,5 desde x0, z0 en coordenadas de la casa) y las puertas a pie de calle [x, z, nx, nz]
const ADOBE_META = [
  {"h":2.73,"x0":-2.23,"z0":-2.98,"nx":9,"nz":13,"occ":["111111111","111111111","111111111","111111111","111111111","111111111","111111111","001111111","001111111","001111111","001111111","001111111","001111111"],"doors":[[1.66,2.7,0.0,1.0],[-1.74,-0.27,0.0,-1.0]]},
  {"h":3.24,"x0":-2.79,"z0":-2.18,"nx":11,"nz":10,"occ":["11111111111","11111111111","11111111111","11111111111","11111111111","11111111111","11111111111","11111111111","11111111111","11011000000"],"doors":[[1.59,2.13,-0.0,1.0]]},
  {"h":3.3,"x0":-2.58,"z0":-3.57,"nx":12,"nz":16,"occ":["111111111110","111111111110","111111111110","111111111110","111111111110","111111111110","111111111110","111111111110","111111111111","111111111110","111111111110","111111111110","111111111110","111110000000","111110000000","011000000000"],"doors":[[-0.77,3.55,-0.0,1.0],[1.91,1.16,-0.0,1.0]]},
  {"h":2.97,"x0":-2.99,"z0":-1.68,"nx":12,"nz":9,"occ":["111111111111","111111111111","111111111111","111111111111","111111111111","111111100000","011111100000","000010000011","000000000011"],"doors":[[0.77,0.64,0.0,1.0]]},
  {"h":3.14,"x0":-2.35,"z0":-2.67,"nx":9,"nz":11,"occ":["111111111","111111111","111111111","111111111","111111111","111111111","000011111","111111111","011111111","000011111","000011111"],"doors":[[1.13,2.62,0.0,1.0],[-0.56,-0.04,0.0,-1.0]]},
  {"h":3.27,"x0":-2.02,"z0":-2.3,"nx":9,"nz":10,"occ":["111111111","111111111","111111111","111111111","111111111","111111110","111111000","111111110","111111000","111111000"],"doors":[[0.34,2.17,0.0,1.0]]},
  {"h":3.16,"x0":-2.38,"z0":-2.32,"nx":10,"nz":10,"occ":["1111111111","1111111111","1111111111","1111111111","1111111111","1111000000","1111000000","1111100000","1111100000","1111000000"],"doors":[[-1.22,2.31,0.0,1.0],[1.58,0.02,-0.01,1.0]]},
  {"h":2.25,"x0":-1.23,"z0":-1.78,"nx":6,"nz":8,"occ":["111111","111111","111111","111111","111111","111110","111110","111110"],"doors":[[0.82,1.78,0.0,1.0]]}
];
const ADOBE_TONES = [0xe8e0cc, 0xece4d2, 0xdfd6c0, 0xe4dac4, 0xd8cdb4, 0xefe8d8, 0xdcd3be];
const ADOBE_GATES = [0x5a3e26, 0x6a4a2e, 0x3e5a6a, 0x4a6a52, 0x7a5a3a, 0x355a78];
let ADOBES = [],
  ADOBE_GRID = new Map(),
  ADL = [], // la gente de los patios que está a la vista
  ADT = 0,
  ADOBE_WALL_MAT = null;

// el modelo se pide la primera vez que se reparten las casas (core/models.js va después de este archivo)
function adobeLoad() {
  if (MODELS.adobe) return;
  loadModel('adobe', g => {
    // el enlucido de la ciudad lee el material por instancia
    for (let k = 0; k < ADOBE_META.length; k++) {
      const w = g['w' + k];
      if (w) w.setAttribute('aMat', new T.InstancedBufferAttribute(new Float32Array(4096).fill(1), 1));
    }
  });
}
function adobeWallMat() {
  if (!ADOBE_WALL_MAT)
    ADOBE_WALL_MAT = patchDetail(
      new T.MeshPhongMaterial({ color: 0xffffff, specular: 0x000000, shininess: 1, side: T.DoubleSide }),
      { m: M.PLASTER }
    );
  return ADOBE_WALL_MAT;
}

// de la casa al mundo y al revés
const adobeW = (H, lx, lz) => [H.x + lx * H.c + lz * H.s, H.z - lx * H.s + lz * H.c];
const adobeL = (H, x, z) => {
  const dx = x - H.x,
    dz = z - H.z;
  return [dx * H.c - dz * H.s, dx * H.s + dz * H.c];
};
function fhCells(H, f) {
  const i0 = Math.floor((H.x - H.R) / CS),
    i1 = Math.floor((H.x + H.R) / CS),
    j0 = Math.floor((H.z - H.R) / CS),
    j1 = Math.floor((H.z + H.R) / CS);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) f(i + ',' + j);
}
function fhNear(x, z, f) {
  const L_ = ADOBE_GRID.get(Math.floor(x / CS) + ',' + Math.floor(z / CS));
  if (L_) for (const H of L_) if (f(H)) return true;
  return false;
}
// ¿la casa ocupa este punto (con un margen)? walls: también la tapia
function adobeHitOne(H, x, z, pad, walls) {
  if (Math.abs(x - H.x) > H.R + pad || Math.abs(z - H.z) > H.R + pad) return false;
  const [lx, lz] = adobeL(H, x, z),
    m = ADOBE_META[H.t];
  const c0 = Math.floor((lx - pad - m.x0) / 0.5),
    c1 = Math.floor((lx + pad - m.x0) / 0.5),
    r0 = Math.floor((lz - pad - m.z0) / 0.5),
    r1 = Math.floor((lz + pad - m.z0) / 0.5);
  for (let r = Math.max(0, r0); r <= Math.min(m.nz - 1, r1); r++)
    for (let c = Math.max(0, c0); c <= Math.min(m.nx - 1, c1); c++) if (m.occ[r].charCodeAt(c) === 49) return true;
  if (walls && H.wall) {
    const w = H.wall;
    const near = (a, b, p) => Math.abs(a - b) < p + 0.2;
    if (lx > w.x0 - pad - 0.2 && lx < w.x1 + pad + 0.2) {
      if (near(lz, w.z0, pad)) return true;
      if (near(lz, w.z1, pad) && Math.abs(lx - w.gx) > w.gw / 2 - 0.1) return true;
    }
    if (lz > w.z0 - pad - 0.2 && lz < w.z1 + pad + 0.2 && (near(lx, w.x0, pad) || near(lx, w.x1, pad))) return true;
  }
  return false;
}
function fieldHouseHit(x, z, pad, walls) {
  if (!ADOBES.length) return false;
  return fhNear(x, z, H => adobeHitOne(H, x, z, pad || 0, walls !== false));
}
// dentro del recinto (o del corral si no hay tapia) y fuera de la casa
function adobeYard(H, lx, lz) {
  const m = ADOBE_META[H.t],
    w = H.wall;
  if (w) return lx > w.x0 + 0.35 && lx < w.x1 - 0.35 && lz > w.z0 + 0.35 && lz < w.z1 - 0.35;
  return lx > m.x0 - 2.5 && lx < m.x0 + m.nx * 0.5 + 2.5 && lz > m.z0 - 1.5 && lz < m.z0 + m.nz * 0.5 + 4.5;
}

/* El reparto. Tres clases de sitio, como estaban las casitas de antes: las aldeas, los recintos a lo largo de la carretera
   del aeropuerto y los sueltos de las afueras (más apretados cuanto más cerca de la ciudad). Los ocho modelos salen por
   turnos de una bolsa barajada, así hay de todos lo mismo y dos vecinos casi nunca son iguales. */
function adobePlan() {
  adobeLoad();
  for (const c of ADL) if (c.m) world.remove(c.m.root);
  ADL = [];
  ADOBES = [];
  ADOBE_GRID = new Map();
  let s_ = 0x2f6e2b1;
  const R = () => {
    s_ = (Math.imul(s_, 1664525) + 1013904223) >>> 0;
    return s_ / 4294967296;
  };
  let bag = [];
  const nextT = (x, z) => {
    if (!bag.length) {
      bag = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let k = 7; k > 0; k--) {
        const q = Math.floor(R() * (k + 1));
        [bag[k], bag[q]] = [bag[q], bag[k]];
      }
    }
    // si la vecina más cercana es igual, cojo otra de la bolsa
    let k = 0;
    const near = ADOBES.filter(H => Math.hypot(H.x - x, H.z - z) < 28);
    while (k < bag.length - 1 && near.some(H => H.t === bag[k])) k++;
    return bag[k];
  };
  const take = t => bag.splice(bag.indexOf(t), 1);
  const tmp = [0, 0, 0, 0];
  const wells = VILLAGES.map(v => [v.x, v.z]);
  const free = (x, z, Rr) => {
    if (x < WB.x0 + Rr || x > WB.x1 - Rr || z < WB.z0 + Rr || z > WB.z1 - Rr) return false;
    if (x > -10 - Rr && z > -10 - Rr && x < W + 10 + Rr && z < H + 10 + Rr) return false; // la ciudad
    if (coastS(x, z) > -32 - Rr) return false; // ni en la playa
    if (roadDist(x, z, ROADSEG)[0] < Rr + 4.5) return false; // ni en las carreteras
    if (TRACKS && TRACKS.length && roadDist(x, z, TRACKS)[0] < Rr + 2.5) return false;
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const [u, v] = airUV(x + dx * Rr, z + dz * Rr);
      if (u > BASE.u0 - 25 && u < BASE.u1 + 50 && v > BASE.v0 - 25 && v < 34) return false;
      if (u > -300 && u < 340 && v > -292 && v < 16 && airGround(u, v, tmp)) return false;
    }
    if (wells.some(([wx, wz]) => Math.hypot(x - wx, z - wz) < Rr + 6)) return false;
    if (ADOBES.some(H => Math.hypot(H.x - x, H.z - z) < H.R + Rr + 1.5)) return false;
    return true;
  };
  // una casa en (x, z) que mira con la puerta (su +z) hacia 'face'
  const place = (x, z, face) => {
    const t = nextT(x, z),
      m = ADOBE_META[t];
    const fx0 = m.x0,
      fx1 = m.x0 + m.nx * 0.5,
      fz0 = m.z0,
      fz1 = m.z0 + m.nz * 0.5;
    let wall = null;
    const hasWall = R() < 0.55;
    if (hasWall) {
      const sm = 1.3 + R() * 0.7,
        ym = 3.4 + R() * 1.4,
        x0 = fx0 - sm,
        x1 = fx1 + sm,
        d0 = m.doors[0];
      const gw = 1.55,
        gx = clamp(d0 ? d0[0] : (fx0 + fx1) / 2, x0 + gw / 2 + 0.5, x1 - gw / 2 - 0.5);
      wall = {
        x0,
        x1,
        z0: fz0 - sm,
        z1: fz1 + ym,
        h: 1.05 + R() * 0.3,
        gx,
        gw,
        gc: ADOBE_GATES[Math.floor(R() * ADOBE_GATES.length)],
        open: R() < 0.35 ? (R() < 0.5 ? 1 : -1) : 0
      };
    }
    const ex = wall
      ? Math.max(-wall.x0, wall.x1, -wall.z0, wall.z1)
      : Math.max(-fx0, fx1, -fz0, fz1 + 3.5);
    const Rr = Math.hypot(ex, ex) * 0.82;
    if (!free(x, z, Rr)) return false;
    take(t);
    const ry = face + (R() - 0.5) * 0.12;
    const H = {
      x,
      z,
      t,
      ry,
      c: Math.cos(ry),
      s: Math.sin(ry),
      R: Rr,
      wall,
      col: ADOBE_TONES[Math.floor(R() * ADOBE_TONES.length)],
      tree: null,
      hens: R() < 0.65 ? 3 + Math.floor(R() * 4) : 0,
      folk: R() < 0.85 ? 1 + Math.floor(R() * 3) : 0,
      live: false
    };
    // el árbol del patio: lejos de la casa para que la copa no se meta en ella
    if (R() < 0.5) {
      const th = 2.5 + R() * 0.8,
        cr = th * 0.55;
      for (let k = 0; k < 12 && !H.tree; k++) {
        const lx = wall ? wall.x0 + 0.9 + R() * (wall.x1 - wall.x0 - 1.8) : fx0 - 2 + R() * (fx1 - fx0 + 4),
          lz = wall ? fz1 + 0.6 + R() * (wall.z1 - fz1 - 1.2) : fz1 + cr + 0.3 + R() * 1.6;
        if (wall && Math.abs(lx - wall.gx) < wall.gw / 2 + 0.8) continue;
        const [wx, wz] = adobeW(H, lx, lz);
        if (adobeHitOne(H, wx, wz, cr + 0.25, false)) continue;
        H.tree = [lx, lz, th];
      }
    }
    ADOBES.push(H);
    fhCells(H, k => {
      if (!ADOBE_GRID.has(k)) ADOBE_GRID.set(k, []);
      ADOBE_GRID.get(k).push(H);
    });
    lazyAdd(x, z, () => adobeBuild(H));
    return true;
  };
  const quarter = () => Math.floor(R() * 4) * (Math.PI / 2);
  // las aldeas: las casas miran hacia el pozo del centro
  for (const v of VILLAGES) {
    let n = 0;
    const want = Math.round(v.n * 0.6);
    for (let k = 0; k < want * 8 && n < want; k++) {
      const a = R() * 6.283,
        d = 9 + Math.sqrt(R()) * (v.r - 4),
        x = v.x + Math.cos(a) * d,
        z = v.z + Math.sin(a) * d;
      if (place(x, z, Math.atan2(v.x - x, v.z - z))) n++;
    }
  }
  // a lo largo de la carretera del aeropuerto, con el portón hacia la carretera
  const r0 = ROADS[0];
  for (let k = 1; k < r0.pts.length - 2; k++) {
    const a = r0.pts[k],
      b = r0.pts[k + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0.05; t < 1; t += 0.11) {
      if (R() > 0.6) continue;
      const side = R() < 0.5 ? -1 : 1,
        off = 13 + R() * 18,
        x = a[0] + (b[0] - a[0]) * t - ((b[1] - a[1]) / L) * side * off,
        z = a[1] + (b[1] - a[1]) * t + ((b[0] - a[0]) / L) * side * off;
      place(x, z, Math.atan2(((b[1] - a[1]) / L) * side, -((b[0] - a[0]) / L) * side));
    }
  }
  // sueltas por las afueras, más cuanto más cerca de la ciudad
  for (let cx = WB.x0; cx < WB.x1; cx += CS)
    for (let cz = WB.z0; cz < WB.z1; cz += CS)
      for (let k = 0; k < 5; k++) {
        const x = cx + 3 + R() * (CS - 6),
          z = cz + 3 + R() * (CS - 6);
        if (R() > cityDs(x, z) * 2.2) continue;
        place(x, z, quarter());
      }
}

// la casa en su chunk: el modelo (paredes con el enlucido de la ciudad y el resto con su textura), la tapia, el portón y el árbol
function adobeBuild(H) {
  if (TZONE) {
    const [u, v] = airUV(H.x, H.z);
    if (u > TZONE.u0 - 12 && u < TZONE.u1 + 12 && v > TZONE.v0 - 14 && v < TZONE.v1 + 10) return;
  }
  prop('adobe', 'w' + H.t, H.x, 0, H.z, H.ry, 1, H.col);
  prop('adobe', 'd' + H.t, H.x, 0, H.z, H.ry, 1, 0xffffff);
  const w = H.wall;
  if (w) {
    const ry = H.ry,
      th = 0.28,
      cap = shade(H.col, 0.94),
      col = shade(H.col, 0.98);
    MAT = M.PLASTER;
    const seg = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.05) return;
      const [cx, cz] = adobeW(H, (ax + bx) / 2, (az + bz) / 2),
        r = ry + (Math.abs(bz - az) > Math.abs(bx - ax) ? Math.PI / 2 : 0);
      B(cx, w.h / 2, cz, L + th, w.h, th, col, { ry: r });
      B(cx, w.h + 0.03, cz, L + th + 0.04, 0.07, th + 0.07, cap, { ry: r });
    };
    seg(w.x0, w.z0, w.x1, w.z0);
    seg(w.x0, w.z0, w.x0, w.z1);
    seg(w.x1, w.z0, w.x1, w.z1);
    seg(w.x0, w.z1, w.gx - w.gw / 2, w.z1);
    seg(w.gx + w.gw / 2, w.z1, w.x1, w.z1);
    // los machones del portón, un poco más altos, y el dintel de madera
    for (const sd of [-1, 1]) {
      const [px, pz] = adobeW(H, w.gx + sd * (w.gw / 2 + 0.12), w.z1);
      B(px, (w.h + 0.3) / 2, pz, 0.42, w.h + 0.3, 0.42, col, { ry });
      B(px, w.h + 0.33, pz, 0.48, 0.07, 0.48, cap, { ry });
    }
    MAT = M.WOOD;
    {
      const [lx, lz] = adobeW(H, w.gx, w.z1);
      B(lx, w.h + 0.12, lz, w.gw + 0.5, 0.11, 0.16, 0x5a4630, { ry });
    }
    // las dos hojas de madera; a veces una está abierta hacia dentro
    for (const sd of [-1, 1]) {
      const hw = w.gw / 2 - 0.02,
        hx = w.gx + sd * (w.gw / 2), // la bisagra
        op = w.open === sd ? 1.25 : 0,
        a = -sd * op;
      const mx = hx - sd * (hw / 2) * Math.cos(op),
        mz = w.z1 - (hw / 2) * Math.sin(op);
      const [px, pz] = adobeW(H, mx, mz);
      B(px, w.h * 0.47, pz, hw, w.h * 0.9, 0.06, w.gc, { ry: ry + a });
      // dos travesaños por detrás
      for (const yy of [0.25, 0.7]) B(px, w.h * yy, pz, hw * 0.92, 0.07, 0.1, shade(w.gc, 0.8), { ry: ry + a });
    }
  }
  if (H.tree) {
    const [tx, tz] = adobeW(H, H.tree[0], H.tree[1]);
    treeAt(tx, tz, H.tree[2], false);
  }
}

/* La vida de los patios: solo de las casas cerca de la cámara. La gente sale a la puerta, charla en el patio, va al portón
   y vuelve, alguna mujer en cuclillas junto a la puerta; las gallinas picotean dentro. Si algo asusta (un helicóptero bajo,
   tiros), corren a la puerta y se meten en casa; vuelven a salir un rato después. */
function adobeFolk(H, k) {
  const m = ADOBE_META[H.t],
    d = m.doors[k % m.doors.length] || [0, m.z0 + m.nz * 0.5, 0, 1];
  const woman = rnd() < 0.5;
  const rig = buildRig('civ', { woman });
  rig.gun.visible = false;
  world.add(rig.root);
  // delante de la puerta, ya fuera de la huella de la casa
  let out = 0.7;
  while (out < 3 && adobeHitOne(H, ...adobeW(H, d[0] + d[2] * out, d[1] + d[3] * out), 0.25, false)) out += 0.25;
  const door = [d[0] + d[2] * out, d[1] + d[3] * out],
    inside = [d[0] - d[2] * 0.6, d[1] - d[3] * 0.6];
  const role = k === 0 ? (rnd() < 0.5 ? 'door' : 'walk') : pick(['walk', 'chat', 'squat']);
  let lx = door[0],
    lz = door[1];
  if (role !== 'door') {
    for (let q = 0; q < 10; q++) {
      const ax = door[0] + rr(-2.5, 2.5),
        az = door[1] + rr(0.6, 3.2);
      const [wx, wz] = adobeW(H, ax, az);
      if (adobeYard(H, ax, az) && !fieldHouseHit(wx, wz, 0.35)) {
        lx = ax;
        lz = az;
        break;
      }
    }
  }
  let [x, z] = adobeW(H, lx, lz);
  if (adobeHitOne(H, x, z, 0.2, false)) [x, z] = adobeW(H, door[0], door[1]);
  const c = {
    team: 'civ',
    H,
    x,
    z,
    vx: 0,
    vz: 0,
    face: H.ry + rr(-1.2, 1.2),
    alive: true,
    down: false,
    hp: 100,
    hp0: 100,
    sup: 0,
    pinned: false,
    stance: role === 'squat' ? 'crouch' : 'stand',
    moving: false,
    firing: 0,
    reloading: false,
    healing: false,
    talkT: 0,
    woman,
    role,
    door,
    inside,
    tgt: null,
    waitT: rr(1, 5),
    spd: rr(0.7, 1.0),
    st: 'out',
    m: rig
  };
  rig.root.position.set(x, 0, z);
  rig.root.rotation.y = c.face;
  return c;
}
function adobeTarget(c) {
  const H = c.H,
    w = H.wall;
  const opts = [c.door];
  if (w) opts.push([w.gx, w.z1 - 0.7]);
  if (H.tree) opts.push([H.tree[0] + rr(-0.9, 0.9), H.tree[1] + rr(0.6, 1.0)]);
  for (let q = 0; q < 6; q++) {
    const ax = c.door[0] + rr(-3, 3),
      az = c.door[1] + rr(0.5, 3.5);
    if (adobeYard(H, ax, az)) opts.push([ax, az]);
  }
  for (let q = 0; q < 8; q++) {
    const p = pick(opts),
      [wx, wz] = adobeW(H, p[0], p[1]);
    if (!fieldHouseHit(wx, wz, 0.3)) return [wx, wz];
  }
  return null;
}
function updAdobeLife(dt) {
  if (!ADOBES.length || !world || dt <= 0 || !G) return;
  const cx = camS.tx,
    cz = camS.tz,
    hh = halfH(),
    near = hh * 2.2 + 14;
  ADT -= dt;
  if (ADT <= 0) {
    ADT = 0.7;
    const calm = !MIS || !MIS.noCiv;
    // las casas que entran y salen del alcance
    const seen = new Set();
    for (let i = Math.floor((cx - near) / CS); i <= Math.floor((cx + near) / CS); i++)
      for (let j = Math.floor((cz - near) / CS); j <= Math.floor((cz + near) / CS); j++) {
        const L_ = ADOBE_GRID.get(i + ',' + j);
        if (L_) for (const H of L_) seen.add(H);
      }
    for (const H of seen) {
      const d = Math.hypot(H.x - cx, H.z - cz);
      if (H.live || d > near || !calm || ADL.length > 26) continue;
      const ch = CHUNKS.get(Math.floor(H.x / CS) + ',' + Math.floor(H.z / CS));
      if (!ch || !ch.gen || lifeThreat(H.x, H.z, 0)) continue;
      H.live = true;
      H.liveT = G.t;
      for (let k = 0; k < H.folk; k++) ADL.push(adobeFolk(H, k));
      // las gallinas del patio
      if (H.hens) {
        const m = ADOBE_META[H.t],
          dd = m.doors[0] || [0, m.z0 + m.nz * 0.5, 0, 1];
        const [hx, hz] = H.tree ? adobeW(H, H.tree[0], H.tree[1] + 0.9) : adobeW(H, dd[0] + rr(-1.5, 1.5), dd[1] + 2.2);
        for (let q = 0; q < H.hens; q++) {
          const px = hx + rr(-1.2, 1.2),
            pz = hz + rr(-1.2, 1.2);
          if (!lifeFree(px, pz)) continue;
          const a = addAnimal('chicken', px, pz);
          if (a) {
            a.hx = hx;
            a.hz = hz;
            a.yard = H;
          }
        }
      }
    }
    for (const H of ADOBES) if (H.live && Math.hypot(H.x - cx, H.z - cz) > near + 40) H.live = false;
  }
  for (let k = ADL.length - 1; k >= 0; k--) {
    const c = ADL[k],
      H = c.H,
      d = Math.hypot(c.x - cx, c.z - cz);
    if (d > near + 30 || !H.live) {
      world.remove(c.m.root);
      ADL.splice(k, 1);
      continue;
    }
    let tx = null,
      tz = null,
      run = false;
    // miedo: a casa corriendo
    c.chk = (c.chk || 0) - dt;
    if (c.chk <= 0) {
      c.chk = 0.4;
      if (c.st === 'out' && lifeThreat(c.x, c.z, 0)) {
        c.st = 'flee';
        c.stance = 'stand';
      }
    }
    if (c.st === 'flee') {
      const [dx, dz] = adobeW(H, c.door[0], c.door[1]),
        [ix, iz] = adobeW(H, c.inside[0], c.inside[1]);
      if (!c.inT) {
        tx = dx;
        tz = dz;
        if (Math.hypot(dx - c.x, dz - c.z) < 0.35) c.inT = 1;
      } else {
        tx = ix;
        tz = iz;
        if (Math.hypot(ix - c.x, iz - c.z) < 0.35) {
          // dentro: desaparece y sale más tarde
          c.st = 'in';
          c.backT = G.t + rr(25, 60);
          c.m.root.visible = false;
        }
      }
      run = true;
    } else if (c.st === 'in') {
      if (G.t > c.backT && !lifeThreat(H.x, H.z, 0)) {
        const [dx, dz] = adobeW(H, c.door[0], c.door[1]);
        c.x = dx;
        c.z = dz;
        c.st = 'out';
        c.inT = 0;
        c.role = 'door';
        c.waitT = rr(2, 6);
        c.m.root.visible = true;
      }
      continue;
    } else if (c.role === 'walk') {
      if (!c.tgt) {
        c.waitT -= dt;
        if (c.waitT <= 0) c.tgt = adobeTarget(c);
      }
      if (c.tgt) {
        tx = c.tgt[0];
        tz = c.tgt[1];
        if (Math.hypot(tx - c.x, tz - c.z) < 0.3) {
          c.tgt = null;
          tx = tz = null;
          c.waitT = rr(2, 8);
          if (rnd() < 0.4) c.talkT = rr(0.8, 2);
        }
      }
    } else if (c.role === 'chat' || c.role === 'door') {
      c.waitT -= dt;
      if (c.waitT <= 0) {
        c.waitT = rr(1.5, 6);
        if (rnd() < 0.5) c.talkT = rr(1, 2.6);
        // se vuelve hacia alguien de su casa, si hay
        const o = ADL.find(q => q !== c && q.H === H && q.st === 'out');
        c.face = o ? Math.atan2(o.x - c.x, o.z - c.z) : c.face + rr(-0.8, 0.8);
        if (c.role === 'door' && rnd() < 0.2) c.role = 'walk';
      }
    }
    let moving = false;
    if (tx != null) {
      const dx = tx - c.x,
        dz = tz - c.z,
        dd = Math.hypot(dx, dz) || 1e-4,
        want = run ? 3.2 : c.spd,
        a = 1 - Math.exp(-6 * dt);
      c.vx += ((dx / dd) * want - c.vx) * a;
      c.vz += ((dz / dd) * want - c.vz) * a;
      const nx = c.x + c.vx * dt,
        nz = c.z + c.vz * dt;
      // no atraviesa paredes (salvo la puerta de su casa al meterse)
      if (c.st === 'flee' || !fieldHouseHit(nx, nz, 0.2)) {
        c.x = nx;
        c.z = nz;
      } else {
        c.tgt = null;
        c.vx = c.vz = 0;
        c.waitT = rr(0.5, 2);
      }
      moving = true;
    } else {
      const f = Math.exp(-10 * dt);
      c.vx *= f;
      c.vz *= f;
    }
    c.moving = moving;
    if (moving && Math.hypot(c.vx, c.vz) > 0.2) c.face = Math.atan2(c.vx, c.vz);
    if (d > near + 6) continue;
    const r = c.m.root;
    r.position.set(c.x, 0, c.z);
    let df = c.face - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, dt * 6), -dt * 6, dt * 6);
    animRig(c, dt);
    const m = c.m,
      sp = Math.hypot(c.vx, c.vz),
      w = clamp(sp / 0.9, 0, 1),
      s = Math.sin(m.phase),
      rn = clamp((sp - 1.2) / 1.5, 0, 1);
    m.shR.rotation.x += s * (0.35 + 0.5 * rn) * w;
    m.shL.rotation.x -= s * (0.35 + 0.5 * rn) * w;
    if (c.talkT > 0 && !moving) m.elR.rotation.x -= 0.6 + Math.sin(performance.now() / 260) * 0.25;
  }
}
