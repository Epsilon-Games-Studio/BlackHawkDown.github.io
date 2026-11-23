/* ====================================================================================================
 * world/props.js
 *
 * Objetos de los modelos subidos (rocas, cajas y cartones, bidones, sacos terreros, neumáticos, depósitos y antenas
 * de azotea): instanciados por chunk y por pieza, con un tinte por instancia. Las balas chocan con cajas invisibles
 * puestas donde estaban las antiguas; la secuencia aleatoria que construye la ciudad se tira igual que antes, así no se mueve nada más.
 * ================================================================================================== */

'use strict';

const PROP_N = [
  'rocks',
  'crates',
  'barrels',
  'bags',
  'tires',
  'junk2',
  'lights',
  'kit3',
  'wood',
  'market',
  'deco8',
  'deco9'
];
const PROP_MAT = {};
function propMat(n, M_) {
  return (
    PROP_MAT[n] ||
    (PROP_MAT[n] = new T.MeshPhongMaterial({
      map: M_.mat.map,
      side: T.DoubleSide,
      alphaTest: n.startsWith('w_') ? 0.5 : 0,
      specular: n === 'barrels' || n === 'tank' || n === 'dish' ? 0x161616 : 0x050505,
      shininess: n === 'barrels' ? 14 : 4
    }))
  );
}
// cada sitio tiene su propio generador, así elegir modelo y giro no mueve nada más
const phs = (x, z, k) => hash2(Math.round(x * 97) + k * 7919, Math.round(z * 89) - k * 104729);
function prop(n, part, x, y, z, ry, sc, col, o) {
  if (GHOST) return null;
  const L_ = CUR || chunkFor(x, z);
  const r = {
    n,
    p: part,
    x,
    y,
    z,
    ry: ry || 0,
    rx: (o && o.rx) || 0,
    rz: (o && o.rz) || 0,
    s: sc || 1,
    sy: (o && o.sy) || 1,
    col: col == null ? 0xffffff : col,
    roof: o && o.roof ? 1 : 0,
    mesh: null,
    k: 0,
    dead: false
  };
  L_.PR.push(r);
  if (COVREC) {
    COVREC.push(r);
    r.chL = L_;
    r.isProp = 1;
  }
  if (!CUR && L_.gen)
    withModel(n, M_ => {
      if (!L_.group) return;
      const m = new T.InstancedMesh(M_.geos[part], propMat(n, M_), 1);
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      castReg(m, M_.geos[part], r.s);
      lodReg(m);
      r.mesh = m;
      r.k = 0;
      propWrite(r);
      m.setColorAt(0, tmpCol.setHex(r.col));
      m.instanceColor.needsUpdate = true;
      L_.group.add(m);
    });
  return r;
}
function propWrite(r, cut) {
  if (!r.mesh) return;
  if (cut == null) cut = !!(G && G.roofs);
  const hide = r.dead || r.gone || (cut && (r.roof || r.y >= CUT));
  dummy.position.set(r.x, r.y, r.z);
  dummy.rotation.set(r.rx, r.ry, r.rz, 'YXZ');
  if (hide) dummy.scale.set(0, 0, 0);
  else dummy.scale.set(r.s, r.s * r.sy, r.s);
  dummy.updateMatrix();
  r.mesh.setMatrixAt(r.k, dummy.matrix);
  r.mesh.instanceMatrix.needsUpdate = true;
  dummy.rotation.order = 'XYZ';
}
function buildProps(ch) {
  if (!ch.PR.length) return;
  const by = new Map();
  for (const r of ch.PR) {
    if (r.mesh) continue;
    const k = r.n + '|' + r.p;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(r);
  }
  for (const [k, L_] of by) {
    const [n, part] = k.split('|');
    withModel(n, M_ => {
      if (!ch.group || !M_.geos[part]) return;
      const m = new T.InstancedMesh(M_.geos[part], propMat(n, M_), L_.length);
      m.castShadow = n !== 'paper' && !n.startsWith('w_');
      m.receiveShadow = true;
      m.frustumCulled = false;
      L_.forEach((r, q) => {
        r.mesh = m;
        r.k = q;
        propWrite(r);
        m.setColorAt(q, tmpCol.setHex(r.col));
      });
      castReg(m, M_.geos[part], L_.reduce((a, r) => a + r.s, 0) / L_.length);
      lodReg(m);
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      ch.group.add(m);
    });
  }
}
// tintes: el desgaste ya lo llevan las texturas; esto solo mueve un poco el tono
const TANK_TINT = {
  0x6c6f6a: 0x7c7a70,
  0x9a4a2e: 0x96704e,
  0x3d5f7a: 0x6a88a0,
  0x8a8a80: 0xd0bc94,
  0x2c2c2a: 0x5c5a54
};
const SAND_T = [0xffffff, 0xf4ecdc, 0xe8dcc4, 0xfff6e6];
function roofTank(tx, y, tz, tc, b) {
  const col = TANK_TINT[tc] != null ? TANK_TINT[tc] : 0xb8a888;
  prop('tank', 'tank', tx, y, tz, phs(tx, tz, 1) * 6.283, 1.02 * (0.95 + phs(tx, tz, 2) * 0.1), col, { roof: 1 });
}
function roofBox(bx, top, bz, sx, sy, sz, bc, bry, b) {
  B(bx, top + 0.15, bz, sx, sy, sz, bc, { b, roof: 1, ry: bry, m: M.WOOD, hid: 1 });
  const h = phs(bx, bz, 3);
  if (bc === 0x8b6a42)
    prop(
      'crates',
      h < 0.55 ? 'wood' : 'huacal',
      bx,
      top,
      bz,
      bry,
      h < 0.55 ? (Math.min(sx, sz) / 0.58) * 1.1 : 1.1,
      0xffffff,
      { roof: 1 }
    );
  else if (bc === 0x6b6f70 && h < 0.5) prop('crates', 'ammo', bx, top, bz, bry, 1.2, 0xffffff, { roof: 1 });
  else {
    const cb = ['cb0', 'cb1', 'cb2', 'cb4', 'cb6', 'cb7', 'cb8'][Math.floor(h * 7)];
    prop('crates', cb, bx, top, bz, bry, cb === 'cb8' ? 0.45 : 0.8 + h * 0.3, SAND_T[Math.floor(h * 13) % 4], {
      roof: 1
    });
  }
}
// cosas sueltas puestas a mano: cartones (cerrados, abiertos, aplastados), cajas de fruta, un neumático suelto, un bidón tumbado, alguna caja de munición.
// Solo contra las paredes y en los patios, nunca en mitad de la calle, y con su propio generador
function scatterProps(ch) {
  if (!(ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0)) return;
  let vs = (Math.imul(ch.i, 1103515245) ^ Math.imul(ch.j, 12345) ^ 0x51ed27) >>> 0;
  const R = () => {
    vs = (Math.imul(vs, 1664525) + 1013904223) >>> 0;
    return vs / 4294967296;
  };
  const BX = ['cb0', 'cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6', 'cb7', 'cb8'];
  for (let n = 0; n < 40; n++) {
    const i = ch.x0 + Math.floor(R() * CS),
      j = ch.z0 + Math.floor(R() * CS),
      r1 = R(),
      r2 = R(),
      r3 = R(),
      r4 = R();
    if (!inB(i, j)) continue;
    const k = idx(i, j);
    if (grid[k] !== 0 || reserved[k] || ground[k] === 11 || (MIS && MIS.laneFree && MIS.laneFree(i, j))) continue;
    let wx = 0,
      wz = 0;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ])
      if (inB(i + di, j + dj) && grid[idx(i + di, j + dj)] === 1) {
        wx = di;
        wz = dj;
      }
    if (!wx && !wz && (STR[k] || r4 > 0.25)) continue;
    if (r1 > 0.3 + 0.5 * cityDs(i + 0.5, j + 0.5)) continue;
    const x = i + 0.5 + (wx ? wx * 0.28 : (r2 - 0.5) * 0.6),
      z = j + 0.5 + (wz ? wz * 0.28 : (r3 - 0.5) * 0.6),
      ry = wx
        ? (r2 < 0.5 ? 0 : Math.PI) + (r3 - 0.5) * 0.5
        : wz
          ? Math.PI / 2 + (r2 < 0.5 ? 0 : Math.PI) + (r3 - 0.5) * 0.5
          : r2 * 6.283;
    const q = R();
    if (q > 0.86 && q < 0.96) {
      prop(
        'junk2',
        'pallet',
        x,
        0,
        z,
        ry + (R() - 0.5) * 0.4,
        0.95 + R() * 0.1,
        [0xffffff, 0xe8e0d0, 0xd8ccb8][Math.floor(R() * 3)]
      );
      if (R() < 0.3)
        prop(
          'junk2',
          'pallet',
          x + (R() - 0.5) * 0.06,
          0.095,
          z + (R() - 0.5) * 0.06,
          ry + (R() - 0.5) * 0.3,
          0.95,
          0xf0e8d8
        );
      continue;
    }
    if (q < 0.44) {
      const cb = BX[Math.floor(R() * BX.length)];
      prop('crates', cb, x, 0, z, ry, cb === 'cb8' ? 0.5 + R() * 0.2 : 0.7 + R() * 0.35, SAND_T[Math.floor(R() * 4)]);
      if (cb !== 'cb8' && cb !== 'cb5' && R() < 0.3)
        prop(
          'crates',
          BX[Math.floor(R() * 5)],
          x + (R() - 0.5) * 0.1,
          cb === 'cb3' ? 0.54 : cb === 'cb0' ? 0.39 : 0.19,
          z,
          ry + (R() - 0.5) * 0.6,
          0.6,
          SAND_T[Math.floor(R() * 4)]
        );
    } else if (q < 0.56) prop('crates', 'huacal', x, 0, z, ry, 1.1 + R() * 0.2, 0xffffff);
    else if (q < 0.68) prop('tires', 'one', x, 0, z, R() * 6.283, 0.85 + R() * 0.15, 0xffffff);
    else if (q < 0.78)
      prop(
        'barrels',
        'lying',
        x,
        0,
        z,
        ry + (Math.PI / 2) * (R() < 0.5 ? 1 : 0),
        0.9,
        [0xffffff, 0xd8c8b0, 0xb8c0c8][Math.floor(R() * 3)]
      );
    else if (q < 0.86) prop('crates', 'wood', x, 0, z, ry, 0.9 + R() * 0.25, 0xffffff);
    else prop('crates', 'ammo', x, 0, z, ry, 1.25, 0xffffff);
  }
  // motas: trocitos de hormigón, ladrillo, cristal, tela y plástico de pocos píxeles, por todas las celdas abiertas
  const DEB = [
    0xb4aa98, 0x9d9484, 0xa0644a, 0x8a8070, 0x6b5a45, 0x3a3a36, 0xd8d0bc, 0x4d6a5a, 0x7a7466, 0xc8c0ae, 0x2c2a26,
    0x8a5a3c
  ];
  for (let n = 0; n < 170; n++) {
    const x = ch.x0 + R() * CS,
      z = ch.z0 + R() * CS,
      i = Math.floor(x),
      j = Math.floor(z),
      a = R(),
      b = R(),
      c = R(),
      d = R();
    if (!inB(i, j)) continue;
    const k = idx(i, j);
    if (grid[k] === 1 || grid[k] === 3 || ground[k] === 11) continue;
    if (d > 0.35 + 0.6 * cityDs(x, z)) continue;
    MAT = M.CONC;
    B(x, 0.015, z, 0.04 + a * 0.1, 0.02 + b * 0.03, 0.04 + c * 0.09, DEB[Math.floor(d * 977) % DEB.length], {
      ry: a * 6.283
    });
  }
}
// la torre de antenas junto al objetivo: el modelo subido de la torre de celosía. Las cajas de siempre se siguen
// colocando (con sus tiradas) pero ya no se pintan: solo sirven para que las balas choquen con la torre
function tower(i, j) {
  markB(i, j, 2, 2);
  MAT = M.METAL;
  const b = nBld++,
    G = 0x8f8e86,
    x = i + 1,
    z = j + 1,
    h = 16;
  for (const [a, c] of [
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7]
  ])
    B(x + a * 0.75, h / 2, z + c * 0.75, 0.1, h, 0.1, G, { b, rz: -a * 0.03, rx: c * 0.03, hid: 1 });
  for (let y = 1; y < h; y += 1.4) {
    const s = 1.1 - (y / h) * 0.4;
    B(x, y, z - s * 0.55, s * 1.1, 0.05, 0.05, G, { b, hid: 1 });
    B(x, y, z + s * 0.55, s * 1.1, 0.05, 0.05, G, { b, hid: 1 });
    B(x - s * 0.55, y, z, 0.05, 0.05, s * 1.1, G, { b, hid: 1 });
    B(x + s * 0.55, y, z, 0.05, 0.05, s * 1.1, G, { b, hid: 1 });
    B(x, y + 0.7, z - s * 0.55, 0.04, 1.5, 0.04, G, { b, rz: 0.75, hid: 1 });
    B(x + s * 0.55, y + 0.7, z, 0.04, 1.5, 0.04, G, { b, rx: 0.75, hid: 1 });
  }
  B(x, h + 0.05, z, 1.0, 0.08, 1.0, G, { b, hid: 1 });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 0.4;
    C(x + Math.cos(a) * 0.45, h - 1.5 - k * 0.8, z + Math.sin(a) * 0.45, 0.35, 0.12, 0xdedad0, {
      b,
      rz: Math.PI / 2,
      ry: a,
      ord: 'YXZ',
      hid: 1
    });
  }
  for (let k = 0; k < 3; k++) B(x + (k - 1) * 0.3, h - 3 + k * 0.6, z + 0.5, 0.18, 0.9, 0.1, 0xcfcac0, { b, hid: 1 });
  B(x, h + 1.2, z, 0.05, 2.2, 0.05, G, { b, hid: 1 });
  B(x, h + 2.35, z, 0.12, 0.12, 0.12, 0x6a6a64, { b, hid: 1 });
  prop('u_tower', 'm', x, 0, z, hash2(i, j) * 6.283, 1, 0xffffff);
}
