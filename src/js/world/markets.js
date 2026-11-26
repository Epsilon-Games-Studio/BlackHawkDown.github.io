/* ====================================================================================================
 * world/markets.js
 *
 * Los mercados: puestos, mesas y género de los packs subidos, colocados como se monta un mercado de verdad: el mostrador
 * al pasillo, el género detrás y a sus pies, las cajas apiladas en escuadra con el puesto. Todo sale de un hash del sitio,
 * nunca de la secuencia aleatoria. El frente de cada modelo es +z, así que 'face' lo gira hacia su pasillo
 * ================================================================================================== */

let MKT = false,
  MKT_BIG = false,
  MKT_WIDE = []; // (grandes: las manzanas de Bakara, donde también se ponen los carniceros y el puesto de fruta)
const mkH = (a, b, k) => {
  const v = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
}; // un hash que no varía suave de una celda a la siguiente
function mkP(part, cx, cz, face, lx, lz, y, ry, sc, col, o) {
  const c = Math.cos(face),
    s = Math.sin(face);
  return prop(
    'market',
    part,
    cx + lx * c + lz * s,
    y || 0,
    cz - lx * s + lz * c,
    face + (ry || 0),
    sc || 1,
    col == null ? 0xffffff : col,
    o
  );
}
const MK_FOOD = ['vb3b', 'vb2', 'vb3a', 'vb1', 'vb3c'],
  MK_BOX = ['fb0', 'fb1', 'fb2', 'fb3', 'fb4', 'fb5'];
function mkStackFruit(cx, cz, face, lx, lz, h, n) {
  // cajas de fruta vacías, apiladas cruzadas
  const H = [0.167, 0.167, 0.133, 0.202, 0.134, 0.2];
  let y = 0,
    b = Math.floor(h * 37) % 6;
  for (let k = 0; k < n; k++) {
    mkP(MK_BOX[b], cx, cz, face, lx, lz, y, (((h * 11) % 1) - 0.5) * 0.08 + (k % 2 ? 0.05 : 0), 1, 0xffffff);
    y += H[b] - 0.004;
  } // la misma caja, una encima de otra
}
function marketStall(cx, cz, face, h, wide) {
  const v = Math.floor(h * (MKT_BIG ? 7 : 5)),
    hh = (h * 97) % 1,
    side = hh < 0.5 ? -1 : 1,
    W = wide ? 0.78 : 0.45;
  const aw = ['', '_b', '_c'][Math.floor(((h * 311) % 1) * 3)]; // la tela: oliva, caqui, arena, hueso o piedra, todo polvoriento
  if (v === 0) {
    // el mostrador vestido: toldo, género, ollas y cestas encima; sacos a sus pies
    mkP('mstall' + aw, cx, cz, face, 0, -0.05, 0, 0, wide ? 0.86 : 0.62);
    mkP(hh < 0.5 ? 'msack1' : 'msack2', cx, cz, face, side * (W - 0.05), 0.48, 0, hh * 3, 0.9);
    if (wide) mkP(hh < 0.3 ? 'mpot4' : 'mbucket', cx, cz, face, -side * (W - 0.12), 0.42, 0, hh * 5, 1);
  } else if (v === 1) {
    // el puesto de las cajas de tomates y patatas, con más cajas de verdura a sus pies
    mkP('stall14' + aw, cx, cz, face, 0, -0.08, 0, 0, wide ? 0.95 : 0.62);
    mkP(MK_FOOD[Math.floor(hh * 5)], cx, cz, face, side * (W - 0.3), 0.55, 0, (hh - 0.5) * 0.2, 0.9);
    if (wide) mkStackFruit(cx, cz, face, -side * (W - 0.12), 0.5, hh, 2);
  } else if (v === 2) {
    // la carpa de tela sobre una mesa: dos cajas de género encima y cajas vacías apiladas al lado
    mkP('tent' + aw, cx, cz, face, 0, -0.12, 0, 0, wide ? 0.95 : 0.6);
    mkP('stand', cx, cz, face, 0, -0.2, 0, 0, wide ? 0.95 : 0.62);
    const ty = wide ? 0.62 : 0.41;
    mkP(
      MK_FOOD[Math.floor(hh * 5)],
      cx,
      cz,
      face,
      wide ? -0.32 : -0.15,
      -0.2,
      ty,
      (hh - 0.5) * 0.15,
      wide ? 0.85 : 0.6
    );
    mkP(
      MK_FOOD[Math.floor(hh * 5 + 2) % 5],
      cx,
      cz,
      face,
      wide ? 0.32 : 0.15,
      -0.2,
      ty,
      (0.5 - hh) * 0.15,
      wide ? 0.85 : 0.6
    );
    if (wide) mkStackFruit(cx, cz, face, side * (W - 0.1), 0.3, hh, 3);
  } else if (v === 3) {
    // una tela en el suelo con cajas de comida, y el taburete del vendedor detrás
    mkP('rug', cx, cz, face, 0, 0, 0.002, 0, wide ? 0.95 : 0.58, 0xffffff);
    const L_ = wide
      ? [
          [-0.45, 0.15, 'vb3b'],
          [0.05, 0.2, 'vb3a'],
          [0.5, 0.1, 'vb2'],
          [-0.15, -0.35, 'vb1'],
          [0.4, -0.35, 'vb3c']
        ]
      : [
          [-0.2, 0.1, 'vb3b'],
          [0.2, 0.12, 'vb2'],
          [0, -0.3, 'vb1']
        ];
    for (const [lx, lz, q] of L_) mkP(q, cx, cz, face, lx, lz, 0.02, (((hh * 7) % 1) - 0.5) * 0.3, wide ? 0.9 : 0.65);
    mkP('stool', cx, cz, face, side * (W - 0.15), -0.5, 0, hh * 2, 0.8);
  } else if (v === 5) {
    // el carnicero: carne sobre el mostrador y colgada de la barra, una caja al lado
    mkP(hh < 0.5 ? 'meat1' : 'meat2', cx, cz, face, 0, -0.05, 0, 0, wide ? 0.88 : 0.6);
    if (wide) mkP(['rc1', 'rc3'][Math.floor(hh * 2)], cx, cz, face, side * (W - 0.05), 0.45, 0, hh * 3, 0.8);
  } else if (v === 6) {
    // el puesto de fruta: manzanas, plátanos y uvas en bandejas bajo un toldo de tela
    mkP('fstall', cx, cz, face, 0, -0.1, 0, 0, wide ? 0.85 : 0.58);
    if (wide) mkStackFruit(cx, cz, face, side * (W - 0.08), 0.55, hh, 2);
  } else {
    // el que vende cuero: pieles en un bastidor, un taburete y sus cajas
    mkP('rug', cx, cz, face, 0, 0.1, 0.002, 0, wide ? 0.9 : 0.55, 0xffffff);
    mkP('hanger', cx, cz, face, 0, -0.25, 0, Math.PI / 2, wide ? 0.9 : 0.6);
    mkP('stool', cx, cz, face, side * (W - 0.2), 0.35, 0, hh * 2, 0.8);
    if (wide)
      for (let k = 0; k < 2; k++)
        mkP(
          ['rc1', 'rc2', 'rc3'][Math.floor(hh * 3 + k) % 3],
          cx,
          cz,
          face,
          -side * (W - 0.25),
          0.25 - k * 0.45,
          0,
          (((hh * 13) % 1) - 0.5) * 0.3,
          0.8
        );
  }
}
// lo que se acumula en un pasillo de mercado: un montón, elegido según el sitio
function marketGoods(x, z, h, tall) {
  const f = h * 6.283,
    v = Math.floor(h * 7);
  if (tall || v === 0) return mkP('mstack', x, z, f, 0, 0, 0, 0, 0.95);
  if (v === 1) {
    const r = mkP('msack1', x, z, f, -0.15, 0, 0, 0, 0.95);
    mkP('msack2', x, z, f, 0.2, 0.1, 0, 1.3, 0.95);
    return r;
  }
  if (v === 2) {
    const r = mkP('mpot4', x, z, f, -0.12, 0.05, 0, 0, 1);
    mkP('mpot3', x, z, f, 0.18, -0.08, 0, 1, 1);
    mkP('mbucket', x, z, f, 0.05, 0.25, 0, 2, 1);
    return r;
  }
  if (v === 3) {
    const r = mkP('rc1', x, z, f, 0, 0, 0, 0, 0.95);
    mkP('rc2', x, z, f, 0.02, 0.02, 0.31, 0.4, 0.85);
    return r;
  }
  if (v === 4) {
    const r = mkP('vb3b', x, z, f, -0.18, 0, 0, 0, 0.85);
    mkP('vb3a', x, z, f, 0.22, 0.05, 0, 0.1, 0.8);
    return r;
  }
  if (v === 5) {
    const r = mkP('fb3', x, z, f, 0, 0, 0, 0, 1.15);
    mkStackFruit(x, z, f, 0.3, 0, h, 3);
    return r;
  }
  const r = mkP('rc3', x, z, f, 0, 0, 0, 0, 0.95);
  mkP('vb1', x, z, f, 0, 0, 0.32, 0.3, 0.8);
  return r;
}
// en el campo del estadio solo queda el campamento: lo que la ciudad pondría ahí se tira solo por la secuencia aleatoria y luego se liberan sus celdas
const stadIn = (x, z) => ((x - STADIUM.x) / (STADIUM.rx * 0.8)) ** 2 + ((z - STADIUM.z) / (STADIUM.rz * 0.8)) ** 2 < 1;
let STAD_GH = [];
function addCover(kind, i, j, dir, opt) {
  if (kind === 'sandbag' || kind === 'fountain' || !stadIn(i + 0.5, j + 0.5)) return addCover0(kind, i, j, dir, opt);
  const g0 = GHOST;
  GHOST = true;
  let o = null;
  try {
    o = addCover0(kind, i, j, dir, opt);
  } finally {
    GHOST = g0;
  }
  if (o) STAD_GH.push(...o.cells);
  return o;
}
function addCover0(kind, i, j, dir, opt) {
  opt = opt || {};
  if (!walk(i, j)) return null;
  const n = LEN[kind] || 1,
    cells = [];
  for (let k = 0; k < n; k++) {
    const ci = dir === 'x' ? i + k : i,
      cj = dir === 'x' ? j : j + k;
    if (!walk(ci, cj)) return null;
    if (MIS && MIS.laneFree && MIS.laneFree(ci, cj)) return null;
    if (VEH_KIND[kind] && NOVEH && NOVEH[idx(ci, cj)]) return null;
    cells.push(idx(ci, cj));
  }
  const o = { kind, val: COVER_VAL[kind], cells, i, j, dir, fuel: !!opt.fuel, g: null };
  COVREC = COVER_HP[kind] ? [] : null;
  const x = i + 0.5,
    z = j + 0.5;
  const rot = dir === 'z' ? Math.PI / 2 : 0;
  const cx = dir === 'x' ? i + n / 2 : x,
    cz = dir === 'z' ? j + n / 2 : z;
  const burnt = !!opt.burnt;
  MAT = M.GEN;
  // parachoques, faros, matrícula y retrovisores; en local los vehículos miran a -x
  const vdet = (hl, hw, ly, mirY, c) => {
    const bm = burnt ? M.BURNT : M.METAL,
      bc = burnt ? 0x1e1c1a : 0x2c2c2a;
    vpart(cx, cz, rot, -hl - 0.03, ly - 0.13, 0, 0.07, 0.1, hw * 2 + 0.06, bc, { m: bm });
    vpart(cx, cz, rot, hl + 0.03, ly - 0.13, 0, 0.07, 0.1, hw * 2 + 0.06, bc, { m: bm });
    if (!burnt) {
      for (const s of [-1, 1]) {
        vpart(cx, cz, rot, -hl - 0.01, ly, s * (hw - 0.13), 0.04, 0.08, 0.15, 0xf4eed4, { m: M.GLASS });
        vpart(cx, cz, rot, hl + 0.01, ly, s * (hw - 0.12), 0.04, 0.07, 0.12, 0xb02a1c, { m: M.GLASS });
        if (mirY) vpart(cx, cz, rot, -hl * 0.42, mirY, s * (hw + 0.06), 0.05, 0.06, 0.1, c, { m: M.METAL });
      }
      vpart(cx, cz, rot, hl + 0.02, ly - 0.05, 0, 0.02, 0.07, 0.24, 0xe6e0c4, { m: M.METAL });
      vpart(cx, cz, rot, -hl - 0.02, ly - 0.05, 0, 0.02, 0.07, 0.24, 0xe6e0c4, { m: M.METAL });
    }
  };
  if (kind === 'sandbag') {
    MAT = M.BAG;
    const HB = { hid: 1 },
      cs_ = Math.cos(rot),
      sn_ = Math.sin(rot);
    const bag = (lx, ly, lz, c, k) => {
      const h = phs(x + lx, z + lz, k);
      prop(
        'bags',
        'bag',
        x + lx * cs_ + lz * sn_,
        ly,
        z - lx * sn_ + lz * cs_,
        rot + Math.PI / 2 + (h - 0.5) * 0.22,
        1.02 + h * 0.06,
        c,
        { sy: 1.65, rz: (h - 0.5) * 0.08 }
      );
    };
    for (let k = 0; k < 3; k++) {
      const c = jit(0xb4a173, 0.08);
      vpart(x, z, rot, -0.34 + k * 0.34, 0.1, 0, 0.32, 0.2, 0.46, c, HB);
      bag(-0.34 + k * 0.34, 0, 0, c, k);
    }
    for (let k = 0; k < 3; k++) {
      const c = jit(0xa8956a, 0.08);
      vpart(x, z, rot, -0.34 + k * 0.34, 0.3, 0.02, 0.32, 0.2, 0.44, c, HB);
      bag(-0.34 + k * 0.34 + 0.02, 0.19, 0.02, c, k + 3);
    }
    {
      const c = jit(0xb4a173, 0.08);
      vpart(x, z, rot, -0.17, 0.49, 0, 0.32, 0.18, 0.4, c, HB);
      bag(-0.17, 0.38, 0, c, 6);
    }
    {
      const c = jit(0xb4a173, 0.08);
      vpart(x, z, rot, 0.17, 0.49, 0, 0.32, 0.18, 0.4, c, HB);
      bag(0.17, 0.38, 0, c, 7);
    }
    if (phs(x, z, 9) < 0.18 && !GHOST)
      prop(
        'crates',
        'ammo',
        x + (dir === 'z' ? 0.42 : 0) * (phs(x, z, 10) < 0.5 ? 1 : -1),
        0,
        z + (dir === 'x' ? 0.42 : 0) * (phs(x, z, 10) < 0.5 ? 1 : -1),
        rot + 0.3,
        1.2,
        0xffffff
      );
  } else if (kind === 'barrier') {
    MAT = M.CONC;
    vpart(x, z, rot, 0, 0.12, 0, 0.96, 0.24, 0.6, 0xbab4a6);
    vpart(x, z, rot, 0, 0.5, 0, 0.96, 0.55, 0.3, 0xc4beb0);
    vpart(x, z, rot, 0, 0.8, 0, 0.96, 0.06, 0.2, 0xb0aa9c);
    if (rnd() < 0.4) vpart(x, z, rot, 0, 0.5, 0.16, 0.5, 0.25, 0.01, pick([0x9a3a2e, 0xe8e2d0]));
  } else if (kind === 'wall') {
    MAT = M.PLASTER;
    const c = jit(pick(WALLS), 0.06);
    vpart(x, z, rot, 0, 0.42, 0, 1.0, 0.84, 0.3, c);
    vpart(x, z, rot, 0, 0.87, 0, 1.02, 0.07, 0.36, shade(c, 0.85));
  } else if (kind === 'barrel') {
    const col = o.fuel ? 0xa33a26 : pick([0x3d5a80, 0x5e6b3a, 0x4b5a63]),
      h = phs(x, z, 4);
    const tint = { 0xa33a26: 0xd07050, 0x3d5a80: 0x8aa0c0, 0x5e6b3a: 0xa8b080, 0x4b5a63: 0xa8b0b4 }[col];
    if (MKT && !o.fuel) {
      o.pr = marketGoods(x, z, mkH(x, z, 66), false);
      o.hb = {
        x,
        y: 0.3,
        z,
        sx: 0.6,
        sy: 0.6,
        sz: 0.6,
        r: 0.5,
        rx: 0,
        ry: 0,
        rz: 0,
        m: M.WOOD,
        c: 0x8b6a42,
        b: -1,
        st: 0
      };
    } else {
      o.pr = prop(
        'barrels',
        !o.fuel && h < 0.4 ? 'rust' : 'drum',
        x,
        0,
        z,
        h * 6.283,
        0.98 + h * 0.04,
        !o.fuel && h < 0.4 ? 0xffffff : tint
      );
      o.hb = {
        x,
        y: 0.36,
        z,
        sx: 0.52,
        sy: 0.72,
        sz: 0.52,
        r: 0.5,
        rx: 0,
        ry: 0,
        rz: 0,
        m: M.METAL,
        c: col,
        b: -1,
        st: 0
      };
    }
  } else if (VEH_KIND[kind]) {
    if (!burnt) rnd();
    if (kind === 'van') rnd(); // las tiradas que hacían los vehículos-caja antiguos, para que el resto de la ciudad no se mueva
    const vr = vehRnd(i, j),
      t = burnt ? 'car_wreck' : vr() < 0.62 ? 'car_topaz' : 'car_kcar',
      D_ = VEH_DIM[t];
    const ry = rot + (vr() < 0.5 ? Math.PI : 0) + (vr() - 0.5) * 0.14;
    let col = 0xffffff;
    if (!burnt) {
      col = VEH_PAINT[Math.floor(vr() * VEH_PAINT.length)];
      if (t === 'car_kcar') col = shade(col, 0.82);
    } // un coche desguazado ya no brilla
    const rec = { t, x: cx, z: cz, ry, col, o, mesh: null, k: 0, dead: false };
    if (!GHOST) (CUR || chunkFor(cx, cz)).VH.push(rec);
    o.vr = rec;
    const q = new T.Quaternion().setFromAxisAngle(_vY, ry);
    o.hb = {
      x: cx,
      y: D_[2] * 0.47,
      z: cz,
      sx: D_[0] * 0.94,
      sy: D_[2] * 0.9,
      sz: D_[1] * 0.9,
      r: 0.5 * Math.hypot(D_[0], D_[1], D_[2]),
      rx: 0,
      ry,
      rz: 0,
      q,
      qi: q.clone().invert(),
      m: burnt ? M.BURNT : M.METAL,
      c: burnt ? 0x2e2a26 : col,
      b: -1,
      st: 0
    };
  } else if (kind === 'rubble') {
    MAT = M.CONC;
    const BR = MKT ? () => {} : B; // en un mercado el montón es su género (las tiradas se hacen igual)
    for (let k = 0; k < 12; k++)
      BR(
        x + rr(-0.45, 0.45),
        rr(0.08, 0.45) * (1 - k / 16),
        z + rr(-0.45, 0.45),
        rr(0.18, 0.5),
        rr(0.12, 0.35),
        rr(0.18, 0.5),
        pick([0xb4aa98, 0x9d9484, 0xa0644a, 0x8a8070, 0xc8c0ae]),
        { ry: rnd() * 3, rx: rr(-0.4, 0.4), rz: rr(-0.4, 0.4) }
      );
    for (let k = 0; k < 2; k++)
      BR(x + rr(-0.3, 0.3), 0.5, z + rr(-0.3, 0.3), 0.03, rr(0.5, 0.9), 0.03, 0x4a3a30, {
        rz: rr(-0.6, 0.6),
        m: M.METAL
      });
    if (MKT) marketGoods(x, z, mkH(x, z, 65), false);
  } else if (kind === 'crates') {
    MAT = M.WOOD;
    const nn = 1 + ri(3);
    for (let k = 0; k < nn; k++) {
      const s = rr(0.55, 0.8),
        cx_ = x + rr(-0.12, 0.12),
        cy_ = s / 2 + k * 0.62,
        cz_ = z + rr(-0.12, 0.12),
        c = jit(0x8b6a42, 0.12),
        ry = rnd() * 0.4,
        hs = Math.min(s, 0.62);
      B(cx_, cy_, cz_, s, hs, s, c, { ry, hid: 1 });
      const h = phs(cx_, cz_, 5 + k),
        y0 = k * 0.62;
      if (MKT) continue;
      if (h < 0.58) prop('crates', 'wood', cx_, y0, cz_, ry, hs / 0.58, 0xffffff);
      else if (h < 0.82) prop('crates', 'cb0', cx_, y0, cz_, ry, (hs / 0.468) * 1.0, SAND_T[k % 4], { sy: 1 });
      else
        prop('crates', 'huacal', cx_, y0, cz_, ry + Math.PI / 2, s / 0.5, 0xffffff, { sy: hs / ((0.278 * s) / 0.5) });
    }
    if (MKT) marketGoods(x, z, mkH(x, z, 62), nn > 1);
  } else if (kind === 'tires') {
    MAT = M.TIRE;
    const pile = phs(x, z, 6) < 0.35; // el límite del bucle se vuelve a tirar en cada vuelta, como siempre
    for (let k = 0; k < 3 + ri(2); k++) {
      const tx = x + rr(-0.05, 0.05),
        ty = 0.09 + k * 0.17,
        tz = z + rr(-0.05, 0.05);
      C(tx, ty, tz, 0.34, 0.16, 0x1f1e1c, { hid: 1 });
      if (!pile && !MKT)
        prop('tires', 'one', tx, ty - 0.09, tz, phs(tx, tz, k) * 6.283, 1.0, 0xffffff, {
          sy: 0.8,
          rx: (phs(tz, tx, k) - 0.5) * 0.08
        });
    }
    if (pile && !MKT) prop('tires', 'pile', x, 0, z, phs(x, z, 7) * 6.283 + rot, 0.92, 0xffffff);
    if (MKT) marketGoods(x, z, mkH(x, z, 63), false);
  } else if (kind === 'stall') {
    for (let k = 0; k < 19; k++) rnd(); // (las tiradas del puesto-caja antiguo: el resto de la ciudad no se mueve de su sitio)
    MAT = M.WOOD;
    // dos celdas de ancho donde hay sitio: los puestos de una fila van hombro con hombro, cada uno mirando a su pasillo
    const wide = walk(i + 1, j) && !cov[idx(i + 1, j)];
    if (wide) MKT_WIDE.push([o, idx(i + 1, j)]); // su segunda celda solo se ocupa cuando la ciudad ya está trazada, así no se mueve nada más
    marketStall(wide ? i + 1 : x, z, Math.floor(j / 3) % 2 ? 0 : Math.PI, mkH(i, j, 61), wide);
  } else if (kind === 'tree') {
    MAT = M.WOOD;
    C(x, 0.75, z, 0.12, 1.5, 0x5d4630, { hid: 1 });
    LEAF_OFF = true;
    leafCanopy(x + 0.1, 1.7, z, 1.15, 0.42, 1.0, 0x6b7a3a, 64);
    leafCanopy(x - 0.15, 1.98, z + 0.1, 0.75, 0.3, 0.7, 0x7c8a44, 30);
    LEAF_OFF = false;
    treeAt(x, z, 2.5, true);
  } else if (kind === 'fountain') {
    // la fuente subida (un escaneo de la de San Francisco): pilas lobuladas sobre dos escalones y una copa sobre un balaustre
    MAT = M.STONE;
    let fx = cx,
      fz = cz;
    const ex = [
      [i + 1, j],
      [i, j + 1],
      [i + 1, j + 1]
    ];
    if (ex.every(c => walk(c[0], c[1]) && !cov[idx(c[0], c[1])])) {
      for (const c of ex) o.cells.push(idx(c[0], c[1]));
      fx = i + 1;
      fz = j + 1;
    }
    C(fx, 0.32, fz, 0.9, 0.64, 0xb8b0a0, { hid: 1 });
    prop('deco8', 'fount', fx, 0, fz, phs(i, j, 71) * 6.283, 0.95, 0xffffff);
  }
  for (const k of o.cells) {
    grid[k] = 2;
    cov[k] = o;
    topH[k] = Math.max(topH[k], COVER_H[kind] || 0);
  }
  if (COVREC) {
    o.es = COVREC;
    for (const e of COVREC) e.cv = o;
    COVREC = null;
  }
  return o;
}
function fountain(i, j) {
  // 2x2
  const cells = [
    [i, j],
    [i + 1, j],
    [i, j + 1],
    [i + 1, j + 1]
  ];
  if (!cells.every(c => walk(c[0], c[1]))) return;
  const o = { kind: 'fountain', val: 0.7, cells: cells.map(c => idx(c[0], c[1])), i, j, g: null };
  const cx = i + 1,
    cz = j + 1;
  MAT = M.STONE;
  C(cx, 0.3, cz, 1.0, 0.6, 0xc8c0ae);
  C(cx, 0.65, cz, 0.5, 0.2, 0xb8b0a0);
  C(cx, 1.7, cz, 0.2, 2.0, 0xd8d0be);
  B(cx, 2.8, cz, 0.55, 0.35, 0.55, 0xb8b0a0);
  for (const k of o.cells) {
    grid[k] = 2;
    cov[k] = o;
    topH[k] = 0.6;
  }
}
function destroyCover(o) {
  if (o.g) world.remove(o.g);
  if (o.pr) {
    o.pr.dead = true;
    propWrite(o.pr);
  }
  if (o.es)
    for (const e of o.es)
      if (e.isProp && !o.dead) {
        e.gone = true;
        propWrite(e);
      }
  if (o.es && o.es.length && !o.dead) {
    o.dead = true;
    const chs = new Set();
    for (const e of o.es) {
      e.gone = true;
      if (e.chL) chs.add(e.chL);
    }
    for (const ch of chs) if (ch.gen) cutChunk(ch, !!(G && G.roofs));
    if (typeof clearMarksOf === 'function') clearMarksOf(new Set(o.es));
  }
  if (o.vr) {
    o.vr.dead = true;
    vehWrite(o.vr);
  }
  if (o.em) o.em.until = Math.max(0.001, G ? G.t : 0.001);
  if (o.ls) o.ls.off = true;
  for (const k of o.cells) {
    if (cov[k] === o) {
      grid[k] = 0;
      cov[k] = null;
      topH[k] = 0;
    }
  }
}
const POLE_WY = 4.34; // los cables cuelgan de las crucetas
let POLE_I = 0;
function pole(x, z, ry) {
  const h = phs(x, z, 21),
    k = h < 0.42 ? 'tpole0' : h < 0.84 ? 'tpole1' : 'epole',
    sc = k === 'epole' ? 0.92 : 1,
    col = [0xffffff, 0xf2eadc, 0xe6ddd0][Math.floor(h * 31) % 3];
  const r0 = (ry || 0) + ((h * 7) % 1 < 0.5 ? 0 : Math.PI);
  if ((POLE_I++ + 3) % 25 === 0) {
    // derribado (un poste de cada veinticinco): tumbado en la calle siguiendo su línea, la cruceta plana y los cables arrastrados con él
    const ryF = r0 + (phs(z, x, 58) - 0.5) * 0.6;
    prop('kit3', k, x, 0.09, z, ryF, sc, col, { rx: Math.PI / 2 - 0.02, rz: (phs(z, x, 22) - 0.5) * 0.1 });
    const L = POLE_WY * sc - 0.1;
    return [x + Math.sin(ryF) * L, 0.06, z + Math.cos(ryF) * L];
  }
  MAT = M.WOOD;
  B(x, 2.2, z, 0.16, 4.4, 0.16, 0x6a5236, { hid: 1 });
  prop('kit3', k, x, 0, z, r0, sc, col, { rz: (phs(z, x, 22) - 0.5) * 0.05 });
  poles.push([x, POLE_WY, z]);
  return null;
}
function poleLine(list) {
  const ends = [];
  for (let k = 0; k < list.length; k++) {
    const a = list[Math.max(0, k - 1)],
      b = list[Math.min(list.length - 1, k + 1)];
    ends.push(pole(list[k][0], list[k][1], Math.atan2(b[0] - a[0], b[1] - a[1])));
  }
  wires.push(list.map((p, k) => ends[k] || [p[0], POLE_WY, p[1]]));
}
let wires,
  CABLE_MAT = null;

function courtyard(x, y, w, d) {
  const gh = stadIn(x + w / 2, y + d / 2),
    g0 = GHOST;
  if (gh) GHOST = true;
  try {
    courtyard0(x, y, w, d, gh);
  } finally {
    GHOST = g0;
  }
}
function courtyard0(x, y, w, d, gh) {
  if (!gh)
    for (let j = y; j < y + d; j++)
      for (let i = x; i < x + w; i++) if (inB(i, j) && grid[idx(i, j)] === 0) ground[idx(i, j)] = 2;
  for (let j = y; j < y + d; j++)
    for (let i = x; i < x + w; i++) {
      const edge = i === x || i === x + w - 1 || j === y || j === y + d - 1;
      if (!edge || openArea(i, j)) continue;
      if (rnd() < 0.55) addCover('wall', i, j, j === y || j === y + d - 1 ? 'x' : 'z');
    }
  if (w >= 3 && d >= 3) {
    const r = rnd();
    if (r < 0.35) addCover('tree', x + Math.floor(w / 2), y + Math.floor(d / 2));
    else if (r < 0.6) palm(x + w / 2, y + d / 2);
    if (rnd() < 0.5)
      addCover(pick(['crates', 'tires', 'rubble']), x + 1 + ri(Math.max(1, w - 2)), y + 1 + ri(Math.max(1, d - 2)));
  }
  for (let k = 0; k < (w * d) / 3; k++)
    B(
      x + rr(0.3, w - 0.3),
      0.06,
      y + rr(0.3, d - 0.3),
      rr(0.1, 0.25),
      rr(0.06, 0.18),
      rr(0.1, 0.25),
      pick([0x8a8a4a, 0x9a9a5a, 0x7a7a42]),
      { m: M.LEAF }
    );
}
function ruinLot(x, y, w, d) {
  if (!stadIn(x + w / 2, y + d / 2))
    for (let j = y; j < y + d; j++)
      for (let i = x; i < x + w; i++) if (inB(i, j) && grid[idx(i, j)] === 0) ground[idx(i, j)] = 2;
  const n = Math.max(2, Math.floor((w * d) / 5));
  for (let k = 0; k < n; k++) addCover('rubble', x + ri(w), y + ri(d));
  for (let k = 0; k < 2; k++) {
    const i = x + ri(w),
      j = y + ri(d);
    if (walk(i, j)) addCover('wall', i, j, rnd() < 0.5 ? 'x' : 'z');
  }
}
function fillBlock(x0, y0, x1, y1) {
  let x = x0;
  while (x <= x1) {
    let w = 4 + ri(4);
    if (x + w - 1 > x1) w = x1 - x + 1;
    if (x1 - (x + w - 1) < 3 && x1 - (x + w - 1) > 0) w = x1 - x + 1;
    let y = y0;
    while (y <= y1) {
      let d = 4 + ri(4);
      if (y + d - 1 > y1) d = y1 - y + 1;
      if (y1 - (y + d - 1) < 3 && y1 - (y + d - 1) > 0) d = y1 - y + 1;
      const r = rnd();
      if (w >= 2 && d >= 2 && r < 0.72) {
        const fl = 1 + ri(4) + (rnd() < 0.12 ? 1 : 0);
        if (!building(x, y, w, d, fl, { damaged: rnd() < 0.22 })) {
        }
      } else if (r < 0.88) courtyard(x, y, w, d);
      else ruinLot(x, y, w, d);
      y += d;
      if (rnd() < 0.3 && y < y1 - 3) y += 2;
    }
    x += w;
    if (rnd() < 0.3 && x < x1 - 3) x += 2;
  }
}
